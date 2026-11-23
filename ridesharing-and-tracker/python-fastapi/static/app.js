const ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0";
const LA_CENTER = { lat: 34.0328, lng: -118.3669 };
const LA_BOUNDS = {
  south: 33.7,
  west: -118.67,
  north: 34.34,
  east: -118.15,
};

const SEED_PICKUP_QUERY = "Union Station, Los Angeles, CA";
const SEED_DROPOFF_QUERY = "Santa Monica Pier, Santa Monica, CA";

const DRIVER_PROFILES = [
  {
    id: "drv-1",
    name: "Maya R.",
    vehicle: "Toyota Prius Prime",
    plate: "8ECO412",
    emissionType: "HYBRID",
    offsetLat: 0.011,
    offsetLng: -0.014,
  },
  {
    id: "drv-2",
    name: "Carlos M.",
    vehicle: "Tesla Model 3",
    plate: "9EVX204",
    emissionType: "ELECTRIC",
    offsetLat: -0.008,
    offsetLng: 0.012,
  },
  {
    id: "drv-3",
    name: "Elena V.",
    vehicle: "Honda Accord",
    plate: "7LAX918",
    emissionType: "GASOLINE",
    offsetLat: 0.018,
    offsetLng: 0.016,
  },
  {
    id: "drv-4",
    name: "Devon K.",
    vehicle: "Hyundai Ioniq 5",
    plate: "9ZEV551",
    emissionType: "ELECTRIC",
    offsetLat: -0.015,
    offsetLng: -0.011,
  },
];

const FARE_TIERS = {
  economy: {
    id: "economy",
    label: "Economy",
    base: 2.5,
    perMile: 1.35,
    perMin: 0.28,
    bookingFee: 1.85,
  },
  comfort: {
    id: "comfort",
    label: "Comfort",
    base: 4.5,
    perMile: 1.85,
    perMin: 0.38,
    bookingFee: 2.25,
  },
  green: {
    id: "green",
    label: "Green EV / Hybrid",
    base: 3.25,
    perMile: 1.55,
    perMin: 0.32,
    bookingFee: 1.85,
  },
};

const state = {
  map: null,
  mapsLibs: null,
  pickup: null,
  dropoff: null,
  emissionType: "GASOLINE",
  selectedRouteType: "fastest",
  selectedFareTier: "economy",
  fastestRoute: null,
  ecoRoute: null,
  approachRoute: null,
  candidates: [],
  dispatchedDriver: null,
  markers: {
    pickup: null,
    dropoff: null,
    candidates: [],
    driver: null,
    driverCarPuck: null,
    driverTag: null,
  },
  polylines: {
    fastest: null,
    eco: null,
    approach: null,
  },
  autocomplete: {
    pickupEl: null,
    dropoffEl: null,
  },
  sim: {
    running: true,
    rafId: null,
    lastFrameMs: 0,
    phase: "IDLE", // EN_ROUTE_TO_PICKUP | IN_TRANSIT_TO_DROPOFF | ARRIVED
    approachPath: [],
    tripPath: [],
    approachCumDist: [],
    tripCumDist: [],
    approachTotalMeters: 0,
    tripTotalMeters: 0,
    approachDurationSec: 0,
    tripDurationSec: 0,
    progressMeters: 0,
    speedMultiplier: 26,
  },
};

const dom = {
  headerTripSummary: document.getElementById("header-trip-summary"),
  headerDispatchBadge: document.getElementById("header-dispatch-badge"),
  configWarningBanner: document.getElementById("config-warning-banner"),
  errorBanner: document.getElementById("error-banner"),
  pickupHost: document.getElementById("pickup-autocomplete-container"),
  dropoffHost: document.getElementById("dropoff-autocomplete-container"),
  pickupMeta: document.getElementById("pickup-meta"),
  dropoffMeta: document.getElementById("dropoff-meta"),
  swapBtn: document.getElementById("swap-locations-btn"),
  emissionSelect: document.getElementById("emission-type-select"),
  routeFastestCard: document.getElementById("route-option-fastest"),
  routeEcoCard: document.getElementById("route-option-eco"),
  fastestDuration: document.getElementById("fastest-duration"),
  fastestMetrics: document.getElementById("fastest-metrics"),
  fastestEnergy: document.getElementById("fastest-energy"),
  ecoDuration: document.getElementById("eco-duration"),
  ecoMetrics: document.getElementById("eco-metrics"),
  ecoEnergy: document.getElementById("eco-energy"),
  ecoSavingsBanner: document.getElementById("eco-savings-banner"),
  fareBasisCaption: document.getElementById("fare-basis-caption"),
  fareCards: {
    economy: document.getElementById("fare-tier-economy"),
    comfort: document.getElementById("fare-tier-comfort"),
    green: document.getElementById("fare-tier-green"),
  },
  farePrices: {
    economy: document.getElementById("fare-economy-price"),
    comfort: document.getElementById("fare-comfort-price"),
    green: document.getElementById("fare-green-price"),
  },
  fareBreakdowns: {
    economy: document.getElementById("fare-economy-breakdown"),
    comfort: document.getElementById("fare-comfort-breakdown"),
    green: document.getElementById("fare-green-breakdown"),
  },
  assignedDriverBadge: document.getElementById("assigned-driver-badge"),
  driverStatusText: document.getElementById("driver-status-text"),
  driverEtaCountdown: document.getElementById("driver-eta-countdown"),
  driverDistanceRemaining: document.getElementById("driver-distance-remaining"),
  driverVehicleInfo: document.getElementById("driver-vehicle-info"),
  dispatchBtn: document.getElementById("dispatch-driver-btn"),
  toggleSimBtn: document.getElementById("toggle-simulation-btn"),
  candidatesList: document.getElementById("candidate-drivers-list"),
  mapContainer: document.getElementById("rideshare-map"),
};

