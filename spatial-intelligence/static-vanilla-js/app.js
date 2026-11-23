import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawRenderMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import {
  NYC_CENTER,
  INITIAL_ZOOM,
  NYC_DISTRICTS_GEOJSON,
  NYC_SENSORS,
  pointInPolygon,
  getRingCentroid,
  computePolygonAreaKm2,
  summarizeSensors,
} from './nyc-data.js';

const SEED_SEARCH_QUERY = 'New York City civic transit hub';
const SVG_NS = 'http://www.w3.org/2000/svg';

const state = {
  apiKey: (window.__GMP_CONFIG__ && window.__GMP_CONFIG__.apiKey) || '',
  map: null,
  mapsLib: null,
  coreLib: null,
  markerLib: null,
  placesLib: null,
  elevationLib: null,
  infoWindow: null,
  basemap: 'roadmap',
  deckMode: 'scatterplot',
  showGeoJson: true,
  selectedDistrictId: null,
  customPolygonCoords: null,
  customPolygonAreaKm2: 0,
  draw: null,
  drawMode: 'static',
  deckOverlay: null,
  webgl2Supported: false,
  civicMarkers: [],
  searchMarker: null,
};

const el = {
  autocompleteSlot: document.getElementById('autocomplete-slot'),
  basemapButtons: Array.from(document.querySelectorAll('[data-basemap]')),
  deckModeButtons: Array.from(document.querySelectorAll('[data-deck-mode]')),
  toggleGeoJsonBtn: document.getElementById('toggle-geojson-btn'),
  activeScopeTitle: document.getElementById('active-scope-title'),
  resetScopeBtn: document.getElementById('reset-scope-btn'),
  kpiSensorCount: document.getElementById('kpi-sensor-count'),
  kpiAvgLoad: document.getElementById('kpi-avg-load'),
  kpiPeakLoad: document.getElementById('kpi-peak-load'),
  kpiAreaLabel: document.getElementById('kpi-area-label'),
  kpiAreaValue: document.getElementById('kpi-area-value'),
  statusBar: document.getElementById('status-bar'),
  statusCounts: document.getElementById('status-counts'),
  sampleElevationBtn: document.getElementById('sample-elevation-btn'),
  elevMin: document.getElementById('elev-min'),
  elevMean: document.getElementById('elev-mean'),
  elevMax: document.getElementById('elev-max'),
  elevRes: document.getElementById('elev-res'),
  elevChartWrap: document.getElementById('elev-chart-wrap'),
  elevStatusText: document.getElementById('elev-status-text'),
  districtSelectorList: document.getElementById('district-selector-list'),
  livePlacesPanel: document.getElementById('live-places-panel'),
  placesCountBadge: document.getElementById('places-count-badge'),
  terradrawPolygonBtn: document.getElementById('terradraw-polygon-btn'),
  terradrawSelectBtn: document.getElementById('terradraw-select-btn'),
  terradrawClearBtn: document.getElementById('terradraw-clear-btn'),
  mapContainer: document.getElementById('map'),
  mapStatusBanner: document.getElementById('map-status-banner'),
  deckglStatusBadge: document.getElementById('deckgl-status-badge'),
};

function getLoadTier(loadPct) {
  if (loadPct >= 85) return 'critical';
  if (loadPct >= 65) return 'elevated';
  return 'nominal';
}

function getDistrictFillColor(loadPct) {
  if (loadPct >= 85) return '#ef4444';
  if (loadPct >= 75) return '#f59e0b';
  if (loadPct >= 65) return '#eab308';
  return '#10b981';
}

function showBanner(message) {
  if (!el.mapStatusBanner) return;
  el.mapStatusBanner.textContent = message;
  el.mapStatusBanner.classList.remove('hidden');
}

function hideBanner() {
  if (!el.mapStatusBanner) return;
  el.mapStatusBanner.classList.add('hidden');
}

function isWebGL2Available() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    return Boolean(window.WebGL2RenderingContext && ctx);
  } catch {
    return false;
  }
}

