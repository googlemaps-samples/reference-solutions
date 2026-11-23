const DALLAS_CENTER = { lat: 32.7767, lng: -96.797 };
const ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0";

// Active fleet vehicle telemetry along Dallas freight & shuttle corridors
const FLEET_VEHICLES = [
  {
    id: "DFW-104",
    unitLabel: "104",
    driver: "Linehaul Shuttle A",
    corridor: "I-35E Stemmons Corridor",
    status: "En Route",
    speedMph: 58,
    nextStop: "DFW Logistics Hub",
    etaMinutes: 14,
    position: { lat: 32.8012, lng: -96.8351 },
    rawTrace: [
      { latitude: 32.7798, longitude: -96.8095 },
      { latitude: 32.7839, longitude: -96.8148 },
      { latitude: 32.7875, longitude: -96.8181 },
      { latitude: 32.7916, longitude: -96.8244 },
      { latitude: 32.7948, longitude: -96.8271 },
      { latitude: 32.7989, longitude: -96.8325 },
      { latitude: 32.8015, longitude: -96.8364 },
      { latitude: 32.8058, longitude: -96.8409 },
    ],
  },
  {
    id: "DFW-218",
    unitLabel: "218",
    driver: "Reefer Freight B",
    corridor: "I-30 Westbound Mixmaster",
    status: "Delayed",
    speedMph: 19,
    nextStop: "West Dallas Cross-Dock",
    etaMinutes: 29,
    position: { lat: 32.7684, lng: -96.8214 },
    rawTrace: [
      { latitude: 32.7712, longitude: -96.7845 },
      { latitude: 32.7704, longitude: -96.7921 },
      { latitude: 32.7691, longitude: -96.7998 },
      { latitude: 32.7689, longitude: -96.8082 },
      { latitude: 32.7676, longitude: -96.8147 },
      { latitude: 32.7692, longitude: -96.8219 },
      { latitude: 32.7681, longitude: -96.8295 },
    ],
  },
  {
    id: "DFW-309",
    unitLabel: "309",
    driver: "Metro Express Van",
    corridor: "US-75 Central Expy",
    status: "En Route",
    speedMph: 52,
    nextStop: "North Central Fulfillment",
    etaMinutes: 11,
    position: { lat: 32.8142, lng: -96.7826 },
    rawTrace: [
      { latitude: 32.7896, longitude: -96.7909 },
      { latitude: 32.7948, longitude: -96.7891 },
      { latitude: 32.7999, longitude: -96.7863 },
      { latitude: 32.8049, longitude: -96.7852 },
      { latitude: 32.8098, longitude: -96.7831 },
      { latitude: 32.8147, longitude: -96.7817 },
      { latitude: 32.8195, longitude: -96.7804 },
    ],
  },
  {
    id: "DFW-412",
    unitLabel: "412",
    driver: "Dock Yard Tractor",
    corridor: "South Dallas Intermodal",
    status: "Idle",
    speedMph: 0,
    nextStop: "Central Dispatch Depot",
    etaMinutes: 0,
    position: { lat: 32.7421, lng: -96.7854 },
    rawTrace: [
      { latitude: 32.7524, longitude: -96.7921 },
      { latitude: 32.7493, longitude: -96.7902 },
      { latitude: 32.7468, longitude: -96.7879 },
      { latitude: 32.7441, longitude: -96.7865 },
      { latitude: 32.7421, longitude: -96.7854 },
    ],
  },
  {
    id: "DFW-505",
    unitLabel: "505",
    driver: "East Corridor Cargo",
    corridor: "I-30 East / RL Thornton",
    status: "Delayed",
    speedMph: 24,
    nextStop: "East Dallas Parcel Hub",
    etaMinutes: 23,
    position: { lat: 32.7829, lng: -96.7486 },
    rawTrace: [
      { latitude: 32.7764, longitude: -96.7745 },
      { latitude: 32.7782, longitude: -96.7681 },
      { latitude: 32.7796, longitude: -96.7623 },
      { latitude: 32.7815, longitude: -96.7556 },
      { latitude: 32.7824, longitude: -96.7491 },
      { latitude: 32.7842, longitude: -96.7429 },
    ],
  },
];

