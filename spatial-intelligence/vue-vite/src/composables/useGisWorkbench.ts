import { computed, onBeforeUnmount, ref, type Ref } from 'vue';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import {
  CITYWIDE_AREA_KM2,
  INITIAL_ZOOM,
  NYC_CENTER,
  NYC_DISTRICTS_GEOJSON,
  NYC_SENSOR_POINTS,
  SEED_SEARCH_QUERY,
  computePolygonAreaKm2,
  computePolygonCentroid,
  getDistrictCapacityColor,
  getDistrictFeatureById,
  pointInPolygon,
  samplePolygonElevationPoints,
} from '../data/nycSpatialData';
import type {
  BasemapId,
  CivicHub,
  DeckMode,
  DistrictFeature,
  DrawMode,
  ElevationSamplePoint,
  ElevationStats,
  HoveredSensorInfo,
  SensorPoint,
  ZoneAnalytics,
} from '../types/gis';

let mapsOptionsConfigured = false;

function detectWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return Boolean(gl);
  } catch {
    return false;
  }
}

function createInfoWindowContent(
  title: string,
  subtitle: string,
  meta?: string
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.fontFamily = 'Inter, system-ui, sans-serif';
  wrapper.style.color = '#0f172a';
  wrapper.style.padding = '4px 2px';
  wrapper.style.maxWidth = '240px';

  const heading = document.createElement('div');
  heading.style.fontWeight = '600';
  heading.style.fontSize = '13px';
  heading.style.marginBottom = '4px';
  heading.textContent = title;
  wrapper.appendChild(heading);

  const addressEl = document.createElement('div');
  addressEl.style.fontSize = '12px';
  addressEl.style.color = '#475569';
  addressEl.style.lineHeight = '1.4';
  addressEl.textContent = subtitle;
  wrapper.appendChild(addressEl);

  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.style.fontSize = '11px';
    metaEl.style.color = '#0369a1';
    metaEl.style.marginTop = '6px';
    metaEl.style.fontWeight = '500';
    metaEl.textContent = meta;
    wrapper.appendChild(metaEl);
  }

  return wrapper;
}

