import {
  setOptions,
  importLibrary,
  GoogleMapsOverlay,
  ScatterplotLayer,
  HexagonLayer,
  TerraDraw,
  TerraDrawSelectMode,
  TerraDrawPolygonMode,
  TerraDrawGoogleMapsAdapter,
} from '/assets/vendor.mjs';

const state = {
  config: null,
  districts: [],
  districtGeoJson: null,
  sensors: [],
  activeBasemap: 'roadmap',
  deckMode: 'scatterplot',
  showGeoJson: true,
  selectedDistrictId: null,
  customPolygonRing: null,
  drawMode: 'static',
  places: [],
  selectedPlaceId: null,
  webgl2Available: false,
};

let map = null;
let deckOverlay = null;
let draw = null;
let drawReady = false;
let pendingDrawMode = null;
let infoWindow = null;
let searchMarker = null;
let civicMarkers = [];
let AdvancedMarkerCtor = null;
let PinElementCtor = null;

const el = {
  autocompleteMount: document.getElementById('autocomplete-mount'),
  basemapSwitcher: document.querySelector('[data-testid="basemap-switcher"]'),
  deckControls: document.querySelector('[data-testid="deckgl-layer-controls"]'),
  toggleGeoJsonBtn: document.querySelector('[data-testid="toggle-geojson-btn"]'),
  zoneScopeTitle: document.getElementById('zone-scope-title'),
  zoneScopePill: document.getElementById('zone-scope-pill'),
  resetScopeBtn: document.getElementById('reset-scope-btn'),
  kpiSensorCount: document.getElementById('kpi-sensor-count'),
  kpiAvgLoad: document.getElementById('kpi-avg-load'),
  kpiPeakLoad: document.getElementById('kpi-peak-load'),
  kpiZoneArea: document.getElementById('kpi-zone-area'),
  deckglRuntimeNote: document.getElementById('deckgl-runtime-note'),
  sampleElevationBtn: document.querySelector('[data-testid="sample-elevation-btn"]'),
  elevMin: document.getElementById('elev-min'),
  elevMean: document.getElementById('elev-mean'),
  elevMax: document.getElementById('elev-max'),
  elevRes: document.getElementById('elev-res'),
  elevationBars: document.getElementById('elevation-bars'),
  elevationStatusText: document.getElementById('elevation-status-text'),
  districtList: document.getElementById('district-selector-list'),
  districtCountBadge: document.getElementById('district-count-badge'),
  placesList: document.getElementById('places-list'),
  refreshPlacesBtn: document.getElementById('refresh-places-btn'),
  mapCanvas: document.getElementById('map-canvas'),
  terraToolbar: document.querySelector('[data-testid="terradraw-toolbar"]'),
  terraPolyBtn: document.querySelector('[data-testid="terradraw-polygon-btn"]'),
  terraSelectBtn: document.querySelector('[data-testid="terradraw-select-btn"]'),
  terraClearBtn: document.querySelector('[data-testid="terradraw-clear-btn"]'),
  mapStatusBanner: document.getElementById('map-status-banner'),
};

function isWebGL2Supported() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function computePolygonAreaKm2(ring) {
  if (!ring || ring.length < 3) return 0;
  const earthRadiusM = 6371008.8;
  let areaRad = 0;
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  for (let i = 0; i < closed.length - 1; i++) {
    const [lng1, lat1] = closed[i];
    const [lng2, lat2] = closed[i + 1];
    const p1Lng = (lng1 * Math.PI) / 180;
    const p1Lat = (lat1 * Math.PI) / 180;
    const p2Lng = (lng2 * Math.PI) / 180;
    const p2Lat = (lat2 * Math.PI) / 180;
    areaRad += (p2Lng - p1Lng) * (2 + Math.sin(p1Lat) + Math.sin(p2Lat));
  }
  return Math.abs((areaRad * earthRadiusM * earthRadiusM) / 2) / 1_000_000;
}

