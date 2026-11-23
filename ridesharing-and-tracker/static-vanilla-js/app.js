import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const LA_CENTER = { lat: 34.0328, lng: -118.3669 };
const SEED_PICKUP_QUERY = 'Union Station, Los Angeles, CA';
const SEED_DROPOFF_QUERY = 'Santa Monica Pier, Santa Monica, CA';

const FARE_RATES = {
  economy: { label: 'Economy', base: 2.75, perMile: 1.45, perMinute: 0.32, minFare: 7.5 },
  comfort: { label: 'Comfort', base: 4.25, perMile: 1.95, perMinute: 0.44, minFare: 11.0 },
  green: { label: 'Green', base: 3.25, perMile: 1.55, perMinute: 0.34, minFare: 8.5 },
};

const DRIVER_TEMPLATES = [
  {
    id: 'drv-elena',
    name: 'Elena R.',
    vehicle: 'Toyota Prius Prime',
    emissionType: 'HYBRID',
    rating: '4.96',
    offsetLat: -0.0057,
    offsetLng: -0.0027,
  },
  {
    id: 'drv-marcus',
    name: 'Marcus V.',
    vehicle: 'Hyundai Ioniq 5',
    emissionType: 'ELECTRIC',
    rating: '4.94',
    offsetLat: -0.0146,
    offsetLng: 0.0017,
  },
  {
    id: 'drv-devon',
    name: 'Devon K.',
    vehicle: 'Honda Accord',
    emissionType: 'GASOLINE',
    rating: '4.89',
    offsetLat: 0.0063,
    offsetLng: -0.002,
  },
  {
    id: 'drv-sofia',
    name: 'Sofia M.',
    vehicle: 'Tesla Model 3',
    emissionType: 'ELECTRIC',
    rating: '4.98',
    offsetLat: -0.0025,
    offsetLng: -0.0147,
  },
];

const dom = {
  apiKeyNotice: document.getElementById('api-key-notice'),
  headerTripSummary: document.getElementById('header-trip-summary'),
  headerDispatchStatus: document.getElementById('header-dispatch-status'),
  pickupAutocompleteWrap: document.getElementById('pickup-autocomplete'),
  dropoffAutocompleteWrap: document.getElementById('dropoff-autocomplete'),
  pickupResolvedLabel: document.getElementById('pickup-resolved-label'),
  dropoffResolvedLabel: document.getElementById('dropoff-resolved-label'),
  swapLocationsBtn: document.getElementById('swap-locations-btn'),
  emissionTypeSelect: document.getElementById('emission-type-select'),
  routeOptionFastest: document.getElementById('route-option-fastest'),
  routeOptionEco: document.getElementById('route-option-eco'),
  fastestDuration: document.getElementById('fastest-duration'),
  fastestDistance: document.getElementById('fastest-distance'),
  fastestFuel: document.getElementById('fastest-fuel'),
  fastestSubnote: document.getElementById('fastest-subnote'),
  ecoDuration: document.getElementById('eco-duration'),
  ecoDistance: document.getElementById('eco-distance'),
  ecoFuel: document.getElementById('eco-fuel'),
  ecoSubnote: document.getElementById('eco-subnote'),
  ecoSavingsBanner: document.getElementById('eco-savings-banner'),
  fareRouteBasis: document.getElementById('fare-route-basis'),
  fareEconomyCard: document.getElementById('fare-tier-economy'),
  fareComfortCard: document.getElementById('fare-tier-comfort'),
  fareGreenCard: document.getElementById('fare-tier-green'),
  fareEconomyPrice: document.getElementById('fare-economy-price'),
  fareEconomyBreakdown: document.getElementById('fare-economy-breakdown'),
  fareComfortPrice: document.getElementById('fare-comfort-price'),
  fareComfortBreakdown: document.getElementById('fare-comfort-breakdown'),
  fareGreenPrice: document.getElementById('fare-green-price'),
  fareGreenCallout: document.getElementById('fare-green-callout'),
  fareGreenBreakdown: document.getElementById('fare-green-breakdown'),
  driverPhaseLabel: document.getElementById('driver-phase-label'),
  driverEtaCountdown: document.getElementById('driver-eta-countdown'),
  driverDistanceRemaining: document.getElementById('driver-distance-remaining'),
  dispatchedDriverMeta: document.getElementById('dispatched-driver-meta'),
  driverProgressBar: document.getElementById('driver-progress-bar'),
  dispatchDriverBtn: document.getElementById('dispatch-driver-btn'),
  toggleSimulationBtn: document.getElementById('toggle-simulation-btn'),
  candidateDriversList: document.getElementById('candidate-drivers-list'),
  mapContainer: document.getElementById('rideshare-map'),
};

const state = {
  libs: null,
  map: null,
  pickupEl: null,
  dropoffEl: null,
  pickupPlace: null,
  dropoffPlace: null,
  emissionType: 'GASOLINE',
  selectedRouteKey: 'fastest',
  selectedTier: 'economy',
  fastestRoute: null,
  ecoRoute: null,
  fastestPolyline: null,
  ecoPolyline: null,
  approachPolyline: null,
  pickupMarker: null,
  dropoffMarker: null,
  candidateMarkers: [],
  driverMarker: null,
  driverBadgeEl: null,
  candidateDrivers: [],
  dispatchedDriver: null,
  approachRoute: null,
  infoWindow: null,
  sim: {
    phase: 'IDLE', // IDLE | EN_ROUTE_TO_PICKUP | TRIP_IN_PROGRESS | ARRIVED
    isPaused: false,
    progress: 0,
    lastFrameTs: 0,
    rafId: null,
    approachTimeline: null,
    tripTimeline: null,
  },
  requestSeq: 0,
};

