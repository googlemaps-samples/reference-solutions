import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GoogleMap, MapAdvancedMarker } from '@angular/google-maps';
import {
  Cluster,
  MarkerClusterer,
  SuperClusterAlgorithm,
} from '@googlemaps/markerclusterer';
import {
  ActiveRouteSummary,
  BRANCH_TYPE_METADATA,
  BranchLocation,
  NYC_CENTER,
  OriginPoint,
} from '../../models/store.models';

@Component({
  selector: 'app-locator-map',
  standalone: true,
  imports: [GoogleMap, MapAdvancedMarker],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './locator-map.component.html',
  styleUrl: './locator-map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocatorMapComponent implements OnChanges, OnDestroy {
  private readonly ngZone = inject(NgZone);

  @Input({ required: true }) branches: BranchLocation[] = [];
  @Input({ required: true }) origin!: OriginPoint;
  @Input() selectedBranchId: string | null = null;
  @Input() fastestBranchId: string | null = null;
  @Input() activeRoute: ActiveRouteSummary | null = null;

  @Output() branchSelected = new EventEmitter<BranchLocation>();

  readonly initialCenter: google.maps.LatLngLiteral = NYC_CENTER;
  readonly initialZoom = 12;

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: true,
  };

  readonly originPosition = signal<google.maps.LatLngLiteral>({
    lat: 40.7506,
    lng: -73.9935,
  });
  readonly originTitle = signal<string>('Starting Origin');
  readonly originPinContent = computed<HTMLElement>(() => {
    const el = document.createElement('div');
    el.className = 'origin-pin';
    const dot = document.createElement('span');
    dot.className = 'origin-pin__dot';
    const text = document.createElement('span');
    text.textContent = 'Origin';
    el.append(dot, text);
    return el;
  });

  readonly currentZoom = signal<number>(12);

  private map: google.maps.Map | null = null;
  private clusterer: MarkerClusterer | null = null;
  private branchMarkers = new Map<
    string,
    google.maps.marker.AdvancedMarkerElement
  >();
  private routePolylines: google.maps.Polyline[] = [];
  private infoWindow: google.maps.InfoWindow | null = null;
  private zoomListener: google.maps.MapsEventListener | null = null;

  onMapInitialized(mapInstance: google.maps.Map): void {
    this.map = mapInstance;
    this.infoWindow = new google.maps.InfoWindow();

    this.zoomListener = this.map.addListener('zoom_changed', () => {
      const z = this.map?.getZoom();
      if (typeof z === 'number') {
        this.ngZone.run(() => this.currentZoom.set(z));
      }
    });

    this.initClusterer();
    this.syncBranchMarkers();
    this.syncActiveRoute();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['origin'] && this.origin) {
      this.originPosition.set({ lat: this.origin.lat, lng: this.origin.lng });
      this.originTitle.set(`Origin: ${this.origin.label}`);
      if (this.map && !this.activeRoute) {
        this.map.panTo({ lat: this.origin.lat, lng: this.origin.lng });
      }
    }

    if (
      changes['branches'] ||
      changes['selectedBranchId'] ||
      changes['fastestBranchId']
    ) {
      this.syncBranchMarkers();
    }

    if (changes['activeRoute']) {
      this.syncActiveRoute();
    } else if (changes['selectedBranchId'] && this.selectedBranchId) {
      this.openSelectedInfoWindow();
    }
  }

  ngOnDestroy(): void {
    this.clearPolylines();
    if (this.zoomListener) {
      this.zoomListener.remove();
      this.zoomListener = null;
    }
    if (this.clusterer) {
      this.clusterer.clearMarkers();
      this.clusterer.setMap(null);
      this.clusterer = null;
    }
    this.branchMarkers.forEach((m) => {
      m.map = null;
    });
    this.branchMarkers.clear();
  }

  private initClusterer(): void {
    if (!this.map) return;

    this.clusterer = new MarkerClusterer({
      map: this.map,
      markers: [],
      algorithm: new SuperClusterAlgorithm({
        radius: 68,
        maxZoom: 15,
      }),
      onClusterClick: (_event, cluster, map) => {
        if (cluster.bounds) {
          map.fitBounds(cluster.bounds, 72);
        }
      },
      renderer: {
        render: (cluster: Cluster) => {
          const { count, position } = cluster;
          const badge = document.createElement('div');
          badge.className = 'cluster-badge';
          const size = count >= 10 ? 50 : 42;
          badge.style.width = `${size}px`;
          badge.style.height = `${size}px`;

          const countEl = document.createElement('span');
          countEl.className = 'cluster-badge__count';
          countEl.textContent = String(count);

          const subEl = document.createElement('span');
          subEl.className = 'cluster-badge__sub';
          subEl.textContent = 'NYC';

          badge.append(countEl, subEl);
          badge.addEventListener('click', (event) => {
            event.stopPropagation();
            if (cluster.bounds && this.map) {
              this.map.fitBounds(cluster.bounds, 72);
            }
          });

          const marker = new google.maps.marker.AdvancedMarkerElement({
            position,
            title: `${count} NYC branches in this cluster — click to zoom in`,
            zIndex: 500 + count,
          });
          marker.append(badge);
          return marker;
        },
      },
    });
  }

  private syncBranchMarkers(): void {
    if (!this.map || !this.clusterer) return;

    this.clusterer.clearMarkers(true);
    this.branchMarkers.forEach((m) => {
      m.map = null;
    });
    this.branchMarkers.clear();

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    for (const branch of this.branches) {
      const isSelected = branch.id === this.selectedBranchId;
      const isFastest = branch.id === this.fastestBranchId;
      const pinEl = this.createBranchPinElement(branch, isSelected, isFastest);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: branch.lat, lng: branch.lng },
        title: `${branch.name} (${branch.typeLabel})`,
        zIndex: isSelected ? 900 : isFastest ? 750 : 200,
      });
      marker.append(pinEl);

      pinEl.addEventListener('click', (event) => {
        event.stopPropagation();
        this.ngZone.run(() => {
          this.branchSelected.emit(branch);
        });
      });

      this.branchMarkers.set(branch.id, marker);
      markers.push(marker);
    }

    this.clusterer.addMarkers(markers);
  }

  private createBranchPinElement(
    branch: BranchLocation,
    isSelected: boolean,
    isFastest: boolean
  ): HTMLElement {
    const meta = BRANCH_TYPE_METADATA[branch.type];
    const el = document.createElement('div');
    el.className = `branch-pin branch-pin--${branch.type}`;
    if (isSelected) el.classList.add('branch-pin--selected');
    if (isFastest) el.classList.add('branch-pin--fastest');
    el.dataset['branchId'] = branch.id;

    const badge = document.createElement('span');
    badge.className = 'branch-pin__badge';
    badge.textContent = meta.shortCode;

    const label = document.createElement('span');
    label.textContent =
      branch.etaText && branch.etaText !== 'Calculating...'
        ? branch.etaText
        : meta.shortCode;

    el.append(badge, label);
    return el;
  }

  private clearPolylines(): void {
    for (const line of this.routePolylines) {
      line.setMap(null);
    }
    this.routePolylines = [];
  }

  private syncActiveRoute(): void {
    if (!this.map) return;

    this.clearPolylines();

    if (!this.activeRoute) {
      return;
    }

    const { route, travelMode } = this.activeRoute;
    const polylines =
      travelMode === 'TRANSIT'
        ? route.createPolylines()
        : route.createPolylines({
            polylineOptions: {
              strokeColor: travelMode === 'WALK' ? '#0f766e' : '#1d4ed8',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          });

    for (const polyline of polylines) {
      polyline.setMap(this.map);
      this.routePolylines.push(polyline);
    }

    const branch = this.branches.find((b) => b.id === this.activeRoute?.branchId);
    if (branch) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: this.origin.lat, lng: this.origin.lng });
      bounds.extend({ lat: branch.lat, lng: branch.lng });
      if (route.viewport) {
        bounds.union(route.viewport);
      }
      this.map.fitBounds(bounds, { top: 60, right: 60, bottom: 72, left: 60 });
      this.openInfoWindowForBranch(branch);
    }
  }

  private openSelectedInfoWindow(): void {
    if (!this.map || !this.selectedBranchId) return;
    const branch = this.branches.find((b) => b.id === this.selectedBranchId);
    if (branch) {
      this.openInfoWindowForBranch(branch);
    }
  }

  private openInfoWindowForBranch(branch: BranchLocation): void {
    if (!this.map || !this.infoWindow) return;

    const card = document.createElement('div');
    card.className = 'gmp-info-card';

    const typePill = document.createElement('span');
    typePill.className = 'gmp-info-card__type';
    typePill.style.background = BRANCH_TYPE_METADATA[branch.type].color;
    typePill.textContent = branch.typeLabel;

    const title = document.createElement('h3');
    title.className = 'gmp-info-card__title';
    title.textContent = branch.name;

    const addr = document.createElement('p');
    addr.className = 'gmp-info-card__address';
    addr.textContent = branch.address;

    const metrics = document.createElement('div');
    metrics.className = 'gmp-info-card__metrics';
    const eta = document.createElement('span');
    eta.textContent = `ETA: ${branch.etaText}`;
    const dist = document.createElement('span');
    dist.textContent = `Dist: ${branch.distanceText}`;
    metrics.append(eta, dist);

    card.append(typePill, title, addr, metrics);

    if (branch.weekdayDescriptions.length > 0) {
      const hours = document.createElement('p');
      hours.className = 'gmp-info-card__hours';
      hours.textContent = branch.weekdayDescriptions[0];
      card.append(hours);
    }

    this.infoWindow.setContent(card);
    this.infoWindow.setPosition({ lat: branch.lat, lng: branch.lng });
    this.infoWindow.open({ map: this.map });
  }
}
