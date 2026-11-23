const DEFAULT_CENTER = { lat: 40.7549, lng: -73.984 };
const DEFAULT_ZOOM = 12;
const DEFAULT_ORIGIN = {
  lat: 40.7506,
  lng: -73.9935,
  label: "Penn Station, Midtown NYC",
};

const BRANCH_TYPE_META = {
  flagship: {
    label: "Flagship Store",
    shortCode: "STORE",
    pinClass: "branch-pin--flagship",
    badgeClass: "type-badge--flagship",
  },
  kiosk: {
    label: "Express Kiosk",
    shortCode: "KIOSK",
    pinClass: "branch-pin--kiosk",
    badgeClass: "type-badge--kiosk",
  },
  atm: {
    label: "24/7 ATM",
    shortCode: "ATM",
    pinClass: "branch-pin--atm",
    badgeClass: "type-badge--atm",
  },
};

const SERVICE_LABELS = {
  pickup: "Click & Collect",
  coffee: "Express Espresso",
  cash: "Cash Deposit",
  open24: "Open 24h",
};

const state = {
  config: null,
  map: null,
  mapsLib: null,
  markerLib: null,
  placesLib: null,
  routesLib: null,
  geocodingLib: null,
  geometryLib: null,
  origin: { ...DEFAULT_ORIGIN },
  originMarker: null,
  travelMode: "DRIVE",
  typeFilter: "all",
  serviceFilters: new Set(),
  branches: [],
  filteredBranches: [],
  selectedBranchId: null,
  fastestBranchId: null,
  branchMarkers: new Map(),
  clusterer: null,
  infoWindow: null,
  routePolylines: [],
  autocompletePredictions: [],
  sessionToken: null,
  autocompleteDebounceTimer: null,
};

const dom = {};

function cacheDom() {
  dom.configBanner = document.getElementById("config-banner");
  dom.originInput = document.getElementById("origin-search-input");
  dom.resetOriginBtn = document.getElementById("reset-origin-btn");
  dom.autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  dom.travelModeSelect = document.getElementById("travel-mode-select");
  dom.routeFastestBtn = document.getElementById("route-fastest-button");
  dom.resultsCount = document.getElementById("results-count");
  dom.routeSummaryBanner = document.getElementById("route-summary-banner");
  dom.routeSummaryTitle = document.getElementById("route-summary-title");
  dom.routeSummaryMetrics = document.getElementById("route-summary-metrics");
  dom.clearRouteBtn = document.getElementById("clear-route-btn");
  dom.branchList = document.getElementById("branch-list");
  dom.mapContainer = document.getElementById("map-container");
  dom.typeButtons = Array.from(document.querySelectorAll("[data-type-filter]"));
  dom.serviceButtons = Array.from(document.querySelectorAll("[data-service-filter]"));
}

function showBanner(message) {
  dom.configBanner.textContent = message;
  dom.configBanner.classList.remove("hidden");
}

function hideBanner() {
  dom.configBanner.textContent = "";
  dom.configBanner.classList.add("hidden");
}

function installMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
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
    const gObj = b[c] || (b[c] = {});
    const d = gObj.maps || (gObj.maps = {});
    const r = new Set();
    const e = new URLSearchParams();
    const u = () =>
      h ||
      (h = new Promise(async (f, n) => {
        a = m.createElement("script");
        e.set("libraries", [...r] + "");
        for (k in g) {
          e.set(
            k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
            g[k]
          );
        }
        e.set("callback", `${c}.maps.${q}`);
        a.src = `https://maps.${c}apis.com/maps/api/js?${e}`;
        d[q] = f;
        a.onerror = () => {
          h = n(new Error(`${p} could not load.`));
        };
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
    d[l]
      ? console.warn(`${p} only loads once. Ignoring:`, g)
      : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
  })({
    key: apiKey,
    v: "weekly",
    language: "en",
    region: "US",
  });
}

function deterministicHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function classifyBranch(place, categoryHint) {
  const primary = (place.primaryType || "").toLowerCase();
  const types = (place.types || []).map((t) => t.toLowerCase());
  const name = (place.displayName?.text || "").toLowerCase();

  if (
    primary === "atm" ||
    primary === "bank" ||
    types.includes("atm") ||
    name.includes("atm")
  ) {
    return "atm";
  }

  if (
    primary === "coffee_shop" ||
    primary === "cafe" ||
    types.includes("coffee_shop") ||
    types.includes("cafe") ||
    name.includes("espresso") ||
    name.includes("coffee") ||
    name.includes("kiosk")
  ) {
    return "kiosk";
  }

  if (categoryHint === "atm" || categoryHint === "kiosk" || categoryHint === "flagship") {
    return categoryHint;
  }

  return "flagship";
}

function deriveServices(place, branchType) {
  const services = new Set();
  const hash = deterministicHash(place.id || place.displayName?.text || "nyc");
  const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions || [];
  const has24hFromGoogle = weekdayDescriptions.some((line) =>
    line.toLowerCase().includes("open 24 hours")
  );

  if (branchType === "flagship") {
    services.add("pickup");
    if (hash % 2 === 0) services.add("coffee");
    if (hash % 3 === 0) services.add("cash");
    if (has24hFromGoogle) services.add("open24");
  } else if (branchType === "kiosk") {
    services.add("coffee");
    if (hash % 2 === 0) services.add("pickup");
    if (has24hFromGoogle) services.add("open24");
  } else {
    services.add("cash");
    services.add("open24");
  }

  return Array.from(services);
}

function parseDurationSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return null;
  const match = durationStr.match(/^([\d.]+)s$/);
  return match ? Math.round(Number(match[1])) : null;
}

function formatDuration(seconds, localizedText) {
  if (localizedText) return localizedText;
  if (seconds == null) return "N/A";
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistance(meters, localizedText) {
  if (localizedText) return localizedText;
  if (meters == null) return "";
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

function getTodayHoursText(weekdayDescriptions) {
  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) {
    return "Hours not listed by Place";
  }
  // weekdayDescriptions starts Monday=0 ... Sunday=6; JS getDay() has Sunday=0
  const jsDay = new Date().getDay();
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return weekdayDescriptions[idx] || weekdayDescriptions[0];
}

function createPinSvg(branchType) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "13");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.4");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const path = document.createElementNS(ns, "path");
  if (branchType === "flagship") {
    path.setAttribute("d", "M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
  } else if (branchType === "kiosk") {
    path.setAttribute("d", "M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z");
  } else {
    path.setAttribute("d", "M2 7h20v10H2zM12 12h.01");
  }
  svg.appendChild(path);
  return svg;
}

function createBranchMarkerElement(branch) {
  const meta = BRANCH_TYPE_META[branch.branchType];
  const el = document.createElement("div");
  el.className = `branch-pin ${meta.pinClass}`;
  if (branch.id === state.selectedBranchId) {
    el.classList.add("branch-pin--selected");
  }
  if (branch.id === state.fastestBranchId) {
    el.classList.add("branch-pin--fastest");
  }

  const icon = createPinSvg(branch.branchType);
  const label = document.createElement("span");
  label.textContent = meta.shortCode;
  el.append(icon, label);
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    selectBranch(branch.id, { panTo: false });
  });
  return el;
}

function createOriginMarkerElement() {
  const el = document.createElement("div");
  el.className = "origin-pin";
  el.textContent = "Origin";
  return el;
}

function updateOriginMarker() {
  if (!state.map || !state.markerLib) return;
  const { AdvancedMarkerElement } = state.markerLib;
  const position = { lat: state.origin.lat, lng: state.origin.lng };

  if (!state.originMarker) {
    state.originMarker = new AdvancedMarkerElement({
      map: state.map,
      position,
      title: `Starting Origin: ${state.origin.label}`,
      zIndex: 2000,
    });
    state.originMarker.append(createOriginMarkerElement());
  } else {
    state.originMarker.position = position;
    state.originMarker.title = `Starting Origin: ${state.origin.label}`;
  }
}