function showError(message) {
  dom.errorBanner.textContent = message;
  dom.errorBanner.classList.remove("hidden");
}

function clearError() {
  dom.errorBanner.textContent = "";
  dom.errorBanner.classList.add("hidden");
}

function showConfigWarning(message) {
  dom.configWarningBanner.textContent = message;
  dom.configWarningBanner.classList.remove("hidden");
}

function parseDurationSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const parsed = Number.parseFloat(durationStr.replace("s", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function metersToMiles(meters) {
  return meters / 1609.344;
}

function formatDurationMinutes(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "1 min";
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

function formatEtaClock(seconds) {
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function extractLatLng(locationObj) {
  if (!locationObj) return null;
  if (typeof locationObj.lat === "function" && typeof locationObj.lng === "function") {
    return { lat: locationObj.lat(), lng: locationObj.lng() };
  }
  if (typeof locationObj.latitude === "number" && typeof locationObj.longitude === "number") {
    return { lat: locationObj.latitude, lng: locationObj.longitude };
  }
  if (typeof locationObj.lat === "number" && typeof locationObj.lng === "number") {
    return { lat: locationObj.lat, lng: locationObj.lng };
  }
  return null;
}

function loadGoogleMapsBootstrap(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.importLibrary) {
      resolve();
      return;
    }

    ((g) => {
      let h;
      let a;
      let k;
      const p = "The Google Maps JavaScript API";
      const c = "google";
      const l = "importLibrary";
      const q = "__ib__";
      const m = document;
      const b = window;
      b[c] = b[c] || {};
      const d = b[c].maps || (b[c].maps = {});
      const r = new Set();
      const e = new URLSearchParams();
      const u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          await (a = m.createElement("script"));
          e.set("libraries", [...r] + "");
          for (k in g) {
            e.set(
              k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
              g[k]
            );
          }
          e.set("callback", c + ".maps." + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + " could not load.")));
          a.nonce = m.querySelector("script[nonce]")?.nonce || "";
          m.head.append(a);
        }));
      if (!d[l]) {
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
      }
    })({
      key: apiKey,
      v: "weekly",
      language: "en",
      region: "US",
    });

    Promise.resolve()
      .then(() => resolve())
      .catch(reject);
  });
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = data?.error?.message || data?.detail || `Request to ${path} failed (${response.status})`;
    throw new Error(detail);
  }
  return data;
}

async function resolvePlaceByText(textQuery) {
  const data = await apiPost("/api/places/search", {
    textQuery,
    pageSize: 1,
    biasCenter: { latitude: 34.0522, longitude: -118.2437 },
    biasRadiusMeters: 50000,
  });
  const place = data?.places?.[0];
  if (!place || !place.location) {
    throw new Error(`Could not resolve location: ${textQuery}`);
  }
  return {
    id: place.id,
    name: place.displayName?.text || textQuery,
    address: place.formattedAddress || textQuery,
    location: {
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
  };
}

function buildDriverSvgElement() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(ns, "path");
  path.setAttribute("fill", "#ffffff");
  path.setAttribute(
    "d",
    "M12 2L17.5 18.5L12 15.5L6.5 18.5L12 2Z"
  );
  svg.appendChild(path);
  return svg;
}

function createDriverMarkerContent(driverName) {
  const shell = document.createElement("div");
  shell.className = "driver-marker-shell";

  const tag = document.createElement("div");
  tag.className = "driver-marker-tag";
  tag.textContent = driverName;

  const puck = document.createElement("div");
  puck.className = "driver-car-puck";
  puck.appendChild(buildDriverSvgElement());

  shell.appendChild(tag);
  shell.appendChild(puck);

  return { shell, puck, tag };
}

