import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const FRONT_RANGE_CENTER = { lat: 39.884, lng: -105.135 };
const FRONT_RANGE_BOUNDS = {
  north: 40.25,
  south: 39.55,
  east: -104.7,
  west: -105.45,
};

const SEED_ORIGIN_QUERY = 'Denver Union Station, Denver, CO';
const SEED_DESTINATION_QUERY = 'Chautauqua Park, Boulder, CO';
const ELEVATION_SAMPLES = 64;
const MAX_ELEVATION_INPUT_POINTS = 100;

const ROUTE_COLORS = ['#0f766e', '#2563eb', '#d97706', '#7c3aed'];
const ECO_ROUTE_COLOR = '#15803d';

const TRAVEL_MODES = ['DRIVING', 'BICYCLING', 'WALKING', 'TRANSIT'];
const MODE_LABELS = {
  DRIVING: 'Driving',
  BICYCLING: 'Cycling',
  WALKING: 'Walking',
  TRANSIT: 'Transit',
};

const state = {
  origin: null,
  destination: null,
  activeMode: 'BICYCLING',
  selectedRouteIndex: 0,
  avoidTolls: false,
  avoidHighways: false,
  ecoFriendly: true,
  routesByMode: {
    DRIVING: [],
    BICYCLING: [],
    WALKING: [],
    TRANSIT: [],
  },
  elevationPoints: [],
  elevationStats: null,
  requestSeq: 0,
  elevationSeq: 0,
};

const gmp = {
  map: null,
  LatLngBounds: null,
  Polyline: null,
  AdvancedMarkerElement: null,
  PinElement: null,
  Place: null,
  PlaceAutocompleteElement: null,
  Route: null,
  RouteLabel: null,
  ElevationService: null,
  elevationService: null,
  bicyclingLayer: null,
  trafficLayer: null,
  transitLayer: null,
  originMarker: null,
  destinationMarker: null,
  hoverMarker: null,
  activePolylines: [],
};

const els = {
  configAlert: document.getElementById('config-alert'),
  headerKpiEta: document.getElementById('header-kpi-eta'),
  headerKpiDistance: document.getElementById('header-kpi-distance'),
  headerKpiGain: document.getElementById('header-kpi-gain'),
  originSlot: document.getElementById('origin-autocomplete-slot'),
  destinationSlot: document.getElementById('destination-autocomplete-slot'),
  originChip: document.getElementById('origin-chip'),
  destinationChip: document.getElementById('destination-chip'),
  swapBtn: document.getElementById('swap-locations-btn'),
  modeButtons: Array.from(document.querySelectorAll('.mode-btn')),
  avoidTollsToggle: document.getElementById('avoid-tolls-toggle'),
  avoidHighwaysToggle: document.getElementById('avoid-highways-toggle'),
  ecoFriendlyToggle: document.getElementById('eco-friendly-toggle'),
  routeCountBadge: document.getElementById('route-count-badge'),
  betaAdvisory: document.getElementById('beta-trail-advisory'),
  routeCardsList: document.getElementById('route-cards-list'),
  mapCanvas: document.getElementById('map-canvas'),
  mapOverlayStatus: document.getElementById('map-overlay-status'),
  activeLayerPill: document.getElementById('active-layer-pill'),
  elevationRouteLabel: document.getElementById('elevation-route-label'),
  elevGainStat: document.getElementById('elev-gain-stat'),
  elevLossStat: document.getElementById('elev-loss-stat'),
  elevRangeStat: document.getElementById('elev-range-stat'),
  elevGradeStat: document.getElementById('elev-grade-stat'),
  elevationHoverReadout: document.getElementById('elevation-hover-readout'),
  elevationChartWrap: document.getElementById('elevation-profile-chart'),
};

function showConfigAlert(message) {
  els.configAlert.textContent = message;
  els.configAlert.classList.remove('hidden');
}

function setMapOverlayStatus(message) {
  if (!message) {
    els.mapOverlayStatus.classList.add('hidden');
    els.mapOverlayStatus.textContent = '';
    return;
  }
  els.mapOverlayStatus.textContent = message;
  els.mapOverlayStatus.classList.remove('hidden');
}

function updatePlaceChip(chipEl, endpoint) {
  const nameEl = document.createElement('span');
  nameEl.className = 'place-chip-name';
  nameEl.textContent = endpoint ? endpoint.name : 'Select a location';

  const addrEl = document.createElement('span');
  addrEl.className = 'place-chip-addr';
  addrEl.textContent = endpoint ? endpoint.address || formatLatLng(endpoint.location) : '';

  chipEl.replaceChildren(nameEl, addrEl);
}