function createClusterRenderer() {
  const { AdvancedMarkerElement } = state.markerLib;
  return {
    render({ count, position }) {
      const pin = document.createElement("div");
      pin.className = "cluster-pin";
      if (count >= 10) pin.classList.add("cluster-pin--large");
      else if (count >= 5) pin.classList.add("cluster-pin--medium");

      const countEl = document.createElement("span");
      countEl.className = "cluster-pin__count";
      countEl.textContent = String(count);

      const labelEl = document.createElement("span");
      labelEl.className = "cluster-pin__label";
      labelEl.textContent = "branches";

      pin.append(countEl, labelEl);

      const clusterMarker = new AdvancedMarkerElement({
        map: state.map,
        position,
        title: `${count} NYC branches in cluster`,
        zIndex: 1000 + count,
      });
      clusterMarker.append(pin);
      return clusterMarker;
    },
  };
}

function syncBranchMarkers() {
  if (!state.map || !state.markerLib) return;
  const { AdvancedMarkerElement } = state.markerLib;

  if (state.clusterer) {
    state.clusterer.clearMarkers();
  }
  for (const marker of state.branchMarkers.values()) {
    marker.map = null;
  }
  state.branchMarkers.clear();

  const markersToCluster = [];
  for (const branch of state.filteredBranches) {
    const marker = new AdvancedMarkerElement({
      position: { lat: branch.lat, lng: branch.lng },
      title: `${branch.name} (${BRANCH_TYPE_META[branch.branchType].label})`,
      zIndex: branch.id === state.selectedBranchId ? 1500 : 100,
    });
    marker.append(createBranchMarkerElement(branch));

    state.branchMarkers.set(branch.id, marker);
    markersToCluster.push(marker);
  }

  if (window.markerClusterer?.MarkerClusterer) {
    const { MarkerClusterer, SuperClusterAlgorithm } = window.markerClusterer;
    if (!state.clusterer) {
      state.clusterer = new MarkerClusterer({
        map: state.map,
        markers: markersToCluster,
        algorithm: new SuperClusterAlgorithm({ radius: 68, maxZoom: 15 }),
        renderer: createClusterRenderer(),
      });
    } else {
      state.clusterer.addMarkers(markersToCluster);
    }
  } else {
    for (const marker of markersToCluster) {
      marker.map = state.map;
    }
  }
}

function refreshMarkerStyles() {
  for (const branch of state.filteredBranches) {
    const marker = state.branchMarkers.get(branch.id);
    if (!marker) continue;
    marker.zIndex = branch.id === state.selectedBranchId ? 1500 : 100;
    marker.replaceChildren(createBranchMarkerElement(branch));
  }
}

function clearRoutePolylines() {
  for (const line of state.routePolylines) {
    line.setMap(null);
  }
  state.routePolylines = [];
}

function drawRoutePolyline(encodedPolyline, branch) {
  if (!state.map || !state.mapsLib || !state.geometryLib || !encodedPolyline) return;
  clearRoutePolylines();

  const path = state.geometryLib.encoding.decodePath(encodedPolyline);
  const { Polyline } = state.mapsLib;

  const casing = new Polyline({
    path,
    strokeColor: "#ffffff",
    strokeOpacity: 0.95,
    strokeWeight: 9,
    zIndex: 40,
    map: state.map,
  });

  const inner = new Polyline({
    path,
    strokeColor: "#1d4ed8",
    strokeOpacity: 0.95,
    strokeWeight: 5,
    zIndex: 41,
    map: state.map,
  });

  state.routePolylines = [casing, inner];

  const { LatLngBounds } = state.mapsLib;
  const bounds = new LatLngBounds();
  bounds.extend({ lat: state.origin.lat, lng: state.origin.lng });
  bounds.extend({ lat: branch.lat, lng: branch.lng });
  for (const pt of path) {
    bounds.extend(pt);
  }
  state.map.fitBounds(bounds, { top: 64, right: 64, bottom: 72, left: 64 });
}