function setupAutocompleteWidgets() {
  const { PlaceAutocompleteElement } = state.mapsLibs.places;

  const createWidget = (hostEl, placeholder, initialValue, onPlaceResolved) => {
    const widget = new PlaceAutocompleteElement({
      includedRegionCodes: ["us"],
      locationBias: LA_BOUNDS,
      placeholder,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
    widget.value = initialValue;

    widget.addEventListener("gmp-select", async (event) => {
      const prediction = event.placePrediction;
      if (!prediction) return;
      try {
        clearError();
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ["id", "displayName", "formattedAddress", "location"],
        });
        const coords = extractLatLng(place.location);
        if (!coords) {
          throw new Error("Selected place did not include coordinates.");
        }
        onPlaceResolved({
          id: place.id,
          name: place.displayName || place.formattedAddress || "Selected Location",
          address: place.formattedAddress || place.displayName || "",
          location: coords,
        });
      } catch (err) {
        showError(err.message || "Failed to load selected place details.");
      }
    });

    hostEl.replaceChildren(widget);
    return widget;
  };

  state.autocomplete.pickupEl = createWidget(
    dom.pickupHost,
    "Enter pickup in Los Angeles",
    SEED_PICKUP_QUERY,
    async (placeObj) => {
      state.pickup = placeObj;
      updatePlaceMetadataUI();
      await recomputeTripAndDispatch();
    }
  );

  state.autocomplete.dropoffEl = createWidget(
    dom.dropoffHost,
    "Enter drop-off in Los Angeles",
    SEED_DROPOFF_QUERY,
    async (placeObj) => {
      state.dropoff = placeObj;
      updatePlaceMetadataUI();
      await recomputeTripAndDispatch();
    }
  );
}

function updatePlaceMetadataUI() {
  if (state.pickup) {
    dom.pickupMeta.textContent = `${state.pickup.name} — ${state.pickup.address}`;
  }
  if (state.dropoff) {
    dom.dropoffMeta.textContent = `${state.dropoff.name} — ${state.dropoff.address}`;
  }
  if (state.pickup && state.dropoff) {
    dom.headerTripSummary.textContent = `${state.pickup.name} → ${state.dropoff.name}`;
  }
}

function upsertEndpointMarkers() {
  const { AdvancedMarkerElement, PinElement } = state.mapsLibs.marker;

  if (state.markers.pickup) {
    state.markers.pickup.map = null;
  }
  if (state.markers.dropoff) {
    state.markers.dropoff.map = null;
  }

  if (state.pickup) {
    const pickupPin = new PinElement({
      background: "#0f172a",
      borderColor: "#ffffff",
      glyphColor: "#38bdf8",
      glyphText: "A",
      scale: 1.1,
    });
    state.markers.pickup = new AdvancedMarkerElement({
      map: state.map,
      position: state.pickup.location,
      content: pickupPin,
      title: `Pickup: ${state.pickup.name}`,
      zIndex: 50,
    });
  }

  if (state.dropoff) {
    const dropoffPin = new PinElement({
      background: "#dc2626",
      borderColor: "#ffffff",
      glyphColor: "#ffffff",
      glyphText: "B",
      scale: 1.1,
    });
    state.markers.dropoff = new AdvancedMarkerElement({
      map: state.map,
      position: state.dropoff.location,
      content: dropoffPin,
      title: `Drop-off: ${state.dropoff.name}`,
      zIndex: 50,
    });
  }
}

function formatFuelSummary(route, emissionType) {
  const micro = Number(route?.travelAdvisory?.fuelConsumptionMicroliters || 0);
  if (!micro) {
    return emissionType === "ELECTRIC" ? "~3.2 kWh est." : "~0.45 gal est.";
  }
  const liters = micro / 1_000_000;
  if (emissionType === "ELECTRIC") {
    const kwh = liters * 8.9;
    return `${kwh.toFixed(1)} kWh energy`;
  }
  const gallons = liters * 0.264172;
  const co2Kg = liters * 2.31;
  return `${gallons.toFixed(2)} gal • ${co2Kg.toFixed(1)} kg CO₂`;
}

function getActiveTripRoute() {
  if (state.selectedRouteType === "eco" && state.ecoRoute) {
    return state.ecoRoute;
  }
  return state.fastestRoute || state.ecoRoute;
}

