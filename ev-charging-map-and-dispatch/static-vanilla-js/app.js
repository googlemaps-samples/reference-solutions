import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const SEATTLE_CENTER = { lat: 47.6062, lng: -122.3321 };
const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const state = {
  driverLocation: { ...SEATTLE_CENTER },
  driverAddress: 'Downtown Seattle, WA (47.6062, -122.3321)',
  radiusKm: 10,
  category: 'all', // 'all' | 'ev' | 'repair'
  providers: [],
  selectedPlaceId: null,
  stepsExpanded: true,
  searchSequence: 0,
};

const elements = {
  autocompleteContainer: document.getElementById('autocomplete-container'),
  useMapCenterBtn: document.getElementById('use-map-center-btn'),
  categoryFilterAll: document.getElementById('category-filter-all'),
  categoryFilterEv: document.getElementById('category-filter-ev'),
  categoryFilterRepair: document.getElementById('category-filter-repair'),
  radius5km: document.getElementById('radius-5km'),
  radius10km: document.getElementById('radius-10km'),
  radius15km: document.getElementById('radius-15km'),
  driverAddressBadge: document.getElementById('driver-address-badge'),
  statusBanner: document.getElementById('status-banner'),
  routeSummaryPanel: document.getElementById('route-summary-panel'),
  routeDestName: document.getElementById('route-dest-name'),
  routeEtaValue: document.getElementById('route-eta-value'),
  routeDistanceValue: document.getElementById('route-distance-value'),
  routeMapsLink: document.getElementById('route-maps-link'),
  toggleStepsBtn: document.getElementById('toggle-steps-btn'),
  clearRouteBtn: document.getElementById('clear-route-btn'),
  turnByTurnSteps: document.getElementById('turn-by-turn-steps'),
  resultsSummary: document.getElementById('results-summary'),
  dispatchRouteBtn: document.getElementById('dispatch-route-btn'),
  providerList: document.getElementById('provider-list'),
  mapContainer: document.getElementById('map-container'),
};

const gmp = {
  map: null,
  driverMarker: null,
  searchCircle: null,
  infoWindow: null,
  geocoder: null,
  providerMarkers: new Map(),
  routePolylines: [],
  libs: null,
};