function showNotice(message, isError = false) {
  dom.apiKeyNotice.textContent = message;
  dom.apiKeyNotice.classList.remove('notice-banner--hidden');
  if (isError) {
    dom.apiKeyNotice.style.backgroundColor = '#fef2f2';
    dom.apiKeyNotice.style.borderColor = '#fca5a5';
    dom.apiKeyNotice.style.color = '#991b1b';
  } else {
    dom.apiKeyNotice.style.backgroundColor = '';
    dom.apiKeyNotice.style.borderColor = '';
    dom.apiKeyNotice.style.color = '';
  }
}

function hideNotice() {
  dom.apiKeyNotice.classList.add('notice-banner--hidden');
  dom.apiKeyNotice.textContent = '';
}

function setHeaderStatus(text, tone = 'neutral') {
  dom.headerDispatchStatus.textContent = text;
  dom.headerDispatchStatus.className = `status-pill status-pill--${tone}`;
}

function parseDurationSeconds(durationVal) {
  if (typeof durationVal === 'number' && Number.isFinite(durationVal)) {
    return Math.max(1, Math.round(durationVal));
  }
  if (typeof durationVal === 'string') {
    const match = durationVal.match(/^([\d.]+)s$/);
    if (match) return Math.max(1, Math.round(Number(match[1])));
  }
  return 0;
}

function metersToMiles(meters) {
  return meters / 1609.344;
}

function formatMiles(meters) {
  const miles = metersToMiles(meters);
  return `${miles.toFixed(1)} mi`;
}

function formatMinutes(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

function formatCountdown(seconds) {
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function formatEnergyConsumption(microliters, emissionType) {
  if (!microliters || microliters <= 0) return 'N/A';
  const liters = microliters / 1_000_000;
  if (emissionType === 'ELECTRIC') {
    // Routes API reports EV energy in gasoline-equivalent microliters (~8.9 kWh/L).
    const kwh = liters * 8.9;
    return `${kwh.toFixed(1)} kWh eq.`;
  }
  const gallons = liters * 0.264172;
  return `${liters.toFixed(2)} L (${gallons.toFixed(2)} gal)`;
}

function estimateCo2Kg(microliters, emissionType) {
  if (!microliters || microliters <= 0) return 0;
  const liters = microliters / 1_000_000;
  if (emissionType === 'ELECTRIC') {
    // California grid average ~0.22 kg CO2 / kWh
    return liters * 8.9 * 0.22;
  }
  return liters * 2.31;
}

function toLatLngLiteral(location) {
  if (!location) return null;
  if (typeof location.lat === 'function' && typeof location.lng === 'function') {
    return { lat: location.lat(), lng: location.lng() };
  }
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return { lat: location.latitude, lng: location.longitude };
  }
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { lat: location.lat, lng: location.lng };
  }
  return null;
}

async function resolvePlaceByText(query) {
  // 1. Try server-side Places API (New) proxy first
  try {
    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
        languageCode: 'en',
        regionCode: 'US',
        locationBias: {
          circle: {
            center: { latitude: LA_CENTER.lat, longitude: LA_CENTER.lng },
            radius: 45000,
          },
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const first = data?.places?.[0];
      const latLng = toLatLngLiteral(first?.location);
      if (first && latLng) {
        return {
          id: first.id || '',
          displayName: first.displayName?.text || query,
          formattedAddress: first.formattedAddress || query,
          location: latLng,
        };
      }
    }
  } catch {
    // Fallback to Maps JS Place.searchByText below
  }

  // 2. Fallback to client-side Places API (New) SDK
  const { Place } = state.libs.places;
  const { places } = await Place.searchByText({
    textQuery: query,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: { lat: LA_CENTER.lat, lng: LA_CENTER.lng },
    language: 'en',
    region: 'us',
    maxResultCount: 1,
  });

  const first = places?.[0];
  const latLng = toLatLngLiteral(first?.location);
  if (!first || !latLng) {
    throw new Error(`Could not resolve location: ${query}`);
  }
  return {
    id: first.id || '',
    displayName: first.displayName || query,
    formattedAddress: first.formattedAddress || query,
    location: latLng,
  };
}

function buildRestWaypoint(placeOrLatLng) {
  if (placeOrLatLng.id) {
    return { placeId: placeOrLatLng.id };
  }
  const coords = placeOrLatLng.location || placeOrLatLng;
  return {
    location: {
      latLng: {
        latitude: coords.lat,
        longitude: coords.lng,
      },
    },
  };
}

function normalizeRestRoute(route) {
  const { encoding } = state.libs.geometry;
  const encoded = route?.polyline?.encodedPolyline;
  const path = encoded ? encoding.decodePath(encoded) : [];
  return {
    distanceMeters: Number(route.distanceMeters || 0),
    durationSeconds: parseDurationSeconds(route.duration),
    staticDurationSeconds: parseDurationSeconds(route.staticDuration),
    fuelMicroliters: Number(route.travelAdvisory?.fuelConsumptionMicroliters || 0),
    routeLabels: Array.isArray(route.routeLabels) ? route.routeLabels : [],
    localizedValues: route.localizedValues || null,
    path,
  };
}

function normalizeJsSdkRoute(route) {
  const path = Array.isArray(route.path)
    ? route.path.map((pt) => toLatLngLiteral(pt)).filter(Boolean)
    : [];
  return {
    distanceMeters: Number(route.distanceMeters || 0),
    durationSeconds: route.durationMillis ? Math.max(1, Math.round(route.durationMillis / 1000)) : 0,
    staticDurationSeconds: route.staticDurationMillis
      ? Math.max(1, Math.round(route.staticDurationMillis / 1000))
      : 0,
    fuelMicroliters: Number(route.travelAdvisory?.fuelConsumptionMicroliters || 0),
    routeLabels: Array.isArray(route.routeLabels) ? route.routeLabels : [],
    localizedValues: route.localizedValues || null,
    path,
  };
}

