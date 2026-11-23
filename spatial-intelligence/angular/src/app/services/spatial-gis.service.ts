import { Injectable, inject } from '@angular/core';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import type { Color, LayersList } from '@deck.gl/core';
import { MapsLoaderService } from './maps-loader.service';
import {
  CivicHubPlace,
  DeckGlLayerMode,
  ElevationProfileSummary,
  ElevationSamplePoint,
  SensorPoint,
} from '../models/gis.models';
import { isPointInPolygon, isWebGL2Available } from '../utils/spatial-math';

@Injectable({
  providedIn: 'root',
})
export class SpatialGisService {
  private readonly mapsLoader = inject(MapsLoaderService);

  async fetchCivicReferenceHubs(
    textQuery = 'New York City civic transit hub'
  ): Promise<{ places: CivicHubPlace[]; error: string | null }> {
    try {
      const { places: placesLib } = await this.mapsLoader.loadLibraries();
      const { Place } = placesLib;
      const response = await Place.searchByText({
        textQuery,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
        locationBias: { lat: 40.73061, lng: -73.98661 },
        language: 'en',
        region: 'us',
        maxResultCount: 6,
      });

      const hubs: CivicHubPlace[] = [];
      for (const place of response.places ?? []) {
        if (!place.location) continue;
        hubs.push({
          id: place.id,
          displayName: place.displayName ?? 'NYC Civic Hub',
          formattedAddress: place.formattedAddress ?? 'New York, NY',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
          types: (place.types ?? []).slice(0, 3),
        });
      }

      return { places: hubs, error: null };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load live civic hubs from Places API (New).';
      return { places: [], error: message };
    }
  }

  async sampleTerrainElevation(
    locations: google.maps.LatLngLiteral[],
    sourceLabel: string
  ): Promise<{ summary: ElevationProfileSummary | null; error: string | null }> {
    if (locations.length === 0) {
      return { summary: null, error: 'No sample coordinates available.' };
    }

    try {
      const { elevation } = await this.mapsLoader.loadLibraries();
      const elevator = new elevation.ElevationService();
      const response = await elevator.getElevationForLocations({
        locations: locations.slice(0, 24),
      });

      const results = response?.results ?? [];
      if (results.length === 0) {
        return { summary: null, error: 'Elevation API returned no samples.' };
      }

      const samples: ElevationSamplePoint[] = results.map((item) => ({
        lat: item.location ? item.location.lat() : 40.73061,
        lng: item.location ? item.location.lng() : -73.98661,
        elevation: Math.round(item.elevation * 100) / 100,
        resolution: Math.round((item.resolution ?? 0) * 10) / 10,
      }));

      const elevations = samples.map((s) => s.elevation);
      const minM = Math.round(Math.min(...elevations) * 100) / 100;
      const maxM = Math.round(Math.max(...elevations) * 100) / 100;
      const meanM =
        Math.round(
          (elevations.reduce((sum, v) => sum + v, 0) / elevations.length) * 100
        ) / 100;
      const resolutionM =
        Math.round(
          (samples.reduce((sum, s) => sum + s.resolution, 0) / samples.length) * 10
        ) / 10;

      return {
        summary: {
          minM,
          meanM,
          maxM,
          resolutionM,
          sampleCount: samples.length,
          sourceLabel,
          samples,
        },
        error: null,
      };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Elevation API unavailable for the current API key.';
      return { summary: null, error: message };
    }
  }

  createDeckOverlay(
    map: google.maps.Map,
    onWebGlError: (reason: string) => void
  ): GoogleMapsOverlay | null {
    if (!isWebGL2Available()) {
      onWebGlError(
        'WebGL2 context unavailable in this browser/headless environment; analytical overlays disabled cleanly.'
      );
      return null;
    }

    try {
      const overlay = new GoogleMapsOverlay({
        interleaved: false,
        layers: [],
        onError: (error: Error) => {
          onWebGlError(error.message || 'WebGL layer rendering unavailable.');
        },
      });
      overlay.setMap(map);
      return overlay;
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Unable to initialize deck.gl WebGL overlay.';
      onWebGlError(reason);
      return null;
    }
  }

  buildDeckLayers(
    mode: DeckGlLayerMode,
    allSensors: SensorPoint[],
    activeRing: [number, number][] | null
  ): LayersList {
    const filtered = activeRing
      ? allSensors.filter((s) => isPointInPolygon(s.lng, s.lat, activeRing))
      : allSensors;

    if (mode === 'hexagon') {
      const data = filtered.length > 0 ? filtered : allSensors;
      return [
        new HexagonLayer<SensorPoint>({
          id: 'nyc-sensor-hexagon-layer',
          data,
          getPosition: (d) => d.position,
          getColorWeight: (d) => d.loadPct,
          getElevationWeight: (d) => d.capacityKw,
          radius: 260,
          coverage: 0.85,
          elevationScale: 4,
          extruded: false,
          pickable: true,
          opacity: 0.72,
          colorRange: [
            [16, 185, 129],
            [56, 189, 248],
            [245, 158, 11],
            [249, 115, 22],
            [244, 63, 94],
          ],
        }),
      ];
    }

    return [
      new ScatterplotLayer<SensorPoint>({
        id: 'nyc-sensor-scatterplot-layer',
        data: allSensors,
        getPosition: (d) => d.position,
        getRadius: (d) => (d.status === 'critical' ? 58 : 42),
        radiusUnits: 'meters',
        radiusMinPixels: 2.5,
        radiusMaxPixels: 9,
        stroked: true,
        lineWidthMinPixels: 1,
        getLineColor: [15, 23, 42, 180],
        getFillColor: (d): Color => {
          const inside = activeRing ? isPointInPolygon(d.lng, d.lat, activeRing) : true;
          const alpha = inside ? 225 : 40;
          if (d.status === 'critical') return [244, 63, 94, alpha];
          if (d.status === 'elevated') return [245, 158, 11, alpha];
          return [56, 189, 248, alpha];
        },
        updateTriggers: {
          getFillColor: [
            activeRing ? activeRing.map((pt) => `${pt[0].toFixed(5)},${pt[1].toFixed(5)}`).join('|') : 'all',
          ],
        },
        pickable: true,
      }),
    ];
  }
}
