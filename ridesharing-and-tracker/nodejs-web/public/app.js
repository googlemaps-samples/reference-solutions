// MetroPulse Rideshare — Los Angeles Passenger Booking & Live Driver Dispatch
// Zero-deprecation Google Maps Platform Web Client:
// - Dynamic bootstrap + google.maps.importLibrary()
// - AdvancedMarkerElement + PinElement (no google.maps.Marker)
// - PlaceAutocompleteElement + gmp-select (no legacy Autocomplete)
// - Server-side BFF proxies for Places API (New) & Routes API v2
// - Zero innerHTML/outerHTML/document.write usage

const LA_CENTER = { lat: 34.0328, lng: -118.3669 };
const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

// Simulated Los Angeles candidate fleet staging locations (relative to LA Metro)
const CANDIDATE_FLEET = [
  {
    id: 'drv-elena',
    name: 'Elena Morales',
    initials: 'EM',
    vehicle: '2024 Toyota Prius Prime (Hybrid)',
    plate: '8ECO412',
    rating: '4.96',
    lat: 34.0472,
    lng: -118.2328, // Arts District
  },
  {
    id: 'drv-marcus',
    name: 'Marcus Chen',
    initials: 'MC',
    vehicle: '2025 Hyundai Ioniq 6 (EV)',
    plate: '9EVX704',
    rating: '4.94',
    lat: 34.0508,
    lng: -118.2551, // Bunker Hill
  },
  {
    id: 'drv-priya',
    name: 'Priya Nair',
    initials: 'PN',
    vehicle: '2024 Honda Accord Hybrid',
    plate: '8HYB219',
    rating: '4.91',
    lat: 34.0618,
    lng: -118.2996, // Koreatown
  },
  {
    id: 'drv-devon',
    name: 'Devon Brooks',
    initials: 'DB',
    vehicle: '2024 Kia EV6 Long Range',
    plate: '9ZEV883',
    rating: '4.97',
    lat: 34.0259,
    lng: -118.3965, // Culver City
  },
  {
    id: 'drv-sofia',
    name: 'Sofia Alvarez',
    initials: 'SA',
    vehicle: '2023 Toyota Camry LE',
    plate: '8LAJ550',
    rating: '4.89',
    lat: 34.0195,
    lng: -118.4912, // Santa Monica Midtown
  },
];

const state = {
  config: null,
  mapsReady: false,
  map: null,
  libs: {},
  pickupPlace: null,
  dropoffPlace: null,
  pickupAutocomplete: null,
  dropoffAutocomplete: null,
  emissionType: 'GASOLINE',
  selectedRouteType: 'fastest', // 'fastest' | 'eco'
  selectedFareTier: 'economy', // 'economy' | 'comfort' | 'green'
  fastestRoute: null,
  ecoRoute: null,
  routesConverged: false,
  polylines: {
    fastest: null,
    eco: null,
    approach: null,
  },
  markers: {
    pickup: null,
    dropoff: null,
    driver: null,
    candidates: [],
  },
  driverCarIconWrap: null,
  assignedDriver: null,
  candidateEtas: [],
  simulation: {
    running: false,
    paused: false,
    phase: 'STANDBY', // 'STANDBY' | 'TO_PICKUP' | 'ON_TRIP' | 'ARRIVED'
    rafId: null,
    lastFrameTs: 0,
    progressMeters: 0,
    approachPath: [],
    approachTotalMeters: 0,
    approachDurationSec: 0,
    tripPath: [],
    tripTotalMeters: 0,
    tripDurationSec: 0,
    speedMultiplier: 18, // Smooth demo speed so full LA trip animates observably
  },
};

const dom = {
  headerTripSummary: document.getElementById('header-trip-summary'),
  headerDispatchStatus: document.getElementById('header-dispatch-status'),
  pickupHost: document.getElementById('pickup-autocomplete-host'),
  dropoffHost: document.getElementById('dropoff-autocomplete-host'),
  pickupAddressMeta: document.getElementById('pickup-resolved-address'),
  dropoffAddressMeta: document.getElementById('dropoff-resolved-address'),
  swapBtn: document.getElementById('swap-locations-btn'),
  emissionSelect: document.getElementById('emission-type-select'),
  routeFastestBtn: document.getElementById('route-option-fastest'),
  routeEcoBtn: document.getElementById('route-option-eco'),
  fastestDuration: document.getElementById('fastest-duration'),
  fastestDistance: document.getElementById('fastest-distance'),
  fastestFuel: document.getElementById('fastest-fuel'),
  ecoDuration: document.getElementById('eco-duration'),
  ecoDistance: document.getElementById('eco-distance'),
  ecoFuel: document.getElementById('eco-fuel'),
  ecoSavingsBanner: document.getElementById('eco-savings-banner'),
  fareRouteTag: document.getElementById('fare-route-tag'),
  fareEconomyBtn: document.getElementById('fare-tier-economy'),
  fareComfortBtn: document.getElementById('fare-tier-comfort'),
  fareGreenBtn: document.getElementById('fare-tier-green'),
  fareEconomyPrice: document.getElementById('fare-economy-price'),
  fareEconomyBreakdown: document.getElementById('fare-economy-breakdown'),
  fareComfortPrice: document.getElementById('fare-comfort-price'),
  fareComfortBreakdown: document.getElementById('fare-comfort-breakdown'),
  fareGreenPrice: document.getElementById('fare-green-price'),
  fareGreenBreakdown: document.getElementById('fare-green-breakdown'),
  fareGreenSavings: document.getElementById('fare-green-savings'),
  dispatchPhaseTag: document.getElementById('dispatch-phase-tag'),
  driverAvatar: document.getElementById('driver-avatar'),
  driverName: document.getElementById('driver-name'),
  driverVehicle: document.getElementById('driver-vehicle'),
  driverLiveEta: document.getElementById('driver-live-eta'),
  fleetCandidatesList: document.getElementById('fleet-candidates-list'),
  dispatchBtn: document.getElementById('dispatch-driver-btn'),
  toggleSimBtn: document.getElementById('toggle-simulation-btn'),
  mapContainer: document.getElementById('rideshare-map'),
  mapStatusBanner: document.getElementById('map-status-banner'),
};

