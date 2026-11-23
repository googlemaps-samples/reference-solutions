import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, MapAdvancedMarker, MapRectangle } from '@angular/google-maps';
import { importLibrary } from '@googlemaps/js-api-loader';
import {
  BaseMapType,
  SelectedLocation,
  SolarBuildingInsightsResponse,
} from '../../models/environment.models';
import { MapsLoaderService } from '../../services/maps-loader.service';

@Component({
  selector: 'app-environmental-map',
  standalone: true,
  imports: [CommonModule, GoogleMap, MapAdvancedMarker, MapRectangle],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="map-stage" data-testid="map-container">
      @if (mapsReady) {
        <google-map
          #googleMapComp
          [height]="'100%'"
          [width]="'100%'"
          [center]="mapCenter"
          [zoom]="zoom"
          [mapId]="'DEMO_MAP_ID'"
          [mapTypeId]="googleMapTypeId"
          [options]="mapOptions"
          (mapInitialized)="onMapInitialized($event)"
          (mapClick)="onMapClick($event)"
        >
          <map-advanced-marker
            [position]="markerPosition"
            [title]="location.name"
            [content]="pinElement"
          />

          @if (solarBoundingBox) {
            <map-rectangle [bounds]="solarBoundingBox" [options]="solarRectangleOptions" />
          }
        </google-map>

        <div class="map-overlay-hint">
          Click any building rooftop to inspect environmental &amp; solar telemetry
        </div>

        @if (showAqiLayer) {
          <div class="aqi-legend">
            <span class="legend-title">US AQI Overlay</span>
            <div class="legend-scale">
              <span class="swatch swatch-good">Good</span>
              <span class="swatch swatch-mod">Mod</span>
              <span class="swatch swatch-usg">USG</span>
              <span class="swatch swatch-unhealthy">High</span>
            </div>
          </div>
        }
      } @else {
        <div class="map-placeholder">
          <div class="placeholder-card">
            <h2>Google Map Canvas Ready</h2>
            <p>
              Provide a valid <code>GOOGLE_MAPS_API_KEY</code> in <code>.env</code> and restart the
              server to render the interactive 2D vector map, AdvancedMarkerElement, and US AQI
              tile overlay.
            </p>
            <div class="placeholder-coords">
              Target: {{ location.name }} ({{ location.lat.toFixed(4) }},
              {{ location.lng.toFixed(4) }})
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1 1 0%;
        min-width: 320px;
        min-height: 540px;
        width: 100%;
        height: 100%;
      }

      .map-stage {
        position: relative;
        flex: 1 1 auto;
        width: 100%;
        height: 100%;
        min-height: 540px;
        background: #e2e8f0;
      }

      google-map {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 540px;
      }

      .map-overlay-hint {
        position: absolute;
        bottom: 18px;
        left: 16px;
        background: rgba(15, 23, 42, 0.88);
        color: #f8fafc;
        font-size: 12px;
        font-weight: 500;
        padding: 7px 12px;
        border-radius: 999px;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
      }

      .aqi-legend {
        position: absolute;
        top: 14px;
        right: 14px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 8px 10px;
        box-shadow: 0 2px 10px rgba(15, 23, 42, 0.14);
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .legend-title {
        font-size: 11px;
        font-weight: 700;
        color: #0f172a;
      }

      .legend-scale {
        display: flex;
        gap: 4px;
      }

      .swatch {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        color: #0f172a;
      }

      .swatch-good {
        background: #4ade80;
      }
      .swatch-mod {
        background: #facc15;
      }
      .swatch-usg {
        background: #fb923c;
      }
      .swatch-unhealthy {
        background: #f87171;
        color: #ffffff;
      }

      .map-placeholder {
        width: 100%;
        height: 100%;
        min-height: 540px;
        display: grid;
        place-items: center;
        padding: 24px;
        background: radial-gradient(circle at top right, #dbeafe, #e2e8f0);
      }

      .placeholder-card {
        max-width: 440px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }

      .placeholder-card h2 {
        margin: 0 0 8px;
        font-size: 17px;
        color: #0f172a;
      }

      .placeholder-card p {
        margin: 0 0 12px;
        font-size: 13px;
        line-height: 1.5;
        color: #475569;
      }

      .placeholder-coords {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: #0284c7;
        background: #f0f9ff;
        padding: 8px 10px;
        border-radius: 8px;
      }

      @media (max-width: 960px) {
        :host {
          flex: 1 0 auto;
          min-width: 0;
          width: 100%;
          height: 540px;
          min-height: 540px;
        }
      }
    `,
  ],
})
export class EnvironmentalMapComponent implements OnChanges {
  private readonly mapsLoader = inject(MapsLoaderService);

  @Input({ required: true }) mapsReady!: boolean;
  @Input({ required: true }) location!: SelectedLocation;
  @Input({ required: true }) mapType!: BaseMapType;
  @Input({ required: true }) showAqiLayer!: boolean;
  @Input() solarData: SolarBuildingInsightsResponse | null = null;

  @Output() locationClicked = new EventEmitter<SelectedLocation>();

  mapCenter: google.maps.LatLngLiteral = { lat: 33.4484, lng: -112.074 };
  markerPosition: google.maps.LatLngLiteral = { lat: 33.4484, lng: -112.074 };
  zoom = 16;

  mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    gestureHandling: 'greedy',
  };

  solarRectangleOptions: google.maps.RectangleOptions = {
    strokeColor: '#f59e0b',
    strokeOpacity: 0.95,
    strokeWeight: 2,
    fillColor: '#fbbf24',
    fillOpacity: 0.22,
    clickable: false,
  };

  pinElement: google.maps.marker.PinElement | null = null;
  private nativeMap: google.maps.Map | null = null;
  private aqiOverlay: google.maps.ImageMapType | null = null;

  get googleMapTypeId(): google.maps.MapTypeId {
    return this.mapType as google.maps.MapTypeId;
  }

  get solarBoundingBox(): google.maps.LatLngBoundsLiteral | null {
    const box = this.solarData?.boundingBox;
    if (!box?.sw || !box?.ne) {
      return null;
    }
    return {
      south: box.sw.latitude,
      west: box.sw.longitude,
      north: box.ne.latitude,
      east: box.ne.longitude,
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['location'] && this.location) {
      const next = { lat: this.location.lat, lng: this.location.lng };
      this.mapCenter = next;
      this.markerPosition = next;
      if (this.nativeMap) {
        this.nativeMap.panTo(next);
      }
    }

    if (changes['mapsReady'] && this.mapsReady && !this.pinElement) {
      this.createPinElement();
    }

    if (changes['showAqiLayer'] && this.nativeMap) {
      this.syncAqiOverlay();
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.nativeMap = map;
    this.syncAqiOverlay();
  }

  async onMapClick(event: google.maps.MapMouseEvent | google.maps.IconMouseEvent): Promise<void> {
    const latLng = event.latLng;
    if (!latLng) {
      return;
    }
    const lat = latLng.lat();
    const lng = latLng.lng();

    const resolved = await this.mapsLoader.reverseGeocode(lat, lng);
    this.locationClicked.emit({
      name: resolved.name,
      formattedAddress: resolved.formattedAddress,
      lat,
      lng,
      placeId: resolved.placeId,
      source: 'map-click',
    });
  }

  private createPinElement(): void {
    try {
      const PinCtor = google.maps?.marker?.PinElement;
      if (PinCtor) {
        this.pinElement = new PinCtor({
          background: '#0284c7',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          glyphText: '★',
          scale: 1.1,
        });
        return;
      }
      void importLibrary('marker').then(({ PinElement }) => {
        this.pinElement = new PinElement({
          background: '#0284c7',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          glyphText: '★',
          scale: 1.1,
        });
      });
    } catch (err) {
      console.error('Failed to create PinElement:', err);
    }
  }

  private syncAqiOverlay(): void {
    if (!this.nativeMap || typeof google === 'undefined') {
      return;
    }

    const overlays = this.nativeMap.overlayMapTypes;
    if (this.aqiOverlay) {
      for (let i = overlays.getLength() - 1; i >= 0; i -= 1) {
        if (overlays.getAt(i) === this.aqiOverlay) {
          overlays.removeAt(i);
        }
      }
    }

    if (this.showAqiLayer) {
      if (!this.aqiOverlay) {
        this.aqiOverlay = new google.maps.ImageMapType({
          name: 'US AQI Heatmap',
          tileSize: new google.maps.Size(256, 256),
          minZoom: 0,
          maxZoom: 16,
          opacity: 0.65,
          getTileUrl: (coord, zoom) => {
            if (!coord || zoom < 0 || zoom > 16) {
              return '';
            }
            const maxTile = 1 << zoom;
            if (coord.y < 0 || coord.y >= maxTile) {
              return '';
            }
            const wrappedX = ((coord.x % maxTile) + maxTile) % maxTile;
            return `/api/air-quality/tiles?mapType=US_AQI&z=${zoom}&x=${wrappedX}&y=${coord.y}`;
          },
        });
      }
      overlays.insertAt(0, this.aqiOverlay);
    }
  }
}
