import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

const WORKER_PRESETS = {
  'downtown-inside': {
    id: 'downtown-inside',
    label: 'Inside Zone A — Downtown Congress',
    lat: 30.2666,
    lng: -97.7435,
  },
  'outside-zilker': {
    id: 'outside-zilker',
    label: 'Outside Geofences — Zilker Park West',
    lat: 30.2669,
    lng: -97.7729,
  },
  'soco-inside': {
    id: 'soco-inside',
    label: 'Inside Zone B — South Congress SoCo',
    lat: 30.2494,
    lng: -97.7495,
  },
  'mueller-inside': {
    id: 'mueller-inside',
    label: 'Inside Zone C — Mueller Market',
    lat: 30.2981,
    lng: -97.7054,
  },
  'outside-east-cesar': {
    id: 'outside-east-cesar',
    label: 'Outside Geofences — East Cesar Chavez',
    lat: 30.2554,
    lng: -97.7215,
  },
};

const SEEDED_GEOFENCES = [
  {
    id: 'zone-downtown',
    name: 'Zone A — Downtown Congress Hub',
    source: 'seeded',
    color: '#0f766e',
    paths: [
      { lat: 30.2688, lng: -97.7462 },
      { lat: 30.2688, lng: -97.7408 },
      { lat: 30.2644, lng: -97.7408 },
      { lat: 30.2644, lng: -97.7462 },
    ],
  },
  {
    id: 'zone-soco',
    name: 'Zone B — South Congress Retail Strip',
    source: 'seeded',
    color: '#0284c7',
    paths: [
      { lat: 30.2522, lng: -97.7525 },
      { lat: 30.2522, lng: -97.7465 },
      { lat: 30.2468, lng: -97.7465 },
      { lat: 30.2468, lng: -97.7525 },
    ],
  },
  {
    id: 'zone-mueller',
    name: 'Zone C — Mueller Market District',
    source: 'seeded',
    color: '#7c3aed',
    paths: [
      { lat: 30.301, lng: -97.709 },
      { lat: 30.301, lng: -97.7018 },
      { lat: 30.295, lng: -97.7018 },
      { lat: 30.295, lng: -97.709 },
    ],
  },
];

// DOM references
const headerGeofenceCountEl = document.getElementById('header-geofence-count');
const headerClockinPillEl = document.getElementById('header-clockin-pill');
const headerRouteSummaryEl = document.getElementById('header-route-summary');
const configBannerEl = document.getElementById('config-banner');
const configBannerTextEl = document.getElementById('config-banner-text');

const workerPresetSelectEl = document.getElementById('worker-preset-select');
const geofenceStatusBadgeEl = document.getElementById('geofence-status-badge');
const verifiedClockinBadgeEl = document.getElementById('verified-clockin-badge');
const workerAddressEl = document.getElementById('worker-address');
const workerCoordsEl = document.getElementById('worker-coords');
const clockinActionBtnEl = document.getElementById('clockin-action-btn');
const clockinFeedbackEl = document.getElementById('clockin-feedback');
const clockinLogEl = document.getElementById('clockin-log');

const zoneCountLabelEl = document.getElementById('zone-count-label');
const geofenceListEl = document.getElementById('geofence-list');
const drawPolygonBtnEl = document.getElementById('draw-polygon-btn');
const selectModeBtnEl = document.getElementById('select-mode-btn');
const clearDrawnBtnEl = document.getElementById('clear-drawn-btn');
const sidebarDrawBtnEl = document.getElementById('sidebar-draw-btn');
const sidebarSelectBtnEl = document.getElementById('sidebar-select-btn');
const sidebarClearBtnEl = document.getElementById('sidebar-clear-btn');
const drawModeHintEl = document.getElementById('draw-mode-hint');

const siteSearchInputEl = document.getElementById('site-search-input');
const siteSearchBtnEl = document.getElementById('site-search-btn');
const placeAutocompleteContainerEl = document.getElementById('place-autocomplete-container');
const optimizeRouteBtnEl = document.getElementById('optimize-route-btn');
const stopsCountLabelEl = document.getElementById('stops-count-label');
const routeSummaryEl = document.getElementById('route-summary');
const auditStopsListEl = document.getElementById('audit-stops-list');
const mapContainerEl = document.getElementById('map-container');

