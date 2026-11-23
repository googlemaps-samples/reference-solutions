from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import Any, Literal

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

KITCHEN_HUB: dict[str, Any] = {
    "name": "Fulton Market Kitchen & Market Hub",
    "address": "840 W Fulton Market, Chicago, IL 60607",
    "lat": 41.8868,
    "lng": -87.6486,
}

SEED_ADDRESS = "401 N Michigan Ave, Chicago, IL 60611"
PRESET_IN_ZONE_ADDRESS = "401 N Michigan Ave, Chicago, IL 60611"
PRESET_OUT_OF_ZONE_ADDRESS = "1525 E 53rd St, Chicago, IL 60615"
MAX_ROAD_DISTANCE_METERS = 8000

# Clockwise Chicago delivery polygon anchored around Fulton Market (41.8868, -87.6486)
DELIVERY_ZONE_POLYGON: list[dict[str, float]] = [
    {"lat": 41.9255, "lng": -87.6870},
    {"lat": 41.9255, "lng": -87.6320},
    {"lat": 41.9110, "lng": -87.6240},
    {"lat": 41.8940, "lng": -87.6130},
    {"lat": 41.8720, "lng": -87.6170},
    {"lat": 41.8530, "lng": -87.6240},
    {"lat": 41.8530, "lng": -87.6760},
    {"lat": 41.8810, "lng": -87.6910},
    {"lat": 41.9040, "lng": -87.6870},
]

ADDRESS_VALIDATION_FIELD_MASK = (
    "result.verdict,result.address,result.geocode,result.metadata,result.uspsData,responseId"
)
ROUTES_COMPUTE_FIELD_MASK = (
    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
    "routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,"
    "routes.legs.steps.staticDuration"
)

SIZE_PATTERN = re.compile(r"^[1-9]\d{1,3}x[1-9]\d{1,3}$")


def get_api_key() -> str:
    raw = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not raw or raw == "your_google_maps_api_key_here":
        return ""
    return raw


def require_api_key() -> str:
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and "
                "set GOOGLE_MAPS_API_KEY to a valid Google Maps Platform API key."
            ),
        )
    return api_key


def parse_duration_seconds(duration_str: str | None) -> int:
    if not duration_str:
        return 0
    cleaned = duration_str.rstrip("s").strip()
    try:
        return int(round(float(cleaned)))
    except ValueError:
        return 0


def compute_delivery_tier(distance_meters: int) -> dict[str, Any]:
    if distance_meters <= 3000:
        return {
            "withinDistanceLimit": True,
            "tierCode": "TIER_1_EXPRESS",
            "tierLabel": "Neighborhood Express (<= 3.0 km)",
            "deliveryFeeUsd": 2.99,
        }
    if distance_meters <= 5500:
        return {
            "withinDistanceLimit": True,
            "tierCode": "TIER_2_STANDARD",
            "tierLabel": "Standard City Delivery (<= 5.5 km)",
            "deliveryFeeUsd": 4.99,
        }
    if distance_meters <= MAX_ROAD_DISTANCE_METERS:
        return {
            "withinDistanceLimit": True,
            "tierCode": "TIER_3_EXTENDED",
            "tierLabel": "Extended Metro Zone (<= 8.0 km)",
            "deliveryFeeUsd": 6.99,
        }
    return {
        "withinDistanceLimit": False,
        "tierCode": "OUT_OF_RANGE",
        "tierLabel": "Exceeds 8.0 km road-distance cap",
        "deliveryFeeUsd": None,
    }


class LatLngInput(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class AddressValidateRequest(BaseModel):
    addressLines: list[str] = Field(..., min_length=1, max_length=5)
    regionCode: str = Field(default="US", min_length=2, max_length=2)
    locality: str | None = Field(default=None, max_length=120)
    administrativeArea: str | None = Field(default=None, max_length=60)
    postalCode: str | None = Field(default=None, max_length=20)
    enableUspsCass: bool = Field(default=True)
    previousResponseId: str | None = Field(default=None, max_length=128)

    @field_validator("addressLines")
    @classmethod
    def validate_address_lines(cls, lines: list[str]) -> list[str]:
        cleaned = [line.strip() for line in lines if line and line.strip()]
        if not cleaned:
            raise ValueError("addressLines must contain at least one non-empty address line.")
        if sum(len(line) for line in cleaned) > 280:
            raise ValueError("Combined addressLines length must not exceed 280 characters.")
        return cleaned

    @field_validator("regionCode")
    @classmethod
    def normalize_region_code(cls, value: str) -> str:
        upper = value.strip().upper()
        if not upper.isalpha():
            raise ValueError("regionCode must be a 2-letter ISO country code.")
        return upper


class RouteComputeRequest(BaseModel):
    origin: LatLngInput
    destination: LatLngInput
    travelMode: Literal["DRIVE", "TWO_WHEELER", "BICYCLE", "WALK"] = "DRIVE"
    routingPreference: Literal["TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL", "TRAFFIC_UNAWARE"] = (
        "TRAFFIC_AWARE"
    )


app = FastAPI(
    title="Chicago Live Order Tracking & Delivery Checkout",
    version="1.0.0",
    description="FastAPI BFF for Chicago delivery checkout, Address Validation, Routes API v2, and Maps Static API.",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Response:
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
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="8" fill="#0f766e"/>'
        '<text x="16" y="21" font-size="14" text-anchor="middle" fill="#ffffff" '
        'font-family="sans-serif" font-weight="bold">W</text></svg>'
    )
    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/health")
async def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "configured": bool(get_api_key()),
    }