function openBranchInfoWindow(branch, routeSummary = null) {
  if (!state.map || !state.mapsLib) return;
  const marker = state.branchMarkers.get(branch.id);
  if (!marker) return;

  if (!state.infoWindow) {
    state.infoWindow = new state.mapsLib.InfoWindow();
  }

  const container = document.createElement("div");
  container.className = "info-window-card";

  const title = document.createElement("h3");
  title.className = "info-window-title";
  title.textContent = branch.name;

  const address = document.createElement("p");
  address.className = "info-window-address";
  address.textContent = branch.address;

  const metrics = document.createElement("div");
  metrics.className = "info-window-metrics";
  const etaText = routeSummary?.etaText || branch.etaText || "ETA pending";
  const distText = routeSummary?.distanceText || branch.distanceText || "";
  metrics.textContent = `${BRANCH_TYPE_META[branch.branchType].label} • ${etaText}${
    distText ? ` (${distText})` : ""
  }`;

  const hours = document.createElement("div");
  hours.className = "info-window-hours";
  hours.textContent = getTodayHoursText(branch.weekdayDescriptions);

  container.append(title, address, metrics, hours);

  if (branch.rating) {
    const ratingEl = document.createElement("div");
    ratingEl.className = "info-window-hours";
    ratingEl.textContent = `Google Rating: ${branch.rating.toFixed(1)} (${
      branch.userRatingCount || 0
    } reviews)`;
    container.appendChild(ratingEl);
  }

  state.infoWindow.setContent(container);
  if (marker.map) {
    state.infoWindow.open({
      anchor: marker,
      map: state.map,
    });
  } else {
    state.infoWindow.setPosition({ lat: branch.lat, lng: branch.lng });
    state.infoWindow.open({ map: state.map });
  }
}

function updateSummaryBanner(selectedBranch = null, routeSummary = null) {
  const kicker = dom.routeSummaryBanner.querySelector(".route-summary-kicker");
  if (kicker) {
    kicker.textContent = `Origin: ${state.origin.label}`;
  }

  if (selectedBranch) {
    dom.routeSummaryTitle.textContent = `Route to ${selectedBranch.name}`;
    const eta = routeSummary?.etaText || selectedBranch.etaText || "Calculating...";
    const dist = routeSummary?.distanceText || selectedBranch.distanceText || "";
    dom.routeSummaryMetrics.textContent = `${state.travelMode} • ${eta}${
      dist ? ` • ${dist}` : ""
    }`;
    dom.clearRouteBtn.classList.remove("hidden");
    return;
  }

  const fastest = state.filteredBranches.find((b) => b.id === state.fastestBranchId);
  if (fastest) {
    dom.routeSummaryTitle.textContent = `Fastest nearby: ${fastest.name}`;
    dom.routeSummaryMetrics.textContent = `${state.travelMode} • ${
      fastest.etaText || "Computing..."
    }${fastest.distanceText ? ` • ${fastest.distanceText}` : ""}`;
  } else {
    dom.routeSummaryTitle.textContent = "No matching branches in current filter";
    dom.routeSummaryMetrics.textContent = "Adjust branch type or service toggles";
  }
  dom.clearRouteBtn.classList.add("hidden");
}

