/* Miami Civic Hazard Monitor, Incident Reporter & Safe Shelter Router */

const state = {
  config: null,
  map: null,
  infoWindow: null,
  mapsLib: null,
  markerLib: null,
  geometryLib: null,
  incidents: [],
  floodZones: [],
  zonePolygons: [],
  shelters: [],
  shelterMarkers: [],
  submittedMarkers: [],
  selectedPoint: { lat: 25.7743, lng: -80.1937 },
  selectedAddress: "Downtown Miami Civic Command",
  selectedElevation: null,
  selectedWeatherSummary: null,
  selectedMarker: null,
  activeShelterId: null,
  routePolyline: null,
  routeUnderlayPolyline: null,
  deckOverlay: null,
  canvasHeatmap: null,
  usingDeckGL: false,
  heatmapVisible: true,
  polygonsVisible: true,
};

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bindStaticEvents();
  bootstrapApp().catch((err) => {
    showBanner("Initialization Error", err?.message || "Failed to initialize portal.");
  });
});

function cacheDom() {
  const ids = [
    "mobile-sidebar-toggle",
    "control-sidebar",
    "header-weather-text",
    "layer-toggle-heatmap",
    "layer-toggle-polygons",
    "find-shelter-btn",
    "api-key-banner",
    "api-key-banner-title",
    "api-key-banner-body",
    "incident-count-badge",
    "incident-coords",
    "incident-elevation",
    "incident-address",
    "incident-weather",
    "incident-type-select",
    "incident-submit-btn",
    "incident-feedback",
    "avoid-flood-toggle",
    "route-status-badge",
    "route-shelter-name",
    "route-eta",
    "route-distance",
    "route-steps-list",
    "shelter-count-badge",
    "shelter-search-input",
    "shelter-search-btn",
    "shelter-list",
    "map-container",
    "heatmap-engine-tag",
  ];
  for (const id of ids) {
    dom[id] = document.getElementById(id);
  }
}

function bindStaticEvents() {
  dom["mobile-sidebar-toggle"]?.addEventListener("click", () => {
    dom["control-sidebar"]?.classList.toggle("open");
  });

  dom["layer-toggle-heatmap"]?.addEventListener("change", (e) => {
    state.heatmapVisible = Boolean(e.target.checked);
    updateHeatmapLayer();
  });

  dom["layer-toggle-polygons"]?.addEventListener("change", (e) => {
    state.polygonsVisible = Boolean(e.target.checked);
    for (const entry of state.zonePolygons) {
      entry.polygon.setMap(state.polygonsVisible ? state.map : null);
    }
  });

  dom["incident-submit-btn"]?.addEventListener("click", handleIncidentSubmit);
  dom["find-shelter-btn"]?.addEventListener("click", handleFindSafeShelter);
  dom["shelter-search-btn"]?.addEventListener("click", () => {
    const query = dom["shelter-search-input"]?.value.trim() || "hospital and community center in Miami, FL";
    searchShelters(query, false);
  });

  dom["shelter-search-input"]?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = dom["shelter-search-input"].value.trim() || "hospital and community center in Miami, FL";
      searchShelters(query, false);
    }
  });

  document.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-query");
      if (q && dom["shelter-search-input"]) {
        dom["shelter-search-input"].value = q;
        searchShelters(q, false);
      }
    });
  });

  dom["avoid-flood-toggle"]?.addEventListener("change", () => {
    if (state.activeShelterId) {
      const active = state.shelters.find((s) => s.id === state.activeShelterId);
      if (active) {
        computeEvacuationRoute(active);
      }
    }
  });
}

