<script lang="ts">
  import type {
    ActiveLocation,
    AirQualityCurrentResponse,
    EnvironmentalPanelState,
    PollenForecastResponse,
    SolarBuildingInsightsResponse,
    UnitsSystem,
    WeatherCurrentResponse,
    WeatherForecastResponse
  } from '$lib/types/environmental';

  interface Props {
    activeLocation: ActiveLocation;
    unitsSystem: UnitsSystem;
    weatherCurrent: EnvironmentalPanelState<WeatherCurrentResponse>;
    weatherForecast: EnvironmentalPanelState<WeatherForecastResponse>;
    airQuality: EnvironmentalPanelState<AirQualityCurrentResponse>;
    pollen: EnvironmentalPanelState<PollenForecastResponse>;
    solar: EnvironmentalPanelState<SolarBuildingInsightsResponse>;
  }

  let {
    activeLocation,
    unitsSystem,
    weatherCurrent,
    weatherForecast,
    airQuality,
    pollen,
    solar
  }: Props = $props();

  const tempSymbol = $derived(unitsSystem === 'IMPERIAL' ? '°F' : '°C');
  const speedSymbol = $derived(unitsSystem === 'IMPERIAL' ? 'mph' : 'km/h');
  const precipUnitSymbol = $derived(unitsSystem === 'IMPERIAL' ? 'in' : 'mm');

  function formatTemp(val: number | undefined): string {
    if (typeof val !== 'number' || Number.isNaN(val)) return '—';
    return `${Math.round(val)}${tempSymbol}`;
  }

  function formatForecastDay(displayDate?: { year: number; month: number; day: number }): string {
    if (!displayDate) return '—';
    const d = new Date(Date.UTC(displayDate.year, displayDate.month - 1, displayDate.day));
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }

  function resolveAqiColor(color?: { red?: number; green?: number; blue?: number }): string {
    if (!color) return '#e2e8f0';
    const r = color.red ?? 0;
    const g = color.green ?? 0;
    const b = color.blue ?? 0;
    const maxChannel = Math.max(r, g, b);
    const scale = maxChannel <= 1 ? 255 : 1;
    const ri = Math.round(r * scale);
    const gi = Math.round(g * scale);
    const bi = Math.round(b * scale);
    return `rgb(${ri}, ${gi}, ${bi})`;
  }

  function getContrastText(color?: { red?: number; green?: number; blue?: number }): string {
    if (!color) return '#0f172a';
    const r = color.red ?? 0;
    const g = color.green ?? 0;
    const b = color.blue ?? 0;
    const maxChannel = Math.max(r, g, b);
    const scale = maxChannel <= 1 ? 255 : 1;
    const luminance = (0.299 * r * scale + 0.587 * g * scale + 0.114 * b * scale) / 255;
    return luminance < 0.55 ? '#ffffff' : '#0f172a';
  }

  function formatRoofArea(meters2: number | undefined): string {
    if (typeof meters2 !== 'number') return '—';
    if (unitsSystem === 'IMPERIAL') {
      return `${Math.round(meters2 * 10.7639).toLocaleString()} sq ft`;
    }
    return `${Math.round(meters2).toLocaleString()} m²`;
  }

  const primaryAqi = $derived.by(() => {
    const indexes = airQuality.data?.indexes;
    if (!indexes?.length) return null;
    return indexes.find((idx) => idx.code === 'usa_epa') ?? indexes[0];
  });

  const primaryHealthAdvice = $derived.by(() => {
    const recs = airQuality.data?.healthRecommendations;
    if (!recs) return null;
    return (
      recs.generalPopulation ||
      recs.lungDiseasePopulation ||
      Object.values(recs).find((v) => Boolean(v)) ||
      null
    );
  });

  const todayPollen = $derived(pollen.data?.dailyInfo?.[0] ?? null);

  const solarArrayKw = $derived.by(() => {
    const sp = solar.data?.solarPotential;
    if (!sp?.maxArrayPanelsCount || !sp?.panelCapacityWatts) return null;
    return ((sp.maxArrayPanelsCount * sp.panelCapacityWatts) / 1000).toFixed(1);
  });

  const solarYearlyKwh = $derived.by(() => {
    const configs = solar.data?.solarPotential?.solarPanelConfigs;
    if (!configs?.length) return null;
    const maxCfg = configs[configs.length - 1];
    return typeof maxCfg?.yearlyEnergyDcKwh === 'number'
      ? Math.round(maxCfg.yearlyEnergyDcKwh).toLocaleString()
      : null;
  });