function createInfoCardNode(title, subtitle, metaText) {
  const wrap = document.createElement('div');
  wrap.style.padding = '4px 6px';
  wrap.style.maxWidth = '240px';
  wrap.style.fontFamily = 'Inter, sans-serif';

  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.fontWeight = '700';
  heading.style.fontSize = '13px';
  heading.style.color = '#0f172a';
  wrap.appendChild(heading);

  if (subtitle) {
    const sub = document.createElement('div');
    sub.textContent = subtitle;
    sub.style.fontSize = '12px';
    sub.style.color = '#475569';
    sub.style.marginTop = '3px';
    wrap.appendChild(sub);
  }

  if (metaText) {
    const meta = document.createElement('div');
    meta.textContent = metaText;
    meta.style.fontSize = '11px';
    meta.style.color = '#2563eb';
    meta.style.marginTop = '4px';
    meta.style.fontWeight = '600';
    wrap.appendChild(meta);
  }

  return wrap;
}

function getActiveSensors() {
  if (state.customPolygonCoords) {
    return NYC_SENSORS.filter((s) =>
      pointInPolygon(s.position[0], s.position[1], state.customPolygonCoords)
    );
  }
  if (state.selectedDistrictId) {
    return NYC_SENSORS.filter((s) => s.districtId === state.selectedDistrictId);
  }
  return NYC_SENSORS;
}

function getDistrictFeatureById(id) {
  return (
    NYC_DISTRICTS_GEOJSON.features.find((f) => f.properties.id === id) || null
  );
}

function updateAnalyticsPanel() {
  const filtered = getActiveSensors();
  const summary = summarizeSensors(filtered);

  let scopeTitle = 'Citywide NYC Grid';
  let hasScopedSelection = false;

  if (state.customPolygonCoords) {
    scopeTitle = 'Custom Terra Draw Study Zone';
    hasScopedSelection = true;
    el.kpiAreaLabel.textContent = 'Study Zone Area';
    el.kpiAreaValue.textContent = `${state.customPolygonAreaKm2.toFixed(2)} km²`;
  } else if (state.selectedDistrictId) {
    const feat = getDistrictFeatureById(state.selectedDistrictId);
    scopeTitle = feat ? feat.properties.name : state.selectedDistrictId;
    hasScopedSelection = true;
    el.kpiAreaLabel.textContent = 'District Area';
    const areaKm2 = feat
      ? computePolygonAreaKm2(feat.geometry.coordinates[0])
      : 0;
    el.kpiAreaValue.textContent = `${areaKm2.toFixed(2)} km²`;
  } else {
    el.kpiAreaLabel.textContent = 'Total Demand';
    el.kpiAreaValue.textContent = `${summary.totalMw.toFixed(1)} MW`;
  }

  el.activeScopeTitle.textContent = scopeTitle;
  el.resetScopeBtn.classList.toggle('hidden', !hasScopedSelection);

  el.kpiSensorCount.textContent = summary.count.toLocaleString();
  el.kpiAvgLoad.textContent = `${summary.avgLoad}%`;
  el.kpiPeakLoad.textContent = `${summary.peakLoad}%`;

  const nominalCount = filtered.filter((s) => s.status === 'nominal').length;
  const elevatedCount = filtered.filter((s) => s.status === 'elevated').length;
  const criticalCount = filtered.filter((s) => s.status === 'critical').length;
  const total = Math.max(1, filtered.length);

  const segments = [
    { cls: 'nominal', count: nominalCount },
    { cls: 'elevated', count: elevatedCount },
    { cls: 'critical', count: criticalCount },
  ];

  const barNodes = segments.map((seg) => {
    const div = document.createElement('div');
    div.className = `status-bar-seg ${seg.cls}`;
    div.style.width = `${((seg.count / total) * 100).toFixed(1)}%`;
    return div;
  });
  el.statusBar.replaceChildren(...barNodes);

  const legendItems = [
    `Nominal: ${nominalCount}`,
    `Elevated: ${elevatedCount}`,
    `Critical: ${criticalCount}`,
  ].map((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    return span;
  });
  el.statusCounts.replaceChildren(...legendItems);
}

