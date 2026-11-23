<script lang="ts">
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import {
    TerraDraw,
    TerraDrawPolygonMode,
    TerraDrawSelectMode
  } from 'terra-draw';
  import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
  import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

  import {
    NYC_CENTER,
    NYC_DEFAULT_ZOOM,
    NYC_DISTRICTS_GEOJSON,
    NYC_INFRASTRUCTURE_SENSORS
  } from '$lib/data/nycSpatialData';
  import type {
    BasemapType,
    CivicPlaceAnchor,
    DeckLayerMode,
    DistrictFeature,
    ElevationApiResponse,
    ElevationSummary,
    PlacesSearchApiResponse,
    SensorPoint,
    ZoneAnalyticsSummary
  } from '$lib/types/gis';
  import {
    buildElevationSampleLocations,
    computeBoundsForRing,
    computePolygonAreaKm2,
    getCapacityColor,
    isPointInPolygonRings,
    isWebGL2Supported
  } from '$lib/utils/geo';
  import {
    createDeckOverlayController,
    type DeckOverlayController
  } from '$lib/maps/deckLayers';

  type TerraDrawModeState = 'static' | 'polygon' | 'select';

  const BASEMAP_OPTIONS: Array<{ id: BasemapType; label: string }> = [
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'satellite', label: 'Satellite' },
    { id: 'hybrid', label: 'Hybrid' },
    { id: 'terrain', label: 'Terrain' }
  ];

  const districts: DistrictFeature[] = NYC_DISTRICTS_GEOJSON.features;

  // UI & GIS Workbench State
  let basemapType = $state<BasemapType>('roadmap');
  let deckMode = $state<DeckLayerMode>('scatterplot');
  let showGeoJson = $state<boolean>(true);
  let selectedDistrictId = $state<string | null>(null);
  let customPolygonRings = $state<number[][][] | null>(null);
  let terraDrawMode = $state<TerraDrawModeState>('static');

  let webgl2Available = $state<boolean>(true);
  let mapsInitialized = $state<boolean>(false);
  let terraDrawReady = $state<boolean>(false);
  let apiKeyMissing = $state<boolean>(false);
  let mapsInitNotice = $state<string | null>(null);

  // Elevation State
  let elevationLoading = $state<boolean>(false);
  let elevationSummary = $state<ElevationSummary | null>(null);
  let elevationStatusText = $state<string>(
    'Select a district, draw a custom polygon, or sample NYC terrain elevation.'
  );

  // Live Civic Reference Hubs (Places API New)
  let civicPlacesLoading = $state<boolean>(false);
  let civicPlaces = $state<CivicPlaceAnchor[]>([]);
  let civicPlacesNotice = $state<string | null>(null);
  let selectedPlaceId = $state<string | null>(null);

  // DOM Refs
  let mapContainerEl: HTMLDivElement | undefined = $state();
  let autocompleteHostEl: HTMLDivElement | undefined = $state();

  // Imperative GIS Runtime Instances
  let mapInstance: google.maps.Map | null = null;
  let deckController: DeckOverlayController | null = null;
  let terraDrawInstance: TerraDraw | null = null;
  let infoWindowInstance: google.maps.InfoWindow | null = null;
  let markerLibraryRef: google.maps.MarkerLibrary | null = null;
  let civicMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
  let searchFocusMarker: google.maps.marker.AdvancedMarkerElement | null = null;

  // Derived Filtered Sensors & Zone Analytics
  const filteredSensors = $derived.by<SensorPoint[]>(() => {
    const customRings = customPolygonRings;
    if (customRings && customRings.length > 0) {
      return NYC_INFRASTRUCTURE_SENSORS.filter((sensor) =>
        isPointInPolygonRings(sensor.lng, sensor.lat, customRings)
      );
    }

    if (selectedDistrictId) {
      return NYC_INFRASTRUCTURE_SENSORS.filter(
        (sensor) => sensor.districtId === selectedDistrictId
      );
    }

    return NYC_INFRASTRUCTURE_SENSORS;
  });

  const selectedDistrict = $derived.by<DistrictFeature | null>(() => {
    if (!selectedDistrictId) return null;
    return (
      districts.find((d) => d.properties.id === selectedDistrictId) ?? null
    );
  });

  const zoneAnalytics = $derived.by<ZoneAnalyticsSummary>(() => {
    const activeSensors = filteredSensors;
    const count = activeSensors.length;

    const avgLoad =
      count > 0
        ? Number(
            (
              activeSensors.reduce((sum, s) => sum + s.loadPct, 0) / count
            ).toFixed(1)
          )
        : 0;

    const peakLoad =
      count > 0 ? Math.max(...activeSensors.map((s) => s.loadPct)) : 0;

    const totalOutputMW = Number(
      activeSensors.reduce((sum, s) => sum + s.outputMW, 0).toFixed(1)
    );

    if (customPolygonRings && customPolygonRings.length > 0) {
      return {
        scope: 'custom',
        scopeLabel: 'Custom Terra Draw Zone',
        sensorCount: count,
        avgCapacityLoadPct: avgLoad,
        peakCapacityLoadPct: peakLoad,
        totalOutputMW,
        areaKm2: Number(
          computePolygonAreaKm2(customPolygonRings[0]).toFixed(2)
        )
      };
    }

    if (selectedDistrict) {
      return {
        scope: 'district',
        scopeLabel: selectedDistrict.properties.name,
        sensorCount: count,
        avgCapacityLoadPct: avgLoad,
        peakCapacityLoadPct: peakLoad,
        totalOutputMW,
        areaKm2: Number(
          computePolygonAreaKm2(
            selectedDistrict.geometry.coordinates[0]
          ).toFixed(2)
        )
      };
    }

    const totalArea = districts.reduce(
      (sum, f) => sum + computePolygonAreaKm2(f.geometry.coordinates[0]),
      0
    );

    return {
      scope: 'citywide',
      scopeLabel: 'NYC Citywide Grid',
      sensorCount: count,
      avgCapacityLoadPct: avgLoad,
      peakCapacityLoadPct: peakLoad,
      totalOutputMW,
      areaKm2: Number(totalArea.toFixed(2))
    };
  });

  // Sync deck.gl overlay whenever layer mode or filtered sensors change
  $effect(() => {
    const mode = deckMode;
    const sensors = filteredSensors;
    if (deckController) {
      deckController.update(mode, sensors, true);
    }
  });

  // Sync GeoJSON Data Layer styling when toggle, selection, or draw mode changes
  $effect(() => {
    const visible = showGeoJson;
    const activeDistrict = selectedDistrictId;
    const drawMode = terraDrawMode;
    if (mapInstance) {
      applyGeoJsonStyle(mapInstance, visible, activeDistrict, drawMode);
    }
  });

  function applyGeoJsonStyle(
    map: google.maps.Map,
    visible: boolean,
    activeId: string | null,
    drawMode: TerraDrawModeState
  ): void {
    map.data.setStyle((feature) => {
      if (!visible) {
        return { visible: false };
      }
      const featureId = String(feature.getProperty('id') ?? '');
      const utilization = Number(
        feature.getProperty('capacityUtilization') ?? 60
      );
      const isSelected = activeId !== null && featureId === activeId;
      const color = getCapacityColor(utilization);

      return {
        visible: true,
        fillColor: color,
        fillOpacity: isSelected ? 0.42 : activeId ? 0.14 : 0.24,
        strokeColor: isSelected ? '#f8fafc' : color,
        strokeWeight: isSelected ? 3 : 1.5,
        strokeOpacity: isSelected ? 0.95 : 0.78,
        clickable: drawMode === 'static'
      };
    });
  }

  function handleBasemapChange(nextBasemap: BasemapType): void {
    basemapType = nextBasemap;
    if (mapInstance) {
      mapInstance.setMapTypeId(nextBasemap);
    }
  }

  function handleDeckModeChange(nextMode: DeckLayerMode): void {
    deckMode = nextMode;
  }

  function toggleGeoJsonLayer(): void {
    showGeoJson = !showGeoJson;
  }

  function fitMapToCoordinates(ring: number[][]): void {
    if (!mapInstance || ring.length === 0) return;
    const bounds = computeBoundsForRing(ring);
    mapInstance.fitBounds(bounds, {
      top: 56,
      right: 36,
      bottom: 56,
      left: 36
    });
  }

  async function selectDistrict(district: DistrictFeature): Promise<void> {
    const nextId =
      selectedDistrictId === district.properties.id
        ? null
        : district.properties.id;

    customPolygonRings = null;
    if (terraDrawInstance) {
      terraDrawInstance.clear();
      terraDrawInstance.setMode('static');
      terraDrawMode = 'static';
    }

    selectedDistrictId = nextId;

    if (nextId) {
      fitMapToCoordinates(district.geometry.coordinates[0]);
      const sampleLocs = buildElevationSampleLocations(
        district.geometry.coordinates[0],
        10
      );
      await fetchElevationProfile(sampleLocs, district.properties.name);
    } else if (mapInstance) {
      mapInstance.panTo(NYC_CENTER);
      mapInstance.setZoom(NYC_DEFAULT_ZOOM);
      await sampleCurrentScopeElevation();
    }
  }

  function resetToCitywide(): void {
    selectedDistrictId = null;
    customPolygonRings = null;
    if (terraDrawInstance) {
      terraDrawInstance.clear();
      terraDrawInstance.setMode('static');
      terraDrawMode = 'static';
    }
    if (mapInstance) {
      mapInstance.panTo(NYC_CENTER);
      mapInstance.setZoom(NYC_DEFAULT_ZOOM);
    }
  }

  function setTerraDrawTool(mode: TerraDrawModeState): void {
    terraDrawMode = mode;
    if (mapInstance) {
      mapInstance.setOptions({ disableDoubleClickZoom: mode === 'polygon' });
    }
    if (!terraDrawInstance) return;
    terraDrawInstance.setMode(mode);
  }

  function clearTerraDrawZone(): void {
    customPolygonRings = null;
    terraDrawMode = 'static';
    if (mapInstance) {
      mapInstance.setOptions({ disableDoubleClickZoom: false });
    }
    if (terraDrawInstance) {
      terraDrawInstance.clear();
      terraDrawInstance.setMode('static');
    }
    if (selectedDistrict) {
      const sampleLocs = buildElevationSampleLocations(
        selectedDistrict.geometry.coordinates[0],
        10
      );
      void fetchElevationProfile(sampleLocs, selectedDistrict.properties.name);
    } else {
      elevationSummary = null;
      elevationStatusText =
        'Custom study zone cleared. Select a district or draw a zone to sample elevation.';
    }
  }

  function syncCustomZoneFromTerraDraw(): void {
    if (!terraDrawInstance) return;
    const snapshot = terraDrawInstance.getSnapshot();
    const polygons = snapshot.filter(
      (f) => f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates)
    );

    if (polygons.length === 0) {
      customPolygonRings = null;
      return;
    }

    const latest = polygons[polygons.length - 1];
    const coords = latest.geometry.coordinates as number[][][];
    if (!coords.length || coords[0].length < 4) {
      return;
    }

    selectedDistrictId = null;
    customPolygonRings = coords;
  }

  async function fetchElevationProfile(
    locations: Array<{ lat: number; lng: number }>,
    label: string
  ): Promise<void> {
    if (locations.length === 0) return;
    elevationLoading = true;
    elevationStatusText = `Sampling terrain elevation across ${label}...`;

    try {
      const res = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
      });

      const payload = (await res.json()) as ElevationApiResponse;
      if (payload.ok && payload.summary) {
        elevationSummary = payload.summary;
        elevationStatusText = `${payload.summary.sampleCount} terrain points sampled for ${label}.`;
      } else {
        elevationSummary = null;
        elevationStatusText =
          payload.error ||
          `Elevation API unavailable (${payload.status}).`;
      }
    } catch {
      elevationSummary = null;
      elevationStatusText = 'Unable to reach /api/elevation service.';
    } finally {
      elevationLoading = false;
    }
  }

  async function sampleCurrentScopeElevation(): Promise<void> {
    if (customPolygonRings && customPolygonRings.length > 0) {
      const locs = buildElevationSampleLocations(customPolygonRings[0], 12);
      await fetchElevationProfile(locs, 'Custom Terra Draw Zone');
      return;
    }

    if (selectedDistrict) {
      const locs = buildElevationSampleLocations(
        selectedDistrict.geometry.coordinates[0],
        10
      );
      await fetchElevationProfile(locs, selectedDistrict.properties.name);
      return;
    }

    const citywideCorridor = [
      { lat: 40.7061, lng: -74.0092 },
      { lat: 40.73061, lng: -73.98661 },
      { lat: 40.7527, lng: -73.9772 },
      { lat: 40.7794, lng: -73.9632 },
      { lat: 40.6928, lng: -73.9857 },
      { lat: 40.7505, lng: -73.9401 }
    ];
    await fetchElevationProfile(citywideCorridor, 'NYC Reference Corridor');
  }

  function openInfoWindowForPlace(
    title: string,
    address: string,
    position: google.maps.LatLngLiteral,
    anchor?: google.maps.marker.AdvancedMarkerElement
  ): void {
    if (!mapInstance || !infoWindowInstance) return;

    const container = document.createElement('div');
    container.style.color = '#0f172a';
    container.style.maxWidth = '240px';
    container.style.fontFamily = 'Inter, sans-serif';

    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = '700';
    titleEl.style.fontSize = '13px';
    titleEl.style.marginBottom = '3px';
    titleEl.textContent = title;

    const addrEl = document.createElement('div');
    addrEl.style.fontSize = '12px';
    addrEl.style.color = '#475569';
    addrEl.textContent = address;

    container.appendChild(titleEl);
    container.appendChild(addrEl);

    infoWindowInstance.setContent(container);
    if (anchor) {
      infoWindowInstance.open({ map: mapInstance, anchor });
    } else {
      infoWindowInstance.setPosition(position);
      infoWindowInstance.open({ map: mapInstance });
    }
  }

  function renderCivicHubMarkers(places: CivicPlaceAnchor[]): void {
    if (!mapInstance || !markerLibraryRef) return;
    const { AdvancedMarkerElement, PinElement } = markerLibraryRef;

    for (const marker of civicMarkers) {
      marker.map = null;
    }
    civicMarkers = [];

    places.forEach((place, idx) => {
      const pin = new PinElement({
        glyphText: String(idx + 1),
        background: '#0ea5e9',
        borderColor: '#f8fafc',
        glyphColor: '#0f172a',
        scale: 0.9
      });

      const marker = new AdvancedMarkerElement({
        map: mapInstance,
        position: {
          lat: place.location.latitude,
          lng: place.location.longitude
        },
        title: place.displayName
      });
      marker.append(pin);

      marker.addListener('click', () => {
        selectedPlaceId = place.id;
        openInfoWindowForPlace(
          place.displayName,
          place.formattedAddress,
          { lat: place.location.latitude, lng: place.location.longitude },
          marker
        );
      });

      civicMarkers.push(marker);
    });
  }

  async function focusCivicPlace(place: CivicPlaceAnchor): Promise<void> {
    selectedPlaceId = place.id;
    const pos = {
      lat: place.location.latitude,
      lng: place.location.longitude
    };

    if (mapInstance) {
      mapInstance.panTo(pos);
      mapInstance.setZoom(14);
      const markerIdx = civicPlaces.findIndex((p) => p.id === place.id);
      const marker = markerIdx >= 0 ? civicMarkers[markerIdx] : undefined;
      openInfoWindowForPlace(
        place.displayName,
        place.formattedAddress,
        pos,
        marker
      );
    }

    await fetchElevationProfile([pos], place.displayName);
  }

  async function loadCivicReferenceHubs(): Promise<void> {
    civicPlacesLoading = true;
    civicPlacesNotice = null;
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery: 'New York City civic transit hub',
          maxResultCount: 8
        })
      });

      const payload = (await res.json()) as PlacesSearchApiResponse;
      if (payload.ok && payload.places.length > 0) {
        civicPlaces = payload.places;
        renderCivicHubMarkers(payload.places);
      } else {
        civicPlaces = [];
        civicPlacesNotice =
          payload.error ||
          'Add PUBLIC_GOOGLE_MAPS_API_KEY in .env to load live NYC civic reference hubs.';
      }
    } catch {
      civicPlaces = [];
      civicPlacesNotice = 'Unable to reach /api/places/search endpoint.';
    } finally {
      civicPlacesLoading = false;
    }
  }

  onMount(() => {
    webgl2Available = isWebGL2Supported();
    const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
    const hasValidKey =
      apiKey.length > 0 && apiKey !== 'your_google_maps_api_key_here';

    if (!hasValidKey) {
      apiKeyMissing = true;
      mapsInitNotice =
        'PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Map tiles require a Maps Demo Key or Google Cloud API key in .env.';
      void loadCivicReferenceHubs();
      return;
    }

    let cancelled = false;

    const initWorkbench = async () => {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en',
          region: 'US'
        });

        const [, mapsLib, markerLib, placesLib] = await Promise.all([
          importLibrary('core'),
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('places'),
          importLibrary('elevation')
        ]);

        if (cancelled || !mapContainerEl) return;

        markerLibraryRef = markerLib;

        const map = new mapsLib.Map(mapContainerEl, {
          center: NYC_CENTER,
          zoom: NYC_DEFAULT_ZOOM,
          mapId: 'DEMO_MAP_ID',
          mapTypeId: basemapType,
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true
        });

        mapInstance = map;
        infoWindowInstance = new mapsLib.InfoWindow();

        // Mount PlaceAutocompleteElement imperatively
        if (autocompleteHostEl) {
          const autocompleteEl = new placesLib.PlaceAutocompleteElement({
            locationBias: {
              north: 40.92,
              south: 40.49,
              east: -73.7,
              west: -74.26
            },
            includedRegionCodes: ['us']
          });

          autocompleteEl.addEventListener('gmp-select', async (event: Event) => {
            const selectEvent =
              event as google.maps.places.PlacePredictionSelectEvent;
            const place = selectEvent.placePrediction.toPlace();
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'location', 'viewport']
            });

            if (!place.location || !mapInstance || !markerLibraryRef) return;

            if (place.viewport) {
              mapInstance.fitBounds(place.viewport);
            } else {
              mapInstance.panTo(place.location);
              mapInstance.setZoom(15);
            }

            if (searchFocusMarker) {
              searchFocusMarker.map = null;
            }
            const pin = new markerLibraryRef.PinElement({
              glyphText: '★',
              background: '#f59e0b',
              borderColor: '#0f172a',
              glyphColor: '#0f172a'
            });
            searchFocusMarker = new markerLibraryRef.AdvancedMarkerElement({
              map: mapInstance,
              position: place.location,
              title: place.displayName ?? 'Selected Location'
            });
            searchFocusMarker.append(pin);

            const lat = place.location.lat();
            const lng = place.location.lng();
            openInfoWindowForPlace(
              place.displayName ?? 'Selected Location',
              place.formattedAddress ?? 'New York, NY',
              { lat, lng },
              searchFocusMarker
            );
            void fetchElevationProfile(
              [{ lat, lng }],
              place.displayName ?? 'Selected Location'
            );
          });

          autocompleteHostEl.replaceChildren(autocompleteEl as unknown as Node);
        }

        // Load NYC GeoJSON District Boundaries into Google Maps Data Layer
        map.data.addGeoJson(NYC_DISTRICTS_GEOJSON);
        applyGeoJsonStyle(map, showGeoJson, selectedDistrictId, terraDrawMode);

        map.data.addListener('click', (event: google.maps.Data.MouseEvent) => {
          if (terraDrawMode !== 'static') return;
          const clickedId = String(event.feature.getProperty('id') ?? '');
          const matched = districts.find(
            (d) => d.properties.id === clickedId
          );
          if (matched) {
            void selectDistrict(matched);
          }
        });

        // Initialize deck.gl GoogleMapsOverlay safely after WebGL2 check
        if (webgl2Available) {
          try {
            deckController = await createDeckOverlayController(
              map,
              deckMode,
              filteredSensors
            );
          } catch {
            webgl2Available = false;
          }
        }

        // Initialize Terra Draw once projection is ready
        const ensureTerraDrawInitialized = () => {
          if (terraDrawInstance || !map.getProjection()) return;
          const draw = new TerraDraw({
            adapter: new TerraDrawGoogleMapsAdapter({
              map,
              lib: google.maps,
              coordinatePrecision: 9
            }),
            modes: [
              new TerraDrawSelectMode({
                flags: {
                  polygon: {
                    feature: {
                      draggable: true,
                      coordinates: {
                        midpoints: true,
                        draggable: true,
                        deletable: true
                      }
                    }
                  }
                }
              }),
              new TerraDrawPolygonMode()
            ]
          });

          draw.start();
          draw.setMode(terraDrawMode);

          draw.on('finish', () => {
            syncCustomZoneFromTerraDraw();
            draw.setMode('select');
            terraDrawMode = 'select';
            map.setOptions({ disableDoubleClickZoom: false });
            if (customPolygonRings && customPolygonRings.length > 0) {
              const locs = buildElevationSampleLocations(
                customPolygonRings[0],
                12
              );
              void fetchElevationProfile(locs, 'Custom Terra Draw Zone');
            }
          });

          draw.on('change', () => {
            if (terraDrawMode === 'select') {
              syncCustomZoneFromTerraDraw();
            }
          });

          terraDrawInstance = draw;
          terraDrawReady = true;
        };

        ensureTerraDrawInitialized();
        map.addListener('projection_changed', ensureTerraDrawInitialized);
        map.addListener('idle', ensureTerraDrawInitialized);

        mapsInitialized = true;

        // Fetch live civic anchors & initial NYC terrain sample
        await Promise.all([
          loadCivicReferenceHubs(),
          sampleCurrentScopeElevation()
        ]);
      } catch {
        mapsInitNotice =
          'Unable to initialize Google Maps JavaScript API. Check your API key and enabled APIs.';
      }
    };

    void initWorkbench();

    return () => {
      cancelled = true;
      deckController?.destroy();
      deckController = null;
      terraDrawInstance?.stop();
      terraDrawInstance = null;
      for (const m of civicMarkers) {
        m.map = null;
      }
      civicMarkers = [];
      if (searchFocusMarker) {
        searchFocusMarker.map = null;
      }
    };
  });
