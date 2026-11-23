import {
  AlertCircle,
  Compass,
  Droplets,
  Flower2,
  Leaf,
  MapPin,
  ShieldCheck,
  Sun,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import type {
  AqiColor,
  EnvironmentalSnapshot,
  InspectedLocation,
  UnitsSystem,
} from '../types/environmental';

interface EnvironmentalSidebarProps {
  activeLocation: InspectedLocation;
  units: UnitsSystem;
  snapshot: EnvironmentalSnapshot;
  hasApiKey: boolean;
}

function toCssRgb(color?: AqiColor, fallback = '#0f766e'): string {
  if (!color) return fallback;
  const r = color.red ?? 0;
  const g = color.green ?? 0;
  const b = color.blue ?? 0;
  const isFloat = r <= 1 && g <= 1 && b <= 1;
  const scale = isFloat ? 255 : 1;
  return `rgb(${Math.round(r * scale)}, ${Math.round(g * scale)}, ${Math.round(b * scale)})`;
}

function formatTemp(degrees?: number, unit?: string): string {
  if (degrees === undefined || Number.isNaN(degrees)) return '--';
  const symbol = unit === 'FAHRENHEIT' ? '°F' : '°C';
  return `${Math.round(degrees)}${symbol}`;
}

function formatWindSpeed(value?: number, unit?: string): string {
  if (value === undefined || Number.isNaN(value)) return '--';
  const suffix = unit === 'MILES_PER_HOUR' ? 'mph' : 'km/h';
  return `${Math.round(value)} ${suffix}`;
}

function formatForecastDate(date?: {
  year: number;
  month: number;
  day: number;
}): string {
  if (!date) return '—';
  const dt = new Date(date.year, date.month - 1, date.day);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatRoofArea(areaMeters2: number | undefined, units: UnitsSystem): string {
  if (areaMeters2 === undefined || Number.isNaN(areaMeters2)) return '—';
  if (units === 'IMPERIAL') {
    const sqFt = areaMeters2 * 10.76391;
    return `${Math.round(sqFt).toLocaleString('en-US')} sq ft`;
  }
  return `${Math.round(areaMeters2).toLocaleString('en-US')} m²`;
}

export function EnvironmentalSidebar({
  activeLocation,
  units,
  snapshot,
  hasApiKey,
}: EnvironmentalSidebarProps) {
  const { weatherCurrent, weatherForecast, airQuality, pollen, solar } =
    snapshot;

  return (
    <aside
      data-testid="environmental-sidebar"
      className="environmental-sidebar"
      aria-label="Environmental Intelligence Sidebar"
    >
      {/* Selected Location Summary */}
      <section data-testid="selected-location-card" className="panel-card location-card">
        <div className="card-header">
          <div className="card-title-row">
            <MapPin className="card-icon accent-teal" size={18} />
            <h2 className="card-title">Inspected Location</h2>
          </div>
          <span className="source-pill">
            {activeLocation.source === 'seed'
              ? 'Phoenix Seed'
              : activeLocation.source === 'autocomplete'
                ? 'Search'
                : 'Map Click'}
          </span>
        </div>

        <p className="location-name">{activeLocation.name}</p>
        <p className="location-address">{activeLocation.formattedAddress}</p>
        <div className="location-meta-row">
          <span className="coord-chip">
            <Compass size={13} />
            {activeLocation.coords.lat.toFixed(5)},{' '}
            {activeLocation.coords.lng.toFixed(5)}
          </span>
          <span className="hint-text">Click any building on map to inspect</span>
        </div>
      </section>

      {!hasApiKey && (
        <section className="panel-card warning-card">
          <div className="card-title-row">
            <AlertCircle className="card-icon accent-amber" size={18} />
            <h2 className="card-title">API Key Required</h2>
          </div>
          <p className="muted-copy">
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code>{' '}
            to load interactive Google Maps, Weather, Air Quality, Pollen, and
            Solar insights.
          </p>
        </section>
      )}

      {/* Weather Current + 5-Day Forecast */}
      <section data-testid="weather-card" className="panel-card">
        <div className="card-header">
          <div className="card-title-row">
            <Thermometer className="card-icon accent-sky" size={18} />
            <h2 className="card-title">Current Weather</h2>
          </div>
          <span className="api-tag">Weather API</span>
        </div>

        {weatherCurrent.status === 'loading' && (
          <div className="loading-skeleton">Fetching current conditions…</div>
        )}
        {weatherCurrent.status === 'non-coverage' && (
          <div className="non-coverage-box">{weatherCurrent.message}</div>
        )}
        {weatherCurrent.status === 'error' && (
          <div className="error-box">{weatherCurrent.message}</div>
        )}
        {weatherCurrent.status === 'ok' && (
          <>
            <div className="weather-hero">
              <div className="weather-hero-left">
                {weatherCurrent.data.weatherCondition?.iconBaseUri && (
                  <img
                    src={`${weatherCurrent.data.weatherCondition.iconBaseUri}.svg`}
                    alt={
                      weatherCurrent.data.weatherCondition.description?.text ||
                      'Weather condition'
                    }
                    className="weather-icon-lg"
                  />
                )}
                <div>
                  <div className="weather-temp-lg">
                    {formatTemp(
                      weatherCurrent.data.temperature?.degrees,
                      weatherCurrent.data.temperature?.unit
                    )}
                  </div>
                  <div className="weather-condition-text">
                    {weatherCurrent.data.weatherCondition?.description?.text ||
                      'Conditions'}
                  </div>
                </div>
              </div>
              <div className="weather-feels-like">
                Feels like{' '}
                <strong>
                  {formatTemp(
                    weatherCurrent.data.feelsLikeTemperature?.degrees,
                    weatherCurrent.data.feelsLikeTemperature?.unit
                  )}
                </strong>
              </div>
            </div>

            <div className="metric-grid-4">
              <div className="metric-tile">
                <span className="metric-label">Humidity</span>
                <span className="metric-value">
                  <Droplets size={13} />{' '}
                  {weatherCurrent.data.relativeHumidity ?? '--'}%
                </span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">UV Index</span>
                <span className="metric-value">
                  <Sun size={13} /> {weatherCurrent.data.uvIndex ?? '--'}
                </span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">Wind</span>
                <span className="metric-value">
                  <Wind size={13} />{' '}
                  {formatWindSpeed(
                    weatherCurrent.data.wind?.speed?.value,
                    weatherCurrent.data.wind?.speed?.unit
                  )}
                </span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">Precip</span>
                <span className="metric-value">
                  {weatherCurrent.data.precipitation?.probability?.percent ?? 0}%
                </span>
              </div>
            </div>
          </>
        )}

        {/* 5-Day Forecast */}
        <div className="sub-section">
          <h3 className="sub-heading">5-Day Outlook</h3>
          <div
            data-testid="weather-forecast-list"
            className="weather-forecast-list"
          >
            {weatherForecast.status === 'loading' && (
              <div className="loading-skeleton">Loading 5-day forecast…</div>
            )}
            {weatherForecast.status === 'non-coverage' && (
              <div className="non-coverage-box">{weatherForecast.message}</div>
            )}
            {weatherForecast.status === 'error' && (
              <div className="error-box">{weatherForecast.message}</div>
            )}
            {weatherForecast.status === 'ok' &&
              (weatherForecast.data.forecastDays?.slice(0, 5) ?? []).map(
                (day, idx) => {
                  const iconBase =
                    day.daytimeForecast?.weatherCondition?.iconBaseUri;
                  const condText =
                    day.daytimeForecast?.weatherCondition?.description?.text ||
                    'Forecast';
                  const precipPct =
                    day.daytimeForecast?.precipitation?.probability?.percent ?? 0;

                  return (
                    <div
                      key={`${day.displayDate?.year}-${day.displayDate?.month}-${day.displayDate?.day}-${idx}`}
                      className="forecast-row"
                    >
                      <span className="forecast-date">
                        {idx === 0 ? 'Today' : formatForecastDate(day.displayDate)}
                      </span>
                      <span className="forecast-cond">
                        {iconBase && (
                          <img
                            src={`${iconBase}.svg`}
                            alt={condText}
                            className="weather-icon-sm"
                          />
                        )}
                        <span className="forecast-cond-label">{condText}</span>
                      </span>
                      <span className="forecast-precip">{precipPct}%</span>
                      <span className="forecast-temps">
                        <strong>
                          {formatTemp(
                            day.maxTemperature?.degrees,
                            day.maxTemperature?.unit
                          )}
                        </strong>
                        <span className="temp-low">
                          {formatTemp(
                            day.minTemperature?.degrees,
                            day.minTemperature?.unit
                          )}
                        </span>
                      </span>
                    </div>
                  );
                }
              )}
          </div>
        </div>
      </section>

      {/* Air Quality Index Card */}
      <section data-testid="air-quality-card" className="panel-card">
        <div className="card-header">
          <div className="card-title-row">
            <ShieldCheck className="card-icon accent-emerald" size={18} />
            <h2 className="card-title">Air Quality Index</h2>
          </div>
          <span className="api-tag">Air Quality API</span>
        </div>

        {airQuality.status === 'loading' && (
          <div className="loading-skeleton">Fetching AQI &amp; pollutants…</div>
        )}
        {airQuality.status === 'non-coverage' && (
          <div className="non-coverage-box">{airQuality.message}</div>
        )}
        {airQuality.status === 'error' && (
          <div className="error-box">{airQuality.message}</div>
        )}
        {airQuality.status === 'ok' && (() => {
          const indexes = airQuality.data.indexes ?? [];
          const primaryIndex =
            indexes.find((i) => i.code === 'usa_epa') ?? indexes[0];
          const badgeColor = toCssRgb(primaryIndex?.color, '#10b981');
          const pollutants = airQuality.data.pollutants ?? [];
          const generalAdvice =
            airQuality.data.healthRecommendations?.generalPopulation ||
            airQuality.data.healthRecommendations?.athletes ||
            airQuality.data.healthRecommendations?.lungDiseasePopulation;

          return (
            <>
              {primaryIndex ? (
                <div className="aqi-hero">
                  <div
                    className="aqi-badge"
                    style={{
                      borderColor: badgeColor,
                      backgroundColor: `${badgeColor}1a`,
                    }}
                  >
                    <span className="aqi-score">
                      {primaryIndex.aqiDisplay ?? primaryIndex.aqi ?? '--'}
                    </span>
                    <span className="aqi-index-name">
                      {primaryIndex.displayName}
                    </span>
                  </div>
                  <div className="aqi-summary">
                    <div className="aqi-category">
                      {primaryIndex.category || 'Air Quality'}
                    </div>
                    {primaryIndex.dominantPollutant && (
                      <div className="aqi-dominant">
                        Dominant pollutant:{' '}
                        <strong>
                          {primaryIndex.dominantPollutant.toUpperCase()}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="muted-copy">No AQI index reported.</p>
              )}

              {pollutants.length > 0 && (
                <div className="pollutant-grid">
                  {pollutants.slice(0, 4).map((p) => (
                    <div key={p.code} className="pollutant-chip">
                      <span className="pollutant-name">{p.displayName}</span>
                      <span className="pollutant-val">
                        {p.concentration?.value !== undefined
                          ? `${p.concentration.value.toFixed(1)} ${
                              p.concentration.units === 'MICROGRAMS_PER_CUBIC_METER'
                                ? 'µg/m³'
                                : p.concentration.units === 'PARTS_PER_BILLION'
                                  ? 'ppb'
                                  : ''
                            }`
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {generalAdvice && (
                <div className="advice-box">
                  <strong>Health Guidance:</strong> {generalAdvice}
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* Pollen Card */}
      <section data-testid="pollen-card" className="panel-card">
        <div className="card-header">
          <div className="card-title-row">
            <Flower2 className="card-icon accent-lime" size={18} />
            <h2 className="card-title">Pollen &amp; Allergens</h2>
          </div>
          <span className="api-tag">Pollen API</span>
        </div>

        {pollen.status === 'loading' && (
          <div className="loading-skeleton">Fetching pollen forecast…</div>
        )}
        {pollen.status === 'non-coverage' && (
          <div className="non-coverage-box">{pollen.message}</div>
        )}
        {pollen.status === 'error' && (
          <div className="error-box">{pollen.message}</div>
        )}
        {pollen.status === 'ok' && (() => {
          const today = pollen.data.dailyInfo?.[0];
          const types = today?.pollenTypeInfo ?? [];
          const activePlants = (today?.plantInfo ?? [])
            .filter((p) => p.inSeason || (p.indexInfo?.value ?? 0) > 0)
            .slice(0, 3);
          const advice = types.find((t) => t.healthRecommendations?.length)
            ?.healthRecommendations?.[0];

          return (
            <>
              <div className="pollen-types-grid">
                {types.map((pt) => {
                  const val = pt.indexInfo?.value ?? 0;
                  const color = toCssRgb(pt.indexInfo?.color, '#65a30d');
                  return (
                    <div key={pt.code} className="pollen-tile">
                      <div className="pollen-tile-top">
                        <span className="pollen-type-name">
                          {pt.displayName}
                        </span>
                        <span
                          className={`season-pill ${pt.inSeason ? 'in-season' : ''}`}
                        >
                          {pt.inSeason ? 'In Season' : 'Low/Off'}
                        </span>
                      </div>
                      <div className="pollen-upi-row">
                        <span className="pollen-upi-val">UPI {val}/5</span>
                        <span className="pollen-category">
                          {pt.indexInfo?.category || 'Low'}
                        </span>
                      </div>
                      <div className="upi-bar-track">
                        <div
                          className="upi-bar-fill"
                          style={{
                            width: `${Math.max(10, (val / 5) * 100)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {activePlants.length > 0 && (
                <div className="sub-section">
                  <h3 className="sub-heading">Active Plant Sources</h3>
                  <div className="plant-tags-row">
                    {activePlants.map((plant) => (
                      <span key={plant.code} className="plant-tag">
                        <Leaf size={12} /> {plant.displayName}
                        {plant.indexInfo?.category
                          ? ` (${plant.indexInfo.category})`
                          : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {advice && (
                <div className="advice-box">
                  <strong>Allergy Advice:</strong> {advice}
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* Solar Rooftop Insights Card */}
      <section data-testid="solar-card" className="panel-card">
        <div className="card-header">
          <div className="card-title-row">
            <Zap className="card-icon accent-amber" size={18} />
            <h2 className="card-title">Rooftop Solar Potential</h2>
          </div>
          <span className="api-tag">Solar API</span>
        </div>

        {solar.status === 'loading' && (
          <div className="loading-skeleton">
            Analyzing rooftop geometry &amp; solar flux…
          </div>
        )}
        {solar.status === 'non-coverage' && (
          <div data-testid="solar-non-coverage" className="non-coverage-box">
            <strong>No Building Solar Coverage:</strong> {solar.message}
          </div>
        )}
        {solar.status === 'error' && (
          <div className="error-box">{solar.message}</div>
        )}
        {solar.status === 'ok' && (() => {
          const sp = solar.data.solarPotential;
          const panelsCount = sp?.maxArrayPanelsCount ?? 0;
          const wattsPerPanel = sp?.panelCapacityWatts ?? 400;
          const maxCapacityKw = (panelsCount * wattsPerPanel) / 1000;
          const maxConfig =
            sp?.solarPanelConfigs?.[sp.solarPanelConfigs.length - 1];
          const imageryDate = solar.data.imageryDate
            ? `${solar.data.imageryDate.year}-${String(
                solar.data.imageryDate.month
              ).padStart(2, '0')}-${String(solar.data.imageryDate.day).padStart(
                2,
                '0'
              )}`
            : null;

          return (
            <>
              <div className="metric-grid-2">
                <div className="solar-kpi">
                  <span className="metric-label">Max Solar Panels</span>
                  <span className="solar-kpi-val">
                    {panelsCount.toLocaleString('en-US')}
                  </span>
                  <span className="solar-kpi-sub">
                    {maxCapacityKw.toFixed(1)} kW DC array ({wattsPerPanel}W/panel)
                  </span>
                </div>
                <div className="solar-kpi">
                  <span className="metric-label">Annual Sunshine</span>
                  <span className="solar-kpi-val">
                    {sp?.maxSunshineHoursPerYear !== undefined
                      ? `${Math.round(sp.maxSunshineHoursPerYear).toLocaleString(
                          'en-US'
                        )} hrs`
                      : '—'}
                  </span>
                  <span className="solar-kpi-sub">Peak rooftop hours / yr</span>
                </div>
                <div className="solar-kpi">
                  <span className="metric-label">Usable Roof Area</span>
                  <span className="solar-kpi-val">
                    {formatRoofArea(sp?.wholeRoofStats?.areaMeters2, units)}
                  </span>
                  <span className="solar-kpi-sub">
                    {maxConfig
                      ? `~${Math.round(maxConfig.yearlyEnergyDcKwh).toLocaleString(
                          'en-US'
                        )} kWh/yr`
                      : 'Estimated roof plane'}
                  </span>
                </div>
                <div className="solar-kpi">
                  <span className="metric-label">Grid Carbon Offset</span>
                  <span className="solar-kpi-val">
                    {sp?.carbonOffsetFactorKgPerMwh !== undefined
                      ? `${Math.round(sp.carbonOffsetFactorKgPerMwh)} kg`
                      : '—'}
                  </span>
                  <span className="solar-kpi-sub">CO₂ offset per MWh</span>
                </div>
              </div>

              <div className="solar-footer-meta">
                <span>
                  Imagery quality:{' '}
                  <strong>{solar.data.imageryQuality || 'HIGH'}</strong>
                </span>
                {imageryDate && <span>Captured: {imageryDate}</span>}
              </div>
            </>
          );
        })()}
      </section>
    </aside>
  );
}