function renderDistrictDirectory() {
  const items = NYC_DISTRICTS_GEOJSON.features.map((feature) => {
    const p = feature.properties;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'district-item';
    btn.dataset.districtId = p.id;
    if (state.selectedDistrictId === p.id && !state.customPolygonCoords) {
      btn.classList.add('active');
    }

    const left = document.createElement('div');
    const nameEl = document.createElement('span');
    nameEl.className = 'district-name';
    nameEl.textContent = p.name;

    const metaEl = document.createElement('span');
    metaEl.className = 'district-meta';
    metaEl.textContent = `${p.borough} · ${p.substationCount} substations · ${p.peakMw} MW`;

    left.appendChild(nameEl);
    left.appendChild(metaEl);

    const badge = document.createElement('span');
    badge.className = `load-badge ${getLoadTier(p.capacityLoadPct)}`;
    badge.textContent = `${p.capacityLoadPct}%`;

    btn.appendChild(left);
    btn.appendChild(badge);
    btn.addEventListener('click', () => selectDistrict(p.id));
    return btn;
  });

  el.districtSelectorList.replaceChildren(...items);
}

function styleGeoJsonLayer() {
  if (!state.map) return;
  const allowDistrictClick = state.drawMode === 'static';
  state.map.data.setStyle((feature) => {
    const id = feature.getProperty('id');
    const loadPct = Number(feature.getProperty('capacityLoadPct') || 60);
    const isSelected =
      !state.customPolygonCoords && state.selectedDistrictId === id;
    return {
      fillColor: getDistrictFillColor(loadPct),
      fillOpacity: isSelected ? 0.36 : 0.16,
      strokeColor: isSelected ? '#1d4ed8' : '#0f172a',
      strokeWeight: isSelected ? 3 : 1.5,
      strokeOpacity: isSelected ? 0.95 : 0.65,
      clickable: allowDistrictClick,
    };
  });
}

function fitMapToRing(ring) {
  if (!state.map || !state.coreLib || !Array.isArray(ring) || ring.length === 0) {
    return;
  }
  const { LatLngBounds } = state.coreLib;
  const bounds = new LatLngBounds();
  for (const [lng, lat] of ring) {
    bounds.extend({ lat, lng });
  }
  state.map.fitBounds(bounds, { top: 64, right: 32, bottom: 64, left: 32 });
}

function selectDistrict(districtId) {
  const feature = getDistrictFeatureById(districtId);
  if (!feature) return;

  state.selectedDistrictId = districtId;
  state.customPolygonCoords = null;
  state.customPolygonAreaKm2 = 0;

  if (state.draw) {
    try {
      state.draw.clear();
      state.draw.setMode('static');
      updateDrawButtonStates('static');
    } catch {
      // Ignore if draw is not active
    }
  }

  renderDistrictDirectory();
  styleGeoJsonLayer();
  updateAnalyticsPanel();
  updateDeckLayers();

  const outerRing = feature.geometry.coordinates[0];
  fitMapToRing(outerRing);
  void sampleActiveScopeElevation();
}

function resetScopeToCitywide() {
  state.selectedDistrictId = null;
  state.customPolygonCoords = null;
  state.customPolygonAreaKm2 = 0;

  if (state.draw) {
    try {
      state.draw.clear();
      state.draw.setMode('static');
      updateDrawButtonStates('static');
    } catch {
      // Ignore if draw is not active
    }
  }

  renderDistrictDirectory();
  styleGeoJsonLayer();
  updateAnalyticsPanel();
  updateDeckLayers();

  if (state.map) {
    state.map.panTo(NYC_CENTER);
    state.map.setZoom(INITIAL_ZOOM);
  }
  void sampleActiveScopeElevation();
}

