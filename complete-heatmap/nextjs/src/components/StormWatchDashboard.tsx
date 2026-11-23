'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ControlSidebar } from '@/components/ControlSidebar';
import { HazardMapCanvas } from '@/components/HazardMapCanvas';
import { HeaderBar } from '@/components/HeaderBar';
import {
  computeSafeEvacuationRoute,
  findContainingFloodZone,
} from '@/lib/flood-routing';
import {
  INITIAL_HAZARD_INCIDENTS,
  MIAMI_CENTER,
  MIAMI_FLOOD_ZONES,
  SEED_SHELTER_QUERY,
} from '@/lib/miami-hazards';
import type {
  EnrichedLocationData,
  EvacuationRouteResult,
  HazardIncident,
  HazardType,
  LatLngPoint,
  ShelterPlace,
  WeatherTelemetry,
} from '@/types/hazard';

function haversineDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s1));
}

interface StormWatchDashboardProps {
  apiKey: string;
}

export function StormWatchDashboard({ apiKey }: StormWatchDashboardProps) {
  const [incidents, setIncidents] = useState<HazardIncident[]>(
    INITIAL_HAZARD_INCIDENTS
  );
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [miamiWeather, setMiamiWeather] = useState<WeatherTelemetry | null>(null);
  const [enrichedLocation, setEnrichedLocation] = useState<EnrichedLocationData>({
    point: MIAMI_CENTER,
    address: 'Downtown Miami, FL',
    elevationMeters: null,
    weather: null,
    insideFloodZone: null,
    loading: true,
    warnings: [],
  });

  const [hazardType, setHazardType] = useState<HazardType>('Flash Flooding');
  const [hazardSeverity, setHazardSeverity] = useState<number>(8);
  const [hazardNotes, setHazardNotes] = useState<string>('');
  const [reportConfirmation, setReportConfirmation] = useState<string | null>(null);

  const [shelterQuery, setShelterQuery] = useState<string>(SEED_SHELTER_QUERY);
  const [shelters, setShelters] = useState<ShelterPlace[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState<boolean>(false);
  const [sheltersError, setSheltersError] = useState<string | null>(null);

  const [avoidFloodZones, setAvoidFloodZones] = useState<boolean>(true);
  const [activeShelter, setActiveShelter] = useState<ShelterPlace | null>(null);
  const [activeRoute, setActiveRoute] = useState<EvacuationRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const gmPolygonsRef = useRef<Record<string, google.maps.Polygon>>({});
  const enrichRequestIdRef = useRef<number>(0);

  const handlePolygonReady = useCallback(
    (zoneId: string, polygon: google.maps.Polygon | null) => {
      if (polygon) {
        gmPolygonsRef.current[zoneId] = polygon;
      } else {
        delete gmPolygonsRef.current[zoneId];
      }
    },
    []
  );

  const enrichCoordinates = useCallback(
    async (point: LatLngPoint, presetAddress?: string) => {
      const requestId = ++enrichRequestIdRef.current;
      const containingZone = findContainingFloodZone(
        point,
        MIAMI_FLOOD_ZONES,
        gmPolygonsRef.current
      );

      setEnrichedLocation((prev) => ({
        ...prev,
        point,
        address: presetAddress ?? prev.address,
        insideFloodZone: containingZone,
        loading: true,
        warnings: [],
      }));

      const [geoRes, elevRes, weatherRes] = await Promise.allSettled([
        fetch(
          `/api/geocode/reverse?lat=${encodeURIComponent(point.lat)}&lng=${encodeURIComponent(point.lng)}`
        ).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Geocoding failed');
          return d as { formattedAddress: string; placeId?: string };
        }),
        fetch(
          `/api/elevation?lat=${encodeURIComponent(point.lat)}&lng=${encodeURIComponent(point.lng)}`
        ).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Elevation failed');
          return d as {
            elevationMeters: number | null;
            resolutionMeters?: number | null;
          };
        }),
        fetch(
          `/api/weather/current?lat=${encodeURIComponent(point.lat)}&lng=${encodeURIComponent(point.lng)}`
        ).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Weather failed');
          return d as { weather: WeatherTelemetry };
        }),
      ]);

      if (enrichRequestIdRef.current !== requestId) {
        return;
      }

      const warnings: string[] = [];
      let address =
        presetAddress ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} (Miami, FL)`;
      let placeId: string | undefined;
      if (geoRes.status === 'fulfilled') {
        address = geoRes.value.formattedAddress;
        placeId = geoRes.value.placeId;
      } else {
        warnings.push('Reverse geocoding unavailable');
      }

      let elevationMeters: number | null = null;
      let elevationResolutionMeters: number | null = null;
      if (elevRes.status === 'fulfilled') {
        elevationMeters = elevRes.value.elevationMeters;
        elevationResolutionMeters = elevRes.value.resolutionMeters ?? null;
      } else {
        warnings.push('Elevation unavailable');
      }

      let weather: WeatherTelemetry | null = null;
      if (weatherRes.status === 'fulfilled') {
        weather = weatherRes.value.weather;
        setMiamiWeather((prev) => prev ?? weatherRes.value.weather);
      } else {
        warnings.push('Weather unavailable');
      }

      setEnrichedLocation({
        point,
        address,
        placeId,
        elevationMeters,
        elevationResolutionMeters,
        weather,
        insideFloodZone: containingZone,
        loading: false,
        warnings,
      });
    },
    []
  );

  const searchShelters = useCallback(
    async (queryText?: string, biasCenter?: LatLngPoint): Promise<ShelterPlace[]> => {
      setSheltersLoading(true);
      setSheltersError(null);
      try {
        const response = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textQuery: (queryText ?? shelterQuery).trim() || SEED_SHELTER_QUERY,
            lat: biasCenter?.lat ?? MIAMI_CENTER.lat,
            lng: biasCenter?.lng ?? MIAMI_CENTER.lng,
            maxResultCount: 12,
          }),
        });
        const data = (await response.json()) as {
          shelters?: ShelterPlace[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch nearby emergency shelters.');
        }
        const list = data.shelters ?? [];
        setShelters(list);
        return list;
      } catch (err) {
        setSheltersError(
          err instanceof Error ? err.message : 'Unable to search shelters.'
        );
        return [];
      } finally {
        setSheltersLoading(false);
      }
    },
    [shelterQuery]
  );

  const routeToShelter = useCallback(
    async (
      shelter: ShelterPlace,
      originOverride?: LatLngPoint,
      avoidOverride?: boolean
    ) => {
      const origin = originOverride ?? enrichedLocation.point;
      const avoid = avoidOverride ?? avoidFloodZones;

      setActiveShelter(shelter);
      setRouteLoading(true);
      setRouteError(null);

      try {
        const result = await computeSafeEvacuationRoute({
          origin,
          shelter,
          floodZones: MIAMI_FLOOD_ZONES,
          avoidFloodZones: avoid,
          gmPolygons: gmPolygonsRef.current,
        });
        setActiveRoute(result);
      } catch (err) {
        setRouteError(
          err instanceof Error ? err.message : 'Unable to compute evacuation route.'
        );
      } finally {
        setRouteLoading(false);
      }
    },
    [enrichedLocation.point, avoidFloodZones]
  );

  const handleFindSafeShelter = useCallback(async () => {
    const origin = enrichedLocation.point;
    let candidateList = shelters;
    if (candidateList.length === 0) {
      candidateList = await searchShelters(SEED_SHELTER_QUERY, origin);
    }
    if (candidateList.length === 0) return;

    // Prefer operational shelters outside flood polygons when possible, sorted by proximity
    const ranked = [...candidateList].sort((a, b) => {
      const aInFlood = findContainingFloodZone(
        a.location,
        MIAMI_FLOOD_ZONES,
        gmPolygonsRef.current
      )
        ? 1
        : 0;
      const bInFlood = findContainingFloodZone(
        b.location,
        MIAMI_FLOOD_ZONES,
        gmPolygonsRef.current
      )
        ? 1
        : 0;
      if (aInFlood !== bInFlood) return aInFlood - bInFlood;
      return (
        haversineDistanceKm(origin, a.location) -
        haversineDistanceKm(origin, b.location)
      );
    });

    await routeToShelter(ranked[0], origin, avoidFloodZones);
  }, [enrichedLocation.point, shelters, searchShelters, routeToShelter, avoidFloodZones]);

  // Initial load: enrich Miami center + populate nearby shelters
  useEffect(() => {
    if (!apiKey) return;
    void enrichCoordinates(MIAMI_CENTER);
    void searchShelters(SEED_SHELTER_QUERY, MIAMI_CENTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const handleMapClickPoint = useCallback(
    (point: LatLngPoint) => {
      setReportConfirmation(null);
      void enrichCoordinates(point);
      if (activeShelter) {
        void routeToShelter(activeShelter, point, avoidFloodZones);
      }
    },
    [enrichCoordinates, activeShelter, routeToShelter, avoidFloodZones]
  );

  const handleAutocompleteSelect = useCallback(
    (point: LatLngPoint, label: string) => {
      setReportConfirmation(null);
      void enrichCoordinates(point, label);
      if (activeShelter) {
        void routeToShelter(activeShelter, point, avoidFloodZones);
      }
    },
    [enrichCoordinates, activeShelter, routeToShelter, avoidFloodZones]
  );

  const handleSubmitHazardReport = useCallback(() => {
    const newIncident: HazardIncident = {
      id: `user-${Date.now()}`,
      lat: enrichedLocation.point.lat,
      lng: enrichedLocation.point.lng,
      weight: hazardSeverity,
      type: hazardType,
      reportedAt: 'Just now',
      address: enrichedLocation.address,
      elevationMeters: enrichedLocation.elevationMeters,
      notes: hazardNotes.trim() || undefined,
      isUserReported: true,
    };

    setIncidents((prev) => [newIncident, ...prev]);
    setHazardNotes('');
    setShowHeatmap(true);
    setReportConfirmation(
      `Logged ${hazardType} at ${enrichedLocation.address} — Heatmap updated.`
    );
  }, [enrichedLocation, hazardSeverity, hazardType, hazardNotes]);

  const handleToggleAvoidFloodZones = useCallback(() => {
    const nextAvoid = !avoidFloodZones;
    setAvoidFloodZones(nextAvoid);
    if (activeShelter) {
      void routeToShelter(activeShelter, enrichedLocation.point, nextAvoid);
    }
  }, [avoidFloodZones, activeShelter, routeToShelter, enrichedLocation.point]);

  if (!apiKey) {
    return (
      <main className="missing-key-shell">
        <div className="missing-key-card">
          <h1>Google Maps Platform API Key Required</h1>
          <p>
            Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
            <code>.env.local</code> to initialize Miami StormWatch &amp; Safe
            Shelter Router.
          </p>
          <p>
            For free prototyping with no billing setup, mint a{' '}
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noreferrer"
            >
              Google Maps Demo Key
            </a>{' '}
            and restart the Next.js server.
          </p>
        </div>
      </main>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={[
        'core',
        'maps',
        'marker',
        'places',
        'routes',
        'geocoding',
        'elevation',
        'geometry',
      ]}
      language="en"
      region="US"
    >
      <div className="dashboard-shell">
        <HeaderBar
          miamiWeather={miamiWeather}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap((v) => !v)}
          showPolygons={showPolygons}
          onTogglePolygons={() => setShowPolygons((v) => !v)}
          onFindSafeShelter={() => void handleFindSafeShelter()}
          isSearchingShelters={sheltersLoading || routeLoading}
          incidentCount={incidents.length}
          mobileSidebarOpen={mobileSidebarOpen}
          onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        />

        <div className="workspace-split">
          <ControlSidebar
            mobileOpen={mobileSidebarOpen}
            enrichedLocation={enrichedLocation}
            hazardType={hazardType}
            onHazardTypeChange={setHazardType}
            hazardSeverity={hazardSeverity}
            onHazardSeverityChange={setHazardSeverity}
            hazardNotes={hazardNotes}
            onHazardNotesChange={setHazardNotes}
            onSubmitHazardReport={handleSubmitHazardReport}
            reportConfirmation={reportConfirmation}
            onAutocompleteSelect={handleAutocompleteSelect}
            avoidFloodZones={avoidFloodZones}
            onToggleAvoidFloodZones={handleToggleAvoidFloodZones}
            activeRoute={activeRoute}
            routeLoading={routeLoading}
            routeError={routeError}
            shelterQuery={shelterQuery}
            onShelterQueryChange={setShelterQuery}
            onSearchShelters={() =>
              void searchShelters(shelterQuery, enrichedLocation.point)
            }
            shelters={shelters}
            sheltersLoading={sheltersLoading}
            sheltersError={sheltersError}
            selectedShelterId={activeShelter?.id ?? null}
            onRouteToShelter={(shelter) => void routeToShelter(shelter)}
          />

          <HazardMapCanvas
            incidents={incidents}
            floodZones={MIAMI_FLOOD_ZONES}
            shelters={shelters}
            selectedOrigin={enrichedLocation.point}
            selectedAddress={enrichedLocation.address}
            activeRoute={activeRoute}
            showHeatmap={showHeatmap}
            showPolygons={showPolygons}
            selectedShelterId={activeShelter?.id ?? null}
            onMapClickPoint={handleMapClickPoint}
            onPolygonReady={handlePolygonReady}
            onSelectShelterAndRoute={(shelter) => void routeToShelter(shelter)}
          />
        </div>
      </div>
    </APIProvider>
  );
}
