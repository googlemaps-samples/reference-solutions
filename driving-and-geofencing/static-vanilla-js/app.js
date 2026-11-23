import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };
const USAGE_ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

const PRE_SEEDED_GEOFENCES = [
  {
    id: 'downtown-congress',
    name: 'Downtown Congress Hub',
    district: 'Central Austin Retail Zone',
    color: '#0d9488',
    paths: [
      { lat: 30.2712, lng: -97.7468 },
      { lat: 30.2712, lng: -97.7392 },
      { lat: 30.2640, lng: -97.7392 },
      { lat: 30.2640, lng: -97.7468 },
    ],
  },
  {
    id: 'south-congress',
    name: 'South Congress Corridor',
    district: 'SoCo Storefront District',
    color: '#2563eb',
    paths: [
      { lat: 30.2538, lng: -97.7534 },
      { lat: 30.2538, lng: -97.7458 },
      { lat: 30.2454, lng: -97.7458 },
      { lat: 30.2454, lng: -97.7534 },
    ],
  },
  {
    id: 'domain-northside',
    name: 'Domain Northside Flagship',
    district: 'North Austin Commercial Zone',
    color: '#d97706',
    paths: [
      { lat: 30.4058, lng: -97.7294 },
      { lat: 30.4058, lng: -97.7210 },
      { lat: 30.3982, lng: -97.7210 },
      { lat: 30.3982, lng: -97.7294 },
    ],
  },
];

const WORKER_PRESETS = {
  'congress-inside': {
    label: 'Inside — Downtown Congress Hub',
    lat: 30.2676,
    lng: -97.7430,
  },
  'soco-inside': {
    label: 'Inside — South Congress Corridor',
    lat: 30.2496,
    lng: -97.7495,
  },
  'domain-inside': {
    label: 'Inside — Domain Northside Flagship',
    lat: 30.4021,
    lng: -97.7253,
  },
  'zilker-outside': {
    label: 'Outside — Zilker Park Approach',
    lat: 30.2669,
    lng: -97.7729,
  },
  'mueller-outside': {
    label: 'Outside — Mueller Airport Corridor',
    lat: 30.2981,
    lng: -97.7052,
  },
};

const state = {
  map: null,
  mapsLib: null,
  coreLib: null,
  markerLib: null,
  placesLib: null,
  routesLib: null,
  geocodingLib: null,
  geometryLib: null,
  geocoder: null,
  infoWindow: null,
  terraDraw: null,
  drawMode: 'static',
  seededPolygons: [],
  drawnGeofences: [],
  workerMarker: null,
  workerPosition: { ...WORKER_PRESETS['congress-inside'] },
  activeZoneName: null,
  clockedInAt: null,
  discoveredSites: [],
  orderedStops: [],
  stopMarkers: [],
  routePolylines: [],
  routeSummaryData: null,
};

const els = {
  activeGeofenceCount: document.getElementById('active-geofence-count'),
  headerClockinPill: document.getElementById('header-clockin-pill'),
  headerClockinText: document.getElementById('header-clockin-text'),
  headerRouteText: document.getElementById('header-route-text'),
  workerPresetSelect: document.getElementById('worker-preset-select'),
  geofenceStatusBadge: document.getElementById('geofence-status-badge'),
  workerAddress: document.getElementById('worker-address'),
  workerCoords: document.getElementById('worker-coords'),
  verifiedClockinBadge: document.getElementById('verified-clockin-badge'),
  verifiedClockinText: document.getElementById('verified-clockin-text'),
  clockinActionBtn: document.getElementById('clockin-action-btn'),
  geofenceList: document.getElementById('geofence-list'),
  siteSearchInput: document.getElementById('site-search-input'),
  siteSearchBtn: document.getElementById('site-search-btn'),
  optimizeRouteBtn: document.getElementById('optimize-route-btn'),
  routeSummary: document.getElementById('route-summary'),
  auditStopsList: document.getElementById('audit-stops-list'),
  mapContainer: document.getElementById('map-container'),
  mapStatusBanner: document.getElementById('map-status-banner'),
  drawModeHint: document.getElementById('draw-mode-hint'),
};

