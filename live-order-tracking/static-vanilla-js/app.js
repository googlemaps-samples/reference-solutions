import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const KITCHEN_HUB = {
  name: "Fulton Market Kitchen Hub",
  address: "915 W Fulton Market, Chicago, IL 60607",
  location: { lat: 41.8868, lng: -87.6486 },
};

const SEED_ADDRESS = "401 N Michigan Ave, Chicago, IL 60611";
const PRESET_IN_ZONE_ADDRESS = "2111 N Clark St, Chicago, IL 60614";
const PRESET_OUT_OF_ZONE_ADDRESS = "5801 S Ellis Ave, Chicago, IL 60637";

const ORDER_ITEMS_SUBTOTAL = 42.5;
const MAX_ROAD_DISTANCE_METERS = 8000;
const COURIER_ANIMATION_DURATION_MS = 28000;

// Chicago Fulton Market / Loop / River North / Lincoln Park / West Loop / Pilsen delivery zone
const DELIVERY_ZONE_COORDS = [
  { lat: 41.938, lng: -87.695 },
  { lat: 41.936, lng: -87.63 },
  { lat: 41.908, lng: -87.615 },
  { lat: 41.884, lng: -87.613 },
  { lat: 41.856, lng: -87.624 },
  { lat: 41.852, lng: -87.676 },
  { lat: 41.882, lng: -87.702 },
  { lat: 41.914, lng: -87.705 },
];

const ui = {
  topStatusPill: document.getElementById("top-status-pill"),
  apiKeyAlert: document.getElementById("api-key-alert"),
  autocompleteHost: document.getElementById("checkout-address-autocomplete"),
  fallbackInput: document.getElementById("fallback-address-input"),
  validateBtn: document.getElementById("validate-address-btn"),
  presetInZoneBtn: document.getElementById("preset-address-in-zone-btn"),
  presetOutZoneBtn: document.getElementById("preset-address-out-of-zone-btn"),
  zoneEligibilityBadge: document.getElementById("zone-eligibility-badge"),
  validationStatusPanel: document.getElementById("validation-status-panel"),
  metricDistance: document.getElementById("metric-distance"),
  metricEta: document.getElementById("metric-eta"),
  metricFee: document.getElementById("metric-fee"),
  tierExplanation: document.getElementById("tier-explanation"),
  placeOrderBtn: document.getElementById("place-order-btn"),
  courierToggleBtn: document.getElementById("courier-simulation-toggle-btn"),
  courierStatusLabel: document.getElementById("courier-status-label"),
  courierProgressPct: document.getElementById("courier-progress-pct"),
  courierProgressBar: document.getElementById("courier-progress-bar"),
  courierStepHint: document.getElementById("courier-step-hint"),
  receiptOrderMeta: document.getElementById("receipt-order-meta"),
  staticReceiptImg: document.getElementById("static-receipt-map-img"),
  staticReceiptPlaceholder: document.getElementById("static-receipt-placeholder"),
  receiptDeliveryFee: document.getElementById("receipt-delivery-fee"),
  receiptTotalAmount: document.getElementById("receipt-total-amount"),
  floatingEtaValue: document.getElementById("floating-eta-value"),
  floatingEtaSub: document.getElementById("floating-eta-sub"),
  mapCanvas: document.getElementById("live-tracking-map"),
};

const state = {
  map: null,
  mapsLib: null,
  markerLib: null,
  geometryLib: null,
  routesLib: null,
  geocodingLib: null,
  autocompleteEl: null,
  deliveryZonePolygon: null,
  kitchenMarker: null,
  customerMarker: null,
  courierMarker: null,
  routePolyline: null,
  currentAddressQuery: SEED_ADDRESS,
  activeRoutePath: [],
  cumulativeDistances: [],
  totalPathMeters: 0,
  totalEtaSeconds: 0,
  isDeliverable: false,
  deliveryFee: null,
  orderConfirmed: false,
  orderNumber: "FMP-2026-8419",
  animation: {
    rafId: null,
    running: false,
    progress: 0,
    lastTimestamp: 0,
  },
};

