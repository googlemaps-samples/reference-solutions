import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  AirQualityCurrentResponse,
  AirQualityIndex,
  PollenForecastResponse,
  PollenTypeInfo,
  SelectedLocation,
  SolarInsightState,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from '../../models/environment.models';

@Component({
  selector: 'app-environmental-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar" data-testid="environmental-sidebar">
      @if (!hasApiKey) {
        <div class="setup-banner">
          <strong>API Key Required</strong>
          <p>
            Set <code>GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file to stream live
            Maps, Weather, Air Quality, Pollen, and Solar data.
          </p>
        </div>
      }

      <!-- Selected Location Card -->
      <section class="card location-card" data-testid="selected-location-card">
        <div class="card-header">
          <span class="card-eyebrow">Active Inspection Target</span>
          <span class="source-pill">{{ formatSourceLabel(location.source) }}</span>
        </div>
        <h1 class="location-title">{{ location.name }}</h1>
        <p class="location-address">{{ location.formattedAddress }}</p>
        <div class="coord-row">
          <span class="coord-chip">LAT {{ location.lat.toFixed(5) }}</span>
          <span class="coord-chip">LNG {{ location.lng.toFixed(5) }}</span>
        </div>
        <p class="instruction-note">
          Click any building on the map or search via Places Autocomplete to inspect hyperlocal
          conditions and rooftop solar capacity.
        </p>
      </section>

      <!-- Weather Card -->
      <section class="card" data-testid="weather-card">
        <div class="card-header">
          <h2 class="card-title">Current Weather</h2>
          <span class="api-tag">Weather API</span>
        </div>

        @if (weatherLoading) {
          <div class="loading-box">Fetching live meteorological conditions...</div>
        } @else if (weatherError) {
          <div class="error-box">{{ weatherError }}</div>
        } @else if (weatherCurrent) {
          <div class="weather-hero">
            <div class="weather-temp-group">
              @if (weatherCurrent.weatherCondition?.iconBaseUri) {
                <img
                  class="weather-icon"
                  [src]="weatherCurrent.weatherCondition!.iconBaseUri + '.svg'"
                  [alt]="weatherCurrent.weatherCondition?.description?.text || 'Weather icon'"
                  width="46"
                  height="46"
                />
              }
              <div>
                <div class="weather-temp">
                  {{ formatTemp(weatherCurrent.temperature?.degrees) }}
                </div>
                <div class="weather-condition">
                  {{ weatherCurrent.weatherCondition?.description?.text || 'Current Conditions' }}
                </div>
              </div>
            </div>
            <div class="weather-feels">
              Feels like {{ formatTemp(weatherCurrent.feelsLikeTemperature?.degrees) }}
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-tile">
              <span class="metric-label">Humidity</span>
              <span class="metric-value">
                {{
                  weatherCurrent.relativeHumidity !== undefined
                    ? weatherCurrent.relativeHumidity + '%'
                    : '—'
                }}
              </span>
            </div>
            <div class="metric-tile">
              <span class="metric-label">UV Index</span>
              <span class="metric-value">{{ weatherCurrent.uvIndex ?? '—' }}</span>
            </div>
            <div class="metric-tile">
              <span class="metric-label">Wind</span>
              <span class="metric-value">{{ formatWind(weatherCurrent) }}</span>
            </div>
            <div class="metric-tile">
              <span class="metric-label">Precip Chance</span>
              <span class="metric-value">
                {{
                  weatherCurrent.precipitation?.probability?.percent !== undefined
                    ? weatherCurrent.precipitation!.probability!.percent + '%'
                    : '0%'
                }}
              </span>
            </div>
          </div>

          <div class="sub-section" data-testid="weather-forecast-list">
            <div class="sub-title">5-Day Daily Forecast</div>
            @if (weatherForecast?.forecastDays?.length) {
              <div class="forecast-list">
                @for (day of weatherForecast!.forecastDays!.slice(0, 5); track $index) {
                  <div class="forecast-row">
                    <span class="forecast-day">{{ formatForecastDate(day.displayDate) }}</span>
                    <span class="forecast-cond">
                      @if (day.daytimeForecast?.weatherCondition?.iconBaseUri) {
                        <img
                          [src]="day.daytimeForecast!.weatherCondition!.iconBaseUri + '.svg'"
                          alt=""
                          width="20"
                          height="20"
                        />
                      }
                      <span>
                        {{ day.daytimeForecast?.weatherCondition?.description?.text || '—' }}
                      </span>
                    </span>
                    <span class="forecast-temps">
                      <strong>{{ formatTemp(day.maxTemperature?.degrees) }}</strong>
                      <span class="temp-low">{{ formatTemp(day.minTemperature?.degrees) }}</span>
                    </span>
                  </div>
                }
              </div>
            } @else {
              <div class="muted-note">Daily forecast unavailable for this coordinate.</div>
            }
          </div>
        } @else {
          <div class="muted-note">Select a location to load weather telemetry.</div>
        }
      </section>

      <!-- Air Quality Card -->
      <section class="card" data-testid="air-quality-card">
        <div class="card-header">
          <h2 class="card-title">Air Quality Index</h2>
          <span class="api-tag">Air Quality API</span>
        </div>

        @if (airQualityLoading) {
          <div class="loading-box">Fetching local AQI &amp; pollutants...</div>
        } @else if (airQualityError) {
          <div class="error-box">{{ airQualityError }}</div>
        } @else if (primaryAqi) {
          <div class="aqi-hero">
            <div class="aqi-badge" [style.background-color]="getAqiColorCss(primaryAqi)">
              <span class="aqi-number">{{ primaryAqi.aqiDisplay || primaryAqi.aqi }}</span>
              <span class="aqi-code">{{ primaryAqi.displayName }}</span>
            </div>
            <div class="aqi-summary">
              <div class="aqi-category">{{ primaryAqi.category || 'Air Quality' }}</div>
              <div class="aqi-dominant">
                Dominant pollutant:
                <strong>{{ (primaryAqi.dominantPollutant || 'N/A').toUpperCase() }}</strong>
              </div>
            </div>
          </div>

          @if (airQuality?.pollutants?.length) {
            <div class="pollutants-grid">
              @for (pollutant of airQuality!.pollutants!.slice(0, 6); track pollutant.code) {
                <div
                  class="pollutant-chip"
                  [title]="pollutant.additionalInfo?.sources || pollutant.fullName || pollutant.displayName"
                >
                  <span class="pollutant-name">{{ pollutant.displayName }}</span>
                  <span class="pollutant-val">
                    {{
                      pollutant.concentration
                        ? pollutant.concentration.value.toFixed(1) +
                          ' ' +
                          formatPollutantUnit(pollutant.concentration.units)
                        : '—'
                    }}
                  </span>
                </div>
              }
            </div>
          }

          @if (airQuality?.healthRecommendations?.generalPopulation) {
            <div class="health-box">
              <div class="health-label">Health Guidance</div>
              <p>{{ airQuality!.healthRecommendations!.generalPopulation }}</p>
              @if (airQuality!.healthRecommendations!.athletes) {
                <p class="health-sub">
                  <strong>Outdoor Exercise:</strong>
                  {{ airQuality!.healthRecommendations!.athletes }}
                </p>
              }
            </div>
          }
        } @else {
          <div class="muted-note">Air quality data unavailable for this coordinate.</div>
        }
      </section>

      <!-- Pollen Card -->
      <section class="card" data-testid="pollen-card">
        <div class="card-header">
          <h2 class="card-title">Pollen &amp; Allergens</h2>
          <span class="api-tag">Pollen API</span>
        </div>

        @if (pollenLoading) {
          <div class="loading-box">Fetching Tree, Grass &amp; Weed UPI forecast...</div>
        } @else if (pollenError) {
          <div class="error-box">{{ pollenError }}</div>
        } @else if (todayPollenTypes.length) {
          <div class="pollen-grid">
            @for (item of todayPollenTypes; track item.code) {
              <div class="pollen-tile">
                <div class="pollen-tile-top">
                  <span class="pollen-name">{{ item.displayName }}</span>
                  <span
                    class="season-pill"
                    [class.in-season]="item.inSeason"
                  >
                    {{ item.inSeason ? 'In Season' : 'Low Season' }}
                  </span>
                </div>
                <div class="pollen-score-row">
                  <span
                    class="pollen-dot"
                    [style.background-color]="getPollenColorCss(item)"
                  ></span>
                  <span class="pollen-category">
                    {{ item.indexInfo?.category || 'None' }}
                  </span>
                  <span class="pollen-upi">
                    UPI {{ item.indexInfo?.value ?? 0 }}/5
                  </span>
                </div>
              </div>
            }
          </div>

          @if (activePlants.length) {
            <div class="plants-row">
              <span class="sub-title">Detected Plants:</span>
              <div class="plant-chips">
                @for (plant of activePlants; track plant.code) {
                  <span class="plant-chip">
                    {{ plant.displayName }}
                    @if (plant.indexInfo?.category) {
                      · {{ plant.indexInfo!.category }}
                    }
                  </span>
                }
              </div>
            </div>
          }

          @if (primaryPollenAdvice) {
            <div class="health-box">
              <div class="health-label">Allergy Guidance</div>
              <p>{{ primaryPollenAdvice }}</p>
            </div>
          }
        } @else {
          <div class="muted-note">Pollen forecast unavailable for this location.</div>
        }
      </section>

      <!-- Solar Card -->
      <section class="card" data-testid="solar-card">
        <div class="card-header">
          <h2 class="card-title">Rooftop Solar Potential</h2>
          <span class="api-tag">Solar API</span>
        </div>

        @if (solarState.status === 'loading') {
          <div class="loading-box">Analyzing closest rooftop geometry &amp; sunlight...</div>
        } @else if (solarState.status === 'success' && solarState.data?.solarPotential) {
          <div class="solar-banner">
            <div>
              <div class="solar-kw">{{ formatArrayKw(solarState.data!) }}</div>
              <div class="solar-sub">Estimated Max Rooftop Array Capacity</div>
            </div>
            <span class="quality-pill">
              {{ solarState.data!.imageryQuality || 'HIGH' }} Imagery
            </span>
          </div>

          <div class="metrics-grid">
            <div class="metric-tile">
              <span class="metric-label">Max Solar Panels</span>
              <span class="metric-value">
                {{ solarState.data!.solarPotential!.maxArrayPanelsCount ?? '—' }} panels
              </span>
            </div>
            <div class="metric-tile">
              <span class="metric-label">Sunshine / Year</span>
              <span class="metric-value">
                {{
                  solarState.data!.solarPotential!.maxSunshineHoursPerYear !== undefined
                    ? Math.round(solarState.data!.solarPotential!.maxSunshineHoursPerYear!) + ' hrs'
                    : '—'
                }}
              </span>
            </div>
            <div class="metric-tile">
              <span class="metric-label">Usable Roof Area</span>
              <span class="metric-value">
                {{ formatRoofArea(solarState.data!.solarPotential!.wholeRoofStats?.areaMeters2) }}
              </span>
            </div>
            <div class="metric-tile">
              <span class="metric-label">CO₂ Offset Factor</span>
              <span class="metric-value">
                {{
                  solarState.data!.solarPotential!.carbonOffsetFactorKgPerMwh !== undefined
                    ? Math.round(solarState.data!.solarPotential!.carbonOffsetFactorKgPerMwh!) +
                      ' kg/MWh'
                    : '—'
                }}
              </span>
            </div>
          </div>
        } @else if (solarState.status === 'non-coverage') {
          <div class="non-coverage-box" data-testid="solar-non-coverage">
            <strong>No Building Solar Coverage at Pin</strong>
            <p>{{ solarState.message }}</p>
            <p class="non-coverage-hint">
              Try clicking directly on a building rooftop in Satellite mode.
            </p>
          </div>
        } @else if (solarState.status === 'error') {
          <div class="error-box" data-testid="solar-non-coverage">
            {{ solarState.message }}
          </div>
        } @else {
          <div class="muted-note">Click a building on the map to inspect rooftop solar potential.</div>
        }
      </section>
    </aside>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 0 0 420px;
        width: 420px;
        height: 100%;
        min-height: 0;
      }

      .sidebar {
        width: 420px;
        min-width: 360px;
        height: 100%;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f1f5f9;
        border-right: 1px solid #e2e8f0;
      }

      .setup-banner {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        color: #92400e;
        border-radius: 10px;
        padding: 12px;
        font-size: 12.5px;
      }

      .setup-banner p {
        margin: 6px 0 0;
        line-height: 1.45;
      }

      .card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .card-eyebrow {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #0284c7;
      }

      .card-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }

      .api-tag,
      .source-pill {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        padding: 2px 8px;
      }

      .location-title {
        margin: 0 0 4px;
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
      }

      .location-address {
        margin: 0 0 8px;
        font-size: 13px;
        color: #475569;
        line-height: 1.4;
      }

      .coord-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .coord-chip {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 3px 7px;
        color: #334155;
      }

      .instruction-note {
        margin: 0;
        font-size: 12px;
        color: #64748b;
        line-height: 1.4;
      }

      .weather-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .weather-temp-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .weather-icon {
        flex-shrink: 0;
      }

      .weather-temp {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }

      .weather-condition {
        font-size: 13px;
        font-weight: 500;
        color: #475569;
      }

      .weather-feels {
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 4px 8px;
        border-radius: 8px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .metric-tile {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .metric-label {
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
      }

      .metric-value {
        font-size: 13.5px;
        font-weight: 700;
        color: #0f172a;
      }

      .sub-section {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid #f1f5f9;
      }

      .sub-title {
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        margin-bottom: 8px;
      }

      .forecast-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .forecast-row {
        display: grid;
        grid-template-columns: 64px 1fr auto;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        padding: 5px 8px;
        border-radius: 7px;
        background: #f8fafc;
      }

      .forecast-day {
        font-weight: 600;
        color: #0f172a;
      }

      .forecast-cond {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #475569;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .forecast-temps {
        display: flex;
        gap: 6px;
        font-variant-numeric: tabular-nums;
      }

      .temp-low {
        color: #64748b;
      }

      .aqi-hero {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .aqi-badge {
        min-width: 74px;
        padding: 8px 10px;
        border-radius: 10px;
        color: #0f172a;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.1);
      }

      .aqi-number {
        font-size: 22px;
        font-weight: 800;
        line-height: 1.05;
      }

      .aqi-code {
        font-size: 10px;
        font-weight: 700;
        opacity: 0.9;
      }

      .aqi-category {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }

      .aqi-dominant {
        font-size: 12.5px;
        color: #475569;
        margin-top: 2px;
      }

      .pollutants-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 10px;
      }

      .pollutant-chip {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .pollutant-name {
        font-size: 11px;
        font-weight: 700;
        color: #334155;
      }

      .pollutant-val {
        font-size: 11.5px;
        color: #64748b;
      }

      .health-box {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        padding: 9px 10px;
        font-size: 12px;
        color: #0c4a6e;
        line-height: 1.45;
      }

      .health-box p {
        margin: 3px 0 0;
      }

      .health-label {
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .health-sub {
        margin-top: 6px !important;
      }

      .pollen-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 10px;
      }

      .pollen-tile {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 10px;
      }

      .pollen-tile-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .pollen-name {
        font-size: 13px;
        font-weight: 700;
      }

      .season-pill {
        font-size: 10.5px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
      }

      .season-pill.in-season {
        background: #dcfce7;
        color: #166534;
      }

      .pollen-score-row {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12.5px;
      }

      .pollen-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
      }

      .pollen-category {
        font-weight: 600;
        color: #1e293b;
      }

      .pollen-upi {
        margin-left: auto;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11.5px;
        color: #64748b;
      }

      .plants-row {
        margin-bottom: 10px;
      }

      .plant-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .plant-chip {
        font-size: 11px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        padding: 2px 8px;
        color: #334155;
      }

      .solar-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: 1px solid #f59e0b;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 10px;
      }

      .solar-kw {
        font-size: 22px;
        font-weight: 800;
        color: #78350f;
      }

      .solar-sub {
        font-size: 11.5px;
        font-weight: 600;
        color: #92400e;
      }

      .quality-pill {
        font-size: 11px;
        font-weight: 700;
        background: #ffffff;
        color: #92400e;
        padding: 3px 8px;
        border-radius: 999px;
      }

      .non-coverage-box {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 9px;
        padding: 11px;
        font-size: 12.5px;
        color: #334155;
      }

      .non-coverage-box p {
        margin: 5px 0 0;
        color: #64748b;
      }

      .non-coverage-hint {
        font-size: 11.5px;
      }

      .loading-box,
      .muted-note {
        font-size: 12.5px;
        color: #64748b;
        padding: 8px 0;
      }

      .error-box {
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #9f1239;
        border-radius: 8px;
        padding: 9px 10px;
        font-size: 12.5px;
      }

      @media (max-width: 960px) {
        :host {
          flex: none;
          width: 100%;
          height: auto;
        }

        .sidebar {
          width: 100%;
          min-width: 0;
          height: auto;
          overflow-y: visible;
          border-right: none;
          border-bottom: 1px solid #e2e8f0;
        }
      }
    `,
  ],
})
export class EnvironmentalSidebarComponent {
  protected readonly Math = Math;

  @Input({ required: true }) hasApiKey!: boolean;
  @Input({ required: true }) location!: SelectedLocation;
  @Input({ required: true }) unitsSystem!: UnitsSystem;

  @Input() weatherLoading = false;
  @Input() weatherError = '';
  @Input() weatherCurrent: WeatherCurrentResponse | null = null;
  @Input() weatherForecast: WeatherForecastResponse | null = null;

  @Input() airQualityLoading = false;
  @Input() airQualityError = '';
  @Input() airQuality: AirQualityCurrentResponse | null = null;

  @Input() pollenLoading = false;
  @Input() pollenError = '';
  @Input() pollenForecast: PollenForecastResponse | null = null;

  @Input() solarState: SolarInsightState = { status: 'idle' };

  get primaryAqi(): AirQualityIndex | null {
    const indexes = this.airQuality?.indexes;
    if (!indexes || !indexes.length) {
      return null;
    }
    return indexes.find((idx) => idx.code === 'usa_epa') ?? indexes[0];
  }

  get todayPollenTypes(): PollenTypeInfo[] {
    return this.pollenForecast?.dailyInfo?.[0]?.pollenTypeInfo ?? [];
  }

  get activePlants() {
    const plants = this.pollenForecast?.dailyInfo?.[0]?.plantInfo ?? [];
    return plants.filter((p) => p.inSeason || (p.indexInfo?.value ?? 0) > 0).slice(0, 6);
  }

  get primaryPollenAdvice(): string {
    for (const t of this.todayPollenTypes) {
      if (t.healthRecommendations?.length) {
        return t.healthRecommendations[0];
      }
    }
    return '';
  }

  formatSourceLabel(source: SelectedLocation['source']): string {
    if (source === 'autocomplete') return 'Places Search';
    if (source === 'map-click') return 'Map Building Click';
    return 'Phoenix Seed';
  }

  formatTemp(degrees: number | undefined): string {
    if (degrees === undefined || Number.isNaN(degrees)) {
      return '—';
    }
    const unit = this.unitsSystem === 'IMPERIAL' ? '°F' : '°C';
    return `${Math.round(degrees)}${unit}`;
  }

  formatWind(weather: WeatherCurrentResponse): string {
    const speed = weather.wind?.speed?.value;
    if (speed === undefined) {
      return '—';
    }
    const unit = this.unitsSystem === 'IMPERIAL' ? 'mph' : 'km/h';
    const cardinal = weather.wind?.direction?.cardinal ?? '';
    return `${Math.round(speed)} ${unit} ${cardinal}`.trim();
  }

  formatForecastDate(date?: { year: number; month: number; day: number }): string {
    if (!date) {
      return '—';
    }
    const d = new Date(date.year, date.month - 1, date.day);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  }

  getAqiColorCss(index: AirQualityIndex): string {
    const c = index.color;
    if (!c) {
      return '#a7f3d0';
    }
    const scale = (v?: number) => {
      if (v === undefined) return 0;
      return v <= 1 ? Math.round(v * 255) : Math.round(v);
    };
    return `rgb(${scale(c.red)}, ${scale(c.green)}, ${scale(c.blue)})`;
  }

  formatPollutantUnit(unit: string): string {
    if (unit === 'PARTS_PER_BILLION') return 'ppb';
    if (unit === 'MICROGRAMS_PER_CUBIC_METER') return 'µg/m³';
    return unit.toLowerCase();
  }

  getPollenColorCss(info: PollenTypeInfo): string {
    const c = info.indexInfo?.color;
    if (!c) {
      return '#10b981';
    }
    const scale = (v?: number) => {
      if (v === undefined) return 0;
      return v <= 1 ? Math.round(v * 255) : Math.round(v);
    };
    return `rgb(${scale(c.red)}, ${scale(c.green)}, ${scale(c.blue)})`;
  }

  formatArrayKw(data: NonNullable<SolarInsightState['data']>): string {
    const count = data.solarPotential?.maxArrayPanelsCount;
    const watts = data.solarPotential?.panelCapacityWatts ?? 400;
    if (count === undefined) {
      return '—';
    }
    const kw = (count * watts) / 1000;
    return `${kw.toFixed(1)} kW`;
  }

  formatRoofArea(areaMeters2?: number): string {
    if (areaMeters2 === undefined) {
      return '—';
    }
    if (this.unitsSystem === 'IMPERIAL') {
      const sqFt = Math.round(areaMeters2 * 10.7639);
      return `${sqFt.toLocaleString()} ft²`;
    }
    return `${Math.round(areaMeters2).toLocaleString()} m²`;
  }
}