const STATUS_STYLE = {
  "En Route": {
    color: "#059669",
    borderColor: "#065f46",
    badgeClass: "badge-en-route",
  },
  Delayed: {
    color: "#dc2626",
    borderColor: "#991b1b",
    badgeClass: "badge-delayed",
  },
  Idle: {
    color: "#64748b",
    borderColor: "#334155",
    badgeClass: "badge-idle",
  },
};

const state = {
  config: null,
  map: null,
  infoWindow: null,
  trafficLayer: null,
  trafficVisible: false,
  statusFilter: "ALL",
  selectedVehicleId: FLEET_VEHICLES[0].id,
  roadSnapEnabled: true,
  optimizeWaypoints: true,
  vehicleMarkers: new Map(),
  hubMarkers: [],
  rawTracePolyline: null,
  snappedTracePolyline: null,
  dispatchPolyline: null,
  hubs: [],
  snappedCache: new Map(),
  lastRouteLegs: [],
  mapsApiReady: false,
};

const dom = {
  apiKeyBanner: document.getElementById("api-key-banner"),
  apiKeyBannerText: document.getElementById("api-key-banner-text"),
  fleetList: document.getElementById("fleet-vehicle-list"),
  fleetVisibleBadge: document.getElementById("fleet-visible-badge"),
  roadsActiveVehicleLabel: document.getElementById("roads-active-vehicle-label"),
  snapToRoadsToggle: document.getElementById("snap-to-roads-toggle"),
  metricRawPoints: document.getElementById("metric-raw-points"),
  metricSnappedPoints: document.getElementById("metric-snapped-points"),
  metricRoadSegments: document.getElementById("metric-road-segments"),
  metricSnapOffset: document.getElementById("metric-snap-offset"),
  roadsStatusText: document.getElementById("roads-status-text"),
  optimizeWaypointsToggle: document.getElementById("optimize-waypoints-toggle"),
  calculateDispatchBtn: document.getElementById("calculate-dispatch-route-btn"),
  dispatchStatusText: document.getElementById("dispatch-status-text"),
  dispatchTotalDistance: document.getElementById("dispatch-total-distance"),
  dispatchTotalDuration: document.getElementById("dispatch-total-duration"),
  dispatchStopCount: document.getElementById("dispatch-stop-count"),
  hubSequenceList: document.getElementById("hub-sequence-list"),
  routeMatrixContainer: document.getElementById("route-matrix-table-container"),
  trafficToggleBtn: document.getElementById("traffic-layer-toggle"),
  autocompleteContainer: document.getElementById("place-autocomplete-container"),
  mapContainer: document.getElementById("map-container"),
  countAll: document.getElementById("count-all"),
  countEnRoute: document.getElementById("count-en-route"),
  countDelayed: document.getElementById("count-delayed"),
  countIdle: document.getElementById("count-idle"),
};

function loadGoogleMapsBootstrap(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.importLibrary) {
      resolve();
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
            a.onerror = () => (h = n(new Error(p + " could not load.")));
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

    window.google.maps
      .importLibrary("core")
      .then(() => resolve())
      .catch(reject);
  });
}

function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q =
    s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function formatDistance(meters) {
  if (typeof meters !== "number" || Number.isNaN(meters)) return "--";
  const miles = meters / 1609.344;
  return miles >= 10 ? `${miles.toFixed(1)} mi` : `${miles.toFixed(2)} mi`;
}

function parseDurationSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const match = durationStr.match(/^([\d.]+)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "--";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function showBanner(message) {
  dom.apiKeyBannerText.textContent = message;
  dom.apiKeyBanner.classList.remove("hidden");
}

function hideBanner() {
  dom.apiKeyBanner.classList.add("hidden");
}

function updateStatusCounts() {
  const counts = {
    ALL: FLEET_VEHICLES.length,
    "En Route": 0,
    Delayed: 0,
    Idle: 0,
  };
  for (const v of FLEET_VEHICLES) {
    if (counts[v.status] !== undefined) counts[v.status] += 1;
  }
  dom.countAll.textContent = String(counts.ALL);
  dom.countEnRoute.textContent = String(counts["En Route"]);
  dom.countDelayed.textContent = String(counts.Delayed);
  dom.countIdle.textContent = String(counts.Idle);
}

function getFilteredVehicles() {
  if (state.statusFilter === "ALL") return FLEET_VEHICLES;
  return FLEET_VEHICLES.filter((v) => v.status === state.statusFilter);
}

function renderVehicleList() {
  const visible = getFilteredVehicles();
  dom.fleetVisibleBadge.textContent = `${visible.length} unit${visible.length === 1 ? "" : "s"}`;

  const fragment = document.createDocumentFragment();
  for (const vehicle of visible) {
    const style = STATUS_STYLE[vehicle.status] || STATUS_STYLE.Idle;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "vehicle-card";
    if (vehicle.id === state.selectedVehicleId) {
      card.classList.add("is-selected");
    }
    card.setAttribute("data-vehicle-id", vehicle.id);

    const topRow = document.createElement("div");
    topRow.className = "vehicle-card-top";

    const idGroup = document.createElement("div");
    idGroup.className = "vehicle-id-group";

    const code = document.createElement("span");
    code.className = "vehicle-code";
    code.textContent = vehicle.id;

    const corridor = document.createElement("span");
    corridor.className = "vehicle-corridor";
    corridor.textContent = vehicle.corridor;

    idGroup.append(code, corridor);

    const badge = document.createElement("span");
    badge.className = `status-badge ${style.badgeClass}`;
    badge.textContent = vehicle.status;

    topRow.append(idGroup, badge);

    const telemetryRow = document.createElement("div");
    telemetryRow.className = "vehicle-telemetry-row";

    const speedCell = document.createElement("div");
    speedCell.className = "telemetry-cell";
    const speedLabel = document.createElement("span");
    speedLabel.textContent = "Speed";
    const speedVal = document.createElement("strong");
    speedVal.textContent = `${vehicle.speedMph} mph`;
    speedCell.append(speedLabel, speedVal);

    const stopCell = document.createElement("div");
    stopCell.className = "telemetry-cell";
    const stopLabel = document.createElement("span");
    stopLabel.textContent = "Next Stop";
    const stopVal = document.createElement("strong");
    stopVal.textContent = vehicle.nextStop;
    stopCell.append(stopLabel, stopVal);

    const etaCell = document.createElement("div");
    etaCell.className = "telemetry-cell align-right";
    const etaLabel = document.createElement("span");
    etaLabel.textContent = "ETA";
    const etaVal = document.createElement("strong");
    etaVal.textContent = vehicle.etaMinutes > 0 ? `${vehicle.etaMinutes} min` : "At Depot";
    etaCell.append(etaLabel, etaVal);

    telemetryRow.append(speedCell, stopCell, etaCell);
    card.append(topRow, telemetryRow);

    card.addEventListener("click", () => {
      selectVehicle(vehicle.id, true);
    });

    fragment.appendChild(card);
  }

  dom.fleetList.replaceChildren(fragment);
}

function buildInfoWindowNode(title, lines) {
  const card = document.createElement("div");
  card.className = "iw-card";

  const heading = document.createElement("h3");
  heading.className = "iw-title";
  heading.textContent = title;
  card.appendChild(heading);

  for (const text of lines) {
    const p = document.createElement("p");
    p.className = "iw-line";
    p.textContent = text;
    card.appendChild(p);
  }

  return card;
}

function syncVehicleMarkerVisibility() {
  if (!state.map) return;
  const visibleIds = new Set(getFilteredVehicles().map((v) => v.id));
  for (const [vehicleId, marker] of state.vehicleMarkers.entries()) {
    marker.map = visibleIds.has(vehicleId) ? state.map : null;
  }
}

async function createVehicleMarkers() {
  if (!state.map) return;
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

  for (const vehicle of FLEET_VEHICLES) {
    const style = STATUS_STYLE[vehicle.status] || STATUS_STYLE.Idle;
    const pin = new PinElement({
      background: style.color,
      borderColor: style.borderColor,
      glyphColor: "#ffffff",
      glyphText: vehicle.unitLabel,
      scale: 1.05,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: vehicle.position,
      content: pin,
      title: `${vehicle.id} (${vehicle.status})`,
      zIndex: 40,
    });

    marker.addEventListener("click", () => {
      selectVehicle(vehicle.id, false);
      if (state.infoWindow) {
        const node = buildInfoWindowNode(`${vehicle.id} — ${vehicle.driver}`, [
          `Status: ${vehicle.status} | Speed: ${vehicle.speedMph} mph`,
          `Corridor: ${vehicle.corridor}`,
          `Next Stop: ${vehicle.nextStop}`,
          vehicle.etaMinutes > 0 ? `Live ETA: ${vehicle.etaMinutes} min` : "Parked at Depot",
        ]);
        state.infoWindow.setContent(node);
        state.infoWindow.open({ anchor: marker, map: state.map });
      }
    });

    state.vehicleMarkers.set(vehicle.id, marker);
  }
  syncVehicleMarkerVisibility();
}

function getSelectedVehicle() {
  return (
    FLEET_VEHICLES.find((v) => v.id === state.selectedVehicleId) || FLEET_VEHICLES[0]
  );
}

async function selectVehicle(vehicleId, panToVehicle) {
  state.selectedVehicleId = vehicleId;
  renderVehicleList();

  const vehicle = getSelectedVehicle();
  dom.roadsActiveVehicleLabel.textContent = `Unit ${vehicle.id} • ${vehicle.corridor}`;

  if (state.map && panToVehicle) {
    state.map.panTo(vehicle.position);
    const marker = state.vehicleMarkers.get(vehicle.id);
    if (marker && state.infoWindow) {
      const node = buildInfoWindowNode(`${vehicle.id} — ${vehicle.driver}`, [
        `Status: ${vehicle.status} | Speed: ${vehicle.speedMph} mph`,
        `Corridor: ${vehicle.corridor}`,
        `Next Stop: ${vehicle.nextStop}`,
      ]);
      state.infoWindow.setContent(node);
      state.infoWindow.open({ anchor: marker, map: state.map });
    }
  }

  await renderVehicleTraces(vehicle);
}

async function renderVehicleTraces(vehicle) {
  const rawLatLngs = vehicle.rawTrace.map((pt) => ({
    lat: pt.latitude,
    lng: pt.longitude,
  }));
  dom.metricRawPoints.textContent = String(rawLatLngs.length);

  if (state.mapsApiReady && state.map) {
    const { Polyline } = await google.maps.importLibrary("maps");

    if (state.rawTracePolyline) {
      state.rawTracePolyline.setMap(null);
    }
    state.rawTracePolyline = new Polyline({
      path: rawLatLngs,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 0.95,
            strokeColor: "#f97316",
            scale: 3,
          },
          offset: "0",
          repeat: "12px",
        },
      ],
      map: state.map,
      zIndex: 22,
    });
  }

  if (!state.roadSnapEnabled) {
    if (state.snappedTracePolyline) {
      state.snappedTracePolyline.setMap(null);
    }
    dom.roadsStatusText.textContent = "Snap Overlay Hidden";
    return;
  }

  let snapData = state.snappedCache.get(vehicle.id);
  if (!snapData) {
    if (!state.config || !state.config.hasApiKey) {
      dom.metricSnappedPoints.textContent = "--";
      dom.metricRoadSegments.textContent = "--";
      dom.metricSnapOffset.textContent = "--";
      dom.roadsStatusText.textContent = "API Key Needed";
      return;
    }

    dom.roadsStatusText.textContent = "Snapping...";
    try {
      const response = await fetch("/api/roads/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: vehicle.rawTrace,
          interpolate: true,
        }),
      });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        dom.roadsStatusText.textContent = errPayload.detail
          ? "Roads API Unavailable"
          : `HTTP ${response.status}`;
        dom.metricSnappedPoints.textContent = "0";
        dom.metricRoadSegments.textContent = "0";
        dom.metricSnapOffset.textContent = "--";
        return;
      }
      snapData = await response.json();
      state.snappedCache.set(vehicle.id, snapData);
    } catch {
      dom.roadsStatusText.textContent = "Network Error";
      return;
    }
  }

  const snappedPoints = Array.isArray(snapData.snappedPoints)
    ? snapData.snappedPoints
    : [];
  const snappedPath = snappedPoints.map((pt) => ({
    lat: pt.location.latitude,
    lng: pt.location.longitude,
  }));

  const uniquePlaceIds = new Set(
    snappedPoints.map((pt) => pt.placeId).filter(Boolean)
  );

  // Mean snap offset across points with originalIndex
  const offsets = [];
  for (const pt of snappedPoints) {
    if (typeof pt.originalIndex === "number" && vehicle.rawTrace[pt.originalIndex]) {
      const orig = vehicle.rawTrace[pt.originalIndex];
      offsets.push(
        haversineMeters(
          orig.latitude,
          orig.longitude,
          pt.location.latitude,
          pt.location.longitude
        )
      );
    }
  }
  const meanOffset =
    offsets.length > 0
      ? offsets.reduce((sum, val) => sum + val, 0) / offsets.length
      : 0;

  dom.metricSnappedPoints.textContent = String(snappedPoints.length);
  dom.metricRoadSegments.textContent = String(uniquePlaceIds.size);
  dom.metricSnapOffset.textContent =
    offsets.length > 0 ? `${meanOffset.toFixed(1)} m` : "--";
  dom.roadsStatusText.textContent = snapData.warningMessage
    ? "Snapped (Partial)"
    : "Roads API Live";

  if (state.mapsApiReady && state.map && snappedPath.length > 0) {
    const { Polyline } = await google.maps.importLibrary("maps");
    if (state.snappedTracePolyline) {
      state.snappedTracePolyline.setMap(null);
    }
    state.snappedTracePolyline = new Polyline({
      path: snappedPath,
      strokeColor: "#0284c7",
      strokeOpacity: 0.92,
      strokeWeight: 5,
      map: state.map,
      zIndex: 25,
    });
  }
}

