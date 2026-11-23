/**
 * Seattle On-Demand EV Charging & Roadside Dispatch Frontend
 *
 * Uses modern Google Maps Platform APIs exclusively:
 * - Maps JS API: Map (with mapId='DEMO_MAP_ID' & internalUsageAttributionIds=['gmp_git_agentsamples_v1.0.0']),
 *   Circle, Polyline, InfoWindow, AdvancedMarkerElement, PinElement, PlaceAutocompleteElement
 * - BFF Proxy Endpoints (/api/*): Places API (New), Routes API (Matrix + ComputeRoutes), Geocoding API
 *
 * Zero innerHTML/outerHTML usage: all DOM nodes are created via document.createElement + textContent.
 */

const state = {
  config: null,
  driverPos: { lat: 47.6062, lng: -122.3321 },
  radiusMeters: 10000,
  category: 'all', // 'all' | 'ev' | 'repair'
  providers: [],
  selectedProviderId: null,
  activeRoute: null,
  stepsExpanded: true,
  searchRequestSeq: 0,
  searchAbortController: null,
};

let map = null;
let driverMarker = null;
let searchCircle = null;
let routePolyline = null;
let infoWindow = null;
let providerMarkers = new Map();

let MapsLib = null;
let MarkerLib = null;
let PlacesLib = null;
let CoreLib = null;
let GeometryLib = null;

const dom = {
  autocompleteContainer: document.getElementById('autocomplete-container'),
  useMapCenterBtn: document.getElementById('use-map-center-btn'),
  driverAddressBadge: document.getElementById('driver-address-badge'),
  categoryBtns: {
    all: document.getElementById('category-filter-all'),
    ev: document.getElementById('category-filter-ev'),
    repair: document.getElementById('category-filter-repair'),
  },
  radiusBtns: {
    5000: document.getElementById('radius-5km'),
    10000: document.getElementById('radius-10km'),
    15000: document.getElementById('radius-15km'),
  },
  resultsCount: document.getElementById('results-count'),
  dispatchFastestBtn: document.getElementById('dispatch-route-btn'),
  statusBanner: document.getElementById('status-banner'),
  routeSummaryPanel: document.getElementById('route-summary-panel'),
  routeCategoryPill: document.getElementById('route-category-pill'),
  routeDestName: document.getElementById('route-dest-name'),
  routeDestAddress: document.getElementById('route-dest-address'),
  routeEtaValue: document.getElementById('route-eta-value'),
  routeDistanceValue: document.getElementById('route-distance-value'),
  routeGmapsLink: document.getElementById('route-gmaps-link'),
  toggleStepsBtn: document.getElementById('toggle-steps-btn'),
  clearRouteBtn: document.getElementById('clear-route-btn'),
  turnByTurnSteps: document.getElementById('turn-by-turn-steps'),
  providerList: document.getElementById('provider-list'),
  mapContainer: document.getElementById('map-container'),
};

function loadGoogleMapsBootstrap(apiKey, attributionId) {
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
        e.set('libraries', [...r].join(','));
        for (k in g) {
          e.set(
            k.replace(/[A-Z]/g, (t) => `_${t[0].toLowerCase()}`),
            g[k]
          );
        }
        e.set('callback', `${c}.maps.${q}`);
        a.src = `https://maps.${c}apis.com/maps/api/js?${e.toString()}`;
        d[q] = f;
        a.onerror = () => (h = n(new Error(`${p} could not load.`)));
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
    internalUsageAttributionIds: attributionId,
  });
}

function toLatLngLiteral(pos) {
  if (!pos) return null;
  const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
  const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
  return { lat: Number(lat), lng: Number(lng) };
}

function showStatus(message, isError = false) {
  if (!message) {
    dom.statusBanner.classList.add('hidden');
    dom.statusBanner.textContent = '';
    dom.statusBanner.classList.remove('error');
    return;
  }
  dom.statusBanner.textContent = message;
  dom.statusBanner.classList.remove('hidden');
  dom.statusBanner.classList.toggle('error', Boolean(isError));
}

