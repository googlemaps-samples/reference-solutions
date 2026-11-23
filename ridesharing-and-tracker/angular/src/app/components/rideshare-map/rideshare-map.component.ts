import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapInfoWindow,
  MapPolyline,
} from '@angular/google-maps';
import {
  CandidateDriver,
  ComputedRouteOption,
  DriverTelemetry,
  LatLngPoint,
  ResolvedPlace,
  RouteOptionKind,
} from '../../models/rideshare.models';
import { LOS_ANGELES_CENTER } from '../../services/rideshare-routing.service';

@Component({
  selector: 'app-rideshare-map',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMap,
    MapAdvancedMarker,
    MapPolyline,
    MapInfoWindow,
  ],
  template: `
    <div class="map-shell" data-testid="rideshare-map">
      @if (mapsReady) {
        <google-map
          #googleMapRef
          width="100%"
          height="100%"
          [center]="center"
          [zoom]="zoom"
          [options]="mapOptions"
          (mapInitialized)="onMapInitialized($event)"
        >
          <!-- Fastest Route Polyline -->
          @if (fastestRoute && fastestRoute.path.length >= 2) {
            <map-polyline
              [path]="fastestRoute.path"
              [options]="fastestPolylineOptions"
            />
          }

          <!-- Eco-Friendly Route Polyline -->
          @if (ecoRoute && ecoRoute.path.length >= 2 && (!ecoRoute.matchesBoth || selectedRouteKind === 'eco')) {
            <map-polyline
              [path]="ecoRoute.path"
              [options]="ecoPolylineOptions"
            />
          }

          <!-- Dispatched Driver Pickup Approach Polyline -->
          @if (driverTelemetry.pickupPath.length >= 2 && (driverTelemetry.phase === 'en_route_to_pickup' || driverTelemetry.phase === 'arriving_pickup')) {
            <map-polyline
              [path]="driverTelemetry.pickupPath"
              [options]="approachPolylineOptions"
            />
          }

          <!-- Pickup Advanced Marker -->
          @if (pickupPlace) {
            <map-advanced-marker
              #pickupMarker="mapAdvancedMarker"
              [position]="pickupPlace.location"
              [title]="'Pickup: ' + pickupPlace.name"
              [content]="pickupPinElement"
              [zIndex]="30"
              (mapClick)="openInfo(pickupMarker, 'Pickup Location', pickupPlace.name + ' — ' + pickupPlace.formattedAddress)"
            />
          }

          <!-- Drop-off Advanced Marker -->
          @if (dropoffPlace) {
            <map-advanced-marker
              #dropoffMarker="mapAdvancedMarker"
              [position]="dropoffPlace.location"
              [title]="'Drop-off: ' + dropoffPlace.name"
              [content]="dropoffPinElement"
              [zIndex]="30"
              (mapClick)="openInfo(dropoffMarker, 'Drop-off Location', dropoffPlace.name + ' — ' + dropoffPlace.formattedAddress)"
            />
          }

          <!-- Nearby Idle Candidate Vehicles -->
          @for (candidate of idleCandidates; track candidate.id) {
            <map-advanced-marker
              #candMarker="mapAdvancedMarker"
              [position]="candidate.location"
              [title]="candidate.name + ' · ' + candidate.vehicleModel"
              [content]="getCandidateElement(candidate)"
              [zIndex]="15"
              (mapClick)="openInfo(candMarker, candidate.name + ' (' + candidate.vehicleModel + ')', formatCandidateDetail(candidate))"
            />
          }

          <!-- Live Animated Dispatched Driver Advanced Marker -->
          @if (driverTelemetry.driver && driverTelemetry.position) {
            <map-advanced-marker
              #driverMarker="mapAdvancedMarker"
              [position]="driverTelemetry.position"
              [title]="'Active Driver: ' + driverTelemetry.driver.name"
              [content]="driverMarkerElement"
              [zIndex]="60"
              (mapClick)="openInfo(driverMarker, driverTelemetry.driver.name + ' · ' + driverTelemetry.driver.vehicleModel, driverTelemetry.statusLabel)"
            />
          }

          <map-info-window>
            <div class="info-popup">
              <div class="info-popup-title">{{ infoTitle }}</div>
              <div class="info-popup-body">{{ infoBody }}</div>
            </div>
          </map-info-window>
        </google-map>
      } @else {
        <div class="map-placeholder">
          @if (apiKeyMissing) {
            <div class="missing-key-card">
              <div class="missing-key-badge">API Key Required</div>
              <h2>Configure Google Maps Platform API Key</h2>
              <p>
                Copy <code>.env.example</code> to <code>.env</code> and set
                <code>GOOGLE_MAPS_API_KEY</code> to render the interactive Los Angeles rideshare map,
                Places Autocomplete, and Routes API Eco-Friendly comparisons.
              </p>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
                class="demo-key-link"
              >
                Get a Free Maps Demo Key
              </a>
            </div>
          } @else {
            <div class="loading-state">
              <div class="spinner"></div>
              <span>Loading Los Angeles interactive vector map…</span>
            </div>
          }
        </div>
      }

      <!-- Floating Route Legend -->
      <div class="map-legend" data-testid="map-route-legend">
        <div class="legend-title">LA Dispatch Legend</div>
        <div class="legend-items">
          <div class="legend-item">
            <span class="swatch swatch-fastest"></span>
            <span>Fastest (Traffic-Aware)</span>
          </div>
          <div class="legend-item">
            <span class="swatch swatch-eco"></span>
            <span>Eco-Friendly (Fuel-Efficient)</span>
          </div>
          <div class="legend-item">
            <span class="swatch swatch-approach"></span>
            <span>Driver Approach</span>
          </div>
          <div class="legend-item">
            <span class="pin-dot pin-pickup"></span>
            <span>Pickup</span>
          </div>
          <div class="legend-item">
            <span class="pin-dot pin-dropoff"></span>
            <span>Drop-off</span>
          </div>
          <div class="legend-item">
            <span class="pin-dot pin-driver"></span>
            <span>Live Driver</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 560px;
      }

      .map-shell {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 560px;
        background: #e2e8f0;
      }

      .map-placeholder {
        width: 100%;
        height: 100%;
        min-height: 560px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        padding: 24px;
        box-sizing: border-box;
      }

      .missing-key-card {
        max-width: 460px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      }

      .missing-key-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #b45309;
        background: #fef3c7;
        padding: 4px 10px;
        border-radius: 999px;
        margin-bottom: 12px;
      }

      .missing-key-card h2 {
        margin: 0 0 8px;
        font-size: 18px;
        color: #0f172a;
      }

      .missing-key-card p {
        margin: 0 0 16px;
        font-size: 14px;
        line-height: 1.5;
        color: #475569;
      }

      .demo-key-link {
        display: inline-block;
        padding: 10px 16px;
        background: #2563eb;
        color: #ffffff;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
      }

      .loading-state {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #334155;
        font-size: 14px;
        font-weight: 500;
      }

      .spinner {
        width: 20px;
        height: 20px;
        border: 3px solid #cbd5e1;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .map-legend {
        position: absolute;
        left: 16px;
        bottom: 24px;
        z-index: 10;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(203, 213, 225, 0.9);
        border-radius: 12px;
        padding: 10px 14px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        pointer-events: auto;
      }

      .legend-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #334155;
        margin-bottom: 8px;
      }

      .legend-items {
        display: grid;
        grid-template-columns: repeat(2, minmax(120px, auto));
        gap: 6px 14px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        color: #1e293b;
        font-weight: 500;
      }

      .swatch {
        width: 18px;
        height: 4px;
        border-radius: 999px;
        flex-shrink: 0;
      }

      .swatch-fastest {
        background: #2563eb;
      }

      .swatch-eco {
        background: #059669;
      }

      .swatch-approach {
        background: repeating-linear-gradient(
          90deg,
          #d97706 0,
          #d97706 5px,
          transparent 5px,
          transparent 8px
        );
      }

      .pin-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .pin-pickup {
        background: #10b981;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 1px #059669;
      }

      .pin-dropoff {
        background: #ef4444;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 1px #b91c1c;
      }

      .pin-driver {
        background: #0f172a;
        border: 2px solid #38bdf8;
      }

      .info-popup {
        max-width: 240px;
        padding: 2px 4px;
      }

      .info-popup-title {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
      }

      .info-popup-body {
        font-size: 12px;
        color: #475569;
        line-height: 1.4;
      }
    `,
  ],
})
export class RideshareMapComponent implements OnChanges {
  @Input() mapsReady = false;
  @Input() apiKeyMissing = false;
  @Input() pickupPlace: ResolvedPlace | null = null;
  @Input() dropoffPlace: ResolvedPlace | null = null;
  @Input() fastestRoute: ComputedRouteOption | null = null;
  @Input() ecoRoute: ComputedRouteOption | null = null;
  @Input() selectedRouteKind: RouteOptionKind = 'eco';
  @Input() candidates: CandidateDriver[] = [];
  @Input() driverTelemetry!: DriverTelemetry;