function showStatusBanner(message) {
  if (!message) {
    dom.mapStatusBanner.classList.add('is-hidden');
    dom.mapStatusBanner.textContent = '';
    return;
  }
  dom.mapStatusBanner.textContent = message;
  dom.mapStatusBanner.classList.remove('is-hidden');
}

function parseDurationSeconds(durationStr) {
  if (typeof durationStr === 'number' && Number.isFinite(durationStr)) {
    return durationStr;
  }
  if (typeof durationStr !== 'string') {
    return 0;
  }
  const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Number(match[1]) : 0;
}

function formatDurationMinutes(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

function formatDistanceMiles(meters) {
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function microlitersToLiters(microliters) {
  const num = Number(microliters);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return num / 1_000_000;
}

function formatEnergyOrFuel(microliters, emissionType) {
  const liters = microlitersToLiters(microliters);
  if (liters <= 0) {
    return '-- est.';
  }
  if (emissionType === 'ELECTRIC') {
    // 1 liter gasoline equivalent ≈ 8.9 kWh thermal, EV drivetrain ≈ 3.1 kWh per gasoline-equivalent liter
    const kwh = liters * 3.1;
    return `${kwh.toFixed(1)} kWh eq.`;
  }
  const gallons = liters * 0.264172;
  return `${gallons.toFixed(2)} gal`;
}

function loadGoogleMapsBootstrap(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }

    const g = {
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      libraries: 'core,maps,marker,places,routes,geometry',
    };

    const c = 'google';
    const l = 'importLibrary';
    const q = '__ib__';
    const m = document;
    const b = window;
    b[c] = b[c] || {};
    const d = (b[c].maps = b[c].maps || {});
    const r = new Set();
    const e = new URLSearchParams();
    let h = null;

    const u = () =>
      h ||
      (h = new Promise((res, rej) => {
        const a = m.createElement('script');
        e.set('libraries', [...r].join(','));
        for (const k in g) {
          e.set(
            k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
            g[k]
          );
        }
        e.set('callback', `${c}.maps.${q}`);
        a.src = `https://maps.${c}apis.com/maps/api/js?${e.toString()}`;
        d[q] = () => {
          res();
        };
        a.onerror = () => {
          rej(new Error('Google Maps JavaScript API could not load.'));
        };
        const nonceEl = m.querySelector('script[nonce]');
        if (nonceEl?.nonce) {
          a.nonce = nonceEl.nonce;
        }
        m.head.append(a);
      }));

    d[l] = (f, ...n) => {
      r.add(f);
      return u().then(() => d[l](f, ...n));
    };

    u().then(resolve).catch(reject);
  });
}

function renderMissingKeyPlaceholder() {
  const wrapper = document.createElement('div');
  wrapper.className = 'setup-placeholder';

  const card = document.createElement('div');
  card.className = 'setup-card';

  const heading = document.createElement('h3');
  heading.textContent = 'Google Maps API Key Required';

  const p1 = document.createElement('p');
  p1.textContent =
    'Set GOOGLE_MAPS_API_KEY in your local .env file (never committed to git) and restart the Node.js server to render the interactive Los Angeles map, Places Autocomplete, and Eco-Friendly Routes.';

  const p2 = document.createElement('p');
  p2.textContent =
    'For zero-billing prototyping, obtain a free Maps Demo Key at mapsplatform.google.com/maps-demo-key and paste it into .env.';

  card.append(heading, p1, p2);
  wrapper.append(card);
  dom.mapContainer.replaceChildren(wrapper);
  dom.headerDispatchStatus.textContent = 'API Key Not Configured';
  dom.driverLiveEta.textContent = 'Configure GOOGLE_MAPS_API_KEY in .env to begin live dispatch.';
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || payload?.error || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

async function resolvePlaceByText(query) {
  const data = await fetchJson('/api/places/search', {
    method: 'POST',
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        latitude: 34.0522,
        longitude: -118.2437,
        radiusMeters: 50000,
      },
    }),
  });

  const first = Array.isArray(data?.places) ? data.places[0] : null;
  if (first && first.location) {
    return {
      id: first.id || '',
      name: first.displayName?.text || query,
      address: first.formattedAddress || first.displayName?.text || query,
      lat: first.location.latitude,
      lng: first.location.longitude,
    };
  }

  // Fallback via Maps JS Places library if available
  const { Place } = state.libs.places || {};
  if (Place && typeof Place.searchByText === 'function') {
    const { places } = await Place.searchByText({
      textQuery: query,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      locationBias: { center: { lat: 34.0522, lng: -118.2437 }, radius: 50000 },
      maxResultCount: 1,
    });
    if (places && places[0] && places[0].location) {
      const p = places[0];
      return {
        id: p.id || '',
        name: p.displayName || query,
        address: p.formattedAddress || p.displayName || query,
        lat: p.location.lat(),
        lng: p.location.lng(),
      };
    }
  }

  throw new Error(`Could not resolve location: ${query}`);
}

