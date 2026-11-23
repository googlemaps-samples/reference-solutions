// Seattle EV Fast-Charging & Roadside Dispatch Frontend
// Strictly uses modern Google Maps Platform APIs and safe DOM manipulation (no innerHTML).

const DEFAULT_CENTER = { lat: 47.6062, lng: -122.3321 };
const DEFAULT_ZOOM = 12;
const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const state = {
  configured: false,
  driverLocation: { ...DEFAULT_CENTER },
  driverAddress: 'Downtown Seattle, WA',
  radiusMeters: 10000,
  category: 'all', // 'all' | 'ev' | 'repair'
  providers: [],
  selectedPlaceId: null,
  activeRoute: null,
  stepsExpanded: true,
  searchSequence: 0,
};

let map = null;
let driverMarker = null;
let searchCircle = null;
let routePolyline = null;
let infoWindow = null;
let providerMarkers = [];
let mapsLibs = null;

const dom = {
  autocompleteContainer: document.getElementById('autocomplete-container'),
  driverAddressText: document.getElementById('driver-address-text'),
  useMapCenterBtn: document.getElementById('use-map-center-btn'),
  categoryFilterAll: document.getElementById('category-filter-all'),
  categoryFilterEv: document.getElementById('category-filter-ev'),
  categoryFilterRepair: document.getElementById('category-filter-repair'),
  radius5km: document.getElementById('radius-5km'),
  radius10km: document.getElementById('radius-10km'),
  radius15km: document.getElementById('radius-15km'),
  resultsMeta: document.getElementById('results-meta'),
  resultsCount: document.getElementById('results-count'),
  statusBanner: document.getElementById('status-banner'),
  routeSummaryPanel: document.getElementById('route-summary-panel'),
  routeDestName: document.getElementById('route-dest-name'),
  routeEtaValue: document.getElementById('route-eta-value'),
  routeDistanceValue: document.getElementById('route-distance-value'),
  routeDestAddress: document.getElementById('route-dest-address'),
  routeGmapsLink: document.getElementById('route-gmaps-link'),
  toggleStepsBtn: document.getElementById('toggle-steps-btn'),
  clearRouteBtn: document.getElementById('clear-route-btn'),
  turnByTurnSteps: document.getElementById('turn-by-turn-steps'),
  providerList: document.getElementById('provider-list'),
  mapContainer: document.getElementById('map-container'),
};

function showBanner(message, variant = 'info') {
  dom.statusBanner.textContent = message;
  dom.statusBanner.classList.remove('hidden', 'is-error', 'is-warning');
  if (variant === 'error') {
    dom.statusBanner.classList.add('is-error');
  } else if (variant === 'warning') {
    dom.statusBanner.classList.add('is-warning');
  }
}

function hideBanner() {
  dom.statusBanner.classList.add('hidden');
  dom.statusBanner.textContent = '';
}

function initMapsBootstrap(apiKey) {
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
            g[k]
          );
        }
        e.set('callback', c + '.maps.' + q);
        a.src = 'https://maps.' + c + 'apis.com/maps/api/js?' + e;
        d[q] = f;
        a.onerror = () => (h = n(new Error(p + ' could not load.')));
        a.nonce = m.querySelector('script[nonce]')?.nonce || '';
        m.head.append(a);
      }));

    if (d[l]) {
      return;
    }
    d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
  })({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
  });
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function parseDurationSeconds(durationStr) {
  if (typeof durationStr !== 'string') {
    return null;
  }
  const match = durationStr.match(/^([\d.]+)s$/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return 'ETA --';
  }
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistance(meters) {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) {
    return '--';
  }
  const km = meters / 1000;
  const miles = meters / 1609.344;
  return `${km.toFixed(1)} km (${miles.toFixed(1)} mi)`;
}

function classifyProvider(place) {
  const types = Array.isArray(place.types) ? place.types : [];
  if (
    place.primaryType === 'electric_vehicle_charging_station' ||
    types.includes('electric_vehicle_charging_station') ||
    Boolean(place.evChargeOptions)
  ) {
    return 'ev';
  }
  return 'repair';
}