// Application state
let map = null;
let draw = null;
let currentDrawMode = 'static';
let infoWindow = null;
let workerMarker = null;
let routePolyline = null;
let stopMarkers = [];

let CoreLib = null;
let MapsLib = null;
let MarkerLib = null;
let PlacesLib = null;
let GeocodingLib = null;
let GeometryLib = null;

let seededZones = [];
let drawnZones = [];
let activeMatchedZone = null;
let workerPosition = {
  lat: WORKER_PRESETS['downtown-inside'].lat,
  lng: WORKER_PRESETS['downtown-inside'].lng,
};
let workerFormattedAddress = '';
let auditStops = [];
let currentLegs = [];
let reverseGeocodeRequestId = 0;

function showBanner(message) {
  configBannerTextEl.textContent = message;
  configBannerEl.classList.remove('hidden');
}

function hideBanner() {
  configBannerEl.classList.add('hidden');
}

function formatDistanceMeters(meters) {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) {
    return '—';
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function formatDurationString(durationStr) {
  if (typeof durationStr !== 'string') {
    return '—';
  }
  const seconds = Number(durationStr.replace('s', ''));
  if (!Number.isFinite(seconds)) {
    return '—';
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function buildInfoWindowContent(title, subtitle, detailLine) {
  const wrapper = document.createElement('div');
  wrapper.style.padding = '4px 2px';
  wrapper.style.maxWidth = '240px';
  wrapper.style.fontFamily = 'inherit';

  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.fontWeight = '700';
  heading.style.fontSize = '13px';
  heading.style.color = '#0f172a';
  heading.style.marginBottom = '3px';
  wrapper.appendChild(heading);

  if (subtitle) {
    const sub = document.createElement('div');
    sub.textContent = subtitle;
    sub.style.fontSize = '12px';
    sub.style.color = '#475569';
    sub.style.marginBottom = '4px';
    wrapper.appendChild(sub);
  }

  if (detailLine) {
    const detail = document.createElement('div');
    detail.textContent = detailLine;
    detail.style.fontSize = '11px';
    detail.style.fontWeight = '600';
    detail.style.color = '#0f766e';
    wrapper.appendChild(detail);
  }

  return wrapper;
}

function updateDrawModeUI(mode) {
  currentDrawMode = mode;
  const isPolygon = mode === 'polygon';
  const isSelect = mode === 'select';

  drawPolygonBtnEl.classList.toggle('active', isPolygon);
  sidebarDrawBtnEl.classList.toggle('active', isPolygon);
  drawPolygonBtnEl.setAttribute('aria-pressed', String(isPolygon));

  selectModeBtnEl.classList.toggle('active', isSelect);
  sidebarSelectBtnEl.classList.toggle('active', isSelect);
  selectModeBtnEl.setAttribute('aria-pressed', String(isSelect));

  if (isPolygon) {
    drawModeHintEl.textContent =
      'Click map vertices to draw geofence; click first vertex or double-click to finish.';
  } else if (isSelect) {
    drawModeHintEl.textContent =
      'Select/Edit Mode: click a drawn polygon to drag or reshape vertices.';
  } else {
    drawModeHintEl.textContent = 'View Mode (click map to relocate worker)';
  }
}

function setTerraDrawMode(mode) {
  if (!draw) {
    return;
  }
  if (mode === 'clear') {
    draw.clear();
    draw.setMode('static');
    drawnZones = [];
    updateDrawModeUI('static');
    renderGeofenceList();
    evaluateWorkerGeofence();
    return;
  }

  const nextMode = currentDrawMode === mode ? 'static' : mode;
  draw.setMode(nextMode);
  updateDrawModeUI(nextMode);
}

function syncDrawnGeofencesFromTerraDraw() {
  if (!draw || !MapsLib) {
    return;
  }
  const snapshot = draw.getSnapshot();
  const completedPolygons = snapshot.filter((feature) => {
    const props = feature.properties ?? {};
    if (feature.geometry?.type !== 'Polygon') {
      return false;
    }
    if (props.currentlyDrawing === true) {
      return false;
    }
    const ring = feature.geometry.coordinates?.[0];
    return Array.isArray(ring) && ring.length >= 4;
  });

  drawnZones = completedPolygons.map((feature, index) => {
    const ring = feature.geometry.coordinates[0];
    const paths = ring.map(([lng, lat]) => ({ lat, lng }));
    return {
      id: String(feature.id),
      name: `Supervisor Zone ${index + 1}`,
      source: 'drawn',
      paths,
      polygon: new MapsLib.Polygon({ paths }),
    };
  });

  renderGeofenceList();
  evaluateWorkerGeofence();
}

function renderGeofenceList() {
  const allZones = [...seededZones, ...drawnZones];
  const count = allZones.length;

  headerGeofenceCountEl.textContent = `${count} Active Geofence${count === 1 ? '' : 's'}`;
  zoneCountLabelEl.textContent = `${count} zone${count === 1 ? '' : 's'}`;

  const items = allZones.map((zone) => {
    const li = document.createElement('li');
    const isMatched = activeMatchedZone?.id === zone.id;
    li.className = `zone-item${isMatched ? ' active-zone' : ''}`;

    const main = document.createElement('div');
    main.className = 'zone-item-main';

    const title = document.createElement('div');
    title.className = 'zone-name';
    title.textContent = zone.name;
    main.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'zone-meta';
    const vertexCount = zone.paths.length;
    meta.textContent = isMatched
      ? `${vertexCount} vertices • Worker Inside`
      : `${vertexCount} vertices`;
    main.appendChild(meta);

    const tag = document.createElement('span');
    tag.className = `zone-tag${zone.source === 'drawn' ? ' drawn' : ''}`;
    tag.textContent = zone.source === 'drawn' ? 'Terra Draw' : 'Pre-seeded';

    li.appendChild(main);
    li.appendChild(tag);

    li.addEventListener('click', () => {
      if (!map || !CoreLib) {
        return;
      }
      const bounds = new CoreLib.LatLngBounds();
      for (const pt of zone.paths) {
        bounds.extend(pt);
      }
      map.fitBounds(bounds, 60);
    });

    return li;
  });

  geofenceListEl.replaceChildren(...items);
}

function updateWorkerMarkerAppearance(isInside) {
  if (!workerMarker || !MarkerLib) {
    return;
  }
  const pin = new MarkerLib.PinElement({
    background: isInside ? '#059669' : '#dc2626',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: 'W',
    scale: 1.2,
  });
  workerMarker.content = pin;
  workerMarker.position = workerPosition;
}

function evaluateWorkerGeofence() {
  if (!CoreLib || !GeometryLib) {
    return;
  }

  const workerLatLng = new CoreLib.LatLng(workerPosition.lat, workerPosition.lng);
  const allZones = [...seededZones, ...drawnZones];

  let matched = null;
  for (const zone of allZones) {
    if (GeometryLib.poly.containsLocation(workerLatLng, zone.polygon)) {
      matched = zone;
      break;
    }
  }

  activeMatchedZone = matched;
  const isInside = Boolean(matched);

  updateWorkerMarkerAppearance(isInside);
  renderGeofenceList();

  if (isInside && matched) {
    geofenceStatusBadgeEl.textContent = `INSIDE: ${matched.name}`;
    geofenceStatusBadgeEl.className = 'geofence-pill inside';

    verifiedClockinBadgeEl.textContent = 'Verified Clock-In Eligible';
    verifiedClockinBadgeEl.className = 'status-badge unlocked';

    headerClockinPillEl.textContent = 'Clock-In Eligible';
    headerClockinPillEl.className = 'metric-pill status-eligible';

    clockinActionBtnEl.disabled = false;
    clockinFeedbackEl.textContent = `Worker verified inside ${matched.name}. Ready to clock in.`;
  } else {
    geofenceStatusBadgeEl.textContent = 'OUTSIDE ACTIVE GEOFENCES';
    geofenceStatusBadgeEl.className = 'geofence-pill outside';

    verifiedClockinBadgeEl.textContent = 'Clock-In Locked';
    verifiedClockinBadgeEl.className = 'status-badge locked';

    headerClockinPillEl.textContent = 'Clock-In Locked';
    headerClockinPillEl.className = 'metric-pill status-locked';

    clockinActionBtnEl.disabled = true;
    clockinFeedbackEl.textContent =
      'Clock-in locked: worker coordinates fall outside all active client geofences.';
  }
}

async function reverseGeocodeWorker(lat, lng) {
  const requestId = ++reverseGeocodeRequestId;
  workerAddressEl.textContent = 'Resolving Austin street address...';
  workerCoordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    if (response.ok) {
      const data = await response.json();
      if (requestId !== reverseGeocodeRequestId) {
        return;
      }
      if (data.formattedAddress) {
        workerFormattedAddress = data.formattedAddress;
        workerAddressEl.textContent = data.formattedAddress;
        return;
      }
    }
  } catch {
    // Fall through to Maps JS Geocoder fallback
  }

  if (GeocodingLib) {
    try {
      const geocoder = new GeocodingLib.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (requestId !== reverseGeocodeRequestId) {
        return;
      }
      const address = result.results?.[0]?.formatted_address;
      if (address) {
        workerFormattedAddress = address;
        workerAddressEl.textContent = address;
        return;
      }
    } catch {
      // Handled below
    }
  }

  if (requestId === reverseGeocodeRequestId) {
    workerFormattedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    workerAddressEl.textContent = 'Address unavailable for current coordinates';
  }
}

async function setWorkerLocation(lat, lng, presetId = null) {
  workerPosition = { lat, lng };
  if (presetId && workerPresetSelectEl.value !== presetId) {
    workerPresetSelectEl.value = presetId;
  }
  evaluateWorkerGeofence();
  await reverseGeocodeWorker(lat, lng);
}

function clearStopMarkers() {
  for (const marker of stopMarkers) {
    marker.map = null;
  }
  stopMarkers = [];
}

function renderAuditStopsList() {
  stopsCountLabelEl.textContent = `${auditStops.length} stop${auditStops.length === 1 ? '' : 's'}`;

  if (auditStops.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'helper-text';
    empty.textContent = 'No audit sites selected. Search or add a stop above.';
    auditStopsListEl.replaceChildren(empty);
    return;
  }

  const items = auditStops.map((stop, idx) => {
    const li = document.createElement('li');
    li.className = 'stop-item';

    const badge = document.createElement('span');
    badge.className = 'stop-index-badge';
    badge.textContent = String(idx + 1);

    const content = document.createElement('div');
    content.className = 'stop-content';

    const title = document.createElement('div');
    title.className = 'stop-title';
    title.textContent = stop.name;

    const address = document.createElement('div');
    address.className = 'stop-address';
    address.textContent = stop.address;

    content.appendChild(title);
    content.appendChild(address);

    const leg = currentLegs[idx];
    if (leg) {
      const legMeta = document.createElement('div');
      legMeta.className = 'stop-leg-meta';
      legMeta.textContent = `Leg ${idx + 1}: ${formatDistanceMeters(
        leg.distanceMeters,
      )} • ${formatDurationString(leg.duration)}`;
      content.appendChild(legMeta);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'stop-remove-btn';
    removeBtn.title = `Remove ${stop.name}`;
    removeBtn.setAttribute('aria-label', `Remove ${stop.name}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      auditStops = auditStops.filter((s) => s.id !== stop.id);
      void computeOptimizedAuditRoute();
    });

    li.appendChild(badge);
    li.appendChild(content);
    li.appendChild(removeBtn);

    li.addEventListener('click', () => {
      if (!map || !infoWindow) {
        return;
      }
      map.panTo(stop.location);
      const marker = stopMarkers[idx];
      if (marker) {
        const legInfo = leg
          ? `Stop #${idx + 1} • ${formatDistanceMeters(leg.distanceMeters)} (${formatDurationString(
              leg.duration,
            )})`
          : `Stop #${idx + 1}`;
        infoWindow.setContent(buildInfoWindowContent(stop.name, stop.address, legInfo));
        infoWindow.open({ anchor: marker, map });
      }
    });

    return li;
  });

  auditStopsListEl.replaceChildren(...items);
}