function toLatLngLiteral(pos) {
  if (!pos) return null;
  const lat = typeof pos.lat === 'function' ? pos.lat() : Number(pos.lat);
  const lng = typeof pos.lng === 'function' ? pos.lng() : Number(pos.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function formatCoords(loc) {
  return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '1 min';
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

function formatDistanceMeters(meters) {
  if (!Number.isFinite(meters) || meters < 0) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function showBanner(message, tone = 'info') {
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = 'status-banner';
  if (tone === 'error') {
    elements.statusBanner.classList.add('is-error');
  } else if (tone === 'warn') {
    elements.statusBanner.classList.add('is-warn');
  }
  elements.statusBanner.hidden = false;
}

function hideBanner() {
  elements.statusBanner.hidden = true;
  elements.statusBanner.textContent = '';
}

function computeOpenStatus(regularOpeningHours) {
  if (!regularOpeningHours) {
    return { label: 'Hours unavailable', tone: 'neutral' };
  }

  const periods = regularOpeningHours.periods;
  if (Array.isArray(periods) && periods.length > 0) {
    if (
      periods.length === 1 &&
      periods[0].open &&
      periods[0].open.day === 0 &&
      periods[0].open.hour === 0 &&
      periods[0].open.minute === 0 &&
      !periods[0].close
    ) {
      return { label: 'Open 24/7', tone: 'open' };
    }

    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date());

    const partVal = (type) => parts.find((p) => p.type === type)?.value;
    const day = weekdayMap[partVal('weekday')] ?? new Date().getDay();
    const hour = Number(partVal('hour')) % 24;
    const minute = Number(partVal('minute')) || 0;
    const nowMin = day * 1440 + hour * 60 + minute;
    const weekMin = 7 * 1440;

    for (const period of periods) {
      if (!period.open) continue;
      const openMin =
        period.open.day * 1440 + (period.open.hour || 0) * 60 + (period.open.minute || 0);
      if (!period.close) {
        return { label: 'Open now', tone: 'open' };
      }
      const closeMin =
        period.close.day * 1440 + (period.close.hour || 0) * 60 + (period.close.minute || 0);

      if (closeMin >= openMin) {
        if (nowMin >= openMin && nowMin < closeMin) {
          return { label: 'Open now', tone: 'open' };
        }
      } else {
        const adjustedNow = nowMin < openMin ? nowMin + weekMin : nowMin;
        if (adjustedNow >= openMin && adjustedNow < closeMin + weekMin) {
          return { label: 'Open now', tone: 'open' };
        }
      }
    }

    return { label: 'Closed now', tone: 'closed' };
  }

  const descriptions = regularOpeningHours.weekdayDescriptions;
  if (Array.isArray(descriptions) && descriptions.length > 0) {
    const has24 = descriptions.some((d) => /24 hours/i.test(d));
    if (has24) {
      return { label: 'Open 24/7', tone: 'open' };
    }
    return { label: 'Hours available', tone: 'neutral' };
  }

  return { label: 'Hours unavailable', tone: 'neutral' };
}

function summarizeEvChargeOptions(evChargeOptions) {
  if (!evChargeOptions) return null;
  const aggregations = Array.isArray(evChargeOptions.connectorAggregations)
    ? evChargeOptions.connectorAggregations
    : [];

  let totalConnectors = Number(evChargeOptions.connectorCount) || 0;
  let totalAvailable = 0;
  let hasLiveAvailability = false;
  let maxKw = 0;
  const connectorTypes = new Set();

  for (const agg of aggregations) {
    if (Number.isFinite(agg.maxChargeRateKw) && agg.maxChargeRateKw > maxKw) {
      maxKw = agg.maxChargeRateKw;
    }
    if (Number.isFinite(agg.availableCount)) {
      hasLiveAvailability = true;
      totalAvailable += agg.availableCount;
    }
    if (!evChargeOptions.connectorCount && Number.isFinite(agg.count)) {
      totalConnectors += agg.count;
    }
    if (agg.type) {
      connectorTypes.add(String(agg.type).replace(/_/g, ' '));
    }
  }

  const parts = [];
  if (hasLiveAvailability && totalConnectors > 0) {
    parts.push(`${totalAvailable}/${totalConnectors} available`);
  } else if (totalConnectors > 0) {
    parts.push(`${totalConnectors} connectors`);
  }
  if (maxKw > 0) {
    parts.push(`up to ${Math.round(maxKw)} kW`);
  }

  const summary = parts.length > 0 ? parts.join(' • ') : 'EV Charging Station';
  return {
    summary,
    typesLabel: connectorTypes.size > 0 ? Array.from(connectorTypes).slice(0, 2).join(', ') : '',
    hasLiveAvailability,
    totalAvailable,
  };
}

function classifyProvider(place) {
  const types = new Set(place.types || []);
  if (
    place.primaryType === 'electric_vehicle_charging_station' ||
    types.has('electric_vehicle_charging_station') ||
    Boolean(place.evChargeOptions)
  ) {
    return 'ev';
  }
  return 'repair';
}

function updateFilterButtons() {
  const mapCategoryToBtn = {
    all: elements.categoryFilterAll,
    ev: elements.categoryFilterEv,
    repair: elements.categoryFilterRepair,
  };
  for (const [key, btn] of Object.entries(mapCategoryToBtn)) {
    btn.classList.toggle('is-active', state.category === key);
  }
}

function updateRadiusButtons() {
  const mapRadiusToBtn = {
    5: elements.radius5km,
    10: elements.radius10km,
    15: elements.radius15km,
  };
  for (const [km, btn] of Object.entries(mapRadiusToBtn)) {
    btn.classList.toggle('is-active', state.radiusKm === Number(km));
  }
}

function clearRoutePolylines() {
  for (const polyline of gmp.routePolylines) {
    polyline.setMap(null);
  }
  gmp.routePolylines = [];
}

function clearRouteDisplay() {
  clearRoutePolylines();
  state.selectedPlaceId = null;
  elements.routeSummaryPanel.hidden = true;
  elements.turnByTurnSteps.replaceChildren();
  updateProviderSelectionStyles();
}

function updateProviderSelectionStyles() {
  const cards = elements.providerList.querySelectorAll('.provider-card');
  for (const card of cards) {
    const isSelected = card.dataset.placeId === state.selectedPlaceId;
    card.classList.toggle('is-selected', isSelected);
  }
}

function clearProviderMarkers() {
  for (const marker of gmp.providerMarkers.values()) {
    marker.map = null;
  }
  gmp.providerMarkers.clear();
}

function openProviderInfoWindow(provider, marker) {
  if (!gmp.infoWindow || !gmp.map) return;

  const container = document.createElement('div');
  container.style.maxWidth = '240px';
  container.style.fontFamily = 'inherit';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';
  title.style.marginBottom = '4px';
  title.textContent = provider.displayName;
  container.appendChild(title);

  const addr = document.createElement('div');
  addr.style.fontSize = '12px';
  addr.style.color = '#475569';
  addr.style.marginBottom = '6px';
  addr.textContent = provider.formattedAddress || 'Seattle, WA';
  container.appendChild(addr);

  const meta = document.createElement('div');
  meta.style.fontSize = '12px';
  meta.style.fontWeight = '600';
  meta.style.color = '#2563eb';
  meta.style.marginBottom = '8px';
  meta.textContent = `${provider.etaText} • ${provider.distanceText}`;
  container.appendChild(meta);

  if (provider.evSummary) {
    const evLine = document.createElement('div');
    evLine.style.fontSize = '11px';
    evLine.style.color = '#0f766e';
    evLine.style.marginBottom = '8px';
    evLine.textContent = provider.evSummary.summary;
    container.appendChild(evLine);
  }

  const routeBtn = document.createElement('button');
  routeBtn.type = 'button';
  routeBtn.textContent = 'Route Here';
  routeBtn.style.background = '#2563eb';
  routeBtn.style.color = '#ffffff';
  routeBtn.style.border = 'none';
  routeBtn.style.borderRadius = '6px';
  routeBtn.style.padding = '6px 10px';
  routeBtn.style.fontSize = '12px';
  routeBtn.style.fontWeight = '600';
  routeBtn.style.cursor = 'pointer';
  routeBtn.addEventListener('click', () => {
    void selectAndRouteProvider(provider);
  });
  container.appendChild(routeBtn);

  gmp.infoWindow.setContent(container);
  gmp.infoWindow.open({ anchor: marker, map: gmp.map });
}

function renderProviderMarkers(providers) {
  clearProviderMarkers();
  if (!gmp.map || !gmp.libs) return;
  const { AdvancedMarkerElement, PinElement } = gmp.libs.marker;

  for (const provider of providers) {
    const isEv = provider.category === 'ev';
    const pin = new PinElement({
      background: isEv ? '#0f766e' : '#1d4ed8',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: isEv ? 'EV' : 'AR',
      scale: 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: gmp.map,
      position: provider.location,
      title: provider.displayName,
    });
    marker.append(pin);

    marker.addListener('click', () => {
      openProviderInfoWindow(provider, marker);
      void selectAndRouteProvider(provider);
    });

    gmp.providerMarkers.set(provider.id, marker);
  }
}

function renderProviderList(providers) {
  elements.providerList.replaceChildren();

  const evCount = providers.filter((p) => p.category === 'ev').length;
  const repairCount = providers.filter((p) => p.category === 'repair').length;
  elements.resultsSummary.textContent =
    providers.length === 0
      ? `0 options within ${state.radiusKm} km`
      : `${providers.length} options within ${state.radiusKm} km (${evCount} EV, ${repairCount} Repair)`;

  elements.dispatchRouteBtn.disabled = providers.length === 0;
  if (providers.length > 0) {
    elements.dispatchRouteBtn.textContent = state.selectedPlaceId
      ? 'Re-Route Selected'
      : 'Route to Nearest';
  }

  if (providers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent =
      'No EV charging stations or auto repair providers found in this radius. Try expanding to 15 km or moving the breakdown pin.';
    elements.providerList.appendChild(empty);
    return;
  }

  providers.forEach((provider, index) => {
    const card = document.createElement('article');
    card.id = `provider-card-${index}`;
    card.className = 'provider-card';
    card.dataset.placeId = provider.id;
    card.setAttribute('role', 'listitem');
    if (provider.id === state.selectedPlaceId) {
      card.classList.add('is-selected');
    }

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = provider.displayName;
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = `category-badge ${provider.category === 'ev' ? 'is-ev' : 'is-repair'}`;
    badge.textContent = provider.category === 'ev' ? 'EV Charging' : 'Auto Repair';
    header.appendChild(badge);
    card.appendChild(header);

    const address = document.createElement('p');
    address.className = 'card-address';
    address.textContent = provider.formattedAddress || 'Seattle, WA';
    card.appendChild(address);

    const metaRow = document.createElement('div');
    metaRow.className = 'card-meta-row';

    if (Number.isFinite(provider.rating)) {
      const ratingPill = document.createElement('span');
      ratingPill.className = 'meta-pill';
      const countLabel = Number.isFinite(provider.userRatingCount)
        ? ` (${provider.userRatingCount})`
        : '';
      ratingPill.textContent = `★ ${provider.rating.toFixed(1)}${countLabel}`;
      metaRow.appendChild(ratingPill);
    }

    const openPill = document.createElement('span');
    openPill.className = 'meta-pill';
    if (provider.openStatus.tone === 'open') {
      openPill.classList.add('is-open');
    } else if (provider.openStatus.tone === 'closed') {
      openPill.classList.add('is-closed');
    }
    openPill.textContent = provider.openStatus.label;
    metaRow.appendChild(openPill);

    if (provider.evSummary) {
      const evPill = document.createElement('span');
      evPill.className = 'meta-pill is-ev-power';
      evPill.textContent = provider.evSummary.summary;
      metaRow.appendChild(evPill);
    } else if (provider.nationalPhoneNumber) {
      const phonePill = document.createElement('span');
      phonePill.className = 'meta-pill';
      phonePill.textContent = provider.nationalPhoneNumber;
      metaRow.appendChild(phonePill);
    }

    card.appendChild(metaRow);

    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const etaBlock = document.createElement('div');
    etaBlock.className = 'eta-block';

    const etaPrimary = document.createElement('span');
    etaPrimary.className = 'eta-primary';
    etaPrimary.textContent = `${provider.etaText} drive`;
    etaBlock.appendChild(etaPrimary);

    const etaSecondary = document.createElement('span');
    etaSecondary.className = 'eta-secondary';
    etaSecondary.textContent = `${provider.distanceText} away`;
    etaBlock.appendChild(etaSecondary);

    footer.appendChild(etaBlock);

    const routeBtn = document.createElement('button');
    routeBtn.type = 'button';
    routeBtn.className = 'primary-btn small-btn card-route-btn';
    routeBtn.textContent = 'Route Here';
    routeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      void selectAndRouteProvider(provider);
    });
    footer.appendChild(routeBtn);

    card.appendChild(footer);

    card.addEventListener('click', () => {
      const marker = gmp.providerMarkers.get(provider.id);
      if (marker) {
        openProviderInfoWindow(provider, marker);
      }
      void selectAndRouteProvider(provider);
    });

    elements.providerList.appendChild(card);
  });
}

async function reverseGeocodeLocation(loc) {
  if (!gmp.geocoder) {
    state.driverAddress = `Seattle (${formatCoords(loc)})`;
    elements.driverAddressBadge.textContent = state.driverAddress;
    return;
  }

  try {
    const { results } = await gmp.geocoder.geocode({ location: loc });
    if (results && results[0]?.formatted_address) {
      state.driverAddress = results[0].formatted_address;
    } else {
      state.driverAddress = `Near ${formatCoords(loc)}`;
    }
  } catch {
    state.driverAddress = `Near ${formatCoords(loc)}`;
  }

  elements.driverAddressBadge.textContent = state.driverAddress;
}

async function discoverNearbyPlaces(loc, radiusMeters, category) {
  const { Place, SearchNearbyRankPreference } = gmp.libs.places;
  const fields = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'rating',
    'userRatingCount',
    'primaryType',
    'types',
    'regularOpeningHours',
    'evChargeOptions',
    'nationalPhoneNumber',
    'googleMapsURI',
  ];

  const typesToQuery =
    category === 'ev'
      ? ['electric_vehicle_charging_station']
      : category === 'repair'
        ? ['car_repair']
        : ['electric_vehicle_charging_station', 'car_repair'];

  const responses = await Promise.all(
    typesToQuery.map((primaryType) =>
      Place.searchNearby({
        fields,
        locationRestriction: {
          center: loc,
          radius: radiusMeters,
        },
        includedPrimaryTypes: [primaryType],
        maxResultCount: 10,
        rankPreference: SearchNearbyRankPreference.DISTANCE,
        language: 'en-US',
        region: 'us',
        internalUsageAttributionIds: [ATTRIBUTION_ID],
      })
    )
  );

  const byId = new Map();
  for (const res of responses) {
    for (const place of res.places || []) {
      const coords = toLatLngLiteral(place.location);
      if (!place.id || !coords) continue;
      if (byId.has(place.id)) continue;

      const resolvedCategory = classifyProvider(place);
      if (category !== 'all' && resolvedCategory !== category) continue;

      byId.set(place.id, {
        id: place.id,
        displayName: place.displayName || 'Roadside Service Provider',
        formattedAddress: place.formattedAddress || '',
        location: coords,
        rating: typeof place.rating === 'number' ? place.rating : null,
        userRatingCount:
          typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        category: resolvedCategory,
        openStatus: computeOpenStatus(place.regularOpeningHours),
        evSummary:
          resolvedCategory === 'ev'
            ? summarizeEvChargeOptions(place.evChargeOptions)
            : null,
        nationalPhoneNumber: place.nationalPhoneNumber || null,
        googleMapsURI: place.googleMapsURI || null,
        distanceMeters: haversineMeters(loc, coords),
        durationMillis: Number.POSITIVE_INFINITY,
        distanceText: '--',
        etaText: '--',
      });
    }
  }

  return Array.from(byId.values());
}

