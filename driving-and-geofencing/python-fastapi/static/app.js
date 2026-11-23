// Field Workforce Geofenced Attendance & Site Audit Router (Austin, TX)
// Uses Maps JS dynamic library loader, AdvancedMarkerElement, PinElement,
// geometry.poly.containsLocation, geometry.encoding.decodePath, Terra Draw,
// and FastAPI BFF proxies for Places API (New), Routes API v2, and Geocoding API v4.

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };
const DEFAULT_ZOOM = 12;

const PRESEEDED_ZONES = [
  {
    id: 'zone-downtown',
    name: 'Downtown Congress Flagship',
    color: '#1a73e8',
    paths: [
      { lat: 30.2708, lng: -97.7468 },
      { lat: 30.2708, lng: -97.7392 },
      { lat: 30.2636, lng: -97.7392 },
      { lat: 30.2636, lng: -97.7468 },
    ],
  },
  {
    id: 'zone-soco',
    name: 'South Congress Retail Strip',
    color: '#0f9d58',
    paths: [
      { lat: 30.2528, lng: -97.7532 },
      { lat: 30.2528, lng: -97.7458 },
      { lat: 30.2448, lng: -97.7458 },
      { lat: 30.2448, lng: -97.7532 },
    ],
  },
  {
    id: 'zone-east6',
    name: 'East 6th & Cesar Corridor',
    color: '#d97706',
    paths: [
      { lat: 30.2685, lng: -97.7285 },
      { lat: 30.2685, lng: -97.7195 },
      { lat: 30.261, lng: -97.7195 },
      { lat: 30.261, lng: -97.7285 },
    ],
  },
];

const WORKER_PRESETS = {
  'inside-downtown': {
    label: 'Downtown Congress Flagship',
    lat: 30.2672,
    lng: -97.7431,
  },
  'inside-soco': {
    label: 'South Congress Retail Strip',
    lat: 30.2488,
    lng: -97.7495,
  },
  'inside-east6': {
    label: 'East 6th & Cesar Corridor',
    lat: 30.2648,
    lng: -97.724,
  },
  'outside-zilker': {
    label: 'Zilker Park Staging Lot',
    lat: 30.2669,
    lng: -97.7729,
  },
  'outside-airport': {
    label: 'Austin-Bergstrom Transit Gate',
    lat: 30.2025,
    lng: -97.6664,
  },
};

const state = {
  map: null,
  infoWindow: null,
  workerMarker: null,
  workerPinEl: null,
  workerPosition: { ...AUSTIN_CENTER },
  preseededZones: [],
  drawnZones: [],
  terraDraw: null,
  drawMode: 'static',
  auditStops: [],
  orderedStops: [],
  stopMarkers: [],
  routePolyline: null,
  routeSummary: null,
  activeZoneNames: [],
  clockedInAt: null,
  mapsLibraries: {},
};

const dom = {
  headerGeofenceCount: document.getElementById('header-geofence-count'),
  headerClockinPill: document.getElementById('header-clockin-pill'),
  headerRoutePill: document.getElementById('header-route-pill'),
  workerPresetSelect: document.getElementById('worker-preset-select'),
  geofenceStatusBadge: document.getElementById('geofence-status-badge'),
  workerAddress: document.getElementById('worker-address'),
  workerCoords: document.getElementById('worker-coords'),
  verifiedClockinBadge: document.getElementById('verified-clockin-badge'),
  verifiedClockinText: document.getElementById('verified-clockin-text'),
  clockinActionBtn: document.getElementById('clockin-action-btn'),
  clockinFeedback: document.getElementById('clockin-feedback'),
  drawnZoneCount: document.getElementById('drawn-zone-count'),
  geofenceList: document.getElementById('geofence-list'),
  siteSearchForm: document.getElementById('site-search-form'),
  siteSearchInput: document.getElementById('site-search-input'),
  siteSearchBtn: document.getElementById('site-search-btn'),
  optimizeRouteBtn: document.getElementById('optimize-route-btn'),
  routeSummary: document.getElementById('route-summary'),
  auditStopsList: document.getElementById('audit-stops-list'),
  mapContainer: document.getElementById('map-container'),
  drawPolygonBtn: document.getElementById('draw-polygon-btn'),
  selectModeBtn: document.getElementById('select-mode-btn'),
  panModeBtn: document.getElementById('pan-mode-btn'),
  clearDrawnBtn: document.getElementById('clear-drawn-btn'),
  mapStatusBanner: document.getElementById('map-status-banner'),
};