async function computeDualTripRoutes(pickup, dropoff, emissionType) {
  // 1. Try server-side Routes API v2 proxy
  try {
    const response = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: buildRestWaypoint(pickup),
        destination: buildRestWaypoint(dropoff),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        requestedReferenceRoutes: ['FUEL_EFFICIENT'],
        extraComputations: ['FUEL_CONSUMPTION'],
        routeModifiers: {
          vehicleInfo: { emissionType },
        },
        languageCode: 'en-US',
        units: 'IMPERIAL',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.routes) && data.routes.length > 0) {
        return data.routes.map(normalizeRestRoute);
      }
    }
  } catch {
    // Fallback to Maps JS Routes SDK below
  }

  // 2. Fallback to Maps JS SDK Route.computeRoutes
  const { Route } = state.libs.routes;
  const { routes } = await Route.computeRoutes({
    origin: pickup.location,
    destination: dropoff.location,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    requestedReferenceRoutes: ['FUEL_EFFICIENT'],
    extraComputations: ['FUEL_CONSUMPTION'],
    routeModifiers: {
      vehicleInfo: { emissionType },
    },
    internalUsageAttributionIds: [ATTRIBUTION_ID],
    fields: [
      'distanceMeters',
      'durationMillis',
      'staticDurationMillis',
      'path',
      'routeLabels',
      'travelAdvisory',
      'localizedValues',
    ],
  });

  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('No driving routes found between the selected Los Angeles locations.');
  }
  return routes.map(normalizeJsSdkRoute);
}

async function computeSingleApproachRoute(originLatLng, destinationPlace) {
  try {
    const response = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: buildRestWaypoint(originLatLng),
        destination: buildRestWaypoint(destinationPlace),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        languageCode: 'en-US',
        units: 'IMPERIAL',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.routes) && data.routes.length > 0) {
        return normalizeRestRoute(data.routes[0]);
      }
    }
  } catch {
    // Fallback below
  }

  const { Route } = state.libs.routes;
  const { routes } = await Route.computeRoutes({
    origin: originLatLng,
    destination: destinationPlace.location,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    internalUsageAttributionIds: [ATTRIBUTION_ID],
    fields: ['distanceMeters', 'durationMillis', 'path'],
  });

  if (Array.isArray(routes) && routes.length > 0) {
    return normalizeJsSdkRoute(routes[0]);
  }
  return {
    distanceMeters: Math.round(
      state.libs.geometry.spherical.computeDistanceBetween(originLatLng, destinationPlace.location)
    ),
    durationSeconds: 180,
    path: [originLatLng, destinationPlace.location],
  };
}

function buildCandidateDrivers(pickupLatLng) {
  return DRIVER_TEMPLATES.map((tpl) => ({
    ...tpl,
    location: {
      lat: Number((pickupLatLng.lat + tpl.offsetLat).toFixed(6)),
      lng: Number((pickupLatLng.lng + tpl.offsetLng).toFixed(6)),
    },
    etaSeconds: null,
    distanceMeters: null,
  }));
}

async function evaluateDriverMatrix(candidates, pickupPlace) {
  // 1. Try server-side Routes API Distance Matrix proxy
  try {
    const response = await fetch('/api/routes/matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origins: candidates.map((c) => ({ waypoint: buildRestWaypoint(c.location) })),
        destinations: [{ waypoint: buildRestWaypoint(pickupPlace) }],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      }),
    });

    if (response.ok) {
      const elements = await response.json();
      if (Array.isArray(elements) && elements.length > 0) {
        const enriched = candidates.map((driver, idx) => {
          const item = elements.find((el) => el.originIndex === idx);
          const valid = item && item.condition === 'ROUTE_EXISTS';
          return {
            ...driver,
            etaSeconds: valid ? parseDurationSeconds(item.duration) : 9999,
            distanceMeters: valid ? Number(item.distanceMeters || 0) : 99999,
          };
        });
        enriched.sort((a, b) => a.etaSeconds - b.etaSeconds);
        return enriched;
      }
    }
  } catch {
    // Fallback below
  }

  // 2. Fallback: Maps JS RouteMatrix or spherical distance estimate
  const { spherical } = state.libs.geometry;
  const enriched = candidates.map((driver) => {
    const straightMeters = spherical.computeDistanceBetween(driver.location, pickupPlace.location);
    const roadMeters = Math.round(straightMeters * 1.32);
    const etaSeconds = Math.max(90, Math.round(roadMeters / 7.5));
    return {
      ...driver,
      distanceMeters: roadMeters,
      etaSeconds,
    };
  });
  enriched.sort((a, b) => a.etaSeconds - b.etaSeconds);
  return enriched;
}

function createVehicleMarkerElement() {
  const wrapper = document.createElement('div');
  wrapper.className = 'driver-marker-badge';
  wrapper.style.width = '36px';
  wrapper.style.height = '36px';
  wrapper.style.borderRadius = '50%';
  wrapper.style.background = '#0f172a';
  wrapper.style.border = '2.5px solid #ffffff';
  wrapper.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.4)';
  wrapper.style.display = 'grid';
  wrapper.style.placeItems = 'center';
  wrapper.style.transformOrigin = 'center center';
  wrapper.style.transition = 'transform 100ms linear';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');

  const arrow = document.createElementNS(svgNS, 'path');
  arrow.setAttribute('d', 'M12 2L19 20L12 16.5L5 20L12 2Z');
  arrow.setAttribute('fill', '#34d399');
  svg.appendChild(arrow);
  wrapper.appendChild(svg);
  return wrapper;
}

function buildPathTimeline(path) {
  const { spherical } = state.libs.geometry;
  if (!Array.isArray(path) || path.length === 0) {
    return { points: [], cumulative: [0], totalMeters: 0 };
  }
  if (path.length === 1) {
    return { points: path, cumulative: [0], totalMeters: 0 };
  }

  const cumulative = [0];
  let totalMeters = 0;
  for (let i = 1; i < path.length; i += 1) {
    const seg = spherical.computeDistanceBetween(path[i - 1], path[i]);
    totalMeters += seg;
    cumulative.push(totalMeters);
  }
  return { points: path, cumulative, totalMeters };
}

