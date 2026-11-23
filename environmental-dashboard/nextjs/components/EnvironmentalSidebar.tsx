'use client';

import {
  CloudSun,
  Flower2,
  MapPin,
  MousePointerClick,
  Sun,
  Wind,
} from 'lucide-react';
import {
  ActiveLocation,
  AirQualityCurrentResponse,
  AqiColor,
  PanelFetchState,
  PollenForecastResponse,
  SolarBuildingInsightsResponse,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from '@/types/environment';

interface EnvironmentalSidebarProps {
  activeLocation: ActiveLocation;
  units: UnitsSystem;
  weatherCurrent: PanelFetchState<WeatherCurrentResponse>;
  weatherForecast: PanelFetchState<WeatherForecastResponse>;
  airQuality: PanelFetchState<AirQualityCurrentResponse>;
  pollen: PanelFetchState<PollenForecastResponse>;
  solar: PanelFetchState<SolarBuildingInsightsResponse>;
}

function formatTemp(degrees: number | undefined, units: UnitsSystem): string {
  if (typeof degrees !== 'number') return '—';
  const suffix = units === 'IMPERIAL' ? '°F' : '°C';
  return `${Math.round(degrees)}${suffix}`;
}

function formatWindSpeed(
  speed: { value?: number; unit?: string } | undefined,
  units: UnitsSystem
): string {
  if (typeof speed?.value !== 'number') return '—';
  const unitLabel =
    speed.unit === 'MILES_PER_HOUR'
      ? 'mph'
      : speed.unit === 'KILOMETERS_PER_HOUR'
      ? 'km/h'
      : units === 'IMPERIAL'
      ? 'mph'
      : 'km/h';
  return `${Math.round(speed.value)} ${unitLabel}`;
}

function formatForecastDate(displayDate?: {
  year: number;
  month: number;
  day: number;
}): string {
  if (!displayDate) return '—';
  const d = new Date(
    Date.UTC(displayDate.year, displayDate.month - 1, displayDate.day)
  );
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function aqiColorToCss(color?: AqiColor): { bg: string; fg: string } {
  if (!color) return { bg: '#0f766e', fg: '#ffffff' };
  const r = Math.round((color.red ?? 0) * 255);
  const g = Math.round((color.green ?? 0) * 255);
  const b = Math.round((color.blue ?? 0) * 255);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    fg: luminance > 0.62 ? '#0f172a' : '#ffffff',
  };
}

function formatConcentrationUnit(unit?: string): string {
  if (unit === 'MICROGRAMS_PER_CUBIC_METER') return 'µg/m³';
  if (unit === 'PARTS_PER_BILLION') return 'ppb';
  return unit ?? '';
}

function formatCardinal(cardinal?: string): string {
  if (!cardinal || cardinal === 'CARDINAL_DIRECTION_UNSPECIFIED') return '';
  const map: Record<string, string> = {
    NORTH: 'N',
    NORTH_NORTHEAST: 'NNE',
    NORTHEAST: 'NE',
    EAST_NORTHEAST: 'ENE',
    EAST: 'E',
    EAST_SOUTHEAST: 'ESE',
    SOUTHEAST: 'SE',
    SOUTH_SOUTHEAST: 'SSE',
    SOUTH: 'S',
    SOUTH_SOUTHWEST: 'SSW',
    SOUTHWEST: 'SW',
    WEST_SOUTHWEST: 'WSW',
    WEST: 'W',
    WEST_NORTHWEST: 'WNW',
    NORTHWEST: 'NW',
    NORTH_NORTHWEST: 'NNW',
  };
  return map[cardinal] ?? cardinal;
}

export function EnvironmentalSidebar({
  activeLocation,
  units,
  weatherCurrent,
  weatherForecast,
  airQuality,
  pollen,
  solar,
}: EnvironmentalSidebarProps) {
  // Primary AQI: prefer US local AQI if present, otherwise first available index (UAQI)
  const indexes = airQuality.data?.indexes ?? [];
  const primaryAqi =
    indexes.find((idx) => idx.code === 'usa_epa') ?? indexes[0] ?? null;
  const aqiColors = aqiColorToCss(primaryAqi?.color);

  // Today's pollen info
  const todayPollen = pollen.data?.dailyInfo?.[0];
  const pollenTypes = todayPollen?.pollenTypeInfo ?? [];
  const inSeasonPlants = (todayPollen?.plantInfo ?? []).filter(
    (p) => p.inSeason || (p.indexInfo?.value ?? 0) > 0
  );
  const firstPollenAdvice =
    pollenTypes.find((t) => t.healthRecommendations?.length)?.healthRecommendations?.[0] ??
    null;

  // Solar derived metrics
  const sp = solar.data?.solarPotential;
  const maxPanels = sp?.maxArrayPanelsCount ?? 0;
  const panelWatts = sp?.panelCapacityWatts ?? 400;
  const maxCapacityKw = (maxPanels * panelWatts) / 1000;
  const maxRoofAreaM2 = sp?.wholeRoofStats?.areaMeters2 ?? sp?.maxArrayAreaMeters2 ?? 0;
  const roofAreaDisplay =
    units === 'IMPERIAL'
      ? `${Math.round(maxRoofAreaM2 * 10.7639).toLocaleString()} sq ft`
      : `${Math.round(maxRoofAreaM2).toLocaleString()} m²`;
  const bestConfig =
    sp?.solarPanelConfigs && sp.solarPanelConfigs.length > 0
      ? sp.solarPanelConfigs[sp.solarPanelConfigs.length - 1]
      : null;
  const yearlyDcKwh = bestConfig?.yearlyEnergyDcKwh ?? 0;
  const carbonKgPerMwh = sp?.carbonOffsetFactorKgPerMwh ?? 0;
  const estAnnualCo2Kg =
    yearlyDcKwh > 0 && carbonKgPerMwh > 0
      ? Math.round((yearlyDcKwh / 1000) * carbonKgPerMwh)
      : null;

  return (
    <aside data-testid="environmental-sidebar" className="sidebar-panel">
      {/* 1. Selected Location Card */}
      <article data-testid="selected-location-card" className="env-card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-icon-badge icon-teal">
              <MapPin size={16} />
            </div>
            <h2 className="card-title">Inspection Target</h2>
          </div>
          <span className="status-pill pill-teal">
            {activeLocation.source === 'seed'
              ? 'Phoenix Seed'
              : activeLocation.source === 'search'
              ? 'Places Search'
              : 'Map Click'}
          </span>
        </div>
        <h3 className="loc-name">{activeLocation.name}</h3>
        <p className="loc-address">{activeLocation.formattedAddress}</p>
        <div className="loc-meta-row">
          <span className="coords-chip">
            {activeLocation.lat.toFixed(5)}, {activeLocation.lng.toFixed(5)}
          </span>
          {solar.data?.covered && solar.data.postalCode && (
            <span className="status-pill pill-neutral">
              {solar.data.administrativeArea ? `${solar.data.administrativeArea} · ` : ''}
              {solar.data.postalCode}
            </span>
          )}
        </div>
        <p className="hint-text">
          <MousePointerClick size={13} />
          <span>
            Click any building or rooftop on the map to inspect hyperlocal environmental &amp; solar
            data.
          </span>
        </p>
      </article>

      {/* 2. Weather Current + 5-Day Forecast Card */}
      <article data-testid="weather-card" className="env-card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-icon-badge icon-blue">
              <CloudSun size={16} />
            </div>
            <h2 className="card-title">Weather &amp; 5-Day Forecast</h2>
          </div>
          <span className="status-pill pill-neutral">
            {units === 'IMPERIAL' ? '°F / mph' : '°C / km/h'}
          </span>
        </div>

        {weatherCurrent.loading ? (
          <div className="loading-skeleton" />
        ) : weatherCurrent.error ? (
          <div className="error-banner">{weatherCurrent.error}</div>
        ) : weatherCurrent.data ? (
          <>
            <div className="weather-hero">
              <div className="weather-temp-wrap">
                {weatherCurrent.data.weatherCondition?.iconBaseUri && (
                  <img
                    src={`${weatherCurrent.data.weatherCondition.iconBaseUri}.svg`}
                    alt={
                      weatherCurrent.data.weatherCondition.description?.text ||
                      'Weather icon'
                    }
                    width={42}
                    height={42}
                  />
                )}
                <div>
                  <div className="weather-temp">
                    {formatTemp(weatherCurrent.data.temperature?.degrees, units)}
                  </div>
                  <div className="weather-feels">
                    Feels like{' '}
                    {formatTemp(
                      weatherCurrent.data.feelsLikeTemperature?.degrees,
                      units
                    )}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="weather-desc">
                  {weatherCurrent.data.weatherCondition?.description?.text ?? 'Clear'}
                </div>
                <div className="weather-feels">
                  Cloud cover {weatherCurrent.data.cloudCover ?? 0}%
                </div>
              </div>
            </div>

            <div className="metrics-grid-3">
              <div className="metric-box">
                <div className="metric-label">Humidity</div>
                <div className="metric-value">
                  {weatherCurrent.data.relativeHumidity ?? '—'}%
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">UV Index</div>
                <div className="metric-value">
                  {weatherCurrent.data.uvIndex ?? '—'}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Wind</div>
                <div className="metric-value">
                  {formatWindSpeed(weatherCurrent.data.wind?.speed, units)}{' '}
                  {formatCardinal(weatherCurrent.data.wind?.direction?.cardinal)}
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div data-testid="weather-forecast-list" className="forecast-list">
          {weatherForecast.loading ? (
            <div className="loading-skeleton" style={{ height: '90px' }} />
          ) : weatherForecast.error ? (
            <div className="error-banner">{weatherForecast.error}</div>
          ) : (
            (weatherForecast.data?.forecastDays ?? []).slice(0, 5).map((day, i) => {
              const cond = day.daytimeForecast?.weatherCondition;
              const pop = day.daytimeForecast?.precipitation?.probability?.percent;
              return (
                <div
                  key={`${day.displayDate?.year}-${day.displayDate?.month}-${day.displayDate?.day}-${i}`}
                  className="forecast-row"
                >
                  <span className="forecast-day">
                    {i === 0 ? 'Today' : formatForecastDate(day.displayDate)}
                  </span>
                  <span>
                    {cond?.iconBaseUri ? (
                      <img
                        src={`${cond.iconBaseUri}.svg`}
                        alt={cond.description?.text ?? 'Forecast'}
                        width={22}
                        height={22}
                      />
                    ) : null}
                  </span>
                  <span className="forecast-cond">
                    {cond?.description?.text ?? '—'}
                    {typeof pop === 'number' && pop > 0 ? ` · ${pop}% precip` : ''}
                  </span>
                  <span className="forecast-temps">
                    {formatTemp(day.maxTemperature?.degrees, units)}
                    <span className="forecast-low">
                      / {formatTemp(day.minTemperature?.degrees, units)}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </article>

      {/* 3. Air Quality Card */}
      <article data-testid="air-quality-card" className="env-card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-icon-badge icon-teal">
              <Wind size={16} />
            </div>
            <h2 className="card-title">Air Quality Index</h2>
          </div>
          {primaryAqi?.displayName && (
            <span className="status-pill pill-neutral">{primaryAqi.displayName}</span>
          )}
        </div>

        {airQuality.loading ? (
          <div className="loading-skeleton" />
        ) : airQuality.error ? (
          <div className="error-banner">{airQuality.error}</div>
        ) : primaryAqi ? (
          <>
            <div className="aqi-hero">
              <div
                className="aqi-score-badge"
                style={{ backgroundColor: aqiColors.bg, color: aqiColors.fg }}
              >
                <span className="aqi-score-num">
                  {primaryAqi.aqiDisplay ?? primaryAqi.aqi ?? '—'}
                </span>
                <span className="aqi-score-label">AQI</span>
              </div>
              <div>
                <div className="aqi-cat">{primaryAqi.category ?? 'Measured'}</div>
                <div className="aqi-dom">
                  Dominant pollutant:{' '}
                  <strong>
                    {(primaryAqi.dominantPollutant ?? 'N/A').toUpperCase()}
                  </strong>
                </div>
              </div>
            </div>

            {airQuality.data?.pollutants && airQuality.data.pollutants.length > 0 && (
              <div className="pollutant-chips">
                {airQuality.data.pollutants.slice(0, 6).map((pol) => (
                  <div key={pol.code ?? pol.displayName} className="pollutant-chip">
                    <span className="pollutant-code">
                      {pol.displayName ?? pol.code?.toUpperCase()}
                    </span>
                    <span className="pollutant-val">
                      {typeof pol.concentration?.value === 'number'
                        ? `${pol.concentration.value.toFixed(1)} ${formatConcentrationUnit(
                            pol.concentration.units
                          )}`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {airQuality.data?.healthRecommendations && (
              <div className="advice-box">
                <strong>Health guidance:</strong>{' '}
                {airQuality.data.healthRecommendations.generalPopulation ||
                  airQuality.data.healthRecommendations.athletes ||
                  airQuality.data.healthRecommendations.lungDiseasePopulation}
              </div>
            )}
          </>
        ) : (
          <div className="advice-box">
            No air quality station reading returned for these coordinates.
          </div>
        )}
      </article>

      {/* 4. Pollen Forecast Card */}
      <article data-testid="pollen-card" className="env-card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-icon-badge icon-green">
              <Flower2 size={16} />
            </div>
            <h2 className="card-title">Pollen &amp; Allergens</h2>
          </div>
          {pollen.data?.regionCode && (
            <span className="status-pill pill-green">
              Region {pollen.data.regionCode}
            </span>
          )}
        </div>

        {pollen.loading ? (
          <div className="loading-skeleton" />
        ) : pollen.error ? (
          <div className="error-banner">{pollen.error}</div>
        ) : pollenTypes.length > 0 ? (
          <>
            <div className="pollen-bars">
              {pollenTypes.map((pt) => {
                const val = pt.indexInfo?.value ?? 0;
                const pct = Math.min(100, Math.max(8, (val / 5) * 100));
                const barColor =
                  val >= 4
                    ? '#dc2626'
                    : val >= 3
                    ? '#d97706'
                    : val >= 2
                    ? '#ca8a04'
                    : '#16a34a';
                return (
                  <div key={pt.code ?? pt.displayName} className="pollen-row">
                    <div className="pollen-row-top">
                      <span style={{ fontWeight: 600 }}>
                        {pt.displayName ?? pt.code}{' '}
                        <span style={{ fontWeight: 400, color: '#64748b' }}>
                          ({pt.inSeason ? 'In season' : 'Low / Out of season'})
                        </span>
                      </span>
                      <span style={{ fontWeight: 700, color: barColor }}>
                        {pt.indexInfo?.category ?? `UPI ${val}/5`}
                      </span>
                    </div>
                    <div className="pollen-track">
                      <div
                        className="pollen-fill"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {inSeasonPlants.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div className="metric-label">Active Plant Allergens</div>
                <div className="plant-tags">
                  {inSeasonPlants.slice(0, 6).map((plant) => (
                    <span key={plant.code ?? plant.displayName} className="plant-tag">
                      {plant.displayName ?? plant.code}
                      {plant.indexInfo?.category ? ` · ${plant.indexInfo.category}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {firstPollenAdvice && (
              <div className="advice-box">
                <strong>Allergy guidance:</strong> {firstPollenAdvice}
              </div>
            )}
          </>
        ) : (
          <div className="advice-box">
            Pollen forecast data is unavailable for this coordinate.
          </div>
        )}
      </article>

      {/* 5. Rooftop Solar Building Insights Card */}
      <article data-testid="solar-card" className="env-card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-icon-badge icon-amber">
              <Sun size={16} />
            </div>
            <h2 className="card-title">Rooftop Solar Insights</h2>
          </div>
          {solar.data?.covered && solar.data.imageryQuality && (
            <span className="status-pill pill-amber">
              {solar.data.imageryQuality} Imagery
            </span>
          )}
        </div>

        {solar.loading ? (
          <div className="loading-skeleton" />
        ) : solar.error ? (
          <div className="error-banner">{solar.error}</div>
        ) : solar.data && !solar.data.covered ? (
          <div data-testid="solar-non-coverage" className="solar-non-coverage">
            <strong>No Rooftop Coverage Here:</strong>{' '}
            {solar.data.message ||
              'No modeled building found within 50m of this coordinate. Click directly on a building roof to analyze solar capacity.'}
          </div>
        ) : sp ? (
          <>
            <div className="metrics-grid-2">
              <div className="metric-box">
                <div className="metric-label">Max Solar Panels</div>
                <div className="metric-value">
                  {maxPanels.toLocaleString()} panels
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Est. Array Capacity</div>
                <div className="metric-value">
                  {maxCapacityKw > 0 ? `${maxCapacityKw.toFixed(1)} kW` : '—'}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Annual Sunshine</div>
                <div className="metric-value">
                  {typeof sp.maxSunshineHoursPerYear === 'number'
                    ? `${Math.round(sp.maxSunshineHoursPerYear).toLocaleString()} hrs/yr`
                    : '—'}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Modeled Roof Area</div>
                <div className="metric-value">{roofAreaDisplay}</div>
              </div>
            </div>

            {(yearlyDcKwh > 0 || carbonKgPerMwh > 0) && (
              <div className="metrics-grid-2" style={{ marginTop: '8px' }}>
                <div className="metric-box">
                  <div className="metric-label">Est. Annual Yield</div>
                  <div className="metric-value">
                    {yearlyDcKwh > 0
                      ? `${Math.round(yearlyDcKwh).toLocaleString()} kWh/yr`
                      : '—'}
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">CO₂ Offset Potential</div>
                  <div className="metric-value">
                    {estAnnualCo2Kg !== null
                      ? `${(estAnnualCo2Kg / 1000).toFixed(1)} t CO₂/yr`
                      : carbonKgPerMwh > 0
                      ? `${Math.round(carbonKgPerMwh)} kg/MWh`
                      : '—'}
                  </div>
                </div>
              </div>
            )}

            <div className="solar-meta">
              <span>
                Panel spec: {panelWatts}W (
                {sp.panelLifetimeYears ?? 20}-yr life)
              </span>
              {solar.data?.imageryDate && (
                <span>
                  Imagery: {solar.data.imageryDate.year}-
                  {String(solar.data.imageryDate.month).padStart(2, '0')}-
                  {String(solar.data.imageryDate.day).padStart(2, '0')}
                </span>
              )}
            </div>
          </>
        ) : null}
      </article>
    </aside>
  );
}