function setTopStatus(text, toneClass) {
  ui.topStatusPill.textContent = text;
  ui.topStatusPill.className = `status-pill ${toneClass}`;
}

function showAlert(message) {
  ui.apiKeyAlert.textContent = message;
  ui.apiKeyAlert.classList.remove("hidden");
}

function createSvgIcon(pathD, viewBox = "0 0 24 24") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  return svg;
}

function createMarkerBadge(label, variantClass, iconPathD) {
  const badge = document.createElement("div");
  badge.className = `marker-badge ${variantClass}`;
  badge.appendChild(createSvgIcon(iconPathD));

  const span = document.createElement("span");
  span.textContent = label;
  badge.appendChild(span);
  return badge;
}

function calculateTieredFee(distanceMeters) {
  if (distanceMeters <= 3000) {
    return { fee: 2.99, label: "Express Local Tier (<= 3.0 km)" };
  }
  if (distanceMeters <= 5500) {
    return { fee: 4.99, label: "Metro Core Tier (<= 5.5 km)" };
  }
  if (distanceMeters <= MAX_ROAD_DISTANCE_METERS) {
    return { fee: 6.99, label: "Extended Zone Tier (<= 8.0 km)" };
  }
  return { fee: null, label: "Exceeds 8.0 km road-distance cap" };
}

