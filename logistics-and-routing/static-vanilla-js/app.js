import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const DALLAS_CENTER = { lat: 32.7767, lng: -96.797 };
const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const SEED_HUB_QUERY = 'distribution center logistics hub Dallas TX';

const STATUS_META = {
  'En Route': {
    color: '#0F9D58',
    border: '#0B6E3D',
    badgeClass: 'status-badge--en-route',
  },
  Delayed: {
    color: '#D93025',
    border: '#991B1B',
    badgeClass: 'status-badge--delayed',
  },
  Idle: {
    color: '#5F6368',
    border: '#3C4043',
    badgeClass: 'status-badge--idle',
  },
};

// Fleet telematics telemetry units operating along Dallas freight corridors.
// Raw GPS traces carry realistic lateral GPS drift (~15-40m) for Roads API snapping.
const FLEET_VEHICLES = [
  {
    id: 'DAL-104',
    code: '104',
    driver: 'M. Alvarez',
    corridor: 'I-35E Stemmons Fwy NB',
    status: 'En Route',
    speedMph: 54,
    nextStop: 'West Dallas Hub',
    etaText: '11 min',
    position: { lat: 32.7962, lng: -96.8271 },
    rawBreadcrumbs: [
      { lat: 32.7824, lng: -96.8141 },
      { lat: 32.7845, lng: -96.8162 },
      { lat: 32.7861, lng: -96.8174 },
      { lat: 32.7883, lng: -96.8202 },
      { lat: 32.7901, lng: -96.8211 },
      { lat: 32.7923, lng: -96.8238 },
      { lat: 32.7939, lng: -96.8247 },
      { lat: 32.7962, lng: -96.8271 },
    ],
  },
  {
    id: 'DAL-218',
    code: '218',
    driver: 'R. Patel',
    corridor: 'I-30 East R.L. Thornton',
    status: 'Delayed',
    speedMph: 16,
    nextStop: 'East Garland Cross-Dock',
    etaText: '24 min',
    position: { lat: 32.7849, lng: -96.7621 },
    rawBreadcrumbs: [
      { lat: 32.7794, lng: -96.7844 },
      { lat: 32.7805, lng: -96.7809 },
      { lat: 32.7812, lng: -96.7776 },
      { lat: 32.7826, lng: -96.7741 },
      { lat: 32.7831, lng: -96.7704 },
      { lat: 32.7844, lng: -96.7668 },
      { lat: 32.7849, lng: -96.7621 },
    ],
  },
  {
    id: 'DAL-309',
    code: '309',
    driver: 'T. Brooks',
    corridor: 'US-75 Central Expy NB',
    status: 'En Route',
    speedMph: 48,
    nextStop: 'North Richardson Terminal',
    etaText: '15 min',
    position: { lat: 32.8154, lng: -96.7875 },
    rawBreadcrumbs: [
      { lat: 32.8012, lng: -96.7918 },
      { lat: 32.8041, lng: -96.7906 },
      { lat: 32.8069, lng: -96.7901 },
      { lat: 32.8098, lng: -96.7889 },
      { lat: 32.8126, lng: -96.7886 },
      { lat: 32.8154, lng: -96.7875 },
    ],
  },
  {
    id: 'DAL-412',
    code: '412',
    driver: 'K. Nguyen',
    corridor: 'I-45 South Freight Yard',
    status: 'Idle',
    speedMph: 0,
    nextStop: 'Bay 4 Staging',
    etaText: 'Docked',
    position: { lat: 32.7525, lng: -96.7782 },
    rawBreadcrumbs: [
      { lat: 32.7523, lng: -96.7785 },
      { lat: 32.7525, lng: -96.7782 },
    ],
  },
  {
    id: 'DAL-527',
    code: '527',
    driver: 'J. Morales',
    corridor: 'Loop 12 Walton Walker',
    status: 'Delayed',
    speedMph: 21,
    nextStop: 'Irving Logistics Park',
    etaText: '19 min',
    position: { lat: 32.7695, lng: -96.8712 },
    rawBreadcrumbs: [
      { lat: 32.7574, lng: -96.8721 },
      { lat: 32.7604, lng: -96.8714 },
      { lat: 32.7634, lng: -96.8722 },
      { lat: 32.7665, lng: -96.8707 },
      { lat: 32.7695, lng: -96.8712 },
    ],
  },
];

