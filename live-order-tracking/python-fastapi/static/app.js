const BASKET_ITEMS = [
  { name: "Fulton Rigatoni alla Vodka", qty: 1, priceUsd: 18.5 },
  { name: "Artisan Sourdough Boule", qty: 1, priceUsd: 7.25 },
  { name: "Honeycrisp Apples (2 lb bag)", qty: 1, priceUsd: 5.75 },
  { name: "Metric Coffee Cold Brew (4-pk)", qty: 1, priceUsd: 12.0 },
];

const TAX_RATE = 0.1025; // Chicago combined sales tax
const PREP_BUFFER_MINUTES = 12;
const SIMULATION_DURATION_MS = 22000;

const state = {
  config: null,
  mapsReady: false,
  map: null,
  infoWindow: null,
  deliveryZonePolygon: null,
  routePolyline: null,
  kitchenMarker: null,
  customerMarker: null,
  courierMarker: null,
  libs: {},
  lastValidation: null,
  lastRoute: null,
  eligible: false,
  orderId: "ORD-CHI-4082",
  orderPlacedAt: null,
  sim: {
    running: false,
    progress: 0,
    lastFrameTs: null,
    rafId: null,
    pathPoints: [],
    cumulativeDistances: [],
    totalPathMeters: 0,
  },
};

const dom = {
  apiKeyBanner: document.getElementById("api-key-banner"),
  headerStatusPill: document.getElementById("header-status-pill"),
  autocompleteMount: document.getElementById("autocomplete-mount"),
  addressLineInput: document.getElementById("address-line-input"),
  aptInput: document.getElementById("apt-input"),
  presetInZoneBtn: document.getElementById("preset-address-in-zone-btn"),
  presetOutOfZoneBtn: document.getElementById("preset-address-out-of-zone-btn"),
  validateAddressBtn: document.getElementById("validate-address-btn"),
  zoneEligibilityBadge: document.getElementById("zone-eligibility-badge"),
  validationStatusPanel: document.getElementById("validation-status-panel"),
  deliveryFeeEtaSummary: document.getElementById("delivery-fee-eta-summary"),
  placeOrderBtn: document.getElementById("place-order-btn"),
  courierSimToggleBtn: document.getElementById("courier-simulation-toggle-btn"),
  courierProgressPanel: document.getElementById("courier-progress-panel"),
  receiptDetails: document.getElementById("receipt-details"),
  staticReceiptMapImg: document.getElementById("static-receipt-map-img"),
  staticMapPlaceholder: document.getElementById("static-map-placeholder"),
  liveTrackingMap: document.getElementById("live-tracking-map"),
  mapFloatingMetrics: document.getElementById("map-floating-metrics"),
};

function setStatusPill(label, variant) {
  dom.headerStatusPill.textContent = label;
  dom.headerStatusPill.className = `status-pill ${variant}`;
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

function formatUsd(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function createMarkerBadge(roleClass, glyph, labelText) {
  const badge = createEl("div", `marker-badge ${roleClass}`);
  const iconSpan = createEl("span", "", glyph);
  const labelSpan = createEl("span", "", labelText);
  badge.append(iconSpan, labelSpan);
  return badge;
}

function openInfoWindowForMarker(marker, title, subtitle) {
  if (!state.infoWindow || !state.map) return;
  const content = createEl("div");
  content.style.padding = "4px 2px";
  const strong = createEl("strong", "", title);
  strong.style.display = "block";
  strong.style.marginBottom = "3px";
  const detail = createEl("span", "", subtitle);
  detail.style.fontSize = "12px";
  detail.style.color = "#475569";
  content.append(strong, detail);
  state.infoWindow.setContent(content);
  state.infoWindow.open({
    map: state.map,
    anchor: marker,
    shouldFocus: false,
  });
}

function loadGoogleMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return;
  }
  ((g) => {
    var h,
      a,
      k,
      p = "The Google Maps JavaScript API",
      c = "google",
      l = "importLibrary",
      q = "__ib__",
      m = document,
      b = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}),
      r = new Set(),
      e = new URLSearchParams(),
      u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          await (a = m.createElement("script"));
          e.set("libraries", [...r] + "");
          for (k in g) e.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k]);
          e.set("callback", c + ".maps." + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + " could not load.")));
          a.nonce = m.querySelector("script[nonce]")?.nonce || "";
          m.head.append(a);
        }));
    d[l]
      ? console.warn(p + " only loads once. Ignoring:", g)
      : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
  })({
    key: apiKey,
    v: "weekly",
    language: "en",
    region: "US",
  });
}