function parseDurationSeconds(durationStr, fallbackMillis) {
  if (typeof durationStr === "string" && durationStr.endsWith("s")) {
    const parsed = Number.parseFloat(durationStr.slice(0, -1));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  if (Number.isFinite(fallbackMillis)) {
    return Math.round(fallbackMillis / 1000);
  }
  return 0;
}

function renderValidationPanel(validationData, fallbackNotice) {
  const container = ui.validationStatusPanel;
  const children = [];

  if (fallbackNotice) {
    const notice = document.createElement("p");
    notice.className = "muted-note";
    notice.textContent = fallbackNotice;
    children.push(notice);
  }

  const result = validationData?.result;
  if (!result) {
    container.replaceChildren(...children);
    return;
  }

  const verdict = result.verdict || {};
  const address = result.address || {};
  const metadata = result.metadata || {};
  const uspsData = result.uspsData || {};

  const addressEl = document.createElement("div");
  addressEl.className = "verdict-address";
  addressEl.textContent =
    address.formattedAddress || state.currentAddressQuery || "Validated Address";
  children.push(addressEl);

  const propertyType = metadata.residential
    ? "Residential"
    : metadata.business
      ? "Commercial"
      : metadata.poBox
        ? "PO Box"
        : "Standard Premise";

  const dpvCode = uspsData.dpvConfirmation || "N/A";
  const dpvLabel =
    dpvCode === "Y"
      ? "Y (Confirmed)"
      : dpvCode === "D"
        ? "D (Missing Secondary)"
        : dpvCode === "S"
          ? "S (Secondary Unconfirmed)"
          : dpvCode === "N"
            ? "N (Not Deliverable)"
            : dpvCode;

  const kvPairs = [
    ["Validation Granularity", verdict.validationGranularity || "UNKNOWN"],
    ["Geocode Granularity", verdict.geocodeGranularity || "UNKNOWN"],
    ["Address Complete", verdict.addressComplete ? "Yes" : "Needs Review"],
    [
      "Component Flags",
      [
        verdict.hasUnconfirmedComponents ? "Unconfirmed" : null,
        verdict.hasInferredComponents ? "Inferred" : null,
        verdict.hasReplacedComponents ? "Replaced" : null,
      ]
        .filter(Boolean)
        .join(", ") || "All Confirmed",
    ],
    ["Property Type", propertyType],
    ["USPS CASS DPV", dpvLabel],
  ];

  const grid = document.createElement("div");
  grid.className = "verdict-grid";

  for (const [k, v] of kvPairs) {
    const cell = document.createElement("div");
    cell.className = "verdict-kv";

    const keyEl = document.createElement("span");
    keyEl.className = "verdict-k";
    keyEl.textContent = k;

    const valEl = document.createElement("span");
    valEl.className = "verdict-v";
    valEl.textContent = v;

    cell.append(keyEl, valEl);
    grid.appendChild(cell);
  }

  children.push(grid);
  container.replaceChildren(...children);
}

function updateZoneEligibilityUI({ insidePolygon, distanceMeters, withinDistanceCap }) {
  const kmText = (distanceMeters / 1000).toFixed(2);
  if (insidePolygon && withinDistanceCap) {
    ui.zoneEligibilityBadge.className = "eligibility-banner eligibility-pass";
    ui.zoneEligibilityBadge.textContent = `Deliverable: Inside Chicago zone polygon & ${kmText} km road distance (<= 8.0 km limit).`;
    setTopStatus("In Delivery Zone", "status-ok");
    return;
  }

  const reasons = [];
  if (!insidePolygon) reasons.push("outside the Chicago zone polygon");
  if (!withinDistanceCap) reasons.push(`${kmText} km exceeds the 8.0 km road limit`);
  ui.zoneEligibilityBadge.className = "eligibility-banner eligibility-fail";
  ui.zoneEligibilityBadge.textContent = `Not Deliverable: Drop-off is ${reasons.join(" and ")}.`;
  setTopStatus("Outside Delivery Zone", "status-warn");
}

function updateReceiptSection({ origin, destination, encodedPolyline, deliveryFee }) {
  if (deliveryFee !== null) {
    ui.receiptDeliveryFee.textContent = `$${deliveryFee.toFixed(2)}`;
    ui.receiptTotalAmount.textContent = `$${(ORDER_ITEMS_SUBTOTAL + deliveryFee).toFixed(2)}`;
  } else {
    ui.receiptDeliveryFee.textContent = "Unavailable";
    ui.receiptTotalAmount.textContent = `$${ORDER_ITEMS_SUBTOTAL.toFixed(2)}`;
  }

  ui.receiptOrderMeta.textContent = state.orderConfirmed
    ? `Order #${state.orderNumber} • Confirmed Dispatch`
    : `Order #${state.orderNumber} • Route Preview`;

  const params = new URLSearchParams({
    originLat: String(origin.lat),
    originLng: String(origin.lng),
    destLat: String(destination.lat),
    destLng: String(destination.lng),
    size: "600x260",
    scale: "2",
  });
  if (encodedPolyline) {
    params.set("polyline", encodedPolyline);
  }

  const imgUrl = `/api/maps/static-receipt?${params.toString()}`;
  ui.staticReceiptPlaceholder.textContent = "Loading Maps Static API route summary…";
  ui.staticReceiptPlaceholder.classList.remove("hidden");
  ui.staticReceiptImg.classList.add("hidden");

  ui.staticReceiptImg.onload = () => {
    ui.staticReceiptImg.classList.remove("hidden");
    ui.staticReceiptPlaceholder.classList.add("hidden");
  };
  ui.staticReceiptImg.onerror = () => {
    ui.staticReceiptImg.classList.add("hidden");
    ui.staticReceiptPlaceholder.classList.remove("hidden");
    ui.staticReceiptPlaceholder.textContent =
      "Static route preview unavailable (verify Maps Static API is enabled for your key).";
  };
  ui.staticReceiptImg.src = imgUrl;
}

function stopCourierAnimation() {
  if (state.animation.rafId !== null) {
    cancelAnimationFrame(state.animation.rafId);
    state.animation.rafId = null;
  }
  state.animation.running = false;
}

function prepareCourierPathMetrics(pathLatLngs) {
  state.activeRoutePath = pathLatLngs;
  state.cumulativeDistances = [0];
  let total = 0;

  for (let i = 1; i < pathLatLngs.length; i += 1) {
    const seg = state.geometryLib.spherical.computeDistanceBetween(
      pathLatLngs[i - 1],
      pathLatLngs[i]
    );
    total += seg;
    state.cumulativeDistances.push(total);
  }

  state.totalPathMeters = total;
}

function interpolatePositionAlongPath(progress) {
  const path = state.activeRoutePath;
  if (!path || path.length === 0) return KITCHEN_HUB.location;
  if (path.length === 1 || progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  const targetDist = progress * state.totalPathMeters;
  const dists = state.cumulativeDistances;

  let idx = 1;
  while (idx < dists.length - 1 && dists[idx] < targetDist) {
    idx += 1;
  }

  const segStart = dists[idx - 1];
  const segEnd = dists[idx];
  const segLen = segEnd - segStart;
  const frac = segLen > 0 ? (targetDist - segStart) / segLen : 0;

  const p1 = path[idx - 1];
  const p2 = path[idx];
  return {
    lat: p1.lat() + (p2.lat() - p1.lat()) * frac,
    lng: p1.lng() + (p2.lng() - p1.lng()) * frac,
  };
}

function updateCourierProgressUI(progress) {
  const pct = Math.round(progress * 100);
  ui.courierProgressBar.style.width = `${pct}%`;
  ui.courierProgressPct.textContent = `${pct}%`;

  const remainingSeconds = Math.max(0, Math.round(state.totalEtaSeconds * (1 - progress)));
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  const remainingKm = ((state.totalPathMeters * (1 - progress)) / 1000).toFixed(1);

  if (progress >= 1) {
    ui.courierStatusLabel.textContent = "Delivered at Drop-off!";
    ui.courierStepHint.textContent = "Order dropped off at customer entrance. Click Replay to run again.";
    ui.floatingEtaValue.textContent = "Arrived!";
    ui.floatingEtaSub.textContent = "Courier reached destination";
    ui.courierToggleBtn.textContent = "Replay Delivery";
    setTopStatus("Order Delivered", "status-ok");
    return;
  }

  if (progress < 0.12) {
    ui.courierStatusLabel.textContent = "Kitchen Hand-off";
  } else if (progress < 0.85) {
    ui.courierStatusLabel.textContent = "Courier En Route";
  } else {
    ui.courierStatusLabel.textContent = "Arriving Shortly";
  }

  ui.courierStepHint.textContent = `${remainingKm} km remaining • ~${remainingMinutes} min ETA along active route`;
  ui.floatingEtaValue.textContent = `${remainingMinutes} min ETA`;
  ui.floatingEtaSub.textContent = `${remainingKm} km left • Live Courier`;
}

function startCourierAnimation({ reset = false } = {}) {
  if (!state.activeRoutePath.length || !state.isDeliverable) return;

  stopCourierAnimation();
  if (reset) {
    state.animation.progress = 0;
  } else if (state.animation.progress >= 1) {
    state.animation.progress = 0;
  }

  state.animation.running = true;
  state.animation.lastTimestamp = performance.now();
  ui.courierToggleBtn.disabled = false;
  ui.courierToggleBtn.textContent = "Pause Courier";
  setTopStatus("Courier Live", "status-live");

  const tick = (now) => {
    if (!state.animation.running) return;
    const dt = Math.max(0, now - state.animation.lastTimestamp);
    state.animation.lastTimestamp = now;

    state.animation.progress = Math.min(
      1,
      state.animation.progress + dt / COURIER_ANIMATION_DURATION_MS
    );

    const pos = interpolatePositionAlongPath(state.animation.progress);
    if (state.courierMarker) {
      state.courierMarker.position = pos;
    }
    updateCourierProgressUI(state.animation.progress);

    if (state.animation.progress < 1) {
      state.animation.rafId = requestAnimationFrame(tick);
    } else {
      state.animation.running = false;
      state.animation.rafId = null;
    }
  };

  state.animation.rafId = requestAnimationFrame(tick);
}

async function computeDeliveryRoute(origin, destination) {
  // Primary: server-side BFF proxy to Routes API v2
  try {
    const res = await fetch("/api/routes/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin,
        destination,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      }),
    });

    if (res.ok) {
      const payload = await res.json();
      const route = payload.routes?.[0];
      if (route) {
        const encodedPolyline = route.polyline?.encodedPolyline || "";
        const decodedPath = encodedPolyline
          ? state.geometryLib.encoding.decodePath(encodedPolyline)
          : [];
        return {
          distanceMeters: Number(route.distanceMeters || 0),
          durationSeconds: parseDurationSeconds(route.duration),
          encodedPolyline,
          pathLatLngs: decodedPath,
          steps: route.legs?.[0]?.steps || [],
        };
      }
    }
  } catch {
    // Fall back to Maps JS SDK Route.computeRoutes below
  }

  // Fallback: Maps JS SDK Route.computeRoutes
  if (state.routesLib?.Route?.computeRoutes) {
    const { routes } = await state.routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: "DRIVING",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      fields: ["distanceMeters", "durationMillis", "path", "legs"],
    });
    const route = routes?.[0];
    if (route) {
      const pathLatLngs = (route.path || []).map((pt) =>
        pt.lat ? pt : new google.maps.LatLng(pt.lat, pt.lng)
      );
      const encodedPolyline =
        pathLatLngs.length > 1
          ? state.geometryLib.encoding.encodePath(pathLatLngs)
          : "";
      return {
        distanceMeters: Number(route.distanceMeters || 0),
        durationSeconds: parseDurationSeconds(null, route.durationMillis),
        encodedPolyline,
        pathLatLngs,
        steps: route.legs?.[0]?.steps || [],
      };
    }
  }

  throw new Error("Unable to compute delivery route for this destination.");
}