async function bootstrapApp() {
  const [configRes, zonesRes, incidentsRes] = await Promise.all([
    fetch("/api/config").then((r) => r.json()),
    fetch("/api/flood-zones").then((r) => r.json()),
    fetch("/api/incidents").then((r) => r.json()),
  ]);

  state.config = configRes;
  state.floodZones = zonesRes.zones || [];
  state.incidents = incidentsRes.incidents || [];
  updateIncidentCount();

  if (!configRes.hasApiKey || !configRes.apiKey) {
    showBanner(
      "GOOGLE_MAPS_API_KEY Not Configured",
      "Copy .env.example to .env, add a free Maps Demo Key or Google Cloud API key as GOOGLE_MAPS_API_KEY, and restart uvicorn."
    );
    dom["header-weather-text"].textContent = "API key required";
    dom["incident-weather"].textContent = "Configure GOOGLE_MAPS_API_KEY to enable live APIs.";
    return;
  }

  installGoogleMapsBootstrap(configRes.apiKey);

  const [coreLib, mapsLib, markerLib, geometryLib] = await Promise.all([
    google.maps.importLibrary("core"),
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("geometry"),
  ]);

  state.mapsLib = mapsLib;
  state.markerLib = markerLib;
  state.geometryLib = geometryLib;

  const map = new mapsLib.Map(dom["map-container"], {
    center: configRes.center || { lat: 25.7743, lng: -80.1937 },
    zoom: configRes.zoom || 13,
    mapId: configRes.mapId || "DEMO_MAP_ID",
    internalUsageAttributionIds: [configRes.attributionId || "gmp_git_agentsamples_v1.0.0"],
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
  });

  state.map = map;
  state.infoWindow = new mapsLib.InfoWindow();

  renderFloodZones();
  initHeatmapLayer();

  map.addListener("click", (event) => {
    if (!event.latLng) return;
    handleMapPointSelection({
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    });
  });

  // Initial parallel enrichment for Miami center + live shelters fetch
  await Promise.all([
    enrichSelectedLocation(state.selectedPoint, true),
    searchShelters(dom["shelter-search-input"]?.value || "hospital and community center in Miami, FL", true),
  ]);
}

function installGoogleMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) return;
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
  });
}

function showBanner(title, message) {
  if (!dom["api-key-banner"]) return;
  dom["api-key-banner-title"].textContent = title;
  dom["api-key-banner-body"].textContent = message;
  dom["api-key-banner"].classList.remove("hidden");
}

/* -------------------------------------------------------------------------- */
/* Flood-Hazard Polygons                                                      */
/* -------------------------------------------------------------------------- */

function renderFloodZones() {
  const { Polygon } = state.mapsLib;
  state.zonePolygons = state.floodZones.map((zone) => {
    const polygon = new Polygon({
      paths: zone.paths,
      strokeColor: zone.strokeColor || "#991b1b",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: zone.fillColor || "#dc2626",
      fillOpacity: zone.fillOpacity ?? 0.28,
      map: state.polygonsVisible ? state.map : null,
      zIndex: 2,
    });

    polygon.addListener("click", (event) => {
      if (event.latLng) {
        handleMapPointSelection({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
        openInfoWindowAt(event.latLng, zone.name, `${zone.severity} FLOOD HAZARD — ${zone.advisory}`);
      }
    });

    return { zone, polygon };
  });
}

/* -------------------------------------------------------------------------- */
/* deck.gl HeatmapLayer + Headless Canvas Fallback                            */
/* -------------------------------------------------------------------------- */

function supportsWebGL2() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2"));
  } catch {
    return false;
  }
}

function initHeatmapLayer() {
  const deckApi = window.deck;
  if (deckApi?.HeatmapLayer && deckApi?.GoogleMapsOverlay && supportsWebGL2()) {
    try {
      state.usingDeckGL = true;
      dom["heatmap-engine-tag"].textContent = "deck.gl WebGL2";
      state.deckOverlay = new deckApi.GoogleMapsOverlay({
        layers: [buildDeckHeatmapLayer()],
        onError: () => {
          switchToCanvasHeatmapFallback();
        },
      });
      state.deckOverlay.setMap(state.map);
      return;
    } catch {
      state.usingDeckGL = false;
    }
  }
  switchToCanvasHeatmapFallback();
}

function buildDeckHeatmapLayer() {
  return new window.deck.HeatmapLayer({
    id: "miami-storm-heatmap-layer",
    data: [...state.incidents],
    getPosition: (d) => [d.lng, d.lat],
    getWeight: (d) => d.weight || 6,
    radiusPixels: 42,
    intensity: 1.3,
    threshold: 0.05,
    visible: state.heatmapVisible,
    colorRange: [
      [254, 240, 138, 150],
      [253, 186, 116, 185],
      [251, 146, 60, 205],
      [239, 68, 68, 225],
      [185, 28, 28, 245],
    ],
  });
}

