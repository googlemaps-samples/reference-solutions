import argparse
import base64
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"
INITIAL_CENTER_LAT = 33.4484
INITIAL_CENTER_LNG = -112.074
SEED_SEARCH_QUERY = "Phoenix City Hall, Phoenix, AZ"

WEATHER_CURRENT_FIELD_MASK = (
    "currentTime,timeZone,weatherCondition,temperature,feelsLikeTemperature,"
    "relativeHumidity,uvIndex,wind,precipitation,cloudCover,isDaytime"
)
WEATHER_FORECAST_FIELD_MASK = "forecastDays,timeZone"
AIR_QUALITY_FIELD_MASK = "dateTime,regionCode,indexes,pollutants,healthRecommendations"
POLLEN_FORECAST_FIELD_MASK = "regionCode,dailyInfo"
SOLAR_INSIGHTS_FIELD_MASK = (
    "name,center,boundingBox,imageryDate,imageryQuality,"
    "postalCode,administrativeArea,regionCode,solarPotential"
)
PLACES_TEXT_SEARCH_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location"
)

# 1x1 transparent PNG fallback for out-of-coverage AQI heatmap tiles
TRANSPARENT_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)

ALLOWED_AQI_MAP_TYPES = {
    "US_AQI",
    "UAQI_RED_GREEN",
    "UAQI_INDIGO_PERSIAN",
    "PM25_INDIGO_PERSIAN",
    "GBR_DEFRA",
    "DEU_UBA",
    "CAN_EC",
    "FRA_ATMO",
}


def get_api_key() -> str:
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


class LatLngPayload(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class AirQualityCurrentRequest(BaseModel):
    location: LatLngPayload
    universalAqi: bool = True
    languageCode: str = Field(default="en", min_length=2, max_length=16)
    extraComputations: list[
        Literal[
            "HEALTH_RECOMMENDATIONS",
            "DOMINANT_POLLUTANT_CONCENTRATION",
            "POLLUTANT_CONCENTRATION",
            "LOCAL_AQI",
            "POLLUTANT_ADDITIONAL_INFO",
        ]
    ] = Field(
        default_factory=lambda: [
            "HEALTH_RECOMMENDATIONS",
            "DOMINANT_POLLUTANT_CONCENTRATION",
            "POLLUTANT_CONCENTRATION",
            "LOCAL_AQI",
            "POLLUTANT_ADDITIONAL_INFO",
        ]
    )


class PlaceTextSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=256)
    languageCode: str = Field(default="en", min_length=2, max_length=16)
    maxResultCount: int = Field(default=1, ge=1, le=10)


http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0))
    try:
        yield
    finally:
        if http_client is not None:
            await http_client.aclose()
            http_client = None


app = FastAPI(
    title="Hyperlocal Environmental & Solar Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


def require_configured_key() -> str:
    key = get_api_key()
    if not key or key == "your_google_maps_api_key_here":
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_MAPS_API_KEY is not configured in the server environment.",
        )
    return key


def get_client() -> httpx.AsyncClient:
    if http_client is None:
        raise HTTPException(status_code=500, detail="HTTP client not initialized.")
    return http_client