export function useGisWorkbench(
  mapContainerRef: Ref<HTMLElement | null>,
  autocompleteContainerRef: Ref<HTMLElement | null>
) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasApiKey =
    Boolean(apiKey) && apiKey !== 'your_google_maps_api_key_here';

  const mapReady = ref(false);
  const mapAuthError = ref(false);
  const mapNotice = ref<string | null>(
    hasApiKey
      ? null
      : 'No VITE_GOOGLE_MAPS_API_KEY detected. Copy .env.example to .env.local and add your Maps Demo Key or Cloud API key to load live Google Maps, Places, and Elevation tiles.'
  );

  const activeBasemap = ref<BasemapId>('roadmap');
  const deckMode = ref<DeckMode>('scatterplot');
  const showGeoJson = ref(true);
  const drawMode = ref<DrawMode>('static');
  const webgl2Supported = ref(true);

  const districts = ref<DistrictFeature[]>(NYC_DISTRICTS_GEOJSON.features);
  const selectedDistrictId = ref<string | null>(null);
  const customPolygonRing = ref<[number, number][] | null>(null);
  const hoveredSensor = ref<HoveredSensorInfo | null>(null);

  const civicHubs = ref<CivicHub[]>([]);
  const civicHubsLoading = ref(false);
  const civicHubsError = ref<string | null>(null);
  const activeHubId = ref<string | null>(null);

  const elevationStats = ref<ElevationStats>({
    loading: false,
    minMeters: null,
    meanMeters: null,
    maxMeters: null,
    resolutionMeters: null,
    sampleCount: 0,
    sourceLabel: 'Citywide Baseline',
    error: null,
    samples: [],
  });

  // Non-reactive Google Maps / Deck.gl / Terra Draw instances
  let mapInstance: google.maps.Map | null = null;
  let infoWindowInstance: google.maps.InfoWindow | null = null;
  let coreLibRef: google.maps.CoreLibrary | null = null;
  let markerLibRef: google.maps.MarkerLibrary | null = null;
  let elevationServiceRef: google.maps.ElevationService | null = null;
  let deckOverlay: GoogleMapsOverlay | null = null;
  let terraDraw: TerraDraw | null = null;
  let searchMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  const hubMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement>();

  const selectedDistrict = computed<DistrictFeature | null>(() => {
    if (!selectedDistrictId.value) return null;
    return getDistrictFeatureById(selectedDistrictId.value) ?? null;
  });

  const filteredSensors = computed<SensorPoint[]>(() => {
    if (customPolygonRing.value && customPolygonRing.value.length >= 3) {
      const ring = customPolygonRing.value;
      return NYC_SENSOR_POINTS.filter((s) => pointInPolygon(s.lng, s.lat, ring));
    }
    if (selectedDistrict.value) {
      const ring = selectedDistrict.value.geometry.coordinates[0];
      return NYC_SENSOR_POINTS.filter((s) => pointInPolygon(s.lng, s.lat, ring));
    }
    return NYC_SENSOR_POINTS;
  });

  const zoneAnalytics = computed<ZoneAnalytics>(() => {
    const sensors = filteredSensors.value;
    const count = sensors.length;
    let sumLoad = 0;
    let peakLoad = 0;

    for (const s of sensors) {
      sumLoad += s.loadPct;
      if (s.loadPct > peakLoad) {
        peakLoad = s.loadPct;
      }
    }

    const avgLoadPct = count > 0 ? Number((sumLoad / count).toFixed(1)) : 0;

    if (customPolygonRing.value && customPolygonRing.value.length >= 3) {
      return {
        scope: 'Custom Terra Draw Zone',
        label: 'Active Study Polygon',
        sensorCount: count,
        avgLoadPct,
        peakLoadPct: peakLoad,
        areaKm2: Number(
          computePolygonAreaKm2(customPolygonRing.value).toFixed(2)
        ),
      };
    }

    if (selectedDistrict.value) {
      return {
        scope: 'Selected District',
        label: selectedDistrict.value.properties.name,
        sensorCount: count,
        avgLoadPct,
        peakLoadPct: peakLoad,
        areaKm2: Number(
          computePolygonAreaKm2(
            selectedDistrict.value.geometry.coordinates[0]
          ).toFixed(2)
        ),
      };
    }

    return {
      scope: 'Citywide',
      label: 'New York City Telemetry Grid',
      sensorCount: count,
      avgLoadPct,
      peakLoadPct: peakLoad,
      areaKm2: CITYWIDE_AREA_KM2,
    };
  });

  function updateGeoJsonStyle(): void {
    if (!mapInstance) return;
    mapInstance.data.setStyle((feature) => {
      if (!showGeoJson.value) {
        return { visible: false };
      }
      const id = String(feature.getProperty('id') ?? '');
      const capacityPct = Number(feature.getProperty('capacityPct') ?? 60);
      const isSelected = selectedDistrictId.value === id;
      const fillColor = getDistrictCapacityColor(capacityPct);

      return {
        visible: true,
        fillColor,
        fillOpacity: isSelected ? 0.36 : 0.18,
        strokeColor: isSelected ? '#38bdf8' : '#e2e8f0',
        strokeOpacity: isSelected ? 1 : 0.72,
        strokeWeight: isSelected ? 3 : 1.4,
        zIndex: isSelected ? 20 : 5,
      };
    });
  }

  function updateDeckLayers(): void {
    if (!deckOverlay || !webgl2Supported.value) return;

    const data = filteredSensors.value;

    try {
      if (deckMode.value === 'scatterplot') {
        const layer = new ScatterplotLayer<SensorPoint>({
          id: 'nyc-infrastructure-scatterplot',
          data,
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          radiusMinPixels: 3.5,
          radiusMaxPixels: 13,
          lineWidthMinPixels: 1,
          getPosition: (d) => [d.lng, d.lat],
          getRadius: (d) => 32 + d.loadPct * 0.65,
          getFillColor: (d) => {
            if (d.loadPct >= 82) return [244, 63, 94, 220];
            if (d.loadPct >= 66) return [245, 158, 11, 215];
            return [16, 185, 129, 205];
          },
          getLineColor: [15, 23, 42, 190],
          onHover: (info) => {
            if (info.object) {
              hoveredSensor.value = {
                x: info.x,
                y: info.y,
                sensor: info.object as SensorPoint,
              };
              return true;
            }
            hoveredSensor.value = null;
            return false;
          },
        });
        deckOverlay.setProps({ layers: [layer] });
      } else {
        const layer = new HexagonLayer<SensorPoint>({
          id: 'nyc-infrastructure-hexagon',
          data,
          pickable: true,
          extruded: true,
          radius: 210,
          elevationScale: 6,
          coverage: 0.86,
          getPosition: (d) => [d.lng, d.lat],
          getElevationWeight: (d) => d.loadPct,
          getColorWeight: (d) => d.loadPct,
          colorRange: [
            [16, 185, 129],
            [56, 189, 248],
            [250, 204, 21],
            [249, 115, 22],
            [244, 63, 94],
          ],
          onHover: () => {
            hoveredSensor.value = null;
            return false;
          },
        });
        deckOverlay.setProps({ layers: [layer] });
      }
    } catch {
      webgl2Supported.value = false;
      deckOverlay = null;
    }
  }

  function syncTerraDrawPolygon(): void {
    if (!terraDraw) return;
    const snapshot = terraDraw.getSnapshot();
    const polygonFeature = snapshot.find(
      (f) => f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates[0])
    );

    if (!polygonFeature || polygonFeature.geometry.type !== 'Polygon') {
      customPolygonRing.value = null;
      updateDeckLayers();
      return;
    }

    const ring = polygonFeature.geometry.coordinates[0] as [number, number][];
    if (ring.length >= 3) {
      customPolygonRing.value = ring;
      selectedDistrictId.value = null;
      updateGeoJsonStyle();
      updateDeckLayers();
      void sampleElevationForActiveScope();
    }
  }

  function initTerraDraw(map: google.maps.Map): void {
    if (terraDraw) return;

    try {
      const adapter = new TerraDrawGoogleMapsAdapter({
        map,
        lib: google.maps,
        coordinatePrecision: 9,
      });

      const draw = new TerraDraw({
        adapter,
        modes: [
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  rotateable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
            },
          }),
          new TerraDrawPolygonMode({
            editable: true,
            styles: {
              fillColor: '#38bdf8',
              fillOpacity: 0.24,
              outlineColor: '#0ea5e9',
              outlineWidth: 2,
              closingPointColor: '#38bdf8',
              closingPointOutlineColor: '#ffffff',
            },
          }),
        ],
      });

      draw.start();
      draw.setMode('static');

      draw.on('finish', () => {
        syncTerraDrawPolygon();
        draw.setMode('select');
        drawMode.value = 'select';
      });

      draw.on('change', () => {
        syncTerraDrawPolygon();
      });

      terraDraw = draw;
    } catch {
      // Fail gracefully if adapter cannot initialize in constrained headless environments
    }
  }

  async function sampleElevationForActiveScope(): Promise<void> {
    let locations: Array<{ lat: number; lng: number }>;
    let sourceLabel = 'Citywide Baseline';

    if (customPolygonRing.value && customPolygonRing.value.length >= 3) {
      locations = samplePolygonElevationPoints(customPolygonRing.value, 10);
      sourceLabel = 'Custom Terra Draw Zone';
    } else if (selectedDistrict.value) {
      locations = samplePolygonElevationPoints(
        selectedDistrict.value.geometry.coordinates[0],
        10
      );
      sourceLabel = selectedDistrict.value.properties.name;
    } else {
      locations = [
        NYC_CENTER,
        ...NYC_DISTRICTS_GEOJSON.features.map((f) =>
          computePolygonCentroid(f.geometry.coordinates[0])
        ),
      ];
    }

    if (!elevationServiceRef) {
      elevationStats.value = {
        ...elevationStats.value,
        loading: false,
        sourceLabel,
        error: hasApiKey
          ? 'Elevation service initializing...'
          : 'Configure VITE_GOOGLE_MAPS_API_KEY to query live Elevation API data.',
      };
      return;
    }

    elevationStats.value = {
      ...elevationStats.value,
      loading: true,
      sourceLabel,
      error: null,
    };

    try {
      const response = await elevationServiceRef.getElevationForLocations({
        locations,
      });

      const results = response.results ?? [];
      if (results.length === 0) {
        elevationStats.value = {
          ...elevationStats.value,
          loading: false,
          error: 'No elevation results returned for this coordinate set.',
        };
        return;
      }

      const samples: ElevationSamplePoint[] = results.map((r) => ({
        lat: r.location ? r.location.lat() : 0,
        lng: r.location ? r.location.lng() : 0,
        elevation: Number(r.elevation.toFixed(2)),
        resolution: Number((r.resolution ?? 0).toFixed(2)),
      }));

      const elevations = samples.map((s) => s.elevation);
      const minMeters = Number(Math.min(...elevations).toFixed(2));
      const maxMeters = Number(Math.max(...elevations).toFixed(2));
      const meanMeters = Number(
        (elevations.reduce((acc, v) => acc + v, 0) / elevations.length).toFixed(2)
      );
      const resolutionMeters = Number(
        (
          samples.reduce((acc, s) => acc + s.resolution, 0) / samples.length
        ).toFixed(1)
      );

      elevationStats.value = {
        loading: false,
        minMeters,
        meanMeters,
        maxMeters,
        resolutionMeters,
        sampleCount: samples.length,
        sourceLabel,
        error: null,
        samples,
      };
    } catch (err) {
      elevationStats.value = {
        ...elevationStats.value,
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to fetch Elevation API terrain profile.',
      };
    }
  }

  async function loadCivicHubs(
    placesLib: google.maps.PlacesLibrary
  ): Promise<void> {
    if (!mapInstance || !markerLibRef) return;

    civicHubsLoading.value = true;
    civicHubsError.value = null;

    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: SEED_SEARCH_QUERY,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
        locationBias: {
          center: NYC_CENTER,
          radius: 12000,
        },
        maxResultCount: 8,
        language: 'en-US',
        region: 'us',
      });

      const resolvedHubs: CivicHub[] = [];
      for (const marker of hubMarkers.values()) {
        marker.map = null;
      }
      hubMarkers.clear();

      places.forEach((place, index) => {
        if (!place.location || !place.id) return;

        const hub: CivicHub = {
          id: place.id,
          displayName: place.displayName ?? 'NYC Civic Hub',
          formattedAddress: place.formattedAddress ?? 'New York, NY',
          lat: place.location.lat(),
          lng: place.location.lng(),
          primaryType: place.types?.[0]?.replace(/_/g, ' ') ?? 'transit hub',
        };
        resolvedHubs.push(hub);

        const pin = new markerLibRef!.PinElement({
          background: '#0284c7',
          borderColor: '#e0f2fe',
          glyphColor: '#ffffff',
          glyphText: String(index + 1),
          scale: 0.88,
        });

        const marker = new markerLibRef!.AdvancedMarkerElement({
          map: mapInstance!,
          position: place.location,
          title: hub.displayName,
        });
        marker.append(pin);
        marker.addListener('click', () => {
          focusCivicHub(hub);
        });

        hubMarkers.set(hub.id, marker);
      });

      civicHubs.value = resolvedHubs;
    } catch (err) {
      civicHubsError.value =
        err instanceof Error
          ? err.message
          : 'Unable to load live NYC civic hubs from Places API (New).';
    } finally {
      civicHubsLoading.value = false;
    }
  }

  function focusCivicHub(hub: CivicHub): void {
    activeHubId.value = hub.id;
    if (!mapInstance) return;

    mapInstance.panTo({ lat: hub.lat, lng: hub.lng });
    const currentZoom = mapInstance.getZoom() ?? INITIAL_ZOOM;
    if (currentZoom < 14) {
      mapInstance.setZoom(14);
    }

    const marker = hubMarkers.get(hub.id);
    if (infoWindowInstance && marker) {
      infoWindowInstance.setContent(
        createInfoWindowContent(
          hub.displayName,
          hub.formattedAddress,
          `Type: ${hub.primaryType}`
        )
      );
      infoWindowInstance.open({
        map: mapInstance,
        anchor: marker,
      });
    }
  }

  function setupPlaceAutocomplete(placesLib: google.maps.PlacesLibrary): void {
    const container = autocompleteContainerRef.value;
    if (!container || !mapInstance || !markerLibRef) return;

    try {
      const autocompleteEl = new placesLib.PlaceAutocompleteElement({
        locationBias: {
          center: NYC_CENTER,
          radius: 20000,
        },
      });
      autocompleteEl.id = 'workbench-place-autocomplete';
      container.replaceChildren(autocompleteEl);

      autocompleteEl.addEventListener('gmp-select', async (rawEvent: Event) => {
        const selectEvent = rawEvent as unknown as {
          placePrediction?: google.maps.places.PlacePrediction;
        };
        if (!selectEvent.placePrediction) return;

        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        if (!place.location || !mapInstance || !markerLibRef) return;

        mapInstance.panTo(place.location);
        mapInstance.setZoom(15);

        if (searchMarker) {
          searchMarker.map = null;
        }

        const pin = new markerLibRef.PinElement({
          background: '#38bdf8',
          borderColor: '#0c4a6e',
          glyphColor: '#082f49',
          glyphText: '★',
          scale: 1,
        });

        searchMarker = new markerLibRef.AdvancedMarkerElement({
          map: mapInstance,
          position: place.location,
          title: place.displayName ?? 'Selected Location',
        });
        searchMarker.append(pin);

        if (infoWindowInstance) {
          infoWindowInstance.setContent(
            createInfoWindowContent(
              place.displayName ?? 'Selected NYC Location',
              place.formattedAddress ?? 'New York, NY',
              'PlaceAutocompleteElement Selection'
            )
          );
          infoWindowInstance.open({
            map: mapInstance,
            anchor: searchMarker,
          });
        }
      });
    } catch {
      // Ignore if PlaceAutocompleteElement fails in unsupported environments
    }
  }

  function setBasemap(basemap: BasemapId): void {
    activeBasemap.value = basemap;
    if (mapInstance) {
      mapInstance.setMapTypeId(basemap);
    }
  }

  function setDeckMode(mode: DeckMode): void {
    deckMode.value = mode;
    updateDeckLayers();
  }

  function toggleGeoJson(): void {
    showGeoJson.value = !showGeoJson.value;
    updateGeoJsonStyle();
  }

  function setDrawMode(mode: DrawMode): void {
    drawMode.value = mode;
    if (terraDraw) {
      terraDraw.setMode(mode);
    }
  }

  function clearDrawZone(): void {
    customPolygonRing.value = null;
    drawMode.value = 'static';
    if (terraDraw) {
      terraDraw.clear();
      terraDraw.setMode('static');
    }
    updateDeckLayers();
    void sampleElevationForActiveScope();
  }

  function selectDistrict(districtId: string | null): void {
    customPolygonRing.value = null;
    if (terraDraw) {
      terraDraw.clear();
      terraDraw.setMode('static');
      drawMode.value = 'static';
    }

    selectedDistrictId.value = districtId;
    updateGeoJsonStyle();
    updateDeckLayers();

    if (mapInstance && coreLibRef) {
      if (!districtId) {
        mapInstance.panTo(NYC_CENTER);
        mapInstance.setZoom(INITIAL_ZOOM);
      } else {
        const district = getDistrictFeatureById(districtId);
        if (district) {
          const bounds = new coreLibRef.LatLngBounds();
          for (const [lng, lat] of district.geometry.coordinates[0]) {
            bounds.extend({ lat, lng });
          }
          mapInstance.fitBounds(bounds, {
            top: 48,
            right: 48,
            bottom: 48,
            left: 48,
          });
        }
      }
    }

    void sampleElevationForActiveScope();
  }

  async function initWorkbench(): Promise<void> {
    const mapEl = mapContainerRef.value;
    if (!mapEl) return;

    if (!hasApiKey) {
      return;
    }

    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure =
      () => {
        mapAuthError.value = true;
        mapNotice.value =
          'Google Maps authentication failed. Verify VITE_GOOGLE_MAPS_API_KEY restrictions and enabled APIs (Maps JS, Places New, Elevation).';
      };

    try {
      if (!mapsOptionsConfigured) {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en',
          region: 'US',
        });
        mapsOptionsConfigured = true;
      }

      const [coreLib, mapsLib, markerLib, placesLib, elevationLib] =
        await Promise.all([
          importLibrary('core'),
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('places'),
          importLibrary('elevation'),
        ]);

      coreLibRef = coreLib;
      markerLibRef = markerLib;
      elevationServiceRef = new elevationLib.ElevationService();

      const map = new mapsLib.Map(mapEl, {
        center: NYC_CENTER,
        zoom: INITIAL_ZOOM,
        mapId: 'DEMO_MAP_ID',
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        mapTypeId: activeBasemap.value,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });

      mapInstance = map;
      infoWindowInstance = new mapsLib.InfoWindow();

      // Add GeoJSON NYC infrastructure districts layer
      map.data.addGeoJson(NYC_DISTRICTS_GEOJSON);
      updateGeoJsonStyle();

      map.data.addListener(
        'click',
        (event: google.maps.Data.MouseEvent) => {
          if (drawMode.value !== 'static') return;
          const id = event.feature.getProperty('id');
          if (typeof id === 'string') {
            selectDistrict(id);
          }
        }
      );

      // Initialize Terra Draw once projection is ready
      map.addListener('projection_changed', () => {
        initTerraDraw(map);
      });

      // Initialize deck.gl overlay only if WebGL2 is available
      const hasWebGL2 = detectWebGL2Support();
      webgl2Supported.value = hasWebGL2;
      if (hasWebGL2) {
        try {
          deckOverlay = new GoogleMapsOverlay({ layers: [] });
          deckOverlay.setMap(map);
          updateDeckLayers();
        } catch {
          webgl2Supported.value = false;
          deckOverlay = null;
        }
      }

      mapReady.value = true;

      setupPlaceAutocomplete(placesLib);
      void loadCivicHubs(placesLib);
      void sampleElevationForActiveScope();
    } catch (err) {
      mapNotice.value =
        err instanceof Error
          ? `Unable to load Google Maps Platform libraries: ${err.message}`
          : 'Unable to load Google Maps Platform libraries.';
    }
  }

  onBeforeUnmount(() => {
    if (deckOverlay) {
      try {
        deckOverlay.setMap(null);
        deckOverlay.finalize();
      } catch {
        // Ignore cleanup errors
      }
      deckOverlay = null;
    }

    if (terraDraw) {
      try {
        terraDraw.stop();
      } catch {
        // Ignore cleanup errors
      }
      terraDraw = null;
    }

    for (const marker of hubMarkers.values()) {
      marker.map = null;
    }
    hubMarkers.clear();

    if (searchMarker) {
      searchMarker.map = null;
      searchMarker = null;
    }

    if (infoWindowInstance) {
      infoWindowInstance.close();
      infoWindowInstance = null;
    }
  });

  return {
    hasApiKey,
    mapReady,
    mapAuthError,
    mapNotice,
    activeBasemap,
    deckMode,
    showGeoJson,
    drawMode,
    webgl2Supported,
    districts,
    selectedDistrictId,
    selectedDistrict,
    customPolygonRing,
    filteredSensors,
    hoveredSensor,
    zoneAnalytics,
    elevationStats,
    civicHubs,
    civicHubsLoading,
    civicHubsError,
    activeHubId,
    initWorkbench,
    setBasemap,
    setDeckMode,
    toggleGeoJson,
    setDrawMode,
    clearDrawZone,
    selectDistrict,
    focusCivicHub,
    sampleElevationForActiveScope,
  };
}