function showStatusBanner(message) {
  if (!els.mapStatusBanner) return;
  els.mapStatusBanner.textContent = message;
  els.mapStatusBanner.classList.remove('hidden');
}

function hideStatusBanner() {
  if (!els.mapStatusBanner) return;
  els.mapStatusBanner.classList.add('hidden');
}

function formatDurationMs(durationMillis) {
  if (!Number.isFinite(durationMillis) || durationMillis <= 0) {
    return '0 min';
  }
  const totalMinutes = Math.round(durationMillis / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function formatDistanceMeters(meters) {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0.0 mi';
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi (${(meters / 1000).toFixed(1)} km)`;
}

function buildInfoWindowNode(title, lines, meta) {
  const wrapper = document.createElement('div');
  wrapper.className = 'gm-info-card';

  const titleEl = document.createElement('div');
  titleEl.className = 'gm-info-title';
  titleEl.textContent = title;
  wrapper.appendChild(titleEl);

  for (const line of lines) {
    if (!line) continue;
    const lineEl = document.createElement('div');
    lineEl.className = 'gm-info-line';
    lineEl.textContent = line;
    wrapper.appendChild(lineEl);
  }

  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'gm-info-meta';
    metaEl.textContent = meta;
    wrapper.appendChild(metaEl);
  }

  return wrapper;
}

function createWorkerMarkerContent(inside, zoneName) {
  const badge = document.createElement('div');
  badge.className = `worker-pin ${inside ? 'inside' : 'outside'}`;
  badge.textContent = inside ? `Worker · In Zone (${zoneName})` : 'Worker · Outside Zone';
  return badge;
}

function updateDrawToolbarUI(mode) {
  state.drawMode = mode;
  const actionButtons = document.querySelectorAll('[data-draw-action]');
  actionButtons.forEach((btn) => {
    const action = btn.getAttribute('data-draw-action');
    if (action === 'polygon' || action === 'select') {
      btn.classList.toggle('active', action === mode);
    }
  });

  if (els.drawModeHint) {
    if (mode === 'polygon') {
      els.drawModeHint.textContent = 'Click vertices · Double-click to finish';
    } else if (mode === 'select') {
      els.drawModeHint.textContent = 'Click drawn zone to move/edit';
    } else {
      els.drawModeHint.textContent = 'Ready';
    }
  }
}

function syncDrawnGeofencesFromTerraDraw() {
  if (!state.terraDraw || !state.mapsLib) return;
  const snapshot = state.terraDraw.getSnapshot();
  const polygonFeatures = snapshot.filter(
    (feature) =>
      feature?.geometry?.type === 'Polygon' &&
      Array.isArray(feature.geometry.coordinates?.[0]) &&
      feature.geometry.coordinates[0].length >= 4 &&
      !feature.properties?.currentlyDrawing
  );

  const { Polygon } = state.mapsLib;
  state.drawnGeofences = polygonFeatures.map((feature, index) => {
    const ring = feature.geometry.coordinates[0];
    const paths = ring.map(([lng, lat]) => ({ lat, lng }));
    const polygon = new Polygon({ paths });
    return {
      id: String(feature.id ?? `drawn-${index + 1}`),
      name: `Supervisor Zone #${index + 1}`,
      district: 'Custom Terra Draw Polygon',
      color: '#7c3aed',
      source: 'Drawn',
      vertexCount: Math.max(0, ring.length - 1),
      paths,
      polygon,
    };
  });
}

function getAllGeofences() {
  return [...state.seededPolygons, ...state.drawnGeofences];
}