function switchToCanvasHeatmapFallback() {
  state.usingDeckGL = false;
  if (state.deckOverlay) {
    try {
      state.deckOverlay.setMap(null);
    } catch {
      // ignore cleanup errors on failed WebGL context
    }
    state.deckOverlay = null;
  }
  dom["heatmap-engine-tag"].textContent = "2D Canvas Heatmap";
  if (!state.canvasHeatmap) {
    state.canvasHeatmap = createCanvasHeatmapOverlay();
    state.canvasHeatmap.setMap(state.map);
  } else {
    state.canvasHeatmap.draw();
  }
}

function updateHeatmapLayer() {
  if (state.usingDeckGL && state.deckOverlay) {
    state.deckOverlay.setProps({
      layers: [buildDeckHeatmapLayer()],
    });
  } else if (state.canvasHeatmap) {
    state.canvasHeatmap.draw();
  }
}

function createCanvasHeatmapOverlay() {
  const { OverlayView } = state.mapsLib;

  class CanvasHeatmapOverlay extends OverlayView {
    constructor() {
      super();
      this.canvas = null;
    }

    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.pointerEvents = "none";
      this.canvas = canvas;
      const panes = this.getPanes();
      panes?.overlayLayer?.appendChild(canvas);
    }

    draw() {
      if (!this.canvas) return;
      const projection = this.getProjection();
      const mapDiv = this.getMap()?.getDiv();
      if (!projection || !mapDiv) return;

      const width = mapDiv.clientWidth || 800;
      const height = mapDiv.clientHeight || 600;
      this.canvas.width = width;
      this.canvas.height = height;

      const bounds = this.getMap().getBounds();
      if (bounds) {
        const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
        const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
        if (sw && ne) {
          this.canvas.style.left = `${Math.round(sw.x)}px`;
          this.canvas.style.top = `${Math.round(ne.y)}px`;
        }
      }

      const ctx = this.canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (!state.heatmapVisible) return;

      const offsetLeft = parseFloat(this.canvas.style.left || "0");
      const offsetTop = parseFloat(this.canvas.style.top || "0");

      for (const item of state.incidents) {
        const pt = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(item.lat, item.lng)
        );
        if (!pt) continue;
        const x = pt.x - offsetLeft;
        const y = pt.y - offsetTop;
        const weight = Math.min(1, (item.weight || 6) / 10);
        const radius = 28 + weight * 18;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
        grad.addColorStop(0, `rgba(220, 38, 38, ${0.42 * weight + 0.15})`);
        grad.addColorStop(0.5, `rgba(249, 115, 22, ${0.26 * weight + 0.08})`);
        grad.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    onRemove() {
      if (this.canvas?.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
    }
  }

  return new CanvasHeatmapOverlay();
}

/* -------------------------------------------------------------------------- */
/* Map Click -> Reverse Geocode + Elevation + Weather Enrichment              */
/* -------------------------------------------------------------------------- */

function handleMapPointSelection(point) {
  state.selectedPoint = point;
  placeIncidentPin(point);
  enrichSelectedLocation(point, false);
}

function placeIncidentPin(point) {
  const { AdvancedMarkerElement, PinElement } = state.markerLib;
  if (!state.selectedMarker) {
    const pin = new PinElement({
      background: "#ea580c",
      borderColor: "#7c2d12",
      glyphColor: "#ffffff",
      glyphText: "!",
      scale: 1.1,
    });
    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: point,
      title: "Selected Incident Location",
      zIndex: 50,
    });
    marker.append(pin);
    state.selectedMarker = marker;
  } else {
    state.selectedMarker.position = point;
    state.selectedMarker.map = state.map;
  }
}