function buildDeckLayers() {
  const deckApi = window.deck;
  if (!deckApi) return [];

  const activeSensors = getActiveSensors();
  const hasFilter = Boolean(state.customPolygonCoords || state.selectedDistrictId);

  if (state.deckMode === 'hexagon' && deckApi.HexagonLayer) {
    return [
      new deckApi.HexagonLayer({
        id: 'nyc-sensor-hexagons',
        data: activeSensors,
        getPosition: (d) => d.position,
        getElevationWeight: (d) => d.loadPct,
        elevationAggregation: 'MEAN',
        getColorWeight: (d) => d.loadPct,
        colorAggregation: 'MEAN',
        radius: 260,
        elevationScale: 4,
        extruded: true,
        coverage: 0.85,
        pickable: true,
        opacity: 0.72,
      }),
    ];
  }

  if (deckApi.ScatterplotLayer) {
    const activeIds = hasFilter ? new Set(activeSensors.map((s) => s.id)) : null;
    return [
      new deckApi.ScatterplotLayer({
        id: 'nyc-sensor-scatterplot',
        data: NYC_SENSORS,
        getPosition: (d) => d.position,
        getRadius: (d) => (activeIds && activeIds.has(d.id) ? 62 : 46),
        radiusMinPixels: 3,
        radiusMaxPixels: 11,
        getFillColor: (d) => {
          const dimmed = activeIds && !activeIds.has(d.id);
          const alpha = dimmed ? 42 : 215;
          if (d.loadPct >= 85) return [239, 68, 68, alpha];
          if (d.loadPct >= 65) return [245, 158, 11, alpha];
          return [16, 185, 129, alpha];
        },
        pickable: true,
        updateTriggers: {
          getRadius: [state.selectedDistrictId, state.customPolygonCoords],
          getFillColor: [state.selectedDistrictId, state.customPolygonCoords],
        },
      }),
    ];
  }

  return [];
}

function initDeckOverlay() {
  state.webgl2Supported = isWebGL2Available();
  if (!state.webgl2Supported) {
    el.deckglStatusBadge.textContent =
      'WebGL2 unavailable — analytical summary active';
    return;
  }

  const deckApi = window.deck;
  if (!deckApi || !deckApi.GoogleMapsOverlay || !state.map) {
    el.deckglStatusBadge.textContent = 'deck.gl bundle pending or unavailable';
    return;
  }

  try {
    state.deckOverlay = new deckApi.GoogleMapsOverlay({
      interleaved: false,
      layers: buildDeckLayers(),
      onError: () => {
        el.deckglStatusBadge.textContent =
          'deck.gl WebGL fallback active — metrics synchronized';
      },
      getTooltip: ({ object }) => {
        if (!object) return null;
        if (object.id) {
          return `${object.id}\n${object.districtName}\nLoad: ${object.loadPct}% (${object.kw} kW)`;
        }
        if (Array.isArray(object.points)) {
          return `Hexbin Sensors: ${object.points.length}`;
        }
        return null;
      },
    });
    state.deckOverlay.setMap(state.map);
    el.deckglStatusBadge.textContent = `deck.gl ${state.deckMode} active · ${NYC_SENSORS.length.toLocaleString()} sensors`;
  } catch {
    state.deckOverlay = null;
    el.deckglStatusBadge.textContent =
      'WebGL2 unavailable — analytical summary active';
  }
}

function updateDeckLayers() {
  if (!state.deckOverlay) return;
  try {
    state.deckOverlay.setProps({ layers: buildDeckLayers() });
    const count = getActiveSensors().length;
    el.deckglStatusBadge.textContent = `deck.gl ${state.deckMode} active · ${count.toLocaleString()} sensors in scope`;
  } catch {
    // Keep non-fatal if WebGL context was lost
  }
}

function updateDrawButtonStates(mode) {
  state.drawMode = mode;
  el.terradrawPolygonBtn.classList.toggle('active', mode === 'polygon');
  el.terradrawPolygonBtn.setAttribute(
    'aria-pressed',
    mode === 'polygon' ? 'true' : 'false'
  );
  el.terradrawSelectBtn.classList.toggle('active', mode === 'select');
  el.terradrawSelectBtn.setAttribute(
    'aria-pressed',
    mode === 'select' ? 'true' : 'false'
  );
  styleGeoJsonLayer();
}

function handleTerraDrawSnapshot() {
  if (!state.draw) return;
  const snapshot = state.draw.getSnapshot();
  const polygons = snapshot.filter(
    (feat) =>
      feat &&
      feat.geometry &&
      feat.geometry.type === 'Polygon' &&
      Array.isArray(feat.geometry.coordinates) &&
      feat.geometry.coordinates[0] &&
      feat.geometry.coordinates[0].length >= 4
  );

  if (polygons.length === 0) {
    if (state.customPolygonCoords) {
      state.customPolygonCoords = null;
      state.customPolygonAreaKm2 = 0;
      renderDistrictDirectory();
      styleGeoJsonLayer();
      updateAnalyticsPanel();
      updateDeckLayers();
    }
    return;
  }

  const latest = polygons[polygons.length - 1];
  state.selectedDistrictId = null;
  state.customPolygonCoords = latest.geometry.coordinates;
  state.customPolygonAreaKm2 = computePolygonAreaKm2(
    latest.geometry.coordinates[0]
  );

  renderDistrictDirectory();
  styleGeoJsonLayer();
  updateAnalyticsPanel();
  updateDeckLayers();
}