function showBanner(message) {
  dom.mapStatusBanner.textContent = message;
  dom.mapStatusBanner.hidden = false;
}

function hideBanner() {
  dom.mapStatusBanner.hidden = true;
  dom.mapStatusBanner.textContent = '';
}

function loadMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return;
  }
  ((g) => {
    let h;
    let a;
    let k;
    const p = 'The Google Maps JavaScript API';
    const c = 'google';
    const l = 'importLibrary';
    const q = '__ib__';
    const m = document;
    const b = window;
    const root = (b[c] = b[c] || {});
    const d = (root.maps = root.maps || {});
    const r = new Set();
    const e = new URLSearchParams();
    const u = () =>
      h ||
      (h = new Promise(async (f, n) => {
        a = m.createElement('script');
        e.set('libraries', [...r] + '');
        for (k in g) {
          e.set(
            k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
            g[k],
          );
        }
        e.set('callback', `${c}.maps.${q}`);
        a.src = `https://maps.${c}apis.com/maps/api/js?${e}`;
        d[q] = f;
        a.onerror = () => {
          h = undefined;
          n(new Error(`${p} could not load.`));
        };
        a.nonce = m.querySelector('script[nonce]')?.nonce || '';
        m.head.append(a);
      }));
    if (d[l]) {
      console.warn(`${p} only loads once. Ignoring:`, g);
    } else {
      d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
    }
  })({
    key: apiKey,
    v: 'weekly',
  });
}

function createInfoWindowContent(title, address, meta) {
  const card = document.createElement('div');
  card.className = 'gm-infowindow-card';

  const titleEl = document.createElement('p');
  titleEl.className = 'gm-infowindow-title';
  titleEl.textContent = title;
  card.appendChild(titleEl);

  if (address) {
    const addrEl = document.createElement('p');
    addrEl.className = 'gm-infowindow-sub';
    addrEl.textContent = address;
    card.appendChild(addrEl);
  }

  if (meta) {
    const metaEl = document.createElement('p');
    metaEl.className = 'gm-infowindow-meta';
    metaEl.textContent = meta;
    card.appendChild(metaEl);
  }

  return card;
}

function createWorkerMarkerElement(isInside) {
  const wrapper = document.createElement('div');
  wrapper.className = `worker-pin ${isInside ? 'inside' : 'outside'}`;
  wrapper.textContent = isInside ? 'Worker GPS · Verified' : 'Worker GPS · Outside';
  return wrapper;
}

function renderPreseededZones() {
  const { Polygon } = state.mapsLibraries.maps;
  state.preseededZones = PRESEEDED_ZONES.map((zone) => {
    const polygon = new Polygon({
      paths: zone.paths,
      strokeColor: zone.color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: zone.color,
      fillOpacity: 0.16,
      clickable: true,
      map: state.map,
    });

    polygon.addListener('click', (event) => {
      if (state.drawMode === 'static' && event?.latLng) {
        updateWorkerPosition({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      }
    });

    return {
      ...zone,
      source: 'Pre-seeded',
      polygon,
    };
  });
}

function syncTerraDrawPolygons() {
  if (!state.terraDraw) return;
  const { Polygon } = state.mapsLibraries.maps;
  const snapshot = state.terraDraw.getSnapshot();

  const completedPolygons = snapshot.filter((feature) => {
    if (feature.geometry?.type !== 'Polygon') return false;
    if (feature.properties?.currentlyDrawing) return false;
    const ring = feature.geometry.coordinates?.[0];
    return Array.isArray(ring) && ring.length >= 4;
  });

  state.drawnZones = completedPolygons.map((feature, idx) => {
    const ring = feature.geometry.coordinates[0];
    const paths = ring.map(([lng, lat]) => ({ lat, lng }));
    return {
      id: String(feature.id || `drawn-${idx + 1}`),
      name: `Supervisor Zone #${idx + 1}`,
      color: '#6d28d9',
      source: 'Drawn',
      paths,
      polygon: new Polygon({ paths }),
    };
  });

  evaluateWorkerGeofence();
}

async function initTerraDraw() {
  const setup = () => {
    if (state.terraDraw) return;
    import('terra-draw')
      .then(async (tdMod) => {
        const adapterMod = await import('terra-draw-google-maps-adapter');
        const { TerraDraw, TerraDrawSelectMode, TerraDrawPolygonMode } = tdMod;
        const { TerraDrawGoogleMapsAdapter } = adapterMod;

        const draw = new TerraDraw({
          adapter: new TerraDrawGoogleMapsAdapter({
            map: state.map,
            lib: google.maps,
            coordinatePrecision: 9,
          }),
          modes: [
            new TerraDrawPolygonMode({
              styles: {
                fillColor: '#7c3aed',
                fillOpacity: 0.22,
                outlineColor: '#6d28d9',
                outlineWidth: 2,
              },
            }),
            new TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    coordinates: {
                      midpoints: true,
                      draggable: true,
                      deletable: true,
                    },
                  },
                },
              },
            }),
          ],
        });

        draw.start();
        draw.setMode('static');
        draw.on('change', () => {
          syncTerraDrawPolygons();
        });
        draw.on('finish', () => {
          syncTerraDrawPolygons();
        });

        state.terraDraw = draw;
        setDrawMode('static');
      })
      .catch((err) => {
        console.warn('Terra Draw initialization warning:', err);
        showBanner('Drawing toolbar unavailable offline; pre-seeded geofence evaluation remains active.');
      });
  };

  if (state.map.getProjection()) {
    setup();
  } else {
    google.maps.event.addListenerOnce(state.map, 'projection_changed', setup);
  }
}