function renderAuditStopMarkers() {
  clearStopMarkers();
  if (!map || !MarkerLib) {
    return;
  }

  stopMarkers = auditStops.map((stop, idx) => {
    const pin = new MarkerLib.PinElement({
      background: '#1d4ed8',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: String(idx + 1),
      scale: 1.05,
    });

    const marker = new MarkerLib.AdvancedMarkerElement({
      map,
      position: stop.location,
      title: `${idx + 1}. ${stop.name}`,
      content: pin,
    });

    marker.addListener('click', () => {
      if (!infoWindow) {
        return;
      }
      const leg = currentLegs[idx];
      const legInfo = leg
        ? `Stop #${idx + 1} • ${formatDistanceMeters(leg.distanceMeters)} (${formatDurationString(
            leg.duration,
          )})`
        : `Stop #${idx + 1}`;
      infoWindow.setContent(buildInfoWindowContent(stop.name, stop.address, legInfo));
      infoWindow.open({ anchor: marker, map });
    });

    return marker;
  });
}

async function computeOptimizedAuditRoute(shouldFitBounds = false) {
  if (auditStops.length === 0) {
    if (routePolyline) {
      routePolyline.setMap(null);
      routePolyline = null;
    }
    currentLegs = [];
    clearStopMarkers();
    renderAuditStopsList();
    routeSummaryEl.textContent = 'Add at least 1 audit site to compute an optimized route.';
    headerRouteSummaryEl.textContent = 'Route: 0 stops';
    return;
  }

  routeSummaryEl.textContent = 'Optimizing multi-stop route with Routes API v2...';
  optimizeRouteBtnEl.disabled = true;

  try {
    const isRoundTrip = auditStops.length >= 2;
    const payload = {
      origin: workerPosition,
      destination: isRoundTrip ? workerPosition : auditStops[0].location,
      intermediates: isRoundTrip ? auditStops.map((stop) => stop.location) : [],
      optimizeWaypointOrder: isRoundTrip,
      travelMode: 'DRIVE',
    };

    const response = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error(data.details || data.error || 'No route returned.');
    }

    const route = data.routes[0];
    const order = route.optimizedIntermediateWaypointIndex;
    if (isRoundTrip && Array.isArray(order) && order.length === auditStops.length) {
      auditStops = order.map((originalIdx) => auditStops[originalIdx]).filter(Boolean);
    }

    currentLegs = Array.isArray(route.legs) ? route.legs : [];

    const encoded = route.polyline?.encodedPolyline;
    if (encoded && GeometryLib && MapsLib && map) {
      const path = GeometryLib.encoding.decodePath(encoded);
      if (routePolyline) {
        routePolyline.setMap(null);
      }
      routePolyline = new MapsLib.Polyline({
        map,
        path,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });

      if (shouldFitBounds && CoreLib) {
        const bounds = new CoreLib.LatLngBounds();
        bounds.extend(workerPosition);
        for (const stop of auditStops) {
          bounds.extend(stop.location);
        }
        map.fitBounds(bounds, 56);
      }
    }

    const totalDistance = formatDistanceMeters(route.distanceMeters);
    const totalDuration = formatDurationString(route.duration);
    const stopWord = auditStops.length === 1 ? 'stop' : 'stops';

    routeSummaryEl.textContent = `Optimized Audit Loop: ${auditStops.length} ${stopWord} • ${totalDistance} • ${totalDuration} (traffic-aware)`;
    headerRouteSummaryEl.textContent = `Route: ${totalDistance} • ${totalDuration}`;

    renderAuditStopMarkers();
    renderAuditStopsList();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    routeSummaryEl.textContent = `Route optimization unavailable: ${msg}`;
    headerRouteSummaryEl.textContent = 'Route: Unavailable';
    renderAuditStopMarkers();
    renderAuditStopsList();
  } finally {
    optimizeRouteBtnEl.disabled = false;
  }
}