function sampleTimeline(timeline, progress) {
  const { spherical } = state.libs.geometry;
  const clamped = Math.min(1, Math.max(0, progress));
  const { points, cumulative, totalMeters } = timeline;

  if (points.length === 0) return null;
  if (points.length === 1 || totalMeters <= 0) {
    return { position: points[0], heading: 0 };
  }

  const targetDist = clamped * totalMeters;
  let idx = 1;
  while (idx < cumulative.length - 1 && cumulative[idx] < targetDist) {
    idx += 1;
  }

  const startDist = cumulative[idx - 1];
  const endDist = cumulative[idx];
  const segLen = endDist - startDist;
  const frac = segLen > 0 ? (targetDist - startDist) / segLen : 0;

  const fromPt = points[idx - 1];
  const toPt = points[idx];
  const position = spherical.interpolate(fromPt, toPt, frac);
  const heading = spherical.computeHeading(fromPt, toPt);
  return { position, heading };
}

function clearMapOverlays() {
  if (state.fastestPolyline) {
    state.fastestPolyline.setMap(null);
    state.fastestPolyline = null;
  }
  if (state.ecoPolyline) {
    state.ecoPolyline.setMap(null);
    state.ecoPolyline = null;
  }
  if (state.approachPolyline) {
    state.approachPolyline.setMap(null);
    state.approachPolyline = null;
  }
  if (state.pickupMarker) {
    state.pickupMarker.map = null;
    state.pickupMarker = null;
  }
  if (state.dropoffMarker) {
    state.dropoffMarker.map = null;
    state.dropoffMarker = null;
  }
  for (const m of state.candidateMarkers) {
    m.map = null;
  }
  state.candidateMarkers = [];
  if (state.driverMarker) {
    state.driverMarker.map = null;
    state.driverMarker = null;
  }
}

function getActiveTripRoute() {
  if (state.selectedRouteKey === 'eco' && state.ecoRoute) {
    return state.ecoRoute;
  }
  return state.fastestRoute || state.ecoRoute;
}

function updatePolylineStyles() {
  const isFastest = state.selectedRouteKey === 'fastest';
  if (state.fastestPolyline) {
    state.fastestPolyline.setOptions({
      strokeColor: '#2563eb',
      strokeOpacity: isFastest ? 0.95 : 0.45,
      strokeWeight: isFastest ? 6 : 4,
      zIndex: isFastest ? 4 : 2,
    });
  }
  if (state.ecoPolyline) {
    state.ecoPolyline.setOptions({
      strokeColor: '#059669',
      strokeOpacity: !isFastest ? 0.95 : 0.55,
      strokeWeight: !isFastest ? 6 : 4,
      zIndex: !isFastest ? 4 : 3,
    });
  }
}

function renderRouteComparisonUI() {
  const fastest = state.fastestRoute;
  const eco = state.ecoRoute;
  if (!fastest || !eco) return;

  dom.fastestDuration.textContent = formatMinutes(fastest.durationSeconds);
  dom.fastestDistance.textContent = formatMiles(fastest.distanceMeters);
  dom.fastestFuel.textContent = formatEnergyConsumption(
    fastest.fuelMicroliters,
    state.emissionType
  );
  dom.fastestSubnote.textContent =
    fastest.routeLabels.join(', ') || 'DEFAULT_ROUTE';

  dom.ecoDuration.textContent = formatMinutes(eco.durationSeconds);
  dom.ecoDistance.textContent = formatMiles(eco.distanceMeters);
  dom.ecoFuel.textContent = formatEnergyConsumption(
    eco.fuelMicroliters,
    state.emissionType
  );
  dom.ecoSubnote.textContent =
    eco.routeLabels.join(', ') || 'FUEL_EFFICIENT';

  dom.routeOptionFastest.classList.toggle('is-selected', state.selectedRouteKey === 'fastest');
  dom.routeOptionEco.classList.toggle('is-selected', state.selectedRouteKey === 'eco');

  // Eco savings comparison
  const fastestFuel = fastest.fuelMicroliters || 0;
  const ecoFuel = eco.fuelMicroliters || 0;
  if (fastestFuel > 0 && ecoFuel > 0 && fastestFuel > ecoFuel) {
    const savedMicroliters = fastestFuel - ecoFuel;
    const pctSaved = ((savedMicroliters / fastestFuel) * 100).toFixed(1);
    const savedEnergyText = formatEnergyConsumption(savedMicroliters, state.emissionType);
    const savedCo2Kg = estimateCo2Kg(savedMicroliters, state.emissionType);
    const timeDeltaMin = Math.round((eco.durationSeconds - fastest.durationSeconds) / 60);
    const timeNote =
      timeDeltaMin > 0
        ? ` (+${timeDeltaMin} min vs. fastest)`
        : timeDeltaMin === 0
          ? ' (same ETA)'
          : ` (${Math.abs(timeDeltaMin)} min faster)`;

    dom.ecoSavingsBanner.textContent = `Eco-Friendly route saves ${pctSaved}% energy — ${savedEnergyText} & ~${savedCo2Kg.toFixed(
      2
    )} kg CO₂${timeNote}.`;
  } else {
    const totalCo2 = estimateCo2Kg(ecoFuel || fastestFuel, state.emissionType);
    dom.ecoSavingsBanner.textContent = `Traffic-aware fastest path is already the optimal low-emission route (~${totalCo2.toFixed(
      2
    )} kg CO₂ est.).`;
  }
}

