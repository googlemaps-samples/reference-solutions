import { NextRequest } from 'next/server';
import {
  getServerGoogleMapsApiKey,
  jsonWithSecurityHeaders,
} from '@/lib/server-gmp';
import { haversineMeters } from '@/lib/fleet-data';
import type { LatLngPoint, SnappedPointItem } from '@/lib/types';

interface SnapRoadsRequestBody {
  vehicleId?: string;
  path?: LatLngPoint[];
  interpolate?: boolean;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return jsonWithSecurityHeaders(
      {
        error:
          'Google Maps API key is not configured on the server. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
        snappedPoints: [],
      },
      { status: 503 }
    );
  }

  let body: SnapRoadsRequestBody;
  try {
    body = (await request.json()) as SnapRoadsRequestBody;
  } catch {
    return jsonWithSecurityHeaders(
      { error: 'Invalid JSON request body', snappedPoints: [] },
      { status: 400 }
    );
  }

  const rawPoints = Array.isArray(body.path) ? body.path : [];
  if (rawPoints.length < 2 || rawPoints.length > 100) {
    return jsonWithSecurityHeaders(
      {
        error:
          'Roads API snapToRoads requires between 2 and 100 GPS coordinates.',
        snappedPoints: [],
      },
      { status: 400 }
    );
  }

  const validPoints = rawPoints.filter(
    (pt) =>
      pt &&
      typeof pt.lat === 'number' &&
      typeof pt.lng === 'number' &&
      Number.isFinite(pt.lat) &&
      Number.isFinite(pt.lng)
  );

  if (validPoints.length !== rawPoints.length) {
    return jsonWithSecurityHeaders(
      { error: 'All path coordinates must be valid numbers.', snappedPoints: [] },
      { status: 400 }
    );
  }

  const interpolate = body.interpolate !== false;
  const encodedPath = validPoints.map((p) => `${p.lat},${p.lng}`).join('|');
  const upstreamUrl = new URL('https://roads.googleapis.com/v1/snapToRoads');
  upstreamUrl.searchParams.set('path', encodedPath);
  upstreamUrl.searchParams.set('interpolate', interpolate ? 'true' : 'false');
  upstreamUrl.searchParams.set('key', apiKey);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
      },
      cache: 'no-store',
    });

    const payload = (await upstream.json()) as {
      snappedPoints?: SnappedPointItem[];
      warningMessage?: string;
      error?: { message?: string; status?: string; code?: number };
    };

    if (!upstream.ok || payload.error) {
      return jsonWithSecurityHeaders(
        {
          vehicleId: body.vehicleId || 'unknown',
          rawCount: validPoints.length,
          snappedCount: 0,
          uniqueRoadSegments: 0,
          meanOffsetMeters: 0,
          snappedPath: [],
          snappedPoints: [],
          source: 'unavailable',
          error:
            payload.error?.message ||
            `Roads API snapToRoads returned HTTP ${upstream.status}`,
        },
        { status: 200 }
      );
    }

    const snappedPoints = payload.snappedPoints ?? [];
    const snappedPath: LatLngPoint[] = snappedPoints.map((pt) => ({
      lat: pt.location.latitude,
      lng: pt.location.longitude,
    }));

    const uniquePlaceIds = new Set(
      snappedPoints.map((pt) => pt.placeId).filter(Boolean)
    );

    let offsetSum = 0;
    let offsetCount = 0;
    for (const pt of snappedPoints) {
      if (
        typeof pt.originalIndex === 'number' &&
        validPoints[pt.originalIndex]
      ) {
        offsetSum += haversineMeters(validPoints[pt.originalIndex], {
          lat: pt.location.latitude,
          lng: pt.location.longitude,
        });
        offsetCount += 1;
      }
    }

    const meanOffsetMeters =
      offsetCount > 0 ? Math.round((offsetSum / offsetCount) * 10) / 10 : 0;

    return jsonWithSecurityHeaders({
      vehicleId: body.vehicleId || 'unknown',
      rawCount: validPoints.length,
      snappedCount: snappedPoints.length,
      uniqueRoadSegments: uniquePlaceIds.size,
      meanOffsetMeters,
      snappedPath,
      snappedPoints,
      warningMessage: payload.warningMessage,
      source: 'roads_api',
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to reach Roads API';
    return jsonWithSecurityHeaders(
      { error: message, snappedPoints: [] },
      { status: 502 }
    );
  }
}
