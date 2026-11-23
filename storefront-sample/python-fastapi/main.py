"""FastAPI Backend-for-Frontend (BFF) for the Single-Venue Dental Clinic Storefront."""

from __future__ import annotations

import argparse
from contextlib import asynccontextmanager
import os
from pathlib import Path
import re
from typing import Any, Literal
import uuid

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

PLACES_SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText"
PLACES_SEARCH_FIELD_MASK = (
    "places.id,"
    "places.displayName,"
    "places.formattedAddress,"
    "places.location,"
    "places.rating,"
    "places.userRatingCount,"
    "places.regularOpeningHours,"
    "places.currentOpeningHours,"
    "places.reviews,"
    "places.photos,"
    "places.nationalPhoneNumber,"
    "places.websiteUri,"
    "places.googleMapsUri,"
    "places.businessStatus"
)

ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
ROUTES_FIELD_MASK = (
    "routes.duration,"
    "routes.distanceMeters,"
    "routes.polyline.encodedPolyline,"
    "routes.localizedValues"
)

PHOTO_NAME_PATTERN = re.compile(r"^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_=-]+$")
PLACEHOLDER_KEY = "your_google_maps_api_key_here"


def get_api_key() -> str:
    """Read GOOGLE_MAPS_API_KEY from the environment."""
    raw = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not raw or raw == PLACEHOLDER_KEY:
        return ""
    return raw


def require_api_key() -> str:
    """Return a configured API key or raise an HTTP 503 error."""
    key = get_api_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env "
                "and set GOOGLE_MAPS_API_KEY."
            ),
        )
    return key