function renderRouteComparisonUI() {
  const fastest = state.fastestRoute;
  const eco = state.ecoRoute;
  if (!fastest || !eco) return;

  const fastSec = parseDurationSeconds(fastest.duration);
  const fastStaticSec = parseDurationSeconds(fastest.staticDuration);
  const fastMiles = metersToMiles(fastest.distanceMeters || 0);
  const fastMicro = Number(fastest?.travelAdvisory?.fuelConsumptionMicroliters || 0);

  const ecoSec = parseDurationSeconds(eco.duration);
  const ecoMiles = metersToMiles(eco.distanceMeters || 0);
  const ecoMicro = Number(eco?.travelAdvisory?.fuelConsumptionMicroliters || 0);

  dom.fastestDuration.textContent = formatDurationMinutes(fastSec);
  const trafficDeltaMin = Math.max(0, Math.round((fastSec - fastStaticSec) / 60));
  const trafficNote = trafficDeltaMin > 0 ? `+${trafficDeltaMin}m traffic` : "clear traffic";
  dom.fastestMetrics.textContent = `${fastMiles.toFixed(1)} mi • ${trafficNote}`;
  dom.fastestEnergy.textContent = formatFuelSummary(fastest, state.emissionType);

  dom.ecoDuration.textContent = formatDurationMinutes(ecoSec);
  const ecoTimeDiffMin = Math.round((ecoSec - fastSec) / 60);
  const ecoDiffLabel = ecoTimeDiffMin > 0 ? `+${ecoTimeDiffMin}m vs fastest` : "matches fastest ETA";
  dom.ecoMetrics.textContent = `${ecoMiles.toFixed(1)} mi • ${ecoDiffLabel}`;
  dom.ecoEnergy.textContent = formatFuelSummary(eco, state.emissionType);

  dom.routeFastestCard.classList.toggle("active", state.selectedRouteType === "fastest");
  dom.routeEcoCard.classList.toggle("active", state.selectedRouteType === "eco");

  const sameRoute =
    fastest.polyline?.encodedPolyline &&
    fastest.polyline.encodedPolyline === eco.polyline?.encodedPolyline;

  if (sameRoute || fastMicro <= ecoMicro || fastMicro === 0) {
    dom.ecoSavingsBanner.textContent =
      "Current traffic-aware fastest route is also the most fuel-efficient path (optimal energy consumption).";
  } else {
    const savedLiters = (fastMicro - ecoMicro) / 1_000_000;
    const pctSaved = ((fastMicro - ecoMicro) / fastMicro) * 100;
    if (state.emissionType === "ELECTRIC") {
      const savedKwh = savedLiters * 8.9;
      dom.ecoSavingsBanner.textContent = `Eco-Friendly route saves ${pctSaved.toFixed(1)}% energy (${savedKwh.toFixed(2)} kWh) for +${Math.max(0, ecoTimeDiffMin)} min.`;
    } else {
      const savedGal = savedLiters * 0.264172;
      const savedCo2Kg = savedLiters * 2.31;
      dom.ecoSavingsBanner.textContent = `Eco-Friendly route saves ${pctSaved.toFixed(1)}% fuel (${savedGal.toFixed(2)} gal / ${savedCo2Kg.toFixed(2)} kg CO₂) vs. fastest route.`;
    }
  }
}

function renderFareEstimates() {
  const activeRoute = getActiveTripRoute();
  if (!activeRoute) return;

  const miles = metersToMiles(activeRoute.distanceMeters || 0);
  const mins = Math.max(1, parseDurationSeconds(activeRoute.duration) / 60);

  const fastMicro = Number(state.fastestRoute?.travelAdvisory?.fuelConsumptionMicroliters || 0);
  const ecoMicro = Number(state.ecoRoute?.travelAdvisory?.fuelConsumptionMicroliters || 0);
  const ecoDiscountPct =
    fastMicro > ecoMicro && fastMicro > 0 ? Math.min(8, Math.round(((fastMicro - ecoMicro) / fastMicro) * 100)) : 5;

  dom.fareBasisCaption.textContent = `${miles.toFixed(1)} mi • ${Math.round(mins)} min (${state.selectedRouteType === "eco" ? "Eco" : "Fastest"})`;

  for (const [tierKey, cfg] of Object.entries(FARE_TIERS)) {
    let total = cfg.base + cfg.perMile * miles + cfg.perMin * mins + cfg.bookingFee;
    if (tierKey === "green" && state.selectedRouteType === "eco") {
      total = total * 0.96;
    }
    dom.farePrices[tierKey].textContent = `$${total.toFixed(2)}`;
    if (tierKey === "green") {
      dom.fareBreakdowns[tierKey].textContent = `EV/Hybrid • ~${ecoDiscountPct}% eco savings offset`;
    } else {
      dom.fareBreakdowns[tierKey].textContent = `$${cfg.base.toFixed(2)} base + $${cfg.perMile.toFixed(2)}/mi + $${cfg.perMin.toFixed(2)}/min`;
    }
    dom.fareCards[tierKey].classList.toggle("active", state.selectedFareTier === tierKey);
  }
}

function drawTripPolylines() {
  const { encoding } = state.mapsLibs.geometry;
  const { Polyline } = state.mapsLibs.maps;
  const { LatLngBounds } = state.mapsLibs.core;

  if (state.polylines.fastest) state.polylines.fastest.setMap(null);
  if (state.polylines.eco) state.polylines.eco.setMap(null);

  const bounds = new LatLngBounds();
  if (state.pickup) bounds.extend(state.pickup.location);
  if (state.dropoff) bounds.extend(state.dropoff.location);

  if (state.fastestRoute?.polyline?.encodedPolyline) {
    const fastPath = encoding.decodePath(state.fastestRoute.polyline.encodedPolyline);
    fastPath.forEach((pt) => bounds.extend(pt));
    const isSelected = state.selectedRouteType === "fastest";
    state.polylines.fastest = new Polyline({
      map: state.map,
      path: fastPath,
      strokeColor: "#2563eb",
      strokeOpacity: isSelected ? 0.92 : 0.38,
      strokeWeight: isSelected ? 7 : 5,
      zIndex: isSelected ? 20 : 10,
    });
  }

  if (state.ecoRoute?.polyline?.encodedPolyline) {
    const ecoPath = encoding.decodePath(state.ecoRoute.polyline.encodedPolyline);
    ecoPath.forEach((pt) => bounds.extend(pt));
    const isSelected = state.selectedRouteType === "eco";
    state.polylines.eco = new Polyline({
      map: state.map,
      path: ecoPath,
      strokeColor: "#059669",
      strokeOpacity: isSelected ? 0.94 : 0.45,
      strokeWeight: isSelected ? 7 : 5,
      zIndex: isSelected ? 22 : 12,
    });
  }

  if (state.candidates.length > 0) {
    state.candidates.forEach((c) => bounds.extend(c.location));
  }

  state.map.fitBounds(bounds, { top: 44, right: 44, bottom: 92, left: 44 });
}

