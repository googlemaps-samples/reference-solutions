const MODE_LABELS = {
  DRIVE: "Driving",
  BICYCLE: "Cycling",
  WALK: "Walking",
  TRANSIT: "Transit",
};

const ROUTE_PALETTE = ["#0f766e", "#0284c7", "#7c3aed", "#d97706"];
const SVG_NS = "http://www.w3.org/2000/svg";

const state = {
  config: null,
  map: null,
  bicyclingLayer: null,
  origin: null,
  destination: null,
  activeMode: "BICYCLE",
  selectedRouteIndexByMode: {
    DRIVE: 0,
    BICYCLE: 0,
    WALK: 0,
    TRANSIT: 0,
  },
  routesByMode: {
    DRIVE: [],
    BICYCLE: [],
    WALK: [],
    TRANSIT: [],
  },
  modifiers: {
    avoidTolls: false,
    avoidHighways: false,
    ecoFriendly: true,
  },
  polylines: [],
  originMarker: null,
  destinationMarker: null,
  hoverMarker: null,
  elevationData: null,
  elevationCache: new Map(),
  originAutocompleteEl: null,
  destinationAutocompleteEl: null,
  mapsLibs: null,
  computeToken: 0,
};

const dom = {
  headerEta: document.getElementById("header-kpi-eta"),
  headerDistance: document.getElementById("header-kpi-distance"),
  headerGain: document.getElementById("header-kpi-gain"),
  betaNotice: document.getElementById("beta-trail-notice"),
  originSlot: document.getElementById("origin-autocomplete-input"),
  destinationSlot: document.getElementById("destination-autocomplete-input"),
  originChip: document.getElementById("origin-selected-chip"),
  destinationChip: document.getElementById("destination-selected-chip"),
  swapBtn: document.getElementById("swap-locations-btn"),
  resetBtn: document.getElementById("reset-corridor-btn"),
  statusPill: document.getElementById("status-pill"),
  activeModeBadge: document.getElementById("active-mode-badge"),
  routeCardsList: document.getElementById("route-cards-list"),
  mapCanvas: document.getElementById("map-canvas"),
  mapBanner: document.getElementById("map-banner"),
  avoidTollsToggle: document.getElementById("avoid-tolls-toggle"),
  avoidHighwaysToggle: document.getElementById("avoid-highways-toggle"),
  ecoFriendlyToggle: document.getElementById("eco-friendly-toggle"),
  elevationSvg: document.getElementById("elevation-profile-chart"),
  elevationReadout: document.getElementById("elevation-hover-readout"),
  elevationModeTag: document.getElementById("elevation-mode-tag"),
  elevGainStat: document.getElementById("elev-gain-stat"),
  elevLossStat: document.getElementById("elev-loss-stat"),
  elevRangeStat: document.getElementById("elev-range-stat"),
  elevGradeStat: document.getElementById("elev-grade-stat"),
};

function installMapsBootstrap(apiKey) {
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

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || `Request failed with HTTP ${response.status}`);
  }
  return payload;
}

function showBanner(message) {
  dom.mapBanner.textContent = message;
  dom.mapBanner.classList.remove("hidden");
}

function clearBanner() {
  dom.mapBanner.textContent = "";
  dom.mapBanner.classList.add("hidden");
}

function setStatus(text, ready = false) {
  dom.statusPill.textContent = text;
  dom.statusPill.classList.toggle("ready", ready);
}

function parseDurationSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== "string") {
    return 0;
  }
  const match = durationStr.match(/^([\d.]+)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) {
    return "--";
  }
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins} min`;
  }
  return `${hours}h ${mins}m`;
}

function formatDistance(meters) {
  if (!meters || meters <= 0) {
    return "--";
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function formatElevationFeet(meters) {
  const feet = meters * 3.28084;
  return `${Math.round(meters)} m (${Math.round(feet).toLocaleString()} ft)`;
}

function formatRouteLabel(labels = [], index = 0) {
  if (labels.includes("FUEL_EFFICIENT")) {
    return "Eco-Friendly Route";
  }
  if (labels.includes("DEFAULT_ROUTE")) {
    return "Recommended Route";
  }
  if (labels.includes("DEFAULT_ROUTE_ALTERNATE")) {
    return `Alternative ${index + 1}`;
  }
  return `Option ${index + 1}`;
}

function formatTolls(route) {
  const tollInfo = route?.travelAdvisory?.tollInfo;
  if (!tollInfo?.estimatedPrice?.length) {
    return null;
  }
  const price = tollInfo.estimatedPrice[0];
  const units = Number(price.units || 0);
  const nanos = Number(price.nanos || 0) / 1e9;
  const amount = (units + nanos).toFixed(2);
  return `${price.currencyCode || "USD"} $${amount}`;
}

function formatFuel(route) {
  const micro = route?.travelAdvisory?.fuelConsumptionMicroliters;
  if (!micro) {
    return null;
  }
  const liters = Number(micro) / 1e6;
  const gallons = liters * 0.264172;
  return `~${gallons.toFixed(2)} gal`;
}

function updateEndpointUI() {
  if (state.origin) {
    dom.originChip.textContent = state.origin.formattedAddress
      ? `${state.origin.displayName} — ${state.origin.formattedAddress}`
      : state.origin.displayName;
    if (state.originAutocompleteEl) {
      state.originAutocompleteEl.value = state.origin.displayName;
    }
  }
  if (state.destination) {
    dom.destinationChip.textContent = state.destination.formattedAddress
      ? `${state.destination.displayName} — ${state.destination.formattedAddress}`
      : state.destination.displayName;
    if (state.destinationAutocompleteEl) {
      state.destinationAutocompleteEl.value = state.destination.displayName;
    }
  }
  updateEndpointMarkers();
}

function updateEndpointMarkers() {
  if (!state.map || !state.mapsLibs) {
    return;
  }
  const { AdvancedMarkerElement, PinElement } = state.mapsLibs;

  if (state.origin) {
    if (!state.originMarker) {
      const originPin = new PinElement({
        background: "#0f766e",
        borderColor: "#ffffff",
        glyphColor: "#ffffff",
        glyphText: "A",
        scale: 1.1,
      });
      state.originMarker = new AdvancedMarkerElement({
        map: state.map,
        position: state.origin.location,
        title: state.origin.displayName,
      });
      state.originMarker.append(originPin);
    } else {
      state.originMarker.position = state.origin.location;
      state.originMarker.title = state.origin.displayName;
    }
  }

  if (state.destination) {
    if (!state.destinationMarker) {
      const destPin = new PinElement({
        background: "#be123c",
        borderColor: "#ffffff",
        glyphColor: "#ffffff",
        glyphText: "B",
        scale: 1.1,
      });
      state.destinationMarker = new AdvancedMarkerElement({
        map: state.map,
        position: state.destination.location,
        title: state.destination.displayName,
      });
      state.destinationMarker.append(destPin);
    } else {
      state.destinationMarker.position = state.destination.location;
      state.destinationMarker.title = state.destination.displayName;
    }
  }
}

function updateBetaNotice() {
  const showBeta = state.activeMode === "BICYCLE" || state.activeMode === "WALK";
  dom.betaNotice.classList.toggle("hidden", !showBeta);
  if (state.bicyclingLayer) {
    state.bicyclingLayer.setMap(state.activeMode === "BICYCLE" ? state.map : null);
  }
}

function updateModeButtons() {
  const modes = ["DRIVE", "BICYCLE", "WALK", "TRANSIT"];
  for (const mode of modes) {
    const key = mode.toLowerCase();
    const btn = document.getElementById(`mode-${key}-btn`);
    const etaEl = document.getElementById(`mode-${key}-eta`);
    const distEl = document.getElementById(`mode-${key}-dist`);
    const routes = state.routesByMode[mode] || [];
    const primary = routes[0];

    if (btn) {
      const isActive = state.activeMode === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    }
    if (etaEl) {
      etaEl.textContent = primary
        ? primary.localizedValues?.duration?.text ||
          formatDuration(parseDurationSeconds(primary.duration))
        : "--";
    }
    if (distEl) {
      distEl.textContent = primary
        ? primary.localizedValues?.distance?.text || formatDistance(primary.distanceMeters)
        : "No route";
    }
  }
  dom.activeModeBadge.textContent = MODE_LABELS[state.activeMode] || state.activeMode;
}

function clearPolylines() {
  for (const poly of state.polylines) {
    poly.setMap(null);
  }
  state.polylines = [];
}

function renderActiveRoutesOnMap() {
  clearPolylines();
  if (!state.map || !state.mapsLibs) {
    return;
  }

  const { Polyline, LatLngBounds, encoding } = state.mapsLibs;
  const routes = state.routesByMode[state.activeMode] || [];
  const activeIdx = Math.min(
    state.selectedRouteIndexByMode[state.activeMode] || 0,
    Math.max(0, routes.length - 1)
  );
  state.selectedRouteIndexByMode[state.activeMode] = activeIdx;

  const bounds = new LatLngBounds();
  if (state.origin?.location) {
    bounds.extend(state.origin.location);
  }
  if (state.destination?.location) {
    bounds.extend(state.destination.location);
  }

  routes.forEach((route, idx) => {
    const encoded = route?.polyline?.encodedPolyline;
    if (!encoded) {
      return;
    }
    const path = encoding.decodePath(encoded);
    path.forEach((pt) => bounds.extend(pt));

    const isSelected = idx === activeIdx;
    const color = ROUTE_PALETTE[idx % ROUTE_PALETTE.length];
    const poly = new Polyline({
      map: state.map,
      path,
      strokeColor: color,
      strokeOpacity: isSelected ? 0.95 : 0.45,
      strokeWeight: isSelected ? 6 : 4,
      zIndex: isSelected ? 20 : 10 + idx,
    });

    poly.addListener("click", () => {
      selectRouteIndex(idx);
    });

    if (isSelected) {
      poly.addListener("mousemove", (event) => {
        if (event.latLng) {
          syncMapHoverToChart(event.latLng);
        }
      });
      poly.addListener("mouseout", () => {
        clearHoverHighlight();
      });
    }

    state.polylines.push(poly);
  });

  if (!bounds.isEmpty()) {
    state.map.fitBounds(bounds, { top: 44, right: 44, bottom: 44, left: 44 });
  }
}

function renderRouteCards() {
  const routes = state.routesByMode[state.activeMode] || [];
  const activeIdx = state.selectedRouteIndexByMode[state.activeMode] || 0;
  const cards = [];

  if (!routes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `No ${MODE_LABELS[state.activeMode]} route returned for this origin and destination.`;
    dom.routeCardsList.replaceChildren(empty);
    updateHeaderKpis(null);
    return;
  }

  routes.forEach((route, idx) => {
    const color = ROUTE_PALETTE[idx % ROUTE_PALETTE.length];
    const card = document.createElement("button");
    card.type = "button";
    card.id = `route-card-${idx}`;
    card.className = `route-card${idx === activeIdx ? " active" : ""}`;
    card.style.borderLeftColor = color;

    const topRow = document.createElement("div");
    topRow.className = "route-card-top";

    const titleSpan = document.createElement("span");
    titleSpan.className = "route-card-title";
    const swatch = document.createElement("span");
    swatch.className = "route-color-swatch";
    swatch.style.backgroundColor = color;
    const labelText = document.createTextNode(formatRouteLabel(route.routeLabels, idx));
    titleSpan.append(swatch, labelText);

    const metricSpan = document.createElement("span");
    metricSpan.className = "route-card-metrics";
    const durText =
      route.localizedValues?.duration?.text ||
      formatDuration(parseDurationSeconds(route.duration));
    const distText =
      route.localizedValues?.distance?.text || formatDistance(route.distanceMeters);
    metricSpan.textContent = `${durText} • ${distText}`;

    topRow.append(titleSpan, metricSpan);
    card.append(topRow);

    const badgesRow = document.createElement("div");
    badgesRow.className = "route-badges";

    if (route.routeLabels?.includes("FUEL_EFFICIENT")) {
      const ecoBadge = document.createElement("span");
      ecoBadge.className = "route-badge eco";
      ecoBadge.textContent = "Fuel Efficient";
      badgesRow.append(ecoBadge);
    }

    const tollText = formatTolls(route);
    if (tollText) {
      const tollBadge = document.createElement("span");
      tollBadge.className = "route-badge toll";
      tollBadge.textContent = `Est. Toll: ${tollText}`;
      badgesRow.append(tollBadge);
    }

    const fuelText = formatFuel(route);
    if (fuelText) {
      const fuelBadge = document.createElement("span");
      fuelBadge.className = "route-badge eco";
      fuelBadge.textContent = `Est. Fuel: ${fuelText}`;
      badgesRow.append(fuelBadge);
    }

    if (badgesRow.childElementCount > 0) {
      card.append(badgesRow);
    }

    if (Array.isArray(route.warnings) && route.warnings.length > 0) {
      const warn = document.createElement("div");
      warn.className = "route-warning";
      warn.textContent = route.warnings[0];
      card.append(warn);
    }

    card.addEventListener("click", () => selectRouteIndex(idx));
    cards.push(card);
  });

  dom.routeCardsList.replaceChildren(...cards);
  updateHeaderKpis(routes[activeIdx]);
}

function updateHeaderKpis(route) {
  if (!route) {
    dom.headerEta.textContent = "--";
    dom.headerDistance.textContent = "--";
    return;
  }
  dom.headerEta.textContent =
    route.localizedValues?.duration?.text ||
    formatDuration(parseDurationSeconds(route.duration));
  dom.headerDistance.textContent =
    route.localizedValues?.distance?.text || formatDistance(route.distanceMeters);
}

async function loadElevationForActiveRoute() {
  const routes = state.routesByMode[state.activeMode] || [];
  const activeIdx = state.selectedRouteIndexByMode[state.activeMode] || 0;
  const activeRoute = routes[activeIdx];
  const encoded = activeRoute?.polyline?.encodedPolyline;

  if (!encoded) {
    state.elevationData = null;
    renderElevationChart(null);
    return;
  }

  dom.elevationModeTag.textContent = `${MODE_LABELS[state.activeMode]} • 64 Samples`;

  if (state.elevationCache.has(encoded)) {
    state.elevationData = state.elevationCache.get(encoded);
    renderElevationChart(state.elevationData);
    return;
  }

  try {
    dom.elevationReadout.textContent = "Sampling route elevation...";
    const data = await apiJson("/api/elevation/profile", {
      method: "POST",
      body: JSON.stringify({ encodedPolyline: encoded, samples: 64 }),
    });
    state.elevationCache.set(encoded, data);
    state.elevationData = data;
    renderElevationChart(data);
  } catch (err) {
    state.elevationData = null;
    renderElevationChart(null);
    dom.elevationReadout.textContent = `Elevation unavailable: ${err.message}`;
  }
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function renderElevationChart(data) {
  const svg = dom.elevationSvg;
  clearHoverHighlight();

  if (!data || !Array.isArray(data.results) || data.results.length < 2) {
    svg.replaceChildren();
    dom.elevGainStat.textContent = "--";
    dom.elevLossStat.textContent = "--";
    dom.elevRangeStat.textContent = "--";
    dom.elevGradeStat.textContent = "--";
    dom.headerGain.textContent = "--";
    return;
  }

  const { results, summary } = data;
  dom.elevGainStat.textContent = `+${Math.round(summary.totalGainMeters)} m`;
  dom.elevLossStat.textContent = `-${Math.round(summary.totalLossMeters)} m`;
  dom.elevRangeStat.textContent = `${Math.round(summary.minElevationMeters)}–${Math.round(
    summary.maxElevationMeters
  )} m`;
  dom.elevGradeStat.textContent = `${summary.maxGradePercent.toFixed(1)}%`;
  dom.headerGain.textContent = `+${Math.round(summary.totalGainMeters)} m`;
  dom.elevationReadout.textContent = "Hover chart or route to inspect elevation";

  const width = 800;
  const height = 130;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minE = summary.minElevationMeters;
  const maxE = summary.maxElevationMeters;
  const spanE = Math.max(15, maxE - minE);
  const totalDist = Math.max(1, summary.totalDistanceMeters);

  const defs = createSvgElement("defs");
  const grad = createSvgElement("linearGradient", {
    id: "elevAreaGrad",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });
  grad.append(
    createSvgElement("stop", { offset: "0%", "stop-color": "#0f766e", "stop-opacity": "0.38" }),
    createSvgElement("stop", { offset: "100%", "stop-color": "#0f766e", "stop-opacity": "0.04" })
  );
  defs.append(grad);

  const children = [defs];

  // Horizontal grid lines + labels
  for (let i = 0; i <= 2; i++) {
    const frac = i / 2;
    const y = padTop + plotH * (1 - frac);
    const elevVal = minE + spanE * frac;
    children.push(
      createSvgElement("line", {
        x1: padLeft,
        y1: y.toFixed(1),
        x2: width - padRight,
        y2: y.toFixed(1),
        stroke: "#d5dfdc",
        "stroke-dasharray": "3 3",
        "stroke-width": "1",
      })
    );
    const label = createSvgElement("text", {
      x: padLeft - 6,
      y: (y + 3).toFixed(1),
      "text-anchor": "end",
      "font-size": "10",
      fill: "#475569",
    });
    label.textContent = `${Math.round(elevVal)}m`;
    children.push(label);
  }

  const coords = results.map((pt) => {
    const x = padLeft + (pt.distanceMeters / totalDist) * plotW;
    const y = padTop + plotH - ((pt.elevation - minE) / spanE) * plotH;
    return { x, y, pt };
  });

  const lineCmds = coords
    .map((c, idx) => `${idx === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaCmds = `${lineCmds} L${coords[coords.length - 1].x.toFixed(1)},${(
    padTop + plotH
  ).toFixed(1)} L${coords[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;

  children.push(
    createSvgElement("path", {
      d: areaCmds,
      fill: "url(#elevAreaGrad)",
    })
  );
  children.push(
    createSvgElement("path", {
      d: lineCmds,
      fill: "none",
      stroke: "#0f766e",
      "stroke-width": "2.4",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    })
  );

  // Distance axis labels
  const startAxis = createSvgElement("text", {
    x: padLeft,
    y: height - 5,
    "font-size": "10",
    fill: "#475569",
  });
  startAxis.textContent = "0 mi";
  const midAxis = createSvgElement("text", {
    x: padLeft + plotW / 2,
    y: height - 5,
    "text-anchor": "middle",
    "font-size": "10",
    fill: "#475569",
  });
  midAxis.textContent = formatDistance(totalDist / 2);
  const endAxis = createSvgElement("text", {
    x: width - padRight,
    y: height - 5,
    "text-anchor": "end",
    "font-size": "10",
    fill: "#475569",
  });
  endAxis.textContent = formatDistance(totalDist);
  children.push(startAxis, midAxis, endAxis);

  // Interactive hover crosshair & dot
  const hoverLine = createSvgElement("line", {
    id: "elev-hover-line",
    x1: padLeft,
    y1: padTop,
    x2: padLeft,
    y2: padTop + plotH,
    stroke: "#d97706",
    "stroke-width": "1.5",
    "stroke-dasharray": "3 2",
    visibility: "hidden",
  });
  const hoverDot = createSvgElement("circle", {
    id: "elev-hover-dot",
    cx: padLeft,
    cy: padTop,
    r: "4.5",
    fill: "#d97706",
    stroke: "#ffffff",
    "stroke-width": "2",
    visibility: "hidden",
  });
  children.push(hoverLine, hoverDot);

  svg.replaceChildren(...children);
  svg._plotCoords = coords;
}

function highlightSample(sampleCoord) {
  if (!sampleCoord) {
    return;
  }
  const { x, y, pt } = sampleCoord;
  const hoverLine = document.getElementById("elev-hover-line");
  const hoverDot = document.getElementById("elev-hover-dot");

  if (hoverLine && hoverDot) {
    hoverLine.setAttribute("x1", x.toFixed(1));
    hoverLine.setAttribute("x2", x.toFixed(1));
    hoverLine.setAttribute("visibility", "visible");
    hoverDot.setAttribute("cx", x.toFixed(1));
    hoverDot.setAttribute("cy", y.toFixed(1));
    hoverDot.setAttribute("visibility", "visible");
  }

  const sign = pt.gradePercent > 0 ? "+" : "";
  dom.elevationReadout.textContent = `${formatDistance(
    pt.distanceMeters
  )} • ${formatElevationFeet(pt.elevation)} • Slope ${sign}${pt.gradePercent.toFixed(1)}%`;

  if (state.map && state.mapsLibs) {
    const { AdvancedMarkerElement, PinElement } = state.mapsLibs;
    if (!state.hoverMarker) {
      const hoverPin = new PinElement({
        background: "#d97706",
        borderColor: "#ffffff",
        glyphColor: "#ffffff",
        glyphText: "•",
        scale: 0.9,
      });
      state.hoverMarker = new AdvancedMarkerElement({
        map: state.map,
        position: pt.location,
        title: `Elevation: ${Math.round(pt.elevation)} m`,
      });
      state.hoverMarker.append(hoverPin);
    } else {
      state.hoverMarker.position = pt.location;
      state.hoverMarker.title = `Elevation: ${Math.round(pt.elevation)} m`;
      state.hoverMarker.map = state.map;
    }
  }
}

function clearHoverHighlight() {
  const hoverLine = document.getElementById("elev-hover-line");
  const hoverDot = document.getElementById("elev-hover-dot");
  if (hoverLine) {
    hoverLine.setAttribute("visibility", "hidden");
  }
  if (hoverDot) {
    hoverDot.setAttribute("visibility", "hidden");
  }
  if (state.hoverMarker) {
    state.hoverMarker.map = null;
  }
}

function syncMapHoverToChart(latLng) {
  const coords = dom.elevationSvg._plotCoords;
  if (!coords || !coords.length) {
    return;
  }
  const lat = latLng.lat();
  const lng = latLng.lng();
  let best = coords[0];
  let bestDist = Infinity;

  for (const c of coords) {
    const dLat = c.pt.location.lat - lat;
    const dLng = c.pt.location.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < bestDist) {
      bestDist = distSq;
      best = c;
    }
  }
  highlightSample(best);
}

function attachElevationChartEvents() {
  dom.elevationSvg.addEventListener("pointermove", (event) => {
    const coords = dom.elevationSvg._plotCoords;
    if (!coords || !coords.length) {
      return;
    }
    const rect = dom.elevationSvg.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const svgX = ((event.clientX - rect.left) / rect.width) * 800;
    let nearest = coords[0];
    let minDx = Math.abs(coords[0].x - svgX);
    for (const c of coords) {
      const dx = Math.abs(c.x - svgX);
      if (dx < minDx) {
        minDx = dx;
        nearest = c;
      }
    }
    highlightSample(nearest);
  });

  dom.elevationSvg.addEventListener("pointerleave", () => {
    clearHoverHighlight();
    if (state.elevationData) {
      dom.elevationReadout.textContent = "Hover chart or route to inspect elevation";
    }
  });
}

async function selectRouteIndex(idx) {
  state.selectedRouteIndexByMode[state.activeMode] = idx;
  renderActiveRoutesOnMap();
  renderRouteCards();
  await loadElevationForActiveRoute();
}

async function setActiveMode(mode) {
  state.activeMode = mode;
  updateModeButtons();
  updateBetaNotice();
  renderActiveRoutesOnMap();
  renderRouteCards();
  await loadElevationForActiveRoute();
}

function makeEndpointPayload(place) {
  if (place.placeId || place.id) {
    return { placeId: place.placeId || place.id };
  }
  return { latLng: place.location };
}

async function computeModeRoutes(mode) {
  const response = await apiJson("/api/routes/compute", {
    method: "POST",
    body: JSON.stringify({
      origin: makeEndpointPayload(state.origin),
      destination: makeEndpointPayload(state.destination),
      travelMode: mode,
      avoidTolls: state.modifiers.avoidTolls,
      avoidHighways: state.modifiers.avoidHighways,
      ecoFriendly: state.modifiers.ecoFriendly,
      computeAlternativeRoutes: true,
    }),
  });
  return response.routes || [];
}

async function computeAllModes() {
  if (!state.origin || !state.destination) {
    return;
  }
  const token = ++state.computeToken;
  setStatus("Computing routes...", false);
  clearBanner();

  const modes = ["DRIVE", "BICYCLE", "WALK", "TRANSIT"];
  const results = await Promise.allSettled(modes.map((m) => computeModeRoutes(m)));

  if (token !== state.computeToken) {
    return;
  }

  let anySuccess = false;
  results.forEach((res, idx) => {
    const mode = modes[idx];
    if (res.status === "fulfilled") {
      state.routesByMode[mode] = res.value;
      state.selectedRouteIndexByMode[mode] = 0;
      anySuccess = true;
    } else {
      state.routesByMode[mode] = [];
    }
  });

  if (!anySuccess) {
    showBanner("Unable to compute routes for these locations. Check your API key and enabled APIs.");
    setStatus("Error", false);
  } else {
    setStatus("Live Routes Ready", true);
  }

  updateModeButtons();
  updateBetaNotice();
  renderActiveRoutesOnMap();
  renderRouteCards();
  await loadElevationForActiveRoute();
}

async function recomputeDriveModifiers() {
  if (!state.origin || !state.destination) {
    return;
  }
  setStatus("Updating drive routes...", false);
  try {
    state.routesByMode.DRIVE = await computeModeRoutes("DRIVE");
    state.selectedRouteIndexByMode.DRIVE = 0;
    updateModeButtons();
    if (state.activeMode === "DRIVE") {
      renderActiveRoutesOnMap();
      renderRouteCards();
      await loadElevationForActiveRoute();
    }
    setStatus("Live Routes Ready", true);
  } catch (err) {
    showBanner(err.message);
    setStatus("Error", false);
  }
}

async function resolveSeedPlace(query) {
  const data = await apiJson("/api/places/search", {
    method: "POST",
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!data.places?.length) {
    throw new Error(`Could not resolve seeded place: ${query}`);
  }
  return data.places[0];
}

function mountPlaceAutocomplete(slotEl, placeholderText, onSelectPlace) {
  const { PlaceAutocompleteElement } = state.mapsLibs;
  const el = new PlaceAutocompleteElement({
    locationBias: {
      center: { lat: 39.884, lng: -105.135 },
      radius: 50000,
    },
    includedRegionCodes: ["us"],
  });
  el.setAttribute("placeholder", placeholderText);

  el.addEventListener("gmp-select", async (event) => {
    try {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "location"],
      });
      if (!place.location) {
        return;
      }
      onSelectPlace({
        id: place.id,
        displayName: place.displayName || place.formattedAddress || "Selected Place",
        formattedAddress: place.formattedAddress || "",
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      });
    } catch (err) {
      showBanner(`Place selection error: ${err.message}`);
    }
  });

  el.addEventListener("gmp-error", () => {
    showBanner("Places Autocomplete encountered a key or quota error.");
  });

  slotEl.replaceChildren(el);
  return el;
}

function attachUiHandlers() {
  for (const mode of ["DRIVE", "BICYCLE", "WALK", "TRANSIT"]) {
    const btn = document.getElementById(`mode-${mode.toLowerCase()}-btn`);
    if (btn) {
      btn.addEventListener("click", () => {
        setActiveMode(mode);
      });
    }
  }

  dom.avoidTollsToggle.addEventListener("change", () => {
    state.modifiers.avoidTolls = dom.avoidTollsToggle.checked;
    recomputeDriveModifiers();
  });

  dom.avoidHighwaysToggle.addEventListener("change", () => {
    state.modifiers.avoidHighways = dom.avoidHighwaysToggle.checked;
    recomputeDriveModifiers();
  });

  dom.ecoFriendlyToggle.addEventListener("change", () => {
    state.modifiers.ecoFriendly = dom.ecoFriendlyToggle.checked;
    recomputeDriveModifiers();
  });

  dom.swapBtn.addEventListener("click", async () => {
    if (!state.origin || !state.destination) {
      return;
    }
    const prevOrigin = state.origin;
    state.origin = state.destination;
    state.destination = prevOrigin;
    updateEndpointUI();
    await computeAllModes();
  });

  dom.resetBtn.addEventListener("click", async () => {
    await seedInitialCorridor();
  });

  attachElevationChartEvents();
}

async function seedInitialCorridor() {
  setStatus("Resolving endpoints...", false);
  const [origin, destination] = await Promise.all([
    resolveSeedPlace(state.config.defaultOriginQuery),
    resolveSeedPlace(state.config.defaultDestinationQuery),
  ]);
  state.origin = origin;
  state.destination = destination;
  updateEndpointUI();
  await computeAllModes();
}

async function init() {
  try {
    const config = await apiJson("/api/config");
    state.config = config;

    if (!config.configured || !config.mapsApiKey) {
      setStatus("API Key Required", false);
      showBanner(
        "GOOGLE_MAPS_API_KEY is not set. Add it to .env (see .env.example) and reload."
      );
      return;
    }

    installMapsBootstrap(config.mapsApiKey);

    const [coreLib, mapsLib, markerLib, placesLib, geometryLib] = await Promise.all([
      google.maps.importLibrary("core"),
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
      google.maps.importLibrary("places"),
      google.maps.importLibrary("geometry"),
    ]);

    state.mapsLibs = {
      ...coreLib,
      ...mapsLib,
      ...markerLib,
      ...placesLib,
      ...geometryLib,
    };

    state.map = new mapsLib.Map(dom.mapCanvas, {
      center: config.initialCenter || { lat: 39.884, lng: -105.135 },
      zoom: config.initialZoom || 11,
      mapId: config.mapId || "DEMO_MAP_ID",
      internalUsageAttributionIds: [config.attributionId || "gmp_git_agentsamples_v1.0.0"],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.bicyclingLayer = new mapsLib.BicyclingLayer();

    state.originAutocompleteEl = mountPlaceAutocomplete(
      dom.originSlot,
      "Search origin in Denver / Boulder...",
      async (place) => {
        state.origin = place;
        updateEndpointUI();
        await computeAllModes();
      }
    );

    state.destinationAutocompleteEl = mountPlaceAutocomplete(
      dom.destinationSlot,
      "Search destination in Boulder / Denver...",
      async (place) => {
        state.destination = place;
        updateEndpointUI();
        await computeAllModes();
      }
    );

    attachUiHandlers();
    await seedInitialCorridor();
  } catch (err) {
    setStatus("Init Error", false);
    showBanner(`Initialization error: ${err.message}`);
  }
}

init();