def _upstream_error_response(resp: httpx.Response, service_name: str) -> JSONResponse:
    try:
        payload = resp.json()
        message = (
            payload.get("error", {}).get("message")
            or payload.get("message")
            or f"{service_name} returned HTTP {resp.status_code}"
        )
    except ValueError:
        message = f"{service_name} returned HTTP {resp.status_code}"
    return JSONResponse(
        status_code=resp.status_code,
        content={
            "error": service_name,
            "status": resp.status_code,
            "message": message,
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico")
async def favicon():
    return FileResponse(STATIC_DIR / "favicon.svg", media_type="image/svg+xml")


@app.get("/api/config")
async def get_config():
    key = get_api_key()
    configured = bool(key and key != "your_google_maps_api_key_here")
    return {
        "configured": configured,
        "googleMapsApiKey": key if configured else "",
        "mapId": DEFAULT_MAP_ID,
        "attributionId": ATTRIBUTION_ID,
        "initialLocation": {
            "lat": INITIAL_CENTER_LAT,
            "lng": INITIAL_CENTER_LNG,
            "seedQuery": SEED_SEARCH_QUERY,
            "zoom": 16,
        },
    }


@app.get("/api/weather/current")
async def weather_current(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    unitsSystem: Literal["IMPERIAL", "METRIC"] = Query(default="IMPERIAL"),
    languageCode: str = Query(default="en", min_length=2, max_length=16),
):
    api_key = require_configured_key()
    client = get_client()
    url = "https://weather.googleapis.com/v1/currentConditions:lookup"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "unitsSystem": unitsSystem,
        "languageCode": languageCode,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": WEATHER_CURRENT_FIELD_MASK,
    }
    try:
        resp = await client.get(url, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Weather API network error: {exc}") from exc

    if resp.status_code != 200:
        return _upstream_error_response(resp, "Weather API (currentConditions)")
    return resp.json()


@app.get("/api/weather/forecast")
async def weather_forecast(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    days: int = Query(default=5, ge=1, le=10),
    unitsSystem: Literal["IMPERIAL", "METRIC"] = Query(default="IMPERIAL"),
    languageCode: str = Query(default="en", min_length=2, max_length=16),
):
    api_key = require_configured_key()
    client = get_client()
    url = "https://weather.googleapis.com/v1/forecast/days:lookup"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "days": days,
        "pageSize": days,
        "unitsSystem": unitsSystem,
        "languageCode": languageCode,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": WEATHER_FORECAST_FIELD_MASK,
    }
    try:
        resp = await client.get(url, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Weather Forecast API network error: {exc}") from exc

    if resp.status_code != 200:
        return _upstream_error_response(resp, "Weather API (forecast/days)")
    return resp.json()


@app.post("/api/air-quality/current")
async def air_quality_current(body: AirQualityCurrentRequest):
    api_key = require_configured_key()
    client = get_client()
    url = "https://airquality.googleapis.com/v1/currentConditions:lookup"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": AIR_QUALITY_FIELD_MASK,
    }
    try:
        resp = await client.post(url, json=body.model_dump(), headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Air Quality API network error: {exc}") from exc

    if resp.status_code != 200:
        return _upstream_error_response(resp, "Air Quality API (currentConditions)")
    return resp.json()


@app.get("/api/air-quality/tiles")
async def air_quality_tiles(
    zoom: int = Query(..., ge=0, le=16),
    x: int = Query(..., ge=0),
    y: int = Query(..., ge=0),
    mapType: str = Query(default="US_AQI"),
):
    if mapType not in ALLOWED_AQI_MAP_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported Air Quality tile mapType.")

    key = get_api_key()
    if not key or key == "your_google_maps_api_key_here":
        return Response(
            content=TRANSPARENT_PNG_BYTES,
            media_type="image/png",
            headers={"X-Tile-Status": "unconfigured"},
        )

    client = get_client()
    url = f"https://airquality.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}"
    headers = {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "*",
    }
    try:
        resp = await client.get(url, headers=headers)
    except httpx.RequestError:
        return Response(
            content=TRANSPARENT_PNG_BYTES,
            media_type="image/png",
            headers={"X-Tile-Status": "network-error"},
        )

    if resp.status_code != 200:
        return Response(
            content=TRANSPARENT_PNG_BYTES,
            media_type="image/png",
            headers={"X-Tile-Status": f"upstream-{resp.status_code}"},
        )

    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "image/png"),
        headers={"Cache-Control": "public, max-age=300"},
    )


@app.get("/api/pollen/forecast")
async def pollen_forecast(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    days: int = Query(default=3, ge=1, le=5),
    plantsDescription: bool = Query(default=True),
    languageCode: str = Query(default="en", min_length=2, max_length=16),
):
    api_key = require_configured_key()
    client = get_client()
    url = "https://pollen.googleapis.com/v1/forecast:lookup"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "days": days,
        "plantsDescription": str(plantsDescription).lower(),
        "languageCode": languageCode,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": POLLEN_FORECAST_FIELD_MASK,
    }
    try:
        resp = await client.get(url, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Pollen API network error: {exc}") from exc

    if resp.status_code != 200:
        return _upstream_error_response(resp, "Pollen API (forecast)")
    return resp.json()


@app.get("/api/solar/building-insights")
async def solar_building_insights(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    requiredQuality: Literal["HIGH", "MEDIUM", "LOW"] = Query(default="MEDIUM"),
):
    api_key = require_configured_key()
    client = get_client()
    url = "https://solar.googleapis.com/v1/buildingInsights:findClosest"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "requiredQuality": requiredQuality,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": SOLAR_INSIGHTS_FIELD_MASK,
    }
    try:
        resp = await client.get(url, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Solar API network error: {exc}") from exc

    if resp.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={
                "coverage": False,
                "status": "NOT_FOUND",
                "message": (
                    "No building solar insights available within 50 meters of these coordinates."
                ),
            },
        )
    if resp.status_code != 200:
        return _upstream_error_response(resp, "Solar API (buildingInsights)")
    return resp.json()


@app.post("/api/places/search-text")
async def places_search_text(body: PlaceTextSearchRequest):
    api_key = require_configured_key()
    client = get_client()
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_TEXT_SEARCH_FIELD_MASK,
    }
    try:
        resp = await client.post(url, json=body.model_dump(), headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Places API network error: {exc}") from exc

    if resp.status_code != 200:
        return _upstream_error_response(resp, "Places API (New) Text Search")
    return resp.json()


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Environmental Dashboard FastAPI server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)
