import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  useApiLoadingStatus,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { MapMode, type Map3DRef } from '@vis.gl/react-google-maps/3d';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import {
  buildElevationSamples,
  SEED_SEARCH_QUERY,
  TAHOE_INITIAL_CAMERA,
  TAHOE_TRAIL_WAYPOINTS,
  TRAIL_CHAPTERS
} from './data/tahoeTrail';
import type {
  CameraTelemetry,
  ChapterId,
  ElevationSample,
  SelectedLandmark,
  TrailChapter,
  TrailMetrics
} from './types/explorer';
import { TopBar } from './components/TopBar';
import { ChapterTourPanel } from './components/ChapterTourPanel';
import { SelectedViewpointCard } from './components/SelectedViewpointCard';
import { ElevationProfileChart } from './components/ElevationProfileChart';
import { TrailMap3D } from './components/TrailMap3D';

const RAW_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

const EMPTY_METRICS: TrailMetrics = {
  totalDistanceKm: 0,
  minElevationM: 0,
  maxElevationM: 0,
  totalAscentM: 0,
  totalDescentM: 0
};

function buildChapterFallbackLandmark(
  chapter: TrailChapter,
  elevationM?: number | null
): SelectedLandmark {
  return {
    id: `chapter-${chapter.id}`,
    kind: 'chapter',
    name: chapter.title.replace(/^\d+\.\s*/, ''),
    subtitle: chapter.subtitle,
    editorialSummary: chapter.description,
    lat: chapter.position.lat,
    lng: chapter.position.lng,
    elevationM: elevationM ?? chapter.camera.center.altitude,
    chapterId: chapter.id
  };
}

