'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  ActiveLocation,
  AirQualityCurrentResponse,
  MapLayerType,
  PHOENIX_SEED_LOCATION,
  PanelFetchState,
  PlaceSearchResult,
  PollenForecastResponse,
  SolarBuildingInsightsResponse,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from '@/types/environment';
import { TopHeader } from './TopHeader';
import { SelectedAutocompletePlace } from './PlaceAutocompleteControl';
import { EnvironmentalSidebar } from './EnvironmentalSidebar';
import { EnvironmentalMap } from './EnvironmentalMap';

interface EnvironmentalDashboardProps {
  initialApiKey: string;
}

const LIBRARIES: Array<'maps' | 'marker' | 'places' | 'geocoding'> = [
  'maps',
  'marker',
  'places',
  'geocoding',
];

export function EnvironmentalDashboard({
  initialApiKey,
}: EnvironmentalDashboardProps) {
  const apiKey = initialApiKey.trim();
  const hasApiKey =
    Boolean(apiKey) && apiKey !== 'your_google_maps_api_key_here';

  const [activeLocation, setActiveLocation] = useState<ActiveLocation>(
    PHOENIX_SEED_LOCATION
  );
  const [pendingViewport, setPendingViewport] =
    useState<google.maps.LatLngBounds | null>(null);
  const [units, setUnits] = useState<UnitsSystem>('IMPERIAL');
  const [showAqiLayer, setShowAqiLayer] = useState<boolean>(false);
  const [mapType, setMapType] = useState<MapLayerType>('roadmap');

  const [weatherCurrent, setWeatherCurrent] = useState<
    PanelFetchState<WeatherCurrentResponse>
  >({ loading: true, data: null, error: null });

  const [weatherForecast, setWeatherForecast] = useState<
    PanelFetchState<WeatherForecastResponse>
  >({ loading: true, data: null, error: null });

  const [airQuality, setAirQuality] = useState<
    PanelFetchState<AirQualityCurrentResponse>
  >({ loading: true, data: null, error: null });

  const [pollen, setPollen] = useState<PanelFetchState<PollenForecastResponse>>({
    loading: true,
    data: null,
    error: null,
  });

  const [solar, setSolar] = useState<
    PanelFetchState<SolarBuildingInsightsResponse>
  >({ loading: true, data: null, error: null });

  const seedResolvedRef = useRef(false);

  // Resolve initial Phoenix seed query via Places API (New) server proxy once on mount
  useEffect(() => {
    if (!hasApiKey || seedResolvedRef.current) return;
    seedResolvedRef.current = true;

    const controller = new AbortController();
    fetch('/api/places/search-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textQuery: 'Phoenix City Hall, Phoenix, AZ' }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { places?: PlaceSearchResult[] };
      })
      .then((payload) => {
        const match = payload?.places?.[0];
        if (!match?.location) return;
        setActiveLocation((prev) => {
          // Only update if user hasn't already selected a different location
          if (prev.source !== 'seed') return prev;
          return {
            lat: match.location!.latitude,
            lng: match.location!.longitude,
            name: match.displayName?.text || prev.name,
            formattedAddress: match.formattedAddress || prev.formattedAddress,
            placeId: match.id,
            source: 'seed',
          };
        });
      })
      .catch(() => {
        // Keep Phoenix seed coordinates gracefully on abort or offline fallback
      });

    return () => controller.abort();
  }, [hasApiKey]);

  // Fetch Weather, Air Quality, Pollen, and Solar whenever coordinates or units change
  useEffect(() => {
    if (!hasApiKey) {
      const msg =
        'Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to load live environmental telemetry.';
      setWeatherCurrent({ loading: false, data: null, error: msg });
      setWeatherForecast({ loading: false, data: null, error: msg });
      setAirQuality({ loading: false, data: null, error: msg });
      setPollen({ loading: false, data: null, error: msg });
      setSolar({ loading: false, data: null, error: msg });
      return;
    }

    const controller = new AbortController();
    const { lat, lng } = activeLocation;

    setWeatherCurrent((prev) => ({ ...prev, loading: true, error: null }));
    setWeatherForecast((prev) => ({ ...prev, loading: true, error: null }));
    setAirQuality((prev) => ({ ...prev, loading: true, error: null }));
    setPollen((prev) => ({ ...prev, loading: true, error: null }));
    setSolar((prev) => ({ ...prev, loading: true, error: null }));

    // 1. Weather Current
    fetch(
      `/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          throw new Error(json?.error || 'Weather current error');
        }
        setWeatherCurrent({ loading: false, data: json, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setWeatherCurrent({
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : 'Unable to fetch weather.',
        });
      });

    // 2. Weather 5-day Forecast
    fetch(
      `/api/weather/forecast?lat=${lat}&lng=${lng}&days=5&unitsSystem=${units}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Weather forecast error');
        setWeatherForecast({ loading: false, data: json, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setWeatherForecast({
          loading: false,
          data: null,
          error:
            err instanceof Error ? err.message : 'Unable to fetch forecast.',
        });
      });

    // 3. Air Quality Current
    fetch('/api/air-quality/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Air Quality error');
        setAirQuality({ loading: false, data: json, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setAirQuality({
          loading: false,
          data: null,
          error:
            err instanceof Error ? err.message : 'Unable to fetch air quality.',
        });
      });

    // 4. Pollen Forecast
    fetch(`/api/pollen/forecast?lat=${lat}&lng=${lng}&days=5`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Pollen forecast error');
        setPollen({ loading: false, data: json, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setPollen({
          loading: false,
          data: null,
          error:
            err instanceof Error
              ? err.message
              : 'Unable to fetch pollen forecast.',
        });
      });

    // 5. Solar Building Insights
    fetch(`/api/solar/building-insights?lat=${lat}&lng=${lng}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Solar insights error');
        setSolar({ loading: false, data: json, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setSolar({
          loading: false,
          data: null,
          error:
            err instanceof Error
              ? err.message
              : 'Unable to fetch solar insights.',
        });
      });

    return () => controller.abort();
  }, [hasApiKey, activeLocation.lat, activeLocation.lng, units]);

  const handlePlaceSelect = useCallback((place: SelectedAutocompletePlace) => {
    setPendingViewport(place.viewport ?? null);
    setActiveLocation({
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      formattedAddress: place.formattedAddress,
      placeId: place.placeId,
      source: 'search',
    });
  }, []);

  const handleResetPhoenix = useCallback(() => {
    setPendingViewport(null);
    setActiveLocation({ ...PHOENIX_SEED_LOCATION });
  }, []);

  const handleToggleUnits = useCallback(() => {
    setUnits((prev) => (prev === 'IMPERIAL' ? 'METRIC' : 'IMPERIAL'));
  }, []);

  const handleToggleAqiLayer = useCallback(() => {
    setShowAqiLayer((prev) => !prev);
  }, []);

  const handleToggleMapType = useCallback(() => {
    setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'));
  }, []);

  const handleViewportConsumed = useCallback(() => {
    setPendingViewport(null);
  }, []);

  const content = (
    <div className="dashboard-shell">
      {!hasApiKey && (
        <div className="config-banner" role="alert">
          <span>
            <strong>API Key Missing:</strong> Set{' '}
            <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
            <code>.env.local</code> to activate the live Google Map, Places
            Autocomplete, Weather, Air Quality, Pollen, and Solar APIs.
          </span>
        </div>
      )}

      <TopHeader
        hasApiKey={hasApiKey}
        activeLocation={activeLocation}
        units={units}
        showAqiLayer={showAqiLayer}
        mapType={mapType}
        onPlaceSelect={handlePlaceSelect}
        onResetPhoenix={handleResetPhoenix}
        onToggleUnits={handleToggleUnits}
        onToggleAqiLayer={handleToggleAqiLayer}
        onToggleMapType={handleToggleMapType}
      />

      <main className="workspace-grid">
        <EnvironmentalSidebar
          activeLocation={activeLocation}
          units={units}
          weatherCurrent={weatherCurrent}
          weatherForecast={weatherForecast}
          airQuality={airQuality}
          pollen={pollen}
          solar={solar}
        />

        <EnvironmentalMap
          hasApiKey={hasApiKey}
          activeLocation={activeLocation}
          pendingViewport={pendingViewport}
          mapType={mapType}
          showAqiLayer={showAqiLayer}
          solarBoundingBox={
            solar.data?.covered ? solar.data.boundingBox : undefined
          }
          onMapCoordinateSelect={setActiveLocation}
          onViewportConsumed={handleViewportConsumed}
        />
      </main>
    </div>
  );

  if (!hasApiKey) {
    return content;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={LIBRARIES}
      language="en"
      region="US"
    >
      {content}
    </APIProvider>
  );
}