function renderApiKeyMissingBanner() {
  dom.apiKeyBanner.classList.remove("hidden");
  const title = createEl("strong", "", "Google Maps API Key Required: ");
  const desc = createEl(
    "span",
    "",
    "Set GOOGLE_MAPS_API_KEY in .env (using a free Maps Demo Key or Cloud API key) and reload to activate live map, Address Validation, Routes API, and Maps Static API."
  );
  dom.apiKeyBanner.replaceChildren(title, desc);
  setStatusPill("API Key Missing", "status-warn");
}

function renderValidationPanel(validationData) {
  const verdict = validationData.verdict || {};
  const meta = validationData.metadata || {};
  const usps = validationData.uspsData || {};
  const plusCode = validationData.plusCode || {};
  const coords = validationData.coordinates;

  const container = createEl("div");
  const addrTitle = createEl("strong", "", validationData.formattedAddress || "Validated Address");
  container.appendChild(addrTitle);

  const kvGrid = createEl("div", "kv-grid");
  const entries = [
    ["Validation Granularity", verdict.validationGranularity || "UNKNOWN"],
    ["Geocode Granularity", verdict.geocodeGranularity || "UNKNOWN"],
    [
      "Property Type",
      meta.poBox
        ? "PO Box (Undeliverable)"
        : meta.business
          ? "Commercial / Business"
          : meta.residential
            ? "Residential"
            : "Mixed / Unspecified",
    ],
    [
      "USPS DPV Status",
      usps.dpvConfirmation
        ? `DPV ${usps.dpvConfirmation}${usps.dpvVacant === "Y" ? " (Vacant)" : ""}`
        : "N/A",
    ],
    ["Plus Code", plusCode.compoundCode || plusCode.globalCode || "N/A"],
    [
      "Coordinates",
      coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Unavailable",
    ],
  ];

  for (const [label, val] of entries) {
    const item = createEl("div", "kv-item");
    item.append(createEl("span", "kv-label", label), createEl("span", "kv-value", val));
    kvGrid.appendChild(item);
  }
  container.appendChild(kvGrid);

  const flags = createEl("div", "flag-list");
  const flagItems = [
    [
      verdict.addressComplete ? "Address Complete" : "Incomplete Address",
      verdict.addressComplete ? "flag-ok" : "flag-warn",
    ],
    [
      verdict.hasUnconfirmedComponents ? "Has Unconfirmed Parts" : "All Parts Confirmed",
      verdict.hasUnconfirmedComponents ? "flag-warn" : "flag-ok",
    ],
    [
      verdict.hasInferredComponents ? "Inferred Components" : "No Inferred Parts",
      verdict.hasInferredComponents ? "flag-warn" : "flag-ok",
    ],
    [
      verdict.hasReplacedComponents ? "Standardized / Corrected" : "Exact Input Match",
      verdict.hasReplacedComponents ? "flag-warn" : "flag-ok",
    ],
    [
      usps.cassProcessed ? `USPS CASS (${usps.carrierRoute || "Verified"})` : "CASS Pending",
      usps.cassProcessed ? "flag-ok" : "flag-warn",
    ],
  ];

  for (const [text, cls] of flagItems) {
    flags.appendChild(createEl("span", `flag-pill ${cls}`, text));
  }
  container.appendChild(flags);

  if (validationData.placeId) {
    const pid = createEl("p", "muted-text", `Place ID: ${validationData.placeId}`);
    pid.style.marginTop = "8px";
    pid.style.fontSize = "11px";
    container.appendChild(pid);
  }

  dom.validationStatusPanel.replaceChildren(container);
}

function renderValidationError(message) {
  const errP = createEl("p", "", message);
  errP.style.margin = "0";
  errP.style.color = "#b91c1c";
  errP.style.fontWeight = "600";
  dom.validationStatusPanel.replaceChildren(errP);

  dom.zoneEligibilityBadge.textContent = "Validation Unavailable";
  dom.zoneEligibilityBadge.className = "eligibility-badge eligibility-fail";
}

