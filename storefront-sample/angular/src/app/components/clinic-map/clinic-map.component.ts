import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapCircle,
  MapInfoWindow,
  MapPolyline,
} from '@angular/google-maps';
import {
  CLINIC_DEFAULT_CENTER,
  CLINIC_DEFAULT_ZOOM,
  ClinicDetails,
  GMP_ATTRIBUTION_ID,
  HOME_VISIT_RADIUS_METERS,
  OriginSelection,
  RouteSummary,
  StreetViewEntranceData,
  ViewMode,
} from '../../models/storefront.models';

@Component({
  selector: 'app-clinic-map',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMap,
    MapAdvancedMarker,
    MapCircle,
    MapPolyline,
    MapInfoWindow,
  ],
  template: `
    <div class="viewport-stack" [attr.data-view-mode]="viewMode()">
      @if (!mapsReady()) {
        <div class="map-placeholder" data-testid="map-container">
          @if (loadError()) {
            <div class="placeholder-card error">
              <h3>Google Maps Configuration Required</h3>
              <p>{{ loadError() }}</p>
              <p class="hint">
                See <code>.env.example</code> for free zero-billing Maps Demo Key instructions.
              </p>
            </div>
          } @else {
            <div class="placeholder-card">
              <h3>Loading San Francisco Clinic Map...</h3>
              <p>Initializing Maps JavaScript API, Places, Routes, and Street View.</p>
            </div>
          }
        </div>
      } @else {
        <div
          class="map-pane"
          [class.hidden]="viewMode() === 'street-view'"
          data-testid="map-container"
        >
          <google-map
            #googleMap
            height="100%"
            width="100%"
            [center]="initialCenter"
            [zoom]="initialZoom"
            [options]="mapOptions"
            (mapInitialized)="onMapInitialized($event)"
          >
            <map-advanced-marker
              #clinicMarker="mapAdvancedMarker"
              [position]="clinicLocation()"
              [content]="clinicPinElement"
              [title]="clinic()?.name || '450 Sutter Dental'"
              [zIndex]="20"
              (mapClick)="openClinicInfo(clinicMarker)"
            />

            @if (origin(); as currentOrigin) {
              <map-advanced-marker
                [position]="currentOrigin.location"
                [content]="originPinElement"
                [title]="'Origin: ' + currentOrigin.label"
                [zIndex]="15"
              />
            }

            @if (showCoverageOverlay()) {
              <map-circle
                [center]="clinicLocation()"
                [radius]="coverageRadiusMeters"
                [options]="coverageCircleOptions"
              />
            }

            @if (routePath().length > 1) {
              <map-polyline
                [path]="routePath()"
                [options]="routePolylineOptions()"
              />
            }

            <map-info-window #infoWindow="mapInfoWindow">
              <div class="info-popup">
                <strong>{{ clinic()?.name || '450 Sutter Dental' }}</strong>
                <p>{{ clinic()?.formattedAddress || '450 Sutter St, San Francisco, CA 94108' }}</p>
                @if (clinic()?.rating; as rating) {
                  <p class="info-rating">{{ rating.toFixed(1) }} &#9733; ({{ clinic()?.userRatingCount }} reviews)</p>
                }
              </div>
            </map-info-window>
          </google-map>

          <div class="map-legend">
            <span class="legend-chip">
              <span class="dot clinic-dot"></span> Clinic (450 Sutter)
            </span>
            <span class="legend-chip">
              <span class="dot origin-dot"></span> Visitor Origin
            </span>
            @if (showCoverageOverlay()) {
              <span class="legend-chip">
                <span class="dot radius-dot"></span> 3.5 km Home-Visit Radius
              </span>
            }
          </div>
        </div>

        @if (viewMode() !== 'map') {
          <div
            class="street-view-pane"
            [class.full]="viewMode() === 'street-view'"
            data-testid="street-view-container"
          >
            <div class="sv-banner">
              <span>Street View Entrance Preview &mdash; 450 Sutter St</span>
              @if (streetViewData()?.imageDate; as imageDate) {
                <span class="sv-date">Imagery: {{ imageDate }}</span>
              }
            </div>
            <div #streetViewHost class="street-view-canvas"></div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 540px;
      }

      .viewport-stack {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 540px;
        gap: 10px;
      }

      .map-pane {
        position: relative;
        flex: 1 1 auto;
        min-height: 540px;
        width: 100%;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-md);
      }

      .viewport-stack[data-view-mode='split'] .map-pane {
        min-height: 320px;
        flex: 1 1 56%;
      }

      .map-pane.hidden {
        display: none;
      }

      .street-view-pane {
        position: relative;
        flex: 1 1 44%;
        min-height: 280px;
        width: 100%;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-md);
        background: #0f172a;
        display: flex;
        flex-direction: column;
      }

      .street-view-pane.full {
        flex: 1 1 auto;
        min-height: 540px;
      }

      .sv-banner {
        padding: 8px 14px;
        background: #0f2137;
        color: #f8fafc;
        font-size: 0.79rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sv-date {
        color: #94a3b8;
        font-weight: 500;
      }

      .street-view-canvas {
        flex: 1 1 auto;
        width: 100%;
        min-height: 240px;
      }

      .map-legend {
        position: absolute;
        left: 14px;
        bottom: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        pointer-events: none;
      }

      .legend-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid var(--border-subtle);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-primary);
        box-shadow: var(--shadow-sm);
      }

      .dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }

      .clinic-dot {
        background: #0b6e78;
      }

      .origin-dot {
        background: #1d4ed8;
      }

      .radius-dot {
        background: rgba(11, 110, 120, 0.35);
        border: 1.5px solid #0b6e78;
      }

      .map-placeholder {
        width: 100%;
        height: 100%;
        min-height: 540px;
        border-radius: var(--radius-lg);
        border: 1px dashed var(--border-subtle);
        background: linear-gradient(135deg, #eef4fa, #f7fafc);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .placeholder-card {
        max-width: 460px;
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: 14px;
        padding: 20px;
        text-align: center;
        box-shadow: var(--shadow-sm);
      }

      .placeholder-card.error {
        border-color: #f5b5b5;
      }

      .placeholder-card h3 {
        font-size: 1.02rem;
        margin-bottom: 8px;
      }

      .placeholder-card p {
        margin: 0 0 8px;
        font-size: 0.86rem;
        color: var(--text-secondary);
      }

      .hint {
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      .info-popup {
        padding: 2px 4px;
        max-width: 220px;
        color: var(--text-primary);
      }

      .info-popup p {
        margin: 4px 0 0;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .info-rating {
        font-weight: 600;
        color: #b45309 !important;
      }
    `,
  ],
})
export class ClinicMapComponent implements OnDestroy {
  readonly mapsReady = input<boolean>(false);
  readonly loadError = input<string | null>(null);
  readonly clinic = input<ClinicDetails | null>(null);
  readonly origin = input<OriginSelection | null>(null);
  readonly routeSummary = input<RouteSummary | null>(null);
  readonly showCoverageOverlay = input<boolean>(true);
  readonly viewMode = input<ViewMode>('map');
  readonly streetViewData = input<StreetViewEntranceData | null>(null);