function createPinMarkerContent(labelText, bgColor, borderColor) {
  const { PinElement } = state.libs.marker;
  return new PinElement({
    glyphText: labelText,
    glyphColor: '#ffffff',
    background: bgColor,
    borderColor,
    scale: 1.1,
  });
}

function createCandidateMarkerElement(initials) {
  const el = document.createElement('div');
  el.style.width = '28px';
  el.style.height = '28px';
  el.style.borderRadius = '50%';
  el.style.background = '#ffffff';
  el.style.border = '2px solid #475569';
  el.style.color = '#0f172a';
  el.style.fontSize = '10px';
  el.style.fontWeight = '800';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.boxShadow = '0 2px 6px rgba(15,23,42,0.22)';
  el.textContent = initials;
  return el;
}

function createActiveDriverMarkerContent() {
  const outer = document.createElement('div');
  outer.style.width = '38px';
  outer.style.height = '38px';
  outer.style.borderRadius = '50%';
  outer.style.background = '#0f172a';
  outer.style.border = '3px solid #ffffff';
  outer.style.boxShadow = '0 4px 14px rgba(15,23,42,0.4)';
  outer.style.display = 'flex';
  outer.style.alignItems = 'center';
  outer.style.justifyContent = 'center';
  outer.style.transition = 'transform 0.12s linear';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');

  // Top-down navigation chevron representing vehicle heading
  const arrow = document.createElementNS(svgNS, 'path');
  arrow.setAttribute('d', 'M12 2L19 20L12 16.5L5 20L12 2Z');
  arrow.setAttribute('fill', '#34d399');
  svg.append(arrow);

  outer.append(svg);
  state.driverCarIconWrap = outer;
  return outer;
}

function createAutocompleteInput(hostEl, placeholder, initialValue, onSelect) {
  const { PlaceAutocompleteElement } = state.libs.places;

  const autocompleteEl = new PlaceAutocompleteElement({
    locationBias: {
      center: { lat: 34.0522, lng: -118.2437 },
      radius: 50000,
    },
    includedRegionCodes: ['us'],
    internalUsageAttributionIds: [state.config.attributionId || ATTRIBUTION_ID],
    placeholder,
  });

  autocompleteEl.value = initialValue;

  autocompleteEl.addEventListener('gmp-select', async (event) => {
    try {
      const prediction = event.placePrediction;
      if (!prediction) return;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      if (!place.location) return;
      const resolved = {
        id: place.id || '',
        name: place.displayName || place.formattedAddress || 'Selected Place',
        address: place.formattedAddress || place.displayName || '',
        lat: place.location.lat(),
        lng: place.location.lng(),
      };
      await onSelect(resolved);
    } catch (err) {
      showStatusBanner(err instanceof Error ? err.message : 'Unable to select place.');
    }
  });

  autocompleteEl.addEventListener('gmp-error', () => {
    showStatusBanner('Places Autocomplete service encountered a request error.');
  });

  hostEl.replaceChildren(autocompleteEl);
  return autocompleteEl;
}

function updatePlaceMarkers() {
  const { AdvancedMarkerElement } = state.libs.marker;

  if (state.markers.pickup) {
    state.markers.pickup.map = null;
  }
  if (state.markers.dropoff) {
    state.markers.dropoff.map = null;
  }

  if (state.pickupPlace) {
    state.markers.pickup = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: state.pickupPlace.lat, lng: state.pickupPlace.lng },
      title: `Pickup: ${state.pickupPlace.name}`,
      content: createPinMarkerContent('P', '#2563eb', '#1d4ed8'),
      zIndex: 4,
    });
    dom.pickupAddressMeta.textContent = state.pickupPlace.address;
  }

  if (state.dropoffPlace) {
    state.markers.dropoff = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: state.dropoffPlace.lat, lng: state.dropoffPlace.lng },
      title: `Drop-off: ${state.dropoffPlace.name}`,
      content: createPinMarkerContent('D', '#e11d48', '#be123c'),
      zIndex: 4,
    });
    dom.dropoffAddressMeta.textContent = state.dropoffPlace.address;
  }

  if (state.pickupPlace && state.dropoffPlace) {
    dom.headerTripSummary.textContent = `${state.pickupPlace.name} → ${state.dropoffPlace.name}`;
  }
}

function normalizeRouteEntry(rawRoute) {
  if (!rawRoute) return null;
  const distanceMeters = Number(rawRoute.distanceMeters || 0);
  const durationSec = parseDurationSeconds(rawRoute.duration);
  const staticDurationSec = parseDurationSeconds(rawRoute.staticDuration) || durationSec;
  const encodedPolyline = rawRoute.polyline?.encodedPolyline || '';
  const fuelMicroliters = Number(rawRoute.travelAdvisory?.fuelConsumptionMicroliters || 0);
  const labels = Array.isArray(rawRoute.routeLabels) ? rawRoute.routeLabels : [];

  return {
    distanceMeters,
    durationSec,
    staticDurationSec,
    encodedPolyline,
    fuelMicroliters,
    labels,
    localizedDuration: rawRoute.localizedValues?.duration?.text || formatDurationMinutes(durationSec),
    localizedDistance: rawRoute.localizedValues?.distance?.text || formatDistanceMiles(distanceMeters),
  };
}