function computeRingCentroid(ring) {
  if (!ring || ring.length === 0) {
    return { lat: 40.73061, lng: -73.98661 };
  }
  let sumLng = 0;
  let sumLat = 0;
  const count =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return {
    lat: sumLat / count,
    lng: sumLng / count,
  };
}

function showStatusBanner(message) {
  if (!message) {
    el.mapStatusBanner.classList.add('hidden');
    el.mapStatusBanner.textContent = '';
    return;
  }
  el.mapStatusBanner.textContent = message;
  el.mapStatusBanner.classList.remove('hidden');
}

function getTierColor(utilizationPct) {
  if (utilizationPct >= 80) return '#ef4444';
  if (utilizationPct >= 65) return '#f59e0b';
  if (utilizationPct >= 50) return '#3b82f6';
  return '#10b981';
}

function getLoadRgb(loadPct) {
  if (loadPct >= 80) return [239, 68, 68, 215];
  if (loadPct >= 65) return [245, 158, 11, 210];
  if (loadPct >= 50) return [56, 189, 248, 200];
  return [16, 185, 129, 195];
}

function getFilteredSensors() {
  if (state.customPolygonRing && state.customPolygonRing.length >= 3) {
    return state.sensors.filter((s) => pointInRing(s.lng, s.lat, state.customPolygonRing));
  }
  if (state.selectedDistrictId) {
    return state.sensors.filter((s) => s.districtId === state.selectedDistrictId);
  }
  return state.sensors;
}

function updateZoneAnalytics() {
  const filtered = getFilteredSensors();
  const count = filtered.length;
  let sumLoad = 0;
  let peakLoad = 0;
  for (const sensor of filtered) {
    sumLoad += sensor.loadPct;
    if (sensor.loadPct > peakLoad) peakLoad = sensor.loadPct;
  }
  const avgLoad = count > 0 ? Math.round(sumLoad / count) : 0;

  let areaKm2 = 0;
  if (state.customPolygonRing && state.customPolygonRing.length >= 3) {
    areaKm2 = computePolygonAreaKm2(state.customPolygonRing);
    el.zoneScopeTitle.textContent = 'Custom Terra Draw Zone';
    el.zoneScopePill.textContent = 'Active Scope: Drawn Study Polygon';
    el.zoneScopePill.className = 'scope-pill scope-custom';
    el.resetScopeBtn.classList.remove('hidden');
  } else if (state.selectedDistrictId) {
    const dist = state.districts.find((d) => d.properties.id === state.selectedDistrictId);
    areaKm2 = dist ? dist.properties.areaKm2 : 0;
    el.zoneScopeTitle.textContent = dist ? dist.properties.name : 'Selected District';
    el.zoneScopePill.textContent = dist
      ? `Active Scope: ${dist.properties.borough} (${dist.properties.gridTier})`
      : 'Active Scope: Selected District';
    el.zoneScopePill.className = 'scope-pill';
    el.resetScopeBtn.classList.remove('hidden');
  } else {
    areaKm2 = state.districts.reduce((acc, d) => acc + d.properties.areaKm2, 0);
    el.zoneScopeTitle.textContent = 'Citywide NYC Grid';
    el.zoneScopePill.textContent = `Active Scope: All ${state.districts.length} Infrastructure Districts`;
    el.zoneScopePill.className = 'scope-pill scope-citywide';
    el.resetScopeBtn.classList.add('hidden');
  }

  el.kpiSensorCount.textContent = count.toLocaleString('en-US');
  el.kpiAvgLoad.textContent = count > 0 ? `${avgLoad}%` : '--';
  el.kpiPeakLoad.textContent = count > 0 ? `${peakLoad}%` : '--';
  el.kpiZoneArea.textContent = `${areaKm2.toFixed(2)} km²`;

  updateDeckGlLayers(filtered);
}

