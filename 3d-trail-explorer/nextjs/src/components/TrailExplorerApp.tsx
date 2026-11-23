'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Compass, Mountain, Pause, Play } from 'lucide-react';
import { ElevationProfileChart } from '@/components/ElevationProfileChart';
import { PlaceSearchBar } from '@/components/PlaceSearchBar';
import { TrailMap3D, type FlyCameraRequest } from '@/components/TrailMap3D';
import { ViewpointDetailCard } from '@/components/ViewpointDetailCard';
import {
  CHAPTER_STOPS,
  INITIAL_CAMERA,
  SEED_SEARCH_QUERY,
  TAHOE_TRAIL_PATH,
  buildElevationSamples,
  computeTrailMetrics,
} from '@/lib/tahoe-trail';
import type {
  CameraTelemetry,
  ChapterStop,
  ElevationSample,
  PlaceSummary,
} from '@/types/explorer';

interface TrailExplorerAppProps {
  apiKey: string;
}

export function TrailExplorerApp({ apiKey }: TrailExplorerAppProps) {
  const hasApiKey = Boolean(
    apiKey && apiKey !== 'your_google_maps_api_key_here'
  );

  const [activeChapterId, setActiveChapterId] =
    useState<ChapterStop['id']>('overview');
  const [autoPlay, setAutoPlay] = useState(false);
  const [flyRequest, setFlyRequest] = useState<FlyCameraRequest | null>(null);
  const [telemetry, setTelemetry] = useState<CameraTelemetry>({
    lat: INITIAL_CAMERA.center.lat,
    lng: INITIAL_CAMERA.center.lng,
    altitude: INITIAL_CAMERA.center.altitude,
    heading: INITIAL_CAMERA.heading,
    tilt: INITIAL_CAMERA.tilt,
    range: INITIAL_CAMERA.range,
  });

  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [searchedLandmark, setSearchedLandmark] =
    useState<PlaceSummary | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [elevationSamples, setElevationSamples] = useState<ElevationSample[]>(
    []
  );
  const [isLoadingElevation, setIsLoadingElevation] = useState(false);
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [focusedSample, setFocusedSample] = useState<ElevationSample | null>(
    null
  );

  const trailMetrics = useMemo(
    () => computeTrailMetrics(elevationSamples),
    [elevationSamples]
  );

  const activeChapter = useMemo(
    () =>
      CHAPTER_STOPS.find((stop) => stop.id === activeChapterId) ??
      CHAPTER_STOPS[0],
    [activeChapterId]
  );

  const triggerFlyTo = useCallback((camera: ChapterStop['camera']) => {
    setTelemetry({
      lat: camera.center.lat,
      lng: camera.center.lng,
      altitude: camera.center.altitude,
      heading: camera.heading,
      tilt: camera.tilt,
      range: camera.range,
    });
    setFlyRequest({ camera, nonce: Date.now() });
  }, []);

  const fetchPointElevation = useCallback(
    async (lat: number, lng: number): Promise<number | undefined> => {
      if (!hasApiKey) return undefined;
      try {
        const res = await fetch('/api/elevation/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations: [{ lat, lng }] }),
        });
        if (!res.ok) return undefined;
        const data = (await res.json()) as {
          results?: Array<{ elevation?: number }>;
        };
        return data.results?.[0]?.elevation;
      } catch {
        return undefined;
      }
    },
    [hasApiKey]
  );

  const fetchPlaceDetailsByQuery = useCallback(
    async (
      textQuery: string,
      fallbackLat: number,
      fallbackLng: number,
      mode: 'chapter' | 'search'
    ) => {
      if (!hasApiKey) return;
      if (mode === 'search') setIsSearching(true);
      setIsLoadingPlace(true);

      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textQuery,
            locationBias: {
              lat: fallbackLat,
              lng: fallbackLng,
              radiusMeters: 35000,
            },
          }),
        });

        const data = (await res.json()) as {
          places?: Array<{
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            location?: { latitude?: number; longitude?: number };
            rating?: number;
            userRatingCount?: number;
            googleMapsUri?: string;
          }>;
        };

        const top = data.places?.[0];
        if (top?.location?.latitude !== undefined && top?.location?.longitude !== undefined) {
          const lat = top.location.latitude;
          const lng = top.location.longitude;
          const elevationMeters = await fetchPointElevation(lat, lng);

          const summary: PlaceSummary = {
            id: top.id,
            displayName: top.displayName?.text || textQuery,
            formattedAddress: top.formattedAddress,
            location: { lat, lng },
            rating: top.rating,
            userRatingCount: top.userRatingCount,
            googleMapsUri: top.googleMapsUri,
            elevationMeters,
            source: 'places-api',
          };

          setSelectedPlace(summary);
          if (mode === 'search') {
            setSearchedLandmark(summary);
            setAutoPlay(false);
            triggerFlyTo({
              center: {
                lat,
                lng,
                altitude: Math.round((elevationMeters ?? 1920) + 45),
              },
              heading: 25,
              tilt: 64,
              range: 2200,
              durationMillis: 2400,
            });
          }
        }
      } catch {
        // Retain chapter fallback metadata cleanly
      } finally {
        setIsLoadingPlace(false);
        setIsSearching(false);
      }
    },
    [hasApiKey, fetchPointElevation, triggerFlyTo]
  );

  // Load Elevation API trail profile along TAHOE_TRAIL_PATH via /api/elevation/profile
  useEffect(() => {
    if (!hasApiKey) {
      setElevationError(
        'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to sample Elevation API points.'
      );
      return;
    }

    let cancelled = false;
    const loadElevationProfile = async () => {
      setIsLoadingElevation(true);
      setElevationError(null);
      try {
        const res = await fetch('/api/elevation/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: TAHOE_TRAIL_PATH.map((p) => ({ lat: p.lat, lng: p.lng })),
            samples: 44,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          results?: Array<{
            elevation: number;
            resolution?: number;
            location: { lat: number; lng: number };
          }>;
        };

        if (cancelled) return;
        if (!res.ok || !data.results?.length) {
          setElevationError(
            data.error || 'Elevation profile could not be retrieved.'
          );
          return;
        }

        setElevationSamples(buildElevationSamples(data.results));
      } catch {
        if (!cancelled) {
          setElevationError('Network error sampling trail elevation.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingElevation(false);
        }
      }
    };

    loadElevationProfile();
    return () => {
      cancelled = true;
    };
  }, [hasApiKey]);

  // Initial seed Places API (New) search for Emerald Bay State Park, Lake Tahoe
  useEffect(() => {
    if (!hasApiKey) return;
    fetchPlaceDetailsByQuery(
      SEED_SEARCH_QUERY,
      INITIAL_CAMERA.center.lat,
      INITIAL_CAMERA.center.lng,
      'chapter'
    );
  }, [hasApiKey, fetchPlaceDetailsByQuery]);

  const handleSelectChapter = useCallback(
    (stop: ChapterStop, stopAutoplay = true) => {
      if (stopAutoplay) {
        setAutoPlay(false);
      }
      setActiveChapterId(stop.id);
      setSearchedLandmark(null);
      setFocusedSample(null);
      triggerFlyTo(stop.camera);

      if (hasApiKey) {
        fetchPlaceDetailsByQuery(
          stop.placeQuery,
          stop.position.lat,
          stop.position.lng,
          'chapter'
        );
      } else {
        setSelectedPlace({
          displayName: stop.shortTitle,
          formattedAddress: stop.subtitle,
          location: { lat: stop.position.lat, lng: stop.position.lng },
          source: 'chapter-preset',
        });
      }
    },
    [hasApiKey, triggerFlyTo, fetchPlaceDetailsByQuery]
  );

  // Guided Auto-Play Camera Tour timer
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setActiveChapterId((currentId) => {
        const currentIndex = CHAPTER_STOPS.findIndex(
          (stop) => stop.id === currentId
        );
        const nextStop =
          CHAPTER_STOPS[(currentIndex + 1) % CHAPTER_STOPS.length];
        setSearchedLandmark(null);
        setFocusedSample(null);
        triggerFlyTo(nextStop.camera);
        if (hasApiKey) {
          fetchPlaceDetailsByQuery(
            nextStop.placeQuery,
            nextStop.position.lat,
            nextStop.position.lng,
            'chapter'
          );
        } else {
          setSelectedPlace({
            displayName: nextStop.shortTitle,
            formattedAddress: nextStop.subtitle,
            location: {
              lat: nextStop.position.lat,
              lng: nextStop.position.lng,
            },
            source: 'chapter-preset',
          });
        }
        return nextStop.id;
      });
    }, 5200);

    return () => clearInterval(interval);
  }, [autoPlay, hasApiKey, triggerFlyTo, fetchPlaceDetailsByQuery]);

  const handleWidgetPlaceSelect = useCallback(
    async (place: PlaceSummary) => {
      setAutoPlay(false);
      setFocusedSample(null);
      const elevationMeters = await fetchPointElevation(
        place.location.lat,
        place.location.lng
      );
      const enriched: PlaceSummary = {
        ...place,
        elevationMeters,
      };
      setSelectedPlace(enriched);
      setSearchedLandmark(enriched);
      triggerFlyTo({
        center: {
          lat: place.location.lat,
          lng: place.location.lng,
          altitude: Math.round((elevationMeters ?? 1920) + 45),
        },
        heading: 25,
        tilt: 64,
        range: 2200,
        durationMillis: 2400,
      });
    },
    [fetchPointElevation, triggerFlyTo]
  );

  const handleSelectElevationSample = useCallback(
    (sample: ElevationSample) => {
      setAutoPlay(false);
      setFocusedSample(sample);
      triggerFlyTo({
        center: {
          lat: sample.lat,
          lng: sample.lng,
          altitude: Math.round(sample.elevation + 30),
        },
        heading: 55,
        tilt: 70,
        range: 1300,
        durationMillis: 1800,
      });
    },
    [triggerFlyTo]
  );

  const explorerBody = (
    <div
      data-testid="trail-explorer-app"
      className="flex h-screen w-screen min-h-[600px] flex-col overflow-hidden bg-slate-950 text-slate-100"
    >
      {/* Top Floating Glassmorphic Header */}
      <header className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-700 shadow-lg shadow-red-950/50">
            <Mountain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
              Lake Tahoe 3D Trail Explorer
            </h1>
            <p className="text-[11px] text-slate-400">
              Emerald Bay · Photorealistic 3D Storytelling &amp; Elevation
            </p>
          </div>
        </div>

        {/* Landmark Search Bar */}
        <PlaceSearchBar
          hasApiKey={hasApiKey}
          isSearching={isSearching}
          onSelectPlace={handleWidgetPlaceSelect}
          onTextSearch={(q) =>
            fetchPlaceDetailsByQuery(
              q,
              INITIAL_CAMERA.center.lat,
              INITIAL_CAMERA.center.lng,
              'search'
            )
          }
        />

        {/* Live 3D Camera Telemetry Badge */}
        <div
          data-testid="camera-telemetry-badge"
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px] font-mono text-slate-300"
        >
          <span className="inline-flex items-center gap-1 text-red-400">
            <Compass className="h-3.5 w-3.5" />
            <span>HDG {Math.round(telemetry.heading)}°</span>
          </span>
          <span className="text-slate-600">·</span>
          <span>TILT {Math.round(telemetry.tilt)}°</span>
          <span className="text-slate-600">·</span>
          <span>RNG {Math.round(telemetry.range).toLocaleString()}m</span>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar: Chapter Tour, Viewpoint Card, Elevation Profile */}
        <aside className="alpine-scroll z-10 flex w-full lg:w-[375px] shrink-0 flex-col gap-3 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950/90 p-3 backdrop-blur-md">
          {/* Chapter Tour Presets */}
          <section
            data-testid="chapter-tour-panel"
            className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-3 shadow-lg"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Guided Camera Tour
                </h2>
                <p className="text-[11px] text-slate-400">
                  Fly to scenic Lake Tahoe trail chapters
                </p>
              </div>
              <button
                type="button"
                data-testid="tour-autoplay-toggle"
                onClick={() => setAutoPlay((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  autoPlay
                    ? 'border-red-500/80 bg-red-600 text-white shadow-md shadow-red-950/50'
                    : 'border-slate-700 bg-slate-800/90 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                {autoPlay ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause Tour</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Auto-Play</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {CHAPTER_STOPS.map((stop) => {
                const isActive =
                  activeChapterId === stop.id && !searchedLandmark;
                return (
                  <button
                    key={stop.id}
                    type="button"
                    data-testid={stop.testId}
                    onClick={() => handleSelectChapter(stop, true)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left transition ${
                      isActive
                        ? 'border-red-500/80 bg-red-500/15 text-white shadow-sm'
                        : 'border-slate-800/90 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">
                        {stop.label}
                      </div>
                      <div className="truncate text-[10px] text-slate-400">
                        {stop.subtitle}
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                      {stop.camera.tilt}°
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Active Viewpoint / Searched Landmark Card */}
          <ViewpointDetailCard
            activeChapter={activeChapter}
            selectedPlace={selectedPlace}
            isLoadingPlace={isLoadingPlace}
          />

          {/* Interactive SVG Elevation Profile & Metrics */}
          <ElevationProfileChart
            samples={elevationSamples}
            metrics={trailMetrics}
            isLoading={isLoadingElevation}
            error={elevationError}
            activeSampleIndex={focusedSample?.index ?? null}
            onSelectSample={handleSelectElevationSample}
          />
        </aside>

        {/* Right / Main Photorealistic 3D Map Canvas */}
        <TrailMap3D
          hasApiKey={hasApiKey}
          activeChapterId={activeChapterId}
          flyRequest={flyRequest}
          searchedLandmark={searchedLandmark}
          focusedSample={focusedSample}
          selectedPlace={selectedPlace}
          onSelectChapter={(stop) => handleSelectChapter(stop, true)}
          onCameraTelemetryChange={setTelemetry}
        />
      </main>
    </div>
  );

  if (!hasApiKey) {
    return explorerBody;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      version="beta"
      language="en"
      region="US"
    >
      {explorerBody}
    </APIProvider>
  );
}
