import argparse
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"


class LatLngPoint(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=200)
    latitude: float = Field(default=32.7767, ge=-90.0, le=90.0)
    longitude: float = Field(default=-96.797, ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=25000.0, gt=0.0, le=50000.0)
    maxResultCount: int = Field(default=8, ge=1, le=20)


class SnapToRoadsRequest(BaseModel):
    points: list[LatLngPoint] = Field(..., min_length=2, max_length=100)
    interpolate: bool = True


class ComputeRoutesRequest(BaseModel):
    origin: LatLngPoint
    destination: LatLngPoint
    intermediates: list[LatLngPoint] = Field(default_factory=list, max_length=25)
    optimizeWaypointOrder: bool = True
    travelMode: Literal["DRIVE", "TWO_WHEELER", "BICYCLE", "WALK", "TRANSIT"] = "DRIVE"
    routingPreference: Literal[
        "TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL", "TRAFFIC_UNAWARE"
    ] = "TRAFFIC_AWARE"


class ComputeRouteMatrixRequest(BaseModel):
    origins: list[LatLngPoint] = Field(..., min_length=1, max_length=25)
    destinations: list[LatLngPoint] = Field(..., min_length=1, max_length=25)
    travelMode: Literal["DRIVE", "TWO_WHEELER", "BICYCLE", "WALK", "TRANSIT"] = "DRIVE"
    routingPreference: Literal[
        "TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL", "TRAFFIC_UNAWARE"
    ] = "TRAFFIC_AWARE"


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        app_instance.state.http_client = client
        yield


app = FastAPI(
    title="Dallas Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


def _get_api_key() -> str:
    load_dotenv(BASE_DIR / ".env", override=False)
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not key or key == "your_google_maps_api_key_here":
        return ""
    return key


def _require_api_key() -> str:
    key = _get_api_key()
    if not key:
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env "
                "and provide a valid Google Maps Platform API key."
            ),
        )
    return key


def _extract_upstream_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            err = payload.get("error")
            if isinstance(err, dict) and err.get("message"):
                return str(err["message"])
            if payload.get("message"):
                return str(payload["message"])
    except ValueError:
        pass
    return f"Upstream Google Maps Platform API error (HTTP {response.status_code})"


def _waypoint(point: LatLngPoint) -> dict[str, Any]:
    return {
        "location": {
            "latLng": {
                "latitude": point.latitude,
                "longitude": point.longitude,
            }
        }
    }


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/favicon.ico")
async def favicon() -> Response:
    return Response(status_code=204)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_config() -> JSONResponse:
    api_key = _get_api_key()
    map_id = os.getenv("GOOGLE_MAPS_MAP_ID", DEFAULT_MAP_ID).strip() or DEFAULT_MAP_ID
    return JSONResponse(
        content={
            "googleMapsApiKey": api_key,
            "mapId": map_id,
            "hasApiKey": bool(api_key),
            "solutionId": "logistics-and-routing",
            "attributionId": ATTRIBUTION_ID,
        }
    )


@app.post("/api/places/search")
async def search_places(body: PlacesSearchRequest, request: Request) -> JSONResponse:
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
        "X-Goog-Maps-Solution-ID": ATTRIBUTION_ID,
    }
    payload = {
        "textQuery": body.textQuery,
        "languageCode": "en",
        "regionCode": "US",
        "maxResultCount": body.maxResultCount,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": body.latitude,
                    "longitude": body.longitude,
                },
                "radius": body.radiusMeters,
            }
        },
    }

    try:
        resp = await client.post(url, headers=headers, json=payload)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Places API network error: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.post("/api/roads/snap")
async def snap_to_roads(body: SnapToRoadsRequest, request: Request) -> JSONResponse:
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    path_param = "|".join(f"{p.latitude},{p.longitude}" for p in body.points)
    url = "https://roads.googleapis.com/v1/snapToRoads"
    params = {
        "path": path_param,
        "interpolate": "true" if body.interpolate else "false",
        "key": api_key,
    }
    headers = {
        "X-Goog-Maps-Solution-ID": ATTRIBUTION_ID,
    }

    try:
        resp = await client.get(url, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Roads API network error: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.post("/api/routes/compute")
async def compute_routes(body: ComputeRoutesRequest, request: Request) -> JSONResponse:
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    field_mask = (
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
        "routes.legs.duration,routes.legs.distanceMeters,"
        "routes.legs.startLocation,routes.legs.endLocation,"
        "routes.optimizedIntermediateWaypointIndex"
    )
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask,
        "X-Goog-Maps-Solution-ID": ATTRIBUTION_ID,
    }

    payload: dict[str, Any] = {
        "origin": _waypoint(body.origin),
        "destination": _waypoint(body.destination),
        "travelMode": body.travelMode,
        "polylineQuality": "HIGH_QUALITY",
        "polylineEncoding": "ENCODED_POLYLINE",
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }

    if body.travelMode in ("DRIVE", "TWO_WHEELER"):
        payload["routingPreference"] = body.routingPreference

    if body.intermediates:
        payload["intermediates"] = [_waypoint(pt) for pt in body.intermediates]
        payload["optimizeWaypointOrder"] = body.optimizeWaypointOrder

    try:
        resp = await client.post(url, headers=headers, json=payload)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Routes API network error: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.post("/api/routes/matrix")
async def compute_route_matrix(
    body: ComputeRouteMatrixRequest, request: Request
) -> JSONResponse:
    if len(body.origins) * len(body.destinations) > 100:
        raise HTTPException(
            status_code=400,
            detail="Matrix element count (origins * destinations) must not exceed 100.",
        )

    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition",
        "X-Goog-Maps-Solution-ID": ATTRIBUTION_ID,
    }

    payload: dict[str, Any] = {
        "origins": [{"waypoint": _waypoint(pt)} for pt in body.origins],
        "destinations": [{"waypoint": _waypoint(pt)} for pt in body.destinations],
        "travelMode": body.travelMode,
    }

    if body.travelMode in ("DRIVE", "TWO_WHEELER"):
        payload["routingPreference"] = body.routingPreference

    try:
        resp = await client.post(url, headers=headers, json=payload)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502, detail=f"Route Matrix API network error: {exc}"
        ) from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run the Dallas Fleet Telematics & Dispatch FastAPI server."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    args = parser.parse_args()
    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)