async function searchAuditSites(textQuery, shouldFitBounds = false) {
  const query = textQuery.trim();
  if (!query) {
    return;
  }

  siteSearchBtnEl.disabled = true;
  routeSummaryEl.textContent = `Searching Places API (New) for "${query}"...`;

  try {
    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.details || data.error || 'Places Text Search failed.');
    }

    const places = Array.isArray(data.places) ? data.places : [];
    const mapped = places
      .filter((p) => p.location && typeof p.location.latitude === 'number')
      .map((p) => ({
        id: p.id || `${p.location.latitude},${p.location.longitude}`,
        name: p.displayName?.text || 'Austin Audit Site',
        address: p.formattedAddress || 'Austin, TX',
        category: p.primaryTypeDisplayName?.text || 'Store',
        location: {
          lat: p.location.latitude,
          lng: p.location.longitude,
        },
      }));

    if (mapped.length === 0) {
      routeSummaryEl.textContent = `No Austin sites returned for "${query}".`;
      return;
    }

    auditStops = mapped;
    await computeOptimizedAuditRoute(shouldFitBounds);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    routeSummaryEl.textContent = `Site search error: ${msg}`;
  } finally {
    siteSearchBtnEl.disabled = false;
  }
}

function mountPlaceAutocomplete() {
  if (!PlacesLib || !placeAutocompleteContainerEl) {
    return;
  }

  const autocompleteEl = new PlacesLib.PlaceAutocompleteElement({
    includedRegionCodes: ['us'],
    locationBias: {
      center: { lat: 30.2672, lng: -97.7431 },
      radius: 20000,
    },
  });

  autocompleteEl.addEventListener('gmp-select', async (event) => {
    try {
      const prediction = event.placePrediction;
      if (!prediction) {
        return;
      }
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryTypeDisplayName'],
      });
      if (!place.location) {
        return;
      }

      const stop = {
        id: place.id || `${place.location.lat()},${place.location.lng()}`,
        name: place.displayName || 'Selected Audit Site',
        address: place.formattedAddress || 'Austin, TX',
        category: place.primaryTypeDisplayName || 'Retail Site',
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      };

      const exists = auditStops.some((s) => s.id === stop.id);
      if (!exists) {
        auditStops = [...auditStops, stop];
      }
      await computeOptimizedAuditRoute(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      routeSummaryEl.textContent = `Could not add selected stop: ${msg}`;
    }
  });

  placeAutocompleteContainerEl.replaceChildren(autocompleteEl);
}

