import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapPolyline } from '@angular/google-maps';
import {
  INITIAL_CENTER,
  LAKE_TAHOE_TRAIL_PATH,
  SelectedViewpointInfo,
  TOUR_CHAPTERS,
  TourChapter,
} from '../../data/tahoe-trail.data';
import { MapsLoaderService } from '../../services/maps-loader.service';

@Component({
  selector: 'app-trail-map-2d',
  standalone: true,
  imports: [CommonModule, GoogleMap, MapAdvancedMarker, MapPolyline],
  template: `
    <div class="map-2d-shell">
      @if (apiReady) {
        <google-map
          width="100%"
          height="100%"
          [center]="center"
          [zoom]="14"
          [options]="mapOptions"
        >
          <map-polyline [path]="trailPath" [options]="polylineOptions" />

          @for (chapter of trailChapters; track chapter.id) {
            <map-advanced-marker
              [position]="chapter.markerPosition"
              [title]="chapter.title"
              (mapClick)="chapterSelected.emit(chapter)"
            />
          }

          @if (searchedPlace && searchedPlace.source === 'places-search') {
            <map-advanced-marker
              [position]="{ lat: searchedPlace.lat, lng: searchedPlace.lng }"
              [title]="searchedPlace.title"
            />
          }
        </google-map>
      } @else {
        <div class="map-2d-placeholder">
          Loading 2D Trail Map (&#64;angular/google-maps)…
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

      .map-2d-shell {
        width: 100%;
        height: 100%;
        min-height: 520px;
        min-width: 300px;
        background: #0b1220;
      }

      .map-2d-placeholder {
        width: 100%;
        height: 100%;
        min-height: 520px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #cbd5e1;
        font-size: 13px;
      }
    `,
  ],
})
export class TrailMap2dComponent implements OnInit {
  @Input() searchedPlace: SelectedViewpointInfo | null = null;
  @Output() chapterSelected = new EventEmitter<TourChapter>();

  private readonly mapsLoader = inject(MapsLoaderService);

  apiReady = false;

  readonly center: google.maps.LatLngLiteral = {
    lat: INITIAL_CENTER.lat,
    lng: INITIAL_CENTER.lng,
  };

  readonly trailPath: google.maps.LatLngLiteral[] = LAKE_TAHOE_TRAIL_PATH.map(
    (wp) => ({
      lat: wp.lat,
      lng: wp.lng,
    })
  );

  readonly trailChapters = TOUR_CHAPTERS.filter((ch) => ch.id !== 'overview');

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    mapTypeId: 'terrain',
    disableDefaultUI: false,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  };

  readonly polylineOptions: google.maps.PolylineOptions = {
    strokeColor: 'rgb(255, 0, 0)',
    strokeOpacity: 0.95,
    strokeWeight: 5,
  };

  async ngOnInit(): Promise<void> {
    if (!this.mapsLoader.hasApiKey()) {
      return;
    }
    try {
      await Promise.all([
        this.mapsLoader.loadMaps2dLibrary(),
        this.mapsLoader.loadMarkerLibrary(),
      ]);
      this.apiReady = true;
    } catch {
      this.apiReady = false;
    }
  }
}