function summarizeEvConnectors(evChargeOptions) {
  if (!evChargeOptions) {
    return null;
  }
  const agg = Array.isArray(evChargeOptions.connectorAggregation)
    ? evChargeOptions.connectorAggregation
    : [];
  let totalCount = Number(evChargeOptions.connectorCount) || 0;
  let availableCount = 0;
  let hasAvailability = false;
  let maxKw = 0;

  for (const item of agg) {
    if (typeof item.count === 'number' && !evChargeOptions.connectorCount) {
      totalCount += item.count;
    }
    if (typeof item.availableCount === 'number') {
      hasAvailability = true;
      availableCount += item.availableCount;
    }
    if (typeof item.maxChargeRateKw === 'number' && item.maxChargeRateKw > maxKw) {
      maxKw = item.maxChargeRateKw;
    }
  }

  const parts = [];
  if (hasAvailability && totalCount > 0) {
    parts.push(`${availableCount}/${totalCount} avail`);
  } else if (totalCount > 0) {
    parts.push(`${totalCount} ports`);
  }
  if (maxKw > 0) {
    parts.push(`${Math.round(maxKw)} kW`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'EV Charging';
}

function formatOpeningBadge(place) {
  const hours = place.regularOpeningHours;
  if (!hours) {
    return { text: 'Hours N/A', tone: 'neutral' };
  }
  if (typeof hours.openNow === 'boolean') {
    return hours.openNow
      ? { text: 'Open now', tone: 'open' }
      : { text: 'Closed', tone: 'closed' };
  }
  if (Array.isArray(hours.weekdayDescriptions) && hours.weekdayDescriptions.length > 0) {
    return { text: 'Hours listed', tone: 'neutral' };
  }
  return { text: 'Hours N/A', tone: 'neutral' };
}

async function reverseGeocode(point) {
  try {
    const params = new URLSearchParams({
      lat: String(point.lat),
      lng: String(point.lng),
    });
    const res = await fetch(`/api/geocode/reverse?${params.toString()}`);
    if (!res.ok) {
      return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
    }
    const data = await res.json();
    return data.formattedAddress || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  } catch {
    return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  }
}

async function fetchNearbyPlacesForTypes(point, radiusMeters, includedTypes) {
  const res = await fetch('/api/places/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: point.lat,
      lng: point.lng,
      radiusMeters,
      includedTypes,
      maxResultCount: 10,
      rankPreference: 'DISTANCE',
    }),
  });
  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.error || `Nearby search failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data.places) ? data.places : [];
}

async function fetchEtaMatrix(origin, destinations) {
  if (destinations.length === 0) {
    return [];
  }
  const res = await fetch('/api/routes/matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destinations,
    }),
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.elements) ? data.elements : [];
}

function clearProviderMarkers() {
  for (const marker of providerMarkers) {
    marker.map = null;
  }
  providerMarkers = [];
}

function clearActiveRoute() {
  state.activeRoute = null;
  state.selectedPlaceId = null;
  if (routePolyline) {
    routePolyline.setMap(null);
    routePolyline = null;
  }
  if (infoWindow) {
    infoWindow.close();
  }
  dom.routeSummaryPanel.classList.add('hidden');
  dom.turnByTurnSteps.replaceChildren();
  renderProviderList();
}

function openProviderInfoWindow(provider, marker) {
  if (!infoWindow || !map) {
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'info-window-card';

  const title = document.createElement('h4');
  title.className = 'info-window-title';
  title.textContent = provider.name;

  const addr = document.createElement('p');
  addr.className = 'info-window-sub';
  addr.textContent = provider.address;

  const metrics = document.createElement('p');
  metrics.className = 'info-window-sub';
  const etaStr = formatDuration(provider.durationSeconds);
  const distStr = formatDistance(provider.distanceMeters);
  metrics.textContent = `${etaStr} · ${distStr}`;

  const routeBtn = document.createElement('button');
  routeBtn.type = 'button';
  routeBtn.className = 'btn btn-primary btn-sm';
  routeBtn.textContent = 'Route Here';
  routeBtn.addEventListener('click', () => {
    selectAndRouteProvider(provider);
  });

  wrapper.replaceChildren(title, addr, metrics, routeBtn);
  infoWindow.setContent(wrapper);
  infoWindow.open({ anchor: marker, map });
}

function renderProviderMarkers() {
  clearProviderMarkers();
  if (!map || !mapsLibs) {
    return;
  }
  const { AdvancedMarkerElement, PinElement } = mapsLibs;

  for (const provider of state.providers) {
    const isEv = provider.category === 'ev';
    const isSelected = provider.id === state.selectedPlaceId;

    const pin = new PinElement({
      background: isEv ? '#059669' : '#2563eb',
      borderColor: isSelected ? '#0f172a' : isEv ? '#065f46' : '#1e40af',
      glyphColor: '#ffffff',
      glyphText: isEv ? 'EV' : 'FX',
      scale: isSelected ? 1.2 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map,
      position: provider.position,
      title: provider.name,
      zIndex: isSelected ? 200 : 100,
    });
    marker.append(pin);

    // Weekly-channel safe click listener
    marker.addListener('click', () => {
      openProviderInfoWindow(provider, marker);
      selectAndRouteProvider(provider);
    });

    provider.marker = marker;
    providerMarkers.push(marker);
  }
}

function renderProviderList() {
  const list = dom.providerList;
  const items = state.providers;
  dom.resultsCount.textContent = String(items.length);

  const radiusKm = Math.round(state.radiusMeters / 1000);
  const categoryLabel =
    state.category === 'ev'
      ? 'EV Fast Charging'
      : state.category === 'repair'
        ? 'Auto Repair'
        : 'EV & Auto Repair';
  dom.resultsMeta.textContent = `${categoryLabel} within ${radiusKm} km · sorted by drive ETA`;

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = state.configured
      ? 'No EV charging stations or auto repair providers found in this radius. Try expanding to 15 km or moving the breakdown pin.'
      : 'Configure GOOGLE_MAPS_API_KEY in .env and restart the server to load live Seattle stations and repair shops.';
    list.replaceChildren(empty);
    return;
  }

  const cards = items.map((provider, idx) => {
    const card = document.createElement('article');
    card.id = `provider-card-${idx}`;
    card.className = 'provider-card';
    card.setAttribute('role', 'listitem');
    if (provider.id === state.selectedPlaceId) {
      card.classList.add('is-selected');
    }

    const topRow = document.createElement('div');
    topRow.className = 'card-top';

    const badges = document.createElement('div');
    badges.className = 'card-badges';

    const catBadge = document.createElement('span');
    catBadge.className = `badge ${provider.category === 'ev' ? 'badge-ev' : 'badge-repair'}`;
    catBadge.textContent =
      provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair';
    badges.appendChild(catBadge);

    const statusBadge = document.createElement('span');
    if (provider.category === 'ev' && provider.evSummary) {
      statusBadge.className = 'badge badge-open';
      statusBadge.textContent = provider.evSummary;
    } else {
      const openInfo = provider.openBadge;
      statusBadge.className =
        openInfo.tone === 'open'
          ? 'badge badge-open'
          : openInfo.tone === 'closed'
            ? 'badge badge-closed'
            : 'badge badge-neutral';
      statusBadge.textContent = openInfo.text;
    }
    badges.appendChild(statusBadge);

    const etaPill = document.createElement('span');
    etaPill.className = 'eta-pill';
    etaPill.textContent = formatDuration(provider.durationSeconds);

    topRow.replaceChildren(badges, etaPill);

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = `${idx + 1}. ${provider.name}`;

    const address = document.createElement('p');
    address.className = 'card-address';
    address.textContent = provider.address;

    const metaRow = document.createElement('div');
    metaRow.className = 'card-meta-row';

    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'rating-text';
    if (typeof provider.rating === 'number') {
      const countPart =
        typeof provider.userRatingCount === 'number'
          ? ` (${provider.userRatingCount})`
          : '';
      ratingSpan.textContent = `★ ${provider.rating.toFixed(1)}${countPart}`;
    } else {
      ratingSpan.textContent = 'No rating yet';
    }

    const phoneSpan = document.createElement('span');
    phoneSpan.textContent = provider.phone || '';

    metaRow.replaceChildren(ratingSpan, phoneSpan);

    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const distSpan = document.createElement('span');
    distSpan.className = 'distance-text';
    distSpan.textContent = formatDistance(provider.distanceMeters);

    const routeBtn = document.createElement('button');
    routeBtn.type = 'button';
    routeBtn.className = 'btn btn-primary btn-sm dispatch-route-btn';
    if (idx === 0) {
      routeBtn.id = 'dispatch-route-btn';
    }
    routeBtn.textContent =
      provider.id === state.selectedPlaceId ? 'Routing...' : 'Route Here';
    if (provider.id === state.selectedPlaceId && state.activeRoute) {
      routeBtn.textContent = 'Active Route';
    }

    routeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      selectAndRouteProvider(provider);
    });

    footer.replaceChildren(distSpan, routeBtn);

    card.addEventListener('click', () => {
      if (provider.marker) {
        openProviderInfoWindow(provider, provider.marker);
      }
      selectAndRouteProvider(provider);
    });

    card.replaceChildren(topRow, title, address, metaRow, footer);
    return card;
  });

  list.replaceChildren(...cards);
}

function renderRouteSummary(provider, routeData) {
  const durationSec = parseDurationSeconds(routeData.duration);
  dom.routeDestName.textContent = provider.name;
  dom.routeEtaValue.textContent = formatDuration(durationSec);
  dom.routeDistanceValue.textContent = formatDistance(routeData.distanceMeters);
  dom.routeDestAddress.textContent = provider.address;

  if (provider.googleMapsUri) {
    dom.routeGmapsLink.href = provider.googleMapsUri;
    dom.routeGmapsLink.classList.remove('hidden');
  } else {
    dom.routeGmapsLink.classList.add('hidden');
  }

  const steps = Array.isArray(routeData.legs?.[0]?.steps)
    ? routeData.legs[0].steps
    : [];

  const stepItems = steps.map((step) => {
    const li = document.createElement('li');
    const instructionText =
      step.navigationInstruction?.instructions || 'Continue along route';

    const mainSpan = document.createElement('span');
    mainSpan.textContent = instructionText;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'step-meta';
    const stepDist =
      typeof step.distanceMeters === 'number'
        ? step.distanceMeters >= 1000
          ? `${(step.distanceMeters / 1000).toFixed(1)} km`
          : `${Math.round(step.distanceMeters)} m`
        : '';
    const stepDurSec = parseDurationSeconds(step.staticDuration);
    const stepDur = stepDurSec ? formatDuration(stepDurSec) : '';
    metaSpan.textContent = [stepDist, stepDur].filter(Boolean).join(' · ');

    li.replaceChildren(mainSpan, metaSpan);
    return li;
  });

  if (stepItems.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Proceed directly toward the destination marker.';
    stepItems.push(li);
  }

  dom.turnByTurnSteps.replaceChildren(...stepItems);
  dom.turnByTurnSteps.classList.toggle('hidden', !state.stepsExpanded);
  dom.toggleStepsBtn.textContent = state.stepsExpanded ? 'Hide Steps' : 'Show Steps';
  dom.toggleStepsBtn.setAttribute('aria-expanded', String(state.stepsExpanded));
  dom.routeSummaryPanel.classList.remove('hidden');
}

async function selectAndRouteProvider(provider) {
  if (!state.configured || !map || !mapsLibs) {
    return;
  }

  state.selectedPlaceId = provider.id;
  renderProviderMarkers();
  renderProviderList();

  try {
    showBanner(`Computing live driving route to ${provider.name}...`);
    const res = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: state.driverLocation,
        destination: provider.position,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Compute Routes failed (${res.status})`);
    }

    const data = await res.json();
    const route = Array.isArray(data.routes) && data.routes.length > 0 ? data.routes[0] : null;
    if (!route || !route.polyline?.encodedPolyline) {
      throw new Error('No drivable route polyline returned.');
    }

    state.activeRoute = route;
    const { Polyline, LatLngBounds, encoding } = mapsLibs;
    const decodedPath = encoding.decodePath(route.polyline.encodedPolyline);

    if (routePolyline) {
      routePolyline.setMap(null);
    }

    routePolyline = new Polyline({
      path: decodedPath,
      geodesic: true,
      strokeColor: '#0284c7',
      strokeOpacity: 0.92,
      strokeWeight: 6,
      map,
    });

    const bounds = new LatLngBounds();
    bounds.extend(state.driverLocation);
    bounds.extend(provider.position);
    for (const pt of decodedPath) {
      bounds.extend(pt);
    }
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });

    renderRouteSummary(provider, route);
    renderProviderList();
    hideBanner();
  } catch (err) {
    showBanner(
      err instanceof Error ? err.message : 'Unable to compute route.',
      'error'
    );
  }
}