function renderBranchList() {
  const frag = document.createDocumentFragment();

  if (state.filteredBranches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "No NYC branches match your active type and service filters. Clear a filter chip to view all locations.";
    dom.branchList.replaceChildren(empty);
    dom.resultsCount.textContent = "0 branches shown";
    return;
  }

  dom.resultsCount.textContent = `${state.filteredBranches.length} NYC branches`;

  for (const branch of state.filteredBranches) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "branch-card";
    if (branch.id === state.selectedBranchId) {
      card.classList.add("selected");
    }
    card.dataset.testid = "branch-card";
    card.dataset.branchId = branch.id;
    card.dataset.branchType = branch.branchType;

    const topRow = document.createElement("div");
    topRow.className = "card-top-row";

    const badges = document.createElement("div");
    badges.className = "card-badges";

    const meta = BRANCH_TYPE_META[branch.branchType];
    const typeBadge = document.createElement("span");
    typeBadge.className = `type-badge ${meta.badgeClass}`;
    typeBadge.textContent = meta.label;
    badges.appendChild(typeBadge);

    if (branch.id === state.fastestBranchId) {
      const fastBadge = document.createElement("span");
      fastBadge.className = "fastest-badge";
      fastBadge.dataset.testid = "fastest-branch-badge";
      fastBadge.textContent = "Fastest Nearby";
      badges.appendChild(fastBadge);
    }

    const etaBox = document.createElement("div");
    etaBox.className = "card-eta-box";

    const etaEl = document.createElement("span");
    etaEl.className = "branch-eta";
    etaEl.dataset.testid = "branch-eta";
    etaEl.textContent = branch.etaText || "Calculating...";

    const distEl = document.createElement("span");
    distEl.className = "branch-distance";
    distEl.dataset.testid = "branch-distance";
    distEl.textContent = branch.distanceText || "";

    etaBox.append(etaEl, distEl);
    topRow.append(badges, etaBox);

    const nameEl = document.createElement("h2");
    nameEl.className = "branch-name";
    nameEl.textContent = branch.name;

    const addressEl = document.createElement("p");
    addressEl.className = "branch-address";
    addressEl.textContent = branch.address;

    const metaRow = document.createElement("div");
    metaRow.className = "card-meta-row";

    const hoursSpan = document.createElement("span");
    hoursSpan.textContent = getTodayHoursText(branch.weekdayDescriptions);

    const ratingSpan = document.createElement("span");
    ratingSpan.textContent = branch.rating
      ? `★ ${branch.rating.toFixed(1)} (${branch.userRatingCount || 0})`
      : "Live Place";

    metaRow.append(hoursSpan, ratingSpan);

    const tagsRow = document.createElement("div");
    tagsRow.className = "service-tags";
    for (const svc of branch.services) {
      const tag = document.createElement("span");
      tag.className = "service-tag";
      tag.textContent = SERVICE_LABELS[svc] || svc;
      tagsRow.appendChild(tag);
    }

    card.append(topRow, nameEl, addressEl, metaRow, tagsRow);
    card.addEventListener("click", () => {
      selectBranch(branch.id, { panTo: true });
    });
    frag.appendChild(card);
  }

  dom.branchList.replaceChildren(frag);
}

function applyFiltersAndSort() {
  const matching = state.branches.filter((branch) => {
    if (state.typeFilter !== "all" && branch.branchType !== state.typeFilter) {
      return false;
    }
    for (const svc of state.serviceFilters) {
      if (!branch.services.includes(svc)) {
        return false;
      }
    }
    return true;
  });

  matching.sort((a, b) => {
    const da = a.durationSeconds ?? Number.MAX_SAFE_INTEGER;
    const db = b.durationSeconds ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });

  state.filteredBranches = matching;
  const fastestWithEta = matching.find((b) => b.durationSeconds != null) || matching[0];
  state.fastestBranchId = fastestWithEta ? fastestWithEta.id : null;

  renderBranchList();
  syncBranchMarkers();

  const activeSelected =
    state.filteredBranches.find((b) => b.id === state.selectedBranchId) || null;
  updateSummaryBanner(activeSelected);
}

async function computeRouteMatrix() {
  if (state.branches.length === 0) return;

  // Routes API supports up to 25 destinations with 1 origin per batch cleanly
  const chunks = [];
  for (let i = 0; i < state.branches.length; i += 25) {
    chunks.push(state.branches.slice(i, i + 25));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const resp = await fetch("/api/routes/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: {
            latitude: state.origin.lat,
            longitude: state.origin.lng,
          },
          destinations: chunk.map((b) => ({
            latitude: b.lat,
            longitude: b.lng,
          })),
          travelMode: state.travelMode,
        }),
      });

      if (!resp.ok) {
        return;
      }
      const elements = await resp.json();
      if (!Array.isArray(elements)) return;

      for (const el of elements) {
        const destIdx = el.destinationIndex;
        if (destIdx == null || !chunk[destIdx]) continue;
        const target = chunk[destIdx];
        if (el.condition && el.condition !== "ROUTE_EXISTS") {
          target.durationSeconds = null;
          target.distanceMeters = null;
          target.etaText = "No route";
          target.distanceText = "";
          continue;
        }
        const secs = parseDurationSeconds(el.duration);
        target.durationSeconds = secs;
        target.distanceMeters = el.distanceMeters ?? null;
        target.etaText = formatDuration(secs, el.localizedValues?.duration?.text);
        target.distanceText = formatDistance(
          el.distanceMeters,
          el.localizedValues?.distance?.text
        );
      }
    })
  );

  applyFiltersAndSort();
}