function formatLatLng(loc) {
  if (!loc) return '';
  return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}

function formatDurationMs(durationMillis) {
  if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis)) {
    return '--';
  }
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins} min`;
  }
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

function formatDistanceMeters(distanceMeters) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return '--';
  }
  const km = distanceMeters / 1000;
  const miles = distanceMeters / 1609.344;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

function formatTollPrice(tollInfo) {
  const prices = tollInfo?.estimatedPrices;
  if (!Array.isArray(prices) || prices.length === 0) {
    return tollInfo ? 'Tolls expected' : null;
  }
  const first = prices[0];
  const units = Number(first.units || 0);
  const nanos = Number(first.nanos || 0) / 1e9;
  const total = units + nanos;
  const currency = first.currencyCode || 'USD';
  return `Est. toll ${currency} ${total.toFixed(2)}`;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function downsamplePath(path, maxPoints) {
  if (!Array.isArray(path) || path.length <= maxPoints) {
    return path || [];
  }
  const sampled = [];
  const step = (path.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i += 1) {
    sampled.push(path[Math.round(i * step)]);
  }
  sampled.push(path[path.length - 1]);
  return sampled;
}

function extractRoutePath(route) {
  if (!route || !Array.isArray(route.path)) {
    return [];
  }
  return route.path
    .map((pt) => {
      const lat = typeof pt.lat === 'function' ? pt.lat() : pt.lat;
      const lng = typeof pt.lng === 'function' ? pt.lng() : pt.lng;
      return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
    })
    .filter(Boolean);
}

function getRouteBadgeMeta(route, index) {
  const labels = Array.isArray(route.routeLabels) ? route.routeLabels : [];
  const isEco = labels.includes(gmp.RouteLabel?.FUEL_EFFICIENT || 'FUEL_EFFICIENT');
  const isDefault = labels.includes(gmp.RouteLabel?.DEFAULT_ROUTE || 'DEFAULT_ROUTE');

  if (isEco && !isDefault) {
    return { title: `Eco-Friendly Route`, badge: 'Fuel-Efficient', badgeType: 'eco', color: ECO_ROUTE_COLOR };
  }
  if (isEco && isDefault) {
    return {
      title: `Recommended (Eco-Friendly)`,
      badge: 'Best + Eco',
      badgeType: 'eco',
      color: ECO_ROUTE_COLOR,
    };
  }
  if (isDefault || index === 0) {
    return {
      title: `Recommended Route`,
      badge: 'Primary',
      badgeType: 'default',
      color: ROUTE_COLORS[0],
    };
  }
  return {
    title: `Alternative Route ${index}`,
    badge: 'Alternative',
    badgeType: 'alt',
    color: ROUTE_COLORS[index % ROUTE_COLORS.length],
  };
}

function endpointToWaypoint(endpoint) {
  if (endpoint?.placeInstance) {
    return endpoint.placeInstance;
  }
  return endpoint.location;
}

async function resolveSeedPlace(query, fallbackName) {
  const { places } = await gmp.Place.searchByText({
    textQuery: query,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: FRONT_RANGE_BOUNDS,
    region: 'us',
    language: 'en-US',
    maxResultCount: 1,
  });

  if (!places || places.length === 0 || !places[0].location) {
    throw new Error(`Could not resolve seeded place: ${query}`);
  }

  const place = places[0];
  return {
    id: place.id,
    name: place.displayName || fallbackName,
    address: place.formattedAddress || '',
    location: {
      lat: place.location.lat(),
      lng: place.location.lng(),
    },
    placeInstance: place,
  };
}

function createAutocompleteWidgets() {
  const buildWidget = (id, placeholder, onSelected) => {
    const widget = new gmp.PlaceAutocompleteElement({
      locationBias: FRONT_RANGE_BOUNDS,
      includedRegionCodes: ['us'],
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });
    widget.id = id;
    widget.setAttribute('placeholder', placeholder);

    widget.addEventListener('gmp-select', async (event) => {
      try {
        const prediction = event?.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        if (!place.location) return;
        onSelected({
          id: place.id,
          name: place.displayName || place.formattedAddress || 'Selected Place',
          address: place.formattedAddress || '',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
          placeInstance: place,
        });
      } catch (err) {
        setMapOverlayStatus(`Place lookup failed: ${err.message || 'Unknown error'}`);
      }
    });

    widget.addEventListener('gmp-error', () => {
      setMapOverlayStatus('Places Autocomplete encountered an API authorization or network error.');
    });

    return widget;
  };

  const originWidget = buildWidget(
    'origin-autocomplete-input',
    'Search Denver / Front Range origin...',
    (endpoint) => {
      state.origin = endpoint;
      updatePlaceChip(els.originChip, endpoint);
      updateEndpointMarkers();
      void computeAllModeRoutes();
    }
  );

  const destinationWidget = buildWidget(
    'destination-autocomplete-input',
    'Search Boulder / trailhead destination...',
    (endpoint) => {
      state.destination = endpoint;
      updatePlaceChip(els.destinationChip, endpoint);
      updateEndpointMarkers();
      void computeAllModeRoutes();
    }
  );

  els.originSlot.replaceChildren(originWidget);
  els.destinationSlot.replaceChildren(destinationWidget);
}

function updateEndpointMarkers() {
  if (!gmp.map || !gmp.AdvancedMarkerElement || !gmp.PinElement) {
    return;
  }

  if (state.origin?.location) {
    const originPin = new gmp.PinElement({
      background: '#0f766e',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: 'A',
    });
    if (!gmp.originMarker) {
      gmp.originMarker = new gmp.AdvancedMarkerElement({
        map: gmp.map,
        position: state.origin.location,
        title: state.origin.name,
        content: originPin,
        zIndex: 40,
      });
    } else {
      gmp.originMarker.position = state.origin.location;
      gmp.originMarker.title = state.origin.name;
      gmp.originMarker.content = originPin;
      gmp.originMarker.map = gmp.map;
    }
  }

  if (state.destination?.location) {
    const destPin = new gmp.PinElement({
      background: '#d97706',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: 'B',
    });
    if (!gmp.destinationMarker) {
      gmp.destinationMarker = new gmp.AdvancedMarkerElement({
        map: gmp.map,
        position: state.destination.location,
        title: state.destination.name,
        content: destPin,
        zIndex: 40,
      });
    } else {
      gmp.destinationMarker.position = state.destination.location;
      gmp.destinationMarker.title = state.destination.name;
      gmp.destinationMarker.content = destPin;
      gmp.destinationMarker.map = gmp.map;
    }
  }
}

function buildComputeRoutesRequest(mode, includeEco = true) {
  const baseFields = [
    'path',
    'routeLabels',
    'distanceMeters',
    'durationMillis',
    'staticDurationMillis',
    'viewport',
    'localizedValues',
    'warnings',
  ];

  const request = {
    origin: endpointToWaypoint(state.origin),
    destination: endpointToWaypoint(state.destination),
    travelMode: mode,
    computeAlternativeRoutes: true,
    fields: mode === 'DRIVING' ? [...baseFields, 'travelAdvisory'] : baseFields,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  };

  if (mode === 'DRIVING') {
    const useEco = Boolean(includeEco && state.ecoFriendly);
    request.routingPreference = useEco ? 'TRAFFIC_AWARE_OPTIMAL' : 'TRAFFIC_AWARE';
    request.routeModifiers = {
      avoidTolls: state.avoidTolls,
      avoidHighways: state.avoidHighways,
      ...(useEco ? { vehicleInfo: { emissionType: 'GASOLINE' } } : {}),
    };
    request.extraComputations = useEco ? ['TOLLS', 'FUEL_CONSUMPTION'] : ['TOLLS'];
    if (useEco) {
      request.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
    }
  }

  return request;
}

async function computeRoutesForMode(mode) {
  try {
    const response = await gmp.Route.computeRoutes(buildComputeRoutesRequest(mode, true));
    return Array.isArray(response?.routes) ? response.routes : [];
  } catch {
    if (mode === 'DRIVING' && state.ecoFriendly) {
      try {
        const fallbackResp = await gmp.Route.computeRoutes(buildComputeRoutesRequest(mode, false));
        return Array.isArray(fallbackResp?.routes) ? fallbackResp.routes : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

async function computeAllModeRoutes(modesToCompute = TRAVEL_MODES) {
  if (!state.origin || !state.destination) {
    return;
  }

  const currentSeq = ++state.requestSeq;
  setMapOverlayStatus('Computing live routes via Routes API...');

  const results = await Promise.allSettled(
    modesToCompute.map(async (mode) => ({
      mode,
      routes: await computeRoutesForMode(mode),
    }))
  );

  if (currentSeq !== state.requestSeq) {
    return;
  }

  for (const result of results) {
    if (result.status === 'fulfilled') {
      state.routesByMode[result.value.mode] = result.value.routes;
    }
  }

  state.selectedRouteIndex = 0;
  setMapOverlayStatus('');
  updateModeButtonsUI();
  renderActiveModeRoutes();
}

function updateModeButtonsUI() {
  for (const btn of els.modeButtons) {
    const mode = btn.dataset.mode;
    const isActive = mode === state.activeMode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');

    const etaSpan = btn.querySelector('[data-mode-eta]');
    const routes = state.routesByMode[mode] || [];
    if (etaSpan) {
      etaSpan.textContent = routes.length > 0 ? formatDurationMs(routes[0].durationMillis) : 'N/A';
    }
  }
}

function updateMapLayersForMode() {
  if (!gmp.map) return;

  gmp.bicyclingLayer?.setMap(state.activeMode === 'BICYCLING' ? gmp.map : null);
  gmp.trafficLayer?.setMap(state.activeMode === 'DRIVING' ? gmp.map : null);
  gmp.transitLayer?.setMap(state.activeMode === 'TRANSIT' ? gmp.map : null);

  if (state.activeMode === 'BICYCLING') {
    els.activeLayerPill.textContent = 'Bike Paths Layer Active';
  } else if (state.activeMode === 'DRIVING') {
    els.activeLayerPill.textContent = 'Live Traffic Layer Active';
  } else if (state.activeMode === 'TRANSIT') {
    els.activeLayerPill.textContent = 'Transit Network Layer Active';
  } else {
    els.activeLayerPill.textContent = 'Walking & Trail View Active';
  }

  const isTrailMode = state.activeMode === 'BICYCLING' || state.activeMode === 'WALKING';
  els.betaAdvisory.classList.toggle('hidden', !isTrailMode);
}

function clearRoutePolylines() {
  for (const poly of gmp.activePolylines) {
    poly.setMap(null);
  }
  gmp.activePolylines = [];
}

function renderActiveModeRoutes() {
  updateMapLayersForMode();
  clearRoutePolylines();

  const routes = state.routesByMode[state.activeMode] || [];
  if (state.selectedRouteIndex >= routes.length) {
    state.selectedRouteIndex = 0;
  }

  els.routeCountBadge.textContent = `${routes.length} ${routes.length === 1 ? 'route' : 'routes'}`;
  renderRouteCards(routes);

  if (routes.length === 0) {
    els.headerKpiEta.textContent = '--';
    els.headerKpiDistance.textContent = '--';
    els.headerKpiGain.textContent = '--';
    clearElevationChart(`No ${MODE_LABELS[state.activeMode]} route returned for these endpoints.`);
    return;
  }

  // Draw inactive routes first, then selected route on top.
  const drawOrder = routes
    .map((route, idx) => ({ route, idx }))
    .sort((a, b) => (a.idx === state.selectedRouteIndex ? 1 : b.idx === state.selectedRouteIndex ? -1 : 0));

  for (const { route, idx } of drawOrder) {
    const path = extractRoutePath(route);
    if (path.length < 2) continue;

    const meta = getRouteBadgeMeta(route, idx);
    const isSelected = idx === state.selectedRouteIndex;

    const polyline = new gmp.Polyline({
      map: gmp.map,
      path,
      strokeColor: meta.color,
      strokeOpacity: isSelected ? 0.94 : 0.45,
      strokeWeight: isSelected ? 6 : 4,
      zIndex: isSelected ? 30 : 10 + idx,
    });

    polyline.addListener('click', () => {
      if (state.selectedRouteIndex !== idx) {
        state.selectedRouteIndex = idx;
        renderActiveModeRoutes();
      }
    });

    gmp.activePolylines.push(polyline);
  }

  const activeRoute = routes[state.selectedRouteIndex];
  fitMapToActiveRoute(activeRoute);

  els.headerKpiEta.textContent =
    activeRoute.localizedValues?.duration || formatDurationMs(activeRoute.durationMillis);
  els.headerKpiDistance.textContent =
    activeRoute.localizedValues?.distance || formatDistanceMeters(activeRoute.distanceMeters);

  void fetchAndRenderElevation(activeRoute);
}

function fitMapToActiveRoute(route) {
  if (!gmp.map || !gmp.LatLngBounds) return;
  if (route?.viewport) {
    gmp.map.fitBounds(route.viewport, 48);
    return;
  }
  const bounds = new gmp.LatLngBounds();
  if (state.origin?.location) bounds.extend(state.origin.location);
  if (state.destination?.location) bounds.extend(state.destination.location);
  for (const pt of extractRoutePath(route)) {
    bounds.extend(pt);
  }
  gmp.map.fitBounds(bounds, 48);
}

function renderRouteCards(routes) {
  if (!routes || routes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'route-empty-state';
    empty.textContent = `No ${MODE_LABELS[state.activeMode].toLowerCase()} routes were found between these endpoints. Try switching travel modes or adjusting route preferences.`;
    els.routeCardsList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  routes.forEach((route, idx) => {
    const meta = getRouteBadgeMeta(route, idx);
    const isSelected = idx === state.selectedRouteIndex;

    const card = document.createElement('button');
    card.type = 'button';
    card.id = `route-card-${idx}`;
    card.className = `route-card${isSelected ? ' is-selected' : ''}`;
    card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    card.addEventListener('click', () => {
      state.selectedRouteIndex = idx;
      renderActiveModeRoutes();
    });

    const topRow = document.createElement('div');
    topRow.className = 'route-card-top';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'route-card-title-wrap';

    const swatch = document.createElement('span');
    swatch.className = 'route-swatch';
    swatch.style.backgroundColor = meta.color;

    const title = document.createElement('span');
    title.className = 'route-card-title';
    title.textContent = meta.title;

    titleWrap.append(swatch, title);

    const duration = document.createElement('span');
    duration.className = 'route-card-duration';
    duration.textContent = route.localizedValues?.duration || formatDurationMs(route.durationMillis);

    topRow.append(titleWrap, duration);

    const metaRow = document.createElement('div');
    metaRow.className = 'route-card-meta';

    const distSpan = document.createElement('span');
    distSpan.textContent =
      route.localizedValues?.distance || formatDistanceMeters(route.distanceMeters);
    metaRow.appendChild(distSpan);

    const labelBadge = document.createElement('span');
    labelBadge.className = `route-badge${meta.badgeType === 'eco' ? ' badge-eco' : ''}`;
    labelBadge.textContent = meta.badge;
    metaRow.appendChild(labelBadge);

    if (state.activeMode === 'DRIVING') {
      const tollText = formatTollPrice(route.travelAdvisory?.tollInfo);
      if (tollText) {
        const tollBadge = document.createElement('span');
        tollBadge.className = 'route-badge badge-toll';
        tollBadge.textContent = tollText;
        metaRow.appendChild(tollBadge);
      } else {
        const noTollBadge = document.createElement('span');
        noTollBadge.className = 'route-badge';
        noTollBadge.textContent = 'No Tolls';
        metaRow.appendChild(noTollBadge);
      }

      const fuelMicro = route.travelAdvisory?.fuelConsumptionMicroliters;
      if (typeof fuelMicro === 'number' && Number.isFinite(fuelMicro) && fuelMicro > 0) {
        const fuelBadge = document.createElement('span');
        fuelBadge.className = 'route-badge badge-eco';
        fuelBadge.textContent = `Est. Fuel ${(fuelMicro / 1_000_000).toFixed(2)} L`;
        metaRow.appendChild(fuelBadge);
      }
    }

    card.append(topRow, metaRow);
    fragment.appendChild(card);
  });

  els.routeCardsList.replaceChildren(fragment);
}

function clearElevationChart(message) {
  state.elevationPoints = [];
  state.elevationStats = null;
  hideMapHoverMarker();
  els.elevGainStat.textContent = '--';
  els.elevLossStat.textContent = '--';
  els.elevRangeStat.textContent = '--';
  els.elevGradeStat.textContent = '--';
  els.elevationHoverReadout.textContent = 'Hover chart to scrub route elevation';

  const placeholder = document.createElement('div');
  placeholder.className = 'elevation-placeholder';
  placeholder.textContent = message;
  els.elevationChartWrap.replaceChildren(placeholder);
}

function hideMapHoverMarker() {
  if (gmp.hoverMarker) {
    gmp.hoverMarker.map = null;
  }
}

function updateMapHoverMarker(point) {
  if (!gmp.map || !gmp.AdvancedMarkerElement || !point?.location) {
    return;
  }
  if (!gmp.hoverMarker) {
    const dot = document.createElement('div');
    dot.style.width = '14px';
    dot.style.height = '14px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#0284c7';
    dot.style.border = '3px solid #ffffff';
    dot.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.45)';
    gmp.hoverMarker = new gmp.AdvancedMarkerElement({
      map: gmp.map,
      position: point.location,
      content: dot,
      zIndex: 90,
    });
  } else {
    gmp.hoverMarker.position = point.location;
    gmp.hoverMarker.map = gmp.map;
  }
}

async function fetchAndRenderElevation(route) {
  const path = extractRoutePath(route);
  if (path.length < 2) {
    clearElevationChart('Route geometry unavailable for elevation sampling.');
    return;
  }

  const seq = ++state.elevationSeq;
  const meta = getRouteBadgeMeta(route, state.selectedRouteIndex);
  els.elevationRouteLabel.textContent = `${MODE_LABELS[state.activeMode]} · ${meta.title} (${ELEVATION_SAMPLES} Elevation API samples)`;

  try {
    const sampledPath = downsamplePath(path, MAX_ELEVATION_INPUT_POINTS);
    const { results } = await gmp.elevationService.getElevationAlongPath({
      path: sampledPath,
      samples: ELEVATION_SAMPLES,
    });

    if (seq !== state.elevationSeq) {
      return;
    }

    if (!Array.isArray(results) || results.length < 2) {
      clearElevationChart('Elevation data unavailable for this route.');
      return;
    }

    let cumulativeDistMeters = 0;
    let totalGain = 0;
    let totalLoss = 0;
    let minElev = Infinity;
    let maxElev = -Infinity;
    let maxGradePct = 0;

    const points = results.map((res, idx) => {
      const loc = {
        lat: typeof res.location.lat === 'function' ? res.location.lat() : res.location.lat,
        lng: typeof res.location.lng === 'function' ? res.location.lng() : res.location.lng,
      };
      const elevation = res.elevation;
      let gradePct = 0;

      if (idx > 0) {
        const prev = results[idx - 1];
        const prevLoc = {
          lat: typeof prev.location.lat === 'function' ? prev.location.lat() : prev.location.lat,
          lng: typeof prev.location.lng === 'function' ? prev.location.lng() : prev.location.lng,
        };
        const segMeters = haversineMeters(prevLoc, loc);
        cumulativeDistMeters += segMeters;
        const deltaElev = elevation - prev.elevation;
        if (deltaElev > 0) {
          totalGain += deltaElev;
        } else {
          totalLoss += Math.abs(deltaElev);
        }
        if (segMeters > 5) {
          gradePct = (deltaElev / segMeters) * 100;
          maxGradePct = Math.max(maxGradePct, Math.abs(gradePct));
        }
      }

      minElev = Math.min(minElev, elevation);
      maxElev = Math.max(maxElev, elevation);

      return {
        index: idx,
        elevation,
        distanceMeters: cumulativeDistMeters,
        gradePct,
        location: loc,
      };
    });

    state.elevationPoints = points;
    state.elevationStats = {
      totalGain,
      totalLoss,
      minElev,
      maxElev,
      maxGradePct,
      totalDistMeters: cumulativeDistMeters,
    };

    const gainRounded = Math.round(totalGain);
    els.headerKpiGain.textContent = `+${gainRounded} m`;
    els.elevGainStat.textContent = `+${gainRounded} m`;
    els.elevLossStat.textContent = `-${Math.round(totalLoss)} m`;
    els.elevRangeStat.textContent = `${Math.round(minElev)}–${Math.round(maxElev)} m`;
    els.elevGradeStat.textContent = `${maxGradePct.toFixed(1)}%`;

    renderElevationSvg(points, state.elevationStats, meta.color);
  } catch (err) {
    if (seq !== state.elevationSeq) {
      return;
    }
    clearElevationChart(`Elevation query failed: ${err.message || 'Check Elevation API access'}`);
  }
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

function renderElevationSvg(points, stats, strokeColor) {
  const width = 880;
  const height = 136;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 14;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const elevSpan = Math.max(20, stats.maxElev - stats.minElev);
  const minBound = stats.minElev - elevSpan * 0.08;
  const maxBound = stats.maxElev + elevSpan * 0.1;
  const boundSpan = maxBound - minBound;
  const totalDist = Math.max(1, stats.totalDistMeters);

  const toX = (distMeters) => padLeft + (distMeters / totalDist) * plotW;
  const toY = (elev) => padTop + plotH - ((elev - minBound) / boundSpan) * plotH;

  const svg = createSvgElement('svg', {
    class: 'elevation-svg',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': 'Elevation and slope profile chart along active route',
  });

  const defs = createSvgElement('defs');
  const grad = createSvgElement('linearGradient', {
    id: 'elev-area-gradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
  });
  grad.append(
    createSvgElement('stop', { offset: '0%', 'stop-color': strokeColor, 'stop-opacity': '0.35' }),
    createSvgElement('stop', { offset: '100%', 'stop-color': strokeColor, 'stop-opacity': '0.03' })
  );
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Horizontal grid lines + altitude labels
  const gridSteps = 3;
  for (let i = 0; i <= gridSteps; i += 1) {
    const ratio = i / gridSteps;
    const elevVal = minBound + ratio * boundSpan;
    const y = padTop + plotH - ratio * plotH;

    svg.appendChild(
      createSvgElement('line', {
        x1: padLeft,
        y1: y.toFixed(1),
        x2: width - padRight,
        y2: y.toFixed(1),
        stroke: '#dbe3ea',
        'stroke-width': '1',
        'stroke-dasharray': i === 0 ? 'none' : '3 3',
      })
    );

    const label = createSvgElement('text', {
      x: padLeft - 6,
      y: (y + 3).toFixed(1),
      'text-anchor': 'end',
      fill: '#64748b',
      'font-size': '10',
      'font-family': 'Inter, sans-serif',
    });
    label.textContent = `${Math.round(elevVal)}m`;
    svg.appendChild(label);
  }

  // Distance axis ticks
  const distTicks = [0, 0.25, 0.5, 0.75, 1];
  for (const t of distTicks) {
    const x = padLeft + t * plotW;
    const kmVal = (t * totalDist) / 1000;
    const tickLabel = createSvgElement('text', {
      x: x.toFixed(1),
      y: height - 5,
      'text-anchor': t === 0 ? 'start' : t === 1 ? 'end' : 'middle',
      fill: '#64748b',
      'font-size': '10',
      'font-family': 'Inter, sans-serif',
    });
    tickLabel.textContent = `${kmVal.toFixed(1)} km`;
    svg.appendChild(tickLabel);
  }

  // Area & Line path
  const coords = points.map((pt) => ({
    x: toX(pt.distanceMeters),
    y: toY(pt.elevation),
  }));

  const lineCommands = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const baseLineY = (padTop + plotH).toFixed(1);
  const areaCommands = `${lineCommands} L ${coords[coords.length - 1].x.toFixed(1)} ${baseLineY} L ${coords[0].x.toFixed(1)} ${baseLineY} Z`;

  svg.appendChild(
    createSvgElement('path', {
      d: areaCommands,
      fill: 'url(#elev-area-gradient)',
    })
  );

  svg.appendChild(
    createSvgElement('path', {
      d: lineCommands,
      fill: 'none',
      stroke: strokeColor,
      'stroke-width': '2.5',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    })
  );

  // Interactive hover hairline & dot
  const hoverLine = createSvgElement('line', {
    x1: padLeft,
    y1: padTop,
    x2: padLeft,
    y2: padTop + plotH,
    stroke: '#0284c7',
    'stroke-width': '1.5',
    'stroke-dasharray': '3 2',
    visibility: 'hidden',
  });

  const hoverDot = createSvgElement('circle', {
    cx: padLeft,
    cy: padTop,
    r: '5',
    fill: '#0284c7',
    stroke: '#ffffff',
    'stroke-width': '2',
    visibility: 'hidden',
  });

  svg.append(hoverLine, hoverDot);

  const scrubAtClientX = (clientX) => {
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(padLeft, Math.min(width - padRight, svgX));
    const ratio = (clampedX - padLeft) / plotW;
    const targetDist = ratio * totalDist;

    let nearestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      const diff = Math.abs(points[i].distanceMeters - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    }

    const pt = points[nearestIdx];
    const c = coords[nearestIdx];

    hoverLine.setAttribute('x1', c.x.toFixed(1));
    hoverLine.setAttribute('x2', c.x.toFixed(1));
    hoverLine.setAttribute('visibility', 'visible');

    hoverDot.setAttribute('cx', c.x.toFixed(1));
    hoverDot.setAttribute('cy', c.y.toFixed(1));
    hoverDot.setAttribute('visibility', 'visible');

    const elevFt = Math.round(pt.elevation * 3.28084);
    const gradeSign = pt.gradePct > 0 ? '+' : '';
    els.elevationHoverReadout.textContent = `${(pt.distanceMeters / 1000).toFixed(1)} km · ${Math.round(pt.elevation)} m (${elevFt.toLocaleString()} ft) · ${gradeSign}${pt.gradePct.toFixed(1)}% grade`;

    updateMapHoverMarker(pt);
  };

  svg.addEventListener('pointermove', (event) => scrubAtClientX(event.clientX));
  svg.addEventListener('pointerdown', (event) => scrubAtClientX(event.clientX));
  svg.addEventListener('pointerleave', () => {
    hoverLine.setAttribute('visibility', 'hidden');
    hoverDot.setAttribute('visibility', 'hidden');
    hideMapHoverMarker();
    els.elevationHoverReadout.textContent = 'Hover chart to scrub route elevation';
  });

  els.elevationChartWrap.replaceChildren(svg);
}

function attachUiListeners() {
  for (const btn of els.modeButtons) {
    btn.addEventListener('click', () => {
      const nextMode = btn.dataset.mode;
      if (!nextMode || nextMode === state.activeMode) return;
      state.activeMode = nextMode;
      state.selectedRouteIndex = 0;
      updateModeButtonsUI();
      renderActiveModeRoutes();
    });
  }

  els.swapBtn.addEventListener('click', () => {
    if (!state.origin || !state.destination) return;
    const prevOrigin = state.origin;
    state.origin = state.destination;
    state.destination = prevOrigin;
    updatePlaceChip(els.originChip, state.origin);
    updatePlaceChip(els.destinationChip, state.destination);
    updateEndpointMarkers();
    void computeAllModeRoutes();
  });

  const onDrivingModifierChange = () => {
    state.avoidTolls = els.avoidTollsToggle.checked;
    state.avoidHighways = els.avoidHighwaysToggle.checked;
    state.ecoFriendly = els.ecoFriendlyToggle.checked;
    void computeAllModeRoutes(['DRIVING']);
  };

  els.avoidTollsToggle.addEventListener('change', onDrivingModifierChange);
  els.avoidHighwaysToggle.addEventListener('change', onDrivingModifierChange);
  els.ecoFriendlyToggle.addEventListener('change', onDrivingModifierChange);
}

async function init() {
  attachUiListeners();

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  if (!apiKey) {
    showConfigAlert(
      'Missing GOOGLE_MAPS_API_KEY. Create a .env file from .env.example with a Maps Demo Key or Cloud API key, then restart server.mjs.'
    );
    clearElevationChart('Configure GOOGLE_MAPS_API_KEY to load interactive routes and elevation.');
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });

    const [
      { LatLngBounds },
      { Map, Polyline, BicyclingLayer, TrafficLayer, TransitLayer },
      { AdvancedMarkerElement, PinElement },
      { Place, PlaceAutocompleteElement },
      { Route, RouteLabel },
      { ElevationService },
    ] = await Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('elevation'),
    ]);

    gmp.LatLngBounds = LatLngBounds;
    gmp.Polyline = Polyline;
    gmp.AdvancedMarkerElement = AdvancedMarkerElement;
    gmp.PinElement = PinElement;
    gmp.Place = Place;
    gmp.PlaceAutocompleteElement = PlaceAutocompleteElement;
    gmp.Route = Route;
    gmp.RouteLabel = RouteLabel;
    gmp.ElevationService = ElevationService;
    gmp.elevationService = new ElevationService();

    gmp.map = new Map(els.mapCanvas, {
      center: FRONT_RANGE_CENTER,
      zoom: 11,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    gmp.bicyclingLayer = new BicyclingLayer();
    gmp.trafficLayer = new TrafficLayer();
    gmp.transitLayer = new TransitLayer();

    createAutocompleteWidgets();
    setMapOverlayStatus('Resolving Denver & Boulder landmarks via Places API (New)...');

    const [origin, destination] = await Promise.all([
      resolveSeedPlace(SEED_ORIGIN_QUERY, 'Denver Union Station'),
      resolveSeedPlace(SEED_DESTINATION_QUERY, 'Chautauqua Park'),
    ]);

    state.origin = origin;
    state.destination = destination;
    updatePlaceChip(els.originChip, origin);
    updatePlaceChip(els.destinationChip, destination);
    updateEndpointMarkers();

    await computeAllModeRoutes();
  } catch (err) {
    setMapOverlayStatus('');
    showConfigAlert(
      `Failed to initialize Google Maps Platform: ${err.message || 'Verify API key and enabled APIs (Maps JS, Places New, Routes, Elevation).'}`
    );
  }
}

void init();
