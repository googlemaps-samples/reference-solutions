from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / ".env.local", override=True)

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"
PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PLACES_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,places.types"
)
ELEVATION_API_URL = "https://maps.googleapis.com/maps/api/elevation/json"


def _get_api_key() -> str:
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if key == "your_google_maps_api_key_here":
        return ""
    return key


class LatLngPoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class PlaceSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(default=40.73061, ge=-90.0, le=90.0)
    lng: float = Field(default=-73.98661, ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=12000.0, gt=0.0, le=50000.0)
    maxResultCount: int = Field(default=8, ge=1, le=20)


class ElevationRequest(BaseModel):
    locations: list[LatLngPoint] = Field(..., min_length=1, max_length=64)


app = FastAPI(
    title="Enterprise GIS Workbench BFF",
    description="FastAPI Backend-for-Frontend proxy for Google Maps Platform Places API (New) and Elevation API.",
    version="1.0.0",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Any:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> Response:
    return Response(status_code=204)


@app.get("/api/health")
async def health_check() -> JSONResponse:
    return JSONResponse({"status": "ok", "hasKey": bool(_get_api_key())})


@app.get("/api/config")
async def get_client_config() -> JSONResponse:
    api_key = _get_api_key()
    return JSONResponse(
        {
            "googleMapsApiKey": api_key,
            "hasKey": bool(api_key),
            "mapId": DEFAULT_MAP_ID,
            "attributionId": ATTRIBUTION_ID,
        }
    )


@app.post("/api/places/search")
async def search_places(payload: PlaceSearchRequest) -> JSONResponse:
    api_key = _get_api_key()
    if not api_key:
        return JSONResponse(
            {
                "places": [],
                "configured": False,
                "status": "UNCONFIGURED",
                "message": "GOOGLE_MAPS_API_KEY is not configured in .env.",
            }
        )

    request_body = {
        "textQuery": payload.textQuery,
        "maxResultCount": payload.maxResultCount,
        "languageCode": "en",
        "regionCode": "US",
        "locationBias": {
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

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            upstream = await client.post(
                PLACES_TEXT_SEARCH_URL,
                json=request_body,
                headers=headers,
            )
        data = upstream.json()
    except (httpx.HTTPError, ValueError) as exc:
        return JSONResponse(
            {
                "places": [],
                "configured": True,
                "status": "UPSTREAM_ERROR",
                "message": f"Places API request failed: {exc.__class__.__name__}",
            }
        )

    if upstream.status_code >= 400:
        error_info = data.get("error", {}) if isinstance(data, dict) else {}
        return JSONResponse(
            {
                "places": [],
                "configured": True,
                "status": error_info.get("status", "ERROR"),
                "message": error_info.get("message", "Places API returned an error."),
            }
        )

    raw_places = data.get("places", []) if isinstance(data, dict) else []
    projected_places = [
        {
            "id": place.get("id", ""),
            "displayName": place.get("displayName", {}),
            "formattedAddress": place.get("formattedAddress", ""),
            "location": place.get("location", {}),
            "types": place.get("types", []),
        }
        for place in raw_places
    ]

    return JSONResponse(
        {
            "places": projected_places,
            "configured": True,
            "status": "OK",
        }
    )


@app.post("/api/elevation")
async def query_elevation(payload: ElevationRequest) -> JSONResponse:
    api_key = _get_api_key()
    if not api_key:
        return JSONResponse(
            {
                "results": [],
                "configured": False,
                "status": "UNCONFIGURED",
                "message": "GOOGLE_MAPS_API_KEY is not configured in .env.",
            }
        )

    locations_param = "|".join(f"{pt.lat:.6f},{pt.lng:.6f}" for pt in payload.locations)
    params = {
        "locations": locations_param,
        "key": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            upstream = await client.get(ELEVATION_API_URL, params=params)
        data = upstream.json()
    except (httpx.HTTPError, ValueError) as exc:
        return JSONResponse(
            {
                "results": [],
                "configured": True,
                "status": "UPSTREAM_ERROR",
                "message": f"Elevation API request failed: {exc.__class__.__name__}",
            }
        )

    if upstream.status_code >= 400 or not isinstance(data, dict):
        return JSONResponse(
            {
                "results": [],
                "configured": True,
                "status": "ERROR",
                "message": "Elevation API returned an error.",
            }
        )

    raw_results = data.get("results", [])
    projected_results = [
        {
            "elevation": item.get("elevation"),
            "location": item.get("location"),
            "resolution": item.get("resolution"),
        }
        for item in raw_results
        if isinstance(item, dict)
    ]

    return JSONResponse(
        {
            "results": projected_results,
            "status": data.get("status", "UNKNOWN_ERROR"),
            "message": data.get("error_message", ""),
            "configured": True,
        }
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Enterprise GIS Workbench FastAPI server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (strictly 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Listen port (default: 8000)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    uvicorn.run(app, host="127.0.0.1", port=args.port)