async function geocodeFallbackAddress(addressText) {
  if (!state.geocodingLib?.Geocoder) return null;
  const geocoder = new state.geocodingLib.Geocoder();
  const { results } = await geocoder.geocode({
    address: addressText,
    region: "US",
  });
  const first = results?.[0];
  if (!first?.geometry?.location) return null;
  return {
    formattedAddress: first.formatted_address,
    location: {
      lat: first.geometry.location.lat(),
      lng: first.geometry.location.lng(),
    },
  };
}

async function runCheckoutValidationPipeline(
  addressText,
  knownLatLng = null,
  { autoStartCourier = false } = {}
) {
  const trimmed = (addressText || "").trim();
  if (!trimmed) return;

  state.currentAddressQuery = trimmed;
  stopCourierAnimation();
  setTopStatus("Validating Address…", "status-neutral");

  let validationPayload = null;
  let validationNotice = "";
  let resolvedLocation = knownLatLng;
  let standardizedAddress = trimmed;

  try {
    const res = await fetch("/api/address/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressLines: [trimmed],
        regionCode: "US",
        enableUspsCass: true,
      }),
    });

    const data = await res.json();
    if (res.ok && data?.result) {
      validationPayload = data;
      const geoLoc = data.result.geocode?.location;
      if (geoLoc && Number.isFinite(geoLoc.latitude) && Number.isFinite(geoLoc.longitude)) {
        resolvedLocation = { lat: geoLoc.latitude, lng: geoLoc.longitude };
      }
      if (data.result.address?.formattedAddress) {
        standardizedAddress = data.result.address.formattedAddress;
      }
    } else {
      validationNotice = `Address Validation service notice: ${
        data?.error?.message || data?.error || `HTTP ${res.status}`
      }`;
    }
  } catch (err) {
    validationNotice = `Address Validation request failed: ${err.message}`;
  }

  if (!resolvedLocation) {
    try {
      const geocoded = await geocodeFallbackAddress(trimmed);
      if (geocoded) {
        resolvedLocation = geocoded.location;
        standardizedAddress = geocoded.formattedAddress || standardizedAddress;
      }
    } catch {
      // Handled below
    }
  }

  renderValidationPanel(validationPayload, validationNotice);

  if (!resolvedLocation) {
    ui.zoneEligibilityBadge.className = "eligibility-banner eligibility-fail";
    ui.zoneEligibilityBadge.textContent =
      "Could not resolve coordinates for this address. Please select a valid Chicago street address.";
    ui.placeOrderBtn.disabled = true;
    return;
  }

  // Update Customer Marker
  if (state.customerMarker) {
    state.customerMarker.position = resolvedLocation;
    state.customerMarker.title = standardizedAddress;
  }

  // Polygon containment check using Maps JS Geometry Library
  const { LatLng } = await importLibrary("core");
  const dropOffLatLngObj = new LatLng(resolvedLocation.lat, resolvedLocation.lng);
  const insidePolygon = state.geometryLib.poly.containsLocation(
    dropOffLatLngObj,
    state.deliveryZonePolygon
  );

  // Compute driving route via Routes API
  let routeInfo;
  try {
    routeInfo = await computeDeliveryRoute(KITCHEN_HUB.location, resolvedLocation);
  } catch (err) {
    ui.zoneEligibilityBadge.className = "eligibility-banner eligibility-fail";
    ui.zoneEligibilityBadge.textContent = `Route calculation failed: ${err.message}`;
    ui.placeOrderBtn.disabled = true;
    return;
  }

  const withinDistanceCap = routeInfo.distanceMeters <= MAX_ROAD_DISTANCE_METERS;
  const isDeliverable = insidePolygon && withinDistanceCap;
  state.isDeliverable = isDeliverable;
  state.totalEtaSeconds = routeInfo.durationSeconds;

  const tier = calculateTieredFee(routeInfo.distanceMeters);
  state.deliveryFee = isDeliverable ? tier.fee : null;

  updateZoneEligibilityUI({
    insidePolygon,
    distanceMeters: routeInfo.distanceMeters,
    withinDistanceCap,
  });

  // Update Route Metrics UI
  const kmDisplay = `${(routeInfo.distanceMeters / 1000).toFixed(2)} km`;
  const etaMins = Math.max(1, Math.round(routeInfo.durationSeconds / 60));
  ui.metricDistance.textContent = kmDisplay;
  ui.metricEta.textContent = `${etaMins} min`;
  ui.metricFee.textContent = state.deliveryFee !== null ? `$${state.deliveryFee.toFixed(2)}` : "N/A";
  ui.tierExplanation.textContent = isDeliverable
    ? `Active Tier: ${tier.label} • Standard prep + live traffic included`
    : "Outside delivery coverage: Drop-off must be inside the Fulton Market zone and <= 8.0 km.";

  // Render Route Polyline on interactive map
  if (state.routePolyline) {
    state.routePolyline.setMap(null);
  }
  const pathPoints =
    routeInfo.pathLatLngs.length > 1
      ? routeInfo.pathLatLngs
      : [new LatLng(KITCHEN_HUB.location.lat, KITCHEN_HUB.location.lng), dropOffLatLngObj];

  state.routePolyline = new state.mapsLib.Polyline({
    path: pathPoints,
    geodesic: true,
    strokeColor: isDeliverable ? "#0F766E" : "#B91C1C",
    strokeOpacity: 0.9,
    strokeWeight: 5,
    map: state.map,
  });

  // Fit map bounds around hub, drop-off, and route
  const { LatLngBounds } = await importLibrary("core");
  const bounds = new LatLngBounds();
  bounds.extend(KITCHEN_HUB.location);
  bounds.extend(resolvedLocation);
  for (const pt of pathPoints) {
    bounds.extend(pt);
  }
  state.map.fitBounds(bounds, { top: 64, right: 48, bottom: 64, left: 48 });

  // Prepare Courier Marker & Path
  prepareCourierPathMetrics(pathPoints);
  if (state.courierMarker) {
    state.courierMarker.position = KITCHEN_HUB.location;
  }

  ui.placeOrderBtn.disabled = !isDeliverable;

  // Update Receipt & Maps Static API Preview
  updateReceiptSection({
    origin: KITCHEN_HUB.location,
    destination: resolvedLocation,
    encodedPolyline: routeInfo.encodedPolyline,
    deliveryFee: state.deliveryFee,
  });

  if (isDeliverable) {
    ui.floatingEtaValue.textContent = `${etaMins} min ETA`;
    ui.floatingEtaSub.textContent = `${kmDisplay} • Ready to dispatch`;
    if (autoStartCourier) {
      state.orderConfirmed = true;
      ui.receiptOrderMeta.textContent = `Order #${state.orderNumber} • Live Dispatch`;
      startCourierAnimation({ reset: true });
    } else {
      ui.courierStatusLabel.textContent = "Route Validated — Ready";
      ui.courierProgressPct.textContent = "0%";
      ui.courierProgressBar.style.width = "0%";
      ui.courierStepHint.textContent =
        "Click 'Place Order & Dispatch Courier' to launch live courier tracking.";
      ui.courierToggleBtn.disabled = true;
    }
  } else {
    ui.courierStatusLabel.textContent = "Delivery Unavailable";
    ui.courierProgressPct.textContent = "0%";
    ui.courierProgressBar.style.width = "0%";
    ui.courierStepHint.textContent = "Select an address inside the Chicago delivery zone.";
    ui.courierToggleBtn.disabled = true;
    ui.floatingEtaValue.textContent = "Outside Zone";
    ui.floatingEtaSub.textContent = `${kmDisplay} • Exceeds coverage`;
  }
}