function computeTierFare(tierKey, route) {
  const rate = FARE_RATES[tierKey];
  const miles = metersToMiles(route.distanceMeters);
  const mins = route.durationSeconds / 60;
  const distanceCost = miles * rate.perMile;
  const timeCost = mins * rate.perMinute;
  const rawTotal = rate.base + distanceCost + timeCost;
  const total = Math.max(rate.minFare, rawTotal);
  return {
    total,
    miles,
    mins,
    base: rate.base,
    distanceCost,
    timeCost,
  };
}

function renderFareEstimatorUI() {
  const activeRoute = getActiveTripRoute();
  if (!activeRoute) return;

  dom.fareRouteBasis.textContent =
    state.selectedRouteKey === 'eco' ? 'Based on Eco-Friendly Route' : 'Based on Fastest Route';

  const econ = computeTierFare('economy', activeRoute);
  const comfort = computeTierFare('comfort', activeRoute);
  const green = computeTierFare('green', activeRoute);

  dom.fareEconomyPrice.textContent = `$${econ.total.toFixed(2)}`;
  dom.fareEconomyBreakdown.textContent = `Base $${econ.base.toFixed(2)} + ${econ.miles.toFixed(
    1
  )} mi ($${econ.distanceCost.toFixed(2)}) + ${Math.round(econ.mins)} min ($${econ.timeCost.toFixed(
    2
  )})`;

  dom.fareComfortPrice.textContent = `$${comfort.total.toFixed(2)}`;
  dom.fareComfortBreakdown.textContent = `Base $${comfort.base.toFixed(2)} + ${comfort.miles.toFixed(
    1
  )} mi ($${comfort.distanceCost.toFixed(2)}) + ${Math.round(
    comfort.mins
  )} min ($${comfort.timeCost.toFixed(2)})`;

  dom.fareGreenPrice.textContent = `$${green.total.toFixed(2)}`;
  dom.fareGreenBreakdown.textContent = `Base $${green.base.toFixed(2)} + ${green.miles.toFixed(
    1
  )} mi ($${green.distanceCost.toFixed(2)}) + ${Math.round(green.mins)} min ($${green.timeCost.toFixed(
    2
  )})`;

  const greenRoute = state.ecoRoute || activeRoute;
  const greenCo2 = estimateCo2Kg(greenRoute.fuelMicroliters, 'ELECTRIC');
  const gasCo2 = estimateCo2Kg(
    (state.fastestRoute || activeRoute).fuelMicroliters,
    'GASOLINE'
  );
  const co2Reduction = Math.max(0, gasCo2 - greenCo2);
  dom.fareGreenCallout.textContent =
    co2Reduction > 0.05
      ? `EV/Hybrid fleet saves ~${co2Reduction.toFixed(2)} kg CO₂ vs. standard gas ride`
      : 'Low-emission EV/Hybrid vehicle dispatch';

  dom.fareEconomyCard.classList.toggle('is-selected', state.selectedTier === 'economy');
  dom.fareComfortCard.classList.toggle('is-selected', state.selectedTier === 'comfort');
  dom.fareGreenCard.classList.toggle('is-selected', state.selectedTier === 'green');
}

function renderCandidateDriversList() {
  const items = state.candidateDrivers.map((driver, index) => {
    const li = document.createElement('li');
    li.className = index === 0 ? 'candidate-row is-closest' : 'candidate-row';

    const left = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'candidate-name';
    nameEl.textContent =
      index === 0 ? `${driver.name} (Closest)` : driver.name;

    const vehicleEl = document.createElement('div');
    vehicleEl.className = 'candidate-vehicle';
    vehicleEl.textContent = `${driver.vehicle} · ${driver.emissionType} · ★ ${driver.rating}`;

    left.appendChild(nameEl);
    left.appendChild(vehicleEl);

    const right = document.createElement('div');
    right.className = 'candidate-eta';
    const etaSpan = document.createElement('div');
    etaSpan.textContent = formatMinutes(driver.etaSeconds);
    const distSpan = document.createElement('div');
    distSpan.className = 'candidate-dist';
    distSpan.textContent = formatMiles(driver.distanceMeters);
    right.appendChild(etaSpan);
    right.appendChild(distSpan);

    li.appendChild(left);
    li.appendChild(right);
    return li;
  });

  dom.candidateDriversList.replaceChildren(...items);
}

