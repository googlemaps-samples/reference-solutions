import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  AirQualityCurrentResponse,
  PlacesSearchTextResponse,
  PollenForecastResponse,
  SolarBuildingInsightsResponse,
  SolarInsightState,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from '../models/environment.models';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentalApiService {
  private readonly http = inject(HttpClient);

  getCurrentWeather(
    lat: number,
    lng: number,
    unitsSystem: UnitsSystem,
  ): Observable<WeatherCurrentResponse> {
    return this.http.get<WeatherCurrentResponse>('/api/weather/current', {
      params: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        unitsSystem,
      },
    });
  }

  getDailyWeatherForecast(
    lat: number,
    lng: number,
    unitsSystem: UnitsSystem,
    days = 5,
  ): Observable<WeatherForecastResponse> {
    return this.http.get<WeatherForecastResponse>('/api/weather/forecast', {
      params: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        unitsSystem,
        days: String(days),
      },
    });
  }

  getCurrentAirQuality(lat: number, lng: number): Observable<AirQualityCurrentResponse> {
    return this.http.post<AirQualityCurrentResponse>('/api/air-quality/current', {
      lat,
      lng,
      languageCode: 'en',
    });
  }

  getPollenForecast(lat: number, lng: number, days = 5): Observable<PollenForecastResponse> {
    return this.http.get<PollenForecastResponse>('/api/pollen/forecast', {
      params: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        days: String(days),
      },
    });
  }

  getSolarBuildingInsights(lat: number, lng: number): Observable<SolarInsightState> {
    return this.http
      .get<SolarBuildingInsightsResponse>('/api/solar/building-insights', {
        params: {
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          requiredQuality: 'BASE',
        },
      })
      .pipe(
        map((data): SolarInsightState => {
          if (data?.nonCoverage) {
            return {
              status: 'non-coverage',
              message:
                data.message ||
                'No building rooftop solar insights found within 50m of these coordinates.',
            };
          }
          return { status: 'success', data };
        }),
        catchError((err: HttpErrorResponse): Observable<SolarInsightState> => {
          if (err.status === 404 || err.error?.nonCoverage) {
            return of({
              status: 'non-coverage',
              message:
                err.error?.message ||
                'No building rooftop solar insights found within 50m of these coordinates.',
            });
          }
          return of({
            status: 'error',
            message:
              err.error?.error?.message ||
              err.error?.error ||
              'Unable to load Solar API building insights.',
          });
        }),
      );
  }

  searchSeedPlace(textQuery: string): Observable<PlacesSearchTextResponse> {
    return this.http.post<PlacesSearchTextResponse>('/api/places/search-text', {
      textQuery,
      languageCode: 'en',
    });
  }
}