function wireButtonHandlers() {
  ui.validateBtn.addEventListener("click", async () => {
    const inputVal =
      state.autocompleteEl?.value?.trim() ||
      ui.fallbackInput?.value?.trim() ||
      state.currentAddressQuery;
    await runCheckoutValidationPipeline(inputVal, null, { autoStartCourier: false });
  });

  ui.presetInZoneBtn.addEventListener("click", async () => {
    if (state.autocompleteEl) {
      state.autocompleteEl.value = PRESET_IN_ZONE_ADDRESS;
    }
    ui.fallbackInput.value = PRESET_IN_ZONE_ADDRESS;
    state.orderConfirmed = false;
    await runCheckoutValidationPipeline(PRESET_IN_ZONE_ADDRESS, null, {
      autoStartCourier: false,
    });
  });

  ui.presetOutZoneBtn.addEventListener("click", async () => {
    if (state.autocompleteEl) {
      state.autocompleteEl.value = PRESET_OUT_OF_ZONE_ADDRESS;
    }
    ui.fallbackInput.value = PRESET_OUT_OF_ZONE_ADDRESS;
    state.orderConfirmed = false;
    await runCheckoutValidationPipeline(PRESET_OUT_OF_ZONE_ADDRESS, null, {
      autoStartCourier: false,
    });
  });

  ui.placeOrderBtn.addEventListener("click", () => {
    if (!state.isDeliverable) return;
    state.orderConfirmed = true;
    state.orderNumber = `FMP-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    ui.receiptOrderMeta.textContent = `Order #${state.orderNumber} • Confirmed Dispatch`;
    startCourierAnimation({ reset: true });
  });

  ui.courierToggleBtn.addEventListener("click", () => {
    if (!state.isDeliverable) return;
    if (state.animation.running) {
      stopCourierAnimation();
      ui.courierToggleBtn.textContent = "Resume Courier";
      setTopStatus("Courier Paused", "status-neutral");
    } else {
      startCourierAnimation({ reset: state.animation.progress >= 1 });
    }
  });
}