const state = {
  apiKey: '',
  activeFilter: 'ALL',
  selectedVehicleId: FLEET_VEHICLES[0].id,
  traceVehicleId: FLEET_VEHICLES[0].id,
  showSnappedOverlay: true,
  optimizeWaypoints: false,
  trafficEnabled: false,
  depot: null,
  stops: [],
  matrixRows: [],
  routeSummary: null,
  snapResult: null,
  gmaps: null,
  map: null,
  trafficLayer: null,
  infoWindow: null,
  vehicleMarkers: new Map(),
  hubMarkers: [],
  rawPolyline: null,
  snappedPolyline: null,
  dispatchPolyline: null,
};

const dom = {
  banner: document.getElementById('api-status-banner'),
  fleetList: document.getElementById('fleet-vehicle-list'),
  fleetSummaryLabel: document.getElementById('fleet-summary-label'),
  countAll: document.getElementById('count-all'),
  countEnRoute: document.getElementById('count-en-route'),
  countDelayed: document.getElementById('count-delayed'),
  countIdle: document.getElementById('count-idle'),
  filterButtons: Array.from(document.querySelectorAll('.filter-pill[data-status]')),
  trafficToggle: document.getElementById('traffic-layer-toggle'),
  autocompleteContainer: document.getElementById('place-autocomplete-container'),
  snapToggle: document.getElementById('snap-to-roads-toggle'),
  traceVehicleSelect: document.getElementById('trace-vehicle-select'),
  resnapBtn: document.getElementById('resnap-btn'),
  snappedVehicleLabel: document.getElementById('snapped-vehicle-label'),
  rawPointCount: document.getElementById('raw-point-count'),
  snappedPointCount: document.getElementById('snapped-point-count'),
  roadSegmentCount: document.getElementById('road-segment-count'),
  meanSnapOffset: document.getElementById('mean-snap-offset'),
  hubSourceLabel: document.getElementById('hub-source-label'),
  depotSummary: document.getElementById('depot-summary'),
  stopSequenceList: document.getElementById('stop-sequence-list'),
  optimizeToggle: document.getElementById('optimize-waypoints-toggle'),
  computeDispatchBtn: document.getElementById('calculate-dispatch-route-btn'),
  dispatchTotalSummary: document.getElementById('dispatch-total-summary'),
  matrixTableBody: document.getElementById('matrix-table-body'),
  mapCanvas: document.getElementById('map'),
};

function showBanner(message, isError = false) {
  if (!message) {
    dom.banner.classList.add('is-hidden');
    dom.banner.classList.remove('is-error');
    dom.banner.textContent = '';
    return;
  }
  dom.banner.textContent = message;
  dom.banner.classList.remove('is-hidden');
  dom.banner.classList.toggle('is-error', isError);
}

function formatDurationSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function parseDurationToSeconds(durationValue) {
  if (typeof durationValue === 'number') return durationValue;
  if (typeof durationValue === 'string' && durationValue.endsWith('s')) {
    const parsed = Number.parseFloat(durationValue.slice(0, -1));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatMetersToMiles(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getFilteredVehicles() {
  if (state.activeFilter === 'ALL') return FLEET_VEHICLES;
  return FLEET_VEHICLES.filter((v) => v.status === state.activeFilter);
}

function updateFilterCounts() {
  dom.countAll.textContent = String(FLEET_VEHICLES.length);
  dom.countEnRoute.textContent = String(
    FLEET_VEHICLES.filter((v) => v.status === 'En Route').length
  );
  dom.countDelayed.textContent = String(
    FLEET_VEHICLES.filter((v) => v.status === 'Delayed').length
  );
  dom.countIdle.textContent = String(
    FLEET_VEHICLES.filter((v) => v.status === 'Idle').length
  );
}

function renderFleetList() {
  const vehicles = getFilteredVehicles();
  dom.fleetSummaryLabel.textContent = `${vehicles.length} of ${FLEET_VEHICLES.length} shown`;

  const cards = vehicles.map((vehicle) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'vehicle-card';
    if (vehicle.id === state.selectedVehicleId) {
      card.classList.add('is-selected');
    }

    const topRow = document.createElement('div');
    topRow.className = 'vehicle-card-top';

    const idGroup = document.createElement('div');
    idGroup.className = 'vehicle-id-group';

    const idEl = document.createElement('span');
    idEl.className = 'vehicle-id';
    idEl.textContent = vehicle.id;

    const corridorEl = document.createElement('span');
    corridorEl.className = 'vehicle-corridor';
    corridorEl.textContent = vehicle.corridor;

    idGroup.append(idEl, corridorEl);

    const badge = document.createElement('span');
    const meta = STATUS_META[vehicle.status] || STATUS_META.Idle;
    badge.className = `status-badge ${meta.badgeClass}`;
    badge.textContent = vehicle.status;

    topRow.append(idGroup, badge);

    const telemetryRow = document.createElement('div');
    telemetryRow.className = 'vehicle-telemetry-row';

    const speedSpan = document.createElement('span');
    const speedStrong = document.createElement('strong');
    speedStrong.textContent = `${vehicle.speedMph} mph`;
    speedSpan.append(speedStrong);

    const stopSpan = document.createElement('span');
    stopSpan.textContent = `Next: ${vehicle.nextStop}`;

    const etaSpan = document.createElement('span');
    etaSpan.textContent = `ETA: ${vehicle.etaText}`;

    telemetryRow.append(speedSpan, stopSpan, etaSpan);
    card.append(topRow, telemetryRow);

    card.addEventListener('click', () => {
      focusVehicle(vehicle.id);
    });

    return card;
  });

  dom.fleetList.replaceChildren(...cards);
}

function populateTraceVehicleSelect() {
  const options = FLEET_VEHICLES.map((vehicle) => {
    const opt = document.createElement('option');
    opt.value = vehicle.id;
    opt.textContent = `${vehicle.id} — ${vehicle.corridor} (${vehicle.rawBreadcrumbs.length} pts)`;
    return opt;
  });
  dom.traceVehicleSelect.replaceChildren(...options);
  dom.traceVehicleSelect.value = state.traceVehicleId;
}

function renderDispatchStops() {
  dom.depotSummary.replaceChildren();
  if (state.depot) {
    const tag = document.createElement('span');
    tag.className = 'depot-tag';
    tag.textContent = 'Central Depot (Origin)';

    const name = document.createElement('strong');
    name.textContent = state.depot.name;

    const addr = document.createElement('span');
    addr.className = 'vehicle-corridor';
    addr.textContent = state.depot.address;

    dom.depotSummary.append(tag, name, addr);
  } else {
    const empty = document.createElement('span');
    empty.textContent = 'Waiting for Dallas logistics hub discovery via Places API (New)...';
    dom.depotSummary.append(empty);
  }

  const items = state.stops.map((stop, idx) => {
    const li = document.createElement('li');
    li.className = 'stop-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'stop-item-name';
    nameSpan.textContent = `${stop.name}`;

    const metaWrap = document.createElement('span');
    if (state.stops.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'stop-remove-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        state.stops.splice(idx, 1);
        renderDispatchStops();
        renderHubMarkers();
        void computeDispatchAndMatrix();
      });
      metaWrap.append(removeBtn);
    }

    li.append(nameSpan, metaWrap);
    return li;
  });

  dom.stopSequenceList.replaceChildren(...items);
}

function renderMatrixTable() {
  if (!state.matrixRows.length) {
    const emptyRow = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = state.apiKey
      ? 'Click "Compute Dispatch & Matrix" to compute live ETAs.'
      : 'Configure GOOGLE_MAPS_API_KEY in .env to compute live Routes API matrix.';
    emptyRow.append(td);
    dom.matrixTableBody.replaceChildren(emptyRow);
    return;
  }

  const rows = state.matrixRows.map((entry) => {
    const tr = document.createElement('tr');

    const hubTd = document.createElement('td');
    hubTd.textContent = entry.label;

    const distTd = document.createElement('td');
    distTd.textContent = entry.distanceText;

    const etaTd = document.createElement('td');
    etaTd.textContent = entry.durationText;

    const condTd = document.createElement('td');
    condTd.textContent = entry.conditionText;

    tr.append(hubTd, distTd, etaTd, condTd);
    return tr;
  });

  dom.matrixTableBody.replaceChildren(...rows);
}