@app.get("/api/config")
async def get_frontend_config() -> dict[str, Any]:
    api_key = get_api_key()
    return {
        "configured": bool(api_key),
        "googleMapsApiKey": api_key,
        "mapId": "DEMO_MAP_ID",
        "internalUsageAttributionIds": ["gmp_git_agentsamples_v1.0.0"],
        "kitchen": KITCHEN_HUB,
        "deliveryZonePolygon": DELIVERY_ZONE_POLYGON,
        "maxRoadDistanceMeters": MAX_ROAD_DISTANCE_METERS,
        "seedAddress": SEED_ADDRESS,
        "presets": {
            "inZone": PRESET_IN_ZONE_ADDRESS,
            "outOfZone": PRESET_OUT_OF_ZONE_ADDRESS,
        },
    }


@app.post("/api/address/validate")
async def validate_address(payload: AddressValidateRequest) -> dict[str, Any]:
    api_key = require_api_key()

    postal_address: dict[str, Any] = {
        "regionCode": payload.regionCode,
        "addressLines": payload.addressLines,
    }
    if payload.locality:
        postal_address["locality"] = payload.locality.strip()
    if payload.administrativeArea:
        postal_address["administrativeArea"] = payload.administrativeArea.strip()
    if payload.postalCode:
        postal_address["postalCode"] = payload.postalCode.strip()

    body: dict[str, Any] = {
        "address": postal_address,
        "enableUspsCass": payload.enableUspsCass and payload.regionCode in {"US", "PR"},
    }
    if payload.previousResponseId:
        body["previousResponseId"] = payload.previousResponseId

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ADDRESS_VALIDATION_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        upstream = await client.post(
            "https://addressvalidation.googleapis.com/v1:validateAddress",
            headers=headers,
            json=body,
        )

    if upstream.status_code >= 400:
        try:
            err_json = upstream.json()
            message = err_json.get("error", {}).get("message") or upstream.text
        except ValueError:
            message = upstream.text
        raise HTTPException(
            status_code=upstream.status_code,
            detail=f"Address Validation API error: {message}",
        )

    data = upstream.json()
    result = data.get("result", {})
    verdict = result.get("verdict", {})
    address = result.get("address", {})
    geocode = result.get("geocode", {})
    metadata = result.get("metadata", {})
    usps_data = result.get("uspsData", {})

    location = geocode.get("location", {})
    lat = location.get("latitude")
    lng = location.get("longitude")

    return {
        "responseId": data.get("responseId"),
        "verdict": {
            "inputGranularity": verdict.get("inputGranularity"),
            "validationGranularity": verdict.get("validationGranularity"),
            "geocodeGranularity": verdict.get("geocodeGranularity"),
            "addressComplete": bool(verdict.get("addressComplete", False)),
            "hasUnconfirmedComponents": bool(verdict.get("hasUnconfirmedComponents", False)),
            "hasInferredComponents": bool(verdict.get("hasInferredComponents", False)),
            "hasReplacedComponents": bool(verdict.get("hasReplacedComponents", False)),
        },
        "formattedAddress": address.get("formattedAddress"),
        "postalAddress": address.get("postalAddress", {}),
        "missingComponentTypes": address.get("missingComponentTypes", []),
        "unconfirmedComponentTypes": address.get("unconfirmedComponentTypes", []),
        "coordinates": {"lat": lat, "lng": lng} if lat is not None and lng is not None else None,
        "placeId": geocode.get("placeId"),
        "plusCode": geocode.get("plusCode", {}),
        "metadata": {
            "residential": metadata.get("residential"),
            "business": metadata.get("business"),
            "poBox": metadata.get("poBox"),
        },
        "uspsData": {
            "dpvConfirmation": usps_data.get("dpvConfirmation"),
            "dpvVacant": usps_data.get("dpvVacant"),
            "carrierRoute": usps_data.get("carrierRoute"),
            "cassProcessed": usps_data.get("cassProcessed"),
            "county": usps_data.get("county"),
            "standardizedAddress": usps_data.get("standardizedAddress", {}),
        },
    }


