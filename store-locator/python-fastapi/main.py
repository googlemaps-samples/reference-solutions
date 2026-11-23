"""FastAPI Backend-for-Frontend (BFF) for Multi-Branch Store, ATM & Inventory Locator."""

from __future__ import annotations

import argparse
from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Any, Literal, Optional
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic import BaseModel, Field
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(dotenv_path=BASE_DIR / ".env")

PLACES_SEARCH_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.types,places.primaryType,places.rating,places.userRatingCount,"
    "places.regularOpeningHours.weekdayDescriptions,places.businessStatus"
)
PLACES_AUTOCOMPLETE_FIELD_MASK = (
    "suggestions.placePrediction.placeId,"
    "suggestions.placePrediction.text,"
    "suggestions.placePrediction.structuredFormat"
)
PLACES_DETAILS_FIELD_MASK = (
    "id,displayName,formattedAddress,location,"
    "regularOpeningHours.weekdayDescriptions,rating,userRatingCount,nationalPhoneNumber"
)
ROUTES_MATRIX_FIELD_MASK = (
    "originIndex,destinationIndex,status,condition,"
    "distanceMeters,duration,localizedValues"
)
ROUTES_COMPUTE_FIELD_MASK = (
    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
    "routes.legs.duration,routes.legs.distanceMeters,routes.localizedValues"
)


class LatLngModel(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=256)
    maxResultCount: int = Field(default=12, ge=1, le=20)
    center: Optional[LatLngModel] = None
    radiusMeters: float = Field(default=6500.0, gt=0.0, le=50000.0)


class AutocompleteRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=256)
    sessionToken: Optional[str] = Field(default=None, max_length=64)
    center: Optional[LatLngModel] = None
    radiusMeters: float = Field(default=25000.0, gt=0.0, le=50000.0)


class RouteMatrixRequest(BaseModel):
    origin: LatLngModel
    destinations: list[LatLngModel] = Field(..., min_length=1, max_length=25)
    travelMode: Literal["DRIVE", "WALK", "TRANSIT"] = "DRIVE"


class RouteComputeRequest(BaseModel):
    origin: LatLngModel
    destination: LatLngModel
    travelMode: Literal["DRIVE", "WALK", "TRANSIT"] = "DRIVE"


def get_api_key() -> str:
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


def require_api_key() -> str:
    key = get_api_key()
    if not key or key == "your_google_maps_api_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and "
                "set a valid Google Maps Platform API key."
            ),
        )
    return key


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0))
    try:
        yield
    finally:
        await application.state.http_client.aclose()


app = FastAPI(
    title="NYC Multi-Branch Store, ATM & Inventory Locator",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


async def proxy_google_request(
    request: Request,
    method: str,
    url: str,
    field_mask: str,
    json_body: Optional[dict[str, Any]] = None,
    params: Optional[dict[str, str]] = None,
) -> Any:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask,
    }
    try:
        upstream = await client.request(
            method=method,
            url=url,
            headers=headers,
            json=json_body,
            params=params,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Upstream Google Maps Platform request failed: {exc}",
        ) from exc

    if upstream.status_code >= 400:
        try:
            err_payload = upstream.json()
        except ValueError:
            err_payload = {"message": upstream.text}
        return JSONResponse(
            status_code=upstream.status_code,
            content={"error": err_payload},
        )

    return upstream.json()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    key = get_api_key()
    return {
        "status": "ok",
        "configured": bool(key and key != "your_google_maps_api_key_here"),
    }


@app.get("/api/config")
async def config() -> dict[str, Any]:
    key = get_api_key()
    configured = bool(key and key != "your_google_maps_api_key_here")
    return {
        "googleMapsApiKey": key if configured else "",
        "configured": configured,
        "mapId": "DEMO_MAP_ID",
        "attributionId": "gmp_git_agentsamples_v1.0.0",
        "defaultCenter": {"lat": 40.7549, "lng": -73.9840},
        "defaultZoom": 12,
        "defaultOrigin": {
            "lat": 40.7506,
            "lng": -73.9935,
            "label": "Penn Station, Midtown NYC",
        },
    }