  @ViewChild(GoogleMap) private mapComponent?: GoogleMap;
  @ViewChild(MapInfoWindow) private infoWindow?: MapInfoWindow;

  readonly center: google.maps.LatLngLiteral = LOS_ANGELES_CENTER;
  readonly zoom = 12;

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    disableDefaultUI: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    zoomControl: true,
    clickableIcons: false,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  } as google.maps.MapOptions;

  infoTitle = '';
  infoBody = '';

  readonly pickupPinElement: HTMLElement = this.createEndpointPin('P', 'Pickup', '#059669');
  readonly dropoffPinElement: HTMLElement = this.createEndpointPin('D', 'Drop-off', '#dc2626');

  private readonly candidateElements = new Map<string, HTMLElement>();
  private readonly driverArrowSvg: SVGElement;
  private readonly driverEtaSpan: HTMLSpanElement;
  readonly driverMarkerElement: HTMLElement;

  private mapInstance: google.maps.Map | null = null;

  constructor() {
    const { container, arrowSvg, etaSpan } = this.createDriverMarkerDom();
    this.driverMarkerElement = container;
    this.driverArrowSvg = arrowSvg;
    this.driverEtaSpan = etaSpan;
  }

  get idleCandidates(): CandidateDriver[] {
    const activeId = this.driverTelemetry?.driver?.id;
    return this.candidates.filter((c) => c.id !== activeId);
  }

  get fastestPolylineOptions(): google.maps.PolylineOptions {
    const active = this.selectedRouteKind === 'fastest';
    return {
      strokeColor: active ? '#2563eb' : '#60a5fa',
      strokeOpacity: active ? 0.94 : 0.45,
      strokeWeight: active ? 6 : 4,
      zIndex: active ? 20 : 10,
      geodesic: true,
    };
  }

  get ecoPolylineOptions(): google.maps.PolylineOptions {
    const active = this.selectedRouteKind === 'eco';
    return {
      strokeColor: active ? '#059669' : '#34d399',
      strokeOpacity: active ? 0.95 : 0.5,
      strokeWeight: active ? 6 : 4,
      zIndex: active ? 22 : 12,
      geodesic: true,
    };
  }

  get approachPolylineOptions(): google.maps.PolylineOptions {
    return {
      strokeColor: '#d97706',
      strokeOpacity: 0,
      strokeWeight: 4,
      zIndex: 25,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.95,
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
    };
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    this.fitMapToTrip();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['driverTelemetry'] && this.driverTelemetry) {
      this.updateDriverMarkerDom(this.driverTelemetry);
    }

    if (
      changes['pickupPlace'] ||
      changes['dropoffPlace'] ||
      changes['fastestRoute'] ||
      changes['ecoRoute']
    ) {
      this.fitMapToTrip();
    }
  }

  openInfo(marker: MapAdvancedMarker, title: string, body: string): void {
    this.infoTitle = title;
    this.infoBody = body;
    this.infoWindow?.open(marker);
  }

  formatCandidateDetail(candidate: CandidateDriver): string {
    const eta =
      candidate.matrixDurationSeconds != null
        ? `${Math.max(1, Math.round(candidate.matrixDurationSeconds / 60))} min away`
        : 'Calculating ETA';
    const dist =
      candidate.matrixDistanceMeters != null
        ? `${(candidate.matrixDistanceMeters / 1609.344).toFixed(1)} mi`
        : '';
    return `${candidate.emissionType} · ★ ${candidate.rating.toFixed(2)} · ${eta}${dist ? ' (' + dist + ')' : ''}`;
  }

  getCandidateElement(candidate: CandidateDriver): HTMLElement {
    let el = this.candidateElements.get(candidate.id);
    if (!el) {
      el = this.createCandidatePin(candidate);
      this.candidateElements.set(candidate.id, el);
    }
    return el;
  }

  private fitMapToTrip(): void {
    if (!this.mapInstance || typeof google === 'undefined') return;

    const points: LatLngPoint[] = [];
    if (this.pickupPlace) points.push(this.pickupPlace.location);
    if (this.dropoffPlace) points.push(this.dropoffPlace.location);

    const activeRoute =
      this.selectedRouteKind === 'eco'
        ? this.ecoRoute ?? this.fastestRoute
        : this.fastestRoute ?? this.ecoRoute;

    if (activeRoute) {
      for (const p of activeRoute.path) {
        points.push(p);
      }
    }

    if (this.driverTelemetry?.position) {
      points.push(this.driverTelemetry.position);
    }

    if (points.length < 2) return;

    const bounds = new google.maps.LatLngBounds();
    for (const pt of points) {
      bounds.extend(pt);
    }

    this.mapInstance.fitBounds(bounds, {
      top: 56,
      right: 56,
      bottom: 84,
      left: 56,
    });
  }

  private updateDriverMarkerDom(telemetry: DriverTelemetry): void {
    const heading = Number.isFinite(telemetry.heading) ? telemetry.heading : 0;
    this.driverArrowSvg.style.transform = `rotate(${heading}deg)`;
    if (telemetry.phase === 'arrived_dropoff') {
      this.driverEtaSpan.textContent = 'Arrived';
    } else if (telemetry.phase === 'arriving_pickup') {
      this.driverEtaSpan.textContent = 'Pickup!';
    } else {
      const mins = Math.max(1, Math.ceil(telemetry.remainingSeconds / 60));
      this.driverEtaSpan.textContent = `${mins} min`;
    }
  }

  private createEndpointPin(code: string, label: string, color: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.cursor = 'pointer';
    wrapper.style.transform = 'translateY(-4px)';

    const pill = document.createElement('div');
    pill.style.display = 'flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '6px';
    pill.style.padding = '5px 10px';
    pill.style.borderRadius = '999px';
    pill.style.background = '#0f172a';
    pill.style.color = '#ffffff';
    pill.style.fontFamily = 'Inter, system-ui, sans-serif';
    pill.style.fontSize = '12px';
    pill.style.fontWeight = '700';
    pill.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.28)';
    pill.style.border = `2px solid ${color}`;

    const badge = document.createElement('span');
    badge.textContent = code;
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.width = '18px';
    badge.style.height = '18px';
    badge.style.borderRadius = '50%';
    badge.style.background = color;
    badge.style.color = '#ffffff';
    badge.style.fontSize = '11px';

    const text = document.createElement('span');
    text.textContent = label;

    pill.appendChild(badge);
    pill.appendChild(text);

    const stem = document.createElement('div');
    stem.style.width = '3px';
    stem.style.height = '10px';
    stem.style.background = color;
    stem.style.borderRadius = '2px';

    wrapper.appendChild(pill);
    wrapper.appendChild(stem);
    return wrapper;
  }

  private createCandidatePin(candidate: CandidateDriver): HTMLElement {
    const chip = document.createElement('div');
    chip.style.display = 'flex';
    chip.style.alignItems = 'center';
    chip.style.gap = '4px';
    chip.style.padding = '4px 8px';
    chip.style.borderRadius = '999px';
    chip.style.background = '#ffffff';
    chip.style.border = '1.5px solid #94a3b8';
    chip.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.16)';
    chip.style.fontFamily = 'Inter, system-ui, sans-serif';
    chip.style.fontSize = '11px';
    chip.style.fontWeight = '600';
    chip.style.color = '#1e293b';
    chip.style.cursor = 'pointer';

    const dot = document.createElement('span');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.background = candidate.emissionType === 'ELECTRIC' ? '#10b981' : '#3b82f6';

    const text = document.createElement('span');
    text.textContent = candidate.emissionType === 'ELECTRIC' ? 'EV' : 'HYB';

    chip.appendChild(dot);
    chip.appendChild(text);
    return chip;
  }

  private createDriverMarkerDom(): {
    container: HTMLElement;
    arrowSvg: SVGElement;
    etaSpan: HTMLSpanElement;
  } {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '4px';
    container.style.cursor = 'pointer';

    const etaPill = document.createElement('div');
    etaPill.style.background = '#0f172a';
    etaPill.style.color = '#38bdf8';
    etaPill.style.border = '1.5px solid #38bdf8';
    etaPill.style.borderRadius = '999px';
    etaPill.style.padding = '2px 8px';
    etaPill.style.fontFamily = 'Inter, system-ui, sans-serif';
    etaPill.style.fontSize = '11px';
    etaPill.style.fontWeight = '700';
    etaPill.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.35)';
    etaPill.style.whiteSpace = 'nowrap';

    const etaSpan = document.createElement('span');
    etaSpan.textContent = 'Live';
    etaPill.appendChild(etaSpan);

    const circle = document.createElement('div');
    circle.style.width = '36px';
    circle.style.height = '36px';
    circle.style.borderRadius = '50%';
    circle.style.background = '#0f172a';
    circle.style.border = '3px solid #ffffff';
    circle.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.4)';
    circle.style.display = 'flex';
    circle.style.alignItems = 'center';
    circle.style.justifyContent = 'center';

    const svgNs = 'http://www.w3.org/2000/svg';
    const arrowSvg = document.createElementNS(svgNs, 'svg');
    arrowSvg.setAttribute('width', '20');
    arrowSvg.setAttribute('height', '20');
    arrowSvg.setAttribute('viewBox', '0 0 24 24');
    arrowSvg.style.transition = 'transform 120ms linear';

    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', 'M12 2L19 20L12 16.5L5 20L12 2Z');
    path.setAttribute('fill', '#38bdf8');
    arrowSvg.appendChild(path);

    circle.appendChild(arrowSvg);
    container.appendChild(etaPill);
    container.appendChild(circle);

    return { container, arrowSvg, etaSpan };
  }
}