function generateCandidateDriversNearPickup(pickupLoc) {
  return DRIVER_PROFILES.map((profile) => ({
    ...profile,
    location: {
      lat: Number((pickupLoc.lat + profile.offsetLat).toFixed(6)),
      lng: Number((pickupLoc.lng + profile.offsetLng).toFixed(6)),
    },
    etaSeconds: null,
    distanceMeters: null,
  }));
}

function renderCandidateMarkersAndList() {
  const { AdvancedMarkerElement } = state.mapsLibs.marker;

  state.markers.candidates.forEach((m) => {
    m.map = null;
  });
  state.markers.candidates = [];

  const fragment = document.createDocumentFragment();
  state.candidates.forEach((candidate) => {
    const isDispatched = state.dispatchedDriver && state.dispatchedDriver.id === candidate.id;

    if (!isDispatched) {
      const badge = document.createElement("div");
      badge.className = "candidate-puck";
      const etaLabel = candidate.etaSeconds ? formatDurationMinutes(candidate.etaSeconds) : "--";
      badge.textContent = `${candidate.name} • ${etaLabel}`;

      const marker = new AdvancedMarkerElement({
        map: state.map,
        position: candidate.location,
        content: badge,
        title: `${candidate.name} (${candidate.vehicle})`,
        zIndex: 30,
      });
      state.markers.candidates.push(marker);
    }

    const row = document.createElement("div");
    row.className = `candidate-chip${isDispatched ? " selected" : ""}`;

    const leftSpan = document.createElement("span");
    leftSpan.textContent = `${candidate.name} • ${candidate.vehicle}`;

    const rightSpan = document.createElement("span");
    const etaText = candidate.etaSeconds ? formatDurationMinutes(candidate.etaSeconds) : "--";
    const distText = candidate.distanceMeters ? `${metersToMiles(candidate.distanceMeters).toFixed(1)} mi` : "";
    rightSpan.textContent = isDispatched ? `Dispatched (${etaText})` : `${etaText} (${distText})`;

    row.appendChild(leftSpan);
    row.appendChild(rightSpan);
    fragment.appendChild(row);
  });

  dom.candidatesList.replaceChildren(fragment);
}

function buildCumulativeDistances(path) {
  const { spherical } = state.mapsLibs.geometry;
  const cum = [0];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += spherical.computeDistanceBetween(path[i - 1], path[i]);
    cum.push(total);
  }
  return { cum, total };
}

function samplePathAtDistance(path, cumDist, targetMeters) {
  const { spherical } = state.mapsLibs.geometry;
  if (!path || path.length === 0) return null;
  if (path.length === 1 || targetMeters <= 0) {
    const heading = path.length > 1 ? spherical.computeHeading(path[0], path[1]) : 0;
    return { position: path[0], heading };
  }
  const maxDist = cumDist[cumDist.length - 1];
  if (targetMeters >= maxDist) {
    const heading = spherical.computeHeading(path[path.length - 2], path[path.length - 1]);
    return { position: path[path.length - 1], heading };
  }

  let lo = 0;
  let hi = cumDist.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumDist[mid] <= targetMeters) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const segStart = cumDist[lo];
  const segEnd = cumDist[hi];
  const segLen = Math.max(0.001, segEnd - segStart);
  const fraction = Math.min(1, Math.max(0, (targetMeters - segStart) / segLen));

  const pos = spherical.interpolate(path[lo], path[hi], fraction);
  const heading = spherical.computeHeading(path[lo], path[hi]);
  return { position: pos, heading };
}

function stopDriverAnimation() {
  if (state.sim.rafId !== null) {
    cancelAnimationFrame(state.sim.rafId);
    state.sim.rafId = null;
  }
}

