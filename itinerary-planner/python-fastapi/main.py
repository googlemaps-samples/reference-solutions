"""FastAPI Backend-for-Frontend (BFF) for Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub.

Proxies Google Maps Platform Web Services (Places API New, Routes API v2, Time Zone API)
with explicit X-Goog-Api-Key and X-Goog-FieldMask headers, strict Pydantic validation,
and mandatory security headers.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import time
from pathlib import Path
from typing import Any, Literal, Optional
from urllib.parse import quote

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

PLACES_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.rating,places.userRatingCount,places.regularOpeningHours,"
    "places.photos,places.primaryTypeDisplayName,places.priceLevel,places.googleMapsUri"
)
PLACE_DETAILS_FIELD_MASK = (
    "id,displayName,formattedAddress,location,viewport,rating,userRatingCount,"
    "regularOpeningHours,photos,primaryTypeDisplayName,googleMapsUri,utcOffsetMinutes"
)
ROUTES_FIELD_MASK = (
    "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,"
    "routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,"
    "routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation,"
    "routes.viewport"
)

PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,200}$")
PHOTO_NAME_RE = re.compile(r"^places/[A-Za-z0-9_.-]+/photos/[A-Za-z0-9_.~=-]+$")

FAVICON_SVG = (
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
    "<rect width='32' height='32' rx='8' fill='#0F766E'/>"
    "<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' "
    "fill='white' font-family='sans-serif' font-size='14' font-weight='700'>VP</text>"
    "</svg>"
)


def get_api_key() -> str:
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


def require_api_key() -> str:
    key = get_api_key()
    if not key or key == "your_google_maps_api_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. "
                "Set it in .env or environment variables to enable live Google Maps Platform requests."
            ),
        )
    return key


class LocationBias(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=15000.0, gt=0.0, le=50000.0)


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=200)
    includedType: Optional[str] = Field(default=None, max_length=80)
    locationBias: Optional[LocationBias] = None
    maxResultCount: int = Field(default=8, ge=1, le=20)
    languageCode: str = Field(default="en", min_length=2, max_length=16)


class PlacesNearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=5000.0, gt=0.0, le=50000.0)
    includedTypes: list[str] = Field(
        default_factory=lambda: ["tourist_attraction"],
        min_length=1,
        max_length=10,
    )
    maxResultCount: int = Field(default=8, ge=1, le=20)
    rankPreference: Literal["POPULARITY", "DISTANCE"] = "POPULARITY"
    languageCode: str = Field(default="en", min_length=2, max_length=16)


class WaypointCoord(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    label: Optional[str] = Field(default=None, max_length=160)


class RouteComputeRequest(BaseModel):
    origin: WaypointCoord
    destination: WaypointCoord
    intermediates: list[WaypointCoord] = Field(default_factory=list, max_length=23)
    travelMode: Literal["DRIVE", "WALK", "TRANSIT", "BICYCLE", "TWO_WHEELER"] = "DRIVE"
    optimizeWaypointOrder: bool = False
    languageCode: str = Field(default="en", min_length=2, max_length=16)

    @field_validator("intermediates")
    @classmethod
    def validate_intermediates(cls, value: list[WaypointCoord]) -> list[WaypointCoord]:
        if len(value) > 23:
            raise ValueError("Maximum 23 intermediate waypoints supported.")
        return value


app = FastAPI(
    title="Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub",
    version="1.0.0",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> Response:
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_client_config() -> dict[str, Any]:
    key = get_api_key()
    has_key = bool(key and key != "your_google_maps_api_key_here")
    return {
        "googleMapsApiKey": key if has_key else "",
        "hasApiKey": has_key,
        "mapId": "DEMO_MAP_ID",
        "attributionId": "gmp_git_agentsamples_v1.0.0",
    }


def _extract_upstream_error(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        if isinstance(data, dict):
            err = data.get("error")
            if isinstance(err, dict):
                return str(err.get("message") or resp.text)
            if "errorMessage" in data:
                return str(data["errorMessage"])
    except Exception:
        pass
    return resp.text[:300]


@app.post("/api/places/search")
async def places_search(payload: PlacesSearchRequest) -> JSONResponse:
    api_key = require_api_key()
    body: dict[str, Any] = {
        "textQuery": payload.textQuery,
        "maxResultCount": payload.maxResultCount,
        "languageCode": payload.languageCode,
    }
    if payload.includedType:
        body["includedType"] = payload.includedType
    if payload.locationBias:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": payload.locationBias.lat,
                    "longitude": payload.locationBias.lng,
                },
                "radius": payload.locationBias.radiusMeters,
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json=body,
            headers=headers,
        )

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Places Text Search error: {_extract_upstream_error(resp)}",
        )
    return JSONResponse(content=resp.json())


@app.post("/api/places/nearby")
async def places_nearby(payload: PlacesNearbyRequest) -> JSONResponse:
    api_key = require_api_key()
    body: dict[str, Any] = {
        "includedTypes": payload.includedTypes,
        "maxResultCount": payload.maxResultCount,
        "rankPreference": payload.rankPreference,
        "languageCode": payload.languageCode,
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": payload.lat,
                    "longitude": payload.lng,
                },
                "radius": payload.radiusMeters,
            }
        },
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            json=body,
            headers=headers,
        )

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Places Nearby Search error: {_extract_upstream_error(resp)}",
        )
    return JSONResponse(content=resp.json())


@app.get("/api/places/details")
async def places_details(
    placeId: str = Query(..., min_length=6, max_length=200),
    languageCode: str = Query(default="en", min_length=2, max_length=16),
) -> JSONResponse:
    if not PLACE_ID_RE.match(placeId):
        raise HTTPException(status_code=400, detail="Invalid placeId format.")
    api_key = require_api_key()

    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"https://places.googleapis.com/v1/places/{quote(placeId, safe='')}",
            params={"languageCode": languageCode},
            headers=headers,
        )

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Place Details error: {_extract_upstream_error(resp)}",
        )
    return JSONResponse(content=resp.json())


@app.get("/api/places/photo")
async def places_photo(
    name: str = Query(..., min_length=10, max_length=512),
    maxWidthPx: int = Query(default=640, ge=1, le=1600),
    format: Literal["image", "json"] = Query(default="image"),
) -> Response:
    if not PHOTO_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid Places photo resource name.")
    api_key = require_api_key()

    media_url = f"https://places.googleapis.com/v1/{name}/media"
    headers = {"X-Goog-Api-Key": api_key}
    params = {"maxWidthPx": maxWidthPx, "skipHttpRedirect": "true"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(media_url, params=params, headers=headers)

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Place Photo error: {_extract_upstream_error(resp)}",
        )

    data = resp.json()
    photo_uri = data.get("photoUri")
    if format == "json":
        return JSONResponse(content=data)
    if not photo_uri:
        raise HTTPException(status_code=404, detail="Photo URI not found.")
    return RedirectResponse(url=photo_uri, status_code=302)


def _to_routes_waypoint(coord: WaypointCoord) -> dict[str, Any]:
    return {
        "location": {
            "latLng": {
                "latitude": coord.lat,
                "longitude": coord.lng,
            }
        }
    }


def _parse_duration_seconds(duration_str: Optional[str]) -> int:
    if not duration_str:
        return 0
    cleaned = duration_str.rstrip("s")
    try:
        return int(float(cleaned))
    except ValueError:
        return 0


async def _call_compute_routes(
    client: httpx.AsyncClient,
    api_key: str,
    body: dict[str, Any],
) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
    }
    resp = await client.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        json=body,
        headers=headers,
    )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Routes API error: {_extract_upstream_error(resp)}",
        )
    return resp.json()


@app.post("/api/routes/compute")
async def routes_compute(payload: RouteComputeRequest) -> JSONResponse:
    api_key = require_api_key()

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Routes API v2 does not support intermediate waypoints or waypoint optimization for TRANSIT.
        # Compute each transit leg sequentially and aggregate into a unified multi-leg response.
        if payload.travelMode == "TRANSIT" and payload.intermediates:
            stops = [payload.origin, *payload.intermediates, payload.destination]
            leg_tasks = []
            for idx in range(len(stops) - 1):
                leg_body = {
                    "origin": _to_routes_waypoint(stops[idx]),
                    "destination": _to_routes_waypoint(stops[idx + 1]),
                    "travelMode": "TRANSIT",
                    "languageCode": payload.languageCode,
                }
                leg_tasks.append(_call_compute_routes(client, api_key, leg_body))

            leg_responses = await asyncio.gather(*leg_tasks)
            combined_legs: list[dict[str, Any]] = []
            encoded_polylines: list[str] = []
            total_distance = 0
            total_duration_sec = 0

            for leg_resp in leg_responses:
                routes = leg_resp.get("routes") or []
                if not routes:
                    continue
                route = routes[0]
                total_distance += int(route.get("distanceMeters") or 0)
                total_duration_sec += _parse_duration_seconds(route.get("duration"))
                poly = (route.get("polyline") or {}).get("encodedPolyline")
                if poly:
                    encoded_polylines.append(poly)
                for leg in route.get("legs") or []:
                    combined_legs.append(leg)

            return JSONResponse(
                content={
                    "routes": [
                        {
                            "distanceMeters": total_distance,
                            "duration": f"{total_duration_sec}s",
                            "polyline": {
                                "encodedPolyline": encoded_polylines[0] if len(encoded_polylines) == 1 else ""
                            },
                            "encodedPolylines": encoded_polylines,
                            "legs": combined_legs,
                            "optimizedIntermediateWaypointIndex": [],
                        }
                    ]
                }
            )

        body: dict[str, Any] = {
            "origin": _to_routes_waypoint(payload.origin),
            "destination": _to_routes_waypoint(payload.destination),
            "travelMode": payload.travelMode,
            "languageCode": payload.languageCode,
        }
        if payload.intermediates:
            body["intermediates"] = [_to_routes_waypoint(w) for w in payload.intermediates]
        if payload.travelMode in ("DRIVE", "TWO_WHEELER"):
            body["routingPreference"] = "TRAFFIC_AWARE"
        if payload.optimizeWaypointOrder and len(payload.intermediates) >= 2 and payload.travelMode != "TRANSIT":
            body["optimizeWaypointOrder"] = True

        result = await _call_compute_routes(client, api_key, body)
        routes = result.get("routes") or []
        if routes:
            poly = (routes[0].get("polyline") or {}).get("encodedPolyline")
            routes[0]["encodedPolylines"] = [poly] if poly else []
        return JSONResponse(content=result)


@app.get("/api/timezone")
async def get_timezone(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    timestamp: Optional[int] = Query(default=None, ge=0),
    language: str = Query(default="en", min_length=2, max_length=16),
) -> JSONResponse:
    api_key = require_api_key()
    ts = timestamp if timestamp is not None else int(time.time())

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/timezone/json",
            params={
                "location": f"{lat},{lng}",
                "timestamp": ts,
                "language": language,
                "key": api_key,
            },
        )

    if resp.status_code >= 400:
        return JSONResponse(
            content={
                "status": "UNAVAILABLE",
                "detail": f"Time Zone API HTTP error: {_extract_upstream_error(resp)}",
            }
        )

    data = resp.json()
    if data.get("status") != "OK":
        return JSONResponse(
            content={
                "status": data.get("status", "UNAVAILABLE"),
                "detail": data.get("errorMessage", "Unable to resolve time zone"),
            }
        )

    raw_offset = int(data.get("rawOffset", 0))
    dst_offset = int(data.get("dstOffset", 0))
    return JSONResponse(
        content={
            "status": data.get("status"),
            "timeZoneId": data.get("timeZoneId"),
            "timeZoneName": data.get("timeZoneName"),
            "rawOffset": raw_offset,
            "dstOffset": dst_offset,
            "totalOffsetSeconds": raw_offset + dst_offset,
        }
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Multi-Day Trip Itinerary Planner FastAPI server.")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind on 127.0.0.1")
    args = parser.parse_args()
    uvicorn.run(app, host="127.0.0.1", port=args.port)