async function enrichSelectedLocation(point, isInitialCenter) {
  dom["incident-coords"].textContent = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  if (!isInitialCenter) {
    dom["incident-address"].textContent = "Reverse-geocoding address…";
    dom["incident-elevation"].textContent = "Sampling elevation…";
    dom["incident-weather"].textContent = "Fetching live conditions…";
    dom["incident-feedback"].textContent = "";
  }

  const qs = `lat=${encodeURIComponent(point.lat)}&lng=${encodeURIComponent(point.lng)}`;
  const [geoRes, elevRes, weatherRes] = await Promise.all([
    fetch(`/api/geocode/reverse?${qs}`).then((r) => r.json()).catch(() => ({ ok: false })),
    fetch(`/api/elevation?${qs}`).then((r) => r.json()).catch(() => ({ ok: false })),
    fetch(`/api/weather/current?${qs}`).then((r) => r.json()).catch(() => ({ ok: false })),
  ]);

  if (geoRes.ok && geoRes.formattedAddress) {
    state.selectedAddress = geoRes.formattedAddress;
    dom["incident-address"].textContent = geoRes.formattedAddress;
  } else {
    state.selectedAddress = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} (Miami, FL)`;
    dom["incident-address"].textContent = geoRes.error
      ? `${state.selectedAddress} — ${geoRes.error}`
      : state.selectedAddress;
  }

  if (elevRes.ok && elevRes.elevationMeters !== null && elevRes.elevationMeters !== undefined) {
    state.selectedElevation = elevRes.elevationMeters;
    const surgeRisk = elevRes.elevationMeters < 2.0 ? " (Low-lying surge risk)" : "";
    dom["incident-elevation"].textContent = `${elevRes.elevationMeters.toFixed(2)} m MSL${surgeRisk}`;
  } else {
    state.selectedElevation = null;
    dom["incident-elevation"].textContent = elevRes.error ? "Elevation unavailable (key/API)" : "Unavailable";
  }

  if (weatherRes.ok) {
    const parts = [];
    if (weatherRes.condition) parts.push(weatherRes.condition);
    if (weatherRes.temperatureC != null) parts.push(`${weatherRes.temperatureC}°C`);
    if (weatherRes.windSpeedKmh != null) {
      const gust = weatherRes.windGustKmh != null ? ` (gusts ${weatherRes.windGustKmh} km/h)` : "";
      parts.push(`Wind ${weatherRes.windSpeedKmh} km/h${gust}`);
    }
    if (weatherRes.precipitationProbability != null) {
      parts.push(`Precip ${weatherRes.precipitationProbability}%`);
    }
    const summary = parts.join(" · ") || "Live weather active";
    state.selectedWeatherSummary = summary;
    dom["incident-weather"].textContent = summary;

    if (isInitialCenter || dom["header-weather-text"].textContent.startsWith("Loading")) {
      dom["header-weather-text"].textContent = `Miami: ${weatherRes.condition || "Live"} · ${weatherRes.windSpeedKmh ?? "--"} km/h`;
    }
  } else {
    state.selectedWeatherSummary = null;
    dom["incident-weather"].textContent = weatherRes.error || "Weather unavailable";
    if (isInitialCenter) {
      dom["header-weather-text"].textContent = "Miami Storm Watch";
    }
  }
}

async function handleIncidentSubmit() {
  const hazardType = dom["incident-type-select"]?.value || "Street Flooding";
  const weightMap = {
    "Storm Surge": 10,
    "Street Flooding": 9,
    "Downed Power Line": 8,
    "Blocked Storm Drain": 7,
    "Wind Debris": 6,
  };

  dom["incident-submit-btn"].disabled = true;
  try {
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: state.selectedPoint.lat,
        lng: state.selectedPoint.lng,
        hazardType,
        weight: weightMap[hazardType] || 8,
        address: state.selectedAddress || "Miami, FL",
        elevationMeters: state.selectedElevation,
        weatherSummary: state.selectedWeatherSummary,
      }),
    });
    const data = await res.json();
    if (data.ok && data.incident) {
      state.incidents.push(data.incident);
      updateIncidentCount();
      updateHeatmapLayer();
      addSubmittedIncidentMarker(data.incident);
      dom["incident-feedback"].textContent = `Logged "${hazardType}" to live heatmap (#${state.incidents.length}).`;
    }
  } catch {
    dom["incident-feedback"].textContent = "Failed to save incident report.";
  } finally {
    dom["incident-submit-btn"].disabled = false;
  }
}