function renderSnapMetrics() {
  const vehicle = FLEET_VEHICLES.find((v) => v.id === state.traceVehicleId) || FLEET_VEHICLES[0];
  dom.snappedVehicleLabel.textContent = `Vehicle ${vehicle.id} · ${vehicle.corridor}`;
  dom.rawPointCount.textContent = String(vehicle.rawBreadcrumbs.length);

  if (!state.snapResult) {
    dom.snappedPointCount.textContent = '—';
    dom.roadSegmentCount.textContent = '—';
    dom.meanSnapOffset.textContent = '—';
    return;
  }

  const { snappedPoints, meanOffsetMeters, distinctSegments } = state.snapResult;
  dom.snappedPointCount.textContent = String(snappedPoints.length);
  dom.roadSegmentCount.textContent = String(distinctSegments);
  dom.meanSnapOffset.textContent =
    meanOffsetMeters !== null ? `${meanOffsetMeters.toFixed(1)} m` : '—';
}

function buildInfoCardElement(title, lines) {
  const wrap = document.createElement('div');
  wrap.className = 'info-card';

  const titleEl = document.createElement('div');
  titleEl.className = 'info-card-title';
  titleEl.textContent = title;
  wrap.append(titleEl);

  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'info-card-line';
    row.textContent = line;
    wrap.append(row);
  }
  return wrap;
}

function syncVehicleMarkerVisibility() {
  if (!state.map) return;
  const allowedIds = new Set(getFilteredVehicles().map((v) => v.id));
  for (const [vehicleId, marker] of state.vehicleMarkers.entries()) {
    marker.map = allowedIds.has(vehicleId) ? state.map : null;
  }
}

function focusVehicle(vehicleId) {
  state.selectedVehicleId = vehicleId;
  renderFleetList();

  const vehicle = FLEET_VEHICLES.find((v) => v.id === vehicleId);
  const marker = state.vehicleMarkers.get(vehicleId);
  if (!vehicle || !state.map || !marker || !state.infoWindow) return;

  state.map.panTo(vehicle.position);
  state.infoWindow.setContent(
    buildInfoCardElement(`${vehicle.id} (${vehicle.status})`, [
      `Driver: ${vehicle.driver}`,
      `Corridor: ${vehicle.corridor}`,
      `Speed: ${vehicle.speedMph} mph`,
      `Next Stop: ${vehicle.nextStop} (${vehicle.etaText})`,
    ])
  );
  state.infoWindow.open({ anchor: marker, map: state.map });
}

function renderVehicleMarkers() {
  if (!state.gmaps || !state.map) return;
  const { AdvancedMarkerElement, PinElement } = state.gmaps.marker;

  for (const marker of state.vehicleMarkers.values()) {
    marker.map = null;
  }
  state.vehicleMarkers.clear();

  for (const vehicle of FLEET_VEHICLES) {
    const meta = STATUS_META[vehicle.status] || STATUS_META.Idle;
    const pin = new PinElement({
      background: meta.color,
      borderColor: meta.border,
      glyphColor: '#FFFFFF',
      glyphText: vehicle.code,
      scale: 1.05,
    });
    pin.style.cursor = 'pointer';

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: vehicle.position,
      title: `${vehicle.id} · ${vehicle.status}`,
      zIndex: 20,
    });
    marker.append(pin);

    marker.addListener('click', () => {
      focusVehicle(vehicle.id);
    });

    state.vehicleMarkers.set(vehicle.id, marker);
  }

  syncVehicleMarkerVisibility();
}

function renderHubMarkers() {
  if (!state.gmaps || !state.map) return;
  const { AdvancedMarkerElement, PinElement } = state.gmaps.marker;

  for (const m of state.hubMarkers) {
    m.map = null;
  }
  state.hubMarkers = [];

  if (state.depot) {
    const depotPin = new PinElement({
      background: '#1E3A8A',
      borderColor: '#0F172A',
      glyphColor: '#FFFFFF',
      glyphText: 'D',
      scale: 1.15,
    });
    depotPin.style.cursor = 'pointer';

    const depotMarker = new AdvancedMarkerElement({
      map: state.map,
      position: state.depot.location,
      title: `Depot: ${state.depot.name}`,
      zIndex: 30,
    });
    depotMarker.append(depotPin);
    depotMarker.addListener('click', () => {
      state.infoWindow.setContent(
        buildInfoCardElement(`Central Depot: ${state.depot.name}`, [
          state.depot.address,
          'Dispatch origin for Dallas multi-stop corridor',
        ])
      );
      state.infoWindow.open({ anchor: depotMarker, map: state.map });
    });
    state.hubMarkers.push(depotMarker);
  }

  state.stops.forEach((stop, index) => {
    const stopPin = new PinElement({
      background: '#1D4ED8',
      borderColor: '#1E3A8A',
      glyphColor: '#FFFFFF',
      glyphText: String(index + 1),
      scale: 1.0,
    });
    stopPin.style.cursor = 'pointer';

    const stopMarker = new AdvancedMarkerElement({
      map: state.map,
      position: stop.location,
      title: `Stop ${index + 1}: ${stop.name}`,
      zIndex: 25,
    });
    stopMarker.append(stopPin);
    stopMarker.addListener('click', () => {
      state.infoWindow.setContent(
        buildInfoCardElement(`Hub Stop #${index + 1}: ${stop.name}`, [stop.address])
      );
      state.infoWindow.open({ anchor: stopMarker, map: state.map });
    });
    state.hubMarkers.push(stopMarker);
  });
}