</script>

<div class="workbench-shell">
  <!-- Top Header Bar -->
  <header class="workbench-header" data-testid="workbench-header">
    <div class="brand-cluster">
      <div class="brand-badge" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
      <div class="brand-titles">
        <h1>NYC Spatial Intelligence</h1>
        <span>Enterprise GIS Workbench</span>
      </div>
    </div>

    <div class="header-controls">
      <div class="autocomplete-slot" bind:this={autocompleteHostEl}>
        {#if apiKeyMissing}
          <div class="autocomplete-fallback">
            Place search activates with API key
          </div>
        {/if}
      </div>

      <!-- Basemap Switcher -->
      <div
        class="segmented-group"
        role="group"
        aria-label="Basemap Type"
        data-testid="basemap-switcher"
      >
        {#each BASEMAP_OPTIONS as option}
          <button
            type="button"
            class="seg-btn"
            class:active={basemapType === option.id}
            data-testid={`basemap-btn-${option.id}`}
            onclick={() => handleBasemapChange(option.id)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      <!-- deck.gl & GeoJSON Controls -->
      <div
        class="header-controls"
        data-testid="deckgl-layer-controls"
      >
        <div class="segmented-group" role="group" aria-label="deck.gl Layer Mode">
          <button
            type="button"
            class="seg-btn"
            class:active={deckMode === 'scatterplot'}
            data-testid="deckgl-mode-scatterplot"
            onclick={() => handleDeckModeChange('scatterplot')}
          >
            Scatterplot
          </button>
          <button
            type="button"
            class="seg-btn"
            class:active={deckMode === 'hexagon'}
            data-testid="deckgl-mode-hexagon"
            onclick={() => handleDeckModeChange('hexagon')}
          >
            Hexagon
          </button>
        </div>

        <button
          type="button"
          class="toggle-pill"
          class:active={showGeoJson}
          data-testid="toggle-geojson-btn"
          onclick={toggleGeoJsonLayer}
        >
          GeoJSON Zones: {showGeoJson ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  </header>

  <!-- Split-Screen Analytical Workbench -->
  <div class="workbench-body">
    <!-- Left Analytical Sidebar (380px) -->
    <aside class="sidebar-pane">
      <!-- 1. Zone Analytics KPI Card -->
      <section class="panel-card" data-testid="zone-analytics-panel">
        <div class="panel-header">
          <h2 class="panel-title">Zone Analytics</h2>
          <span
            class="scope-badge"
            class:custom={zoneAnalytics.scope === 'custom'}
            class:district={zoneAnalytics.scope === 'district'}
          >
            {zoneAnalytics.scope === 'custom'
              ? 'Custom Zone'
              : zoneAnalytics.scope === 'district'
                ? 'District'
                : 'Citywide'}
          </span>
        </div>

        <div class="panel-header">
          <strong style="font-size: 0.84rem; color: var(--text-primary);">
            {zoneAnalytics.scopeLabel}
          </strong>
          {#if zoneAnalytics.scope !== 'citywide'}
            <button
              type="button"
              class="ghost-btn"
              onclick={resetToCitywide}
            >
              Reset
            </button>
          {/if}
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <span class="kpi-label">Filtered Sensors</span>
            <span class="kpi-value">
              {zoneAnalytics.sensorCount.toLocaleString()}
            </span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Study Area</span>
            <span class="kpi-value">{zoneAnalytics.areaKm2} km²</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Avg / Peak Load</span>
            <span class="kpi-value">
              {zoneAnalytics.avgCapacityLoadPct}% / {zoneAnalytics.peakCapacityLoadPct}%
            </span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Total Load</span>
            <span class="kpi-value">{zoneAnalytics.totalOutputMW} MW</span>
          </div>
        </div>
      </section>

      <!-- 2. Terrain Elevation Inspector -->
      <section class="panel-card" data-testid="elevation-inspector-card">
        <div class="panel-header">
          <h2 class="panel-title">Terrain Elevation</h2>
          <button
            type="button"
            class="action-btn"
            data-testid="sample-elevation-btn"
            disabled={elevationLoading}
            onclick={() => void sampleCurrentScopeElevation()}
          >
            {elevationLoading ? 'Sampling…' : 'Sample Elevation'}
          </button>
        </div>

        {#if elevationSummary}
          <div class="elevation-metrics">
            <div class="elev-pill">
              <span>Min</span>
              <strong>{elevationSummary.minElevation} m</strong>
            </div>
            <div class="elev-pill">
              <span>Mean</span>
              <strong>{elevationSummary.meanElevation} m</strong>
            </div>
            <div class="elev-pill">
              <span>Max</span>
              <strong>{elevationSummary.maxElevation} m</strong>
            </div>
          </div>
          <p class="meta-note">
            Resolution: {elevationSummary.meanResolution} m avg ·
            {elevationStatusText}
          </p>
        {:else}
          <p class="meta-note">{elevationStatusText}</p>
        {/if}
      </section>

      <!-- 3. NYC District Capacity Directory -->
      <section class="panel-card" data-testid="district-selector-list">
        <div class="panel-header">
          <h2 class="panel-title">NYC Capacity Districts</h2>
          <span class="meta-note">{districts.length} zones</span>
        </div>

        <div class="district-list">
          {#each districts as district}
            {@const props = district.properties}
            {@const isSelected = selectedDistrictId === props.id}
            {@const fillColor = getCapacityColor(props.capacityUtilization)}
            <button
              type="button"
              class="district-item"
              class:selected={isSelected}
              data-testid={`district-item-${props.id}`}
              onclick={() => void selectDistrict(district)}
            >
              <div class="district-row-top">
                <span class="district-name">{props.name}</span>
                <span class="district-util" style="color: {fillColor};">
                  {props.capacityUtilization}%
                </span>
              </div>
              <div class="district-row-sub">
                <span>{props.borough} · {props.substationCount} substations</span>
                <span>{props.capacityMW} MW · {props.status}</span>
              </div>
              <div class="util-bar-track">
                <div
                  class="util-bar-fill"
                  style="width: {props.capacityUtilization}%; background: {fillColor};"
                ></div>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <!-- 4. Live NYC Civic Reference Hubs -->
      <section class="panel-card" data-testid="live-places-panel">
        <div class="panel-header">
          <h2 class="panel-title">NYC Civic Reference Hubs</h2>
          <span class="meta-note">Places API (New)</span>
        </div>

        {#if civicPlacesLoading}
          <p class="meta-note">Querying live NYC civic transit hubs…</p>
        {:else if civicPlaces.length > 0}
          <div class="places-list">
            {#each civicPlaces as place, idx}
              <button
                type="button"
                class="place-item"
                class:selected={selectedPlaceId === place.id}
                onclick={() => void focusCivicPlace(place)}
              >
                <span class="place-name">{idx + 1}. {place.displayName}</span>
                <span class="place-addr">{place.formattedAddress}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="meta-note">
            {civicPlacesNotice ??
              'No live civic transit hubs loaded yet.'}
          </p>
        {/if}
      </section>
    </aside>

    <!-- Right Map Workspace Pane -->
    <main class="map-pane">
      <!-- Floating Top-Left Terra Draw Toolbar -->
      <div
        class="terradraw-toolbar"
        data-testid="terradraw-toolbar"
        data-terradraw-ready={terraDrawReady ? 'true' : 'false'}
      >
        <span class="td-label">Study Zone</span>
        <button
          type="button"
          class="td-btn"
          class:active={terraDrawMode === 'polygon'}
          data-testid="terradraw-polygon-btn"
          onclick={() => setTerraDrawTool('polygon')}
        >
          Draw Polygon
        </button>
        <button
          type="button"
          class="td-btn"
          class:active={terraDrawMode === 'select'}
          data-testid="terradraw-select-btn"
          onclick={() => setTerraDrawTool('select')}
        >
          Select / Edit
        </button>
        <button
          type="button"
          class="td-btn"
          data-testid="terradraw-clear-btn"
          onclick={clearTerraDrawZone}
        >
          Clear Zone
        </button>
      </div>

      <!-- Map Canvas -->
      <div
        class="map-canvas"
        data-testid="map-canvas"
        bind:this={mapContainerEl}
      ></div>

      {#if apiKeyMissing || mapsInitNotice}
        <div class="config-banner" role="status">
          <h3>Google Maps API Key Required for Live Tiles</h3>
          <p>{mapsInitNotice}</p>
          <p>
            Prototype free with a
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noreferrer"
            >
              Maps Demo Key
            </a>
            and set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env</code>.
          </p>
        </div>
      {/if}

      <!-- Floating Bottom-Left Capacity & Layer Legend -->
      <div class="map-legend">
        <div class="legend-title">District Capacity Utilization</div>
        <div class="legend-scale">
          <span class="legend-chip">
            <i class="legend-swatch" style="background:#0ea5e9"></i>&lt;55%
          </span>
          <span class="legend-chip">
            <i class="legend-swatch" style="background:#14b8a6"></i>55–69%
          </span>
          <span class="legend-chip">
            <i class="legend-swatch" style="background:#eab308"></i>70–79%
          </span>
          <span class="legend-chip">
            <i class="legend-swatch" style="background:#f97316"></i>80–89%
          </span>
          <span class="legend-chip">
            <i class="legend-swatch" style="background:#ef4444"></i>&ge;90%
          </span>
        </div>
        <div class="legend-status">
          <span>
            deck.gl: {webgl2Available ? deckMode : 'WebGL2 fallback'}
          </span>
          <span>
            {mapsInitialized ? 'Maps JS Ready' : 'Standby'}
          </span>
        </div>
      </div>
    </main>
  </div>
</div>