function buildDeckLayers(sensorSubset) {
  if (!state.webgl2Available) return [];
  const data = sensorSubset && sensorSubset.length > 0 ? sensorSubset : [];
  if (state.deckMode === 'hexagon') {
    return [
      new HexagonLayer({
        id: 'nyc-sensors-hexagon',
        data,
        pickable: true,
        extruded: true,
        radius: 240,
        coverage: 0.85,
        elevationScale: 10,
        getPosition: (d) => [d.lng, d.lat],
        getColorWeight: (d) => d.loadPct,
        colorAggregation: 'MEAN',
        getElevationWeight: (d) => d.loadPct,
        elevationAggregation: 'MEAN',
        colorRange: [
          [16, 185, 129],
          [56, 189, 248],
          [59, 130, 246],
          [245, 158, 11],
          [239, 68, 68],
          [185, 28, 28],
        ],
      }),
    ];
  }

  return [
    new ScatterplotLayer({
      id: 'nyc-sensors-scatterplot',
      data,
      pickable: true,
      opacity: 0.88,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 11,
      lineWidthMinPixels: 1,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => 28 + d.loadPct * 0.65,
      getFillColor: (d) => getLoadRgb(d.loadPct),
      getLineColor: [15, 23, 42, 200],
    }),
  ];
}

function updateDeckGlLayers(sensorSubset) {
  if (!deckOverlay) return;
  try {
    deckOverlay.setProps({
      layers: buildDeckLayers(sensorSubset),
    });
  } catch {
    // Keep UI resilient if WebGL context is unavailable
  }
}

function renderDistrictDirectory() {
  const fragment = document.createDocumentFragment();
  el.districtCountBadge.textContent = `${state.districts.length} Zones`;

  for (const feature of state.districts) {
    const props = feature.properties;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'district-item';
    btn.setAttribute('data-district-id', props.id);
    if (state.selectedDistrictId === props.id) {
      btn.classList.add('selected');
    }

    const topRow = document.createElement('div');
    topRow.className = 'district-top';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'district-name';
    nameSpan.textContent = props.name;

    const badge = document.createElement('span');
    badge.className = `tier-badge tier-${props.gridTier.toLowerCase()}`;
    badge.textContent = `${props.utilizationPct}% ${props.gridTier}`;

    topRow.appendChild(nameSpan);
    topRow.appendChild(badge);

    const metaRow = document.createElement('div');
    metaRow.className = 'district-meta';

    const leftMeta = document.createElement('span');
    leftMeta.textContent = `${props.borough} · ${props.substationCount} substations`;

    const rightMeta = document.createElement('span');
    rightMeta.textContent = `${props.capacityMw} MW · ${props.areaKm2} km²`;

    metaRow.appendChild(leftMeta);
    metaRow.appendChild(rightMeta);

    btn.appendChild(topRow);
    btn.appendChild(metaRow);

    btn.addEventListener('click', () => {
      selectDistrict(props.id);
    });

    fragment.appendChild(btn);
  }

  el.districtList.replaceChildren(fragment);
}

function styleGeoJsonFeatures() {
  if (!map || !map.data) return;
  map.data.setStyle((feature) => {
    if (!state.showGeoJson) {
      return { visible: false };
    }
    const id = String(feature.getProperty('id') ?? '');
    const utilization = Number(feature.getProperty('utilizationPct') ?? 50);
    const isSelected = state.selectedDistrictId === id;
    const color = getTierColor(utilization);
    return {
      visible: true,
      fillColor: color,
      fillOpacity: isSelected ? 0.42 : 0.2,
      strokeColor: isSelected ? '#ffffff' : color,
      strokeWeight: isSelected ? 3 : 1.5,
      strokeOpacity: isSelected ? 0.95 : 0.78,
      zIndex: isSelected ? 4 : 1,
    };
  });
}