</script>

<aside class="sidebar" data-testid="environmental-sidebar">
  <!-- Selected Location Summary -->
  <section class="env-card" data-testid="selected-location-card">
    <div class="card-header">
      <div class="card-kicker">Active Inspection Target</div>
      <span class="badge badge-sky">
        {#if activeLocation.source === 'seed'}
          Phoenix Seed
        {:else if activeLocation.source === 'search'}
          Places Search
        {:else}
          Map Pin
        {/if}
      </span>
    </div>
    <h1 class="location-name">{activeLocation.name}</h1>
    <p class="location-address">{activeLocation.address || 'Coordinates selected on map'}</p>
    <div class="location-coords-row">
      <span>Coordinates (WGS84)</span>
      <span class="mono">{activeLocation.lat.toFixed(5)}, {activeLocation.lng.toFixed(5)}</span>
    </div>
    <p class="instruction-note">
      Click any building on the map or search an address above to inspect live Weather, Air
      Quality, Pollen, and Rooftop Solar capacity.
    </p>
  </section>

  <!-- Weather Current & 5-Day Forecast -->
  <section class="env-card" data-testid="weather-card">
    <div class="card-header">
      <div class="card-kicker">Weather Conditions</div>
      <span class="badge badge-sky">Weather API</span>
    </div>

    {#if weatherCurrent.loading && !weatherCurrent.data}
      <div class="loading-state">Loading live meteorological conditions...</div>
    {:else if weatherCurrent.error && !weatherCurrent.data}
      <div class="error-state">{weatherCurrent.error}</div>
    {:else if weatherCurrent.data}
      <div class="weather-hero">
        <div class="weather-temp-wrap">
          {#if weatherCurrent.data.weatherCondition?.iconBaseUri}
            <img
              class="weather-icon"
              src={`${weatherCurrent.data.weatherCondition.iconBaseUri}.svg`}
              alt={weatherCurrent.data.weatherCondition?.description?.text || 'Weather condition'}
            />
          {/if}
          <div>
            <div class="weather-temp">
              {formatTemp(weatherCurrent.data.temperature?.degrees)}
            </div>
            <div class="weather-desc">
              {weatherCurrent.data.weatherCondition?.description?.text || 'Current conditions'}
            </div>
          </div>
        </div>
        <div class="weather-feels">
          <div>Feels like <strong>{formatTemp(weatherCurrent.data.feelsLikeTemperature?.degrees)}</strong></div>
          <div>{weatherCurrent.data.isDaytime ? 'Daytime' : 'Nighttime'}</div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Humidity</div>
          <div class="metric-value">
            {weatherCurrent.data.relativeHumidity ?? '—'}%
          </div>
        </div>
        <div class="metric-box">
          <div class="metric-label">UV Index</div>
          <div class="metric-value">
            {weatherCurrent.data.uvIndex ?? '—'}
          </div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Wind</div>
          <div class="metric-value">
            {weatherCurrent.data.wind?.speed?.value ?? '—'} {speedSymbol}
            {weatherCurrent.data.wind?.direction?.cardinal ? ` ${weatherCurrent.data.wind.direction.cardinal}` : ''}
          </div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Precipitation</div>
          <div class="metric-value">
            {weatherCurrent.data.precipitation?.probability?.percent ?? 0}%
            {#if typeof weatherCurrent.data.precipitation?.qpf?.quantity === 'number'}
              ({weatherCurrent.data.precipitation.qpf.quantity} {precipUnitSymbol})
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <div data-testid="weather-forecast-list">
      {#if weatherForecast.loading && !weatherForecast.data}
        <div class="loading-state" style="margin-top: 10px;">Loading 5-day forecast...</div>
      {:else if weatherForecast.error && !weatherForecast.data}
        <div class="error-state" style="margin-top: 10px;">{weatherForecast.error}</div>
      {:else if weatherForecast.data?.forecastDays?.length}
        <div class="forecast-strip">
          {#each weatherForecast.data.forecastDays.slice(0, 5) as day, i (`${day.displayDate?.year}-${day.displayDate?.month}-${day.displayDate?.day}-${i}`)}
            <div class="forecast-day">
              <span class="forecast-day-label">{formatForecastDay(day.displayDate)}</span>
              {#if day.daytimeForecast?.weatherCondition?.iconBaseUri}
                <img
                  class="forecast-day-icon"
                  src={`${day.daytimeForecast.weatherCondition.iconBaseUri}.svg`}
                  alt={day.daytimeForecast.weatherCondition?.description?.text || 'Forecast icon'}
                />
              {/if}
              <span class="forecast-temps">
                {formatTemp(day.maxTemperature?.degrees)}
                <span class="forecast-low"> / {formatTemp(day.minTemperature?.degrees)}</span>
              </span>
              <span class="forecast-precip">
                {day.daytimeForecast?.precipitation?.probability?.percent ?? 0}%
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Air Quality Card -->
  <section class="env-card" data-testid="air-quality-card">
    <div class="card-header">
      <div class="card-kicker">Air Quality &amp; Pollutants</div>
      <span class="badge badge-emerald">Air Quality API</span>
    </div>

    {#if airQuality.loading && !airQuality.data}
      <div class="loading-state">Loading Air Quality Index &amp; pollutant levels...</div>
    {:else if airQuality.error && !airQuality.data}
      <div class="error-state">{airQuality.error}</div>
    {:else if airQuality.data && primaryAqi}
      <div class="aqi-hero">
        <div
          class="aqi-score-badge"
          style={`background-color: ${resolveAqiColor(primaryAqi.color)}; color: ${getContrastText(primaryAqi.color)};`}
        >
          <span class="aqi-score-num">{primaryAqi.aqiDisplay || primaryAqi.aqi || '—'}</span>
          <span class="aqi-score-unit">{primaryAqi.code === 'usa_epa' ? 'US AQI' : 'UAQI'}</span>
        </div>
        <div>
          <div class="aqi-meta-title">{primaryAqi.category || 'Air Quality Status'}</div>
          <div class="aqi-meta-sub">
            {primaryAqi.displayName || 'Air Quality Index'}
            {#if primaryAqi.dominantPollutant}
              · Dominant: <strong style="text-transform: uppercase;">{primaryAqi.dominantPollutant}</strong>
            {/if}
          </div>
        </div>
      </div>

      {#if airQuality.data.pollutants?.length}
        <div class="pollutants-grid">
          {#each airQuality.data.pollutants.slice(0, 6) as pollutant (pollutant.code)}
            <div class="pollutant-chip">
              <div class="pollutant-code">{pollutant.displayName || pollutant.code}</div>
              <div class="pollutant-val">
                {typeof pollutant.concentration?.value === 'number'
                  ? pollutant.concentration.value.toFixed(1)
                  : '—'}
                <span style="font-size: 0.65rem; font-weight: 500; color: var(--text-muted);">
                  {pollutant.concentration?.units === 'MICROGRAMS_PER_CUBIC_METER'
                    ? 'µg/m³'
                    : pollutant.concentration?.units === 'PARTS_PER_BILLION'
                      ? 'ppb'
                      : ''}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if primaryHealthAdvice}
        <div class="health-box">
          <strong>Health Guidance:</strong> {primaryHealthAdvice}
        </div>
      {/if}
    {/if}
  </section>

  <!-- Pollen Forecast Card -->
  <section class="env-card" data-testid="pollen-card">
    <div class="card-header">
      <div class="card-kicker">Pollen &amp; Allergen Outlook</div>
      <span class="badge badge-neutral">Pollen API</span>
    </div>

    {#if pollen.loading && !pollen.data}
      <div class="loading-state">Loading Tree, Grass &amp; Weed pollen levels...</div>
    {:else if pollen.error && !pollen.data}
      <div class="error-state">{pollen.error}</div>
    {:else if todayPollen}
      <div class="pollen-grid">
        {#each todayPollen.pollenTypeInfo ?? [] as pType (pType.code)}
          <div class="pollen-tile">
            <div class="pollen-type">{pType.displayName || pType.code}</div>
            <div class="pollen-level">
              {pType.indexInfo?.category || 'Very Low'}
              {#if typeof pType.indexInfo?.value === 'number'}
                <span style="font-size: 0.72rem; color: var(--text-muted);">
                  ({pType.indexInfo.value}/5)
                </span>
              {/if}
            </div>
            <div class="pollen-season">
              {pType.inSeason ? 'In Season' : 'Out of Season'}
            </div>
          </div>
        {/each}
      </div>

      {#if todayPollen.plantInfo?.length}
        <div class="plant-tags">
          {#each todayPollen.plantInfo.slice(0, 6) as plant (plant.code)}
            <span class="plant-tag">
              {plant.displayName || plant.code}
              {#if plant.indexInfo?.category}
                · {plant.indexInfo.category}
              {/if}
            </span>
          {/each}
        </div>
      {/if}

      {#if todayPollen.pollenTypeInfo?.find((p) => p.healthRecommendations?.length)?.healthRecommendations?.[0]}
        <div class="health-box">
          <strong>Allergy Guidance:</strong>
          {todayPollen.pollenTypeInfo.find((p) => p.healthRecommendations?.length)?.healthRecommendations?.[0]}
        </div>
      {/if}
    {:else}
      <div class="loading-state">No pollen index forecast available for this coordinate.</div>
    {/if}
  </section>

  <!-- Rooftop Solar Potential Card -->
  <section class="env-card" data-testid="solar-card">
    <div class="card-header">
      <div class="card-kicker">Rooftop Solar Potential</div>
      <span class="badge badge-amber">Solar API</span>
    </div>

    {#if solar.loading && !solar.data}
      <div class="loading-state">Inspecting building rooftop solar potential...</div>
    {:else if solar.data?.nonCoverage}
      <div class="solar-non-coverage" data-testid="solar-non-coverage">
        <strong>No Building Coverage Within 50m:</strong>
        {solar.data.message || 'Click directly on a building rooftop to inspect solar panel capacity.'}
      </div>
    {:else if solar.error && !solar.data}
      <div class="error-state">{solar.error}</div>
    {:else if solar.data?.solarPotential}
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Max Panel Capacity</div>
          <div class="metric-value">
            {solar.data.solarPotential.maxArrayPanelsCount?.toLocaleString() ?? '—'} panels
            {#if solarArrayKw}
              <span style="font-size: 0.74rem; color: var(--accent-amber);">({solarArrayKw} kW)</span>
            {/if}
          </div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Annual Sunshine</div>
          <div class="metric-value">
            {solar.data.solarPotential.maxSunshineHoursPerYear
              ? `${Math.round(solar.data.solarPotential.maxSunshineHoursPerYear).toLocaleString()} hrs/yr`
              : '—'}
          </div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Usable Roof Area</div>
          <div class="metric-value">
            {formatRoofArea(solar.data.solarPotential.wholeRoofStats?.areaMeters2)}
          </div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Carbon Offset Factor</div>
          <div class="metric-value">
            {solar.data.solarPotential.carbonOffsetFactorKgPerMwh
              ? `${Math.round(solar.data.solarPotential.carbonOffsetFactorKgPerMwh)} kg CO₂/MWh`
              : '—'}
          </div>
        </div>
      </div>

      <div class="solar-footer">
        <span>
          {#if solarYearlyKwh}
            Est. Peak Output: <strong>{solarYearlyKwh} kWh/yr</strong>
          {:else}
            Imagery Quality: <strong>{solar.data.imageryQuality || 'HIGH'}</strong>
          {/if}
        </span>
        {#if solar.data.imageryDate}
          <span>
            Imagery: {solar.data.imageryDate.year}-{String(solar.data.imageryDate.month).padStart(2, '0')}
          </span>
        {/if}
      </div>
    {/if}
  </section>
</aside>