function evaluateWorkerGeofence() {
  const allZones = getAllGeofences();
  const { lat, lng } = state.workerPosition;
  let matchedZone = null;

  if (state.coreLib && state.geometryLib) {
    const { LatLng } = state.coreLib;
    const { poly } = state.geometryLib;
    const workerLatLng = new LatLng(lat, lng);

    for (const zone of allZones) {
      if (poly.containsLocation(workerLatLng, zone.polygon)) {
        matchedZone = zone;
        break;
      }
    }
  }

  state.activeZoneName = matchedZone ? matchedZone.name : null;
  if (!matchedZone) {
    state.clockedInAt = null;
  }

  if (state.workerMarker) {
    state.workerMarker.position = { lat, lng };
    state.workerMarker.replaceChildren(
      createWorkerMarkerContent(Boolean(matchedZone), matchedZone?.name ?? '')
    );
  }

  if (els.workerCoords) {
    els.workerCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  if (els.activeGeofenceCount) {
    els.activeGeofenceCount.textContent = `${allZones.length} Active Zone${allZones.length === 1 ? '' : 's'}`;
  }

  if (matchedZone) {
    els.geofenceStatusBadge.textContent = `INSIDE: ${matchedZone.name}`;
    els.geofenceStatusBadge.className = 'status-badge badge-inside';
    els.clockinActionBtn.disabled = false;

    if (state.clockedInAt) {
      els.verifiedClockinBadge.className = 'verified-badge checked-in';
      els.verifiedClockinText.textContent = `Clocked In · ${state.clockedInAt}`;
      els.headerClockinPill.className = 'metric-pill status-eligible';
      els.headerClockinText.textContent = `Clocked In (${matchedZone.name})`;
    } else {
      els.verifiedClockinBadge.className = 'verified-badge unlocked';
      els.verifiedClockinText.textContent = 'Verified · Clock-In Unlocked';
      els.headerClockinPill.className = 'metric-pill status-eligible';
      els.headerClockinText.textContent = 'Clock-In Eligible';
    }
  } else {
    els.geofenceStatusBadge.textContent = 'OUTSIDE GEOFENCE';
    els.geofenceStatusBadge.className = 'status-badge badge-outside';
    els.clockinActionBtn.disabled = true;
    els.verifiedClockinBadge.className = 'verified-badge locked';
    els.verifiedClockinText.textContent = 'Locked · Outside Active Zone';
    els.headerClockinPill.className = 'metric-pill status-locked';
    els.headerClockinText.textContent = 'Clock-In Locked';
  }

  renderGeofenceList(allZones, matchedZone?.id ?? null);
}

function renderGeofenceList(allZones, matchedZoneId) {
  if (!els.geofenceList) return;
  const items = allZones.map((zone) => {
    const li = document.createElement('li');
    li.className = `zone-item${zone.id === matchedZoneId ? ' is-active-zone' : ''}`;
    li.tabIndex = 0;

    const header = document.createElement('div');
    header.className = 'zone-item-header';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'zone-name-wrap';

    const swatch = document.createElement('span');
    swatch.className = 'zone-swatch';
    swatch.style.backgroundColor = zone.color;

    const nameEl = document.createElement('span');
    nameEl.className = 'zone-name';
    nameEl.textContent = zone.name;

    nameWrap.append(swatch, nameEl);

    const tag = document.createElement('span');
    tag.className = `zone-tag${zone.source === 'Drawn' ? ' tag-drawn' : ''}`;
    tag.textContent = zone.source;

    header.append(nameWrap, tag);

    const meta = document.createElement('div');
    meta.className = 'zone-meta';
    meta.textContent =
      zone.id === matchedZoneId
        ? `${zone.district} · Worker Inside`
        : `${zone.district} · ${zone.vertexCount} vertices`;

    li.append(header, meta);

    const focusZone = () => {
      if (!state.map || !state.coreLib) return;
      const { LatLngBounds } = state.coreLib;
      const bounds = new LatLngBounds();
      for (const pt of zone.paths) {
        bounds.extend(pt);
      }
      state.map.fitBounds(bounds, 60);
    };

    li.addEventListener('click', focusZone);
    li.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focusZone();
      }
    });

    return li;
  });

  els.geofenceList.replaceChildren(...items);
}