async function initApp() {
  wireButtonHandlers();

  const apiKey = window.__GMP_CONFIG__?.apiKey || "";
  if (!apiKey) {
    showAlert(
      "GOOGLE_MAPS_API_KEY is not set. Create a .env file from .env.example with a Maps Demo Key or Google Cloud API key and restart server.mjs."
    );
    setTopStatus("API Key Missing", "status-warn");
    ui.fallbackInput.classList.remove("hidden");
    ui.placeOrderBtn.disabled = true;
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: "weekly",
      language: "en",
      region: "US",
    });

    const [mapsLib, markerLib, placesLib, routesLib, geometryLib, geocodingLib] =
      await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
        importLibrary("places"),
        importLibrary("routes"),
        importLibrary("geometry"),
        importLibrary("geocoding"),
      ]);

    state.mapsLib = mapsLib;
    state.markerLib = markerLib;
    state.routesLib = routesLib;
    state.geometryLib = geometryLib;
    state.geocodingLib = geocodingLib;

    state.map = new mapsLib.Map(ui.mapCanvas, {
      center: KITCHEN_HUB.location,
      zoom: 13,
      mapId: "DEMO_MAP_ID",
      internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Render Delivery Zone Polygon
    state.deliveryZonePolygon = new mapsLib.Polygon({
      paths: DELIVERY_ZONE_COORDS,
      strokeColor: "#0F766E",
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: "#14B8A6",
      fillOpacity: 0.12,
      map: state.map,
    });

    // Kitchen Hub AdvancedMarkerElement
    state.kitchenMarker = new markerLib.AdvancedMarkerElement({
      map: state.map,
      position: KITCHEN_HUB.location,
      title: KITCHEN_HUB.name,
    });
    state.kitchenMarker.append(
      createMarkerBadge(
        "Kitchen Hub",
        "marker-kitchen",
        "M12 2L3 7v2h18V7l-9-5zm-7 9v9h4v-6h6v6h4v-9H5z"
      )
    );

    // Customer Drop-off AdvancedMarkerElement
    state.customerMarker = new markerLib.AdvancedMarkerElement({
      map: state.map,
      position: KITCHEN_HUB.location,
      title: "Customer Drop-off",
    });
    state.customerMarker.append(
      createMarkerBadge(
        "Drop-off",
        "marker-customer",
        "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"
      )
    );

    // Courier AdvancedMarkerElement
    state.courierMarker = new markerLib.AdvancedMarkerElement({
      map: state.map,
      position: KITCHEN_HUB.location,
      title: "Live Courier",
      zIndex: 50,
    });
    state.courierMarker.append(
      createMarkerBadge(
        "Courier",
        "marker-courier",
        "M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2a3 3 0 006 0h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1zm12-3a3 3 0 100 6 3 3 0 000-6zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
      )
    );

    // Mount Places API (New) PlaceAutocompleteElement
    const { PlaceAutocompleteElement } = placesLib;
    const autocompleteEl = new PlaceAutocompleteElement({
      locationBias: { south: 41.72, west: -87.82, north: 42.02, east: -87.52 },
      includedRegionCodes: ["us"],
      placeholder: "Search Chicago delivery address...",
      value: SEED_ADDRESS,
      internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"],
    });
    ui.autocompleteHost.replaceChildren(autocompleteEl);
    state.autocompleteEl = autocompleteEl;

    autocompleteEl.addEventListener("gmp-select", async (event) => {
      try {
        const prediction = event.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ["formattedAddress", "location", "displayName", "id"],
        });
        const selectedAddress =
          place.formattedAddress || place.displayName || state.currentAddressQuery;
        const selectedLocation = place.location
          ? { lat: place.location.lat(), lng: place.location.lng() }
          : null;
        state.orderConfirmed = false;
        await runCheckoutValidationPipeline(selectedAddress, selectedLocation, {
          autoStartCourier: false,
        });
      } catch (err) {
        showAlert(`Places selection error: ${err.message}`);
      }
    });

    autocompleteEl.addEventListener("gmp-error", () => {
      showAlert(
        "Places Autocomplete could not reach Google Maps Platform. Verify your API key and enabled APIs."
      );
    });

    // Run initial seeded Chicago checkout + live courier simulation
    await runCheckoutValidationPipeline(SEED_ADDRESS, null, {
      autoStartCourier: true,
    });
  } catch (err) {
    showAlert(`Failed to initialize Google Maps Platform: ${err.message}`);
    setTopStatus("Map Init Error", "status-warn");
  }
}

initApp();