function addSubmittedIncidentMarker(incident) {
  const { AdvancedMarkerElement, PinElement } = state.markerLib;
  const pin = new PinElement({
    background: "#dc2626",
    borderColor: "#7f1d1d",
    glyphColor: "#ffffff",
    glyphText: "⚡",
    scale: 0.9,
  });
  const marker = new AdvancedMarkerElement({
    map: state.map,
    position: { lat: incident.lat, lng: incident.lng },
    title: `${incident.hazardType} — ${incident.address}`,
    zIndex: 40,
  });
  marker.append(pin);
  marker.addEventListener("click", () => {
    openInfoWindowAt(
      marker,
      incident.hazardType,
      `${incident.address}${incident.elevationMeters != null ? ` · Elev ${incident.elevationMeters} m` : ""}`
    );
  });
  state.submittedMarkers.push(marker);
}

function updateIncidentCount() {
  if (dom["incident-count-badge"]) {
    dom["incident-count-badge"].textContent = `${state.incidents.length} reports`;
  }
}

/* -------------------------------------------------------------------------- */
/* Places API (New) Shelter Search & Advanced Markers                         */
/* -------------------------------------------------------------------------- */

async function searchShelters(textQuery, autoRouteBest) {
  dom["shelter-count-badge"].textContent = "Searching…";
  try {
    const res = await fetch("/api/places/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textQuery,
        center: state.selectedPoint || state.config.center,
        radiusMeters: 12000,
        maxResultCount: 8,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      dom["shelter-count-badge"].textContent = "Unavailable";
      renderShelterError(data.error || "Unable to fetch shelters from Places API (New).");
      return;
    }

    const rawPlaces = data.places || [];
    state.shelters = rawPlaces
      .filter((p) => p.location && typeof p.location.latitude === "number")
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text || "Emergency Shelter",
        address: p.formattedAddress || "Miami, FL",
        lat: p.location.latitude,
        lng: p.location.longitude,
        types: p.types || [],
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        businessStatus: p.businessStatus || "OPERATIONAL",
      }));

    dom["shelter-count-badge"].textContent = `${state.shelters.length} found`;
    renderShelterMarkers();
    renderShelterList();

    if (autoRouteBest && state.shelters.length > 0) {
      const best = pickNearestSafeShelter();
      if (best) {
        await computeEvacuationRoute(best);
      }
    }
  } catch {
    dom["shelter-count-badge"].textContent = "Error";
    renderShelterError("Network error contacting /api/places/search.");
  }
}

function renderShelterError(message) {
  const list = dom["shelter-list"];
  list.replaceChildren();
  const li = document.createElement("li");
  li.className = "shelter-item";
  li.textContent = message;
  list.appendChild(li);
}

function clearShelterMarkers() {
  for (const m of state.shelterMarkers) {
    m.map = null;
  }
  state.shelterMarkers = [];
}

function renderShelterMarkers() {
  clearShelterMarkers();
  const { AdvancedMarkerElement, PinElement } = state.markerLib;

  for (const shelter of state.shelters) {
    const isHospital = shelter.types.includes("hospital") || /hospital|medical|health/i.test(shelter.name);
    const pin = new PinElement({
      background: isHospital ? "#0f766e" : "#1d4ed8",
      borderColor: isHospital ? "#115e59" : "#1e3a8a",
      glyphColor: "#ffffff",
      glyphText: isHospital ? "H" : "S",
      scale: 1.08,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: shelter.lat, lng: shelter.lng },
      title: shelter.name,
      zIndex: 45,
    });
    marker.append(pin);

    marker.addEventListener("click", () => {
      openShelterInfoWindow(marker, shelter);
    });

    state.shelterMarkers.push(marker);
  }
}