async function rankByDrivingEta(origin, candidates) {
  if (candidates.length === 0) return [];
  const { RouteMatrix } = gmp.libs.routes;

  const destinations = candidates.slice(0, 25);
  try {
    const { matrix } = await RouteMatrix.computeRouteMatrix({
      origins: [origin],
      destinations: destinations.map((c) => c.location),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    const items = matrix?.rows?.[0]?.items || [];
    destinations.forEach((candidate, idx) => {
      const item = items[idx];
      if (item && item.condition === 'ROUTE_EXISTS' && Number.isFinite(item.durationMillis)) {
        candidate.durationMillis = item.durationMillis;
        candidate.distanceMeters = Number.isFinite(item.distanceMeters)
          ? item.distanceMeters
          : candidate.distanceMeters;
        candidate.etaText =
          item.localizedValues?.duration || formatDurationMs(item.durationMillis);
        candidate.distanceText =
          item.localizedValues?.distance || formatDistanceMeters(candidate.distanceMeters);
      } else {
        const approxMs = (candidate.distanceMeters / 450) * 60000;
        candidate.durationMillis = approxMs;
        candidate.etaText = `~${formatDurationMs(approxMs)}`;
        candidate.distanceText = formatDistanceMeters(candidate.distanceMeters);
      }
    });
  } catch {
    for (const candidate of destinations) {
      const approxMs = (candidate.distanceMeters / 450) * 60000;
      candidate.durationMillis = approxMs;
      candidate.etaText = `~${formatDurationMs(approxMs)}`;
      candidate.distanceText = formatDistanceMeters(candidate.distanceMeters);
    }
  }

  return destinations.sort((a, b) => a.durationMillis - b.durationMillis);
}

async function refreshNearbyProviders() {
  if (!gmp.libs) return;

  const seq = ++state.searchSequence;
  elements.resultsSummary.textContent = 'Scanning nearby stations & mechanics...';
  hideBanner();

  try {
    const radiusMeters = state.radiusKm * 1000;
    const candidates = await discoverNearbyPlaces(
      state.driverLocation,
      radiusMeters,
      state.category
    );
    if (seq !== state.searchSequence) return;

    const ranked = await rankByDrivingEta(state.driverLocation, candidates);
    if (seq !== state.searchSequence) return;

    state.providers = ranked;
    renderProviderList(ranked);
    renderProviderMarkers(ranked);

    if (state.selectedPlaceId) {
      const matching = ranked.find((p) => p.id === state.selectedPlaceId);
      if (matching) {
        await selectAndRouteProvider(matching, { fitBounds: false });
      } else {
        clearRouteDisplay();
      }
    }
  } catch (error) {
    if (seq !== state.searchSequence) return;
    const msg = error instanceof Error ? error.message : String(error);
    showBanner(
      `Unable to load nearby places right now (${msg}). Check that Places API (New) and Routes API are enabled for your key.`,
      'error'
    );
    state.providers = [];
    renderProviderList([]);
    clearProviderMarkers();
  }
}

async function selectAndRouteProvider(provider, options = { fitBounds: true }) {
  if (!gmp.map || !gmp.libs) return;
  const { Route } = gmp.libs.routes;
  const { LatLngBounds } = gmp.libs.core;

  state.selectedPlaceId = provider.id;
  updateProviderSelectionStyles();
  elements.dispatchRouteBtn.textContent = 'Re-Route Selected';

  clearRoutePolylines();
  elements.routeSummaryPanel.hidden = false;
  elements.routeDestName.textContent = provider.displayName;
  elements.routeEtaValue.textContent = provider.etaText;
  elements.routeDistanceValue.textContent = provider.distanceText;

  if (provider.googleMapsURI) {
    elements.routeMapsLink.href = provider.googleMapsURI;
    elements.routeMapsLink.hidden = false;
  } else {
    elements.routeMapsLink.hidden = true;
  }

  elements.turnByTurnSteps.replaceChildren();
  const loadingStep = document.createElement('li');
  loadingStep.textContent = 'Calculating dispatch route...';
  elements.turnByTurnSteps.appendChild(loadingStep);

  try {
    const { routes } = await Route.computeRoutes({
      origin: state.driverLocation,
      destination: provider.location,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues', 'legs', 'viewport'],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    if (!routes || routes.length === 0) {
      elements.turnByTurnSteps.replaceChildren();
      const noRoute = document.createElement('li');
      noRoute.textContent = 'No driving route could be found to this destination.';
      elements.turnByTurnSteps.appendChild(noRoute);
      return;
    }

    const route = routes[0];
    const polylines = route.createPolylines();
    for (const polyline of polylines) {
      polyline.setOptions({
        strokeColor: '#2563eb',
        strokeOpacity: 0.92,
        strokeWeight: 6,
      });
      polyline.setMap(gmp.map);
      gmp.routePolylines.push(polyline);
    }

    const routeEta =
      route.localizedValues?.duration || formatDurationMs(route.durationMillis);
    const routeDist =
      route.localizedValues?.distance || formatDistanceMeters(route.distanceMeters);
    elements.routeEtaValue.textContent = routeEta;
    elements.routeDistanceValue.textContent = routeDist;

    const steps = route.legs?.[0]?.steps || [];
    elements.turnByTurnSteps.replaceChildren();
    if (steps.length === 0) {
      const fallbackItem = document.createElement('li');
      fallbackItem.textContent = `Drive ${routeDist} to ${provider.displayName}.`;
      elements.turnByTurnSteps.appendChild(fallbackItem);
    } else {
      for (const step of steps) {
        const li = document.createElement('li');
        const instruction = document.createElement('span');
        instruction.textContent = step.instructions || 'Continue on route';
        li.appendChild(instruction);

        const stepDist =
          step.localizedValues?.distance || formatDistanceMeters(step.distanceMeters);
        const stepDur = step.localizedValues?.staticDuration || '';
        const meta = document.createElement('span');
        meta.className = 'step-meta';
        meta.textContent = stepDur ? `${stepDist} • ${stepDur}` : stepDist;
        li.appendChild(meta);

        elements.turnByTurnSteps.appendChild(li);
      }
    }

    elements.turnByTurnSteps.hidden = !state.stepsExpanded;

    if (options.fitBounds) {
      if (route.viewport) {
        gmp.map.fitBounds(route.viewport, 60);
      } else if (Array.isArray(route.path) && route.path.length > 0) {
        const bounds = new LatLngBounds();
        for (const pt of route.path) {
          bounds.extend(pt);
        }
        gmp.map.fitBounds(bounds, 60);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    elements.turnByTurnSteps.replaceChildren();
    const errItem = document.createElement('li');
    errItem.textContent = `Could not compute route: ${msg}`;
    elements.turnByTurnSteps.appendChild(errItem);
  }
}

function updateDriverLocation(nextLoc, options = { panMap: false, skipReverseGeocode: false }) {
  const normalized = toLatLngLiteral(nextLoc);
  if (!normalized) return;

  state.driverLocation = normalized;

  if (gmp.driverMarker) {
    gmp.driverMarker.position = normalized;
  }
  if (gmp.searchCircle) {
    gmp.searchCircle.setCenter(normalized);
  }
  if (options.panMap && gmp.map) {
    gmp.map.panTo(normalized);
  }

  if (!options.skipReverseGeocode) {
    void reverseGeocodeLocation(normalized);
  }
  void refreshNearbyProviders();
}

function attachUiListeners() {
  elements.categoryFilterAll.addEventListener('click', () => {
    state.category = 'all';
    updateFilterButtons();
    void refreshNearbyProviders();
  });

  elements.categoryFilterEv.addEventListener('click', () => {
    state.category = 'ev';
    updateFilterButtons();
    void refreshNearbyProviders();
  });

  elements.categoryFilterRepair.addEventListener('click', () => {
    state.category = 'repair';
    updateFilterButtons();
    void refreshNearbyProviders();
  });

  for (const [btn, km] of [
    [elements.radius5km, 5],
    [elements.radius10km, 10],
    [elements.radius15km, 15],
  ]) {
    btn.addEventListener('click', () => {
      state.radiusKm = km;
      updateRadiusButtons();
      if (gmp.searchCircle) {
        gmp.searchCircle.setRadius(km * 1000);
        const bounds = gmp.searchCircle.getBounds();
        if (bounds && gmp.map) {
          gmp.map.fitBounds(bounds, 24);
        }
      }
      void refreshNearbyProviders();
    });
  }

  elements.useMapCenterBtn.addEventListener('click', () => {
    if (!gmp.map) return;
    const center = toLatLngLiteral(gmp.map.getCenter());
    if (center) {
      updateDriverLocation(center, { panMap: false, skipReverseGeocode: false });
    }
  });

  elements.dispatchRouteBtn.addEventListener('click', () => {
    const target =
      state.providers.find((p) => p.id === state.selectedPlaceId) || state.providers[0];
    if (target) {
      void selectAndRouteProvider(target);
    }
  });

  elements.clearRouteBtn.addEventListener('click', () => {
    clearRouteDisplay();
  });

  elements.toggleStepsBtn.addEventListener('click', () => {
    state.stepsExpanded = !state.stepsExpanded;
    elements.turnByTurnSteps.hidden = !state.stepsExpanded;
    elements.toggleStepsBtn.textContent = state.stepsExpanded
      ? 'Hide Turn-by-Turn'
      : 'Show Turn-by-Turn';
    elements.toggleStepsBtn.setAttribute('aria-expanded', String(state.stepsExpanded));
  });
}

async function initApp() {
  attachUiListeners();

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  if (!apiKey) {
    elements.resultsSummary.textContent = 'API key required';
    showBanner(
      'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and add your Google Maps Platform API key or free Maps Demo Key, then restart the server.',
      'warn'
    );
    return;
  }

  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
    mapIds: ['DEMO_MAP_ID'],
  });

  try {
    const [mapsLib, markerLib, placesLib, routesLib, geocodingLib, coreLib] =
      await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('geocoding'),
        importLibrary('core'),
      ]);

    gmp.libs = {
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      geocoding: geocodingLib,
      core: coreLib,
    };

    const { Map: GoogleMap, Circle, InfoWindow } = mapsLib;
    const { AdvancedMarkerElement, PinElement } = markerLib;
    const { PlaceAutocompleteElement } = placesLib;
    const { Geocoder } = geocodingLib;

    gmp.map = new GoogleMap(elements.mapContainer, {
      center: SEATTLE_CENTER,
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    gmp.infoWindow = new InfoWindow();
    gmp.geocoder = new Geocoder();

    const driverPin = new PinElement({
      background: '#dc2626',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: 'SOS',
      scale: 1.15,
    });

    gmp.driverMarker = new AdvancedMarkerElement({
      map: gmp.map,
      position: state.driverLocation,
      gmpDraggable: true,
      title: 'Driver Breakdown Location (drag to move)',
      zIndex: 1000,
    });
    gmp.driverMarker.append(driverPin);

    gmp.driverMarker.addEventListener('gmp-dragend', () => {
      const nextPos = toLatLngLiteral(gmp.driverMarker.position);
      if (nextPos) {
        updateDriverLocation(nextPos, { panMap: false, skipReverseGeocode: false });
      }
    });

    gmp.searchCircle = new Circle({
      map: gmp.map,
      center: state.driverLocation,
      radius: state.radiusKm * 1000,
      strokeColor: '#2563eb',
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      clickable: false,
    });

    gmp.map.addListener('click', (event) => {
      if (event.latLng) {
        updateDriverLocation(event.latLng, { panMap: false, skipReverseGeocode: false });
      }
    });

    const autocomplete = new PlaceAutocompleteElement({
      locationBias: {
        center: SEATTLE_CENTER,
        radius: 30000,
      },
      includedRegionCodes: ['us'],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
    autocomplete.placeholder = 'Search Seattle address or intersection...';
    elements.autocompleteContainer.replaceChildren(autocomplete);

    autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        const loc = toLatLngLiteral(place.location);
        if (!loc) return;

        state.driverAddress =
          place.formattedAddress || place.displayName || formatCoords(loc);
        elements.driverAddressBadge.textContent = state.driverAddress;

        if (place.viewport) {
          gmp.map.fitBounds(place.viewport);
        } else {
          gmp.map.setCenter(loc);
          gmp.map.setZoom(13);
        }

        updateDriverLocation(loc, { panMap: true, skipReverseGeocode: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showBanner(`Could not resolve selected address: ${msg}`, 'warn');
      }
    });

    await reverseGeocodeLocation(state.driverLocation);
    await refreshNearbyProviders();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    elements.resultsSummary.textContent = 'Map initialization failed';
    showBanner(`Failed to initialize Google Maps Platform SDK: ${msg}`, 'error');
  }
}

void initApp();