function updateLiveEtaReadout() {
  const driver = state.dispatchedDriver;
  if (!driver) return;

  dom.assignedDriverBadge.textContent = `${driver.name} (${driver.emissionType})`;
  dom.driverVehicleInfo.textContent = `${driver.vehicle} • ${driver.plate}`;

  if (state.sim.phase === "EN_ROUTE_TO_PICKUP") {
    const remainingMeters = Math.max(0, state.sim.approachTotalMeters - state.sim.progressMeters);
    const ratio = state.sim.approachTotalMeters > 0 ? remainingMeters / state.sim.approachTotalMeters : 0;
    const remainingSec = state.sim.approachDurationSec * ratio;
    dom.driverStatusText.textContent = state.sim.running ? "Approaching Pickup" : "Paused (Approaching Pickup)";
    dom.driverEtaCountdown.textContent = `${formatEtaClock(remainingSec)} to pickup`;
    dom.driverDistanceRemaining.textContent = `${metersToMiles(remainingMeters).toFixed(2)} mi`;
    dom.headerDispatchBadge.textContent = `Driver En Route • ${formatEtaClock(remainingSec)}`;
  } else if (state.sim.phase === "IN_TRANSIT_TO_DROPOFF") {
    const remainingMeters = Math.max(0, state.sim.tripTotalMeters - state.sim.progressMeters);
    const ratio = state.sim.tripTotalMeters > 0 ? remainingMeters / state.sim.tripTotalMeters : 0;
    const remainingSec = state.sim.tripDurationSec * ratio;
    dom.driverStatusText.textContent = state.sim.running ? "On Trip to Drop-off" : "Paused (On Trip)";
    dom.driverEtaCountdown.textContent = `${formatEtaClock(remainingSec)} to drop-off`;
    dom.driverDistanceRemaining.textContent = `${metersToMiles(remainingMeters).toFixed(2)} mi`;
    dom.headerDispatchBadge.textContent = `In Transit • ${formatEtaClock(remainingSec)}`;
  } else if (state.sim.phase === "ARRIVED") {
    dom.driverStatusText.textContent = "Arrived at Destination";
    dom.driverEtaCountdown.textContent = "0m 00s (Arrived)";
    dom.driverDistanceRemaining.textContent = "0.00 mi";
    dom.headerDispatchBadge.textContent = "Trip Completed • Arrived";
  }
}

function startDriverAnimationLoop() {
  stopDriverAnimation();
  state.sim.lastFrameMs = performance.now();

  const step = (nowMs) => {
    const dtSec = Math.min(0.1, Math.max(0.001, (nowMs - state.sim.lastFrameMs) / 1000));
    state.sim.lastFrameMs = nowMs;

    if (state.sim.running && state.sim.phase !== "ARRIVED") {
      if (state.sim.phase === "EN_ROUTE_TO_PICKUP") {
        const avgSpeedMps =
          state.sim.approachDurationSec > 0
            ? state.sim.approachTotalMeters / state.sim.approachDurationSec
            : 12;
        state.sim.progressMeters += avgSpeedMps * state.sim.speedMultiplier * dtSec;

        if (state.sim.progressMeters >= state.sim.approachTotalMeters) {
          state.sim.phase = "IN_TRANSIT_TO_DROPOFF";
          state.sim.progressMeters = 0;
        }
      }

      if (state.sim.phase === "IN_TRANSIT_TO_DROPOFF") {
        const avgSpeedMps =
          state.sim.tripDurationSec > 0
            ? state.sim.tripTotalMeters / state.sim.tripDurationSec
            : 14;
        state.sim.progressMeters += avgSpeedMps * state.sim.speedMultiplier * dtSec;

        if (state.sim.progressMeters >= state.sim.tripTotalMeters) {
          state.sim.progressMeters = state.sim.tripTotalMeters;
          state.sim.phase = "ARRIVED";
        }
      }

      const activePath =
        state.sim.phase === "EN_ROUTE_TO_PICKUP" ? state.sim.approachPath : state.sim.tripPath;
      const activeCum =
        state.sim.phase === "EN_ROUTE_TO_PICKUP" ? state.sim.approachCumDist : state.sim.tripCumDist;

      const sample = samplePathAtDistance(activePath, activeCum, state.sim.progressMeters);
      if (sample && state.markers.driver) {
        state.markers.driver.position = sample.position;
        if (state.markers.driverCarPuck) {
          state.markers.driverCarPuck.style.transform = `rotate(${Math.round(sample.heading)}deg)`;
        }
      }
      updateLiveEtaReadout();
    }

    if (state.sim.phase !== "ARRIVED") {
      state.sim.rafId = requestAnimationFrame(step);
    }
  };

  state.sim.rafId = requestAnimationFrame(step);
}