function renderMarkersAndPolylines() {
  clearMapOverlays();

  const { Polyline } = state.libs.maps;
  const { AdvancedMarkerElement, PinElement } = state.libs.marker;
  const { LatLngBounds } = state.libs.core;

  const bounds = new LatLngBounds();

  if (state.fastestRoute?.path?.length) {
    state.fastestPolyline = new Polyline({
      path: state.fastestRoute.path,
      map: state.map,
      geodesic: true,
    });
    state.fastestPolyline.addListener('click', () => selectRoute('fastest'));
    for (const pt of state.fastestRoute.path) bounds.extend(pt);
  }

  if (state.ecoRoute?.path?.length) {
    state.ecoPolyline = new Polyline({
      path: state.ecoRoute.path,
      map: state.map,
      geodesic: true,
    });
    state.ecoPolyline.addListener('click', () => selectRoute('eco'));
    for (const pt of state.ecoRoute.path) bounds.extend(pt);
  }

  if (state.approachRoute?.path?.length) {
    state.approachPolyline = new Polyline({
      path: state.approachRoute.path,
      map: state.map,
      strokeColor: '#f59e0b',
      strokeOpacity: 0,
      strokeWeight: 4,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.95,
            scale: 3,
          },
          offset: '0',
          repeat: '12px',
        },
      ],
      zIndex: 3,
    });
    for (const pt of state.approachRoute.path) bounds.extend(pt);
  }

  updatePolylineStyles();

  // Pickup AdvancedMarkerElement
  if (state.pickupPlace) {
    const pickupPin = new PinElement({
      background: '#059669',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: 'P',
      scale: 1.15,
    });
    state.pickupMarker = new AdvancedMarkerElement({
      map: state.map,
      position: state.pickupPlace.location,
      content: pickupPin,
      title: `Pickup: ${state.pickupPlace.displayName}`,
      zIndex: 10,
    });
    state.pickupMarker.addEventListener('click', () => {
      state.infoWindow.setContent(buildInfoWindowNode('Pickup', state.pickupPlace));
      state.infoWindow.open({ map: state.map, anchor: state.pickupMarker });
    });
    bounds.extend(state.pickupPlace.location);
  }

  // Drop-off AdvancedMarkerElement
  if (state.dropoffPlace) {
    const dropoffPin = new PinElement({
      background: '#dc2626',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: 'D',
      scale: 1.15,
    });
    state.dropoffMarker = new AdvancedMarkerElement({
      map: state.map,
      position: state.dropoffPlace.location,
      content: dropoffPin,
      title: `Drop-off: ${state.dropoffPlace.displayName}`,
      zIndex: 10,
    });
    state.dropoffMarker.addEventListener('click', () => {
      state.infoWindow.setContent(buildInfoWindowNode('Drop-off', state.dropoffPlace));
      state.infoWindow.open({ map: state.map, anchor: state.dropoffMarker });
    });
    bounds.extend(state.dropoffPlace.location);
  }

  // Candidate nearby drivers (skip closest one since it becomes the live animated driver)
  for (let i = 1; i < state.candidateDrivers.length; i += 1) {
    const cand = state.candidateDrivers[i];
    const candPin = new PinElement({
      background: '#475569',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: String(i + 1),
      scale: 0.85,
    });
    const candMarker = new AdvancedMarkerElement({
      map: state.map,
      position: cand.location,
      content: candPin,
      title: `${cand.name} (${cand.vehicle}) · ${formatMinutes(cand.etaSeconds)} away`,
      zIndex: 6,
    });
    state.candidateMarkers.push(candMarker);
    bounds.extend(cand.location);
  }

  // Live animated driver AdvancedMarkerElement
  if (state.dispatchedDriver) {
    const badge = createVehicleMarkerElement();
    state.driverBadgeEl = badge;
    state.driverMarker = new AdvancedMarkerElement({
      map: state.map,
      position: state.dispatchedDriver.location,
      content: badge,
      title: `Dispatched Driver: ${state.dispatchedDriver.name} (${state.dispatchedDriver.vehicle})`,
      zIndex: 20,
    });
    bounds.extend(state.dispatchedDriver.location);
  }

  state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 88, left: 48 });
}

function buildInfoWindowNode(role, place) {
  const box = document.createElement('div');
  box.style.fontFamily = 'inherit';
  box.style.padding = '2px 4px';

  const badge = document.createElement('div');
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '700';
  badge.style.textTransform = 'uppercase';
  badge.style.color = role === 'Pickup' ? '#059669' : '#dc2626';
  badge.textContent = role;

  const title = document.createElement('div');
  title.style.fontSize = '13.5px';
  title.style.fontWeight = '700';
  title.style.color = '#0f172a';
  title.textContent = place.displayName;

  const addr = document.createElement('div');
  addr.style.fontSize = '12px';
  addr.style.color = '#475569';
  addr.textContent = place.formattedAddress;

  box.appendChild(badge);
  box.appendChild(title);
  box.appendChild(addr);
  return box;
}

function stopSimulationLoop() {
  if (state.sim.rafId !== null) {
    cancelAnimationFrame(state.sim.rafId);
    state.sim.rafId = null;
  }
}

function updateLiveEtaDisplay() {
  const sim = state.sim;
  const driver = state.dispatchedDriver;
  const tripRoute = getActiveTripRoute();
  const approach = state.approachRoute;

  if (!driver || !tripRoute || !approach) return;

  dom.dispatchedDriverMeta.textContent = `${driver.name} · ${driver.vehicle} (${driver.emissionType}) · ★ ${driver.rating}`;

  if (sim.phase === 'EN_ROUTE_TO_PICKUP') {
    const remainingFrac = Math.max(0, 1 - sim.progress);
    const etaSec = Math.max(1, Math.round(approach.durationSeconds * remainingFrac));
    const remMeters = approach.distanceMeters * remainingFrac;

    dom.driverPhaseLabel.textContent = 'Driver en route to pickup';
    dom.driverEtaCountdown.textContent = formatCountdown(etaSec);
    dom.driverDistanceRemaining.textContent = `${formatMiles(remMeters)} to pickup`;
    dom.driverProgressBar.style.width = `${Math.round(sim.progress * 30)}%`;
    setHeaderStatus(
      sim.isPaused ? 'Simulation paused' : `Pickup ETA ${formatCountdown(etaSec)}`,
      sim.isPaused ? 'paused' : 'active'
    );
  } else if (sim.phase === 'TRIP_IN_PROGRESS') {
    const remainingFrac = Math.max(0, 1 - sim.progress);
    const etaSec = Math.max(1, Math.round(tripRoute.durationSeconds * remainingFrac));
    const remMeters = tripRoute.distanceMeters * remainingFrac;

    dom.driverPhaseLabel.textContent = 'Trip in progress to drop-off';
    dom.driverEtaCountdown.textContent = formatCountdown(etaSec);
    dom.driverDistanceRemaining.textContent = `${formatMiles(remMeters)} to drop-off`;
    dom.driverProgressBar.style.width = `${30 + Math.round(sim.progress * 70)}%`;
    setHeaderStatus(
      sim.isPaused ? 'Simulation paused' : `Drop-off ETA ${formatCountdown(etaSec)}`,
      sim.isPaused ? 'paused' : 'active'
    );
  } else if (sim.phase === 'ARRIVED') {
    dom.driverPhaseLabel.textContent = 'Arrived at destination';
    dom.driverEtaCountdown.textContent = '0s';
    dom.driverDistanceRemaining.textContent = '0.0 mi remaining';
    dom.driverProgressBar.style.width = '100%';
    setHeaderStatus('Trip completed', 'active');
  }
}