async function reverseGeocodeWorker() {
  if (!state.geocoder || !els.workerAddress) return;
  const { lat, lng } = state.workerPosition;
  els.workerAddress.textContent = 'Reverse-geocoding street address…';

  try {
    const response = await state.geocoder.geocode({
      location: { lat, lng },
    });
    const best = response.results?.[0];
    els.workerAddress.textContent =
      best?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
    els.workerAddress.textContent = `Austin, TX (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
  }
}

function clearRouteOverlays() {
  for (const marker of state.stopMarkers) {
    marker.map = null;
  }
  state.stopMarkers = [];

  for (const polyline of state.routePolylines) {
    polyline.setMap(null);
  }
  state.routePolylines = [];
}

function renderAuditStopsList(orderedStops, legs) {
  if (!els.auditStopsList) return;

  if (!orderedStops.length) {
    const empty = document.createElement('li');
    empty.className = 'stop-item';
    empty.textContent = 'No audit sites found for this query.';
    els.auditStopsList.replaceChildren(empty);
    return;
  }

  const items = orderedStops.map((stop, idx) => {
    const li = document.createElement('li');
    li.className = 'stop-item';
    li.tabIndex = 0;

    const num = document.createElement('span');
    num.className = 'stop-number';
    num.textContent = String(idx + 1);

    const details = document.createElement('div');
    details.className = 'stop-details';

    const title = document.createElement('div');
    title.className = 'stop-title';
    title.textContent = stop.displayName || `Audit Site #${idx + 1}`;

    const addr = document.createElement('div');
    addr.className = 'stop-address';
    addr.textContent = stop.formattedAddress || 'Austin, TX';

    details.append(title, addr);

    if (idx > 0 && legs[idx - 1]) {
      const leg = legs[idx - 1];
      const legEl = document.createElement('div');
      legEl.className = 'stop-leg';
      const distText =
        leg.localizedValues?.distance ?? formatDistanceMeters(leg.distanceMeters);
      const durText =
        leg.localizedValues?.duration ?? formatDurationMs(leg.durationMillis);
      legEl.textContent = `Leg ${idx}: ${distText} · ${durText}`;
      details.appendChild(legEl);
    } else if (idx === 0) {
      const startEl = document.createElement('div');
      startEl.className = 'stop-leg';
      startEl.textContent = 'Route Origin (First Audit Stop)';
      details.appendChild(startEl);
    }

    li.append(num, details);

    const focusStop = () => {
      const marker = state.stopMarkers[idx];
      if (state.map && stop.location) {
        state.map.panTo(stop.location);
      }
      if (marker && state.infoWindow) {
        openStopInfoWindow(stop, idx, legs[idx - 1], marker);
      }
    };

    li.addEventListener('click', focusStop);
    li.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focusStop();
      }
    });

    return li;
  });

  els.auditStopsList.replaceChildren(...items);
}

function openStopInfoWindow(stop, idx, incomingLeg, marker) {
  if (!state.infoWindow || !state.map) return;
  const meta =
    idx === 0
      ? 'Stop #1 · Route Origin'
      : incomingLeg
        ? `Stop #${idx + 1} · ${incomingLeg.localizedValues?.distance ?? formatDistanceMeters(incomingLeg.distanceMeters)} (${incomingLeg.localizedValues?.duration ?? formatDurationMs(incomingLeg.durationMillis)})`
        : `Stop #${idx + 1}`;

  const content = buildInfoWindowNode(
    stop.displayName || `Audit Site #${idx + 1}`,
    [stop.primaryTypeDisplayName || 'Retail Audit Site', stop.formattedAddress || ''],
    meta
  );

  state.infoWindow.setContent(content);
  state.infoWindow.open({
    map: state.map,
    anchor: marker,
    shouldFocus: false,
  });
}