function initTerraDraw() {
  if (!state.map || state.draw) return;

  const setup = () => {
    if (state.draw) return;
    try {
      const adapter = new TerraDrawGoogleMapsAdapter({
        map: state.map,
        lib: google.maps,
        coordinatePrecision: 9,
        isolatedData: true,
      });

      const draw = new TerraDraw({
        adapter,
        modes: [
          new TerraDrawPolygonMode({
            styles: {
              fillColor: '#2563eb',
              fillOpacity: 0.22,
              outlineColor: '#1d4ed8',
              outlineWidth: 2.5,
              closingPointColor: '#ffffff',
              closingPointOutlineColor: '#1d4ed8',
              closingPointWidth: 5,
              closingPointOutlineWidth: 2,
            },
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  rotateable: false,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
            },
          }),
          new TerraDrawRenderMode({
            modeName: 'static',
            styles: {},
          }),
        ],
      });

      draw.start();
      draw.setMode(state.drawMode || 'static');

      draw.on('finish', () => {
        handleTerraDrawSnapshot();
        void sampleActiveScopeElevation();
        draw.setMode('select');
        updateDrawButtonStates('select');
      });

      draw.on('change', () => {
        handleTerraDrawSnapshot();
      });

      state.draw = draw;
    } catch {
      // Non-fatal if map projection is not yet active
    }
  };

  if (state.map.getProjection()) {
    setup();
  } else {
    state.map.addListener('projection_changed', setup);
  }
}

function getElevationSamplePointsForActiveScope() {
  let ring = null;
  if (state.customPolygonCoords && state.customPolygonCoords[0]) {
    ring = state.customPolygonCoords[0];
  } else if (state.selectedDistrictId) {
    const feat = getDistrictFeatureById(state.selectedDistrictId);
    if (feat) ring = feat.geometry.coordinates[0];
  }

  if (ring && ring.length >= 3) {
    const centroid = getRingCentroid(ring);
    const step = Math.max(1, Math.floor(ring.length / 5));
    const points = [];
    for (let i = 0; i < ring.length && points.length < 5; i += step) {
      points.push({ lat: ring[i][1], lng: ring[i][0] });
    }
    points.push({ lat: centroid[1], lng: centroid[0] });
    return points;
  }

  return [
    { lat: 40.7033, lng: -74.0170 }, // Battery Park
    { lat: 40.7128, lng: -74.0060 }, // Lower Manhattan
    { lat: 40.7306, lng: -73.9866 }, // East Village / Union Sq
    { lat: 40.7580, lng: -73.9855 }, // Midtown
    { lat: 40.7831, lng: -73.9712 }, // Upper West Side
    { lat: 40.6943, lng: -73.9866 }, // Downtown Brooklyn
  ];
}

function renderElevationChart(results) {
  if (!Array.isArray(results) || results.length === 0) {
    el.elevChartWrap.replaceChildren();
    return;
  }

  const width = 320;
  const height = 56;
  const pad = 6;
  const values = results.map((r) => Number(r.elevation));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = Math.max(0.5, maxVal - minVal);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Elevation profile chart');

  const coords = values.map((val, idx) => {
    const x =
      values.length === 1
        ? width / 2
        : pad + (idx / (values.length - 1)) * (width - pad * 2);
    const y =
      height - pad - ((val - minVal) / span) * (height - pad * 2);
    return [x, y];
  });

  const areaPoints = [
    `${coords[0][0]},${height - pad}`,
    ...coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
    `${coords[coords.length - 1][0]},${height - pad}`,
  ].join(' ');

  const area = document.createElementNS(SVG_NS, 'polygon');
  area.setAttribute('points', areaPoints);
  area.setAttribute('fill', 'rgba(37, 99, 235, 0.16)');
  svg.appendChild(area);

  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute(
    'points',
    coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  );
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#2563eb');
  line.setAttribute('stroke-width', '2');
  svg.appendChild(line);

  for (const [x, y] of coords) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', y.toFixed(1));
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', '#1d4ed8');
    svg.appendChild(dot);
  }

  el.elevChartWrap.replaceChildren(svg);
}