function fitMapToRing(ring) {
  if (!map || !window.google?.maps?.LatLngBounds || !ring || ring.length === 0) return;
  const bounds = new google.maps.LatLngBounds();
  for (const [lng, lat] of ring) {
    bounds.extend({ lat, lng });
  }
  map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
}

function selectDistrict(districtId) {
  state.selectedDistrictId = districtId;
  state.customPolygonRing = null;
  if (draw && drawReady) {
    try {
      draw.clear();
      draw.setMode('static');
      updateDrawButtonStates('static');
    } catch {
      // ignore if draw not active
    }
  }

  const district = state.districts.find((d) => d.properties.id === districtId);
  if (district) {
    fitMapToRing(district.geometry.coordinates[0]);
  }

  renderDistrictDirectory();
  styleGeoJsonFeatures();
  updateZoneAnalytics();
  void sampleElevation();
}

function resetScope() {
  state.selectedDistrictId = null;
  state.customPolygonRing = null;
  if (draw && drawReady) {
    try {
      draw.clear();
      draw.setMode('static');
    } catch {
      // ignore
    }
  }
  updateDrawButtonStates('static');
  if (map && state.config) {
    map.panTo(state.config.initialCenter);
    map.setZoom(state.config.initialZoom);
  }
  renderDistrictDirectory();
  styleGeoJsonFeatures();
  updateZoneAnalytics();
}

function getElevationSampleLocations() {
  let ring = null;
  if (state.customPolygonRing && state.customPolygonRing.length >= 3) {
    ring = state.customPolygonRing;
  } else if (state.selectedDistrictId) {
    const dist = state.districts.find((d) => d.properties.id === state.selectedDistrictId);
    ring = dist ? dist.geometry.coordinates[0] : null;
  }

  if (ring && ring.length >= 3) {
    const centroid = computeRingCentroid(ring);
    const step = Math.max(1, Math.floor(ring.length / 6));
    const sampled = [centroid];
    for (let i = 0; i < ring.length && sampled.length < 8; i += step) {
      sampled.push({ lat: ring[i][1], lng: ring[i][0] });
    }
    return sampled;
  }

  return [
    { lat: 40.7033, lng: -74.0170 },
    { lat: 40.73061, lng: -73.98661 },
    { lat: 40.7549, lng: -73.9840 },
    { lat: 40.7812, lng: -73.9665 },
    { lat: 40.6929, lng: -73.9903 },
    { lat: 40.7447, lng: -73.9485 },
  ];
}

function renderElevationResults(results, statusLabel) {
  if (!results || results.length === 0) {
    el.elevMin.textContent = '-- m';
    el.elevMean.textContent = '-- m';
    el.elevMax.textContent = '-- m';
    el.elevRes.textContent = '-- m';
    el.elevationBars.replaceChildren();
    el.elevationStatusText.textContent = statusLabel;
    return;
  }

  const values = results.map((r) => r.elevation);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
  const meanRes =
    results.reduce((a, b) => a + (b.resolution || 0), 0) / results.length;

  el.elevMin.textContent = `${minVal.toFixed(1)} m`;
  el.elevMean.textContent = `${meanVal.toFixed(1)} m`;
  el.elevMax.textContent = `${maxVal.toFixed(1)} m`;
  el.elevRes.textContent = `${meanRes.toFixed(1)} m`;

  const span = Math.max(1, maxVal - minVal);
  const barFragment = document.createDocumentFragment();
  for (const sample of results) {
    const bar = document.createElement('div');
    bar.className = 'elevation-bar';
    const pct = Math.max(18, Math.min(100, Math.round(((sample.elevation - minVal) / span) * 82 + 18)));
    bar.style.height = `${pct}%`;
    bar.title = `${sample.elevation.toFixed(1)} m (${sample.location.lat.toFixed(4)}, ${sample.location.lng.toFixed(4)})`;
    barFragment.appendChild(bar);
  }
  el.elevationBars.replaceChildren(barFragment);
  el.elevationStatusText.textContent = statusLabel;
}