async function computeAndRenderOptimizedRoute() {
  const sites = state.discoveredSites;
  if (!sites.length) {
    clearRouteOverlays();
    els.routeSummary.textContent = 'No audit sites available. Run a Places search first.';
    els.headerRouteText.textContent = 'Route: 0 stops';
    renderAuditStopsList([], []);
    return;
  }

  clearRouteOverlays();

  const { AdvancedMarkerElement, PinElement } = state.markerLib;
  const { Route } = state.routesLib;

  if (sites.length === 1) {
    state.orderedStops = sites;
    const pin = new PinElement({
      glyphText: '1',
      background: '#1d4ed8',
      borderColor: '#1e3a8a',
      glyphColor: '#ffffff',
    });
    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: sites[0].location,
      content: pin,
      title: sites[0].displayName,
    });
    marker.addListener('click', () => openStopInfoWindow(sites[0], 0, null, marker));
    state.stopMarkers.push(marker);
    els.routeSummary.textContent = '1 audit stop found. Add more stops to optimize a multi-stop route.';
    els.headerRouteText.textContent = 'Route: 1 stop';
    renderAuditStopsList(sites, []);
    return;
  }

  els.routeSummary.textContent = 'Computing traffic-aware optimized route…';

  const originPlace = sites[0];
  const destinationPlace = sites[sites.length - 1];
  const intermediatePlaces = sites.slice(1, -1);
  const canOptimize = intermediatePlaces.length >= 2;

  const request = {
    origin: originPlace.location,
    destination: destinationPlace.location,
    intermediates: intermediatePlaces.map((place) => ({
      location: place.location,
    })),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: canOptimize,
    fields: [
      'path',
      'distanceMeters',
      'durationMillis',
      'localizedValues',
      'legs',
      'optimizedIntermediateWaypointIndices',
      'viewport',
    ],
    internalUsageAttributionIds: USAGE_ATTRIBUTION_IDS,
  };

  try {
    const { routes } = await Route.computeRoutes(request);
    const route = routes?.[0];
    if (!route) {
      els.routeSummary.textContent = 'Routes API returned no drivable route for these sites.';
      return;
    }

    let orderedIntermediates = intermediatePlaces;
    if (
      canOptimize &&
      Array.isArray(route.optimizedIntermediateWaypointIndices) &&
      route.optimizedIntermediateWaypointIndices.length === intermediatePlaces.length
    ) {
      orderedIntermediates = route.optimizedIntermediateWaypointIndices.map(
        (idx) => intermediatePlaces[idx]
      );
    }

    const orderedStops = [originPlace, ...orderedIntermediates, destinationPlace];
    state.orderedStops = orderedStops;

    const polylines = route.createPolylines({
      polylineOptions: {
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    });
    for (const polyline of polylines) {
      polyline.setMap(state.map);
      state.routePolylines.push(polyline);
    }

    const legs = route.legs ?? [];
    orderedStops.forEach((stop, idx) => {
      const isTerminal = idx === 0 || idx === orderedStops.length - 1;
      const pin = new PinElement({
        glyphText: String(idx + 1),
        background: isTerminal ? '#0f172a' : '#2563eb',
        borderColor: isTerminal ? '#020617' : '#1e40af',
        glyphColor: '#ffffff',
        scale: 1.05,
      });

      const marker = new AdvancedMarkerElement({
        map: state.map,
        position: stop.location,
        content: pin,
        title: `${idx + 1}. ${stop.displayName}`,
      });

      marker.addListener('click', () => {
        openStopInfoWindow(stop, idx, legs[idx - 1], marker);
      });

      state.stopMarkers.push(marker);
    });

    const totalDistanceText =
      route.localizedValues?.distance ?? formatDistanceMeters(route.distanceMeters);
    const totalDurationText =
      route.localizedValues?.duration ?? formatDurationMs(route.durationMillis);

    els.routeSummary.textContent = `${orderedStops.length} Stops · ${totalDistanceText} · ${totalDurationText}${canOptimize ? ' (Waypoint Order Optimized)' : ''}`;
    els.headerRouteText.textContent = `${orderedStops.length} Stops · ${totalDurationText} · ${totalDistanceText}`;
    renderAuditStopsList(orderedStops, legs);
  } catch (err) {
    console.error('Route.computeRoutes failed:', err);
    els.routeSummary.textContent = `Route optimization unavailable: ${err?.message ?? 'API error'}`;
  }
}