class LatLngInput(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class LocationBiasCircle(BaseModel):
    center: LatLngInput
    radius: float = Field(default=5000.0, gt=0.0, le=50000.0)


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(
        default="450 Sutter Dental San Francisco",
        min_length=1,
        max_length=200,
    )
    languageCode: str = Field(default="en", min_length=2, max_length=10)
    regionCode: str = Field(default="US", min_length=2, max_length=4)
    locationBias: LocationBiasCircle | None = None


class RouteComputeRequest(BaseModel):
    origin: LatLngInput
    destination: LatLngInput
    travelMode: Literal["DRIVE", "TRANSIT", "WALK"] = "DRIVE"
    units: Literal["IMPERIAL", "METRIC"] = "IMPERIAL"


class BookingRequest(BaseModel):
    patientName: str = Field(..., min_length=2, max_length=120)
    contactEmail: str = Field(..., min_length=5, max_length=160)
    contactPhone: str = Field(..., min_length=7, max_length=40)
    specialty: Literal[
        "General & Preventive Dentistry",
        "Cosmetic & Veneers",
        "Endodontics & Root Canal",
        "Implantology & Oral Surgery",
        "Orthodontics & Aligners",
        "Periodontics",
    ]
    visitType: Literal[
        "In-Clinic Visit (450 Sutter)",
        "Home Visit (SF Service Area)",
    ]
    preferredDate: str = Field(..., min_length=8, max_length=20)
    preferredTime: str = Field(..., min_length=3, max_length=20)
    notes: str = Field(default="", max_length=300)


@asynccontextmanager
async def lifespan(application: FastAPI):
    timeout = httpx.Timeout(15.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        application.state.http_client = client
        yield


app = FastAPI(
    title="450 Sutter Dental Specialists — Storefront & Directions Hub",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_client_config() -> JSONResponse:
    key = get_api_key()
    return JSONResponse(
        content={
            "googleMapsApiKey": key,
            "configured": bool(key),
            "mapId": "DEMO_MAP_ID",
            "attributionId": "gmp_git_agentsamples_v1.0.0",
            "clinicDefaults": {
                "query": "450 Sutter Dental San Francisco",
                "center": {"lat": 37.7896, "lng": -122.4076},
                "zoom": 13,
                "serviceRadiusMeters": 3500,
                "defaultOrigin": {
                    "label": "Ferry Building, San Francisco, CA",
                    "lat": 37.7955,
                    "lng": -122.3937,
                },
            },
        }
    )


@app.post("/api/places/search")
async def search_places(body: PlacesSearchRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    payload: dict[str, Any] = {
        "textQuery": body.textQuery,
        "languageCode": body.languageCode,
        "regionCode": body.regionCode,
        "pageSize": 5,
    }
    if body.locationBias is not None:
        payload["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": body.locationBias.center.lat,
                    "longitude": body.locationBias.center.lng,
                },
                "radius": body.locationBias.radius,
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_SEARCH_FIELD_MASK,
    }

    try:
        upstream = await client.post(
            PLACES_SEARCH_TEXT_URL,
            json=payload,
            headers=headers,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to contact Places API (New): {exc}",
        ) from exc

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=upstream.text,
        )

    data = upstream.json()
    places = data.get("places", [])
    return JSONResponse(
        content={
            "place": places[0] if places else None,
            "places": places,
        }
    )


@app.get("/api/places/photo")
async def get_place_photo(
    request: Request,
    name: str = Query(..., min_length=10, max_length=2048),
    maxWidthPx: int = Query(default=640, ge=1, le=4800),
) -> Response:
    if not PHOTO_NAME_PATTERN.match(name):
        raise HTTPException(status_code=400, detail="Invalid photo resource name.")

    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    media_url = f"https://places.googleapis.com/v1/{name}/media"
    headers = {"X-Goog-Api-Key": api_key}
    params = {"maxWidthPx": str(maxWidthPx)}

    try:
        upstream = await client.get(media_url, params=params, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch place photo media: {exc}",
        ) from exc

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail="Unable to retrieve photo media from Places API.",
        )

    content_type = upstream.headers.get("content-type", "image/jpeg")
    return Response(
        content=upstream.content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.post("/api/routes/compute")
async def compute_routes(body: RouteComputeRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    payload: dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": body.origin.lat,
                    "longitude": body.origin.lng,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": body.destination.lat,
                    "longitude": body.destination.lng,
                }
            }
        },
        "travelMode": body.travelMode,
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": body.units,
    }
    if body.travelMode == "DRIVE":
        payload["routingPreference"] = "TRAFFIC_AWARE"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
    }

    try:
        upstream = await client.post(
            ROUTES_COMPUTE_URL,
            json=payload,
            headers=headers,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to contact Routes API v2: {exc}",
        ) from exc

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=upstream.text,
        )

    data = upstream.json()
    routes = data.get("routes", [])
    if not routes:
        return JSONResponse(
            content={
                "available": False,
                "travelMode": body.travelMode,
                "message": f"No {body.travelMode.lower()} route was returned for this origin.",
            }
        )

    route = routes[0]
    localized = route.get("localizedValues", {})
    return JSONResponse(
        content={
            "available": True,
            "travelMode": body.travelMode,
            "duration": route.get("duration"),
            "distanceMeters": route.get("distanceMeters"),
            "durationText": localized.get("duration", {}).get("text"),
            "distanceText": localized.get("distance", {}).get("text"),
            "encodedPolyline": route.get("polyline", {}).get("encodedPolyline"),
        }
    )


@app.post("/api/bookings")
async def submit_booking(body: BookingRequest) -> JSONResponse:
    confirmation_id = f"450S-{uuid.uuid4().hex[:6].upper()}"
    return JSONResponse(
        status_code=201,
        content={
            "confirmationId": confirmation_id,
            "status": "CONFIRMED",
            "patientName": body.patientName,
            "contactEmail": body.contactEmail,
            "contactPhone": body.contactPhone,
            "specialty": body.specialty,
            "visitType": body.visitType,
            "preferredDate": body.preferredDate,
            "preferredTime": body.preferredTime,
        },
    )


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> Response:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0f766e">'
        '<path d="M12 21c-1.5 0-2-2.5-2.5-4.5S8 13 6.5 13C4 13 3 10.5 3 7.5 '
        '3 4.5 5 2 8 2c1.8 0 3 .8 4 .8s2.2-.8 4-.8c3 0 5 2.5 5 5.5 0 3-1 '
        '5.5-3.5 5.5-1.5 0-2.5 1.5-3 3.5S13.5 21 12 21Z"/></svg>'
    )
    return Response(content=svg, media_type="image/svg+xml")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run the 450 Sutter Dental Clinic Storefront FastAPI server."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    args = parser.parse_args()
    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)