async function dispatchClosestDriver() {
  if (!state.pickup || !state.dropoff) return;

  const { encoding } = state.mapsLibs.geometry;
  const { Polyline } = state.mapsLibs.maps;
  const { AdvancedMarkerElement } = state.mapsLibs.marker;

  state.candidates = generateCandidateDriversNearPickup(state.pickup.location);

  // Evaluate live driving matrix from all 4 candidate vehicles to passenger pickup
  const matrixResults = await apiPost("/api/routes/matrix", {
    origins: state.candidates.map((c) => ({
      latitude: c.location.lat,
      longitude: c.location.lng,
    })),
    destinations: [
      {
        latitude: state.pickup.location.lat,
        longitude: state.pickup.location.lng,
      },
    ],
  });

  if (Array.isArray(matrixResults)) {
    matrixResults.forEach((elem) => {
      const idx = elem.originIndex ?? 0;
      if (state.candidates[idx] && elem.condition === "ROUTE_EXISTS") {
        state.candidates[idx].etaSeconds = parseDurationSeconds(elem.duration);
        state.candidates[idx].distanceMeters = elem.distanceMeters || 0;
      }
    });
  }

  // Pick closest candidate by live traffic ETA
  const sorted = [...state.candidates].sort(
    (a, b) => (a.etaSeconds ?? Number.MAX_SAFE_INTEGER) - (b.etaSeconds ?? Number.MAX_SAFE_INTEGER)
  );
  state.dispatchedDriver = sorted[0];
  renderCandidateMarkersAndList();

  // Compute road-snapped approach polyline for the dispatched driver
  const approachResp = await apiPost("/api/routes/compute", {
    origin: {
      latLng: {
        latitude: state.dispatchedDriver.location.lat,
        longitude: state.dispatchedDriver.location.lng,
      },
    },
    destination: {
      latLng: {
        latitude: state.pickup.location.lat,
        longitude: state.pickup.location.lng,
      },
    },
    emissionType: state.dispatchedDriver.emissionType,
    includeEco: false,
  });

  state.approachRoute = approachResp?.routes?.[0] || null;
  if (state.polylines.approach) state.polylines.approach.setMap(null);

  let approachPath = [state.dispatchedDriver.location, state.pickup.location];
  if (state.approachRoute?.polyline?.encodedPolyline) {
    approachPath = encoding.decodePath(state.approachRoute.polyline.encodedPolyline);
  }

  state.polylines.approach = new Polyline({
    map: state.map,
    path: approachPath,
    strokeColor: "#0284c7",
    strokeOpacity: 0,
    strokeWeight: 4,
    zIndex: 15,
    icons: [
      {
        icon: { path: "M 0,-1 0,1", strokeOpacity: 0.85, scale: 3 },
        offset: "0",
        repeat: "14px",
      },
    ],
  });

  const activeTrip = getActiveTripRoute();
  const tripPath = activeTrip?.polyline?.encodedPolyline
    ? encoding.decodePath(activeTrip.polyline.encodedPolyline)
    : [state.pickup.location, state.dropoff.location];

  const approachStats = buildCumulativeDistances(approachPath);
  const tripStats = buildCumulativeDistances(tripPath);

  state.sim.approachPath = approachPath;
  state.sim.approachCumDist = approachStats.cum;
  state.sim.approachTotalMeters = approachStats.total;
  state.sim.approachDurationSec =
    parseDurationSeconds(state.approachRoute?.duration) ||
    state.dispatchedDriver.etaSeconds ||
    180;

  state.sim.tripPath = tripPath;
  state.sim.tripCumDist = tripStats.cum;
  state.sim.tripTotalMeters = tripStats.total;
  state.sim.tripDurationSec = parseDurationSeconds(activeTrip?.duration) || 1200;

  state.sim.phase = "EN_ROUTE_TO_PICKUP";
  state.sim.progressMeters = 0;
  state.sim.running = true;
  dom.toggleSimBtn.textContent = "Pause Simulation";

  if (state.markers.driver) {
    state.markers.driver.map = null;
  }

  const { shell, puck, tag } = createDriverMarkerContent(state.dispatchedDriver.name);
  state.markers.driverCarPuck = puck;
  state.markers.driverTag = tag;
  state.markers.driver = new AdvancedMarkerElement({
    map: state.map,
    position: approachPath[0],
    content: shell,
    title: `Dispatched: ${state.dispatchedDriver.name}`,
    zIndex: 1000,
  });

  updateLiveEtaReadout();
  startDriverAnimationLoop();
}

async function computeTripRoutes() {
  if (!state.pickup || !state.dropoff) return;

  const routeResp = await apiPost("/api/routes/compute", {
    origin: state.pickup.id
      ? { placeId: state.pickup.id }
      : {
          latLng: {
            latitude: state.pickup.location.lat,
            longitude: state.pickup.location.lng,
          },
        },
    destination: state.dropoff.id
      ? { placeId: state.dropoff.id }
      : {
          latLng: {
            latitude: state.dropoff.location.lat,
            longitude: state.dropoff.location.lng,
          },
        },
    emissionType: state.emissionType,
    includeEco: true,
  });

  const routes = routeResp?.routes || [];
  if (routes.length === 0) {
    throw new Error("No driving routes returned between selected locations.");
  }

  state.fastestRoute =
    routes.find((r) => Array.isArray(r.routeLabels) && r.routeLabels.includes("DEFAULT_ROUTE")) ||
    routes[0];
  state.ecoRoute =
    routes.find((r) => Array.isArray(r.routeLabels) && r.routeLabels.includes("FUEL_EFFICIENT")) ||
    state.fastestRoute;

  renderRouteComparisonUI();
  renderFareEstimates();
  drawTripPolylines();

  // Keep trip polyline synchronized if driver simulation is active
  const { encoding } = state.mapsLibs.geometry;
  const activeTrip = getActiveTripRoute();
  if (activeTrip?.polyline?.encodedPolyline) {
    const newTripPath = encoding.decodePath(activeTrip.polyline.encodedPolyline);
    const newTripStats = buildCumulativeDistances(newTripPath);
    state.sim.tripPath = newTripPath;
    state.sim.tripCumDist = newTripStats.cum;
    state.sim.tripTotalMeters = newTripStats.total;
    state.sim.tripDurationSec = parseDurationSeconds(activeTrip.duration) || 1200;
  }
}

async function recomputeTripAndDispatch() {
  try {
    clearError();
    upsertEndpointMarkers();
    await computeTripRoutes();
    await dispatchClosestDriver();
  } catch (err) {
    showError(err.message || "Unable to compute routes or dispatch driver.");
  }
}

