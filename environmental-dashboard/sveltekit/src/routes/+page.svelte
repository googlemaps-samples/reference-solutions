<script lang="ts">
  import { onMount } from 'svelte';
  import HeaderBar from '$lib/components/HeaderBar.svelte';
  import EnvironmentalSidebar from '$lib/components/EnvironmentalSidebar.svelte';
  import GoogleMapPanel from '$lib/components/GoogleMapPanel.svelte';
  import type {
    ActiveLocation,
    AirQualityCurrentResponse,
    BaseMapType,
    EnvironmentalPanelState,
    PollenForecastResponse,
    SolarBuildingInsightsResponse,
    UnitsSystem,
    WeatherCurrentResponse,
    WeatherForecastResponse
  } from '$lib/types/environmental';

  const DEFAULT_PHOENIX: ActiveLocation = {
    name: 'Phoenix City Hall',
    address: '200 W Washington St, Phoenix, AZ 85003, USA',
    lat: 33.4484,
    lng: -112.074,
    source: 'seed'
  };

  let activeLocation = $state<ActiveLocation>({ ...DEFAULT_PHOENIX });
  let unitsSystem = $state<UnitsSystem>('IMPERIAL');
  let showAqiLayer = $state(false);
  let mapType = $state<BaseMapType>('roadmap');

  let weatherCurrent = $state<EnvironmentalPanelState<WeatherCurrentResponse>>({
    data: null,
    loading: true,
    error: null
  });
  let weatherForecast = $state<EnvironmentalPanelState<WeatherForecastResponse>>({
    data: null,
    loading: true,
    error: null
  });
  let airQuality = $state<EnvironmentalPanelState<AirQualityCurrentResponse>>({
    data: null,
    loading: true,
    error: null
  });
  let pollen = $state<EnvironmentalPanelState<PollenForecastResponse>>({
    data: null,
    loading: true,
    error: null
  });
  let solar = $state<EnvironmentalPanelState<SolarBuildingInsightsResponse>>({
    data: null,
    loading: true,
    error: null
  });

  let requestSeq = 0;

  async function fetchWeatherOnly(lat: number, lng: number, units: UnitsSystem) {
    weatherCurrent = { ...weatherCurrent, loading: true, error: null };
    weatherForecast = { ...weatherForecast, loading: true, error: null };

    const [currRes, foreRes] = await Promise.allSettled([
      fetch(`/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`),
      fetch(`/api/weather/forecast?lat=${lat}&lng=${lng}&unitsSystem=${units}&days=5`)
    ]);

    if (currRes.status === 'fulfilled') {
      const payload = await currRes.value.json().catch(() => null);
      if (currRes.value.ok) {
        weatherCurrent = { data: payload, loading: false, error: null };
      } else {
        weatherCurrent = {
          data: null,
          loading: false,
          error: payload?.error || `Weather API error (${currRes.value.status})`
        };
      }
    } else {
      weatherCurrent = { data: null, loading: false, error: 'Failed to load current weather.' };
    }

    if (foreRes.status === 'fulfilled') {
      const payload = await foreRes.value.json().catch(() => null);
      if (foreRes.value.ok) {
        weatherForecast = { data: payload, loading: false, error: null };
      } else {
        weatherForecast = {
          data: null,
          loading: false,
          error: payload?.error || `Weather Forecast error (${foreRes.value.status})`
        };
      }
    } else {
      weatherForecast = { data: null, loading: false, error: 'Failed to load forecast.' };
    }
  }

  async function loadAllEnvironmentalData(loc: ActiveLocation, units: UnitsSystem) {
    const currentSeq = ++requestSeq;

    weatherCurrent = { data: weatherCurrent.data, loading: true, error: null };
    weatherForecast = { data: weatherForecast.data, loading: true, error: null };
    airQuality = { data: airQuality.data, loading: true, error: null };
    pollen = { data: pollen.data, loading: true, error: null };
    solar = { data: solar.data, loading: true, error: null };

    const { lat, lng } = loc;

    const [currRes, foreRes, aqiRes, pollenRes, solarRes] = await Promise.allSettled([
      fetch(`/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`),
      fetch(`/api/weather/forecast?lat=${lat}&lng=${lng}&unitsSystem=${units}&days=5`),
      fetch('/api/air-quality/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      }),
      fetch(`/api/pollen/forecast?lat=${lat}&lng=${lng}&days=5`),
      fetch(`/api/solar/building-insights?lat=${lat}&lng=${lng}`)
    ]);

    if (currentSeq !== requestSeq) return;

    if (currRes.status === 'fulfilled') {
      const payload = await currRes.value.json().catch(() => null);
      weatherCurrent = currRes.value.ok
        ? { data: payload, loading: false, error: null }
        : {
            data: null,
            loading: false,
            error: payload?.error || `Weather API error (${currRes.value.status})`
          };
    } else {
      weatherCurrent = { data: null, loading: false, error: 'Failed to fetch current weather.' };
    }

    if (foreRes.status === 'fulfilled') {
      const payload = await foreRes.value.json().catch(() => null);
      weatherForecast = foreRes.value.ok
        ? { data: payload, loading: false, error: null }
        : {
            data: null,
            loading: false,
            error: payload?.error || `Forecast API error (${foreRes.value.status})`
          };
    } else {
      weatherForecast = { data: null, loading: false, error: 'Failed to fetch weather forecast.' };
    }

    if (aqiRes.status === 'fulfilled') {
      const payload = await aqiRes.value.json().catch(() => null);
      airQuality = aqiRes.value.ok
        ? { data: payload, loading: false, error: null }
        : {
            data: null,
            loading: false,
            error: payload?.error || `Air Quality API error (${aqiRes.value.status})`
          };
    } else {
      airQuality = { data: null, loading: false, error: 'Failed to fetch air quality.' };
    }

    if (pollenRes.status === 'fulfilled') {
      const payload = await pollenRes.value.json().catch(() => null);
      pollen = pollenRes.value.ok
        ? { data: payload, loading: false, error: null }
        : {
            data: null,
            loading: false,
            error: payload?.error || `Pollen API error (${pollenRes.value.status})`
          };
    } else {
      pollen = { data: null, loading: false, error: 'Failed to fetch pollen forecast.' };
    }

    if (solarRes.status === 'fulfilled') {
      const payload = await solarRes.value.json().catch(() => null);
      if (solarRes.value.ok) {
        solar = { data: payload, loading: false, error: null };
      } else if (solarRes.value.status === 404 || payload?.nonCoverage) {
        solar = {
          data: {
            nonCoverage: true,
            message:
              payload?.message ||
              'No building rooftop solar imagery found within 50m of this coordinate.'
          },
          loading: false,
          error: null
        };
      } else {
        solar = {
          data: null,
          loading: false,
          error: payload?.error || `Solar API error (${solarRes.value.status})`
        };
      }
    } else {
      solar = { data: null, loading: false, error: 'Failed to fetch solar building insights.' };
    }
  }

  async function seedPhoenixLocation() {
    try {
      const res = await fetch('/api/places/search-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textQuery: 'Phoenix City Hall, Phoenix, AZ' })
      });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          places?: Array<{
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            location?: { latitude: number; longitude: number };
          }>;
        } | null;

        const first = data?.places?.[0];
        if (first?.location) {
          const seeded: ActiveLocation = {
            name: first.displayName?.text || DEFAULT_PHOENIX.name,
            address: first.formattedAddress || DEFAULT_PHOENIX.address,
            lat: first.location.latitude,
            lng: first.location.longitude,
            placeId: first.id,
            source: 'seed'
          };
          activeLocation = seeded;
          await loadAllEnvironmentalData(seeded, unitsSystem);
          return;
        }
      }
    } catch {
      // Fall back to default Phoenix City Hall coordinates if Places Text Search is unavailable
    }

    activeLocation = { ...DEFAULT_PHOENIX };
    await loadAllEnvironmentalData(activeLocation, unitsSystem);
  }

  function handleSelectLocation(loc: ActiveLocation) {
    activeLocation = loc;
    void loadAllEnvironmentalData(loc, unitsSystem);
  }

  function handleResetPhoenix() {
    void seedPhoenixLocation();
  }

  function handleToggleUnits() {
    const nextUnits: UnitsSystem = unitsSystem === 'IMPERIAL' ? 'METRIC' : 'IMPERIAL';
    unitsSystem = nextUnits;
    void fetchWeatherOnly(activeLocation.lat, activeLocation.lng, nextUnits);
  }

  function handleToggleAqiLayer() {
    showAqiLayer = !showAqiLayer;
  }

  function handleToggleMapType() {
    mapType = mapType === 'roadmap' ? 'hybrid' : 'roadmap';
  }

  onMount(() => {
    void seedPhoenixLocation();
  });
</script>

<div class="app-shell">
  <HeaderBar
    {activeLocation}
    {unitsSystem}
    {showAqiLayer}
    {mapType}
    onSelectLocation={handleSelectLocation}
    onResetPhoenix={handleResetPhoenix}
    onToggleUnits={handleToggleUnits}
    onToggleAqiLayer={handleToggleAqiLayer}
    onToggleMapType={handleToggleMapType}
  />

  <main class="workspace">
    <EnvironmentalSidebar
      {activeLocation}
      {unitsSystem}
      {weatherCurrent}
      {weatherForecast}
      {airQuality}
      {pollen}
      {solar}
    />

    <GoogleMapPanel
      {activeLocation}
      {showAqiLayer}
      {mapType}
      solarData={solar.data}
      onSelectLocation={handleSelectLocation}
    />
  </main>
</div>