async function searchAuditSites(queryText) {
  const query = (queryText || '').trim() || 'retail stores in Austin, TX';
  els.routeSummary.textContent = `Searching "${query}"…`;

  try {
    const { Place } = state.placesLib;
    const { places } = await Place.searchByText({
      textQuery: query,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'primaryTypeDisplayName',
      ],
      locationBias: {
        center: AUSTIN_CENTER,
        radius: 16000,
      },
      maxResultCount: 6,
      language: 'en-US',
      region: 'us',
      internalUsageAttributionIds: USAGE_ATTRIBUTION_IDS,
    });

    state.discoveredSites = (places ?? []).filter((place) => place.location != null);
    await computeAndRenderOptimizedRoute();
  } catch (err) {
    console.error('Place.searchByText failed:', err);
    els.routeSummary.textContent = `Site search failed: ${err?.message ?? 'Check Places API (New)'}`;
  }
}

function initSeededGeofences() {
  const { Polygon } = state.mapsLib;
  state.seededPolygons = PRE_SEEDED_GEOFENCES.map((zone) => {
    const polygon = new Polygon({
      paths: zone.paths,
      strokeColor: zone.color,
      strokeOpacity: 0.92,
      strokeWeight: 2,
      fillColor: zone.color,
      fillOpacity: 0.16,
      clickable: true,
      map: state.map,
    });

    polygon.addListener('click', (event) => {
      if (!state.infoWindow || !state.map) return;
      const content = buildInfoWindowNode(
        zone.name,
        [zone.district, 'Pre-seeded client site geofence'],
        'Status: Active Attendance Perimeter'
      );
      state.infoWindow.setContent(content);
      state.infoWindow.setPosition(event.latLng);
      state.infoWindow.open({ map: state.map });
    });

    return {
      ...zone,
      source: 'Pre-seeded',
      vertexCount: zone.paths.length,
      polygon,
    };
  });
}

function initTerraDraw() {
  const adapter = new TerraDrawGoogleMapsAdapter({
    map: state.map,
    lib: google.maps,
    coordinatePrecision: 9,
    isolatedData: true,
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
          fillColor: '#7c3aed',
          fillOpacity: 0.22,
          outlineColor: '#6d28d9',
          outlineWidth: 2.5,
          outlineOpacity: 0.95,
        },
      }),
    ],
  });

  draw.start();
  draw.setMode('static');
  state.terraDraw = draw;
  updateDrawToolbarUI('static');

  draw.on('finish', () => {
    syncDrawnGeofencesFromTerraDraw();
    evaluateWorkerGeofence();
    draw.setMode('select');
    updateDrawToolbarUI('select');
  });

  draw.on('change', () => {
    syncDrawnGeofencesFromTerraDraw();
    evaluateWorkerGeofence();
  });
}