function renderEligibilityBadge({ insidePolygon, withinDistanceLimit, isPoBox, granularityOk, routeData }) {
  const reasons = [];
  if (!insidePolygon) reasons.push("outside Chicago polygon");
  if (!withinDistanceLimit) reasons.push(`road distance ${routeData.distanceKm} km > 8.0 km cap`);
  if (isPoBox) reasons.push("PO Box not eligible for courier delivery");
  if (!granularityOk) reasons.push("address granularity too coarse");

  if (reasons.length === 0) {
    dom.zoneEligibilityBadge.textContent = `ELIGIBLE · Inside Polygon & ${routeData.distanceKm} km road distance (<= 8.0 km)`;
    dom.zoneEligibilityBadge.className = "eligibility-badge eligibility-pass";
    return true;
  }

  dom.zoneEligibilityBadge.textContent = `OUT OF ZONE · ${reasons.join(" · ")}`;
  dom.zoneEligibilityBadge.className = "eligibility-badge eligibility-fail";
  return false;
}

function renderFeeAndEta(routeData, eligible) {
  const container = createEl("div");
  const tierText = eligible
    ? `${routeData.tierLabel} · ${formatUsd(routeData.deliveryFeeUsd)}`
    : routeData.tierLabel;

  const headline = createEl("strong", "", tierText);
  container.appendChild(headline);

  const totalEta = routeData.durationMinutes + PREP_BUFFER_MINUTES;
  const grid = createEl("div", "kv-grid");
  const items = [
    ["Road Distance", `${routeData.distanceKm} km (${(routeData.distanceKm * 0.621371).toFixed(2)} mi)`],
    ["Traffic-Aware Drive", `${routeData.durationMinutes} min`],
    ["Prep + Delivery ETA", `${totalEta} min (${PREP_BUFFER_MINUTES}m prep + ${routeData.durationMinutes}m drive)`],
    ["Delivery Fee", eligible ? formatUsd(routeData.deliveryFeeUsd) : "Ineligible (> 8 km / outside zone)"],
  ];

  for (const [label, value] of items) {
    const cell = createEl("div", "kv-item");
    cell.append(createEl("span", "kv-label", label), createEl("span", "kv-value", value));
    grid.appendChild(cell);
  }
  container.appendChild(grid);

  dom.deliveryFeeEtaSummary.replaceChildren(container);

  dom.mapFloatingMetrics.textContent = eligible
    ? `${routeData.distanceKm} km · ${routeData.durationMinutes} min drive · Fee ${formatUsd(routeData.deliveryFeeUsd)}`
    : `Out of zone · ${routeData.distanceKm} km road distance`;
}

function renderReceipt(validationData, routeData, eligible) {
  const subtotal = BASKET_ITEMS.reduce((sum, item) => sum + item.qty * item.priceUsd, 0);
  const deliveryFee = eligible && routeData?.deliveryFeeUsd != null ? routeData.deliveryFeeUsd : 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + deliveryFee + tax;

  const container = createEl("div");
  const headerLine = createEl(
    "div",
    "receipt-line",
  );
  headerLine.append(
    createEl("strong", "", `Order #${state.orderId}`),
    createEl("span", "muted-text", state.orderPlacedAt || "Checkout Preview"),
  );
  container.appendChild(headerLine);

  const dropoffLine = createEl(
    "p",
    "muted-text",
    `Drop-off: ${validationData.formattedAddress || dom.addressLineInput.value}`,
  );
  dropoffLine.style.marginTop = "4px";
  container.appendChild(dropoffLine);

  const ul = createEl("ul", "receipt-list");
  for (const item of BASKET_ITEMS) {
    const li = createEl("li", "receipt-line");
    li.append(
      createEl("span", "", `${item.qty}x ${item.name}`),
      createEl("span", "", formatUsd(item.qty * item.priceUsd)),
    );
    ul.appendChild(li);
  }

  const subLi = createEl("li", "receipt-line");
  subLi.append(createEl("span", "", "Basket Subtotal"), createEl("span", "", formatUsd(subtotal)));
  ul.appendChild(subLi);

  const feeLi = createEl("li", "receipt-line");
  feeLi.append(
    createEl("span", "", "Delivery Fee"),
    createEl("span", "", eligible ? formatUsd(deliveryFee) : "N/A (Out of Zone)"),
  );
  ul.appendChild(feeLi);

  const taxLi = createEl("li", "receipt-line");
  taxLi.append(createEl("span", "", "Chicago Tax (10.25%)"), createEl("span", "", formatUsd(tax)));
  ul.appendChild(taxLi);

  const totalLi = createEl("li", "receipt-line receipt-total");
  totalLi.append(createEl("span", "", "Order Total"), createEl("span", "", formatUsd(total)));
  ul.appendChild(totalLi);

  container.appendChild(ul);
  dom.receiptDetails.replaceChildren(container);

  const coords = validationData.coordinates;
  if (state.config?.configured && coords && routeData) {
    const params = new URLSearchParams({
      origin_lat: String(state.config.kitchen.lat),
      origin_lng: String(state.config.kitchen.lng),
      dest_lat: String(coords.lat),
      dest_lng: String(coords.lng),
      size: "640x300",
      scale: "2",
      maptype: "roadmap",
    });
    if (routeData.encodedPolyline) {
      params.set("encoded_polyline", routeData.encodedPolyline);
    }
    dom.staticReceiptMapImg.onload = () => {
      dom.staticReceiptMapImg.classList.remove("hidden");
      dom.staticMapPlaceholder.classList.add("hidden");
    };
    dom.staticReceiptMapImg.onerror = () => {
      dom.staticReceiptMapImg.classList.add("hidden");
      dom.staticMapPlaceholder.classList.remove("hidden");
      dom.staticMapPlaceholder.textContent =
        "Maps Static API preview unavailable for current API key configuration.";
    };
    dom.staticReceiptMapImg.src = `/api/maps/static-receipt?${params.toString()}`;
  }
}