function getActiveTripRoute() {
  if (state.selectedRouteType === 'eco' && state.ecoRoute) {
    return state.ecoRoute;
  }
  return state.fastestRoute || state.ecoRoute;
}

function renderRouteComparisonUI() {
  const fastest = state.fastestRoute;
  const eco = state.ecoRoute;

  if (fastest) {
    dom.fastestDuration.textContent = fastest.localizedDuration;
    dom.fastestDistance.textContent = fastest.localizedDistance;
    dom.fastestFuel.textContent = formatEnergyOrFuel(fastest.fuelMicroliters, state.emissionType);
  }

  if (eco) {
    dom.ecoDuration.textContent = eco.localizedDuration;
    dom.ecoDistance.textContent = eco.localizedDistance;
    dom.ecoFuel.textContent = formatEnergyOrFuel(eco.fuelMicroliters, state.emissionType);
  }

  dom.routeFastestBtn.classList.toggle('is-selected', state.selectedRouteType === 'fastest');
  dom.routeEcoBtn.classList.toggle('is-selected', state.selectedRouteType === 'eco');

  if (!fastest || !eco) {
    dom.ecoSavingsBanner.textContent = 'Route fuel telemetry unavailable for this selection.';
    return;
  }

  const fastestLiters = microlitersToLiters(fastest.fuelMicroliters);
  const ecoLiters = microlitersToLiters(eco.fuelMicroliters);
  const savedLiters = Math.max(0, fastestLiters - ecoLiters);
  const savedGallons = savedLiters * 0.264172;
  const savedCo2Kg = savedLiters * 2.31;
  const timeDeltaMin = Math.round((eco.durationSec - fastest.durationSec) / 60);

  if (state.routesConverged || savedLiters < 0.01) {
    const baselineLiters = fastestLiters || 1.2;
    const evCo2Saved = baselineLiters * 2.31;
    dom.ecoSavingsBanner.textContent =
      `Fastest & Eco-Friendly align on this corridor (${fastest.localizedDistance}). Selecting the Green EV/Hybrid tier avoids ~${evCo2Saved.toFixed(1)} kg tailpipe CO₂.`;
  } else {
    const pctSaved = fastestLiters > 0 ? Math.round((savedLiters / fastestLiters) * 100) : 0;
    const deltaLabel =
      timeDeltaMin > 0
        ? `+${timeDeltaMin} min travel time`
        : timeDeltaMin < 0
        ? `${Math.abs(timeDeltaMin)} min faster`
        : 'same ETA';
    const savingsUnit =
      state.emissionType === 'ELECTRIC'
        ? `${(savedLiters * 3.1).toFixed(2)} kWh eq. (${pctSaved}%)`
        : `${savedGallons.toFixed(2)} gal (${pctSaved}%)`;
    dom.ecoSavingsBanner.textContent =
      `Eco route saves ${savingsUnit} & ~${savedCo2Kg.toFixed(1)} kg CO₂ vs. fastest route (${deltaLabel}).`;
  }
}

function renderFareEstimates() {
  const activeRoute = getActiveTripRoute();
  if (!activeRoute) return;

  dom.fareRouteTag.textContent =
    state.selectedRouteType === 'eco' ? 'Eco-Friendly Route' : 'Fastest Route';

  const miles = activeRoute.distanceMeters / 1609.344;
  const minutes = activeRoute.durationSec / 60;

  const economyFare = Math.max(7.0, 2.5 + miles * 1.35 + minutes * 0.28);
  const comfortFare = Math.max(10.5, 4.2 + miles * 1.85 + minutes * 0.38);
  const greenFare = Math.max(8.5, 3.2 + miles * 1.5 + minutes * 0.32);

  dom.fareEconomyPrice.textContent = `$${economyFare.toFixed(2)}`;
  dom.fareEconomyBreakdown.textContent = `$2.50 base + ${miles.toFixed(1)} mi ($1.35/mi) + ${Math.round(minutes)} min ($0.28/min)`;

  dom.fareComfortPrice.textContent = `$${comfortFare.toFixed(2)}`;
  dom.fareComfortBreakdown.textContent = `$4.20 base + ${miles.toFixed(1)} mi ($1.85/mi) + ${Math.round(minutes)} min ($0.38/min)`;

  dom.fareGreenPrice.textContent = `$${greenFare.toFixed(2)}`;
  dom.fareGreenBreakdown.textContent = `$3.20 base + ${miles.toFixed(1)} mi ($1.50/mi) + ${Math.round(minutes)} min ($0.32/min)`;

  const routeLiters = microlitersToLiters(activeRoute.fuelMicroliters);
  const gasEquivCo2 = (routeLiters > 0 ? routeLiters : miles * 0.14) * 2.31;
  dom.fareGreenSavings.textContent = `EV/Hybrid dispatch saves up to ${gasEquivCo2.toFixed(1)} kg tailpipe CO₂ on this trip`;

  dom.fareEconomyBtn.classList.toggle('is-selected', state.selectedFareTier === 'economy');
  dom.fareComfortBtn.classList.toggle('is-selected', state.selectedFareTier === 'comfort');
  dom.fareGreenBtn.classList.toggle('is-selected', state.selectedFareTier === 'green');
}