const TrailExplorerWorkspace: React.FC = () => {
  const apiStatus = useApiLoadingStatus();
  const elevationLib = useMapsLibrary('elevation');
  const placesLib = useMapsLibrary('places');

  const map3dRef = useRef<Map3DRef | null>(null);
  const chapterElevationsRef = useRef<Record<string, number>>({});
  const chapterPlacesCacheRef = useRef<Record<string, SelectedLandmark>>({});

  const [mapMode, setMapMode] = useState<MapMode>(MapMode.SATELLITE);
  const [activeChapterId, setActiveChapterId] = useState<ChapterId>('overview');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const [telemetry, setTelemetry] = useState<CameraTelemetry>({
    heading: TAHOE_INITIAL_CAMERA.heading,
    tilt: TAHOE_INITIAL_CAMERA.tilt,
    range: TAHOE_INITIAL_CAMERA.range,
    center: { ...TAHOE_INITIAL_CAMERA.center }
  });

  const [elevationSamples, setElevationSamples] = useState<ElevationSample[]>([]);
  const [trailMetrics, setTrailMetrics] = useState<TrailMetrics>(EMPTY_METRICS);
  const [elevationLoading, setElevationLoading] = useState(true);
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [hoveredSample, setHoveredSample] = useState<ElevationSample | null>(
    null
  );

  const [selectedLandmark, setSelectedLandmark] =
    useState<SelectedLandmark | null>(() =>
      buildChapterFallbackLandmark(TRAIL_CHAPTERS[0])
    );
  const [searchedLandmark, setSearchedLandmark] =
    useState<SelectedLandmark | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [runtimeBannerError, setRuntimeBannerError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (apiStatus === APILoadingStatus.AUTH_FAILURE) {
      setRuntimeBannerError(
        'Google Maps API authentication failed. Check VITE_GOOGLE_MAPS_API_KEY in .env.local.'
      );
    } else if (apiStatus === APILoadingStatus.FAILED) {
      setRuntimeBannerError(
        'Failed to load Google Maps JavaScript API. Check network access and API permissions.'
      );
    }
  }, [apiStatus]);

  // Helper: fetch terrain elevation for a single coordinate
  const queryPointElevation = useCallback(
    async (lat: number, lng: number): Promise<number | null> => {
      if (!elevationLib) return null;
      try {
        const service = new elevationLib.ElevationService();
        const response = await service.getElevationForLocations({
          locations: [{ lat, lng }]
        });
        const first = response.results?.[0];
        return typeof first?.elevation === 'number' ? first.elevation : null;
      } catch {
        return null;
      }
    },
    [elevationLib]
  );

  // Sample live Elevation API path along the Lake Tahoe trail & viewpoint pins
  useEffect(() => {
    if (!elevationLib) return;
    let cancelled = false;

    const loadElevationData = async () => {
      setElevationLoading(true);
      setElevationError(null);
      try {
        const service = new elevationLib.ElevationService();
        const [pathRes, pointsRes] = await Promise.all([
          service.getElevationAlongPath({
            path: TAHOE_TRAIL_WAYPOINTS,
            samples: 64
          }),
          service.getElevationForLocations({
            locations: TRAIL_CHAPTERS.map((c) => c.position)
          })
        ]);

        if (cancelled) return;

        const { samples, metrics } = buildElevationSamples(pathRes.results);
        setElevationSamples(samples);
        setTrailMetrics(metrics);

        const elevMap: Record<string, number> = {};
        pointsRes.results.forEach((res, idx) => {
          const chapter = TRAIL_CHAPTERS[idx];
          if (chapter && typeof res.elevation === 'number') {
            elevMap[chapter.id] = res.elevation;
          }
        });
        chapterElevationsRef.current = elevMap;

        setSelectedLandmark((prev) => {
          if (!prev || prev.kind !== 'chapter' || !prev.chapterId) return prev;
          const liveElev = elevMap[prev.chapterId];
          return liveElev != null ? { ...prev, elevationM: liveElev } : prev;
        });
      } catch (err) {
        if (!cancelled) {
          setElevationError(
            err instanceof Error
              ? err.message
              : 'Unable to fetch trail elevation profile.'
          );
        }
      } finally {
        if (!cancelled) {
          setElevationLoading(false);
        }
      }
    };

    void loadElevationData();
    return () => {
      cancelled = true;
    };
  }, [elevationLib]);

  // Seed search on initial load using Places API (New) Place.searchByText
  useEffect(() => {
    if (!placesLib) return;
    let cancelled = false;

    const runSeedSearch = async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: SEED_SEARCH_QUERY,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'editorialSummary',
            'types'
          ],
          locationBias: {
            center: { lat: 38.9542, lng: -120.1103 },
            radius: 35000
          },
          maxResultCount: 1,
          language: 'en',
          region: 'us',
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
        });

        if (cancelled || !places.length) return;
        const seedPlace = places[0];
        const loc = seedPlace.location;
        const lat = loc ? loc.lat() : TRAIL_CHAPTERS[0].position.lat;
        const lng = loc ? loc.lng() : TRAIL_CHAPTERS[0].position.lng;
        const liveElev =
          chapterElevationsRef.current.overview ??
          (await queryPointElevation(lat, lng));

        if (cancelled) return;

        const enrichedOverview: SelectedLandmark = {
          id: seedPlace.id || 'chapter-overview',
          kind: 'chapter',
          name: seedPlace.displayName || 'Emerald Bay State Park',
          subtitle: TRAIL_CHAPTERS[0].subtitle,
          address: seedPlace.formattedAddress,
          rating: seedPlace.rating,
          userRatingCount: seedPlace.userRatingCount,
          googleMapsURI: seedPlace.googleMapsURI,
          editorialSummary:
            seedPlace.editorialSummary || TRAIL_CHAPTERS[0].description,
          lat,
          lng,
          elevationM: liveElev ?? TRAIL_CHAPTERS[0].camera.center.altitude,
          chapterId: 'overview',
          types: seedPlace.types
        };

        chapterPlacesCacheRef.current.overview = enrichedOverview;
        setSelectedLandmark((current) =>
          current?.chapterId === 'overview' || current == null
            ? enrichedOverview
            : current
        );
      } catch {
        // Retain chapter fallback metadata cleanly if Places quota/key restricts query
      }
    };

    void runSeedSearch();
    return () => {
      cancelled = true;
    };
  }, [placesLib, queryPointElevation]);

  const flyToCamera = useCallback(
    (
      target: {
        center: { lat: number; lng: number; altitude: number };
        heading: number;
        tilt: number;
        range: number;
      },
      durationMillis = 2200
    ) => {
      setTelemetry({
        heading: target.heading,
        tilt: target.tilt,
        range: target.range,
        center: { ...target.center }
      });

      map3dRef.current?.flyCameraTo({
        endCamera: {
          center: target.center,
          altitudeMode: 'ABSOLUTE',
          heading: target.heading,
          tilt: target.tilt,
          range: target.range
        },
        durationMillis
      });
    },
    []
  );

  const activateChapter = useCallback(
    async (chapter: TrailChapter, stopTour: boolean) => {
      if (stopTour) {
        setIsAutoPlaying(false);
      }
      setActiveChapterId(chapter.id);
      setSearchError(null);

      const cached = chapterPlacesCacheRef.current[chapter.id];
      const knownElev = chapterElevationsRef.current[chapter.id];
      const baseLandmark =
        cached ?? buildChapterFallbackLandmark(chapter, knownElev);

      setSelectedLandmark(baseLandmark);
      setPopoverOpen(true);

      flyToCamera({
        center: {
          lat: chapter.camera.center.lat,
          lng: chapter.camera.center.lng,
          altitude: knownElev ?? chapter.camera.center.altitude
        },
        heading: chapter.camera.heading,
        tilt: chapter.camera.tilt,
        range: chapter.camera.range
      });

      // Enrich chapter viewpoint with live Places API (New) data on first visit
      if (!cached && placesLib) {
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: chapter.placesSearchQuery,
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'rating',
              'userRatingCount',
              'googleMapsURI',
              'editorialSummary',
              'types'
            ],
            locationBias: {
              center: chapter.position,
              radius: 15000
            },
            maxResultCount: 1,
            language: 'en',
            region: 'us',
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
          });

          const match = places[0];
          if (match) {
            const enriched: SelectedLandmark = {
              id: match.id || `chapter-${chapter.id}`,
              kind: 'chapter',
              name: match.displayName || chapter.title.replace(/^\d+\.\s*/, ''),
              subtitle: chapter.subtitle,
              address: match.formattedAddress,
              rating: match.rating,
              userRatingCount: match.userRatingCount,
              googleMapsURI: match.googleMapsURI,
              editorialSummary: match.editorialSummary || chapter.description,
              lat: chapter.position.lat,
              lng: chapter.position.lng,
              elevationM: knownElev ?? chapter.camera.center.altitude,
              chapterId: chapter.id,
              types: match.types
            };
            chapterPlacesCacheRef.current[chapter.id] = enriched;
            setSelectedLandmark((prev) =>
              prev?.chapterId === chapter.id ? enriched : prev
            );
          }
        } catch {
          // Non-fatal: fallback chapter description remains visible
        }
      }
    },
    [flyToCamera, placesLib]
  );

  // Auto-play guided camera tour loop
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = window.setInterval(() => {
      setActiveChapterId((prevId) => {
        const currentIndex = TRAIL_CHAPTERS.findIndex((c) => c.id === prevId);
        const nextChapter =
          TRAIL_CHAPTERS[(currentIndex + 1) % TRAIL_CHAPTERS.length];
        void activateChapter(nextChapter, false);
        return nextChapter.id;
      });
    }, 4500);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAutoPlaying, activateChapter]);

  const flyToResolvedPlace = useCallback(
    async (place: google.maps.places.Place) => {
      setIsAutoPlaying(false);
      setIsSearching(true);
      setSearchError(null);
      try {
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'editorialSummary',
            'types'
          ]
        });

        const loc = place.location;
        if (!loc) {
          setSearchError('Selected place has no geographic coordinates.');
          return;
        }

        const lat = loc.lat();
        const lng = loc.lng();
        const elevationM = (await queryPointElevation(lat, lng)) ?? 1920;

        const landmark: SelectedLandmark = {
          id: place.id || `place-${lat}-${lng}`,
          kind: 'place',
          name: place.displayName || 'Lake Tahoe Landmark',
          subtitle: 'Places API (New) · 3D Camera Target',
          address: place.formattedAddress,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          googleMapsURI: place.googleMapsURI,
          editorialSummary: place.editorialSummary,
          lat,
          lng,
          elevationM,
          types: place.types
        };

        setSearchedLandmark(landmark);
        setSelectedLandmark(landmark);
        setPopoverOpen(true);

        flyToCamera(
          {
            center: { lat, lng, altitude: elevationM },
            heading: 330,
            tilt: 66,
            range: 1850
          },
          2400
        );
      } catch (err) {
        setSearchError(
          err instanceof Error ? err.message : 'Unable to load place details.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [flyToCamera, queryPointElevation]
  );

  const handleSearchQuery = useCallback(
    async (queryText: string) => {
      if (!placesLib) {
        setSearchError('Places library is still initializing.');
        return;
      }
      setIsAutoPlaying(false);
      setIsSearching(true);
      setSearchError(null);

      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: queryText,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'editorialSummary',
            'types'
          ],
          locationBias: {
            center: { lat: 38.9542, lng: -120.1103 },
            radius: 50000
          },
          maxResultCount: 1,
          language: 'en',
          region: 'us',
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
        });

        const match = places[0];
        if (!match || !match.location) {
          setSearchError(`No Lake Tahoe landmark found for "${queryText}".`);
          return;
        }

        const lat = match.location.lat();
        const lng = match.location.lng();
        const elevationM = (await queryPointElevation(lat, lng)) ?? 1920;

        const landmark: SelectedLandmark = {
          id: match.id || `search-${lat}-${lng}`,
          kind: 'place',
          name: match.displayName || queryText,
          subtitle: 'Places API (New) · 3D Camera Target',
          address: match.formattedAddress,
          rating: match.rating,
          userRatingCount: match.userRatingCount,
          googleMapsURI: match.googleMapsURI,
          editorialSummary: match.editorialSummary,
          lat,
          lng,
          elevationM,
          types: match.types
        };

        setSearchedLandmark(landmark);
        setSelectedLandmark(landmark);
        setPopoverOpen(true);

        flyToCamera(
          {
            center: { lat, lng, altitude: elevationM },
            heading: 330,
            tilt: 66,
            range: 1850
          },
          2400
        );
      } catch (err) {
        setSearchError(
          err instanceof Error ? err.message : 'Landmark search failed.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [flyToCamera, placesLib, queryPointElevation]
  );

  const handleSelectElevationSample = useCallback(
    (sample: ElevationSample) => {
      setIsAutoPlaying(false);
      flyToCamera(
        {
          center: {
            lat: sample.lat,
            lng: sample.lng,
            altitude: sample.elevation
          },
          heading: 35,
          tilt: 70,
          range: 1150
        },
        1800
      );
    },
    [flyToCamera]
  );

  return (
    <div data-testid="trail-explorer-app" className="explorer-root">
      <TopBar
        telemetry={telemetry}
        mapMode={mapMode}
        onToggleMapMode={() =>
          setMapMode((prev) =>
            prev === MapMode.SATELLITE ? MapMode.HYBRID : MapMode.SATELLITE
          )
        }
        onSearchQuery={handleSearchQuery}
        onSelectPlace={flyToResolvedPlace}
        isSearching={isSearching}
        searchError={searchError}
      />

      {runtimeBannerError && (
        <div className="status-banner" role="alert">
          <AlertTriangle size={16} />
          <span>{runtimeBannerError}</span>
        </div>
      )}

      <div className="explorer-body">
        <aside
          className={`sidebar-shell ${drawerOpen ? 'is-open' : 'is-collapsed'}`}
          aria-label="Trail Controls and Telemetry"
        >
          <button
            type="button"
            className="mobile-drawer-toggle"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
          >
            <span>Trail Chapters &amp; Elevation</span>
            {drawerOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <div className="sidebar-scroll">
            <ChapterTourPanel
              chapters={TRAIL_CHAPTERS}
              activeChapterId={activeChapterId}
              isAutoPlaying={isAutoPlaying}
              onSelectChapter={(chapter) => void activateChapter(chapter, true)}
              onToggleAutoPlay={() => setIsAutoPlaying((prev) => !prev)}
            />

            <SelectedViewpointCard
              landmark={selectedLandmark}
              isLoading={elevationLoading && !selectedLandmark}
            />

            <ElevationProfileChart
              samples={elevationSamples}
              metrics={trailMetrics}
              isLoading={elevationLoading}
              error={elevationError}
              activeSampleIndex={hoveredSample?.index ?? null}
              onHoverSample={setHoveredSample}
              onSelectSample={handleSelectElevationSample}
            />
          </div>
        </aside>

        <TrailMap3D
          map3dRef={map3dRef}
          mapMode={mapMode}
          activeChapterId={activeChapterId}
          selectedLandmark={selectedLandmark}
          searchedLandmark={searchedLandmark}
          hoveredSample={hoveredSample}
          popoverOpen={popoverOpen}
          onClosePopover={() => setPopoverOpen(false)}
          onSelectChapter={(chapter) => void activateChapter(chapter, true)}
          onSelectSearchedMarker={(landmark) => {
            setSelectedLandmark(landmark);
            setPopoverOpen(true);
            flyToCamera({
              center: {
                lat: landmark.lat,
                lng: landmark.lng,
                altitude: landmark.elevationM ?? 1920
              },
              heading: 330,
              tilt: 66,
              range: 1850
            });
          }}
          onCameraChanged={setTelemetry}
          onMapError={setRuntimeBannerError}
        />
      </div>
    </div>
  );
};

export function App() {
  if (!RAW_API_KEY) {
    return (
      <div data-testid="trail-explorer-app" className="explorer-root">
        <div className="missing-key-overlay">
          <div className="missing-key-card">
            <AlertTriangle size={28} className="missing-key-icon" />
            <h1>VITE_GOOGLE_MAPS_API_KEY Required</h1>
            <p>
              Copy <code>.env.example</code> to <code>.env.local</code> and add
              your Google Maps Platform API key (or a free zero-billing Maps Demo
              Key) to launch the Lake Tahoe Photorealistic 3D Trail Explorer.
            </p>
            <div data-testid="map-3d-container" className="missing-key-stage">
              <div data-testid="gmp-map-3d" className="missing-key-placeholder">
                3D Map viewport awaits VITE_GOOGLE_MAPS_API_KEY
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={RAW_API_KEY}
      libraries={['maps3d', 'marker', 'places', 'elevation']}
      language="en"
      region="US"
    >
      <TrailExplorerWorkspace />
    </APIProvider>
  );
}

export default App;