async function selectBranch(branchId, { panTo = false } = {}) {
  const branch = state.branches.find((b) => b.id === branchId);
  if (!branch) return;

  state.selectedBranchId = branchId;
  renderBranchList();
  refreshMarkerStyles();

  const activeCard = dom.branchList.querySelector(
    `[data-branch-id="${CSS.escape(branchId)}"]`
  );
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (panTo && state.map) {
    state.map.panTo({ lat: branch.lat, lng: branch.lng });
  }

  updateSummaryBanner(branch);

  try {
    const resp = await fetch("/api/routes/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: {
          latitude: state.origin.lat,
          longitude: state.origin.lng,
        },
        destination: {
          latitude: branch.lat,
          longitude: branch.lng,
        },
        travelMode: state.travelMode,
      }),
    });

    if (!resp.ok) {
      openBranchInfoWindow(branch);
      return;
    }

    const data = await resp.json();
    const route = data?.routes?.[0];
    if (!route) {
      openBranchInfoWindow(branch);
      return;
    }

    const secs = parseDurationSeconds(route.duration);
    const etaText = formatDuration(secs, route.localizedValues?.duration?.text);
    const distanceText = formatDistance(
      route.distanceMeters,
      route.localizedValues?.distance?.text
    );

    branch.durationSeconds = secs ?? branch.durationSeconds;
    branch.distanceMeters = route.distanceMeters ?? branch.distanceMeters;
    branch.etaText = etaText;
    branch.distanceText = distanceText;

    const encodedPolyline = route.polyline?.encodedPolyline;
    if (encodedPolyline) {
      drawRoutePolyline(encodedPolyline, branch);
    }
    updateSummaryBanner(branch, { etaText, distanceText });
    openBranchInfoWindow(branch, { etaText, distanceText });
    renderBranchList();
  } catch (err) {
    console.warn("Route compute error:", err);
  }
}

async function loadNycBranches() {
  const queries = [
    {
      hint: "flagship",
      textQuery: "flagship retail department store Manhattan New York",
      maxResultCount: 10,
    },
    {
      hint: "kiosk",
      textQuery: "espresso coffee kiosk cafe Manhattan New York",
      maxResultCount: 10,
    },
    {
      hint: "atm",
      textQuery: "24 hour ATM bank Manhattan New York",
      maxResultCount: 10,
    },
  ];

  const results = await Promise.all(
    queries.map(async (q) => {
      const resp = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textQuery: q.textQuery,
          maxResultCount: q.maxResultCount,
          center: {
            latitude: DEFAULT_CENTER.lat,
            longitude: DEFAULT_CENTER.lng,
          },
          radiusMeters: 6500,
        }),
      });
      if (!resp.ok) {
        return { hint: q.hint, places: [] };
      }
      const data = await resp.json();
      return { hint: q.hint, places: data.places || [] };
    })
  );

  const byId = new Map();
  for (const batch of results) {
    for (const place of batch.places) {
      if (!place?.id || !place?.location || byId.has(place.id)) continue;
      const branchType = classifyBranch(place, batch.hint);
      byId.set(place.id, {
        id: place.id,
        name: place.displayName?.text || "MetroRetail NYC Branch",
        address: place.formattedAddress || "Manhattan, New York, NY",
        lat: place.location.latitude,
        lng: place.location.longitude,
        branchType,
        services: deriveServices(place, branchType),
        rating: place.rating ?? null,
        userRatingCount: place.userRatingCount ?? null,
        weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions || [],
        durationSeconds: null,
        distanceMeters: null,
        etaText: null,
        distanceText: null,
      });
    }
  }

  state.branches = Array.from(byId.values());
  applyFiltersAndSort();
  await computeRouteMatrix();
}

function hideAutocompleteDropdown() {
  state.autocompletePredictions = [];
  dom.autocompleteDropdown.replaceChildren();
  dom.autocompleteDropdown.classList.add("hidden");
}