function drawTripPolylines() {
  const { Polyline } = state.libs.maps;
  const { encoding } = state.libs.geometry;
  const { LatLngBounds } = state.libs.core;

  if (state.polylines.fastest) state.polylines.fastest.setMap(null);
  if (state.polylines.eco) state.polylines.eco.setMap(null);

  const bounds = new LatLngBounds();
  if (state.pickupPlace) bounds.extend({ lat: state.pickupPlace.lat, lng: state.pickupPlace.lng });
  if (state.dropoffPlace) bounds.extend({ lat: state.dropoffPlace.lat, lng: state.dropoffPlace.lng });

  if (state.fastestRoute?.encodedPolyline) {
    const fastestPath = encoding.decodePath(state.fastestRoute.encodedPolyline);
    fastestPath.forEach((pt) => bounds.extend(pt));
    const isSelected = state.selectedRouteType === 'fastest';
    state.polylines.fastest = new Polyline({
      map: state.map,
      path: fastestPath,
      strokeColor: '#2563eb',
      strokeOpacity: isSelected ? 0.92 : 0.4,
      strokeWeight: isSelected ? 6 : 4,
      zIndex: isSelected ? 3 : 1,
    });
  }

  if (state.ecoRoute?.encodedPolyline && !state.routesConverged) {
    const ecoPath = encoding.decodePath(state.ecoRoute.encodedPolyline);
    ecoPath.forEach((pt) => bounds.extend(pt));
    const isSelected = state.selectedRouteType === 'eco';
    state.polylines.eco = new Polyline({
      map: state.map,
      path: ecoPath,
      strokeColor: '#059669',
      strokeOpacity: isSelected ? 0.94 : 0.55,
      strokeWeight: isSelected ? 6 : 4,
      zIndex: isSelected ? 3 : 2,
    });
  } else if (state.ecoRoute?.encodedPolyline && state.routesConverged && state.selectedRouteType === 'eco') {
    if (state.polylines.fastest) {
      state.polylines.fastest.setOptions({ strokeColor: '#059669', strokeOpacity: 0.94, strokeWeight: 6 });
    }
  }

  if (!bounds.isEmpty()) {
    state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }
}

async function computeDualRoutes() {
  if (!state.pickupPlace || !state.dropoffPlace) return;

  showStatusBanner('Computing Fastest & Eco-Friendly routes…');
  const data = await fetchJson('/api/routes/compute', {
    method: 'POST',
    body: JSON.stringify({
      origin: { latitude: state.pickupPlace.lat, longitude: state.pickupPlace.lng },
      destination: { latitude: state.dropoffPlace.lat, longitude: state.dropoffPlace.lng },
      emissionType: state.emissionType,
      includeEcoRoute: true,
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    }),
  });

  const routes = Array.isArray(data?.routes) ? data.routes : [];
  if (routes.length === 0) {
    throw new Error('Routes API returned no drivable routes between these locations.');
  }

  const rawFastest =
    routes.find((r) => Array.isArray(r.routeLabels) && r.routeLabels.includes('DEFAULT_ROUTE')) ||
    routes[0];
  const rawEco =
    routes.find((r) => Array.isArray(r.routeLabels) && r.routeLabels.includes('FUEL_EFFICIENT')) ||
    rawFastest;

  state.fastestRoute = normalizeRouteEntry(rawFastest);
  state.ecoRoute = normalizeRouteEntry(rawEco);
  state.routesConverged =
    routes.length === 1 ||
    state.fastestRoute?.encodedPolyline === state.ecoRoute?.encodedPolyline;

  renderRouteComparisonUI();
  renderFareEstimates();
  drawTripPolylines();
  showStatusBanner('');
}

function stopDriverAnimation() {
  if (state.simulation.rafId !== null) {
    cancelAnimationFrame(state.simulation.rafId);
    state.simulation.rafId = null;
  }
  state.simulation.running = false;
}

function computeCumulativeDistances(path) {
  const { spherical } = state.libs.geometry;
  const cumulative = [0];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const seg = spherical.computeDistanceBetween(path[i - 1], path[i]);
    total += seg;
    cumulative.push(total);
  }
  return { cumulative, total };
}

function samplePathAtDistance(path, cumulative, distanceMeters) {
  const { spherical } = state.libs.geometry;
  if (path.length === 0) return null;
  if (path.length === 1 || distanceMeters <= 0) {
    const heading = path.length > 1 ? spherical.computeHeading(path[0], path[1]) : 0;
    return { position: path[0], heading };
  }
  const total = cumulative[cumulative.length - 1];
  if (distanceMeters >= total) {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    return { position: last, heading: spherical.computeHeading(prev, last) };
  }

  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= distanceMeters) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const segStart = cumulative[lo];
  const segEnd = cumulative[lo + 1];
  const segLen = Math.max(0.001, segEnd - segStart);
  const fraction = (distanceMeters - segStart) / segLen;
  const pos = spherical.interpolate(path[lo], path[lo + 1], fraction);
  const heading = spherical.computeHeading(path[lo], path[lo + 1]);
  return { position: pos, heading };
}

