import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { EnvironmentalMapComponent } from './components/environmental-map/environmental-map.component';
import { EnvironmentalSidebarComponent } from './components/environmental-sidebar/environmental-sidebar.component';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import {
  AirQualityCurrentResponse,
  BaseMapType,
  PollenForecastResponse,
  SelectedLocation,
  SolarInsightState,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from './models/environment.models';
import { EnvironmentalApiService } from './services/environmental-api.service';
import { MapsLoaderService } from './services/maps-loader.service';

const SEED_QUERY = 'Phoenix City Hall, Phoenix, AZ';
const SEED_FALLBACK_LOCATION: SelectedLocation = {
  name: 'Phoenix City Hall',
  formattedAddress: '33.44840, -112.07400',
  lat: 33.4484,
  lng: -112.074,
  source: 'seed',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderBarComponent,
    EnvironmentalSidebarComponent,
    EnvironmentalMapComponent,
  ],
  template: `
    <div class="app-shell">
      <app-header-bar
        [activeLocation]="activeLocation"
        [unitsSystem]="unitsSystem"
        [showAqiLayer]="showAqiLayer"
        [mapType]="mapType"
        [mapsReady]="mapsReady"
        (placeSelected)="selectLocation($event)"
        (resetPhoenix)="resetToPhoenix()"
        (toggleUnits)="onToggleUnits()"
        (toggleAqiLayer)="onToggleAqiLayer()"
        (toggleMapType)="onToggleMapType()"
      />

      <main class="workspace">
        <app-environmental-sidebar
          [hasApiKey]="hasApiKey"
          [location]="activeLocation"
          [unitsSystem]="unitsSystem"
          [weatherLoading]="weatherLoading"
          [weatherError]="weatherError"
          [weatherCurrent]="weatherCurrent"
          [weatherForecast]="weatherForecast"
          [airQualityLoading]="airQualityLoading"
          [airQualityError]="airQualityError"
          [airQuality]="airQuality"
          [pollenLoading]="pollenLoading"
          [pollenError]="pollenError"
          [pollenForecast]="pollenForecast"
          [solarState]="solarState"
        />

        <app-environmental-map
          [mapsReady]="mapsReady"
          [location]="activeLocation"
          [mapType]="mapType"
          [showAqiLayer]="showAqiLayer"
          [solarData]="solarState.status === 'success' ? (solarState.data ?? null) : null"
          (locationClicked)="selectLocation($event)"
        />
      </main>
    </div>
  `,
  styles: [
    `
      .app-shell {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
        overflow: hidden;
      }

      .workspace {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        height: calc(100vh - 64px);
      }

      @media (max-width: 960px) {
        .app-shell {
          height: auto;
          min-height: 100vh;
          overflow: visible;
        }

        .workspace {
          flex-direction: column-reverse;
          height: auto;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly mapsLoader = inject(MapsLoaderService);
  private readonly envApi = inject(EnvironmentalApiService);

  private readonly destroy$ = new Subject<void>();
  private readonly cancelRequests$ = new Subject<void>();
  private readonly cancelWeather$ = new Subject<void>();

  hasApiKey = this.mapsLoader.hasApiKey();
  mapsReady = false;

  activeLocation: SelectedLocation = { ...SEED_FALLBACK_LOCATION };
  unitsSystem: UnitsSystem = 'IMPERIAL';
  showAqiLayer = false;
  mapType: BaseMapType = 'roadmap';

  weatherLoading = false;
  weatherError = '';
  weatherCurrent: WeatherCurrentResponse | null = null;
  weatherForecast: WeatherForecastResponse | null = null;

  airQualityLoading = false;
  airQualityError = '';
  airQuality: AirQualityCurrentResponse | null = null;

  pollenLoading = false;
  pollenError = '';
  pollenForecast: PollenForecastResponse | null = null;

  solarState: SolarInsightState = { status: 'idle' };

  ngOnInit(): void {
    this.hasApiKey = this.mapsLoader.hasApiKey();

    void this.mapsLoader.loadMapsLibraries().then((ready) => {
      this.mapsReady = ready;
    });

    if (this.hasApiKey) {
      this.seedPhoenixLocation();
    }
  }

  ngOnDestroy(): void {
    this.cancelRequests$.next();
    this.cancelRequests$.complete();
    this.cancelWeather$.next();
    this.cancelWeather$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  resetToPhoenix(): void {
    if (this.hasApiKey) {
      this.seedPhoenixLocation();
    } else {
      this.activeLocation = { ...SEED_FALLBACK_LOCATION };
    }
  }

  selectLocation(location: SelectedLocation): void {
    this.activeLocation = location;
    if (this.hasApiKey) {
      this.fetchAllEnvironmentalData(location.lat, location.lng);
    }
  }

  onToggleUnits(): void {
    this.unitsSystem = this.unitsSystem === 'IMPERIAL' ? 'METRIC' : 'IMPERIAL';
    if (this.hasApiKey) {
      this.fetchWeatherData(this.activeLocation.lat, this.activeLocation.lng);
    }
  }

  onToggleAqiLayer(): void {
    this.showAqiLayer = !this.showAqiLayer;
  }

  onToggleMapType(): void {
    this.mapType = this.mapType === 'roadmap' ? 'hybrid' : 'roadmap';
  }

  private seedPhoenixLocation(): void {
    this.envApi
      .searchSeedPlace(SEED_QUERY)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const place = res.places?.[0];
          if (place?.location) {
            this.selectLocation({
              name: place.displayName?.text || 'Phoenix City Hall',
              formattedAddress:
                place.formattedAddress ||
                `${place.location.latitude.toFixed(5)}, ${place.location.longitude.toFixed(5)}`,
              lat: place.location.latitude,
              lng: place.location.longitude,
              placeId: place.id,
              source: 'seed',
            });
          } else {
            this.selectLocation({ ...SEED_FALLBACK_LOCATION });
          }
        },
        error: () => {
          this.selectLocation({ ...SEED_FALLBACK_LOCATION });
        },
      });
  }

  private fetchAllEnvironmentalData(lat: number, lng: number): void {
    this.cancelRequests$.next();
    this.fetchWeatherData(lat, lng);

    this.airQualityLoading = true;
    this.airQualityError = '';
    this.envApi
      .getCurrentAirQuality(lat, lng)
      .pipe(takeUntil(this.cancelRequests$), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.airQuality = res;
          this.airQualityLoading = false;
        },
        error: (err) => {
          this.airQualityLoading = false;
          this.airQualityError =
            err?.error?.error?.message ||
            err?.error?.error ||
            'Unable to retrieve Air Quality data.';
        },
      });

    this.pollenLoading = true;
    this.pollenError = '';
    this.envApi
      .getPollenForecast(lat, lng, 5)
      .pipe(takeUntil(this.cancelRequests$), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.pollenForecast = res;
          this.pollenLoading = false;
        },
        error: (err) => {
          this.pollenLoading = false;
          this.pollenError =
            err?.error?.error?.message ||
            err?.error?.error ||
            'Unable to retrieve Pollen forecast.';
        },
      });

    this.solarState = { status: 'loading' };
    this.envApi
      .getSolarBuildingInsights(lat, lng)
      .pipe(takeUntil(this.cancelRequests$), takeUntil(this.destroy$))
      .subscribe((state) => {
        this.solarState = state;
      });
  }

  private fetchWeatherData(lat: number, lng: number): void {
    this.cancelWeather$.next();
    this.weatherLoading = true;
    this.weatherError = '';

    this.envApi
      .getCurrentWeather(lat, lng, this.unitsSystem)
      .pipe(takeUntil(this.cancelWeather$), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.weatherCurrent = res;
          this.weatherLoading = false;
        },
        error: (err) => {
          this.weatherLoading = false;
          this.weatherError =
            err?.error?.error?.message ||
            err?.error?.error ||
            'Unable to retrieve current Weather conditions.';
        },
      });

    this.envApi
      .getDailyWeatherForecast(lat, lng, this.unitsSystem, 5)
      .pipe(takeUntil(this.cancelWeather$), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.weatherForecast = res;
        },
        error: () => {
          this.weatherForecast = null;
        },
      });
  }
}