async function discoverDallasHubs() {
  if (!state.config || !state.config.hasApiKey) {
    dom.dispatchStatusText.textContent = "API Key Needed";
    renderHubSequence();
    return;
  }

  dom.dispatchStatusText.textContent = "Discovering Hubs...";
  try {
    const response = await fetch("/api/places/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textQuery: "distribution center logistics hub Dallas TX",
        latitude: DALLAS_CENTER.lat,
        longitude: DALLAS_CENTER.lng,
        radiusMeters: 25000,
        maxResultCount: 5,
      }),
    });
    if (!response.ok) {
      dom.dispatchStatusText.textContent = "Places Search Unavailable";
      renderHubSequence();
      return;
    }

    const data = await response.json();
    const places = Array.isArray(data.places) ? data.places : [];
    const discovered = places
      .filter((p) => p.location && typeof p.location.latitude === "number")
      .slice(0, 5)
      .map((p, idx) => ({
        id: p.id || `place-${idx}`,
        name: p.displayName?.text || `Dallas Hub ${idx + 1}`,
        address: p.formattedAddress || "Dallas, TX",
        lat: p.location.latitude,
        lng: p.location.longitude,
        source: "places-search",
      }));

    if (discovered.length >= 2) {
      state.hubs = discovered;
      dom.dispatchHubsCaption.textContent = `${discovered.length} live Dallas facilities (Places API New)`;
      await renderHubMarkers();
      renderHubSequence();
      await computeDispatchAndMatrix();
    } else {
      dom.dispatchStatusText.textContent = "No hubs returned";
      renderHubSequence();
    }
  } catch {
    dom.dispatchStatusText.textContent = "Hub lookup failed";
    renderHubSequence();
  }
}

