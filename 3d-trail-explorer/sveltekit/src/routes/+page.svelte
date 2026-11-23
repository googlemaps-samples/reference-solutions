<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import HeaderBar, { type AutocompleteSuggestionItem } from '$lib/components/HeaderBar.svelte';
  import TrailSidebar from '$lib/components/TrailSidebar.svelte';
  import {
    buildElevationSamples,
    type ElevationSample,
    type TrailMetrics
  } from '$lib/elevationUtils';
  import { isValidApiKey, loadMaps3DLibraries, type LoadedMaps3DModules } from '$lib/maps3dClient';
  import {
    EMERALD_BAY_TRAIL_PATH,
    INITIAL_CAMERA,
    INITIAL_MAP_CENTER,
    SEED_SEARCH_QUERY,
    TOUR_CHAPTERS,
    type ActiveViewpoint,
    type CameraPreset,
    type TourChapter
  } from '$lib/trailData';

  interface PlacesApiPlace {
    id?: string;
    displayName?: { text?: string } | string;
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number; lat?: number; lng?: number };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
  }

  let map3dEl: HTMLElement | null = $state(null);
  let gmpAutocompleteHost: HTMLDivElement | null = $state(null);
  let loadedModules: LoadedMaps3DModules | null = $state(null);
  let gmpPlaceAutocompleteMounted = false;

  let mapStatusNotice = $state<string | null>(null);
  let mapMode = $state<'HYBRID' | 'SATELLITE'>('HYBRID');

  // Camera telemetry state (synced from Map3DElement events & presets)
  let cameraHeading = $state(INITIAL_CAMERA.heading);
  let cameraTilt = $state(INITIAL_CAMERA.tilt);
  let cameraRange = $state(INITIAL_CAMERA.range);

  // Tour & viewpoint state
  let activeChapterId = $state<string>(TOUR_CHAPTERS[0].id);
  let isAutoPlaying = $state(false);
  let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

  let activeViewpoint = $state<ActiveViewpoint>({
    id: TOUR_CHAPTERS[0].id,
    name: TOUR_CHAPTERS[0].title,
    source: 'chapter',
    description: TOUR_CHAPTERS[0].description,
    location: {
      lat: TOUR_CHAPTERS[0].camera.center.lat,
      lng: TOUR_CHAPTERS[0].camera.center.lng
    },
    camera: TOUR_CHAPTERS[0].camera,
    elevationMeters: null
  });

  // Elevation profile state
  let elevationSamples = $state<ElevationSample[]>([]);
  let trailMetrics = $state<TrailMetrics>({
    totalDistanceKm: 0,
    minElevationM: 0,
    maxElevationM: 0,
    totalAscentM: 0,
    totalDescentM: 0
  });
  let elevationLoading = $state(false);
  let elevationError = $state<string | null>(null);
  let activeSampleIndex = $state<number | null>(null);

  // Landmark search state
  let searchQuery = $state('');
  let isSearching = $state(false);
  let suggestions = $state<AutocompleteSuggestionItem[]>([]);
  let showSuggestions = $state(false);
  let autocompleteTimer: ReturnType<typeof setTimeout> | null = null;

  // Dynamic 3D map overlays
  let trailPopover: google.maps.maps3d.PopoverElement | null = null;
  let searchLandmarkMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;

  function getTypedMap3D(): google.maps.maps3d.Map3DElement | null {
    return map3dEl as unknown as google.maps.maps3d.Map3DElement | null;
  }

  function flyToCamera(camera: CameraPreset, durationMillis = 2000) {
    cameraHeading = camera.heading;
    cameraTilt = camera.tilt;
    cameraRange = camera.range;

    const map3d = getTypedMap3D();
    if (map3d && typeof map3d.flyCameraTo === 'function') {
      try {
        map3d.flyCameraTo({
          endCamera: {
            center: camera.center,
            altitudeMode: 'RELATIVE_TO_GROUND',
            heading: camera.heading,
            tilt: camera.tilt,
            range: camera.range
          },
          durationMillis
        });
      } catch {
        // Ignore if 3D scene has not finished WebGL initialization
      }
    }
  }

  function stopAutoPlay() {
    isAutoPlaying = false;
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function toggleAutoPlay() {
    if (isAutoPlaying) {
      stopAutoPlay();
      return;
    }
    isAutoPlaying = true;
    autoPlayTimer = setInterval(() => {
      const currentIdx = TOUR_CHAPTERS.findIndex((c) => c.id === activeChapterId);
      const nextIdx = (currentIdx + 1) % TOUR_CHAPTERS.length;
      void selectChapter(TOUR_CHAPTERS[nextIdx], false);
    }, 5500);
  }

  async function fetchPointElevation(lat: number, lng: number): Promise<number | null> {
    try {
      const res = await fetch('/api/elevation/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: [{ lat, lng }] })
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { results?: Array<{ elevation?: number }> };
      const val = data.results?.[0]?.elevation;
      return typeof val === 'number' ? val : null;
    } catch {
      return null;
    }
  }

  async function fetchTrailElevationProfile() {
    elevationLoading = true;
    elevationError = null;
    try {
      const res = await fetch('/api/elevation/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: EMERALD_BAY_TRAIL_PATH, samples: 48 })
      });

      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            elevation: number;
            location: { lat: number; lng: number };
            resolution?: number;
          }>;
        };
        if (Array.isArray(data.results) && data.results.length >= 2) {
          const built = buildElevationSamples(data.results);
          elevationSamples = built.samples;
          trailMetrics = built.metrics;
          if (activeViewpoint.elevationMeters === null) {
            activeViewpoint = {
              ...activeViewpoint,
              elevationMeters: built.samples[0].elevation
            };
          }
          elevationLoading = false;
          return;
        }
      }

      // Fallback to client-side ElevationService if available
      if (loadedModules?.elevation) {
        const elevator = new loadedModules.elevation.ElevationService();
        const pathResponse = await elevator.getElevationAlongPath({
          path: EMERALD_BAY_TRAIL_PATH,
          samples: 48
        });
        const formatted = pathResponse.results
          .filter((r) => r.location)
          .map((r) => ({
            elevation: r.elevation,
            location: { lat: r.location!.lat(), lng: r.location!.lng() },
            resolution: r.resolution
          }));
        if (formatted.length >= 2) {
          const built = buildElevationSamples(formatted);
          elevationSamples = built.samples;
          trailMetrics = built.metrics;
        }
      } else {
        elevationError = 'Elevation profile unavailable without a valid API key.';
      }
    } catch {
      elevationError = 'Unable to load live Elevation API profile.';
    } finally {
      elevationLoading = false;
    }
  }

  async function enrichWithPlaceSearch(query: string): Promise<PlacesApiPlace | null> {
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textQuery: query })
      });
      if (res.ok) {
        const data = (await res.json()) as { places?: PlacesApiPlace[] };
        if (data.places && data.places.length > 0) {
          return data.places[0];
        }
      }
    } catch {
      // Fallback to Places JS SDK below
    }

    if (loadedModules?.places?.Place) {
      try {
        const { places } = await loadedModules.places.Place.searchByText({
          textQuery: query,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI'
          ],
          maxResultCount: 1
        });
        if (places && places.length > 0) {
          const p = places[0];
          return {
            id: p.id,
            displayName: p.displayName ?? undefined,
            formattedAddress: p.formattedAddress ?? undefined,
            location: p.location
              ? { lat: p.location.lat(), lng: p.location.lng() }
              : undefined,
            rating: p.rating ?? undefined,
            userRatingCount: p.userRatingCount ?? undefined,
            googleMapsUri: p.googleMapsURI ?? undefined
          };
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  function extractPlaceName(place: PlacesApiPlace, fallback: string): string {
    if (typeof place.displayName === 'string' && place.displayName.trim()) {
      return place.displayName;
    }
    if (
      place.displayName &&
      typeof place.displayName === 'object' &&
      typeof place.displayName.text === 'string'
    ) {
      return place.displayName.text;
    }
    return fallback;
  }

  function extractPlaceCoords(place: PlacesApiPlace): { lat: number; lng: number } | null {
    const loc = place.location;
    if (!loc) return null;
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  }

  async function selectChapter(chapter: TourChapter, userInitiated = true) {
    if (userInitiated) {
      stopAutoPlay();
    }
    activeChapterId = chapter.id;
    activeSampleIndex = null;

    activeViewpoint = {
      id: chapter.id,
      name: chapter.title,
      source: 'chapter',
      description: chapter.description,
      location: {
        lat: chapter.camera.center.lat,
        lng: chapter.camera.center.lng
      },
      camera: chapter.camera,
      elevationMeters: activeViewpoint.elevationMeters
    };

    flyToCamera(chapter.camera);

    const [elev, place] = await Promise.all([
      fetchPointElevation(chapter.camera.center.lat, chapter.camera.center.lng),
      enrichWithPlaceSearch(chapter.placeQuery)
    ]);

    if (activeChapterId === chapter.id) {
      activeViewpoint = {
        ...activeViewpoint,
        elevationMeters: elev ?? activeViewpoint.elevationMeters,
        formattedAddress: place?.formattedAddress ?? activeViewpoint.formattedAddress,
        rating: place?.rating ?? activeViewpoint.rating,
        userRatingCount: place?.userRatingCount ?? activeViewpoint.userRatingCount,
        googleMapsUri: place?.googleMapsUri ?? activeViewpoint.googleMapsUri
      };
    }
  }

  function focusSearchedPlace(
    name: string,
    coords: { lat: number; lng: number },
    placeData: {
      id?: string;
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
    }
  ) {
    stopAutoPlay();
    activeChapterId = '';
    showSuggestions = false;

    const targetCamera: CameraPreset = {
      center: { lat: coords.lat, lng: coords.lng, altitude: 20 },
      heading: 330,
      tilt: 65,
      range: 1450
    };

    activeViewpoint = {
      id: placeData.id || `place-${coords.lat.toFixed(4)}`,
      name,
      source: 'place',
      description: 'Live Lake Tahoe landmark located via Places API (New).',
      formattedAddress: placeData.formattedAddress,
      rating: placeData.rating,
      userRatingCount: placeData.userRatingCount,
      googleMapsUri: placeData.googleMapsUri,
      location: coords,
      camera: targetCamera,
      elevationMeters: null
    };

    flyToCamera(targetCamera, 2400);
    placeOrMoveSearchMarker(name, coords);

    void fetchPointElevation(coords.lat, coords.lng).then((elev) => {
      if (activeViewpoint.name === name) {
        activeViewpoint = { ...activeViewpoint, elevationMeters: elev };
      }
    });
  }

  function placeOrMoveSearchMarker(title: string, coords: { lat: number; lng: number }) {
    const map3d = getTypedMap3D();
    if (!map3d || !loadedModules) return;

    const { Marker3DInteractiveElement } = loadedModules.maps3d;
    const { PinElement } = loadedModules.marker;

    if (!searchLandmarkMarker) {
      const marker = new Marker3DInteractiveElement({
        position: { lat: coords.lat, lng: coords.lng, altitude: 26 },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
        drawsWhenOccluded: true,
        label: title,
        title
      });

      const pin = new PinElement({
        glyphText: '★',
        background: '#0284c7',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 1.15
      });
      marker.append(pin);

      marker.addEventListener('gmp-click', () => {
        if (trailPopover) {
          trailPopover.replaceChildren();
          const titleEl = document.createElement('strong');
          titleEl.textContent = marker.label || title;
          trailPopover.append(titleEl);
          trailPopover.positionAnchor = marker;
          trailPopover.open = true;
        }
      });

      map3d.append(marker);
      searchLandmarkMarker = marker;
    } else {
      searchLandmarkMarker.position = { lat: coords.lat, lng: coords.lng, altitude: 26 };
      searchLandmarkMarker.label = title;
      searchLandmarkMarker.title = title;
    }
  }

  function handleSearchInputChange(value: string) {
    searchQuery = value;
    if (autocompleteTimer) clearTimeout(autocompleteTimer);

    if (value.trim().length < 2) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    autocompleteTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: value.trim() })
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              text?: { text?: string };
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }>;
        };

        const mapped: AutocompleteSuggestionItem[] = [];
        for (const entry of data.suggestions ?? []) {
          const pred = entry.placePrediction;
          if (!pred?.placeId) continue;
          const mainText = pred.structuredFormat?.mainText?.text || pred.text?.text || '';
          const secondaryText = pred.structuredFormat?.secondaryText?.text || '';
          const fullText = pred.text?.text || mainText;
          if (mainText) {
            mapped.push({ placeId: pred.placeId, mainText, secondaryText, fullText });
          }
        }
        suggestions = mapped;
        showSuggestions = mapped.length > 0;
      } catch {
        suggestions = [];
      }
    }, 250);
  }

  async function handleSelectSuggestion(item: AutocompleteSuggestionItem) {
    searchQuery = item.fullText;
    showSuggestions = false;
    isSearching = true;
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: item.placeId })
      });
      if (res.ok) {
        const data = (await res.json()) as { places?: PlacesApiPlace[] };
        const place = data.places?.[0];
        if (place) {
          const coords = extractPlaceCoords(place);
          if (coords) {
            focusSearchedPlace(extractPlaceName(place, item.mainText), coords, place);
            return;
          }
        }
      }
      await handleSearchSubmit(item.fullText);
    } finally {
      isSearching = false;
    }
  }

  async function handleSearchSubmit(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    isSearching = true;
    showSuggestions = false;
    try {
      const place = await enrichWithPlaceSearch(trimmed);
      if (place) {
        const coords = extractPlaceCoords(place);
        if (coords) {
          focusSearchedPlace(extractPlaceName(place, trimmed), coords, place);
          return;
        }
      }
      mapStatusNotice = `No coordinates returned for "${trimmed}". Try a Lake Tahoe landmark such as "Vikingsholm" or "Mount Tallac".`;
    } finally {
      isSearching = false;
    }
  }

  function handleSelectElevationSample(sample: ElevationSample, index: number) {
    stopAutoPlay();
    activeSampleIndex = index;
    const focusCamera: CameraPreset = {
      center: { lat: sample.location.lat, lng: sample.location.lng, altitude: 18 },
      heading: cameraHeading,
      tilt: 68,
      range: 850
    };
    flyToCamera(focusCamera, 1400);
    activeViewpoint = {
      ...activeViewpoint,
      elevationMeters: sample.elevation,
      location: sample.location
    };
  }

  function toggleMapMode() {
    mapMode = mapMode === 'HYBRID' ? 'SATELLITE' : 'HYBRID';
    const map3d = getTypedMap3D();
    if (map3d) {
      map3d.mode = mapMode;
    }
  }

  function mountPlaceAutocompleteWidget(hostEl: HTMLDivElement | null) {
    gmpAutocompleteHost = hostEl;
    if (!hostEl || !loadedModules || gmpPlaceAutocompleteMounted) return;
    gmpPlaceAutocompleteMounted = true;

    try {
      const { PlaceAutocompleteElement } = loadedModules.places;
      const widget = new PlaceAutocompleteElement({});
      widget.setAttribute('aria-label', 'Google Places Autocomplete');

      widget.addEventListener('gmp-select', async (event: Event) => {
        const selectEvt = event as google.maps.places.PlacePredictionSelectEvent;
        if (!selectEvt.placePrediction) return;
        const place = selectEvt.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI'
          ]
        });

        if (place.location) {
          focusSearchedPlace(
            place.displayName || 'Selected Landmark',
            { lat: place.location.lat(), lng: place.location.lng() },
            {
              id: place.id,
              formattedAddress: place.formattedAddress ?? undefined,
              rating: place.rating ?? undefined,
              userRatingCount: place.userRatingCount ?? undefined,
              googleMapsUri: place.googleMapsURI ?? undefined
            }
          );
        }
      });

      hostEl.replaceChildren(widget);
    } catch {
      // Non-fatal if widget fails to mount
    }
  }

  async function initPhotorealistic3DMap(apiKey: string) {
    try {
      const modules = await loadMaps3DLibraries(apiKey);
      loadedModules = modules;
      mountPlaceAutocompleteWidget(gmpAutocompleteHost);

      await customElements.whenDefined('gmp-map-3d');
      const map3d = getTypedMap3D();
      if (!map3d) return;

      const { Polyline3DElement, Marker3DInteractiveElement, PopoverElement } = modules.maps3d;
      const { PinElement } = modules.marker;

      map3d.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
      map3d.center = INITIAL_MAP_CENTER;
      map3d.range = INITIAL_CAMERA.range;
      map3d.tilt = INITIAL_CAMERA.tilt;
      map3d.heading = INITIAL_CAMERA.heading;
      map3d.mode = mapMode;
      map3d.gestureHandling = 'GREEDY';

      map3d.addEventListener('gmp-headingchange', () => {
        if (typeof map3d.heading === 'number') cameraHeading = map3d.heading;
      });
      map3d.addEventListener('gmp-tiltchange', () => {
        if (typeof map3d.tilt === 'number') cameraTilt = map3d.tilt;
      });
      map3d.addEventListener('gmp-rangechange', () => {
        if (typeof map3d.range === 'number') cameraRange = map3d.range;
      });
      map3d.addEventListener('gmp-error', () => {
        mapStatusNotice =
          'Photorealistic 3D WebGL viewport reported a rendering notice (WebGL2 hardware acceleration may be disabled in this browser).';
      });

      // Render extruded bright-red RGB(255, 0, 0) 3D hiking trail polyline
      const trailPolyline = new Polyline3DElement({
        path: EMERALD_BAY_TRAIL_PATH.map((pt) => ({
          lat: pt.lat,
          lng: pt.lng,
          altitude: 18
        })),
        strokeColor: 'rgb(255, 0, 0)',
        strokeWidth: 8,
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
        drawsOccludedSegments: true
      });
      map3d.append(trailPolyline);

      // Shared 3D Popover element for interactive trailhead & viewpoint markers
      trailPopover = new PopoverElement({
        altitudeMode: 'RELATIVE_TO_GROUND',
        open: false
      });
      map3d.append(trailPopover);

      // Render interactive 3D trailhead and viewpoint markers with PinElement
      for (const chapter of TOUR_CHAPTERS) {
        const marker = new Marker3DInteractiveElement({
          position: chapter.markerPosition,
          altitudeMode: 'RELATIVE_TO_GROUND',
          extruded: true,
          drawsWhenOccluded: true,
          label: chapter.shortLabel,
          title: chapter.title
        });

        const pin = new PinElement({
          glyphText: chapter.glyph,
          background: '#dc2626',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          scale: 1.05
        });
        marker.append(pin);

        marker.addEventListener('gmp-click', () => {
          void selectChapter(chapter, true);
          if (trailPopover) {
            trailPopover.replaceChildren();
            const headingEl = document.createElement('strong');
            headingEl.textContent = chapter.title;
            const bodyEl = document.createElement('p');
            bodyEl.style.margin = '4px 0 0 0';
            bodyEl.style.fontSize = '12px';
            bodyEl.textContent = chapter.description;
            trailPopover.append(headingEl, bodyEl);
            trailPopover.positionAnchor = marker;
            trailPopover.open = true;
          }
        });

        map3d.append(marker);
      }
    } catch {
      mapStatusNotice =
        'Unable to initialize Google Maps 3D WebGL scene. Verify PUBLIC_GOOGLE_MAPS_API_KEY and WebGL2 support.';
    }
  }

  onMount(() => {
    const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!isValidApiKey(apiKey)) {
      mapStatusNotice =
        'Missing PUBLIC_GOOGLE_MAPS_API_KEY. Copy .env.example to .env and add a Google Maps Demo Key or Cloud API key to activate live 3D tiles, Elevation, and Places.';
      return;
    }

    void fetchTrailElevationProfile();
    void enrichWithPlaceSearch(SEED_SEARCH_QUERY).then((seedPlace) => {
      if (seedPlace) {
        activeViewpoint = {
          ...activeViewpoint,
          formattedAddress: seedPlace.formattedAddress,
          rating: seedPlace.rating,
          userRatingCount: seedPlace.userRatingCount,
          googleMapsUri: seedPlace.googleMapsUri
        };
      }
    });
    void initPhotorealistic3DMap(apiKey);
  });

  onDestroy(() => {
    stopAutoPlay();
    if (autocompleteTimer) clearTimeout(autocompleteTimer);
  });