function setDrawMode(mode) {
  state.drawMode = mode;

  if (state.terraDraw) {
    if (mode === 'clear') {
      state.terraDraw.clear();
      state.terraDraw.setMode('static');
      state.drawMode = 'static';
      syncTerraDrawPolygons();
    } else {
      state.terraDraw.setMode(mode);
    }
  }

  const activeMode = state.drawMode;
  dom.drawPolygonBtn.classList.toggle('active', activeMode === 'polygon');
  dom.selectModeBtn.classList.toggle('active', activeMode === 'select');
  dom.panModeBtn.classList.toggle('active', activeMode === 'static');

  document.querySelectorAll('[data-draw-action]').forEach((btn) => {
    const action = btn.getAttribute('data-draw-action');
    btn.classList.toggle('active', action === activeMode);
  });
}

function computePolygonCentroid(paths) {
  if (!paths.length) return AUSTIN_CENTER;
  const sum = paths.reduce(
    (acc, pt) => ({ lat: acc.lat + pt.lat, lng: acc.lng + pt.lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: sum.lat / paths.length,
    lng: sum.lng / paths.length,
  };
}

function renderGeofenceList() {
  const allZones = [...state.preseededZones, ...state.drawnZones];
  const totalCount = allZones.length;

  dom.headerGeofenceCount.textContent = `${totalCount} Active Zone${totalCount === 1 ? '' : 's'}`;
  dom.drawnZoneCount.textContent = `${state.drawnZones.length} drawn`;

  const items = allZones.map((zone) => {
    const isMatched = state.activeZoneNames.includes(zone.name);
    const li = document.createElement('li');
    li.className = `zone-item${isMatched ? ' active-zone' : ''}`;

    const main = document.createElement('div');
    main.className = 'zone-main';

    const swatch = document.createElement('span');
    swatch.className = 'zone-swatch';
    swatch.style.backgroundColor = zone.color;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'zone-name';
    nameSpan.textContent = zone.name;

    main.appendChild(swatch);
    main.appendChild(nameSpan);

    const tag = document.createElement('span');
    tag.className = `zone-tag${isMatched ? ' tag-active' : ''}`;
    tag.textContent = isMatched ? 'Active GPS' : zone.source;

    li.appendChild(main);
    li.appendChild(tag);

    li.addEventListener('click', () => {
      const centroid = computePolygonCentroid(zone.paths);
      state.map.panTo(centroid);
      state.map.setZoom(14);
    });

    return li;
  });

  dom.geofenceList.replaceChildren(...items);
}

function evaluateWorkerGeofence() {
  const { poly } = state.mapsLibraries.geometry;
  const { LatLng } = state.mapsLibraries.core;
  const point = new LatLng(state.workerPosition.lat, state.workerPosition.lng);

  const allZones = [...state.preseededZones, ...state.drawnZones];
  const matched = allZones.filter((zone) => poly.containsLocation(point, zone.polygon));
  state.activeZoneNames = matched.map((z) => z.name);

  const isInside = matched.length > 0;

  if (isInside) {
    dom.geofenceStatusBadge.textContent = `Inside: ${matched[0].name}`;
    dom.geofenceStatusBadge.className = 'status-badge status-inside';

    dom.verifiedClockinBadge.className = 'clockin-badge unlocked';
    dom.verifiedClockinText.textContent = 'Verified Clock-In Unlocked';
    dom.clockinActionBtn.disabled = false;

    dom.headerClockinPill.textContent = 'Clock-In Eligible';
    dom.headerClockinPill.className = 'metric-pill status-inside';
  } else {
    dom.geofenceStatusBadge.textContent = 'Outside Geofences';
    dom.geofenceStatusBadge.className = 'status-badge status-outside';

    dom.verifiedClockinBadge.className = 'clockin-badge locked';
    dom.verifiedClockinText.textContent = 'Verified Clock-In Locked';
    dom.clockinActionBtn.disabled = true;

    dom.headerClockinPill.textContent = 'Outside Geofence';
    dom.headerClockinPill.className = 'metric-pill status-outside';
  }

  if (state.workerPinEl) {
    state.workerPinEl.className = `worker-pin ${isInside ? 'inside' : 'outside'}`;
    state.workerPinEl.textContent = isInside ? 'Worker GPS · Verified' : 'Worker GPS · Outside';
  }

  renderGeofenceList();
}

async function reverseGeocodeWorker(lat, lng) {
  dom.workerAddress.textContent = 'Resolving street address...';
  dom.workerCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  try {
    const resp = await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.formattedAddress) {
        dom.workerAddress.textContent = data.formattedAddress;
        return;
      }
    }
  } catch (err) {
    console.warn('Server reverse geocoding fallback triggered:', err);
  }

  try {
    const { Geocoder } = state.mapsLibraries.geocoding;
    const geocoder = new Geocoder();
    const result = await geocoder.geocode({ location: { lat, lng } });
    const first = result.results?.[0];
    dom.workerAddress.textContent = first?.formatted_address || 'Address unavailable for coordinates';
  } catch (err) {
    console.warn('Client geocoding error:', err);
    dom.workerAddress.textContent = `Austin Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

async function updateWorkerPosition(position, panMap = false) {
  state.workerPosition = { lat: position.lat, lng: position.lng };
  state.clockedInAt = null;
  dom.clockinFeedback.hidden = true;

  if (state.workerMarker) {
    state.workerMarker.position = state.workerPosition;
  }
  if (panMap && state.map) {
    state.map.panTo(state.workerPosition);
  }

  evaluateWorkerGeofence();
  await reverseGeocodeWorker(position.lat, position.lng);
}

function formatDurationSeconds(durationStr) {
  if (!durationStr) return '0 min';
  const seconds = parseInt(String(durationStr).replace('s', ''), 10);
  if (Number.isNaN(seconds)) return durationStr;
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }
  return `${mins} min`;
}

function formatDistanceMeters(meters) {
  if (typeof meters !== 'number' || Number.isNaN(meters)) return '0 mi';
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function clearStopMarkersAndRoute() {
  state.stopMarkers.forEach((marker) => {
    marker.map = null;
  });
  state.stopMarkers = [];

  if (state.routePolyline) {
    state.routePolyline.setMap(null);
    state.routePolyline = null;
  }
}

function renderAuditStopsAndPolyline(orderedStops, legs, encodedPolyline, totalDistanceMeters, totalDuration) {
  clearStopMarkersAndRoute();

  const { AdvancedMarkerElement, PinElement } = state.mapsLibraries.marker;
  const { Polyline } = state.mapsLibraries.maps;
  const { encoding } = state.mapsLibraries.geometry;
  const { LatLngBounds } = state.mapsLibraries.core;

  if (encodedPolyline) {
    const decodedPath = encoding.decodePath(encodedPolyline);
    state.routePolyline = new Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: '#1a73e8',
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map: state.map,
    });
  }

  const bounds = new LatLngBounds();
  bounds.extend(state.workerPosition);

  const listNodes = [];

  orderedStops.forEach((stop, index) => {
    const stopNum = index + 1;
    const position = { lat: stop.lat, lng: stop.lng };
    bounds.extend(position);

    const pin = new PinElement({
      glyphText: String(stopNum),
      background: '#1a73e8',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      scale: 1.05,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position,
      title: `${stopNum}. ${stop.name}`,
    });
    marker.append(pin);

    const leg = legs?.[index];
    const legMeta = leg
      ? `Leg ${stopNum}: ${formatDistanceMeters(leg.distanceMeters)} · ${formatDurationSeconds(leg.duration)}`
      : stop.category || 'Audit Site';

    marker.addListener('click', () => {
      state.infoWindow.setContent(createInfoWindowContent(`${stopNum}. ${stop.name}`, stop.address, legMeta));
      state.infoWindow.open({ anchor: marker, map: state.map });
    });

    state.stopMarkers.push(marker);

    const li = document.createElement('li');
    li.className = 'stop-item';

    const badge = document.createElement('span');
    badge.className = 'stop-index';
    badge.textContent = String(stopNum);

    const details = document.createElement('div');
    details.className = 'stop-details';

    const titleEl = document.createElement('span');
    titleEl.className = 'stop-title';
    titleEl.textContent = stop.name;

    const addrEl = document.createElement('span');
    addrEl.className = 'stop-address';
    addrEl.textContent = stop.address;

    const metaEl = document.createElement('span');
    metaEl.className = 'stop-meta';
    metaEl.textContent = legMeta;

    details.appendChild(titleEl);
    details.appendChild(addrEl);
    details.appendChild(metaEl);

    li.appendChild(badge);
    li.appendChild(details);

    li.addEventListener('click', () => {
      state.map.panTo(position);
      state.infoWindow.setContent(createInfoWindowContent(`${stopNum}. ${stop.name}`, stop.address, legMeta));
      state.infoWindow.open({ anchor: marker, map: state.map });
    });

    listNodes.push(li);
  });

  dom.auditStopsList.replaceChildren(...listNodes);

  const summaryText = `${orderedStops.length} Audit Stops · ${formatDistanceMeters(totalDistanceMeters)} · ${formatDurationSeconds(totalDuration)}`;
  const summaryMain = document.createElement('span');
  summaryMain.textContent = summaryText;
  const summarySub = document.createElement('span');
  summarySub.className = 'route-summary-sub';
  summarySub.textContent = 'Routes API v2 · Traffic-Aware · Waypoint Order Optimized';
  dom.routeSummary.replaceChildren(summaryMain, summarySub);

  dom.headerRoutePill.textContent = `${formatDistanceMeters(totalDistanceMeters)} · ${formatDurationSeconds(totalDuration)}`;
}

async function computeOptimizedAuditRoute() {
  if (!state.auditStops.length) {
    dom.routeSummary.textContent = 'No audit stops found for the current query.';
    dom.auditStopsList.replaceChildren();
    clearStopMarkersAndRoute();
    return;
  }

  dom.optimizeRouteBtn.disabled = true;
  dom.routeSummary.textContent = 'Optimizing multi-stop driving route...';

  const stops = state.auditStops;
  const origin = {
    id: 'worker-origin',
    name: 'Worker Current GPS',
    lat: state.workerPosition.lat,
    lng: state.workerPosition.lng,
  };

  let intermediates = [];
  let destination = stops[stops.length - 1];
  if (stops.length > 1) {
    intermediates = stops.slice(0, -1);
  }

  try {
    const resp = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        intermediates,
        optimizeWaypointOrder: intermediates.length > 0,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.detail || `Route request failed (${resp.status})`);
    }

    const data = await resp.json();
    const route = data.routes?.[0];
    if (!route) {
      throw new Error('No drivable route returned for the selected audit stops.');
    }

    const optimizedIndices = route.optimizedIntermediateWaypointIndex;
    let orderedStops;
    if (Array.isArray(optimizedIndices) && optimizedIndices.length === intermediates.length) {
      orderedStops = [...optimizedIndices.map((idx) => intermediates[idx]), destination];
    } else {
      orderedStops = [...stops];
    }

    state.orderedStops = orderedStops;
    renderAuditStopsAndPolyline(
      orderedStops,
      route.legs || [],
      route.polyline?.encodedPolyline || '',
      route.distanceMeters || 0,
      route.duration || '0s',
    );
  } catch (err) {
    console.warn('Route optimization failed:', err);
    dom.routeSummary.textContent = `Route unavailable: ${err.message}`;
    dom.headerRoutePill.textContent = 'Route unavailable';
  } finally {
    dom.optimizeRouteBtn.disabled = false;
  }
}

async function searchAuditSites(queryText) {
  const query = (queryText || '').trim();
  if (!query) return;

  dom.siteSearchBtn.disabled = true;
  dom.routeSummary.textContent = `Searching "${query}" in Austin...`;

  try {
    const resp = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: query,
        pageSize: 6,
        center: AUSTIN_CENTER,
        radiusMeters: 16000,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.detail || `Places search failed (${resp.status})`);
    }

    const data = await resp.json();
    const rawPlaces = (data.places || []).filter((p) => p.location?.latitude != null && p.location?.longitude != null);

    state.auditStops = rawPlaces.slice(0, 5).map((place) => ({
      id: place.id,
      name: place.displayName?.text || 'Austin Store Site',
      address: place.formattedAddress || 'Austin, TX',
      category: place.primaryTypeDisplayName?.text || 'Retail Store',
      lat: place.location.latitude,
      lng: place.location.longitude,
    }));

    await computeOptimizedAuditRoute();
  } catch (err) {
    console.warn('Audit site search failed:', err);
    dom.routeSummary.textContent = `Site search failed: ${err.message}`;
  } finally {
    dom.siteSearchBtn.disabled = false;
  }
}

function wireEventListeners() {
  dom.workerPresetSelect.addEventListener('change', (event) => {
    const key = event.target.value;
    const preset = WORKER_PRESETS[key];
    if (preset) {
      updateWorkerPosition({ lat: preset.lat, lng: preset.lng }, true);
    }
  });

  dom.clockinActionBtn.addEventListener('click', () => {
    if (!state.activeZoneNames.length) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.clockedInAt = now;
    dom.clockinFeedback.textContent = `Verified check-in recorded at ${now} inside ${state.activeZoneNames[0]}.`;
    dom.clockinFeedback.hidden = false;
  });

  dom.drawPolygonBtn.addEventListener('click', () => setDrawMode('polygon'));
  dom.selectModeBtn.addEventListener('click', () => setDrawMode('select'));
  dom.panModeBtn.addEventListener('click', () => setDrawMode('static'));
  dom.clearDrawnBtn.addEventListener('click', () => setDrawMode('clear'));

  document.querySelectorAll('[data-draw-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-draw-action');
      if (action) setDrawMode(action);
    });
  });

  dom.siteSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchAuditSites(dom.siteSearchInput.value);
  });

  dom.optimizeRouteBtn.addEventListener('click', () => {
    computeOptimizedAuditRoute();
  });
}

async function initApp() {
  wireEventListeners();

  let config;
  try {
    const resp = await fetch('/api/config');
    config = await resp.json();
  } catch (err) {
    showBanner('Unable to load server configuration from /api/config.');
    return;
  }

  if (!config.configured || !config.googleMapsApiKey) {
    showBanner(
      'GOOGLE_MAPS_API_KEY is not configured in .env. Copy .env.example to .env and add your Maps Demo Key.',
    );
    dom.workerAddress.textContent = 'API key required for live geocoding';
    dom.routeSummary.textContent = 'API key required for Places & Routes API';
    return;
  }

  hideBanner();
  loadMapsBootstrap(config.googleMapsApiKey);

  try {
    const [coreLib, mapsLib, markerLib, geometryLib, geocodingLib] = await Promise.all([
      google.maps.importLibrary('core'),
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('geometry'),
      google.maps.importLibrary('geocoding'),
    ]);

    state.mapsLibraries = {
      core: coreLib,
      maps: mapsLib,
      marker: markerLib,
      geometry: geometryLib,
      geocoding: geocodingLib,
    };

    const { Map, InfoWindow } = mapsLib;
    const { AdvancedMarkerElement } = markerLib;

    state.map = new Map(dom.mapContainer, {
      center: config.center || AUSTIN_CENTER,
      zoom: config.zoom || DEFAULT_ZOOM,
      mapId: config.mapId || 'DEMO_MAP_ID',
      internalUsageAttributionIds: [config.attributionId || 'gmp_git_agentsamples_v1.0.0'],
      clickableIcons: false,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.infoWindow = new InfoWindow();

    renderPreseededZones();

    state.workerPinEl = createWorkerMarkerElement(true);
    state.workerMarker = new AdvancedMarkerElement({
      map: state.map,
      position: state.workerPosition,
      title: 'Simulated Field Worker GPS',
    });
    state.workerMarker.append(state.workerPinEl);

    state.map.addListener('click', (event) => {
      if (state.drawMode === 'static' && event?.latLng) {
        updateWorkerPosition({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      }
    });

    initTerraDraw();

    await updateWorkerPosition(WORKER_PRESETS['inside-downtown'], false);
    await searchAuditSites(dom.siteSearchInput.value);
  } catch (err) {
    console.error('Google Maps initialization error:', err);
    showBanner(`Failed to initialize Google Maps Platform: ${err.message}`);
  }
}

initApp();