async function renderHubMarkers() {
  if (!state.mapsApiReady || !state.map) return;

  for (const m of state.hubMarkers) {
    m.map = null;
  }
  state.hubMarkers = [];

  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

  state.hubs.forEach((hub, index) => {
    const isDepot = index === 0;
    const label = isDepot ? "D" : String(index);
    const pin = new PinElement({
      background: isDepot ? "#0f172a" : "#4f46e5",
      borderColor: isDepot ? "#334155" : "#3730a3",
      glyphColor: "#ffffff",
      glyphText: label,
      scale: isDepot ? 1.15 : 0.98,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: hub.lat, lng: hub.lng },
      content: pin,
      title: `${isDepot ? "Central Depot" : `Stop ${index}`}: ${hub.name}`,
      zIndex: 35,
    });

    marker.addEventListener("click", () => {
      if (state.infoWindow) {
        const node = buildInfoWindowNode(
          `${isDepot ? "Central Depot" : `Drop-Off Stop #${index}`}: ${hub.name}`,
          [hub.address, `Coordinates: ${hub.lat.toFixed(4)}, ${hub.lng.toFixed(4)}`]
        );
        state.infoWindow.setContent(node);
        state.infoWindow.open({ anchor: marker, map: state.map });
      }
    });

    state.hubMarkers.push(marker);
  });
}