async function refreshNearbyProviders() {
  if (!state.configured) {
    renderProviderList();
    return;
  }

  const seq = ++state.searchSequence;
  showBanner('Searching nearby EV chargers and auto repair providers...');

  try {
    let rawPlaces = [];
    if (state.category === 'ev') {
      rawPlaces = await fetchNearbyPlacesForTypes(
        state.driverLocation,
        state.radiusMeters,
        ['electric_vehicle_charging_station']
      );
    } else if (state.category === 'repair') {
      rawPlaces = await fetchNearbyPlacesForTypes(
        state.driverLocation,
        state.radiusMeters,
        ['car_repair']
      );
    } else {
      const [evPlaces, repairPlaces] = await Promise.all([
        fetchNearbyPlacesForTypes(state.driverLocation, state.radiusMeters, [
          'electric_vehicle_charging_station',
        ]),
        fetchNearbyPlacesForTypes(state.driverLocation, state.radiusMeters, [
          'car_repair',
        ]),
      ]);
      rawPlaces = [...evPlaces, ...repairPlaces];
    }

    if (seq !== state.searchSequence) {
      return;
    }

    const dedupedMap = new Map();
    for (const place of rawPlaces) {
      if (!place?.id || !place.location) {
        continue;
      }
      if (!dedupedMap.has(place.id)) {
        dedupedMap.set(place.id, place);
      }
    }

    const normalized = Array.from(dedupedMap.values())
      .map((place) => {
        const position = {
          lat: place.location.latitude,
          lng: place.location.longitude,
        };
        const category = classifyProvider(place);
        const straightMeters = haversineMeters(state.driverLocation, position);
        return {
          id: place.id,
          name: place.displayName?.text || 'Unnamed Provider',
          address: place.formattedAddress || 'Seattle, WA',
          position,
          category,
          rating: typeof place.rating === 'number' ? place.rating : null,
          userRatingCount:
            typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
          phone: place.nationalPhoneNumber || '',
          googleMapsUri: place.googleMapsUri || '',
          evSummary: summarizeEvConnectors(place.evChargeOptions),
          openBadge: formatOpeningBadge(place),
          straightMeters,
          distanceMeters: straightMeters,
          durationSeconds: null,
          marker: null,
        };
      })
      .sort((a, b) => a.straightMeters - b.straightMeters)
      .slice(0, 20);

    // Rank by live driving ETA using Routes API Compute Route Matrix
    if (normalized.length > 0) {
      const destinations = normalized.map((item) => item.position);
      const matrixElements = await fetchEtaMatrix(state.driverLocation, destinations);
      if (seq !== state.searchSequence) {
        return;
      }

      for (const el of matrixElements) {
        const idx = el.destinationIndex;
        if (typeof idx === 'number' && normalized[idx] && el.condition === 'ROUTE_EXISTS') {
          if (typeof el.distanceMeters === 'number') {
            normalized[idx].distanceMeters = el.distanceMeters;
          }
          const sec = parseDurationSeconds(el.duration);
          if (sec !== null) {
            normalized[idx].durationSeconds = sec;
          }
        }
      }

      normalized.sort((a, b) => {
        const durA = a.durationSeconds ?? Number.MAX_SAFE_INTEGER;
        const durB = b.durationSeconds ?? Number.MAX_SAFE_INTEGER;
        if (durA !== durB) {
          return durA - durB;
        }
        return a.distanceMeters - b.distanceMeters;
      });
    }

    state.providers = normalized;
    renderProviderMarkers();
    renderProviderList();
    hideBanner();
  } catch (err) {
    if (seq !== state.searchSequence) {
      return;
    }
    showBanner(
      err instanceof Error ? err.message : 'Unable to fetch nearby providers.',
      'error'
    );
  }
}