function renderShelterList() {
  const list = dom["shelter-list"];
  list.replaceChildren();

  if (state.shelters.length === 0) {
    const empty = document.createElement("li");
    empty.className = "shelter-item";
    empty.textContent = "No matching shelters returned. Try another Miami query.";
    list.appendChild(empty);
    return;
  }

  for (const shelter of state.shelters) {
    const li = document.createElement("li");
    li.className = `shelter-item${shelter.id === state.activeShelterId ? " active" : ""}`;
    li.dataset.shelterId = shelter.id;

    const top = document.createElement("div");
    top.className = "shelter-top";

    const nameEl = document.createElement("span");
    nameEl.className = "shelter-name";
    nameEl.textContent = shelter.name;

    const metaEl = document.createElement("span");
    metaEl.className = "shelter-meta";
    const ratingText = shelter.rating != null ? `★ ${shelter.rating.toFixed(1)}` : "Civic";
    metaEl.textContent = ratingText;

    top.append(nameEl, metaEl);

    const addrEl = document.createElement("div");
    addrEl.className = "shelter-addr";
    addrEl.textContent = shelter.address;

    const actions = document.createElement("div");
    actions.className = "shelter-actions";

    const statusEl = document.createElement("span");
    statusEl.className = "shelter-meta";
    statusEl.textContent = shelter.businessStatus === "OPERATIONAL" ? "Open / Operational" : shelter.businessStatus;

    const routeBtn = document.createElement("button");
    routeBtn.type = "button";
    routeBtn.className = "route-here-btn";
    routeBtn.textContent = "Route Here";
    routeBtn.addEventListener("click", () => {
      computeEvacuationRoute(shelter);
    });

    actions.append(statusEl, routeBtn);
    li.append(top, addrEl, actions);
    list.appendChild(li);
  }
}

function openInfoWindowAt(anchorOrPosition, titleText, bodyText) {
  const card = document.createElement("div");
  card.className = "iw-card";

  const h3 = document.createElement("h3");
  h3.className = "iw-title";
  h3.textContent = titleText;

  const p = document.createElement("p");
  p.className = "iw-body";
  p.textContent = bodyText;

  card.append(h3, p);
  state.infoWindow.setContent(card);

  if (anchorOrPosition instanceof state.markerLib.AdvancedMarkerElement) {
    state.infoWindow.open({ anchor: anchorOrPosition, map: state.map });
  } else {
    state.infoWindow.setPosition(anchorOrPosition);
    state.infoWindow.open({ map: state.map });
  }
}

function openShelterInfoWindow(marker, shelter) {
  const card = document.createElement("div");
  card.className = "iw-card";

  const h3 = document.createElement("h3");
  h3.className = "iw-title";
  h3.textContent = shelter.name;

  const p = document.createElement("p");
  p.className = "iw-body";
  const rating = shelter.rating != null ? ` · ★ ${shelter.rating.toFixed(1)}` : "";
  p.textContent = `${shelter.address}${rating}`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "iw-btn";
  btn.textContent = "Compute Safe Route";
  btn.addEventListener("click", () => {
    computeEvacuationRoute(shelter);
  });

  card.append(h3, p, btn);
  state.infoWindow.setContent(card);
  state.infoWindow.open({ anchor: marker, map: state.map });
}

/* -------------------------------------------------------------------------- */
/* Routes API + Flood-Polygon Bypass Detour Logic                             */
/* -------------------------------------------------------------------------- */