function drawTracePolylines() {
  if (!state.gmaps || !state.map) return;
  const { Polyline } = state.gmaps.maps;

  if (state.rawPolyline) {
    state.rawPolyline.setMap(null);
    state.rawPolyline = null;
  }
  if (state.snappedPolyline) {
    state.snappedPolyline.setMap(null);
    state.snappedPolyline = null;
  }

  const vehicle = FLEET_VEHICLES.find((v) => v.id === state.traceVehicleId) || FLEET_VEHICLES[0];

  // Dashed amber line for noisy raw GPS breadcrumbs
  state.rawPolyline = new Polyline({
    path: vehicle.rawBreadcrumbs,
    geodesic: true,
    strokeColor: '#F59E0B',
    strokeOpacity: 0,
    strokeWeight: 3,
    icons: [
      {
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.95,
          strokeColor: '#F59E0B',
          scale: 3,
        },
        offset: '0',
        repeat: '12px',
      },
    ],
    zIndex: 4,
    map: state.map,
  });

  if (state.showSnappedOverlay && state.snapResult && state.snapResult.snappedPoints.length > 0) {
    const snappedPath = state.snapResult.snappedPoints.map((pt) => ({
      lat: pt.location.latitude,
      lng: pt.location.longitude,
    }));

    state.snappedPolyline = new Polyline({
      path: snappedPath,
      geodesic: true,
      strokeColor: '#0284C7',
      strokeOpacity: 0.94,
      strokeWeight: 5,
      zIndex: 6,
      map: state.map,
    });
  }
}

async function runSnapToRoads() {
  const vehicle = FLEET_VEHICLES.find((v) => v.id === state.traceVehicleId) || FLEET_VEHICLES[0];
  state.snapResult = null;
  renderSnapMetrics();
  drawTracePolylines();

  if (!state.apiKey) return;

  try {
    const resp = await fetch('/api/roads/snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: vehicle.rawBreadcrumbs,
        interpolate: true,
      }),
    });

    const data = await resp.json();
    if (!resp.ok || data.error) {
      const msg = data.error?.message || data.error || `HTTP ${resp.status}`;
      showBanner(`Roads API notice: ${msg}`, false);
      return;
    }

    const snappedPoints = Array.isArray(data.snappedPoints) ? data.snappedPoints : [];
    const segmentIds = new Set(snappedPoints.map((p) => p.placeId).filter(Boolean));

    const offsets = [];
    for (const pt of snappedPoints) {
      if (typeof pt.originalIndex === 'number' && vehicle.rawBreadcrumbs[pt.originalIndex]) {
        const rawPt = vehicle.rawBreadcrumbs[pt.originalIndex];
        const snappedLatLng = {
          lat: pt.location.latitude,
          lng: pt.location.longitude,
        };
        offsets.push(haversineMeters(rawPt, snappedLatLng));
      }
    }

    const meanOffsetMeters =
      offsets.length > 0
        ? offsets.reduce((sum, val) => sum + val, 0) / offsets.length
        : null;

    state.snapResult = {
      snappedPoints,
      distinctSegments: segmentIds.size,
      meanOffsetMeters,
    };
    renderSnapMetrics();
    drawTracePolylines();
  } catch (err) {
    showBanner(
      `Unable to snap GPS trace: ${err instanceof Error ? err.message : 'Network error'}`,
      false
    );
  }
}