function renderAutocompleteDropdown(suggestions) {
  state.autocompletePredictions = suggestions;
  if (!suggestions.length) {
    hideAutocompleteDropdown();
    return;
  }

  const frag = document.createDocumentFragment();
  for (const item of suggestions) {
    const pred = item.placePrediction;
    if (!pred?.placeId) continue;

    const li = document.createElement("li");
    li.setAttribute("role", "option");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "autocomplete-item";

    const mainText = document.createElement("span");
    mainText.className = "autocomplete-main";
    mainText.textContent =
      pred.structuredFormat?.mainText?.text || pred.text?.text || "Selected location";

    const subText = document.createElement("span");
    subText.className = "autocomplete-sub";
    subText.textContent =
      pred.structuredFormat?.secondaryText?.text || "New York, NY";

    btn.append(mainText, subText);
    btn.addEventListener("click", () => {
      chooseAutocompletePrediction(pred);
    });

    li.appendChild(btn);
    frag.appendChild(li);
  }

  dom.autocompleteDropdown.replaceChildren(frag);
  dom.autocompleteDropdown.classList.remove("hidden");
}

async function fetchAutocomplete(inputText) {
  if (!inputText || inputText.trim().length < 2) {
    hideAutocompleteDropdown();
    return;
  }
  if (!state.sessionToken) {
    state.sessionToken =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  try {
    const resp = await fetch("/api/places/autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: inputText.trim(),
        sessionToken: state.sessionToken,
        center: {
          latitude: DEFAULT_CENTER.lat,
          longitude: DEFAULT_CENTER.lng,
        },
        radiusMeters: 25000,
      }),
    });
    if (!resp.ok) {
      hideAutocompleteDropdown();
      return;
    }
    const data = await resp.json();
    renderAutocompleteDropdown(data.suggestions || []);
  } catch {
    hideAutocompleteDropdown();
  }
}

async function setOriginAndRecalculate(newOrigin) {
  state.origin = newOrigin;
  updateOriginMarker();
  clearRoutePolylines();
  if (state.infoWindow) {
    state.infoWindow.close();
  }
  if (state.map) {
    state.map.panTo({ lat: newOrigin.lat, lng: newOrigin.lng });
  }
  await computeRouteMatrix();
  if (state.selectedBranchId) {
    const stillVisible = state.filteredBranches.some(
      (b) => b.id === state.selectedBranchId
    );
    if (stillVisible) {
      await selectBranch(state.selectedBranchId, { panTo: false });
    } else {
      state.selectedBranchId = null;
      updateSummaryBanner(null);
    }
  }
}

async function chooseAutocompletePrediction(placePrediction) {
  const label =
    placePrediction.structuredFormat?.mainText?.text ||
    placePrediction.text?.text ||
    "Custom NYC Origin";
  dom.originInput.value = placePrediction.text?.text || label;
  const activeToken = state.sessionToken;
  state.sessionToken = null;
  hideAutocompleteDropdown();

  const params = new URLSearchParams({ place_id: placePrediction.placeId });
  if (activeToken) {
    params.set("sessionToken", activeToken);
  }

  const resp = await fetch(`/api/places/details?${params.toString()}`);
  if (!resp.ok) return;
  const details = await resp.json();
  if (!details?.location) return;

  await setOriginAndRecalculate({
    lat: details.location.latitude,
    lng: details.location.longitude,
    label: details.displayName?.text || label,
  });
}

async function geocodeFallback(query) {
  if (!state.geocodingLib || !query.trim()) return;
  try {
    const geocoder = new state.geocodingLib.Geocoder();
    const res = await geocoder.geocode({
      address: `${query.trim()}, New York, NY`,
      region: "US",
    });
    const first = res?.results?.[0];
    if (!first?.geometry?.location) return;
    await setOriginAndRecalculate({
      lat: first.geometry.location.lat(),
      lng: first.geometry.location.lng(),
      label: first.formatted_address || query.trim(),
    });
  } catch (err) {
    console.warn("Geocoder fallback could not resolve query:", err);
  }
}