function stopSimulation() {
  state.sim.running = false;
  if (state.sim.rafId !== null) {
    cancelAnimationFrame(state.sim.rafId);
    state.sim.rafId = null;
  }
  state.sim.lastFrameTs = null;
}

function updateCourierProgressUI(progress) {
  const routeData = state.lastRoute;
  if (!routeData) return;

  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const remainingKm = Math.max(0, routeData.distanceKm * (1 - progress)).toFixed(2);
  const remainingMins = Math.max(0, Math.ceil(routeData.durationMinutes * (1 - progress)));

  const steps = routeData.steps || [];
  let activeInstruction = "En route from Fulton Market Kitchen Hub";
  if (progress >= 0.999) {
    activeInstruction = "Arrived at customer drop-off!";
  } else if (steps.length > 0) {
    const stepIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
    activeInstruction = steps[stepIndex].instruction;
  }

  const wrapper = createEl("div");
  const topRow = createEl("div", "receipt-line");
  topRow.append(
    createEl("strong", "", progress >= 1 ? "Delivered" : state.sim.running ? "Courier En Route" : "Courier Paused"),
    createEl("span", "", `${pct}% · ${remainingKm} km (${remainingMins} min left)`),
  );

  const track = createEl("div", "progress-track");
  const fill = createEl("div", "progress-fill");
  fill.style.width = `${pct}%`;
  track.appendChild(fill);

  const navNote = createEl("p", "muted-text", `Next turn: ${activeInstruction}`);
  wrapper.append(topRow, track, navNote);
  dom.courierProgressPanel.replaceChildren(wrapper);
}

function positionCourierAtFraction(fraction) {
  const { pathPoints, cumulativeDistances, totalPathMeters } = state.sim;
  if (!state.courierMarker || pathPoints.length === 0) return;

  if (pathPoints.length === 1 || totalPathMeters <= 0) {
    state.courierMarker.position = pathPoints[0];
    return;
  }

  const targetDist = Math.min(1, Math.max(0, fraction)) * totalPathMeters;
  let segIndex = 0;
  for (let i = 1; i < cumulativeDistances.length; i += 1) {
    if (cumulativeDistances[i] >= targetDist) {
      segIndex = i - 1;
      break;
    }
    segIndex = i - 1;
  }

  const startDist = cumulativeDistances[segIndex];
  const endDist = cumulativeDistances[segIndex + 1] ?? startDist;
  const segLen = endDist - startDist;
  const localFrac = segLen > 0 ? (targetDist - startDist) / segLen : 0;

  const interpolated = state.libs.spherical.interpolate(
    pathPoints[segIndex],
    pathPoints[segIndex + 1] || pathPoints[segIndex],
    localFrac,
  );
  state.courierMarker.position = interpolated;
}