function updateLiveEtaDisplay(remainingMeters, remainingSeconds) {
  const driverName = state.assignedDriver?.name || 'Driver';
  const etaMins = Math.max(0, Math.ceil(remainingSeconds / 60));
  const distMiles = (remainingMeters / 1609.344).toFixed(1);

  if (state.simulation.phase === 'TO_PICKUP') {
    dom.dispatchPhaseTag.textContent = 'En Route to Pickup';
    dom.headerDispatchStatus.textContent = `Driver ${etaMins} min away`;
    dom.driverLiveEta.textContent = `${driverName} arriving at pickup in ${etaMins} min (${distMiles} mi away)`;
  } else if (state.simulation.phase === 'ON_TRIP') {
    dom.dispatchPhaseTag.textContent = 'On Trip';
    dom.headerDispatchStatus.textContent = `Drop-off ETA ${etaMins} min`;
    dom.driverLiveEta.textContent = `In transit to ${state.dropoffPlace?.name || 'drop-off'} • ${etaMins} min (${distMiles} mi remaining)`;
  } else if (state.simulation.phase === 'ARRIVED') {
    dom.dispatchPhaseTag.textContent = 'Arrived';
    dom.headerDispatchStatus.textContent = 'Trip Completed';
    dom.driverLiveEta.textContent = `Arrived at ${state.dropoffPlace?.name || 'destination'} with ${driverName}.`;
  }
}

function startDriverAnimationLoop() {
  stopDriverAnimation();

  const sim = state.simulation;
  if (sim.approachPath.length === 0 && sim.tripPath.length === 0) return;

  const approachMetrics = computeCumulativeDistances(sim.approachPath);
  const tripMetrics = computeCumulativeDistances(sim.tripPath);
  sim.approachTotalMeters = approachMetrics.total;
  sim.tripTotalMeters = tripMetrics.total;

  if (sim.phase === 'STANDBY' || sim.phase === 'ARRIVED') {
    sim.phase = sim.approachPath.length > 1 ? 'TO_PICKUP' : 'ON_TRIP';
    sim.progressMeters = 0;
  }

  sim.running = true;
  sim.paused = false;
  sim.lastFrameTs = performance.now();
  dom.toggleSimBtn.textContent = 'Pause Tracking';

  const step = (now) => {
    if (!sim.running) return;
    const dtSec = Math.min(0.1, (now - sim.lastFrameTs) / 1000);
    sim.lastFrameTs = now;

    if (!sim.paused) {
      if (sim.phase === 'TO_PICKUP') {
        const baseSpeedMps =
          sim.approachDurationSec > 0
            ? sim.approachTotalMeters / sim.approachDurationSec
            : 11;
        sim.progressMeters += baseSpeedMps * sim.speedMultiplier * dtSec;

        if (sim.progressMeters >= sim.approachTotalMeters) {
          sim.phase = 'ON_TRIP';
          sim.progressMeters = 0;
        } else {
          const sample = samplePathAtDistance(
            sim.approachPath,
            approachMetrics.cumulative,
            sim.progressMeters
          );
          if (sample && state.markers.driver) {
            state.markers.driver.position = sample.position;
            if (state.driverCarIconWrap) {
              state.driverCarIconWrap.style.transform = `rotate(${sample.heading.toFixed(1)}deg)`;
            }
          }
          const remainingRatio =
            1 - sim.progressMeters / Math.max(1, sim.approachTotalMeters);
          updateLiveEtaDisplay(
            Math.max(0, sim.approachTotalMeters - sim.progressMeters),
            sim.approachDurationSec * remainingRatio
          );
        }
      }

      if (sim.phase === 'ON_TRIP') {
        const baseSpeedMps =
          sim.tripDurationSec > 0 ? sim.tripTotalMeters / sim.tripDurationSec : 14;
        sim.progressMeters += baseSpeedMps * sim.speedMultiplier * dtSec;

        if (sim.progressMeters >= sim.tripTotalMeters) {
          sim.phase = 'ARRIVED';
          sim.progressMeters = sim.tripTotalMeters;
          const endSample = samplePathAtDistance(
            sim.tripPath,
            tripMetrics.cumulative,
            sim.tripTotalMeters
          );
          if (endSample && state.markers.driver) {
            state.markers.driver.position = endSample.position;
          }
          updateLiveEtaDisplay(0, 0);
          sim.running = false;
          dom.toggleSimBtn.textContent = 'Completed';
          return;
        }

        const sample = samplePathAtDistance(
          sim.tripPath,
          tripMetrics.cumulative,
          sim.progressMeters
        );
        if (sample && state.markers.driver) {
          state.markers.driver.position = sample.position;
          if (state.driverCarIconWrap) {
            state.driverCarIconWrap.style.transform = `rotate(${sample.heading.toFixed(1)}deg)`;
          }
        }
        const remainingRatio = 1 - sim.progressMeters / Math.max(1, sim.tripTotalMeters);
        updateLiveEtaDisplay(
          Math.max(0, sim.tripTotalMeters - sim.progressMeters),
          sim.tripDurationSec * remainingRatio
        );
      }
    }

    sim.rafId = requestAnimationFrame(step);
  };

  sim.rafId = requestAnimationFrame(step);
}

function renderFleetCandidates() {
  const rows = state.candidateEtas.map((entry) => {
    const row = document.createElement('div');
    row.className = 'candidate-row';
    if (state.assignedDriver && entry.driver.id === state.assignedDriver.id) {
      row.classList.add('is-assigned');
    }

    const left = document.createElement('span');
    left.textContent = `${entry.driver.name} (${entry.driver.rating}★)`;

    const right = document.createElement('span');
    const mins = Math.max(1, Math.round(entry.durationSec / 60));
    const miles = (entry.distanceMeters / 1609.344).toFixed(1);
    right.textContent = `${mins} min • ${miles} mi`;

    row.append(left, right);
    return row;
  });

  dom.fleetCandidatesList.replaceChildren(...rows);
}