@app.post("/api/routes/compute")
async def compute_route(payload: RouteComputeRequest) -> dict[str, Any]:
    api_key = require_api_key()

    request_body: dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": payload.origin.lat,
                    "longitude": payload.origin.lng,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": payload.destination.lat,
                    "longitude": payload.destination.lng,
                }
            }
        },
        "travelMode": payload.travelMode,
        "polylineQuality": "HIGH_QUALITY",
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": "METRIC",
    }
    if payload.travelMode in {"DRIVE", "TWO_WHEELER"}:
        request_body["routingPreference"] = payload.routingPreference

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_COMPUTE_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        upstream = await client.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            headers=headers,
            json=request_body,
        )

    if upstream.status_code >= 400:
        try:
            err_json = upstream.json()
            message = err_json.get("error", {}).get("message") or upstream.text
        except ValueError:
            message = upstream.text
        raise HTTPException(
            status_code=upstream.status_code,
            detail=f"Routes API error: {message}",
        )

    data = upstream.json()
    routes = data.get("routes", [])
    if not routes:
        raise HTTPException(status_code=404, detail="No drivable route found between origin and destination.")

    primary = routes[0]
    distance_meters = int(primary.get("distanceMeters", 0))
    duration_seconds = parse_duration_seconds(primary.get("duration"))
    encoded_polyline = primary.get("polyline", {}).get("encodedPolyline", "")
    tier_info = compute_delivery_tier(distance_meters)

    steps: list[dict[str, Any]] = []
    for leg in primary.get("legs", []):
        for step in leg.get("steps", []):
            nav = step.get("navigationInstruction", {})
            steps.append(
                {
                    "instruction": nav.get("instructions") or "Continue along route",
                    "maneuver": nav.get("maneuver") or "MANEUVER_UNSPECIFIED",
                    "distanceMeters": int(step.get("distanceMeters", 0)),
                    "durationSeconds": parse_duration_seconds(step.get("staticDuration")),
                }
            )

    return {
        "distanceMeters": distance_meters,
        "distanceKm": round(distance_meters / 1000.0, 2),
        "duration": primary.get("duration", f"{duration_seconds}s"),
        "durationSeconds": duration_seconds,
        "durationMinutes": max(1, round(duration_seconds / 60.0)),
        "encodedPolyline": encoded_polyline,
        "steps": steps,
        **tier_info,
    }


@app.get("/api/maps/static-receipt")
async def get_static_receipt_map(
    dest_lat: float = Query(..., ge=-90.0, le=90.0),
    dest_lng: float = Query(..., ge=-180.0, le=180.0),
    origin_lat: float = Query(default=KITCHEN_HUB["lat"], ge=-90.0, le=90.0),
    origin_lng: float = Query(default=KITCHEN_HUB["lng"], ge=-180.0, le=180.0),
    encoded_polyline: str | None = Query(default=None, max_length=12000),
    size: str = Query(default="640x300"),
    scale: int = Query(default=2, ge=1, le=2),
    maptype: Literal["roadmap", "satellite", "terrain", "hybrid"] = Query(default="roadmap"),
) -> Response:
    api_key = require_api_key()
    if not SIZE_PATTERN.match(size):
        raise HTTPException(status_code=422, detail="size must match <width>x<height>, e.g. 640x300.")

    params: list[tuple[str, str]] = [
        ("size", size),
        ("scale", str(scale)),
        ("maptype", maptype),
        ("format", "png"),
        ("markers", f"color:0x0f766e|label:K|{origin_lat:.6f},{origin_lng:.6f}"),
        ("markers", f"color:0xdc2626|label:C|{dest_lat:.6f},{dest_lng:.6f}"),
    ]

    if encoded_polyline and len(encoded_polyline) <= 10000:
        params.append(("path", f"weight:5|color:0x2563ebff|enc:{encoded_polyline}"))
    else:
        params.append(
            ("path", f"weight:4|color:0x2563ebff|{origin_lat:.6f},{origin_lng:.6f}|{dest_lat:.6f},{dest_lng:.6f}")
        )

    params.append(("key", api_key))

    async with httpx.AsyncClient(timeout=15.0) as client:
        upstream = await client.get(
            "https://maps.googleapis.com/maps/api/staticmap",
            params=params,
        )

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=upstream.status_code,
            detail=f"Maps Static API error ({upstream.status_code}): unable to generate receipt map.",
        )

    content_type = upstream.headers.get("content-type", "image/png")
    return Response(
        content=upstream.content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=300",
        },
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Chicago Live Order Tracking FastAPI server.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (must be 127.0.0.1 for local dev)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    args = parser.parse_args()

    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