async function sampleActiveScopeElevation() {
  const samplePoints = getElevationSamplePointsForActiveScope();
  el.sampleElevationBtn.disabled = true;
  el.elevStatusText.textContent = `Sampling ${samplePoints.length} coordinates via Elevation API…`;

  let results = null;

  try {
    if (state.elevationLib && state.elevationLib.ElevationService) {
      const elevator = new state.elevationLib.ElevationService();
      const resp = await elevator.getElevationForLocations({
        locations: samplePoints,
      });
      if (resp && Array.isArray(resp.results) && resp.results.length > 0) {
        results = resp.results;
      }
    }
  } catch {
    results = null;
  }

  if (!results) {
    try {
      const resp = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: samplePoints }),
      });
      if (resp.ok) {
        const payload = await resp.json();
        if (Array.isArray(payload.results) && payload.results.length > 0) {
          results = payload.results;
        }
      }
    } catch {
      results = null;
    }
  }

  el.sampleElevationBtn.disabled = false;

  if (!results || results.length === 0) {
    el.elevMin.textContent = '—';
    el.elevMean.textContent = '—';
    el.elevMax.textContent = '—';
    el.elevRes.textContent = '—';
    el.elevChartWrap.replaceChildren();
    el.elevStatusText.textContent = state.apiKey
      ? 'Elevation API unavailable for this key or project quota.'
      : 'Configure GOOGLE_MAPS_API_KEY in .env to sample live terrain elevation.';
    return;
  }

  const elevations = results.map((r) => Number(r.elevation));
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const meanElev =
    elevations.reduce((sum, val) => sum + val, 0) / elevations.length;
  const avgRes =
    results.reduce((sum, r) => sum + Number(r.resolution || 0), 0) /
    results.length;

  el.elevMin.textContent = `${minElev.toFixed(1)} m`;
  el.elevMean.textContent = `${meanElev.toFixed(1)} m`;
  el.elevMax.textContent = `${maxElev.toFixed(1)} m`;
  el.elevRes.textContent = `${avgRes.toFixed(1)} m`;
  renderElevationChart(results);
  el.elevStatusText.textContent = `Live Elevation API sample (${results.length} points) above mean sea level.`;
}

function clearCivicMarkers() {
  for (const m of state.civicMarkers) {
    m.map = null;
  }
  state.civicMarkers = [];
}

function renderCivicPlacesList(places) {
  if (!Array.isArray(places) || places.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel-caption';
    empty.textContent = state.apiKey
      ? 'No live Places API (New) results returned.'
      : 'Configure GOOGLE_MAPS_API_KEY in .env to load live NYC civic reference hubs.';
    el.livePlacesPanel.replaceChildren(empty);
    el.placesCountBadge.textContent = '0';
    return;
  }

  clearCivicMarkers();
  el.placesCountBadge.textContent = `${places.length} Live`;

  const nodes = places.map((place, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'place-item';

    const title = document.createElement('span');
    title.className = 'place-name';
    title.textContent = `${index + 1}. ${place.displayName}`;

    const addr = document.createElement('span');
    addr.className = 'place-address';
    addr.textContent = place.formattedAddress || 'New York, NY';

    btn.appendChild(title);
    btn.appendChild(addr);

    let marker = null;
    if (
      state.map &&
      state.markerLib &&
      place.location &&
      typeof place.location.lat === 'number' &&
      typeof place.location.lng === 'number'
    ) {
      const { AdvancedMarkerElement, PinElement } = state.markerLib;
      const pin = new PinElement({
        background: '#2563eb',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        glyphText: String(index + 1),
      });
      marker = new AdvancedMarkerElement({
        map: state.map,
        position: place.location,
        title: place.displayName,
        content: pin,
      });
      marker.addListener('click', () => {
        if (!state.infoWindow) return;
        state.infoWindow.setContent(
          createInfoCardNode(
            place.displayName,
            place.formattedAddress,
            'Civic Reference Anchor · Places API (New)'
          )
        );
        state.infoWindow.open({ anchor: marker, map: state.map });
      });
      state.civicMarkers.push(marker);
    }

    btn.addEventListener('click', () => {
      if (!state.map || !place.location) return;
      state.map.panTo(place.location);
      state.map.setZoom(14);
      if (marker && state.infoWindow) {
        state.infoWindow.setContent(
          createInfoCardNode(
            place.displayName,
            place.formattedAddress,
            'Civic Reference Anchor · Places API (New)'
          )
        );
        state.infoWindow.open({ anchor: marker, map: state.map });
      }
    });

    return btn;
  });

  el.livePlacesPanel.replaceChildren(...nodes);
}