</script>

<main class="trail-explorer-app" data-testid="trail-explorer-app">
  <HeaderBar
    {searchQuery}
    {isSearching}
    {suggestions}
    {showSuggestions}
    heading={cameraHeading}
    tilt={cameraTilt}
    range={cameraRange}
    onSearchQueryChange={handleSearchInputChange}
    onSearchSubmit={handleSearchSubmit}
    onSelectSuggestion={handleSelectSuggestion}
    onAutocompleteMount={mountPlaceAutocompleteWidget}
  />

  <div class="workspace-body">
    <TrailSidebar
      chapters={TOUR_CHAPTERS}
      {activeChapterId}
      {isAutoPlaying}
      {activeViewpoint}
      {elevationSamples}
      {trailMetrics}
      {elevationLoading}
      {elevationError}
      {activeSampleIndex}
      onSelectChapter={(chapter) => selectChapter(chapter, true)}
      onToggleAutoPlay={toggleAutoPlay}
      onSelectElevationSample={handleSelectElevationSample}
    />

    <div class="map-3d-container" data-testid="map-3d-container">
      <gmp-map-3d
        bind:this={map3dEl}
        class="map-3d-element"
        data-testid="gmp-map-3d"
        mode={mapMode}
        range={INITIAL_CAMERA.range}
        tilt={INITIAL_CAMERA.tilt}
        heading={INITIAL_CAMERA.heading}
        gesture-handling="GREEDY"
        internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
      ></gmp-map-3d>

      {#if mapStatusNotice}
        <div class="status-banner" role="status">
          {mapStatusNotice}
        </div>
      {/if}

      <div class="map-floating-controls">
        <button type="button" class="map-pill-btn" onclick={toggleMapMode}>
          Layer: {mapMode === 'HYBRID' ? 'Hybrid 3D' : 'Satellite 3D'}
        </button>
        <button
          type="button"
          class="map-pill-btn"
          onclick={() => selectChapter(TOUR_CHAPTERS[0], true)}
        >
          Reset Overview
        </button>
      </div>

      <div class="trail-legend-pill">
        <span class="trail-swatch" aria-hidden="true"></span>
        <span>Extruded 3D Trail Route &bull; RGB(255, 0, 0)</span>
      </div>
    </div>
  </div>
</main>