async function sampleElevation() {
  const locations = getElevationSampleLocations();
  el.elevationStatusText.textContent = `Sampling ${locations.length} terrain points via Elevation API...`;
  try {
    const res = await fetch('/api/elevation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });
    const data = await res.json();
    if (!res.ok) {
      renderElevationResults([], data.error || 'Elevation request failed.');
      return;
    }
    if (data.status === 'NOT_CONFIGURED') {
      renderElevationResults(
        [],
        'Add GOOGLE_MAPS_API_KEY in .env to enable live Elevation API terrain profiling.',
      );
      return;
    }
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      renderElevationResults([], data.error || `Elevation status: ${data.status}`);
      return;
    }
    renderElevationResults(
      data.results,
      `Sampled ${data.results.length} points (Elevation API status: OK).`,
    );
  } catch {
    renderElevationResults([], 'Unable to reach /api/elevation endpoint.');
  }
}

function clearCivicMarkers() {
  for (const marker of civicMarkers) {
    marker.map = null;
  }
  civicMarkers = [];
}

function renderPlacesList(places, message) {
  if (!places || places.length === 0) {
    const emptyNote = document.createElement('p');
    emptyNote.className = 'panel-footnote';
    emptyNote.textContent = message || 'No civic hubs returned.';
    el.placesList.replaceChildren(emptyNote);
    return;
  }

  const fragment = document.createDocumentFragment();
  places.forEach((place, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'place-item';
    if (state.selectedPlaceId === place.id) {
      btn.classList.add('selected');
    }

    const top = document.createElement('div');
    top.className = 'place-top';

    const title = document.createElement('span');
    title.className = 'place-name';
    title.textContent = `${idx + 1}. ${place.displayName?.text || 'Civic Hub'}`;

    const badge = document.createElement('span');
    badge.className = 'count-badge';
    const primaryType = Array.isArray(place.types) && place.types[0] ? place.types[0].replaceAll('_', ' ') : 'civic';
    badge.textContent = primaryType;

    top.appendChild(title);
    top.appendChild(badge);

    const addr = document.createElement('div');
    addr.className = 'place-address';
    addr.textContent = place.formattedAddress || 'New York, NY';

    btn.appendChild(top);
    btn.appendChild(addr);

    btn.addEventListener('click', () => {
      focusPlace(place);
    });

    fragment.appendChild(btn);
  });

  el.placesList.replaceChildren(fragment);
}

function focusPlace(place) {
  state.selectedPlaceId = place.id;
  renderPlacesList(state.places);

  if (!map || !place.location) return;
  const pos = {
    lat: place.location.latitude,
    lng: place.location.longitude,
  };
  map.panTo(pos);
  if ((map.getZoom() ?? 12) < 14) {
    map.setZoom(14);
  }

  const matchingMarker = civicMarkers.find((m) => m.title === (place.displayName?.text || 'Civic Hub'));
  if (infoWindow && matchingMarker) {
    const contentNode = document.createElement('div');
    contentNode.style.color = '#0f172a';
    contentNode.style.maxWidth = '240px';
    const strong = document.createElement('strong');
    strong.textContent = place.displayName?.text || 'Civic Hub';
    const addr = document.createElement('div');
    addr.style.fontSize = '12px';
    addr.style.marginTop = '4px';
    addr.textContent = place.formattedAddress || '';
    contentNode.appendChild(strong);
    contentNode.appendChild(addr);
    infoWindow.setContent(contentNode);
    infoWindow.open({ anchor: matchingMarker, map });
  }
}