async function loadCivicReferencePlaces() {
  let normalized = [];

  try {
    if (state.placesLib && state.placesLib.Place) {
      const { Place } = state.placesLib;
      const { places } = await Place.searchByText({
        textQuery: SEED_SEARCH_QUERY,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
        locationBias: { center: NYC_CENTER, radius: 12000 },
        maxResultCount: 6,
      });

      if (Array.isArray(places)) {
        normalized = places.map((p) => ({
          id: p.id || '',
          displayName: p.displayName || 'NYC Civic Hub',
          formattedAddress: p.formattedAddress || '',
          location: p.location
            ? { lat: p.location.lat(), lng: p.location.lng() }
            : null,
          types: Array.isArray(p.types) ? p.types : [],
        }));
      }
    }
  } catch {
    normalized = [];
  }

  if (normalized.length === 0) {
    try {
      const resp = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery: SEED_SEARCH_QUERY,
          maxResultCount: 6,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.places)) {
          normalized = data.places.map((p) => ({
            id: p.id || '',
            displayName: p.displayName || 'NYC Civic Hub',
            formattedAddress: p.formattedAddress || '',
            location: p.location
              ? {
                  lat: Number(p.location.latitude ?? p.location.lat),
                  lng: Number(p.location.longitude ?? p.location.lng),
                }
              : null,
            types: Array.isArray(p.types) ? p.types : [],
          }));
        }
      }
    } catch {
      normalized = [];
    }
  }

  renderCivicPlacesList(normalized);
}

function initPlaceAutocomplete() {
  if (!state.placesLib || !state.placesLib.PlaceAutocompleteElement) return;
  try {
    const { PlaceAutocompleteElement } = state.placesLib;
    const autocomplete = new PlaceAutocompleteElement({
      locationBias: { center: NYC_CENTER, radius: 25000 },
    });
    autocomplete.id = 'place-autocomplete-input';
    el.autocompleteSlot.replaceChildren(autocomplete);

    autocomplete.addEventListener('gmp-select', async (event) => {
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
        });
        if (!place.location || !state.map) return;

        const targetPos = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        state.map.panTo(targetPos);
        state.map.setZoom(15);

        if (state.markerLib) {
          const { AdvancedMarkerElement, PinElement } = state.markerLib;
          if (state.searchMarker) {
            state.searchMarker.map = null;
          }
          const pin = new PinElement({
            background: '#0f172a',
            borderColor: '#ffffff',
            glyphColor: '#ffffff',
            glyphText: '★',
          });
          state.searchMarker = new AdvancedMarkerElement({
            map: state.map,
            position: targetPos,
            title: place.displayName || 'Selected Location',
            content: pin,
          });
          if (state.infoWindow) {
            state.infoWindow.setContent(
              createInfoCardNode(
                place.displayName || 'Selected Location',
                place.formattedAddress || '',
                'PlaceAutocompleteElement Focus'
              )
            );
            state.infoWindow.open({
              anchor: state.searchMarker,
              map: state.map,
            });
          }
        }
      } catch {
        // Ignore transient fetchFields cancellation
      }
    });
  } catch {
    // Non-fatal if Places widget fails to upgrade
  }
}