function renderHubSequence() {
  dom.dispatchStopCount.textContent = String(state.hubs.length);
  if (state.hubs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "matrix-empty";
    empty.textContent =
      "Use the top search bar or configure GOOGLE_MAPS_API_KEY to load Dallas logistics hubs.";
    dom.hubSequenceList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.hubs.forEach((hub, index) => {
    const row = document.createElement("div");
    row.className = "hub-row";

    const left = document.createElement("div");
    left.className = "hub-row-left";

    const badge = document.createElement("span");
    badge.className = index === 0 ? "hub-badge is-depot" : "hub-badge";
    badge.textContent = index === 0 ? "D" : String(index);

    const meta = document.createElement("div");
    meta.className = "hub-meta";

    const nameEl = document.createElement("div");
    nameEl.className = "hub-name";
    nameEl.textContent = hub.name;

    const addrEl = document.createElement("div");
    addrEl.className = "hub-address";
    addrEl.textContent = hub.address;

    meta.append(nameEl, addrEl);
    left.append(badge, meta);

    const etaEl = document.createElement("span");
    etaEl.className = "hub-leg-eta";
    if (index === 0) {
      etaEl.textContent = "Depot";
    } else {
      const leg = state.lastRouteLegs[index - 1];
      etaEl.textContent = leg
        ? `${formatDuration(parseDurationSeconds(leg.duration))} • ${formatDistance(
            leg.distanceMeters
          )}`
        : "Pending";
    }

    row.append(left, etaEl);
    fragment.appendChild(row);
  });

  dom.hubSequenceList.replaceChildren(fragment);
}

function addDispatchHub(hub) {
  const duplicate = state.hubs.find((existing) => existing.id === hub.id);
  if (!duplicate) {
    if (state.hubs.length >= 6) {
      state.hubs = [state.hubs[0], ...state.hubs.slice(1, 5), hub];
    } else {
      state.hubs.push(hub);
    }
  }
  if (state.map) {
    state.map.panTo({ lat: hub.lat, lng: hub.lng });
  }
  renderHubMarkers().then(() => {
    renderHubSequence();
    if (state.hubs.length >= 2) {
      computeDispatchAndMatrix();
    }
  });
}

function renderMatrixTable(matrixElements, hubs) {
  if (!Array.isArray(matrixElements) || matrixElements.length === 0 || hubs.length < 2) {
    const empty = document.createElement("div");
    empty.className = "matrix-empty";
    empty.textContent = "Compute dispatch to populate depot-to-hub ETAs.";
    dom.routeMatrixContainer.replaceChildren(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "matrix-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Origin", "Destination Hub", "ETA", "Distance"].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  const sorted = [...matrixElements].sort((a, b) => {
    if ((a.originIndex ?? 0) !== (b.originIndex ?? 0)) {
      return (a.originIndex ?? 0) - (b.originIndex ?? 0);
    }
    return (a.destinationIndex ?? 0) - (b.destinationIndex ?? 0);
  });

  for (const el of sorted) {
    const oIdx = el.originIndex ?? 0;
    const dIdx = el.destinationIndex ?? 0;
    if (oIdx === 0 && dIdx === 0) continue;

    const tr = document.createElement("tr");

    const originCell = document.createElement("td");
    originCell.textContent = oIdx === 0 ? "Depot (D)" : `Stop ${oIdx}`;

    const destCell = document.createElement("td");
    const destHub = hubs[dIdx];
    destCell.textContent = destHub ? destHub.name : `Hub ${dIdx}`;

    const etaCell = document.createElement("td");
    etaCell.textContent =
      el.condition === "ROUTE_EXISTS"
        ? formatDuration(parseDurationSeconds(el.duration))
        : "N/A";

    const distCell = document.createElement("td");
    distCell.textContent =
      el.condition === "ROUTE_EXISTS" ? formatDistance(el.distanceMeters) : "--";

    tr.append(originCell, destCell, etaCell, distCell);
    tbody.appendChild(tr);
  }

  table.append(thead, tbody);
  dom.routeMatrixContainer.replaceChildren(table);
}

async function computeDispatchAndMatrix() {
  if (state.hubs.length < 2) {
    dom.dispatchStatusText.textContent = "Need >= 2 hubs";
    return;
  }
  if (!state.config || !state.config.hasApiKey) {
    dom.dispatchStatusText.textContent = "API Key Needed";
    return;
  }

  dom.calculateDispatchBtn.disabled = true;
  dom.dispatchStatusText.textContent = "Computing Routes...";

  const originHub = state.hubs[0];
  const destinationHub = state.hubs[state.hubs.length - 1];
  const intermediateHubs = state.hubs.slice(1, -1);

  const computeBody = {
    origin: { latitude: originHub.lat, longitude: originHub.lng },
    destination: { latitude: destinationHub.lat, longitude: destinationHub.lng },
    intermediates: intermediateHubs.map((h) => ({
      latitude: h.lat,
      longitude: h.lng,
    })),
    optimizeWaypointOrder: state.optimizeWaypoints,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  const matrixBody = {
    origins: [{ latitude: originHub.lat, longitude: originHub.lng }],
    destinations: state.hubs.map((h) => ({ latitude: h.lat, longitude: h.lng })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
  };

  try {
    const [routeResp, matrixResp] = await Promise.all([
      fetch("/api/routes/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(computeBody),
      }),
      fetch("/api/routes/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matrixBody),
      }),
    ]);

    if (routeResp.ok) {
      const routeJson = await routeResp.json();
      const route = Array.isArray(routeJson.routes) ? routeJson.routes[0] : null;
      if (route) {
        const optimizedIdx = route.optimizedIntermediateWaypointIndex;
        if (
          state.optimizeWaypoints &&
          Array.isArray(optimizedIdx) &&
          optimizedIdx.length === intermediateHubs.length
        ) {
          const reorderedIntermediates = optimizedIdx.map(
            (idx) => intermediateHubs[idx]
          );
          state.hubs = [originHub, ...reorderedIntermediates, destinationHub];
          await renderHubMarkers();
        }

        state.lastRouteLegs = Array.isArray(route.legs) ? route.legs : [];
        dom.dispatchTotalDistance.textContent = formatDistance(route.distanceMeters);
        dom.dispatchTotalDuration.textContent = formatDuration(
          parseDurationSeconds(route.duration)
        );

        const encoded = route.polyline?.encodedPolyline;
        if (encoded && state.mapsApiReady && state.map) {
          const { Polyline } = await google.maps.importLibrary("maps");
          const { encoding } = await google.maps.importLibrary("geometry");
          const { LatLngBounds } = await google.maps.importLibrary("core");

          const decodedPath = encoding.decodePath(encoded);
          if (state.dispatchPolyline) {
            state.dispatchPolyline.setMap(null);
          }
          state.dispatchPolyline = new Polyline({
            path: decodedPath,
            strokeColor: "#4f46e5",
            strokeOpacity: 0.88,
            strokeWeight: 5,
            map: state.map,
            zIndex: 15,
          });

          const bounds = new LatLngBounds();
          decodedPath.forEach((pt) => bounds.extend(pt));
          state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
        }
      }
      dom.dispatchStatusText.textContent = "Routes API Live";
    } else {
      dom.dispatchStatusText.textContent = "Routes API Unavailable";
    }

    if (matrixResp.ok) {
      const matrixJson = await matrixResp.json();
      renderMatrixTable(matrixJson, state.hubs);
    } else {
      renderMatrixTable([], state.hubs);
    }

    renderHubSequence();
  } catch {
    dom.dispatchStatusText.textContent = "Dispatch Error";
  } finally {
    dom.calculateDispatchBtn.disabled = false;
  }
}

async function initAutocomplete() {
  if (!state.mapsApiReady) return;
  try {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
    const autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ["us"],
    });
    autocomplete.setAttribute("aria-label", "Search Dallas hub or stop");
    dom.autocompleteContainer.replaceChildren(autocomplete);

    autocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
      if (!placePrediction) return;
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "location"],
      });
      if (place.location) {
        addDispatchHub({
          id: place.id || `custom-${Date.now()}`,
          name: place.displayName || "Selected Stop",
          address: place.formattedAddress || "Dallas, TX",
          lat: place.location.lat(),
          lng: place.location.lng(),
          source: "autocomplete",
        });
      }
    });
  } catch {
    const fallbackInput = document.createElement("input");
    fallbackInput.type = "text";
    fallbackInput.className = "autocomplete-fallback";
    fallbackInput.placeholder = "Hub search requires Places API";
    fallbackInput.disabled = true;
    dom.autocompleteContainer.replaceChildren(fallbackInput);
  }
}