async function relocateDriver(point, options = {}) {
  const { addressOverride = null, recenterMap = false } = options;
  state.driverLocation = { lat: point.lat, lng: point.lng };

  if (driverMarker) {
    driverMarker.position = state.driverLocation;
  }
  if (searchCircle) {
    searchCircle.setCenter(state.driverLocation);
  }
  if (recenterMap && map) {
    map.panTo(state.driverLocation);
  }

  clearActiveRoute();

  if (addressOverride) {
    state.driverAddress = addressOverride;
    dom.driverAddressText.textContent = addressOverride;
  } else {
    dom.driverAddressText.textContent = 'Resolving address...';
    const resolved = await reverseGeocode(state.driverLocation);
    state.driverAddress = resolved;
    dom.driverAddressText.textContent = resolved;
  }

  await refreshNearbyProviders();
}

function setActiveCategory(category) {
  state.category = category;
  const mapping = [
    [dom.categoryFilterAll, 'all'],
    [dom.categoryFilterEv, 'ev'],
    [dom.categoryFilterRepair, 'repair'],
  ];
  for (const [el, value] of mapping) {
    el.classList.toggle('is-active', value === category);
  }
  clearActiveRoute();
  refreshNearbyProviders();
}

function setActiveRadius(radiusMeters) {
  state.radiusMeters = radiusMeters;
  const mapping = [
    [dom.radius5km, 5000],
    [dom.radius10km, 10000],
    [dom.radius15km, 15000],
  ];
  for (const [el, value] of mapping) {
    el.classList.toggle('is-active', value === radiusMeters);
  }
  if (searchCircle) {
    searchCircle.setRadius(radiusMeters);
    if (map && searchCircle.getBounds()) {
      map.fitBounds(searchCircle.getBounds(), 24);
    }
  }
  clearActiveRoute();
  refreshNearbyProviders();
}