function renderCivicHubMarkers(places) {
  clearCivicMarkers();
  if (!map || !AdvancedMarkerCtor || !PinElementCtor) return;

  places.forEach((place, idx) => {
    if (!place.location || typeof place.location.latitude !== 'number') return;
    const pin = new PinElementCtor({
      glyphText: String(idx + 1),
      background: '#0284c7',
      borderColor: '#e0f2fe',
      glyphColor: '#ffffff',
      scale: 0.95,
    });
    const marker = new AdvancedMarkerCtor({
      map,
      position: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      title: place.displayName?.text || 'Civic Hub',
      content: pin,
    });
    marker.addListener('click', () => {
      focusPlace(place);
    });
    civicMarkers.push(marker);
  });
}

async function loadCivicHubs() {
  const placeholder = document.createElement('p');
  placeholder.className = 'panel-footnote';
  placeholder.textContent = 'Querying live NYC civic transit hubs via Places API (New)...';
  el.placesList.replaceChildren(placeholder);

  try {
    const res = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: state.config?.seedQuery || 'New York City civic transit hub',
        pageSize: 6,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      renderPlacesList([], data.error || 'Places search failed.');
      return;
    }
    if (data.status === 'NOT_CONFIGURED') {
      renderPlacesList(
        [],
        'Add GOOGLE_MAPS_API_KEY in .env to fetch live NYC civic hubs from Places API (New).',
      );
      return;
    }
    state.places = Array.isArray(data.places) ? data.places : [];
    renderPlacesList(state.places, 'No civic hubs returned.');
    renderCivicHubMarkers(state.places);
  } catch {
    renderPlacesList([], 'Unable to reach /api/places/search endpoint.');
  }
}

function updateDrawButtonStates(mode) {
  state.drawMode = mode;
  el.terraPolyBtn.classList.toggle('active', mode === 'polygon');
  el.terraPolyBtn.setAttribute('aria-pressed', String(mode === 'polygon'));
  el.terraSelectBtn.classList.toggle('active', mode === 'select');
  el.terraSelectBtn.setAttribute('aria-pressed', String(mode === 'select'));
}

function applyTerraDrawFilter() {
  if (!draw) return;
  const snapshot = draw.getSnapshot();
  const polygons = snapshot.filter(
    (f) => f.geometry && f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates?.[0]),
  );
  if (polygons.length === 0) {
    state.customPolygonRing = null;
    updateZoneAnalytics();
    return;
  }
  const latest = polygons[polygons.length - 1];
  state.customPolygonRing = latest.geometry.coordinates[0];
  state.selectedDistrictId = null;
  renderDistrictDirectory();
  styleGeoJsonFeatures();
  updateZoneAnalytics();
  void sampleElevation();
}

function setupTerraDraw() {
  if (!map || draw) return;
  draw = new TerraDraw({
    adapter: new TerraDrawGoogleMapsAdapter({
      map,
      lib: google.maps,
      coordinatePrecision: 9,
      isolatedData: true,
    }),
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
          fillOpacity: 0.25,
          outlineColor: '#0ea5e9',
          outlineWidth: 3,
          closingPointColor: '#f8fafc',
          closingPointWidth: 5,
          closingPointOutlineColor: '#0284c7',
          closingPointOutlineWidth: 2,
        },
      }),
    ],
  });

  draw.on('ready', () => {
    drawReady = true;
    if (pendingDrawMode && pendingDrawMode !== 'static') {
      try {
        draw.setMode(pendingDrawMode);
      } catch {
        // ignore
      }
      pendingDrawMode = null;
    }
  });

  draw.on('finish', () => {
    applyTerraDrawFilter();
    try {
      draw.setMode('select');
      updateDrawButtonStates('select');
    } catch {
      // ignore
    }
  });

  draw.on('change', (_ids, type) => {
    if (type === 'update' || type === 'delete') {
      applyTerraDrawFilter();
    }
  });

  draw.start();
}