function bindEvents() {
  document.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status") || "ALL";
      state.statusFilter = status;
      document.querySelectorAll(".filter-pill").forEach((pill) => {
        const active = pill === btn;
        pill.classList.toggle("is-active", active);
        pill.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderVehicleList();
      syncVehicleMarkerVisibility();
    });
  });

  dom.snapToRoadsToggle.addEventListener("click", () => {
    state.roadSnapEnabled = !state.roadSnapEnabled;
    dom.snapToRoadsToggle.classList.toggle("is-on", state.roadSnapEnabled);
    dom.snapToRoadsToggle.setAttribute(
      "aria-pressed",
      state.roadSnapEnabled ? "true" : "false"
    );
    dom.snapToRoadsToggle.textContent = state.roadSnapEnabled
      ? "Road Snap: ON"
      : "Road Snap: OFF";
    renderVehicleTraces(getSelectedVehicle());
  });

  dom.optimizeWaypointsToggle.addEventListener("change", () => {
    state.optimizeWaypoints = dom.optimizeWaypointsToggle.checked;
    if (state.hubs.length >= 2) {
      computeDispatchAndMatrix();
    }
  });

  dom.calculateDispatchBtn.addEventListener("click", () => {
    computeDispatchAndMatrix();
  });

  dom.trafficToggleBtn.addEventListener("click", async () => {
    state.trafficVisible = !state.trafficVisible;
    dom.trafficToggleBtn.classList.toggle("is-active", state.trafficVisible);
    dom.trafficToggleBtn.setAttribute(
      "aria-pressed",
      state.trafficVisible ? "true" : "false"
    );

    if (state.mapsApiReady && state.map) {
      if (!state.trafficLayer) {
        const { TrafficLayer } = await google.maps.importLibrary("maps");
        state.trafficLayer = new TrafficLayer();
      }
      state.trafficLayer.setMap(state.trafficVisible ? state.map : null);
    }
  });
}