function stepSimulation(now) {
  const sim = state.sim;
  if (sim.isPaused || sim.phase === 'ARRIVED' || sim.phase === 'IDLE') {
    sim.rafId = null;
    return;
  }

  const dtSec = Math.min(0.1, Math.max(0, (now - sim.lastFrameTs) / 1000));
  sim.lastFrameTs = now;

  // Smooth demo playback: ~14s for pickup approach, ~28s for main LA trip
  const phaseDurationDemoSec = sim.phase === 'EN_ROUTE_TO_PICKUP' ? 14 : 28;
  sim.progress += dtSec / phaseDurationDemoSec;

  if (sim.phase === 'EN_ROUTE_TO_PICKUP') {
    if (sim.progress >= 1) {
      sim.phase = 'TRIP_IN_PROGRESS';
      sim.progress = 0;
    } else {
      const sample = sampleTimeline(sim.approachTimeline, sim.progress);
      if (sample && state.driverMarker) {
        state.driverMarker.position = sample.position;
        if (state.driverBadgeEl) {
          state.driverBadgeEl.style.transform = `rotate(${Math.round(sample.heading)}deg)`;
        }
      }
    }
  }

  if (sim.phase === 'TRIP_IN_PROGRESS') {
    if (sim.progress >= 1) {
      sim.progress = 1;
      sim.phase = 'ARRIVED';
      const endSample = sampleTimeline(sim.tripTimeline, 1);
      if (endSample && state.driverMarker) {
        state.driverMarker.position = endSample.position;
      }
      updateLiveEtaDisplay();
      sim.rafId = null;
      return;
    }
    const sample = sampleTimeline(sim.tripTimeline, sim.progress);
    if (sample && state.driverMarker) {
      state.driverMarker.position = sample.position;
      if (state.driverBadgeEl) {
        state.driverBadgeEl.style.transform = `rotate(${Math.round(sample.heading)}deg)`;
      }
    }
  }

  updateLiveEtaDisplay();
  sim.rafId = requestAnimationFrame(stepSimulation);
}

function startDriverSimulation() {
  stopSimulationLoop();
  const activeRoute = getActiveTripRoute();
  if (!state.approachRoute || !activeRoute) return;

  state.sim.approachTimeline = buildPathTimeline(state.approachRoute.path);
  state.sim.tripTimeline = buildPathTimeline(activeRoute.path);
  state.sim.phase = 'EN_ROUTE_TO_PICKUP';
  state.sim.progress = 0;
  state.sim.isPaused = false;
  dom.toggleSimulationBtn.textContent = 'Pause Simulation';
  dom.toggleSimulationBtn.disabled = false;

  const initialSample = sampleTimeline(state.sim.approachTimeline, 0);
  if (initialSample && state.driverMarker) {
    state.driverMarker.position = initialSample.position;
    if (state.driverBadgeEl) {
      state.driverBadgeEl.style.transform = `rotate(${Math.round(initialSample.heading)}deg)`;
    }
  }

  updateLiveEtaDisplay();
  state.sim.lastFrameTs = performance.now();
  state.sim.rafId = requestAnimationFrame(stepSimulation);
}

function toggleSimulationPause() {
  if (state.sim.phase === 'IDLE') return;
  if (state.sim.phase === 'ARRIVED') {
    startDriverSimulation();
    return;
  }
  state.sim.isPaused = !state.sim.isPaused;
  dom.toggleSimulationBtn.textContent = state.sim.isPaused
    ? 'Resume Simulation'
    : 'Pause Simulation';

  updateLiveEtaDisplay();
  if (!state.sim.isPaused) {
    state.sim.lastFrameTs = performance.now();
    state.sim.rafId = requestAnimationFrame(stepSimulation);
  } else {
    stopSimulationLoop();
  }
}

function selectRoute(routeKey) {
  state.selectedRouteKey = routeKey;
  updatePolylineStyles();
  renderRouteComparisonUI();
  renderFareEstimatorUI();

  const activeRoute = getActiveTripRoute();
  if (activeRoute) {
    state.sim.tripTimeline = buildPathTimeline(activeRoute.path);
    updateLiveEtaDisplay();
  }
}

function selectFareTier(tierKey) {
  state.selectedTier = tierKey;
  if (tierKey === 'green' && state.ecoRoute && state.selectedRouteKey !== 'eco') {
    selectRoute('eco');
    return;
  }
  renderFareEstimatorUI();
}

function syncTripLabels() {
  if (!state.pickupPlace || !state.dropoffPlace) return;
  dom.pickupResolvedLabel.textContent = state.pickupPlace.formattedAddress;
  dom.dropoffResolvedLabel.textContent = state.dropoffPlace.formattedAddress;
  dom.headerTripSummary.textContent = `${state.pickupPlace.displayName} → ${state.dropoffPlace.displayName}`;
}

async function refreshTripAndDispatch() {
  if (!state.pickupPlace || !state.dropoffPlace) return;

  const seq = ++state.requestSeq;
  hideNotice();
  setHeaderStatus('Computing routes & dispatch…', 'neutral');
  stopSimulationLoop();

  try {
    const candidates = buildCandidateDrivers(state.pickupPlace.location);

    const [routes, evaluatedDrivers] = await Promise.all([
      computeDualTripRoutes(state.pickupPlace, state.dropoffPlace, state.emissionType),
      evaluateDriverMatrix(candidates, state.pickupPlace),
    ]);

    if (seq !== state.requestSeq) return;

    const fastest =
      routes.find((r) => r.routeLabels.includes('DEFAULT_ROUTE')) || routes[0];
    const eco =
      routes.find((r) => r.routeLabels.includes('FUEL_EFFICIENT')) ||
      routes[1] ||
      fastest;

    state.fastestRoute = fastest;
    state.ecoRoute = eco;
    state.candidateDrivers = evaluatedDrivers;
    state.dispatchedDriver = evaluatedDrivers[0];

    const approachRoute = await computeSingleApproachRoute(
      state.dispatchedDriver.location,
      state.pickupPlace
    );

    if (seq !== state.requestSeq) return;

    state.approachRoute = approachRoute;

    syncTripLabels();
    renderRouteComparisonUI();
    renderFareEstimatorUI();
    renderCandidateDriversList();
    renderMarkersAndPolylines();
    startDriverSimulation();
  } catch (err) {
    if (seq !== state.requestSeq) return;
    setHeaderStatus('Route computation error', 'error');
    showNotice(
      `Unable to compute routes or dispatch drivers: ${err?.message || 'Unexpected error'}`,
      true
    );
  }
}