function pickNearestSafeShelter() {
  if (!state.shelters.length) return null;
  const { spherical, poly } = state.geometryLib;
  const { LatLng } = google.maps;
  const originLatLng = new LatLng(state.selectedPoint.lat, state.selectedPoint.lng);

  // Prefer operational shelters outside flood polygons, sorted by distance
  const scored = state.shelters.map((s) => {
    const destLatLng = new LatLng(s.lat, s.lng);
    const dist = spherical.computeDistanceBetween(originLatLng, destLatLng);
    const insideFlood = state.zonePolygons.some((zp) => poly.containsLocation(destLatLng, zp.polygon));
    return { shelter: s, score: dist + (insideFlood ? 15000 : 0) };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.shelter || state.shelters[0];
}

async function handleFindSafeShelter() {
  const btn = dom["find-shelter-btn"];
  btn.disabled = true;
  try {
    if (!state.shelters.length) {
      const q = dom["shelter-search-input"]?.value.trim() || "hospital and community center in Miami, FL";
      await searchShelters(q, false);
    }
    const target = pickNearestSafeShelter();
    if (target) {
      await computeEvacuationRoute(target);
    }
  } finally {
    btn.disabled = false;
  }
}

async function computeEvacuationRoute(shelter) {
  state.activeShelterId = shelter.id;
  renderShelterList();

  dom["route-shelter-name"].textContent = shelter.name;
  dom["route-eta"].textContent = "Calculating…";
  dom["route-distance"].textContent = "—";
  setRouteStatusPill("neutral", "Computing flood-zone-aware evacuation route…");

  const avoidFlood = Boolean(dom["avoid-flood-toggle"]?.checked);
  const origin = { lat: state.selectedPoint.lat, lng: state.selectedPoint.lng };
  const destination = { lat: shelter.lat, lng: shelter.lng };

  const directResp = await callComputeRoutes(origin, destination, []);
  if (!directResp.ok || !directResp.routes?.length) {
    setRouteStatusPill("warning", directResp.error || "Unable to compute route.");
    dom["route-eta"].textContent = "—";
    return;
  }

  let chosenRoute = directResp.routes[0];
  let decodedPath = decodeRoutePath(chosenRoute);
  let intersectedZones = findIntersectedZones(decodedPath);
  let detourApplied = false;

  if (avoidFlood && intersectedZones.length > 0) {
    const candidates = gatherBypassCandidates(intersectedZones, origin, destination);
    let bestDetour = null;

    for (const waypoints of candidates) {
      const detourResp = await callComputeRoutes(origin, destination, waypoints);
      if (!detourResp.ok || !detourResp.routes?.length) continue;

      const candidateRoute = detourResp.routes[0];
      const candidatePath = decodeRoutePath(candidateRoute);
      const remainingHits = findIntersectedZones(candidatePath);

      if (remainingHits.length === 0) {
        bestDetour = { route: candidateRoute, path: candidatePath, hits: [] };
        break;
      }

      if (!bestDetour || remainingHits.length < bestDetour.hits.length) {
        bestDetour = { route: candidateRoute, path: candidatePath, hits: remainingHits };
      }
    }

    if (bestDetour && bestDetour.hits.length < intersectedZones.length) {
      chosenRoute = bestDetour.route;
      decodedPath = bestDetour.path;
      intersectedZones = bestDetour.hits;
      detourApplied = true;
    }
  }

  drawEvacuationPolyline(decodedPath);
  renderRouteSummary(chosenRoute, shelter, avoidFlood, detourApplied, intersectedZones);
}

async function callComputeRoutes(origin, destination, intermediates) {
  try {
    const res = await fetch("/api/routes/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin,
        destination,
        intermediates: intermediates.map((wp) => ({ lat: wp.lat, lng: wp.lng, via: true })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    return await res.json();
  } catch {
    return { ok: false, routes: [], error: "Network error calling /api/routes/compute." };
  }
}

function decodeRoutePath(route) {
  const encoded = route?.polyline?.encodedPolyline;
  if (!encoded || !state.geometryLib?.encoding) return [];
  return state.geometryLib.encoding.decodePath(encoded);
}

function findIntersectedZones(path) {
  if (!path.length || !state.geometryLib?.poly) return [];
  const { poly, spherical } = state.geometryLib;
  const samplePoints = [];

  for (let i = 0; i < path.length; i++) {
    samplePoints.push(path[i]);
    if (i < path.length - 1) {
      const mid = spherical.interpolate(path[i], path[i + 1], 0.5);
      samplePoints.push(mid);
    }
  }

  const hitZones = [];
  for (const entry of state.zonePolygons) {
    const hits = samplePoints.some((pt) => poly.containsLocation(pt, entry.polygon));
    if (hits) {
      hitZones.push(entry.zone);
    }
  }
  return hitZones;
}

function gatherBypassCandidates(intersectedZones, origin, destination) {
  const { poly } = state.geometryLib;
  const { LatLng } = google.maps;
  const safePool = [];

  for (const zone of intersectedZones) {
    for (const wp of zone.bypassWaypoints || []) {
      const pt = new LatLng(wp.lat, wp.lng);
      const insideAny = state.zonePolygons.some((zp) => poly.containsLocation(pt, zp.polygon));
      if (!insideAny) {
        safePool.push(wp);
      }
    }
  }

  // Also include a west-inland Miami corridor waypoint (along I-95 / NW 7th Ave) as universal dry corridor
  safePool.push({ lat: 25.7745, lng: -80.2065 });
  safePool.push({ lat: 25.7920, lng: -80.2030 });

  // Score single-waypoint candidates by proximity to midpoint between origin and destination
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const unique = [];
  const seen = new Set();
  for (const wp of safePool) {
    const key = `${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      const d2 = (wp.lat - midLat) ** 2 + (wp.lng - midLng) ** 2;
      unique.push({ wp, d2 });
    }
  }
  unique.sort((a, b) => a.d2 - b.d2);

  const candidates = unique.slice(0, 4).map((item) => [item.wp]);
  if (unique.length >= 2) {
    candidates.push([unique[0].wp, unique[1].wp]);
  }
  return candidates;
}

function drawEvacuationPolyline(path) {
  if (state.routePolyline) state.routePolyline.setMap(null);
  if (state.routeUnderlayPolyline) state.routeUnderlayPolyline.setMap(null);
  if (!path.length) return;

  const { Polyline } = state.mapsLib;
  const { LatLngBounds } = google.maps;

  state.routeUnderlayPolyline = new Polyline({
    path,
    strokeColor: "#ffffff",
    strokeOpacity: 0.95,
    strokeWeight: 9,
    geodesic: true,
    zIndex: 18,
    map: state.map,
  });

  state.routePolyline = new Polyline({
    path,
    strokeColor: "#0284c7",
    strokeOpacity: 0.95,
    strokeWeight: 5,
    geodesic: true,
    zIndex: 19,
    map: state.map,
  });

  const bounds = new LatLngBounds();
  for (const pt of path) {
    bounds.extend(pt);
  }
  state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 72, left: 48 });
}

function renderRouteSummary(route, shelter, avoidFlood, detourApplied, remainingHits) {
  dom["route-shelter-name"].textContent = shelter.name;

  const seconds = parseInt(String(route.duration || "0").replace("s", ""), 10) || 0;
  const mins = Math.max(1, Math.round(seconds / 60));
  const km = ((route.distanceMeters || 0) / 1000).toFixed(1);

  dom["route-eta"].textContent = `${mins} min`;
  dom["route-distance"].textContent = `${km} km`;

  if (!avoidFlood) {
    if (remainingHits.length > 0) {
      setRouteStatusPill(
        "warning",
        `Direct Route crosses ${remainingHits.length} flood zone(s) — enable Avoid Flood Zones for detour.`
      );
    } else {
      setRouteStatusPill("verified", "Clear Path — Direct route avoids active flood zones.");
    }
  } else if (remainingHits.length === 0 && detourApplied) {
    setRouteStatusPill("verified", "Flood-Zone Bypass Verified (Safe Perimeter Detour Applied)");
  } else if (remainingHits.length === 0) {
    setRouteStatusPill("verified", "Clear Path Verified (Zero Flood-Polygon Intersection)");
  } else {
    setRouteStatusPill(
      "warning",
      `Partial Bypass — Destination or approach borders ${remainingHits[0].name}`
    );
  }

  const stepsList = dom["route-steps-list"];
  stepsList.replaceChildren();
  const steps = (route.legs || []).flatMap((leg) => leg.steps || []).slice(0, 6);
  for (const step of steps) {
    const instr = step.navigationInstruction?.instructions;
    if (!instr) continue;
    const li = document.createElement("li");
    const distM = step.distanceMeters != null ? ` (${step.distanceMeters} m)` : "";
    li.textContent = `${instr}${distM}`;
    stepsList.appendChild(li);
  }
}

function setRouteStatusPill(variant, text) {
  const el = dom["route-status-badge"];
  el.className = `status-pill ${variant}`;
  el.textContent = text;
}