function bindEvents() {
  dom.originInput.addEventListener("input", (e) => {
    const value = e.target.value;
    clearTimeout(state.autocompleteDebounceTimer);
    state.autocompleteDebounceTimer = setTimeout(() => {
      fetchAutocomplete(value);
    }, 240);
  });

  dom.originInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (state.autocompletePredictions.length > 0 && state.autocompletePredictions[0].placePrediction) {
        await chooseAutocompletePrediction(state.autocompletePredictions[0].placePrediction);
      } else {
        hideAutocompleteDropdown();
        await geocodeFallback(dom.originInput.value);
      }
    } else if (e.key === "Escape") {
      hideAutocompleteDropdown();
    }
  });

  document.addEventListener("click", (e) => {
    if (
      !dom.originInput.contains(e.target) &&
      !dom.autocompleteDropdown.contains(e.target)
    ) {
      hideAutocompleteDropdown();
    }
  });

  dom.resetOriginBtn.addEventListener("click", async () => {
    dom.originInput.value = "";
    hideAutocompleteDropdown();
    await setOriginAndRecalculate({ ...DEFAULT_ORIGIN });
  });

  dom.travelModeSelect.addEventListener("change", async (e) => {
    state.travelMode = e.target.value;
    await computeRouteMatrix();
    if (state.selectedBranchId) {
      await selectBranch(state.selectedBranchId, { panTo: false });
    }
  });

  dom.routeFastestBtn.addEventListener("click", async () => {
    if (!state.fastestBranchId) return;
    await selectBranch(state.fastestBranchId, { panTo: true });
  });

  dom.clearRouteBtn.addEventListener("click", () => {
    state.selectedBranchId = null;
    clearRoutePolylines();
    if (state.infoWindow) {
      state.infoWindow.close();
    }
    refreshMarkerStyles();
    renderBranchList();
    updateSummaryBanner(null);
    if (state.map) {
      state.map.setCenter(DEFAULT_CENTER);
      state.map.setZoom(DEFAULT_ZOOM);
    }
  });

  for (const btn of dom.typeButtons) {
    btn.addEventListener("click", () => {
      state.typeFilter = btn.dataset.typeFilter || "all";
      for (const b of dom.typeButtons) {
        b.classList.toggle("active", b === btn);
      }
      applyFiltersAndSort();
    });
  }

  for (const btn of dom.serviceButtons) {
    btn.addEventListener("click", () => {
      const svc = btn.dataset.serviceFilter;
      if (!svc) return;
      if (state.serviceFilters.has(svc)) {
        state.serviceFilters.delete(svc);
        btn.classList.remove("active");
      } else {
        state.serviceFilters.add(svc);
        btn.classList.add("active");
      }
      applyFiltersAndSort();
    });
  }
}

async function initApp() {
  cacheDom();
  bindEvents();

  try {
    const resp = await fetch("/api/config");
    state.config = await resp.json();
  } catch (err) {
    showBanner("Unable to reach FastAPI backend configuration endpoint (/api/config).");
    return;
  }

  if (!state.config?.configured || !state.config?.googleMapsApiKey) {
    showBanner(
      "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add a Google Maps Platform key (or free Maps Demo Key) to load live NYC places, clustering, and routes."
    );
    dom.resultsCount.textContent = "API key required";
    dom.routeSummaryTitle.textContent = "Set GOOGLE_MAPS_API_KEY in .env";
    dom.routeSummaryMetrics.textContent =
      "See README.md or .env.example for free Maps Demo Key instructions.";
    return;
  }

  hideBanner();
  installMapsBootstrap(state.config.googleMapsApiKey);

  try {
    await google.maps.importLibrary("core");
    state.mapsLib = await google.maps.importLibrary("maps");
    state.markerLib = await google.maps.importLibrary("marker");
    state.placesLib = await google.maps.importLibrary("places");
    state.routesLib = await google.maps.importLibrary("routes");
    state.geocodingLib = await google.maps.importLibrary("geocoding");
    state.geometryLib = await google.maps.importLibrary("geometry");

    const { Map } = state.mapsLib;
    state.map = new Map(dom.mapContainer, {
      center: state.config.defaultCenter || DEFAULT_CENTER,
      zoom: state.config.defaultZoom || DEFAULT_ZOOM,
      mapId: state.config.mapId || "DEMO_MAP_ID",
      internalUsageAttributionIds: [
        state.config.attributionId || "gmp_git_agentsamples_v1.0.0",
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    updateOriginMarker();
    await loadNycBranches();
  } catch (err) {
    console.warn("Google Maps initialization error:", err);
    showBanner(
      "Google Maps failed to initialize. Verify that Maps JavaScript API, Places API (New), Routes API, and Geocoding API are enabled for your key."
    );
  }
}

window.addEventListener("DOMContentLoaded", initApp);