function formatDurationSeconds(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return 'ETA N/A';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function parseDurationString(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const parsed = Number.parseFloat(durationStr.replace('s', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDistanceMeters(meters) {
  if (meters == null || !Number.isFinite(meters)) return '--';
  const km = meters / 1000;
  const miles = meters / 1609.344;
  return `${km.toFixed(1)} km (${miles.toFixed(1)} mi)`;
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

function classifyProvider(place) {
  const types = place.types || [];
  if (
    place.primaryType === 'electric_vehicle_charging_station' ||
    types.includes('electric_vehicle_charging_station') ||
    place.evChargeOptions
  ) {
    return 'ev';
  }
  return 'repair';
}

function formatConnectorSummary(place) {
  const ev = place.evChargeOptions;
  if (!ev) return null;
  const count = ev.connectorCount;
  const aggs = ev.connectorAggregation || [];
  let maxKw = 0;
  const labels = [];
  for (const agg of aggs) {
    if (agg.maxChargeRateKw && agg.maxChargeRateKw > maxKw) {
      maxKw = agg.maxChargeRateKw;
    }
    if (agg.type) {
      const clean = agg.type
        .replace('EV_CONNECTOR_TYPE_', '')
        .replace(/_/g, ' ');
      if (!labels.includes(clean)) labels.push(clean);
    }
  }
  const parts = [];
  if (count) parts.push(`${count} ports`);
  if (maxKw > 0) parts.push(`up to ${Math.round(maxKw)} kW`);
  if (labels.length > 0) parts.push(labels.slice(0, 2).join(', '));
  return parts.length > 0 ? parts.join(' · ') : 'EV Charging Station';
}

function formatHoursStatus(place) {
  const hours = place.regularOpeningHours;
  if (!hours) return { text: 'Hours unavailable', tone: 'neutral' };
  if (hours.openNow === true) return { text: 'Open now', tone: 'open' };
  if (hours.openNow === false) return { text: 'Closed now', tone: 'closed' };
  if (Array.isArray(hours.weekdayDescriptions) && hours.weekdayDescriptions.length > 0) {
    return { text: hours.weekdayDescriptions[0], tone: 'neutral' };
  }
  return { text: 'Hours listed', tone: 'neutral' };
}

function createPinElementForProvider(provider, isSelected) {
  const isEv = provider.category === 'ev';
  return new MarkerLib.PinElement({
    background: isSelected ? '#f59e0b' : isEv ? '#059669' : '#1d4ed8',
    borderColor: isSelected ? '#b45309' : isEv ? '#065f46' : '#1e3a8a',
    glyphColor: '#ffffff',
    glyphText: isEv ? 'EV' : 'FIX',
    scale: isSelected ? 1.22 : 1.0,
  });
}

function createInfoWindowContent(provider) {
  const card = document.createElement('div');
  card.className = 'info-card';

  const title = document.createElement('h4');
  title.className = 'info-card-title';
  title.textContent = provider.name;
  card.appendChild(title);

  const addr = document.createElement('p');
  addr.className = 'info-card-sub';
  addr.textContent = provider.address;
  card.appendChild(addr);

  const meta = document.createElement('div');
  meta.className = 'info-card-meta';
  const eta = provider.etaSeconds != null ? formatDurationSeconds(provider.etaSeconds) : 'ETA pending';
  const dist = provider.distanceMeters != null ? formatDistanceMeters(provider.distanceMeters) : '';
  meta.textContent = dist ? `${eta} · ${dist}` : eta;
  card.appendChild(meta);

  return card;
}

function syncFilterButtons() {
  for (const [key, btn] of Object.entries(dom.categoryBtns)) {
    btn.classList.toggle('active', state.category === key);
  }
  for (const [radiusStr, btn] of Object.entries(dom.radiusBtns)) {
    btn.classList.toggle('active', Number(radiusStr) === state.radiusMeters);
  }
}

function clearRouteDisplay() {
  state.activeRoute = null;
  if (routePolyline) {
    routePolyline.setMap(null);
    routePolyline = null;
  }
  dom.routeSummaryPanel.classList.add('hidden');
  dom.turnByTurnSteps.replaceChildren();
}

function renderRouteSummary(provider, routeData) {
  dom.routeSummaryPanel.classList.remove('hidden');

  dom.routeCategoryPill.textContent =
    provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair';
  dom.routeCategoryPill.className = `category-badge ${provider.category}`;
  dom.routeDestName.textContent = provider.name;
  dom.routeDestAddress.textContent = provider.address;

  const durationSec = parseDurationString(routeData.duration);
  dom.routeEtaValue.textContent = formatDurationSeconds(durationSec);
  dom.routeDistanceValue.textContent = formatDistanceMeters(routeData.distanceMeters);

  if (provider.googleMapsUri) {
    dom.routeGmapsLink.href = provider.googleMapsUri;
    dom.routeGmapsLink.classList.remove('hidden');
  } else {
    dom.routeGmapsLink.classList.add('hidden');
  }

  const steps = routeData.legs?.[0]?.steps || [];
  const stepNodes = [];
  for (const step of steps) {
    const li = document.createElement('li');
    li.className = 'step-item';

    const instruction =
      step.navigationInstruction?.instructions || 'Continue along route';
    const textNode = document.createElement('span');
    textNode.textContent = instruction;
    li.appendChild(textNode);

    const stepDist = step.distanceMeters != null ? formatDistanceMeters(step.distanceMeters) : '';
    const stepDur = formatDurationSeconds(parseDurationString(step.staticDuration));
    if (stepDist || stepDur) {
      const meta = document.createElement('span');
      meta.className = 'step-meta';
      meta.textContent = [stepDist, stepDur].filter(Boolean).join(' · ');
      li.appendChild(meta);
    }
    stepNodes.push(li);
  }

  if (stepNodes.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'step-item';
    emptyLi.textContent = 'Proceed directly to the selected destination.';
    stepNodes.push(emptyLi);
  }

  dom.turnByTurnSteps.replaceChildren(...stepNodes);
  dom.turnByTurnSteps.classList.toggle('hidden', !state.stepsExpanded);
  dom.toggleStepsBtn.textContent = state.stepsExpanded ? 'Hide Steps' : 'Show Steps';
}

function renderProviderMarkers() {
  for (const marker of providerMarkers.values()) {
    marker.map = null;
  }
  providerMarkers.clear();

  for (const provider of state.providers) {
    const isSelected = provider.id === state.selectedProviderId;
    const pin = createPinElementForProvider(provider, isSelected);
    const marker = new MarkerLib.AdvancedMarkerElement({
      map,
      position: provider.location,
      title: provider.name,
      content: pin,
      zIndex: isSelected ? 100 : 10,
    });

    // Weekly-channel safe click event on AdvancedMarkerElement
    marker.addListener('click', () => {
      void selectAndRouteProvider(provider.id);
    });

    providerMarkers.set(provider.id, marker);
  }
}

function renderProviderList() {
  const count = state.providers.length;
  dom.resultsCount.textContent = `${count} nearby ${count === 1 ? 'option' : 'options'}`;
  dom.dispatchFastestBtn.disabled = count === 0;

  if (count === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent =
      'No EV charging stations or auto repair providers found in this radius. Try expanding to 15 km or dragging the driver pin.';
    dom.providerList.replaceChildren(empty);
    return;
  }

  const cards = state.providers.map((provider, idx) => {
    const card = document.createElement('article');
    card.id = `provider-card-${idx}`;
    card.className = 'provider-card';
    card.dataset.placeId = provider.id;
    card.setAttribute('role', 'listitem');
    if (provider.id === state.selectedProviderId) {
      card.classList.add('selected');
    }

    const topRow = document.createElement('div');
    topRow.className = 'card-top-row';

    const badges = document.createElement('div');
    badges.className = 'card-badges';

    const rankBadge = document.createElement('span');
    rankBadge.className = 'rank-badge';
    rankBadge.textContent = `#${idx + 1}`;
    badges.appendChild(rankBadge);

    const catBadge = document.createElement('span');
    catBadge.className = `category-badge ${provider.category}`;
    catBadge.textContent =
      provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair';
    badges.appendChild(catBadge);

    const etaPill = document.createElement('span');
    etaPill.className = 'eta-pill';
    etaPill.textContent =
      provider.etaSeconds != null
        ? formatDurationSeconds(provider.etaSeconds)
        : 'ETA N/A';

    topRow.appendChild(badges);
    topRow.appendChild(etaPill);
    card.appendChild(topRow);

    const nameEl = document.createElement('h3');
    nameEl.className = 'provider-name';
    nameEl.textContent = provider.name;
    card.appendChild(nameEl);

    const addrEl = document.createElement('p');
    addrEl.className = 'provider-address';
    addrEl.textContent = provider.address;
    card.appendChild(addrEl);

    const metaRow = document.createElement('div');
    metaRow.className = 'provider-meta-row';

    const ratingEl = document.createElement('span');
    ratingEl.className = 'rating-text';
    if (provider.rating != null) {
      const reviews = provider.userRatingCount
        ? ` (${provider.userRatingCount})`
        : '';
      ratingEl.textContent = `★ ${provider.rating.toFixed(1)}${reviews}`;
    } else {
      ratingEl.textContent = 'No ratings yet';
    }
    metaRow.appendChild(ratingEl);

    const statusChip = document.createElement('span');
    if (provider.category === 'ev' && provider.evSummary) {
      statusChip.className = 'status-chip ev-power';
      statusChip.textContent = provider.evSummary;
    } else {
      const hrs = formatHoursStatus(provider.raw);
      statusChip.className = `status-chip ${hrs.tone}`;
      statusChip.textContent = hrs.text;
    }
    metaRow.appendChild(statusChip);
    card.appendChild(metaRow);

    const footerRow = document.createElement('div');
    footerRow.className = 'card-footer-row';

    const distEl = document.createElement('span');
    distEl.className = 'distance-label';
    distEl.textContent =
      provider.distanceMeters != null
        ? formatDistanceMeters(provider.distanceMeters)
        : 'Calculating distance...';
    footerRow.appendChild(distEl);

    const routeBtn = document.createElement('button');
    routeBtn.type = 'button';
    routeBtn.className = 'btn btn-primary btn-sm';
    routeBtn.textContent =
      provider.id === state.selectedProviderId && state.activeRoute
        ? 'Active Route'
        : 'Route Here';
    routeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      void selectAndRouteProvider(provider.id);
    });
    footerRow.appendChild(routeBtn);

    card.appendChild(footerRow);
    card.addEventListener('click', () => {
      void selectAndRouteProvider(provider.id);
    });

    return card;
  });

  dom.providerList.replaceChildren(...cards);
}

async function reverseGeocodeDriverPos(pos) {
  try {
    const resp = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(pos.lat)}&lng=${encodeURIComponent(pos.lng)}`
    );
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.formattedAddress) {
      dom.driverAddressBadge.textContent = data.formattedAddress;
      dom.driverAddressBadge.title = data.formattedAddress;
    }
  } catch (err) {
    console.warn('Reverse geocode fallback:', err);
  }
}

async function fetchNearbyByType(includedTypes, maxResultCount, signal) {
  const resp = await fetch('/api/places/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      lat: state.driverPos.lat,
      lng: state.driverPos.lng,
      radiusMeters: state.radiusMeters,
      includedTypes,
      maxResultCount,
      rankPreference: 'DISTANCE',
    }),
  });
  if (!resp.ok) {
    const errPayload = await resp.json().catch(() => ({}));
    throw new Error(errPayload.detail || `Nearby search failed (${resp.status})`);
  }
  const data = await resp.json();
  return data.places || [];
}

async function fetchTextFallback(query, includedType, signal) {
  const resp = await fetch('/api/places/search-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      textQuery: query,
      lat: state.driverPos.lat,
      lng: state.driverPos.lng,
      radiusMeters: state.radiusMeters,
      includedType,
      pageSize: 10,
      rankPreference: 'DISTANCE',
    }),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.places || [];
}

async function fetchRouteMatrix(providers, signal) {
  if (providers.length === 0) return new Map();
  const resp = await fetch('/api/routes/matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      origin: state.driverPos,
      destinations: providers.map((p) => p.location),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });
  if (!resp.ok) {
    throw new Error(`Route Matrix failed (${resp.status})`);
  }
  const data = await resp.json();
  const matrixMap = new Map();
  for (const el of data.elements || []) {
    if (typeof el.destinationIndex === 'number') {
      matrixMap.set(el.destinationIndex, el);
    }
  }
  return matrixMap;
}

async function refreshProviders() {
  const seq = ++state.searchRequestSeq;
  if (state.searchAbortController) {
    state.searchAbortController.abort();
  }
  const controller = new AbortController();
  state.searchAbortController = controller;

  dom.resultsCount.textContent = 'Searching nearby options...';
  dom.dispatchFastestBtn.disabled = true;
  showStatus('');

  try {
    let rawPlaces = [];
    if (state.category === 'all') {
      const [evPlaces, repairPlaces] = await Promise.all([
        fetchNearbyByType(['electric_vehicle_charging_station'], 10, controller.signal),
        fetchNearbyByType(['car_repair'], 10, controller.signal),
      ]);
      rawPlaces = [...evPlaces, ...repairPlaces];
    } else if (state.category === 'ev') {
      rawPlaces = await fetchNearbyByType(
        ['electric_vehicle_charging_station'],
        20,
        controller.signal
      );
    } else {
      rawPlaces = await fetchNearbyByType(['car_repair'], 20, controller.signal);
    }

    if (rawPlaces.length === 0) {
      const fallbackQuery =
        state.category === 'ev'
          ? 'EV fast charging station Seattle'
          : state.category === 'repair'
            ? 'auto repair mechanic Seattle'
            : 'EV charging station and auto repair Seattle';
      rawPlaces = await fetchTextFallback(fallbackQuery, null, controller.signal);
    }

    if (seq !== state.searchRequestSeq) return;

    const deduped = new Map();
    for (const place of rawPlaces) {
      if (!place.id || !place.location) continue;
      if (deduped.has(place.id)) continue;
      const loc = {
        lat: place.location.latitude,
        lng: place.location.longitude,
      };
      const category = classifyProvider(place);
      if (state.category === 'ev' && category !== 'ev') continue;
      if (state.category === 'repair' && category !== 'repair') continue;

      deduped.set(place.id, {
        id: place.id,
        name: place.displayName?.text || 'Local Service Provider',
        address: place.formattedAddress || 'Seattle, WA',
        location: loc,
        category,
        rating: typeof place.rating === 'number' ? place.rating : null,
        userRatingCount:
          typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        evSummary: formatConnectorSummary(place),
        phone: place.nationalPhoneNumber || null,
        googleMapsUri: place.googleMapsUri || null,
        raw: place,
        straightMeters: haversineMeters(state.driverPos, loc),
        etaSeconds: null,
        distanceMeters: null,
      });
    }

    const providers = Array.from(deduped.values()).slice(0, 20);
    if (providers.length > 0) {
      try {
        const matrixMap = await fetchRouteMatrix(providers, controller.signal);
        if (seq !== state.searchRequestSeq) return;
        providers.forEach((provider, idx) => {
          const entry = matrixMap.get(idx);
          if (entry && entry.condition === 'ROUTE_EXISTS') {
            provider.etaSeconds = parseDurationString(entry.duration);
            provider.distanceMeters =
              typeof entry.distanceMeters === 'number'
                ? entry.distanceMeters
                : provider.straightMeters;
          } else {
            provider.distanceMeters = Math.round(provider.straightMeters);
          }
        });
      } catch (matrixErr) {
        if (matrixErr.name === 'AbortError') return;
        console.warn('Route Matrix unavailable, falling back to distance:', matrixErr);
        providers.forEach((provider) => {
          provider.distanceMeters = Math.round(provider.straightMeters);
        });
      }
    }

    providers.sort((a, b) => {
      const aEta = a.etaSeconds ?? Number.POSITIVE_INFINITY;
      const bEta = b.etaSeconds ?? Number.POSITIVE_INFINITY;
      if (aEta !== bEta) return aEta - bEta;
      return (a.distanceMeters ?? a.straightMeters) - (b.distanceMeters ?? b.straightMeters);
    });

    state.providers = providers;
    renderProviderList();
    renderProviderMarkers();
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Failed to discover providers:', err);
    showStatus(err.message || 'Unable to load nearby providers.', true);
    state.providers = [];
    renderProviderList();
    renderProviderMarkers();
  }
}

async function selectAndRouteProvider(providerId) {
  const provider = state.providers.find((p) => p.id === providerId);
  if (!provider) return;

  state.selectedProviderId = provider.id;
  renderProviderList();
  renderProviderMarkers();

  const targetMarker = providerMarkers.get(provider.id);
  if (targetMarker && infoWindow) {
    infoWindow.setContent(createInfoWindowContent(provider));
    infoWindow.open({ anchor: targetMarker, map });
  }

  try {
    const resp = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: state.driverPos,
        destination: provider.location,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });
    if (!resp.ok) {
      const errPayload = await resp.json().catch(() => ({}));
      throw new Error(errPayload.detail || `Route calculation failed (${resp.status})`);
    }

    const data = await resp.json();
    const route = data.routes?.[0];
    if (!route) {
      throw new Error('No drivable dispatch route was returned.');
    }

    state.activeRoute = route;
    const encoded = route.polyline?.encodedPolyline;
    if (routePolyline) {
      routePolyline.setMap(null);
      routePolyline = null;
    }

    if (encoded && GeometryLib?.encoding?.decodePath) {
      const decodedPath = GeometryLib.encoding.decodePath(encoded);
      routePolyline = new MapsLib.Polyline({
        map,
        path: decodedPath,
        strokeColor: '#2563eb',
        strokeOpacity: 0.92,
        strokeWeight: 5,
      });

      const bounds = new CoreLib.LatLngBounds();
      bounds.extend(state.driverPos);
      bounds.extend(provider.location);
      for (const pt of decodedPath) {
        bounds.extend(pt);
      }
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }

    renderRouteSummary(provider, route);

    const cardIdx = state.providers.findIndex((p) => p.id === provider.id);
    if (cardIdx >= 0) {
      document
        .getElementById(`provider-card-${cardIdx}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (err) {
    console.error('Failed to compute dispatch route:', err);
    showStatus(err.message || 'Unable to compute dispatch route.', true);
  }
}

async function relocateDriver(newPos, customAddressLabel = null) {
  state.driverPos = { lat: newPos.lat, lng: newPos.lng };
  state.selectedProviderId = null;
  clearRouteDisplay();
  if (infoWindow) infoWindow.close();

  if (driverMarker) {
    driverMarker.position = state.driverPos;
  }
  if (searchCircle) {
    searchCircle.setCenter(state.driverPos);
    searchCircle.setRadius(state.radiusMeters);
  }
  map?.panTo(state.driverPos);

  if (customAddressLabel) {
    dom.driverAddressBadge.textContent = customAddressLabel;
    dom.driverAddressBadge.title = customAddressLabel;
  } else {
    dom.driverAddressBadge.textContent = `${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`;
    void reverseGeocodeDriverPos(state.driverPos);
  }

  await refreshProviders();
}

function wireUiEvents() {
  dom.useMapCenterBtn.addEventListener('click', () => {
    if (!map) return;
    const center = map.getCenter();
    if (center) {
      void relocateDriver({ lat: center.lat(), lng: center.lng() });
    }
  });

  for (const [categoryKey, btn] of Object.entries(dom.categoryBtns)) {
    btn.addEventListener('click', () => {
      if (state.category === categoryKey) return;
      state.category = categoryKey;
      state.selectedProviderId = null;
      clearRouteDisplay();
      syncFilterButtons();
      void refreshProviders();
    });
  }

  for (const [radiusStr, btn] of Object.entries(dom.radiusBtns)) {
    btn.addEventListener('click', () => {
      const nextRadius = Number(radiusStr);
      if (state.radiusMeters === nextRadius) return;
      state.radiusMeters = nextRadius;
      if (searchCircle) {
        searchCircle.setRadius(nextRadius);
        const circleBounds = searchCircle.getBounds();
        if (circleBounds && map) {
          map.fitBounds(circleBounds, { top: 24, right: 24, bottom: 24, left: 24 });
        }
      }
      syncFilterButtons();
      void refreshProviders();
    });
  }

  dom.dispatchFastestBtn.addEventListener('click', () => {
    if (state.providers.length > 0) {
      void selectAndRouteProvider(state.providers[0].id);
    }
  });

  dom.clearRouteBtn.addEventListener('click', () => {
    state.selectedProviderId = null;
    clearRouteDisplay();
    if (infoWindow) infoWindow.close();
    renderProviderList();
    renderProviderMarkers();
  });

  dom.toggleStepsBtn.addEventListener('click', () => {
    state.stepsExpanded = !state.stepsExpanded;
    dom.turnByTurnSteps.classList.toggle('hidden', !state.stepsExpanded);
    dom.toggleStepsBtn.textContent = state.stepsExpanded ? 'Hide Steps' : 'Show Steps';
  });
}

function setupAutocompleteWidget() {
  const autocomplete = new PlacesLib.PlaceAutocompleteElement({
    locationBias: {
      center: state.driverPos,
      radius: 50000,
    },
    includedRegionCodes: ['us'],
  });
  autocomplete.id = 'place-autocomplete-input';
  dom.autocompleteContainer.replaceChildren(autocomplete);

  autocomplete.addEventListener('gmp-select', async (event) => {
    const prediction = event.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'formattedAddress', 'displayName', 'viewport'],
      });
      const loc = toLatLngLiteral(place.location);
      if (!loc) return;
      const label = place.formattedAddress || place.displayName || null;
      await relocateDriver(loc, label);
      if (place.viewport && map) {
        map.fitBounds(place.viewport);
        if (map.getZoom() > 14) map.setZoom(13);
      }
    } catch (err) {
      console.error('Autocomplete selection error:', err);
      showStatus('Could not resolve the selected address.', true);
    }
  });
}