function bindUiEvents() {
  for (const btn of el.basemapButtons) {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.basemap;
      if (!mode) return;
      state.basemap = mode;
      for (const b of el.basemapButtons) {
        const active = b.dataset.basemap === mode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
      if (state.map) {
        state.map.setMapTypeId(mode);
      }
    });
  }

  for (const btn of el.deckModeButtons) {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.deckMode;
      if (!mode) return;
      state.deckMode = mode;
      for (const b of el.deckModeButtons) {
        const active = b.dataset.deckMode === mode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
      updateDeckLayers();
      if (!state.deckOverlay) {
        el.deckglStatusBadge.textContent = `Mode: ${mode} (WebGL2 unavailable — metrics active)`;
      }
    });
  }

  el.toggleGeoJsonBtn.addEventListener('click', () => {
    state.showGeoJson = !state.showGeoJson;
    el.toggleGeoJsonBtn.classList.toggle('active', state.showGeoJson);
    el.toggleGeoJsonBtn.setAttribute(
      'aria-pressed',
      state.showGeoJson ? 'true' : 'false'
    );
    if (state.map) {
      state.map.data.setMap(state.showGeoJson ? state.map : null);
    }
  });

  el.resetScopeBtn.addEventListener('click', resetScopeToCitywide);

  el.sampleElevationBtn.addEventListener('click', () => {
    void sampleActiveScopeElevation();
  });

  el.terradrawPolygonBtn.addEventListener('click', () => {
    if (state.draw) {
      state.draw.setMode('polygon');
    }
    updateDrawButtonStates('polygon');
  });

  el.terradrawSelectBtn.addEventListener('click', () => {
    if (state.draw) {
      state.draw.setMode('select');
    }
    updateDrawButtonStates('select');
  });

  el.terradrawClearBtn.addEventListener('click', () => {
    if (state.draw) {
      state.draw.clear();
      state.draw.setMode('static');
    }
    updateDrawButtonStates('static');
    state.customPolygonCoords = null;
    state.customPolygonAreaKm2 = 0;
    renderDistrictDirectory();
    styleGeoJsonLayer();
    updateAnalyticsPanel();
    updateDeckLayers();
    void sampleActiveScopeElevation();
  });
}

async function initGoogleMaps() {
  if (!state.apiKey) {
    showBanner(
      'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add a free Maps Demo Key or Cloud API key to load live Google Maps, Elevation, and Places.'
    );
    renderCivicPlacesList([]);
    el.elevStatusText.textContent =
      'Configure GOOGLE_MAPS_API_KEY in .env to enable live Elevation API sampling.';
    el.deckglStatusBadge.textContent = isWebGL2Available()
      ? 'Waiting for Google Maps API key'
      : 'WebGL2 unavailable — analytical summary active';
    return;
  }

  hideBanner();

  try {
    setOptions({
      key: state.apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      mapIds: ['DEMO_MAP_ID'],
    });

    const [coreLib, mapsLib, markerLib, placesLib, elevationLib] =
      await Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('elevation'),
      ]);

    state.coreLib = coreLib;
    state.mapsLib = mapsLib;
    state.markerLib = markerLib;
    state.placesLib = placesLib;
    state.elevationLib = elevationLib;

    const { Map, InfoWindow } = mapsLib;
    state.infoWindow = new InfoWindow();

    state.map = new Map(el.mapContainer, {
      center: NYC_CENTER,
      zoom: INITIAL_ZOOM,
      mapId: 'DEMO_MAP_ID',
      mapTypeId: state.basemap,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    state.map.data.addGeoJson(NYC_DISTRICTS_GEOJSON);
    styleGeoJsonLayer();
    state.map.data.addListener('click', (event) => {
      if (state.drawMode !== 'static') return;
      const districtId = event.feature.getProperty('id');
      if (districtId) {
        selectDistrict(districtId);
      }
    });

    initTerraDraw();
    initDeckOverlay();
    initPlaceAutocomplete();

    await Promise.all([
      loadCivicReferencePlaces(),
      sampleActiveScopeElevation(),
    ]);
  } catch {
    showBanner(
      'Unable to initialize Google Maps JavaScript API. Verify GOOGLE_MAPS_API_KEY and enabled APIs in your Google Cloud project.'
    );
  }
}

function bootstrap() {
  renderDistrictDirectory();
  updateAnalyticsPanel();
  bindUiEvents();
  void initGoogleMaps();
}

bootstrap();