  readonly initialCenter = CLINIC_DEFAULT_CENTER;
  readonly initialZoom = CLINIC_DEFAULT_ZOOM;
  readonly coverageRadiusMeters = HOME_VISIT_RADIUS_METERS;

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
  };

  readonly coverageCircleOptions: google.maps.CircleOptions = {
    strokeColor: '#0b6e78',
    strokeOpacity: 0.78,
    strokeWeight: 2,
    fillColor: '#1496a3',
    fillOpacity: 0.12,
    clickable: false,
  };

  readonly clinicLocation = computed<google.maps.LatLngLiteral>(
    () => this.clinic()?.location ?? CLINIC_DEFAULT_CENTER
  );

  readonly routePath = computed<google.maps.LatLngLiteral[]>(
    () => this.routeSummary()?.path ?? []
  );

  readonly routePolylineOptions = computed<google.maps.PolylineOptions>(() => {
    const mode = this.routeSummary()?.mode;
    const strokeColor =
      mode === 'TRANSIT' ? '#7c3aed' : mode === 'WALKING' ? '#059669' : '#1d4ed8';
    return {
      strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: 5,
    };
  });

  readonly clinicPinElement = this.createClinicPinElement();
  readonly originPinElement = this.createOriginPinElement();

  private readonly mapInstance = signal<google.maps.Map | null>(null);
  private panoramaInstance: google.maps.StreetViewPanorama | null = null;

  @ViewChild('infoWindow') infoWindowRef?: MapInfoWindow;
  @ViewChild('streetViewHost') streetViewHostRef?: ElementRef<HTMLDivElement>;

  constructor() {
    // Fit map bounds whenever route summary or clinic/origin updates
    effect(() => {
      const map = this.mapInstance();
      const summary = this.routeSummary();
      const clinicLoc = this.clinicLocation();
      const originLoc = this.origin()?.location;
      if (!map) {
        return;
      }

      if (summary?.viewport) {
        map.fitBounds(summary.viewport, { top: 48, right: 48, bottom: 64, left: 48 });
      } else if (originLoc) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(clinicLoc);
        bounds.extend(originLoc);
        map.fitBounds(bounds, { top: 64, right: 64, bottom: 72, left: 64 });
      }
    });

    // Mount or update StreetViewPanorama when Street View pane becomes visible
    effect(() => {
      const mode = this.viewMode();
      const ready = this.mapsReady();
      const svData = this.streetViewData();
      const clinicLoc = this.clinicLocation();

      if (!ready || mode === 'map') {
        return;
      }

      queueMicrotask(() => {
        this.mountOrUpdatePanorama(svData, clinicLoc);
      });
    });
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance.set(map);
  }

  openClinicInfo(marker: MapAdvancedMarker): void {
    this.infoWindowRef?.open(marker);
  }

  ngOnDestroy(): void {
    this.panoramaInstance = null;
  }

  private mountOrUpdatePanorama(
    svData: StreetViewEntranceData | null,
    clinicLoc: google.maps.LatLngLiteral
  ): void {
    const host = this.streetViewHostRef?.nativeElement;
    if (!host || !window.google?.maps?.StreetViewPanorama) {
      return;
    }

    const pov: google.maps.StreetViewPov = {
      heading: svData?.heading ?? 180,
      pitch: svData?.pitch ?? 8,
    };

    if (!this.panoramaInstance) {
      this.panoramaInstance = new google.maps.StreetViewPanorama(host, {
        ...(svData?.panoId ? { pano: svData.panoId } : { position: clinicLoc }),
        pov,
        zoom: 1,
        addressControl: true,
        linksControl: true,
        panControl: true,
        enableCloseButton: false,
      });
    } else {
      if (svData?.panoId) {
        this.panoramaInstance.setPano(svData.panoId);
      } else {
        this.panoramaInstance.setPosition(clinicLoc);
      }
      this.panoramaInstance.setPov(pov);
    }

    google.maps.event.trigger(this.panoramaInstance, 'resize');
  }

  private createClinicPinElement(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '6px';
    wrapper.style.padding = '6px 11px';
    wrapper.style.borderRadius = '999px';
    wrapper.style.background = '#0b6e78';
    wrapper.style.color = '#ffffff';
    wrapper.style.border = '2px solid #ffffff';
    wrapper.style.boxShadow = '0 6px 16px rgba(15, 33, 55, 0.28)';
    wrapper.style.fontFamily = 'Inter, sans-serif';
    wrapper.style.fontSize = '12px';
    wrapper.style.fontWeight = '700';
    wrapper.style.cursor = 'pointer';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '15');
    svg.setAttribute('height', '15');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute(
      'd',
      'M7 4c-2.2 0-4 1.8-4 4.2 0 3 1.4 5.8 2.4 9.5.4 1.4 1.2 2.3 2.1 2.3.9 0 1.4-1 1.9-2.8.5-1.8 1.2-2.7 2.6-2.7s2.1.9 2.6 2.7c.5 1.8 1 2.8 1.9 2.8.9 0 1.7-.9 2.1-2.3 1-3.7 2.4-6.5 2.4-9.5C21 5.8 19.2 4 17 4c-1.8 0-3.2.9-5 .9S8.8 4 7 4Z'
    );
    svg.appendChild(path);

    const label = document.createElement('span');
    label.textContent = '450 Sutter Dental';

    wrapper.appendChild(svg);
    wrapper.appendChild(label);
    return wrapper;
  }

  private createOriginPinElement(): HTMLElement {
    const badge = document.createElement('div');
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '5px';
    badge.style.padding = '5px 10px';
    badge.style.borderRadius = '999px';
    badge.style.background = '#1d4ed8';
    badge.style.color = '#ffffff';
    badge.style.border = '2px solid #ffffff';
    badge.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.35)';
    badge.style.fontFamily = 'Inter, sans-serif';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = '700';
    badge.textContent = 'Origin';
    return badge;
  }
}
