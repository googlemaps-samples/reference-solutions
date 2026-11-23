"""FastAPI Backend-for-Frontend (BFF) for the Multi-Modal Commute Comparator & Trail Elevation Tracker."""

from __future__ import annotations

import argparse
from contextlib import asynccontextmanager
import math
import os
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic import BaseModel, Field, model_validator
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

DEFAULT_ORIGIN_QUERY = "Denver Union Station, Denver, CO"
DEFAULT_DESTINATION_QUERY = "Chautauqua Park, Boulder, CO"
FRONT_RANGE_CENTER = {"latitude": 39.884, "longitude": -105.135}
FRONT_RANGE_RADIUS_METERS = 50000.0

ROUTES_FIELD_MASK = (
    "routes.routeLabels,"
    "routes.distanceMeters,"
    "routes.duration,"
    "routes.staticDuration,"
    "routes.polyline.encodedPolyline,"
    "routes.legs.distanceMeters,"
    "routes.legs.duration,"
    "routes.travelAdvisory.tollInfo,"
    "routes.travelAdvisory.fuelConsumptionMicroliters,"
    "routes.warnings,"
    "routes.localizedValues"
)

PLACES_SEARCH_FIELD_MASK = (
    "places.id,"
    "places.displayName,"
    "places.formattedAddress,"
    "places.location"
)

PLACES_AUTOCOMPLETE_FIELD_MASK = (
    "suggestions.placePrediction.placeId,"
    "suggestions.placePrediction.text,"
    "suggestions.placePrediction.structuredFormat"
)


def get_api_key() -> str:
    """Return the configured GOOGLE_MAPS_API_KEY without exposing it in logs."""
    return os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()


def require_api_key() -> str:
    """Return the API key or raise an HTTP 503 error if unconfigured."""
    api_key = get_api_key()
    if not api_key or api_key == "your_google_maps_api_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Set it in .env or environment "
                "variables (see .env.example for Maps Demo Key instructions)."
            ),
        )
    return api_key


def sanitize_upstream_error(message: str, api_key: str) -> str:
    """Strip any accidental API key occurrences from upstream error messages."""
    if not message:
        return "Upstream Google Maps Platform request failed."
    return message.replace(api_key, "[REDACTED]") if api_key else message


def decode_polyline(encoded: str) -> list[tuple[float, float]]:
    """Decode a Google Encoded Polyline string into (lat, lng) tuples."""
    points: list[tuple[float, float]] = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)

    while index < length:
        shift = 0
        result = 0
        while index < length:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift = 0
        result = 0
        while index < length:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        points.append((lat / 1e5, lng / 1e5))

    return points


def encode_polyline(points: list[tuple[float, float]]) -> str:
    """Encode (lat, lng) tuples into a Google Encoded Polyline string."""
    encoded_chars: list[str] = []
    prev_lat = 0
    prev_lng = 0

    for lat, lng in points:
        lat_e5 = round(lat * 1e5)
        lng_e5 = round(lng * 1e5)
        for diff in (lat_e5 - prev_lat, lng_e5 - prev_lng):
            value = ~(diff << 1) if diff < 0 else (diff << 1)
            while value >= 0x20:
                encoded_chars.append(chr((0x20 | (value & 0x1F)) + 63))
                value >>= 5
            encoded_chars.append(chr(value + 63))
        prev_lat = lat_e5
        prev_lng = lng_e5

    return "".join(encoded_chars)