function bindUiListeners() {
  dom.categoryFilterAll.addEventListener('click', () => setActiveCategory('all'));
  dom.categoryFilterEv.addEventListener('click', () => setActiveCategory('ev'));
  dom.categoryFilterRepair.addEventListener('click', () => setActiveCategory('repair'));

  dom.radius5km.addEventListener('click', () => setActiveRadius(5000));
  dom.radius10km.addEventListener('click', () => setActiveRadius(10000));
  dom.radius15km.addEventListener('click', () => setActiveRadius(15000));

  dom.useMapCenterBtn.addEventListener('click', () => {
    if (!map) {
      return;
    }
    const center = map.getCenter();
    if (!center) {
      return;
    }
    relocateDriver({ lat: center.lat(), lng: center.lng() }, { recenterMap: false });
  });

  dom.clearRouteBtn.addEventListener('click', () => {
    clearActiveRoute();
    renderProviderMarkers();
  });

  dom.toggleStepsBtn.addEventListener('click', () => {
    state.stepsExpanded = !state.stepsExpanded;
    dom.turnByTurnSteps.classList.toggle('hidden', !state.stepsExpanded);
    dom.toggleStepsBtn.textContent = state.stepsExpanded ? 'Hide Steps' : 'Show Steps';
    dom.toggleStepsBtn.setAttribute('aria-expanded', String(state.stepsExpanded));
  });
}