async function discoverDallasLogisticsHubs() {
  if (!state.apiKey) {
    dom.hubSourceLabel.textContent = 'API key required for live Places API (New) hub discovery';
    return;
  }

  let placesList = [];

  try {
    const resp = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: SEED_HUB_QUERY,
        maxResultCount: 5,
        locationBias: {
          circle: {
            center: { latitude: DALLAS_CENTER.lat, longitude: DALLAS_CENTER.lng },
            radius: 22000,
          },
        },
      }),
    });
    const data = await resp.json();
    if (resp.ok && Array.isArray(data.places) && data.places.length > 0) {
      placesList = data.places.map((p) => ({
        id: p.id,
        name: p.displayName?.text || 'Dallas Logistics Hub',
        address: p.formattedAddress || 'Dallas, TX',
        location: {
          lat: p.location.latitude,
          lng: p.location.longitude,
        },
      }));
    }
  } catch {
    // Will try Places JS SDK below
  }

  // Fallback to Places JS library Place.searchByText if backend key is browser-referrer restricted
  if (placesList.length === 0 && state.gmaps?.places?.Place?.searchByText) {
    try {
      const { Place } = state.gmaps.places;
      const { places } = await Place.searchByText({
        textQuery: SEED_HUB_QUERY,
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        maxResultCount: 5,
        locationBias: { center: DALLAS_CENTER, radius: 22000 },
      });
      placesList = (places || [])
        .filter((p) => p.location)
        .map((p) => ({
          id: p.id,
          name: p.displayName || 'Dallas Logistics Hub',
          address: p.formattedAddress || 'Dallas, TX',
          location: {
            lat: p.location.lat(),
            lng: p.location.lng(),
          },
        }));
    } catch (err) {
      showBanner(
        `Places API (New) discovery error: ${err instanceof Error ? err.message : 'Request failed'}`,
        false
      );
    }
  }

  if (placesList.length > 0) {
    state.depot = placesList[0];
    state.stops = placesList.slice(1, 5);
    dom.hubSourceLabel.textContent = `Live Places API (New): ${placesList.length} Dallas hubs`;

    // Sync vehicle nextStop labels with live discovered hubs
    FLEET_VEHICLES.forEach((v, idx) => {
      const hub = state.stops[idx % state.stops.length] || state.depot;
      if (hub && v.status !== 'Idle') {
        v.nextStop = hub.name;
      }
    });
    renderFleetList();
    renderDispatchStops();
    renderHubMarkers();
  } else {
    dom.hubSourceLabel.textContent = 'No hubs returned; use hub search bar to add stops';
  }
}

function clearDispatchPolyline() {
  if (state.dispatchPolyline) {
    state.dispatchPolyline.setMap(null);
    state.dispatchPolyline = null;
  }
}

function drawDecodedRoutePath(pathPoints) {
  if (!state.gmaps || !state.map) return;
  const { Polyline } = state.gmaps.maps;
  clearDispatchPolyline();

  state.dispatchPolyline = new Polyline({
    path: pathPoints,
    geodesic: true,
    strokeColor: '#1D4ED8',
    strokeOpacity: 0.86,
    strokeWeight: 5,
    zIndex: 3,
    map: state.map,
  });
}

async function computeRouteViaProxy(origin, intermediates, destination) {
  const toWaypoint = (hub) => ({
    location: {
      latLng: {
        latitude: hub.location.lat,
        longitude: hub.location.lng,
      },
    },
  });

  const payload = {
    origin: toWaypoint(origin),
    destination: toWaypoint(destination),
    intermediates: intermediates.map(toWaypoint),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: Boolean(state.optimizeWaypoints && intermediates.length > 1),
  };

  const resp = await fetch('/api/routes/compute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error(data.error?.message || data.error || `Routes API HTTP ${resp.status}`);
  }

  const route = data.routes[0];
  const encoded = route.polyline?.encodedPolyline;
  const path =
    encoded && state.gmaps?.geometry?.encoding?.decodePath
      ? state.gmaps.geometry.encoding.decodePath(encoded)
      : [];

  return {
    distanceMeters: route.distanceMeters || 0,
    durationSeconds: parseDurationToSeconds(route.duration),
    path,
    optimizedOrder: route.optimizedIntermediateWaypointIndex || null,
  };
}

async function computeRouteViaJsSdk(origin, intermediates, destination) {
  const { Route } = state.gmaps.routes;
  const request = {
    origin: origin.location,
    destination: destination.location,
    intermediates: intermediates.map((s) => ({ location: s.location })),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: Boolean(state.optimizeWaypoints && intermediates.length > 1),
    fields: ['path', 'distanceMeters', 'durationMillis', 'optimizedIntermediateWaypointIndex'],
  };

  const { routes } = await Route.computeRoutes(request);
  if (!routes || routes.length === 0) {
    throw new Error('No routes returned from Route.computeRoutes');
  }

  const route = routes[0];
  return {
    distanceMeters: route.distanceMeters || 0,
    durationSeconds: Math.round((route.durationMillis || 0) / 1000),
    path: route.path || [],
    optimizedOrder: route.optimizedIntermediateWaypointIndex || null,
  };
}