function bindUIHandlers() {
  dom.swapBtn.addEventListener("click", async () => {
    if (!state.pickup || !state.dropoff) return;
    const prevPickup = state.pickup;
    state.pickup = state.dropoff;
    state.dropoff = prevPickup;

    if (state.autocomplete.pickupEl) {
      state.autocomplete.pickupEl.value = state.pickup.address || state.pickup.name;
    }
    if (state.autocomplete.dropoffEl) {
      state.autocomplete.dropoffEl.value = state.dropoff.address || state.dropoff.name;
    }
    updatePlaceMetadataUI();
    await recomputeTripAndDispatch();
  });

  dom.emissionSelect.addEventListener("change", async (e) => {
    state.emissionType = e.target.value;
    try {
      clearError();
      await computeTripRoutes();
    } catch (err) {
      showError(err.message || "Failed to recalculate fuel efficiency for emission type.");
    }
  });

  dom.routeFastestCard.addEventListener("click", () => {
    state.selectedRouteType = "fastest";
    renderRouteComparisonUI();
    renderFareEstimates();
    drawTripPolylines();
    const { encoding } = state.mapsLibs.geometry;
    if (state.fastestRoute?.polyline?.encodedPolyline) {
      const tripPath = encoding.decodePath(state.fastestRoute.polyline.encodedPolyline);
      const stats = buildCumulativeDistances(tripPath);
      state.sim.tripPath = tripPath;
      state.sim.tripCumDist = stats.cum;
      state.sim.tripTotalMeters = stats.total;
      state.sim.tripDurationSec = parseDurationSeconds(state.fastestRoute.duration) || 1200;
    }
  });

  dom.routeEcoCard.addEventListener("click", () => {
    state.selectedRouteType = "eco";
    renderRouteComparisonUI();
    renderFareEstimates();
    drawTripPolylines();
    const { encoding } = state.mapsLibs.geometry;
    if (state.ecoRoute?.polyline?.encodedPolyline) {
      const tripPath = encoding.decodePath(state.ecoRoute.polyline.encodedPolyline);
      const stats = buildCumulativeDistances(tripPath);
      state.sim.tripPath = tripPath;
      state.sim.tripCumDist = stats.cum;
      state.sim.tripTotalMeters = stats.total;
      state.sim.tripDurationSec = parseDurationSeconds(state.ecoRoute.duration) || 1200;
    }
  });

  for (const [tierKey, btnEl] of Object.entries(dom.fareCards)) {
    btnEl.addEventListener("click", () => {
      state.selectedFareTier = tierKey;
      renderFareEstimates();
    });
  }

  dom.dispatchBtn.addEventListener("click", async () => {
    try {
      clearError();
      await dispatchClosestDriver();
    } catch (err) {
      showError(err.message || "Failed to dispatch driver.");
    }
  });

  dom.toggleSimBtn.addEventListener("click", () => {
    if (state.sim.phase === "ARRIVED") {
      dispatchClosestDriver().catch((err) => showError(err.message));
      return;
    }
    state.sim.running = !state.sim.running;
    dom.toggleSimBtn.textContent = state.sim.running ? "Pause Simulation" : "Resume Simulation";
    updateLiveEtaReadout();
  });
}

async function initApp() {
  bindUIHandlers();

  try {
    const configRes = await fetch("/api/config");
    const config = await configRes.json();

    if (!config.configured || !config.googleMapsApiKey) {
      showConfigWarning(
        "GOOGLE_MAPS_API_KEY is not set in .env. Add a Google Maps Platform API key (or free Maps Demo Key) to .env and reload."
      );
      dom.headerDispatchBadge.textContent = "API Key Required";
      return;
    }

    await loadGoogleMapsBootstrap(config.googleMapsApiKey);

    const [coreLib, mapsLib, markerLib, placesLib, routesLib, geometryLib] = await Promise.all([
      google.maps.importLibrary("core"),
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
      google.maps.importLibrary("places"),
      google.maps.importLibrary("routes"),
      google.maps.importLibrary("geometry"),
    ]);

    state.mapsLibs = {
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
      mapId: "DEMO_MAP_ID",
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    setupAutocompleteWidgets();

    // Resolve pre-seeded Los Angeles pickup & drop-off via Places API (New)
    const [pickupPlace, dropoffPlace] = await Promise.all([
      resolvePlaceByText(SEED_PICKUP_QUERY),
      resolvePlaceByText(SEED_DROPOFF_QUERY),
    ]);

    state.pickup = pickupPlace;
    state.dropoff = dropoffPlace;

    if (state.autocomplete.pickupEl) {
      state.autocomplete.pickupEl.value = pickupPlace.name;
    }
    if (state.autocomplete.dropoffEl) {
      state.autocomplete.dropoffEl.value = dropoffPlace.name;
    }
    updatePlaceMetadataUI();

    await recomputeTripAndDispatch();
  } catch (err) {
    showError(err.message || "Failed to initialize Los Angeles rideshare application.");
    dom.headerDispatchBadge.textContent = "Initialization Error";
  }
}

initApp();