async function evaluateAndDispatchClosestDriver() {
  if (!state.pickupPlace) return;

  const { AdvancedMarkerElement } = state.libs.marker;
  const { Polyline } = state.libs.maps;
  const { encoding, spherical } = state.libs.geometry;

  // Evaluate candidate drivers via Routes API computeRouteMatrix
  const matrixRes = await fetchJson('/api/routes/matrix', {
    method: 'POST',
    body: JSON.stringify({
      origins: CANDIDATE_FLEET.map((d) => ({ latitude: d.lat, longitude: d.lng })),
      destinations: [{ latitude: state.pickupPlace.lat, longitude: state.pickupPlace.lng }],
    }),
  });

  const elements = Array.isArray(matrixRes?.elements) ? matrixRes.elements : [];
  const scored = CANDIDATE_FLEET.map((driver, idx) => {
    const el = elements.find((item) => item.originIndex === idx);
    const durationSec = el ? parseDurationSeconds(el.duration) : 0;
    const distanceMeters = el?.distanceMeters
      ? Number(el.distanceMeters)
      : spherical.computeDistanceBetween(
          { lat: driver.lat, lng: driver.lng },
          { lat: state.pickupPlace.lat, lng: state.pickupPlace.lng }
        );
    return {
      driver,
      durationSec: durationSec > 0 ? durationSec : Math.round(distanceMeters / 10),
      distanceMeters,
    };
  }).sort((a, b) => a.durationSec - b.durationSec);

  state.candidateEtas = scored;
  const winner = scored[0];
  state.assignedDriver = winner.driver;

  dom.driverAvatar.textContent = winner.driver.initials;
  dom.driverName.textContent = `${winner.driver.name} • ${winner.driver.rating}★`;
  dom.driverVehicle.textContent = `${winner.driver.vehicle} • ${winner.driver.plate}`;

  renderFleetCandidates();

  // Render standby candidate markers
  state.markers.candidates.forEach((m) => {
    m.map = null;
  });
  state.markers.candidates = scored.slice(1, 4).map(
    (entry) =>
      new AdvancedMarkerElement({
        map: state.map,
        position: { lat: entry.driver.lat, lng: entry.driver.lng },
        title: `${entry.driver.name} (${Math.max(1, Math.round(entry.durationSec / 60))} min away)`,
        content: createCandidateMarkerElement(entry.driver.initials),
        zIndex: 2,
      })
  );

  // Compute live pickup approach polyline from winning driver to pickup
  const approachRes = await fetchJson('/api/routes/compute', {
    method: 'POST',
    body: JSON.stringify({
      origin: { latitude: winner.driver.lat, longitude: winner.driver.lng },
      destination: { latitude: state.pickupPlace.lat, longitude: state.pickupPlace.lng },
      emissionType: 'HYBRID',
      includeEcoRoute: false,
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });

  const approachRoute = normalizeRouteEntry(approachRes?.routes?.[0]);
  const approachPath = approachRoute?.encodedPolyline
    ? encoding.decodePath(approachRoute.encodedPolyline)
    : [];

  if (state.polylines.approach) {
    state.polylines.approach.setMap(null);
  }

  if (approachPath.length > 1) {
    state.polylines.approach = new Polyline({
      map: state.map,
      path: approachPath,
      strokeColor: '#f59e0b',
      strokeOpacity: 0,
      strokeWeight: 4,
      zIndex: 3,
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
    });
  }

  if (state.markers.driver) {
    state.markers.driver.map = null;
  }

  state.markers.driver = new AdvancedMarkerElement({
    map: state.map,
    position: { lat: winner.driver.lat, lng: winner.driver.lng },
    title: `Active Driver: ${winner.driver.name}`,
    content: createActiveDriverMarkerContent(),
    zIndex: 6,
  });

  const activeTrip = getActiveTripRoute();
  const tripPath = activeTrip?.encodedPolyline ? encoding.decodePath(activeTrip.encodedPolyline) : [];

  state.simulation.approachPath = approachPath;
  state.simulation.approachDurationSec = approachRoute?.durationSec || winner.durationSec;
  state.simulation.tripPath = tripPath;
  state.simulation.tripDurationSec = activeTrip?.durationSec || 900;
  state.simulation.phase = 'TO_PICKUP';
  state.simulation.progressMeters = 0;

  startDriverAnimationLoop();
}

async function refreshFullTripAndDispatch() {
  updatePlaceMarkers();
  await computeDualRoutes();
  await evaluateAndDispatchClosestDriver();
}

function updateActiveTripPolylineForAnimation() {
  const { encoding } = state.libs.geometry;
  const activeTrip = getActiveTripRoute();
  if (!activeTrip?.encodedPolyline) return;

  const newTripPath = encoding.decodePath(activeTrip.encodedPolyline);
  state.simulation.tripPath = newTripPath;
  state.simulation.tripDurationSec = activeTrip.durationSec;
  if (state.simulation.phase === 'ON_TRIP') {
    const metrics = computeCumulativeDistances(newTripPath);
    state.simulation.tripTotalMeters = metrics.total;
    state.simulation.progressMeters = Math.min(
      state.simulation.progressMeters,
      metrics.total
    );
  }
}

function wireInteractiveControls() {
  dom.swapBtn.addEventListener('click', async () => {
    if (!state.pickupPlace || !state.dropoffPlace) return;
    const prevPickup = state.pickupPlace;
    state.pickupPlace = state.dropoffPlace;
    state.dropoffPlace = prevPickup;

    if (state.pickupAutocomplete) {
      state.pickupAutocomplete.value = state.pickupPlace.name;
    }
    if (state.dropoffAutocomplete) {
      state.dropoffAutocomplete.value = state.dropoffPlace.name;
    }

    try {
      await refreshFullTripAndDispatch();
    } catch (err) {
      showStatusBanner(err instanceof Error ? err.message : 'Unable to recompute swapped route.');
    }
  });

  dom.routeFastestBtn.addEventListener('click', () => {
    state.selectedRouteType = 'fastest';
    renderRouteComparisonUI();
    renderFareEstimates();
    drawTripPolylines();
    updateActiveTripPolylineForAnimation();
  });

  dom.routeEcoBtn.addEventListener('click', () => {
    state.selectedRouteType = 'eco';
    renderRouteComparisonUI();
    renderFareEstimates();
    drawTripPolylines();
    updateActiveTripPolylineForAnimation();
  });

  dom.emissionSelect.addEventListener('change', async (e) => {
    state.emissionType = e.target.value;
    try {
      await computeDualRoutes();
      updateActiveTripPolylineForAnimation();
    } catch (err) {
      showStatusBanner(err instanceof Error ? err.message : 'Failed to update emission profile.');
    }
  });

  dom.fareEconomyBtn.addEventListener('click', () => {
    state.selectedFareTier = 'economy';
    renderFareEstimates();
  });

  dom.fareComfortBtn.addEventListener('click', () => {
    state.selectedFareTier = 'comfort';
    renderFareEstimates();
  });

  dom.fareGreenBtn.addEventListener('click', () => {
    state.selectedFareTier = 'green';
    state.selectedRouteType = 'eco';
    renderRouteComparisonUI();
    renderFareEstimates();
    drawTripPolylines();
    updateActiveTripPolylineForAnimation();
  });

  dom.dispatchBtn.addEventListener('click', async () => {
    try {
      await evaluateAndDispatchClosestDriver();
    } catch (err) {
      showStatusBanner(err instanceof Error ? err.message : 'Unable to dispatch driver.');
    }
  });

  dom.toggleSimBtn.addEventListener('click', () => {
    const sim = state.simulation;
    if (sim.phase === 'ARRIVED') {
      sim.phase = 'TO_PICKUP';
      sim.progressMeters = 0;
      startDriverAnimationLoop();
      return;
    }
    sim.paused = !sim.paused;
    sim.lastFrameTs = performance.now();
    dom.toggleSimBtn.textContent = sim.paused ? 'Resume Tracking' : 'Pause Tracking';
    if (sim.paused) {
      dom.dispatchPhaseTag.textContent = 'Paused';
    }
  });
}

async function initApp() {
  wireInteractiveControls();

  try {
    state.config = await fetchJson('/api/config');
  } catch (err) {
    showStatusBanner(err instanceof Error ? err.message : 'Failed to load server config.');
    return;
  }

  if (!state.config.configured || !state.config.apiKey) {
    renderMissingKeyPlaceholder();
    return;
  }

  try {
    await loadGoogleMapsBootstrap(state.config.apiKey);

    const [coreLib, mapsLib, markerLib, placesLib, routesLib, geometryLib] =
      await Promise.all([
        google.maps.importLibrary('core'),
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('routes'),
        google.maps.importLibrary('geometry'),
      ]);

    state.libs = {
      core: coreLib,
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      geometry: geometryLib,
    };

    const { Map } = mapsLib;
    state.map = new Map(dom.mapContainer, {
      center: state.config.defaultCenter || LA_CENTER,
      zoom: state.config.defaultZoom || 12,
      mapId: state.config.mapId || 'DEMO_MAP_ID',
      internalUsageAttributionIds: [state.config.attributionId || ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.mapsReady = true;

    // Mount PlaceAutocompleteElement inputs pre-seeded with LA pickup & drop-off
    state.pickupAutocomplete = createAutocompleteInput(
      dom.pickupHost,
      'Enter pickup in Los Angeles…',
      state.config.seedPickupQuery,
      async (resolvedPlace) => {
        state.pickupPlace = resolvedPlace;
        await refreshFullTripAndDispatch();
      }
    );

    state.dropoffAutocomplete = createAutocompleteInput(
      dom.dropoffHost,
      'Enter drop-off in Los Angeles…',
      state.config.seedDropoffQuery,
      async (resolvedPlace) => {
        state.dropoffPlace = resolvedPlace;
        await refreshFullTripAndDispatch();
      }
    );

    // Resolve pre-seeded pickup & drop-off live via Places API (New)
    const [pickup, dropoff] = await Promise.all([
      resolvePlaceByText(state.config.seedPickupQuery),
      resolvePlaceByText(state.config.seedDropoffQuery),
    ]);

    state.pickupPlace = pickup;
    state.dropoffPlace = dropoff;

    await refreshFullTripAndDispatch();
  } catch (err) {
    showStatusBanner(err instanceof Error ? err.message : 'Failed to initialize rideshare map.');
  }
}

initApp();
