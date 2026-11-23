import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {
  CameraTelemetry,
  ElevationSample,
  INITIAL_CENTER,
  LAKE_TAHOE_TRAIL_PATH,
  SelectedViewpointInfo,
  TOUR_CHAPTERS,
  TourChapter,
} from '../../data/tahoe-trail.data';
import { MapsLoaderService } from '../../services/maps-loader.service';

export interface CameraFlyTarget {
  center: { lat: number; lng: number; altitude: number };
  heading: number;
  tilt: number;
  range: number;
  durationMillis?: number;
  nonce: number;
}

@Component({
  selector: 'app-trail-map-3d',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="map-3d-shell">
      <gmp-map-3d
        #map3dElement
        data-testid="gmp-map-3d"
        class="map-3d-canvas"
        mode="HYBRID"
        center="38.9542,-120.1103,1950"
        range="3400"
        tilt="66"
        heading="42"
        internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
      ></gmp-map-3d>

      @if (webglNotice) {
        <div class="map-notice" role="status">
          <strong>3D WebGL Notice:</strong> {{ webglNotice }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 520px;
      }

      .map-3d-shell {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 520px;
        background: radial-gradient(circle at 50% 35%, #162238 0%, #070d18 100%);
      }

      .map-3d-canvas {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 520px;
        min-width: 300px;
      }

      .map-notice {
        position: absolute;
        bottom: 18px;
        right: 18px;
        max-width: 380px;
        padding: 10px 14px;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(251, 191, 36, 0.45);
        color: #fef3c7;
        font-size: 12px;
        line-height: 1.45;
        backdrop-filter: blur(10px);
        z-index: 15;
      }
    `,
  ],
})
export class TrailMap3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map3dElement', { static: true })
  private readonly map3dRef!: ElementRef<google.maps.maps3d.Map3DElement>;

  @Input() flyTarget: CameraFlyTarget | null = null;
  @Input() mapMode: 'HYBRID' | 'SATELLITE' = 'HYBRID';
  @Input() searchedPlace: SelectedViewpointInfo | null = null;
  @Input() hoveredElevationSample: ElevationSample | null = null;

  @Output() telemetryChange = new EventEmitter<CameraTelemetry>();
  @Output() chapterSelected = new EventEmitter<TourChapter>();
  @Output() mapReady = new EventEmitter<void>();

  private readonly mapsLoader = inject(MapsLoaderService);
  private readonly ngZone = inject(NgZone);

  webglNotice: string | null = null;

  private initialized = false;
  private destroyed = false;
  private maps3dLib: google.maps.Maps3DLibrary | null = null;
  private markerLib: google.maps.MarkerLibrary | null = null;
  private searchMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;
  private hoverMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;
  private cleanupListeners: Array<() => void> = [];

  async ngAfterViewInit(): Promise<void> {
    if (!this.mapsLoader.hasApiKey()) {
      this.webglNotice =
        'Configure GOOGLE_MAPS_API_KEY in .env to render Photorealistic 3D terrain tiles.';
      return;
    }

    try {
      const [maps3dLib, markerLib] = await Promise.all([
        this.mapsLoader.loadMaps3dLibrary(),
        this.mapsLoader.loadMarkerLibrary(),
      ]);
      await customElements.whenDefined('gmp-map-3d');

      if (this.destroyed) {
        return;
      }

      this.maps3dLib = maps3dLib;
      this.markerLib = markerLib;

      const mapEl = this.map3dRef.nativeElement;
      mapEl.mode = this.mapMode;
      mapEl.center = { ...INITIAL_CENTER };
      mapEl.range = 3400;
      mapEl.tilt = 66;
      mapEl.heading = 42;
      mapEl.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];

      this.attachMapListeners(mapEl);
      this.renderTrailPolyline(mapEl);
      this.renderChapterMarkers(mapEl);

      this.initialized = true;
      this.emitTelemetry(mapEl);
      this.mapReady.emit();

      if (this.flyTarget) {
        this.executeFlyCameraTo(this.flyTarget);
      }
      if (this.searchedPlace && this.searchedPlace.source === 'places-search') {
        this.updateSearchMarker(this.searchedPlace);
      }
    } catch {
      this.webglNotice =
        'Photorealistic 3D Map requires WebGL2 support and a valid Google Maps API key with Map Tiles API enabled.';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }
    const mapEl = this.map3dRef.nativeElement;

    if (changes['mapMode'] && !changes['mapMode'].firstChange) {
      mapEl.mode = this.mapMode;
    }

    if (changes['flyTarget'] && this.flyTarget) {
      this.executeFlyCameraTo(this.flyTarget);
    }

    if (changes['searchedPlace']) {
      this.updateSearchMarker(this.searchedPlace);
    }

    if (changes['hoveredElevationSample']) {
      this.updateHoverMarker(this.hoveredElevationSample);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    for (const cleanup of this.cleanupListeners) {
      cleanup();
    }
    this.cleanupListeners = [];
  }

  private attachMapListeners(mapEl: google.maps.maps3d.Map3DElement): void {
    const syncTelemetry = () => {
      this.ngZone.run(() => {
        this.emitTelemetry(mapEl);
      });
    };

    const onMapError = () => {
      this.ngZone.run(() => {
        this.webglNotice =
          '3D terrain tiles unavailable in this environment (WebGL2 or Map Tiles API required).';
      });
    };

    const events = [
      'gmp-centerchange',
      'gmp-headingchange',
      'gmp-tiltchange',
      'gmp-rangechange',
    ] as const;

    for (const evt of events) {
      mapEl.addEventListener(evt, syncTelemetry);
      this.cleanupListeners.push(() => mapEl.removeEventListener(evt, syncTelemetry));
    }

    mapEl.addEventListener('gmp-error', onMapError);
    this.cleanupListeners.push(() => mapEl.removeEventListener('gmp-error', onMapError));
  }

  private emitTelemetry(mapEl: google.maps.maps3d.Map3DElement): void {
    const center = mapEl.center;
    this.telemetryChange.emit({
      lat: center?.lat ?? INITIAL_CENTER.lat,
      lng: center?.lng ?? INITIAL_CENTER.lng,
      altitude: center?.altitude ?? INITIAL_CENTER.altitude,
      heading: mapEl.heading ?? 42,
      tilt: mapEl.tilt ?? 66,
      range: mapEl.range ?? 3400,
    });
  }

  private renderTrailPolyline(mapEl: google.maps.maps3d.Map3DElement): void {
    if (!this.maps3dLib) return;
    const { Polyline3DElement } = this.maps3dLib;

    const trailPolyline = new Polyline3DElement({
      path: LAKE_TAHOE_TRAIL_PATH.map((wp) => ({
        lat: wp.lat,
        lng: wp.lng,
        altitude: 18,
      })),
      strokeColor: 'rgb(255, 0, 0)',
      strokeWidth: 8,
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      drawsOccludedSegments: true,
    });

    mapEl.append(trailPolyline);
  }

  private renderChapterMarkers(mapEl: google.maps.maps3d.Map3DElement): void {
    if (!this.maps3dLib || !this.markerLib) return;
    const { Marker3DInteractiveElement, PopoverElement } = this.maps3dLib;
    const { PinElement } = this.markerLib;

    const trailMarkers = TOUR_CHAPTERS.filter((ch) => ch.id !== 'overview');

    for (const chapter of trailMarkers) {
      const pin = new PinElement({
        background: '#dc2626',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        glyphText: chapter.shortLabel,
        scale: 1.15,
      });

      const popover = new PopoverElement({
        altitudeMode: 'RELATIVE_TO_GROUND',
      });
      const popoverBox = document.createElement('div');
      popoverBox.style.padding = '8px 10px';
      popoverBox.style.maxWidth = '220px';
      popoverBox.style.fontFamily = 'Inter, system-ui, sans-serif';
      popoverBox.style.color = '#0f172a';

      const headingEl = document.createElement('strong');
      headingEl.textContent = chapter.title;
      headingEl.style.display = 'block';
      headingEl.style.fontSize = '13px';
      headingEl.style.marginBottom = '3px';

      const subEl = document.createElement('span');
      subEl.textContent = chapter.subtitle;
      subEl.style.fontSize = '11.5px';
      subEl.style.color = '#475569';

      popoverBox.append(headingEl, subEl);
      popover.append(popoverBox);

      const marker = new Marker3DInteractiveElement({
        position: {
          lat: chapter.markerPosition.lat,
          lng: chapter.markerPosition.lng,
          altitude: 26,
        },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
        title: chapter.title,
        label: chapter.title.replace(/^\d+\.\s*/, ''),
        gmpPopoverTargetElement: popover,
      });

      marker.append(pin);

      const onClick = () => {
        this.ngZone.run(() => {
          this.chapterSelected.emit(chapter);
        });
      };

      marker.addEventListener('gmp-click', onClick);
      this.cleanupListeners.push(() => marker.removeEventListener('gmp-click', onClick));

      mapEl.append(marker);
      mapEl.append(popover);
    }
  }

  private updateSearchMarker(place: SelectedViewpointInfo | null): void {
    if (!this.maps3dLib || !this.markerLib) return;
    const mapEl = this.map3dRef.nativeElement;

    if (this.searchMarker) {
      this.searchMarker.remove();
      this.searchMarker = null;
    }

    if (!place || place.source !== 'places-search') {
      return;
    }

    const { Marker3DInteractiveElement } = this.maps3dLib;
    const { PinElement } = this.markerLib;

    const pin = new PinElement({
      background: '#0284c7',
      borderColor: '#e0f2fe',
      glyphColor: '#ffffff',
      glyphText: '★',
      scale: 1.25,
    });

    const marker = new Marker3DInteractiveElement({
      position: {
        lat: place.lat,
        lng: place.lng,
        altitude: 34,
      },
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      title: place.title,
      label: place.title,
    });
    marker.append(pin);

    mapEl.append(marker);
    this.searchMarker = marker;
  }

  private updateHoverMarker(sample: ElevationSample | null): void {
    if (!this.maps3dLib || !this.markerLib) return;
    const mapEl = this.map3dRef.nativeElement;

    if (!sample) {
      if (this.hoverMarker) {
        this.hoverMarker.remove();
        this.hoverMarker = null;
      }
      return;
    }

    if (!this.hoverMarker) {
      const { Marker3DInteractiveElement } = this.maps3dLib;
      const { PinElement } = this.markerLib;
      const pin = new PinElement({
        background: '#10b981',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        glyphText: '▲',
        scale: 0.9,
      });
      this.hoverMarker = new Marker3DInteractiveElement({
        position: { lat: sample.lat, lng: sample.lng, altitude: 22 },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
        title: `${Math.round(sample.elevationMeters)} m`,
      });
      this.hoverMarker.append(pin);
      mapEl.append(this.hoverMarker);
    } else {
      this.hoverMarker.position = {
        lat: sample.lat,
        lng: sample.lng,
        altitude: 22,
      };
    }
  }

  private executeFlyCameraTo(target: CameraFlyTarget): void {
    const mapEl = this.map3dRef.nativeElement;
    // Always sync telemetry immediately so UI reflects chapter target even in non-WebGL headless environments
    this.telemetryChange.emit({
      lat: target.center.lat,
      lng: target.center.lng,
      altitude: target.center.altitude,
      heading: target.heading,
      tilt: target.tilt,
      range: target.range,
    });

    try {
      if (typeof mapEl.flyCameraTo === 'function') {
        mapEl.flyCameraTo({
          endCamera: {
            center: target.center,
            heading: target.heading,
            tilt: target.tilt,
            range: target.range,
          },
          durationMillis: target.durationMillis ?? 2200,
        });
      }
    } catch {
      // Ignore WebGL animation errors on software/headless contexts
    }
  }
}