function simulationTick(timestamp) {
  if (!state.sim.running) return;
  if (state.sim.lastFrameTs === null) {
    state.sim.lastFrameTs = timestamp;
  }
  const dt = timestamp - state.sim.lastFrameTs;
  state.sim.lastFrameTs = timestamp;

  state.sim.progress = Math.min(1, state.sim.progress + dt / SIMULATION_DURATION_MS);
  positionCourierAtFraction(state.sim.progress);
  updateCourierProgressUI(state.sim.progress);

  if (state.sim.progress >= 1) {
    state.sim.running = false;
    state.sim.rafId = null;
    dom.courierSimToggleBtn.textContent = "Replay Courier";
    setStatusPill("Delivered", "status-ok");
    return;
  }

  state.sim.rafId = requestAnimationFrame(simulationTick);
}

function startCourierSimulation(resetProgress = true) {
  if (state.sim.pathPoints.length === 0 || !state.courierMarker) return;
  stopSimulation();
  if (resetProgress || state.sim.progress >= 1) {
    state.sim.progress = 0;
  }
  state.sim.running = true;
  dom.courierSimToggleBtn.disabled = false;
  dom.courierSimToggleBtn.textContent = "Pause Courier";
  setStatusPill("Live Tracking", "status-live");
  positionCourierAtFraction(state.sim.progress);
  updateCourierProgressUI(state.sim.progress);
  state.sim.rafId = requestAnimationFrame(simulationTick);
}

function prepareCourierPath(encodedPolyline, destinationCoords) {
  stopSimulation();
  const { encoding, spherical, LatLng } = state.libs;
  let pathPoints = [];
  if (encodedPolyline) {
    pathPoints = encoding.decodePath(encodedPolyline);
  }
  if (pathPoints.length === 0) {
    pathPoints = [
      new LatLng(state.config.kitchen.lat, state.config.kitchen.lng),
      new LatLng(destinationCoords.lat, destinationCoords.lng),
    ];
  }

  const cumulativeDistances = [0];
  let totalMeters = 0;
  for (let i = 1; i < pathPoints.length; i += 1) {
    totalMeters += spherical.computeDistanceBetween(pathPoints[i - 1], pathPoints[i]);
    cumulativeDistances.push(totalMeters);
  }

  state.sim.pathPoints = pathPoints;
  state.sim.cumulativeDistances = cumulativeDistances;
  state.sim.totalPathMeters = totalMeters;
  state.sim.progress = 0;

  if (state.routePolyline) {
    state.routePolyline.setPath(pathPoints);
    state.routePolyline.setMap(state.map);
  }

  positionCourierAtFraction(0);
}