function mountPlaceAutocomplete() {
  if (!window.google?.maps?.places?.PlaceAutocompleteElement) return;
  try {
    const autocomplete = new google.maps.places.PlaceAutocompleteElement({
      locationBias: {
        center: state.config.initialCenter,
        radius: 25000,
      },
      includedRegionCodes: ['us'],
    });
    autocomplete.setAttribute('aria-label', 'Jump to NYC place or address');

    autocomplete.addEventListener('gmp-select', async (event) => {
      const prediction = event.placePrediction;
      if (!prediction) return;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
      });

      if (place.viewport && map) {
        map.fitBounds(place.viewport);
      } else if (place.location && map) {
        map.panTo(place.location);
        map.setZoom(15);
      }

      if (place.location && map && AdvancedMarkerCtor && PinElementCtor) {
        if (searchMarker) {
          searchMarker.map = null;
        }
        const pin = new PinElementCtor({
          glyphText: '★',
          background: '#10b981',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
        });
        searchMarker = new AdvancedMarkerCtor({
          map,
          position: place.location,
          title: place.displayName || 'Selected Location',
          content: pin,
        });
      }
    });

    autocomplete.addEventListener('gmp-error', () => {
      showStatusBanner('Place Autocomplete requires Places API (New) enabled on your API key.');
    });

    el.autocompleteMount.replaceChildren(autocomplete);
  } catch {
    // Keep search placeholder note if custom element initialization fails
  }
}

function renderUnconfiguredMapState() {
  const card = document.createElement('div');
  card.className = 'map-unconfigured-card';

  const heading = document.createElement('h3');
  heading.textContent = 'Google Maps API Key Required for Live Map Tiles';

  const body = document.createElement('p');
  body.textContent =
    'Set GOOGLE_MAPS_API_KEY in .env (a free zero-billing Maps Demo Key works immediately) and restart the server to activate interactive Google Maps, deck.gl WebGL overlays, Terra Draw polygons, and live Places & Elevation queries.';

  const hint = document.createElement('p');
  const code = document.createElement('code');
  code.textContent = 'GOOGLE_MAPS_API_KEY=your_demo_key';
  hint.appendChild(code);

  card.appendChild(heading);
  card.appendChild(body);
  card.appendChild(hint);
  el.mapCanvas.replaceChildren(card);
}

async function initGoogleMap() {
  if (!state.config?.hasApiKey || !state.config?.apiKey) {
    renderUnconfiguredMapState();
    el.deckglRuntimeNote.textContent =
      'Offline analytics mode: 2,400 sensors indexed. Add GOOGLE_MAPS_API_KEY for live map rendering.';
    return;
  }

  setOptions({
    key: state.config.apiKey,
    v: 'weekly',
  });

  const [, mapsLib, markerLib] = await Promise.all([
    importLibrary('core'),
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('elevation'),
  ]);

  const { Map, InfoWindow } = mapsLib;
  AdvancedMarkerCtor = markerLib.AdvancedMarkerElement;
  PinElementCtor = markerLib.PinElement;
  infoWindow = new InfoWindow();

  map = new Map(el.mapCanvas, {
    center: state.config.initialCenter,
    zoom: state.config.initialZoom,
    mapId: state.config.mapId,
    mapTypeId: state.activeBasemap,
    internalUsageAttributionIds: [state.config.attributionId],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
  });

  if (state.districtGeoJson) {
    map.data.addGeoJson(state.districtGeoJson);
    styleGeoJsonFeatures();
    map.data.addListener('click', (event) => {
      const id = event.feature.getProperty('id');
      if (id) {
        selectDistrict(String(id));
      }
    });
  }

  state.webgl2Available = isWebGL2Supported();
  if (state.webgl2Available) {
    try {
      deckOverlay = new GoogleMapsOverlay({
        interleaved: false,
        layers: buildDeckLayers(getFilteredSensors()),
        onError: () => {
          state.webgl2Available = false;
          el.deckglRuntimeNote.textContent =
            'WebGL2 context unavailable in this browser; GeoJSON district analytics remain active.';
        },
      });
      deckOverlay.setMap(map);
      el.deckglRuntimeNote.textContent =
        'deck.gl GoogleMapsOverlay active (Scatterplot / 3D Hexagon WebGL2 rendering).';
    } catch {
      state.webgl2Available = false;
      deckOverlay = null;
      el.deckglRuntimeNote.textContent =
        'WebGL2 unavailable in headless GPU mode; GeoJSON & KPI analytics active.';
    }
  } else {
    el.deckglRuntimeNote.textContent =
      'WebGL2 unavailable in this environment; GeoJSON & KPI analytics active without WebGL errors.';
  }

  google.maps.event.addListener(map, 'projection_changed', () => {
    setupTerraDraw();
  });

  mountPlaceAutocomplete();
}