async function init() {
  wireUiEvents();
  syncFilterButtons();

  try {
    const configResp = await fetch('/api/config');
    if (!configResp.ok) {
      throw new Error(`Configuration error (${configResp.status})`);
    }
    state.config = await configResp.json();
    state.driverPos = { ...state.config.defaultCenter };
    state.radiusMeters = state.config.defaultRadiusMeters || 10000;
    syncFilterButtons();

    if (!state.config.apiKey) {
      showStatus(
        'Missing GOOGLE_MAPS_API_KEY in .env. Copy .env.example to .env and add your Maps Demo Key or Cloud API key to activate the interactive map.',
        false
      );
      dom.resultsCount.textContent = 'API key required';
      return;
    }

    loadGoogleMapsBootstrap(state.config.apiKey, state.config.attributionId);

    const [mapsLib, markerLib, placesLib, coreLib, geometryLib] =
      await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('core'),
        google.maps.importLibrary('geometry'),
        google.maps.importLibrary('routes'),
        google.maps.importLibrary('geocoding'),
      ]);

    MapsLib = mapsLib;
    MarkerLib = markerLib;
    PlacesLib = placesLib;
    CoreLib = coreLib;
    GeometryLib = geometryLib;

    map = new MapsLib.Map(dom.mapContainer, {
      center: state.driverPos,
      zoom: state.config.defaultZoom || 12,
      mapId: state.config.mapId || 'DEMO_MAP_ID',
      internalUsageAttributionIds: [
        state.config.attributionId || 'gmp_git_agentsamples_v1.0.0',
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindow = new MapsLib.InfoWindow();

    const driverPin = new MarkerLib.PinElement({
      background: '#dc2626',
      borderColor: '#7f1d1d',
      glyphColor: '#ffffff',
      glyphText: 'SOS',
      scale: 1.15,
    });

    driverMarker = new MarkerLib.AdvancedMarkerElement({
      map,
      position: state.driverPos,
      gmpDraggable: true,
      title: 'Driver breakdown location (drag to move)',
      content: driverPin,
      zIndex: 200,
    });

    driverMarker.addListener('dragend', () => {
      const nextPos = toLatLngLiteral(driverMarker.position);
      if (nextPos) {
        void relocateDriver(nextPos);
      }
    });

    map.addListener('click', (event) => {
      if (event.latLng) {
        void relocateDriver({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      }
    });

    searchCircle = new MapsLib.Circle({
      map,
      center: state.driverPos,
      radius: state.radiusMeters,
      strokeColor: '#2563eb',
      strokeOpacity: 0.75,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      clickable: false,
    });

    setupAutocompleteWidget();

    await Promise.all([
      reverseGeocodeDriverPos(state.driverPos),
      refreshProviders(),
    ]);
  } catch (err) {
    console.error('Initialization failed:', err);
    showStatus(err.message || 'Failed to initialize Google Maps dispatch view.', true);
    dom.resultsCount.textContent = 'Initialization error';
  }
}

void init();