function mountAutocompleteWidgets() {
  const { PlaceAutocompleteElement } = state.libs.places;
  const { Circle } = state.libs.maps;

  const laBias = new Circle({ center: LA_CENTER, radius: 45000 });

  const pickupEl = new PlaceAutocompleteElement({
    includedRegionCodes: ['us'],
    locationBias: laBias,
    internalUsageAttributionIds: [ATTRIBUTION_ID],
  });
  pickupEl.placeholder = 'Search Los Angeles pickup…';
  pickupEl.value = SEED_PICKUP_QUERY;

  const dropoffEl = new PlaceAutocompleteElement({
    includedRegionCodes: ['us'],
    locationBias: laBias,
    internalUsageAttributionIds: [ATTRIBUTION_ID],
  });
  dropoffEl.placeholder = 'Search Los Angeles drop-off…';
  dropoffEl.value = SEED_DROPOFF_QUERY;

  pickupEl.addEventListener('gmp-select', async (event) => {
    try {
      const prediction = event.placePrediction;
      if (!prediction) return;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      const coords = toLatLngLiteral(place.location);
      if (!coords) return;
      state.pickupPlace = {
        id: place.id || '',
        displayName: place.displayName || place.formattedAddress || 'Pickup',
        formattedAddress: place.formattedAddress || place.displayName || '',
        location: coords,
      };
      await refreshTripAndDispatch();
    } catch (err) {
      showNotice(`Pickup selection failed: ${err?.message || 'Unknown error'}`, true);
    }
  });

  dropoffEl.addEventListener('gmp-select', async (event) => {
    try {
      const prediction = event.placePrediction;
      if (!prediction) return;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      const coords = toLatLngLiteral(place.location);
      if (!coords) return;
      state.dropoffPlace = {
        id: place.id || '',
        displayName: place.displayName || place.formattedAddress || 'Drop-off',
        formattedAddress: place.formattedAddress || place.displayName || '',
        location: coords,
      };
      await refreshTripAndDispatch();
    } catch (err) {
      showNotice(`Drop-off selection failed: ${err?.message || 'Unknown error'}`, true);
    }
  });

  dom.pickupAutocompleteWrap.replaceChildren(pickupEl);
  dom.dropoffAutocompleteWrap.replaceChildren(dropoffEl);
  state.pickupEl = pickupEl;
  state.dropoffEl = dropoffEl;
}

function wireControls() {
  dom.swapLocationsBtn.addEventListener('click', async () => {
    if (!state.pickupPlace || !state.dropoffPlace) return;
    const prevPickup = state.pickupPlace;
    state.pickupPlace = state.dropoffPlace;
    state.dropoffPlace = prevPickup;

    if (state.pickupEl) state.pickupEl.value = state.pickupPlace.displayName;
    if (state.dropoffEl) state.dropoffEl.value = state.dropoffPlace.displayName;
    await refreshTripAndDispatch();
  });

  dom.emissionTypeSelect.addEventListener('change', async (e) => {
    state.emissionType = e.target.value;
    await refreshTripAndDispatch();
  });

  dom.routeOptionFastest.addEventListener('click', () => selectRoute('fastest'));
  dom.routeOptionEco.addEventListener('click', () => selectRoute('eco'));

  dom.fareEconomyCard.addEventListener('click', () => selectFareTier('economy'));
  dom.fareComfortCard.addEventListener('click', () => selectFareTier('comfort'));
  dom.fareGreenCard.addEventListener('click', () => selectFareTier('green'));

  dom.dispatchDriverBtn.addEventListener('click', () => startDriverSimulation());
  dom.toggleSimulationBtn.addEventListener('click', () => toggleSimulationPause());
}

async function init() {
  wireControls();

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  if (!apiKey) {
    setHeaderStatus('API key required', 'error');
    dom.toggleSimulationBtn.disabled = true;
    dom.dispatchDriverBtn.disabled = true;
    showNotice(
      'Missing GOOGLE_MAPS_API_KEY in .env. Add a valid key (or a free prototyping Maps Demo Key from https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) and reload.',
      false
    );
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
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

    state.libs = {
      core: coreLib,
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      geometry: geometryLib,
    };

    state.map = new mapsLib.Map(dom.mapContainer, {
      center: LA_CENTER,
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.infoWindow = new mapsLib.InfoWindow();

    mountAutocompleteWidgets();

    setHeaderStatus('Resolving LA trip…', 'neutral');
    const [pickup, dropoff] = await Promise.all([
      resolvePlaceByText(SEED_PICKUP_QUERY),
      resolvePlaceByText(SEED_DROPOFF_QUERY),
    ]);

    state.pickupPlace = pickup;
    state.dropoffPlace = dropoff;
    if (state.pickupEl) state.pickupEl.value = pickup.displayName;
    if (state.dropoffEl) state.dropoffEl.value = dropoff.displayName;

    await refreshTripAndDispatch();
  } catch (err) {
    setHeaderStatus('Initialization failed', 'error');
    showNotice(
      `Failed to initialize Google Maps Platform services: ${err?.message || 'Unknown error'}`,
      true
    );
  }
}

void init();