async function initApp() {
  updateStatusCounts();
  renderVehicleList();
  renderHubSequence();
  renderMatrixTable([], []);
  bindEvents();

  try {
    const res = await fetch("/api/config");
    state.config = await res.json();
  } catch {
    showBanner("Unable to load /api/config from FastAPI backend.");
    return;
  }

  if (!state.config.hasApiKey) {
    showBanner(
      "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add a Maps Demo Key or Cloud API key to enable live map tiles, Roads API snapping, Places search, and Routes matrix."
    );
    await renderVehicleTraces(getSelectedVehicle());
    return;
  }

  hideBanner();

  try {
    await loadGoogleMapsBootstrap(state.config.googleMapsApiKey);
    const [{ Map, InfoWindow }] = await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
      google.maps.importLibrary("places"),
      google.maps.importLibrary("routes"),
      google.maps.importLibrary("geometry"),
    ]);

    state.mapsApiReady = true;
    state.map = new Map(dom.mapContainer, {
      center: DALLAS_CENTER,
      zoom: 12,
      mapId: state.config.mapId || "DEMO_MAP_ID",
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
    state.infoWindow = new InfoWindow();

    await Promise.all([createVehicleMarkers(), initAutocomplete()]);
    await selectVehicle(state.selectedVehicleId, false);
    await discoverDallasHubs();
  } catch {
    showBanner(
      "Google Maps JavaScript API could not initialize. Verify GOOGLE_MAPS_API_KEY restrictions and enabled APIs."
    );
  }
}

initApp();