@app.post("/api/places/search")
async def places_search(payload: PlacesSearchRequest, request: Request) -> Any:
    center = payload.center or LatLngModel(latitude=40.7549, longitude=-73.9840)
    body = {
        "textQuery": payload.textQuery,
        "maxResultCount": payload.maxResultCount,
        "languageCode": "en",
        "regionCode": "US",
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": center.latitude,
                    "longitude": center.longitude,
                },
                "radius": payload.radiusMeters,
            }
        },
    }
    return await proxy_google_request(
        request=request,
        method="POST",
        url="https://places.googleapis.com/v1/places:searchText",
        field_mask=PLACES_SEARCH_FIELD_MASK,
        json_body=body,
    )


@app.post("/api/places/autocomplete")
async def places_autocomplete(payload: AutocompleteRequest, request: Request) -> Any:
    center = payload.center or LatLngModel(latitude=40.7549, longitude=-73.9840)
    body: dict[str, Any] = {
        "input": payload.input,
        "languageCode": "en",
        "regionCode": "US",
        "includedRegionCodes": ["us"],
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": center.latitude,
                    "longitude": center.longitude,
                },
                "radius": payload.radiusMeters,
            }
        },
    }
    if payload.sessionToken:
        body["sessionToken"] = payload.sessionToken

    return await proxy_google_request(
        request=request,
        method="POST",
        url="https://places.googleapis.com/v1/places:autocomplete",
        field_mask=PLACES_AUTOCOMPLETE_FIELD_MASK,
        json_body=body,
    )


@app.get("/api/places/details")
async def places_details(
    request: Request,
    place_id: Optional[str] = Query(default=None, min_length=3, max_length=256),
    placeId: Optional[str] = Query(default=None, min_length=3, max_length=256),
    sessionToken: Optional[str] = Query(default=None, max_length=64),
) -> Any:
    resolved_id = (place_id or placeId or "").strip()
    if not resolved_id:
        raise HTTPException(status_code=422, detail="place_id query parameter is required.")

    safe_id = quote(resolved_id, safe="")
    params: dict[str, str] = {"languageCode": "en"}
    if sessionToken:
        params["sessionToken"] = sessionToken

    return await proxy_google_request(
        request=request,
        method="GET",
        url=f"https://places.googleapis.com/v1/places/{safe_id}",
        field_mask=PLACES_DETAILS_FIELD_MASK,
        params=params,
    )


@app.post("/api/routes/matrix")
async def routes_matrix(payload: RouteMatrixRequest, request: Request) -> Any:
    body: dict[str, Any] = {
        "origins": [
            {
                "waypoint": {
                    "location": {
                        "latLng": {
                            "latitude": payload.origin.latitude,
                            "longitude": payload.origin.longitude,
                        }
                    }
                }
            }
        ],
        "destinations": [
            {
                "waypoint": {
                    "location": {
                        "latLng": {
                            "latitude": dest.latitude,
                            "longitude": dest.longitude,
                        }
                    }
                }
            }
            for dest in payload.destinations
        ],
        "travelMode": payload.travelMode,
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }
    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"

    return await proxy_google_request(
        request=request,
        method="POST",
        url="https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
        field_mask=ROUTES_MATRIX_FIELD_MASK,
        json_body=body,
    )


@app.post("/api/routes/compute")
async def routes_compute(payload: RouteComputeRequest, request: Request) -> Any:
    body: dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": payload.origin.latitude,
                    "longitude": payload.origin.longitude,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": payload.destination.latitude,
                    "longitude": payload.destination.longitude,
                }
            }
        },
        "travelMode": payload.travelMode,
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }
    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"

    return await proxy_google_request(
        request=request,
        method="POST",
        url="https://routes.googleapis.com/directions/v2:computeRoutes",
        field_mask=ROUTES_COMPUTE_FIELD_MASK,
        json_body=body,
    )


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

FAVICON_SVG = (
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
    "<rect width='32' height='32' rx='8' fill='#1e3a8a'/>"
    "<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' "
    "fill='#ffffff' font-family='sans-serif' font-weight='700' font-size='18'>M</text>"
    "</svg>"
)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run NYC Store Locator FastAPI server")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