function wireControls() {
  el.basemapSwitcher.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-basemap]');
    if (!button) return;
    const basemap = button.getAttribute('data-basemap');
    if (!basemap) return;

    state.activeBasemap = basemap;
    for (const btn of el.basemapSwitcher.querySelectorAll('button[data-basemap]')) {
      const active = btn === button;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    if (map) {
      map.setMapTypeId(basemap);
    }
  });

  el.deckControls.addEventListener('click', (event) => {
    const modeBtn = event.target.closest('button[data-deck-mode]');
    if (modeBtn) {
      const mode = modeBtn.getAttribute('data-deck-mode');
      if (!mode) return;
      state.deckMode = mode;
      for (const btn of el.deckControls.querySelectorAll('button[data-deck-mode]')) {
        const active = btn === modeBtn;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      }
      updateDeckGlLayers(getFilteredSensors());
      return;
    }

    const geoBtn = event.target.closest('[data-testid="toggle-geojson-btn"]');
    if (geoBtn) {
      state.showGeoJson = !state.showGeoJson;
      geoBtn.classList.toggle('active', state.showGeoJson);
      geoBtn.setAttribute('aria-pressed', String(state.showGeoJson));
      styleGeoJsonFeatures();
    }
  });

  el.terraToolbar.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-draw-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-draw-action');
    if (action === 'polygon') {
      updateDrawButtonStates('polygon');
      if (draw && drawReady) {
        try {
          draw.setMode('polygon');
        } catch {
          // ignore
        }
      } else {
        pendingDrawMode = 'polygon';
      }
    } else if (action === 'select') {
      updateDrawButtonStates('select');
      if (draw && drawReady) {
        try {
          draw.setMode('select');
        } catch {
          // ignore
        }
      } else {
        pendingDrawMode = 'select';
      }
    } else if (action === 'clear') {
      state.customPolygonRing = null;
      updateDrawButtonStates('static');
      if (draw && drawReady) {
        try {
          draw.clear();
          draw.setMode('static');
        } catch {
          // ignore
        }
      }
      updateZoneAnalytics();
    }
  });

  el.resetScopeBtn.addEventListener('click', () => {
    resetScope();
  });

  el.sampleElevationBtn.addEventListener('click', () => {
    void sampleElevation();
  });

  el.refreshPlacesBtn.addEventListener('click', () => {
    void loadCivicHubs();
  });
}

async function bootstrap() {
  wireControls();
  try {
    const [configRes, spatialRes] = await Promise.all([
      fetch('/api/config'),
      fetch('/api/spatial-data'),
    ]);
    state.config = await configRes.json();
    const spatialData = await spatialRes.json();
    state.districtGeoJson = spatialData.districts;
    state.districts = spatialData.districts?.features || [];
    state.sensors = spatialData.sensors || [];

    renderDistrictDirectory();
    updateZoneAnalytics();

    await initGoogleMap();
    await Promise.all([loadCivicHubs(), sampleElevation()]);
  } catch (err) {
    showStatusBanner(
      err instanceof Error ? err.message : 'Failed to initialize NYC GIS Workbench.',
    );
  }
}

void bootstrap();