async function runCheckoutValidationAndRoute(addressText, { autoStartCourier = false } = {}) {
  const trimmed = (addressText || "").trim();
  if (!trimmed) {
    renderValidationError("Please enter a valid Chicago street address.");
    return;
  }
  if (!state.config?.configured) {
    renderApiKeyMissingBanner();
    return;
  }

  const apt = dom.aptInput.value.trim();
  const addressLines = apt ? [trimmed, apt] : [trimmed];

  dom.validateAddressBtn.disabled = true;
  setStatusPill("Validating…", "status-neutral");

  try {
    const valRes = await fetch("/api/address/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressLines,
        regionCode: "US",
        enableUspsCass: true,
      }),
    });

    const valPayload = await valRes.json();
    if (!valRes.ok) {
      renderValidationError(valPayload.detail || "Address Validation request failed.");
      dom.placeOrderBtn.disabled = true;
      setStatusPill("Validation Error", "status-error");
      return;
    }

    state.lastValidation = valPayload;
    renderValidationPanel(valPayload);

    const coords = valPayload.coordinates;
    if (!coords) {
      renderValidationError("Address could not be geocoded to coordinates.");
      dom.placeOrderBtn.disabled = true;
      setStatusPill("Geocode Failed", "status-error");
      return;
    }

    const { LatLng, LatLngBounds } = state.libs;
    const dropoffLatLng = new LatLng(coords.lat, coords.lng);

    if (state.customerMarker) {
      state.customerMarker.position = { lat: coords.lat, lng: coords.lng };
      state.customerMarker.map = state.map;
    }

    const insidePolygon = state.libs.poly.containsLocation(
      dropoffLatLng,
      state.deliveryZonePolygon,
    );

    const routeRes = await fetch("/api/routes/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: {
          lat: state.config.kitchen.lat,
          lng: state.config.kitchen.lng,
        },
        destination: coords,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    const routePayload = await routeRes.json();
    if (!routeRes.ok) {
      renderValidationError(routePayload.detail || "Routes API request failed.");
      dom.placeOrderBtn.disabled = true;
      setStatusPill("Routing Error", "status-error");
      return;
    }

    state.lastRoute = routePayload;
    const gran = valPayload.verdict?.validationGranularity || "";
    const granularityOk = ["SUB_PREMISE", "PREMISE", "PREMISE_PROXIMITY"].includes(gran);
    const isPoBox = Boolean(valPayload.metadata?.poBox);

    const eligible = renderEligibilityBadge({
      insidePolygon,
      withinDistanceLimit: Boolean(routePayload.withinDistanceLimit),
      isPoBox,
      granularityOk,
      routeData: routePayload,
    });
    state.eligible = eligible;

    renderFeeAndEta(routePayload, eligible);
    prepareCourierPath(routePayload.encodedPolyline, coords);

    if (state.routePolyline) {
      state.routePolyline.setOptions({
        strokeColor: eligible ? "#2563eb" : "#dc2626",
        strokeOpacity: eligible ? 0.9 : 0.65,
      });
    }

    const bounds = new LatLngBounds();
    bounds.extend({ lat: state.config.kitchen.lat, lng: state.config.kitchen.lng });
    bounds.extend({ lat: coords.lat, lng: coords.lng });
    for (const pt of state.sim.pathPoints) {
      bounds.extend(pt);
    }
    state.map.fitBounds(bounds, { top: 65, right: 45, bottom: 75, left: 45 });

    dom.placeOrderBtn.disabled = !eligible;
    renderReceipt(valPayload, routePayload, eligible);

    if (eligible) {
      if (state.courierMarker) {
        state.courierMarker.map = state.map;
      }
      if (autoStartCourier) {
        state.orderPlacedAt = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        renderReceipt(valPayload, routePayload, eligible);
        startCourierSimulation(true);
      } else {
        dom.courierSimToggleBtn.disabled = false;
        dom.courierSimToggleBtn.textContent = "Start Courier";
        updateCourierProgressUI(0);
        setStatusPill("Zone Eligible", "status-ok");
      }
    } else {
      stopSimulation();
      if (state.courierMarker) {
        state.courierMarker.map = null;
      }
      dom.courierSimToggleBtn.disabled = true;
      dom.courierProgressPanel.replaceChildren(
        createEl(
          "p",
          "muted-text",
          "Courier dispatch disabled: drop-off address is outside the Chicago delivery zone or exceeds 8.0 km.",
        ),
      );
      setStatusPill("Out of Zone", "status-error");
    }
  } catch (err) {
    renderValidationError(err instanceof Error ? err.message : "Unexpected validation error.");
    setStatusPill("Network Error", "status-error");
  } finally {
    dom.validateAddressBtn.disabled = false;
  }
}