function wireUIEvents() {
  if (els.workerPresetSelect) {
    els.workerPresetSelect.addEventListener('change', async () => {
      const preset = WORKER_PRESETS[els.workerPresetSelect.value];
      if (!preset) return;
      state.workerPosition = { ...preset };
      state.clockedInAt = null;
      evaluateWorkerGeofence();
      if (state.map) {
        state.map.panTo({ lat: preset.lat, lng: preset.lng });
      }
      await reverseGeocodeWorker();
    });
  }

  if (els.clockinActionBtn) {
    els.clockinActionBtn.addEventListener('click', () => {
      if (!state.activeZoneName) return;
      const now = new Date();
      state.clockedInAt = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      evaluateWorkerGeofence();
    });
  }

  const drawButtons = document.querySelectorAll('[data-draw-action]');
  drawButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.terraDraw) return;
      const action = btn.getAttribute('data-draw-action');
      if (action === 'clear') {
        state.terraDraw.clear();
        state.terraDraw.setMode('static');
        state.drawnGeofences = [];
        updateDrawToolbarUI('static');
        evaluateWorkerGeofence();
        return;
      }

      if (action === 'polygon' || action === 'select') {
        const nextMode = state.drawMode === action ? 'static' : action;
        state.terraDraw.setMode(nextMode);
        updateDrawToolbarUI(nextMode);
      }
    });
  });

  if (els.siteSearchBtn) {
    els.siteSearchBtn.addEventListener('click', () => {
      void searchAuditSites(els.siteSearchInput?.value);
    });
  }

  if (els.siteSearchInput) {
    els.siteSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void searchAuditSites(els.siteSearchInput.value);
      }
    });
  }

  if (els.optimizeRouteBtn) {
    els.optimizeRouteBtn.addEventListener('click', () => {
      void computeAndRenderOptimizedRoute();
    });
  }
}

async function initApp() {
  wireUIEvents();

  const apiKey = window.__GMP_CONFIG__?.apiKey?.trim() || '';
  if (!apiKey) {
    showStatusBanner(
      'Missing GOOGLE_MAPS_API_KEY in .env. Copy .env.example to .env and add a Maps Demo Key to load the live map.'
    );
    els.workerAddress.textContent = 'API key required for reverse geocoding.';
    els.routeSummary.textContent = 'API key required for Places & Routes optimization.';
    return;
  }

  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
  });

  try {
    const [
      mapsLib,
      coreLib,
      markerLib,
      placesLib,
      routesLib,
      geocodingLib,
      geometryLib,
    ] = await Promise.all([
      importLibrary('maps'),
      importLibrary('core'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('geocoding'),
      importLibrary('geometry'),
    ]);

    state.mapsLib = mapsLib;
    state.coreLib = coreLib;
    state.markerLib = markerLib;
    state.placesLib = placesLib;
    state.routesLib = routesLib;
    state.geocodingLib = geocodingLib;
    state.geometryLib = geometryLib;

    const { Map, InfoWindow } = mapsLib;
    const { AdvancedMarkerElement } = markerLib;
    const { Geocoder } = geocodingLib;

    state.map = new Map(els.mapContainer, {
      center: AUSTIN_CENTER,
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: USAGE_ATTRIBUTION_IDS,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.infoWindow = new InfoWindow();
    state.geocoder = new Geocoder();

    initSeededGeofences();

    state.workerMarker = new AdvancedMarkerElement({
      map: state.map,
      position: {
        lat: state.workerPosition.lat,
        lng: state.workerPosition.lng,
      },
      content: createWorkerMarkerContent(true, 'Downtown Congress Hub'),
      title: 'Simulated Field Worker GPS Position',
      zIndex: 100,
    });

    state.workerMarker.addListener('click', () => {
      const content = buildInfoWindowNode(
        'Field Worker GPS Telemetry',
        [
          els.workerAddress?.textContent || 'Austin, TX',
          `${state.workerPosition.lat.toFixed(5)}, ${state.workerPosition.lng.toFixed(5)}`,
        ],
        state.activeZoneName
          ? `Inside Geofence: ${state.activeZoneName}`
          : 'Outside Active Geofences'
      );
      state.infoWindow.setContent(content);
      state.infoWindow.open({
        map: state.map,
        anchor: state.workerMarker,
        shouldFocus: false,
      });
    });

    google.maps.event.addListenerOnce(state.map, 'projection_changed', () => {
      initTerraDraw();
    });

    hideStatusBanner();
    evaluateWorkerGeofence();

    await Promise.all([
      reverseGeocodeWorker(),
      searchAuditSites(els.siteSearchInput?.value),
    ]);
  } catch (err) {
    console.error('Failed to initialize Google Maps Platform app:', err);
    showStatusBanner(`Map initialization error: ${err?.message ?? 'Unknown error'}`);
  }
}

void initApp();
