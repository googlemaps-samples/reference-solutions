"""FastAPI BFF & Static Server for the Hyperlocal Neighborhood Directory & Spot Mapper."""

from __future__ import annotations

import argparse
from contextlib import asynccontextmanager
import os
from pathlib import Path
import re
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"
DEFAULT_CENTER = {"lat": 51.5118, "lng": -0.1280}
DEFAULT_ZOOM = 13
DEFAULT_RADIUS_METERS = 5000.0

ALLOWED_PLACE_TYPES = frozenset({"restaurant", "cafe", "museum", "park"})
PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,256}$")
PHOTO_NAME_RE = re.compile(r"^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$")

NEARBY_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.primaryType,places.primaryTypeDisplayName,places.types,"
    "places.rating,places.userRatingCount,places.priceLevel,"
    "places.regularOpeningHours,places.photos,places.googleMapsUri"
)

DETAILS_FIELD_MASK = (
    "id,displayName,formattedAddress,location,primaryType,"
    "primaryTypeDisplayName,types,rating,userRatingCount,priceLevel,"
    "regularOpeningHours,reviews,photos,websiteUri,"
    "internationalPhoneNumber,googleMapsUri"
)


def get_api_key() -> str:
    """Read GOOGLE_MAPS_API_KEY from environment without ever hardcoding a secret."""
    load_dotenv(BASE_DIR / ".env", override=False)
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if key == "your_google_maps_api_key_here":
        return ""
    return key


def require_api_key() -> str:
    """Return configured GOOGLE_MAPS_API_KEY or raise HTTP 503."""
    key = get_api_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env "
                "and set GOOGLE_MAPS_API_KEY to a valid Maps Demo Key or Cloud API key."
            ),
        )
    return key