function initTerraDrawLayer() {
  if (!map || draw) {
    return;
  }

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
          fillColor: '#0f766e',
          fillOpacity: 0.24,
          outlineColor: '#0f766e',
          outlineWidth: 2,
          closingPointColor: '#1d4ed8',
          closingPointOutlineColor: '#ffffff',
          closingPointWidth: 6,
        },
      }),
    ],
  });

  draw.start();
  draw.setMode('static');
  updateDrawModeUI('static');

  draw.on('finish', () => {
    syncDrawnGeofencesFromTerraDraw();
    draw.setMode('select');
    updateDrawModeUI('select');
  });

  draw.on('change', (_ids, type) => {
    if (type === 'delete' || type === 'update') {
      syncDrawnGeofencesFromTerraDraw();
    }
  });
}

function wireStaticControls() {
  workerPresetSelectEl.addEventListener('change', () => {
    const preset = WORKER_PRESETS[workerPresetSelectEl.value];
    if (preset) {
      void setWorkerLocation(preset.lat, preset.lng, preset.id);
      if (map) {
        map.panTo({ lat: preset.lat, lng: preset.lng });
      }
    }
  });

  clockinActionBtnEl.addEventListener('click', () => {
    if (!activeMatchedZone) {
      return;
    }
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const entry = document.createElement('li');
    entry.className = 'clockin-log-item';
    entry.textContent = `Verified Clock-In at ${timestamp} • ${activeMatchedZone.name} (${
      workerFormattedAddress || `${workerPosition.lat.toFixed(4)}, ${workerPosition.lng.toFixed(4)}`
    })`;
    clockinLogEl.prepend(entry);
    clockinFeedbackEl.textContent = `Clock-in recorded at ${timestamp} inside ${activeMatchedZone.name}.`;
  });

  drawPolygonBtnEl.addEventListener('click', () => setTerraDrawMode('polygon'));
  sidebarDrawBtnEl.addEventListener('click', () => setTerraDrawMode('polygon'));

  selectModeBtnEl.addEventListener('click', () => setTerraDrawMode('select'));
  sidebarSelectBtnEl.addEventListener('click', () => setTerraDrawMode('select'));

  clearDrawnBtnEl.addEventListener('click', () => setTerraDrawMode('clear'));
  sidebarClearBtnEl.addEventListener('click', () => setTerraDrawMode('clear'));

  siteSearchBtnEl.addEventListener('click', () => {
    void searchAuditSites(siteSearchInputEl.value, true);
  });

  siteSearchInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void searchAuditSites(siteSearchInputEl.value, true);
    }
  });

  optimizeRouteBtnEl.addEventListener('click', () => {
    void computeOptimizedAuditRoute(true);
  });
}

