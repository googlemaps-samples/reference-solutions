from __future__ import annotations

import argparse
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(dotenv_path=BASE_DIR / ".env")


def get_api_key() -> str:
    """Read GOOGLE_MAPS_API_KEY from environment without caching stale values."""
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if key == "your_google_maps_api_key_here":
        return ""
    return key


class LatLngInput(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class WaypointInput(BaseModel):
    latLng: LatLngInput | None = None
    placeId: str | None = Field(default=None, min_length=1, max_length=256)
    address: str | None = Field(default=None, min_length=1, max_length=512)


class ComputeRouteRequest(BaseModel):
    origin: WaypointInput
    destination: WaypointInput
    emissionType: Literal["GASOLINE", "HYBRID", "ELECTRIC", "DIESEL"] = "GASOLINE"
    includeEco: bool = True


class ComputeMatrixRequest(BaseModel):
    origins: list[LatLngInput] = Field(..., min_length=1, max_length=25)
    destinations: list[LatLngInput] = Field(..., min_length=1, max_length=25)


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=300)
    pageSize: int = Field(default=5, ge=1, le=10)
    biasCenter: LatLngInput | None = None
    biasRadiusMeters: float = Field(default=50000.0, gt=0.0, le=50000.0)


def _to_routes_waypoint(wp: WaypointInput) -> dict:
    if wp.placeId:
        return {"placeId": wp.placeId}
    if wp.latLng:
        return {
            "location": {
                "latLng": {
                    "latitude": wp.latLng.latitude,
                    "longitude": wp.latLng.longitude,
                }
            }
        }
    if wp.address:
        return {"address": wp.address}
    raise HTTPException(
        status_code=422,
        detail="Waypoint must provide one of latLng, placeId, or address.",
    )


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0))
    try:
        yield
    finally:
        await application.state.http_client.aclose()


app = FastAPI(
    title="Rideshare Booking, Fare Estimator & Live Driver Tracking",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_config() -> dict[str, object]:
    api_key = get_api_key()
    return {
        "googleMapsApiKey": api_key,
        "configured": bool(api_key),
    }


@app.post("/api/places/search")
async def places_search(payload: PlacesSearchRequest, request: Request):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_MAPS_API_KEY is not configured on the server.",
        )

    center = payload.biasCenter or LatLngInput(latitude=34.0522, longitude=-118.2437)
    body = {
        "textQuery": payload.textQuery,
        "pageSize": payload.pageSize,
        "languageCode": "en",
        "regionCode": "US",
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": center.latitude,
                    "longitude": center.longitude,
                },
                "radius": payload.biasRadiusMeters,
            }
        },
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    }

    client: httpx.AsyncClient = request.app.state.http_client
    upstream = await client.post(
        "https://places.googleapis.com/v1/places:searchText",
        json=body,
        headers=headers,
    )
    if upstream.status_code >= 400:
        return JSONResponse(status_code=upstream.status_code, content=upstream.json())
    return upstream.json()


@app.post("/api/routes/compute")
async def compute_routes(payload: ComputeRouteRequest, request: Request):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_MAPS_API_KEY is not configured on the server.",
        )

    body: dict[str, object] = {
        "origin": _to_routes_waypoint(payload.origin),
        "destination": _to_routes_waypoint(payload.destination),
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
        "polylineQuality": "HIGH_QUALITY",
        "polylineEncoding": "ENCODED_POLYLINE",
        "units": "IMPERIAL",
        "languageCode": "en-US",
        "extraComputations": ["FUEL_CONSUMPTION"],
        "routeModifiers": {
            "vehicleInfo": {
                "emissionType": payload.emissionType,
            }
        },
    }

    if payload.includeEco:
        body["requestedReferenceRoutes"] = ["FUEL_EFFICIENT"]

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "routes.distanceMeters,"
            "routes.duration,"
            "routes.staticDuration,"
            "routes.polyline.encodedPolyline,"
            "routes.routeLabels,"
            "routes.travelAdvisory.fuelConsumptionMicroliters,"
            "routes.localizedValues"
        ),
    }

    client: httpx.AsyncClient = request.app.state.http_client
    upstream = await client.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        json=body,
        headers=headers,
    )
    if upstream.status_code >= 400:
        return JSONResponse(status_code=upstream.status_code, content=upstream.json())
    return upstream.json()


@app.post("/api/routes/matrix")
async def compute_route_matrix(payload: ComputeMatrixRequest, request: Request):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_MAPS_API_KEY is not configured on the server.",
        )

    if len(payload.origins) * len(payload.destinations) > 100:
        raise HTTPException(
            status_code=422,
            detail="TRAFFIC_AWARE_OPTIMAL matrix supports at most 100 origin-destination elements.",
        )

    body = {
        "origins": [
            {
                "waypoint": {
                    "location": {
                        "latLng": {
                            "latitude": origin.latitude,
                            "longitude": origin.longitude,
                        }
                    }
                }
            }
            for origin in payload.origins
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
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition",
    }

    client: httpx.AsyncClient = request.app.state.http_client
    upstream = await client.post(
        "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
        json=body,
        headers=headers,
    )
    if upstream.status_code >= 400:
        return JSONResponse(status_code=upstream.status_code, content=upstream.json())
    return upstream.json()


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> Response:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="8" fill="#2563eb"/>'
        '<text x="16" y="21" text-anchor="middle" font-family="sans-serif" '
        'font-size="14" font-weight="700" fill="#ffffff">RF</text>'
        "</svg>"
    )
    return Response(content=svg, media_type="image/svg+xml")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the FastAPI Rideshare & Live Driver Tracking server."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