class NearbySearchRequest(BaseModel):
    lat: float = Field(default=DEFAULT_CENTER["lat"], ge=-90.0, le=90.0)
    lng: float = Field(default=DEFAULT_CENTER["lng"], ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=DEFAULT_RADIUS_METERS, gt=0.0, le=50000.0)
    includedTypes: list[str] = Field(
        default_factory=lambda: ["restaurant", "cafe", "museum", "park"],
        min_length=1,
        max_length=10,
    )
    maxResultCount: int = Field(default=20, ge=1, le=20)
    rankPreference: Literal["POPULARITY", "DISTANCE"] = "POPULARITY"

    @field_validator("includedTypes")
    @classmethod
    def validate_types(cls, values: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in values:
            normalized = item.strip().lower()
            if normalized not in ALLOWED_PLACE_TYPES:
                raise ValueError(
                    f"Unsupported place type '{item}'. Allowed: {sorted(ALLOWED_PLACE_TYPES)}"
                )
            if normalized not in cleaned:
                cleaned.append(normalized)
        return cleaned


class TextSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(default=DEFAULT_CENTER["lat"], ge=-90.0, le=90.0)
    lng: float = Field(default=DEFAULT_CENTER["lng"], ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=DEFAULT_RADIUS_METERS, gt=0.0, le=50000.0)
    includedType: str | None = Field(default=None, max_length=64)
    pageSize: int = Field(default=20, ge=1, le=20)

    @field_validator("textQuery")
    @classmethod
    def strip_query(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("textQuery must not be blank.")
        return trimmed

    @field_validator("includedType")
    @classmethod
    def validate_included_type(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip().lower()
        if normalized not in ALLOWED_PLACE_TYPES:
            raise ValueError(
                f"Unsupported includedType '{value}'. Allowed: {sorted(ALLOWED_PLACE_TYPES)}"
            )
        return normalized


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    timeout = httpx.Timeout(12.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        app_instance.state.http = client
        yield


app = FastAPI(
    title="Hyperlocal Neighborhood Directory & Spot Mapper",
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


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


def _extract_upstream_error(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        if isinstance(data, dict):
            if "error" in data and isinstance(data["error"], dict):
                return str(data["error"].get("message") or resp.reason_phrase)
            if "error_message" in data:
                return str(data["error_message"])
    except Exception:
        pass
    return f"Upstream Google Maps Platform request failed ({resp.status_code})."


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "configured": bool(get_api_key())}


@app.get("/api/config")
async def get_config() -> dict[str, Any]:
    key = get_api_key()
    return {
        "configured": bool(key),
        "googleMapsApiKey": key,
        "mapId": DEFAULT_MAP_ID,
        "attributionId": ATTRIBUTION_ID,
        "defaultCenter": DEFAULT_CENTER,
        "defaultZoom": DEFAULT_ZOOM,
        "radiusMeters": DEFAULT_RADIUS_METERS,
    }


@app.post("/api/places/nearby")
async def places_nearby(payload: NearbySearchRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client = get_http_client(request)

    upstream_body = {
        "includedTypes": payload.includedTypes,
        "maxResultCount": payload.maxResultCount,
        "rankPreference": payload.rankPreference,
        "languageCode": "en",
        "locationRestriction": {
            "circle": {
                "center": {"latitude": payload.lat, "longitude": payload.lng},
                "radius": payload.radiusMeters,
            }
        },
    }

    try:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            json=upstream_body,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": NEARBY_FIELD_MASK,
            },
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting Places API: {exc}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    data = resp.json()
    return JSONResponse(content={"places": data.get("places", [])})


@app.post("/api/places/search")
async def places_search(payload: TextSearchRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client = get_http_client(request)

    upstream_body: dict[str, Any] = {
        "textQuery": payload.textQuery,
        "pageSize": payload.pageSize,
        "languageCode": "en",
        "regionCode": "GB",
        "locationBias": {
            "circle": {
                "center": {"latitude": payload.lat, "longitude": payload.lng},
                "radius": payload.radiusMeters,
            }
        },
    }
    if payload.includedType:
        upstream_body["includedType"] = payload.includedType
        upstream_body["strictTypeFiltering"] = True

    try:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json=upstream_body,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": NEARBY_FIELD_MASK,
            },
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting Places API: {exc}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    data = resp.json()
    return JSONResponse(content={"places": data.get("places", [])})


@app.get("/api/places/details")
async def places_details(
    request: Request,
    placeId: str = Query(..., min_length=4, max_length=256),
) -> JSONResponse:
    api_key = require_api_key()
    cleaned_id = placeId.strip()
    if not PLACE_ID_RE.match(cleaned_id):
        raise HTTPException(status_code=400, detail="Invalid placeId format.")

    client = get_http_client(request)
    try:
        resp = await client.get(
            f"https://places.googleapis.com/v1/places/{cleaned_id}",
            params={"languageCode": "en"},
            headers={
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": DETAILS_FIELD_MASK,
            },
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting Places API: {exc}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.get("/api/places/photo")
async def places_photo(
    request: Request,
    name: str = Query(..., min_length=10, max_length=512),
    maxWidthPx: int = Query(default=640, ge=64, le=1600),
):
    api_key = require_api_key()
    cleaned_name = name.strip()
    if not PHOTO_NAME_RE.match(cleaned_name):
        raise HTTPException(status_code=400, detail="Invalid Places photo resource name.")

    client = get_http_client(request)
    try:
        resp = await client.get(
            f"https://places.googleapis.com/v1/{cleaned_name}/media",
            params={"maxWidthPx": maxWidthPx, "skipHttpRedirect": "true"},
            headers={"X-Goog-Api-Key": api_key},
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting Place Photos API: {exc}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    data = resp.json()
    photo_uri = data.get("photoUri", "")
    if not isinstance(photo_uri, str) or not photo_uri.startswith("https://"):
        raise HTTPException(status_code=502, detail="Unexpected photoUri from Places API.")

    return RedirectResponse(url=photo_uri, status_code=302)


@app.get("/api/geocode")
async def geocode(
    request: Request,
    address: str | None = Query(default=None, min_length=1, max_length=300),
    lat: float | None = Query(default=None, ge=-90.0, le=90.0),
    lng: float | None = Query(default=None, ge=-180.0, le=180.0),
    place_id: str | None = Query(default=None, min_length=4, max_length=256),
) -> JSONResponse:
    api_key = require_api_key()
    params: dict[str, str] = {"key": api_key, "language": "en"}

    if lat is not None and lng is not None:
        params["latlng"] = f"{lat:.6f},{lng:.6f}"
    elif address is not None and address.strip():
        params["address"] = address.strip()
        params["region"] = "gb"
    elif place_id is not None and place_id.strip():
        cleaned = place_id.strip()
        if not PLACE_ID_RE.match(cleaned):
            raise HTTPException(status_code=400, detail="Invalid place_id format.")
        params["place_id"] = cleaned
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'address', both 'lat' and 'lng', or 'place_id'.",
        )

    client = get_http_client(request)
    try:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params=params,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting Geocoding API: {exc}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    raw = resp.json()
    status = raw.get("status", "UNKNOWN_ERROR")
    if status not in {"OK", "ZERO_RESULTS"}:
        message = raw.get("error_message") or f"Geocoding failed with status: {status}"
        raise HTTPException(status_code=502, detail=message)

    projected = [
        {
            "formatted_address": item.get("formatted_address", ""),
            "place_id": item.get("place_id", ""),
            "geometry": item.get("geometry", {}),
            "address_components": item.get("address_components", []),
            "plus_code": item.get("plus_code"),
            "types": item.get("types", []),
        }
        for item in raw.get("results", [])[:5]
    ]
    return JSONResponse(content={"status": status, "results": projected})


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> Response:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="8" fill="#1a73e8"/>'
        '<text x="16" y="22" text-anchor="middle" font-family="sans-serif" '
        'font-size="18" font-weight="bold" fill="white">L</text></svg>'
    )
    return Response(content=svg, media_type="image/svg+xml")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Hyperlocal Neighborhood Directory & Spot Mapper FastAPI server."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    return parser.parse_args()


if __name__ == "__main__":
    import uvicorn

    args = parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