async function initApp() {
  bindUiListeners();

  let config;
  try {
    const res = await fetch('/api/config');
    config = await res.json();
  } catch (err) {
    showBanner('Failed to load server configuration.', 'error');
    return;
  }

  state.configured = Boolean(config.configured && config.mapsApiKey);
  if (!state.configured) {
    const fallbackNote = document.createElement('div');
    fallbackNote.className = 'autocomplete-fallback-note';
    fallbackNote.textContent = 'Set GOOGLE_MAPS_API_KEY in .env to enable Places Autocomplete';
    dom.autocompleteContainer.replaceChildren(fallbackNote);
    showBanner(
      'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env, add your Google Maps Platform key (or free Maps Demo Key), and restart the server.',
      'warning'
    );
    renderProviderList();
    return;
  }

  initMapsBootstrap(config.mapsApiKey);

  try {
    const [mapsLib, markerLib, placesLib, coreLib, geometryLib] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('places'),
      google.maps.importLibrary('core'),
      google.maps.importLibrary('geometry'),
    ]);

    mapsLibs = {
      Map: mapsLib.Map,
      Circle: mapsLib.Circle,
      Polyline: mapsLib.Polyline,
      InfoWindow: mapsLib.InfoWindow,
      AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
      PinElement: markerLib.PinElement,
      PlaceAutocompleteElement: placesLib.PlaceAutocompleteElement,
      LatLngBounds: coreLib.LatLngBounds,
      encoding: geometryLib.encoding,
    };

    const initialCenter = config.initialCenter || DEFAULT_CENTER;
    state.driverLocation = { lat: initialCenter.lat, lng: initialCenter.lng };

    map = new mapsLibs.Map(dom.mapContainer, {
      center: state.driverLocation,
      zoom: config.initialZoom || DEFAULT_ZOOM,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindow = new mapsLibs.InfoWindow();

    searchCircle = new mapsLibs.Circle({
      map,
      center: state.driverLocation,
      radius: state.radiusMeters,
      strokeColor: '#0284c7',
      strokeOpacity: 0.75,
      strokeWeight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.1,
      clickable: false,
    });

    const driverPin = new mapsLibs.PinElement({
      background: '#dc2626',
      borderColor: '#7f1d1d',
      glyphColor: '#ffffff',
      glyphText: 'SOS',
      scale: 1.15,
    });

    driverMarker = new mapsLibs.AdvancedMarkerElement({
      map,
      position: state.driverLocation,
      title: 'Driver Breakdown Location (drag to relocate)',
      gmpDraggable: true,
      zIndex: 300,
    });
    driverMarker.append(driverPin);

    driverMarker.addListener('dragend', () => {
      const pos = driverMarker.position;
      if (!pos) {
        return;
      }
      const nextLat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
      const nextLng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
      relocateDriver({ lat: nextLat, lng: nextLng }, { recenterMap: false });
    });

    map.addListener('click', (event) => {
      if (!event?.latLng) {
        return;
      }
      relocateDriver(
        { lat: event.latLng.lat(), lng: event.latLng.lng() },
        { recenterMap: false }
      );
    });

    const autocomplete = new mapsLibs.PlaceAutocompleteElement({
      locationBias: {
        center: state.driverLocation,
        radius: 25000,
      },
      includedRegionCodes: ['us'],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
    autocomplete.setAttribute('placeholder', 'Search Seattle address or landmark...');
    autocomplete.setAttribute('aria-label', 'Search breakdown address or Seattle landmark');
    dom.autocompleteContainer.replaceChildren(autocomplete);

    autocomplete.addEventListener('gmp-select', async (event) => {
      try {
        const prediction = event?.placePrediction;
        if (!prediction) {
          return;
        }
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        if (!place.location) {
          return;
        }
        const nextPoint = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const label = place.formattedAddress || place.displayName || null;
        await relocateDriver(nextPoint, {
          addressOverride: label,
          recenterMap: true,
        });
      } catch (err) {
        showBanner(
          err instanceof Error ? err.message : 'Unable to select autocomplete location.',
          'error'
        );
      }
    });

    autocomplete.addEventListener('gmp-error', () => {
      showBanner('Places Autocomplete reported an API error. Check your API key permissions.', 'warning');
    });

    // Initial reverse geocode & Seattle nearby search
    await relocateDriver(state.driverLocation, { recenterMap: false });
  } catch (err) {
    showBanner(
      err instanceof Error ? err.message : 'Failed to initialize Google Maps JavaScript API.',
      'error'
    );
  }
}

initApp();