def downsample_points(
    points: list[tuple[float, float]], max_points: int = 380
) -> list[tuple[float, float]]:
    """Uniformly downsample polyline vertices while preserving start and end."""
    if len(points) <= max_points:
        return points
    step = (len(points) - 1) / (max_points - 1)
    sampled = [points[round(i * step)] for i in range(max_points - 1)]
    sampled.append(points[-1])
    return sampled


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance in meters between two WGS84 coordinates."""
    earth_radius = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    return 2.0 * earth_radius * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class LatLngLiteral(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class PlaceSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=256)
    maxResultCount: int = Field(default=5, ge=1, le=20)
    locationBias: dict[str, Any] | None = None


class PlaceAutocompleteRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=256)
    sessionToken: str | None = Field(default=None, max_length=128)
    origin: LatLngLiteral | None = None


class RouteEndpoint(BaseModel):
    placeId: str | None = Field(default=None, max_length=256)
    latLng: LatLngLiteral | None = None
    address: str | None = Field(default=None, max_length=256)

    @model_validator(mode="after")
    def validate_non_empty(self) -> "RouteEndpoint":
        if not self.placeId and not self.latLng and not self.address:
            raise ValueError("Endpoint requires placeId, latLng, or address.")
        return self

    def to_waypoint(self) -> dict[str, Any]:
        if self.placeId:
            return {"placeId": self.placeId}
        if self.latLng:
            return {
                "location": {
                    "latLng": {
                        "latitude": self.latLng.lat,
                        "longitude": self.latLng.lng,
                    }
                }
            }
        return {"address": self.address}


class RouteComputeRequest(BaseModel):
    origin: RouteEndpoint
    destination: RouteEndpoint
    travelMode: Literal["DRIVE", "BICYCLE", "WALK", "TRANSIT"] = "BICYCLE"
    avoidTolls: bool = False
    avoidHighways: bool = False
    ecoFriendly: bool = False
    computeAlternativeRoutes: bool = True
    emissionType: Literal["GASOLINE", "ELECTRIC", "HYBRID", "DIESEL"] = "GASOLINE"


class ElevationProfileRequest(BaseModel):
    encodedPolyline: str = Field(..., min_length=2, max_length=16000)
    samples: int = Field(default=64, ge=2, le=256)


@asynccontextmanager
async def lifespan(application: FastAPI):
    async with httpx.AsyncClient(timeout=20.0) as client:
        application.state.http_client = client
        yield


app = FastAPI(
    title="Front Range Multi-Modal Commute Comparator & Trail Elevation Tracker",
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


@app.get("/api/health")
async def health() -> dict[str, Any]:
    api_key = get_api_key()
    return {
        "status": "ok",
        "configured": bool(api_key and api_key != "your_google_maps_api_key_here"),
    }


@app.get("/api/config")
async def get_config() -> JSONResponse:
    api_key = get_api_key()
    configured = bool(api_key and api_key != "your_google_maps_api_key_here")
    return JSONResponse(
        content={
            "mapsApiKey": api_key if configured else "",
            "configured": configured,
            "mapId": "DEMO_MAP_ID",
            "attributionId": "gmp_git_agentsamples_v1.0.0",
            "initialCenter": {"lat": 39.884, "lng": -105.135},
            "initialZoom": 11,
            "defaultOriginQuery": DEFAULT_ORIGIN_QUERY,
            "defaultDestinationQuery": DEFAULT_DESTINATION_QUERY,
        },
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/places/search")
async def search_places(payload: PlaceSearchRequest, request: Request) -> dict[str, Any]:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    body: dict[str, Any] = {
        "textQuery": payload.textQuery,
        "maxResultCount": payload.maxResultCount,
        "locationBias": payload.locationBias
        or {
            "circle": {
                "center": FRONT_RANGE_CENTER,
                "radius": FRONT_RANGE_RADIUS_METERS,
            }
        },
    }

    upstream = await client.post(
        "https://places.googleapis.com/v1/places:searchText",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": PLACES_SEARCH_FIELD_MASK,
        },
        json=body,
    )

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=sanitize_upstream_error(upstream.text, api_key),
        )

    data = upstream.json()
    normalized_places = []
    for place in data.get("places", []):
        loc = place.get("location") or {}
        if "latitude" not in loc or "longitude" not in loc:
            continue
        display_name_obj = place.get("displayName") or {}
        normalized_places.append(
            {
                "id": place.get("id", ""),
                "displayName": display_name_obj.get("text", payload.textQuery),
                "formattedAddress": place.get("formattedAddress", ""),
                "location": {
                    "lat": loc["latitude"],
                    "lng": loc["longitude"],
                },
            }
        )

    return {"places": normalized_places}


@app.post("/api/places/autocomplete")
async def autocomplete_places(
    payload: PlaceAutocompleteRequest, request: Request
) -> dict[str, Any]:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    body: dict[str, Any] = {
        "input": payload.input,
        "locationBias": {
            "circle": {
                "center": FRONT_RANGE_CENTER,
                "radius": FRONT_RANGE_RADIUS_METERS,
            }
        },
        "includedRegionCodes": ["us"],
    }
    if payload.sessionToken:
        body["sessionToken"] = payload.sessionToken
    if payload.origin:
        body["origin"] = {
            "latitude": payload.origin.lat,
            "longitude": payload.origin.lng,
        }

    upstream = await client.post(
        "https://places.googleapis.com/v1/places:autocomplete",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": PLACES_AUTOCOMPLETE_FIELD_MASK,
        },
        json=body,
    )

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=sanitize_upstream_error(upstream.text, api_key),
        )

    return upstream.json()


def build_compute_routes_body(payload: RouteComputeRequest) -> dict[str, Any]:
    """Build a valid Routes API v2 computeRoutes payload respecting mode constraints."""
    body: dict[str, Any] = {
        "origin": payload.origin.to_waypoint(),
        "destination": payload.destination.to_waypoint(),
        "travelMode": payload.travelMode,
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }

    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
        body["computeAlternativeRoutes"] = payload.computeAlternativeRoutes
        modifiers: dict[str, Any] = {}
        if payload.avoidTolls:
            modifiers["avoidTolls"] = True
        if payload.avoidHighways:
            modifiers["avoidHighways"] = True
        extra_computations = ["TOLLS"]
        if payload.ecoFriendly:
            extra_computations.append("FUEL_CONSUMPTION")
            modifiers["vehicleInfo"] = {"emissionType": payload.emissionType}
            body["requestedReferenceRoutes"] = ["FUEL_EFFICIENT"]
        if modifiers:
            body["routeModifiers"] = modifiers
        body["extraComputations"] = extra_computations
    elif payload.travelMode in ("BICYCLE", "WALK"):
        body["computeAlternativeRoutes"] = payload.computeAlternativeRoutes
    else:
        # TRANSIT routes: omit unsupported routingPreference / road routeModifiers
        body["computeAlternativeRoutes"] = payload.computeAlternativeRoutes

    return body


@app.post("/api/routes/compute")
async def compute_routes(
    payload: RouteComputeRequest, request: Request
) -> dict[str, Any]:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    body = build_compute_routes_body(payload)
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
    }

    upstream = await client.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        headers=headers,
        json=body,
    )

    # Graceful fallback if eco-friendly or alternative-routes combo is rejected for a corridor
    if upstream.status_code == 400 and (
        "requestedReferenceRoutes" in body or body.get("computeAlternativeRoutes")
    ):
        fallback_body = dict(body)
        fallback_body.pop("requestedReferenceRoutes", None)
        if payload.travelMode == "TRANSIT":
            fallback_body["computeAlternativeRoutes"] = False
        upstream = await client.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            headers=headers,
            json=fallback_body,
        )

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=sanitize_upstream_error(upstream.text, api_key),
        )

    data = upstream.json()
    return {
        "travelMode": payload.travelMode,
        "routes": data.get("routes", []),
        "fallbackInfo": data.get("fallbackInfo"),
    }


@app.post("/api/elevation/profile")
async def elevation_profile(
    payload: ElevationProfileRequest, request: Request
) -> dict[str, Any]:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    decoded = decode_polyline(payload.encodedPolyline)
    if len(decoded) < 2:
        raise HTTPException(
            status_code=400,
            detail="Encoded polyline must contain at least 2 coordinates.",
        )

    # Elevation API limits paths to 512 coordinates and URLs to 16384 chars.
    safe_points = downsample_points(decoded, max_points=380)
    encoded_path = (
        payload.encodedPolyline
        if len(decoded) <= 380 and len(payload.encodedPolyline) < 12000
        else encode_polyline(safe_points)
    )

    upstream = await client.get(
        "https://maps.googleapis.com/maps/api/elevation/json",
        params={
            "path": f"enc:{encoded_path}",
            "samples": str(payload.samples),
            "key": api_key,
        },
    )

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=sanitize_upstream_error(upstream.text, api_key),
        )

    data = upstream.json()
    status = data.get("status")
    if status != "OK":
        raise HTTPException(
            status_code=502,
            detail=sanitize_upstream_error(
                data.get("error_message") or f"Elevation API returned status: {status}",
                api_key,
            ),
        )

    raw_results = data.get("results", [])
    enriched_results = []
    cumulative_distance = 0.0
    total_gain = 0.0
    total_loss = 0.0
    max_grade = 0.0
    min_elev = float("inf")
    max_elev = float("-inf")

    for idx, item in enumerate(raw_results):
        elev = float(item["elevation"])
        loc = item["location"]
        resolution = float(item.get("resolution", 0.0))
        min_elev = min(min_elev, elev)
        max_elev = max(max_elev, elev)

        grade_percent = 0.0
        if idx > 0:
            prev_item = raw_results[idx - 1]
            prev_loc = prev_item["location"]
            prev_elev = float(prev_item["elevation"])
            segment_dist = haversine_meters(
                float(prev_loc["lat"]),
                float(prev_loc["lng"]),
                float(loc["lat"]),
                float(loc["lng"]),
            )
            cumulative_distance += segment_dist
            delta_elev = elev - prev_elev
            if delta_elev > 0:
                total_gain += delta_elev
            else:
                total_loss += abs(delta_elev)
            if segment_dist > 1.0:
                grade_percent = (delta_elev / segment_dist) * 100.0
                max_grade = max(max_grade, abs(grade_percent))

        enriched_results.append(
            {
                "index": idx,
                "elevation": round(elev, 2),
                "resolution": round(resolution, 2),
                "location": {"lat": float(loc["lat"]), "lng": float(loc["lng"])},
                "distanceMeters": round(cumulative_distance, 1),
                "gradePercent": round(grade_percent, 2),
            }
        )

    if not enriched_results:
        min_elev = 0.0
        max_elev = 0.0

    return {
        "status": "OK",
        "results": enriched_results,
        "summary": {
            "totalGainMeters": round(total_gain, 1),
            "totalLossMeters": round(total_loss, 1),
            "minElevationMeters": round(min_elev, 1),
            "maxElevationMeters": round(max_elev, 1),
            "maxGradePercent": round(max_grade, 1),
            "totalDistanceMeters": round(cumulative_distance, 1),
        },
    }


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> FileResponse:
    return FileResponse(STATIC_DIR / "favicon.svg", media_type="image/svg+xml")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Travel Route Comparator FastAPI server."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)