async function computeMatrixViaProxy(origin, stops) {
  const payload = {
    origins: [
      {
        waypoint: {
          location: {
            latLng: { latitude: origin.location.lat, longitude: origin.location.lng },
          },
        },
      },
    ],
    destinations: stops.map((stop) => ({
      waypoint: {
        location: {
          latLng: { latitude: stop.location.lat, longitude: stop.location.lng },
        },
      },
    })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  };

  const resp = await fetch('/api/routes/matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok || !Array.isArray(data)) {
    throw new Error(data.error?.message || data.error || `Matrix HTTP ${resp.status}`);
  }

  return data.map((el) => {
    const destIdx = el.destinationIndex ?? 0;
    const stop = stops[destIdx];
    const secs = parseDurationToSeconds(el.duration);
    return {
      index: destIdx,
      label: `Depot -> ${stop ? stop.name : `Stop ${destIdx + 1}`}`,
      distanceText: formatMetersToMiles(el.distanceMeters),
      durationText: formatDurationSeconds(secs),
      conditionText: el.condition === 'ROUTE_EXISTS' ? 'Active' : el.condition || 'OK',
    };
  });
}

async function computeMatrixViaJsSdk(origin, stops) {
  const { RouteMatrix } = state.gmaps.routes;
  const response = await RouteMatrix.computeRouteMatrix({
    origins: [origin.location],
    destinations: stops.map((s) => s.location),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: ['distanceMeters', 'durationMillis', 'condition'],
  });

  const row = response?.matrix?.rows?.[0];
  const items = row?.items || [];
  return items.map((item, idx) => {
    const stop = stops[idx];
    return {
      index: idx,
      label: `Depot -> ${stop ? stop.name : `Stop ${idx + 1}`}`,
      distanceText: formatMetersToMiles(item.distanceMeters),
      durationText: formatDurationSeconds(Math.round((item.durationMillis || 0) / 1000)),
      conditionText: item.condition === 'ROUTE_EXISTS' ? 'Active' : item.condition || 'OK',
    };
  });
}

async function computeDispatchAndMatrix() {
  if (!state.apiKey || !state.depot || state.stops.length === 0) {
    renderMatrixTable();
    return;
  }

  dom.computeDispatchBtn.disabled = true;
  dom.dispatchTotalSummary.textContent = 'Computing...';

  const origin = state.depot;
  const destination = state.stops[state.stops.length - 1];
  const intermediates = state.stops.slice(0, -1);

  try {
    let routeData;
    try {
      routeData = await computeRouteViaProxy(origin, intermediates, destination);
    } catch {
      routeData = await computeRouteViaJsSdk(origin, intermediates, destination);
    }

    if (
      Array.isArray(routeData.optimizedOrder) &&
      routeData.optimizedOrder.length === intermediates.length &&
      state.optimizeWaypoints
    ) {
      const reordered = routeData.optimizedOrder.map((idx) => intermediates[idx]);
      state.stops = [...reordered, destination];
      renderDispatchStops();
      renderHubMarkers();
    }

    if (routeData.path.length > 0) {
      drawDecodedRoutePath(routeData.path);
    }

    dom.dispatchTotalSummary.textContent = `${formatMetersToMiles(
      routeData.distanceMeters
    )} · ${formatDurationSeconds(routeData.durationSeconds)}`;

    let matrixRows;
    try {
      matrixRows = await computeMatrixViaProxy(origin, state.stops);
    } catch {
      matrixRows = await computeMatrixViaJsSdk(origin, state.stops);
    }

    matrixRows.sort((a, b) => a.index - b.index);
    state.matrixRows = matrixRows;
    renderMatrixTable();
  } catch (err) {
    dom.dispatchTotalSummary.textContent = 'Route unavailable';
    showBanner(
      `Routes API notice: ${err instanceof Error ? err.message : 'Unable to compute route'}`,
      false
    );
  } finally {
    dom.computeDispatchBtn.disabled = false;
  }
}

function mountPlaceAutocomplete() {
  if (!state.gmaps?.places?.PlaceAutocompleteElement) {
    const fallback = document.createElement('input');
    fallback.type = 'text';
    fallback.className = 'autocomplete-fallback';
    fallback.disabled = true;
    fallback.placeholder = 'Add Dallas hub (API key required)';
    dom.autocompleteContainer.replaceChildren(fallback);
    return;
  }

  const { PlaceAutocompleteElement } = state.gmaps.places;
  const autocomplete = new PlaceAutocompleteElement({
    locationBias: {
      center: DALLAS_CENTER,
      radius: 30000,
    },
  });
  autocomplete.setAttribute('aria-label', 'Add Dallas dispatch hub');

  autocomplete.addEventListener('gmp-select', async (event) => {
    const prediction = event.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      if (!place.location) return;

      const newHub = {
        id: place.id,
        name: place.displayName || 'Custom Dallas Stop',
        address: place.formattedAddress || 'Dallas, TX',
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      };

      if (!state.depot) {
        state.depot = newHub;
      } else {
        state.stops.push(newHub);
      }

      renderDispatchStops();
      renderHubMarkers();
      state.map.panTo(newHub.location);
      await computeDispatchAndMatrix();
    } catch (err) {
      showBanner(
        `Place selection error: ${err instanceof Error ? err.message : 'Unable to load place'}`,
        false
      );
    }
  });

  autocomplete.addEventListener('gmp-error', () => {
    showBanner('Place Autocomplete request was rejected for the current API key.', false);
  });

  dom.autocompleteContainer.replaceChildren(autocomplete);
}