async function bootstrap() {
  wireStaticControls();

  let config;
  try {
    const res = await fetch('/api/config');
    config = await res.json();
  } catch (error) {
    showBanner('Unable to reach backend configuration endpoint /api/config.');
    return;
  }

  if (!config.configured || !config.apiKey) {
    showBanner(
      'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your Maps Demo Key to load the live map, geocoding, and routing.',
    );
    workerAddressEl.textContent = 'Set GOOGLE_MAPS_API_KEY in .env to enable reverse geocoding';
    routeSummaryEl.textContent = 'Set GOOGLE_MAPS_API_KEY in .env to enable Places & Routes API';
    headerRouteSummaryEl.textContent = 'Route: API Key Required';
    return;
  }

  hideBanner();

  setOptions({
    key: config.apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const [core, maps, marker, places, geocoding, geometry] = await Promise.all([
    importLibrary('core'),
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('geocoding'),
    importLibrary('geometry'),
    importLibrary('routes'),
  ]);

  CoreLib = core;
  MapsLib = maps;
  MarkerLib = marker;
  PlacesLib = places;
  GeocodingLib = geocoding;
  GeometryLib = geometry;

  map = new MapsLib.Map(mapContainerEl, {
    center: config.defaultCenter ?? { lat: 30.2672, lng: -97.7431 },
    zoom: config.defaultZoom ?? 12,
    mapId: config.mapId ?? 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
  });

  infoWindow = new MapsLib.InfoWindow();

  // Render pre-seeded Austin geofence polygons (clickable: false so Terra Draw receives clicks)
  seededZones = SEEDED_GEOFENCES.map((zone) => {
    const polygon = new MapsLib.Polygon({
      map,
      paths: zone.paths,
      strokeColor: zone.color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: zone.color,
      fillOpacity: 0.16,
      clickable: false,
    });
    return {
      ...zone,
      polygon,
    };
  });

  // Simulated worker AdvancedMarkerElement
  const initialPin = new MarkerLib.PinElement({
    background: '#059669',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: 'W',
    scale: 1.2,
  });

  workerMarker = new MarkerLib.AdvancedMarkerElement({
    map,
    position: workerPosition,
    title: 'Simulated Field Worker GPS Position (Draggable)',
    gmpDraggable: true,
    content: initialPin,
  });

  workerMarker.addListener('dragend', () => {
    const pos = workerMarker.position;
    if (!pos) {
      return;
    }
    const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
    const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
    void setWorkerLocation(lat, lng);
  });

  workerMarker.addListener('click', () => {
    if (!infoWindow) {
      return;
    }
    const statusText = activeMatchedZone
      ? `Inside ${activeMatchedZone.name} (Clock-In Eligible)`
      : 'Outside Geofences (Clock-In Locked)';
    infoWindow.setContent(
      buildInfoWindowContent(
        'Field Worker GPS',
        workerFormattedAddress || `${workerPosition.lat.toFixed(5)}, ${workerPosition.lng.toFixed(5)}`,
        statusText,
      ),
    );
    infoWindow.open({ anchor: workerMarker, map });
  });

  map.addListener('click', (event) => {
    if (currentDrawMode !== 'static' || !event.latLng) {
      return;
    }
    void setWorkerLocation(event.latLng.lat(), event.latLng.lng());
  });

  map.addListener('projection_changed', () => {
    initTerraDrawLayer();
  });

  mountPlaceAutocomplete();
  await setWorkerLocation(workerPosition.lat, workerPosition.lng, 'downtown-inside');
  await searchAuditSites(siteSearchInputEl.value || 'retail stores in Austin, TX', false);
}

void bootstrap();