async function initMapAndServices(config) {
  loadGoogleMapsBootstrap(config.googleMapsApiKey);

  const [
    { Map, Polyline, Polygon, InfoWindow },
    { AdvancedMarkerElement },
    { PlaceAutocompleteElement },
    { poly, encoding, spherical },
    { LatLng, LatLngBounds },
  ] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("places"),
    google.maps.importLibrary("geometry"),
    google.maps.importLibrary("core"),
  ]);

  state.libs = { poly, encoding, spherical, LatLng, LatLngBounds };

  state.map = new Map(dom.liveTrackingMap, {
    center: { lat: config.kitchen.lat, lng: config.kitchen.lng },
    zoom: 13,
    mapId: config.mapId || "DEMO_MAP_ID",
    internalUsageAttributionIds: config.internalUsageAttributionIds || ["gmp_git_agentsamples_v1.0.0"],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  state.infoWindow = new InfoWindow();

  state.deliveryZonePolygon = new Polygon({
    paths: config.deliveryZonePolygon,
    strokeColor: "#0f766e",
    strokeOpacity: 0.85,
    strokeWeight: 2,
    fillColor: "#14b8a6",
    fillOpacity: 0.14,
    map: state.map,
  });

  state.routePolyline = new Polyline({
    strokeColor: "#2563eb",
    strokeOpacity: 0.9,
    strokeWeight: 5,
    map: state.map,
  });

  state.kitchenMarker = new AdvancedMarkerElement({
    map: state.map,
    position: { lat: config.kitchen.lat, lng: config.kitchen.lng },
    title: config.kitchen.name,
  });
  state.kitchenMarker.append(createMarkerBadge("marker-kitchen", "K", "Fulton Kitchen"));
  state.kitchenMarker.addEventListener("click", () => {
    openInfoWindowForMarker(
      state.kitchenMarker,
      config.kitchen.name,
      `${config.kitchen.address} · Origin Hub`,
    );
  });

  state.customerMarker = new AdvancedMarkerElement({
    map: null,
    position: { lat: config.kitchen.lat, lng: config.kitchen.lng },
    title: "Customer Drop-off",
  });
  state.customerMarker.append(createMarkerBadge("marker-customer", "C", "Drop-off"));
  state.customerMarker.addEventListener("click", () => {
    openInfoWindowForMarker(
      state.customerMarker,
      "Customer Drop-off",
      state.lastValidation?.formattedAddress || dom.addressLineInput.value,
    );
  });

  state.courierMarker = new AdvancedMarkerElement({
    map: null,
    position: { lat: config.kitchen.lat, lng: config.kitchen.lng },
    title: "Active Courier",
  });
  state.courierMarker.append(createMarkerBadge("marker-courier", "D", "Courier"));
  state.courierMarker.addEventListener("click", () => {
    openInfoWindowForMarker(
      state.courierMarker,
      "Courier #14 (E-Bike / Compact)",
      state.lastRoute
        ? `${state.lastRoute.distanceKm} km route · ${state.lastRoute.durationMinutes} min ETA`
        : "Dispatched from Fulton Market",
    );
  });

  // Mount Places API (New) PlaceAutocompleteElement using gmp-select
  const placeAutocomplete = new PlaceAutocompleteElement({
    includedRegionCodes: ["us"],
    locationBias: { north: 42.02, south: 41.64, east: -87.52, west: -87.94 },
  });
  placeAutocomplete.id = "checkout-address-autocomplete";
  placeAutocomplete.placeholder = "Search Chicago delivery address…";
  dom.autocompleteMount.replaceChildren(placeAutocomplete);

  placeAutocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });
    if (place.formattedAddress) {
      dom.addressLineInput.value = place.formattedAddress;
      await runCheckoutValidationAndRoute(place.formattedAddress, { autoStartCourier: true });
    }
  });

  state.mapsReady = true;
}

function wireEventHandlers() {
  dom.validateAddressBtn.addEventListener("click", () => {
    void runCheckoutValidationAndRoute(dom.addressLineInput.value, { autoStartCourier: false });
  });

  dom.presetInZoneBtn.addEventListener("click", () => {
    if (!state.config) return;
    dom.addressLineInput.value = state.config.presets.inZone;
    dom.aptInput.value = "";
    void runCheckoutValidationAndRoute(state.config.presets.inZone, { autoStartCourier: true });
  });

  dom.presetOutOfZoneBtn.addEventListener("click", () => {
    if (!state.config) return;
    dom.addressLineInput.value = state.config.presets.outOfZone;
    dom.aptInput.value = "";
    void runCheckoutValidationAndRoute(state.config.presets.outOfZone, { autoStartCourier: false });
  });

  dom.placeOrderBtn.addEventListener("click", () => {
    if (!state.eligible || !state.lastValidation || !state.lastRoute) return;
    state.orderId = `ORD-CHI-${Math.floor(4000 + Math.random() * 5999)}`;
    state.orderPlacedAt = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    renderReceipt(state.lastValidation, state.lastRoute, state.eligible);
    startCourierSimulation(true);
  });

  dom.courierSimToggleBtn.addEventListener("click", () => {
    if (state.sim.running) {
      stopSimulation();
      dom.courierSimToggleBtn.textContent = "Resume Courier";
      updateCourierProgressUI(state.sim.progress);
      setStatusPill("Courier Paused", "status-warn");
    } else {
      startCourierSimulation(state.sim.progress >= 1);
    }
  });
}

async function bootstrap() {
  wireEventHandlers();

  try {
    const res = await fetch("/api/config");
    if (!res.ok) {
      setStatusPill("Config Error", "status-error");
      return;
    }
    const config = await res.json();
    state.config = config;
    dom.addressLineInput.value = config.seedAddress;

    if (!config.configured || !config.googleMapsApiKey) {
      renderApiKeyMissingBanner();
      return;
    }

    await initMapAndServices(config);
    await runCheckoutValidationAndRoute(config.seedAddress, { autoStartCourier: true });
  } catch (err) {
    setStatusPill("Init Error", "status-error");
    renderValidationError(err instanceof Error ? err.message : "Failed to initialize app.");
  }
}

void bootstrap();