function bindUiListeners() {
  dom.filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.status || 'ALL';
      dom.filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
      renderFleetList();
      syncVehicleMarkerVisibility();
    });
  });

  dom.trafficToggle.addEventListener('change', () => {
    state.trafficEnabled = dom.trafficToggle.checked;
    if (state.trafficLayer && state.map) {
      state.trafficLayer.setMap(state.trafficEnabled ? state.map : null);
    }
  });

  dom.snapToggle.addEventListener('change', () => {
    state.showSnappedOverlay = dom.snapToggle.checked;
    drawTracePolylines();
  });

  dom.traceVehicleSelect.addEventListener('change', () => {
    state.traceVehicleId = dom.traceVehicleSelect.value;
    void runSnapToRoads();
  });

  dom.resnapBtn.addEventListener('click', () => {
    void runSnapToRoads();
  });

  dom.optimizeToggle.addEventListener('change', () => {
    state.optimizeWaypoints = dom.optimizeToggle.checked;
    void computeDispatchAndMatrix();
  });

  dom.computeDispatchBtn.addEventListener('click', () => {
    void computeDispatchAndMatrix();
  });
}

async function initMapsPlatform() {
  const apiKey = window.__GMP_CONFIG__?.apiKey || '';
  state.apiKey = apiKey;

  if (!apiKey) {
    showBanner(
      'GOOGLE_MAPS_API_KEY is not set in .env. Add a free Maps Demo Key or Google Cloud key to enable the live Dallas vector map, Places hub discovery, Roads API snapping, and Routes API dispatch.',
      false
    );
    mountPlaceAutocomplete();
    renderMatrixTable();
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });

    const [coreLib, mapsLib, markerLib, placesLib, routesLib, geometryLib] =
      await Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('geometry'),
      ]);

    state.gmaps = {
      core: coreLib,
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      geometry: geometryLib,
    };

    const { Map, TrafficLayer, InfoWindow } = mapsLib;
    state.map = new Map(dom.mapCanvas, {
      center: DALLAS_CENTER,
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    state.trafficLayer = new TrafficLayer();
    state.infoWindow = new InfoWindow();

    renderVehicleMarkers();
    drawTracePolylines();
    mountPlaceAutocomplete();

    await Promise.all([discoverDallasLogisticsHubs(), runSnapToRoads()]);
    await computeDispatchAndMatrix();
  } catch (err) {
    showBanner(
      `Maps JavaScript initialization failed: ${
        err instanceof Error ? err.message : 'Check API key and enabled APIs'
      }`,
      true
    );
  }
}

function bootstrap() {
  updateFilterCounts();
  renderFleetList();
  populateTraceVehicleSelect();
  renderSnapMetrics();
  renderDispatchStops();
  renderMatrixTable();
  bindUiListeners();
  void initMapsPlatform();
}

bootstrap();
