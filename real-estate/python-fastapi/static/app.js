// Bayview Parcel Explorer — San Francisco Real Estate, Parcel & Commute Explorer
// Strictly uses modern Google Maps Platform APIs (Maps JS importLibrary, AdvancedMarkerElement,
// PlaceAutocompleteElement, Places API New, Routes API v2, StreetViewPanorama, Geometry, Terra Draw).

const ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0";
const MAP_ID = "DEMO_MAP_ID";

const AMENITY_GROUPS = {
  schools: {
    label: "School",
    includedTypes: ["school", "primary_school", "secondary_school"],
  },
  groceries: {
    label: "Grocery",
    includedTypes: ["supermarket", "grocery_store"],
  },
  transit: {
    label: "Transit",
    includedTypes: ["transit_station", "subway_station", "train_station", "light_rail_station"],
  },
};

const WORKPLACE_PRESETS = [
  "Salesforce Tower, San Francisco, CA",
  "Ferry Building, San Francisco, CA",
  "UCSF Mission Bay, San Francisco, CA",
];

const state = {
  config: null,
  properties: [],
  filteredProperties: [],
  selectedId: null,
  hoveredId: null,
  activeAmenityTab: "all",
  amenitiesByProperty: new Map(),
  map: null,
  mapsLib: null,
  markerLib: null,
  placesLib: null,
  streetViewLib: null,
  geometryLib: null,
  geocodingLib: null,
  markersById: new Map(),
  clusterer: null,
  parcelPolygon: null,
  commutePolyline: null,
  workplaceMarker: null,
  amenityInfoWindow: null,
  streetViewPanorama: null,
  streetViewService: null,
  terraDraw: null,
  isDrawing: false,
  searchPolygon: null,
  mapType: "roadmap",
  mapsReady: false,
};

// ---------------------------------------------------------------------------
// Safe DOM helpers (zero innerHTML / outerHTML / insertAdjacentHTML)
// ---------------------------------------------------------------------------
function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.id) node.id = options.id;
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.type) node.type = options.type;
  if (options.value !== undefined) node.value = String(options.value);
  if (options.placeholder) node.placeholder = options.placeholder;
  if (options.disabled !== undefined) node.disabled = Boolean(options.disabled);
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      node.setAttribute(k, String(v));
    }
  }
  if (options.dataset) {
    for (const [k, v] of Object.entries(options.dataset)) {
      node.dataset[k] = String(v);
    }
  }
  if (options.on) {
    for (const [evt, fn] of Object.entries(options.on)) {
      node.addEventListener(evt, fn);
    }
  }
  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    if (child === null || child === undefined) continue;
    if (typeof child === "string" || typeof child === "number") {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

function buildPropertyIcon(propertyType) {
  const paths =
    propertyType === "Condo"
      ? [
          svgEl("rect", { x: "5", y: "4", width: "14", height: "16", rx: "1.5" }),
          svgEl("path", { d: "M9 8h2M13 8h2M9 12h2M13 12h2M10 20v-4h4v4" }),
        ]
      : [
          svgEl("path", { d: "M3 10.5L12 3l9 7.5" }),
          svgEl("path", { d: "M5 9.5V20h14V9.5" }),
          svgEl("path", { d: "M10 20v-5h4v5" }),
        ];

  return svgEl(
    "svg",
    {
      width: "26",
      height: "26",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.9",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    paths
  );
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------
function formatFullPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPillPrice(price) {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/0$/, "");
    return `$${formatted}M`;
  }
  return `$${Math.round(price / 1000)}K`;
}

function formatDurationSeconds(durationStr) {
  if (!durationStr) return "Unavailable";
  const seconds = parseInt(String(durationStr).replace("s", ""), 10);
  if (Number.isNaN(seconds)) return "Unavailable";
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistanceMeters(meters) {
  if (typeof meters !== "number" || Number.isNaN(meters)) return "";
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function propertyTypeClass(propertyType) {
  return `type-${propertyType.toLowerCase().replace(/\s+/g, "-")}`;
}

// ---------------------------------------------------------------------------
// Google Maps JavaScript API Dynamic Library Import Bootstrap
// ---------------------------------------------------------------------------
function loadGoogleMapsBootstrap(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }
    const g = {
      key: apiKey,
      v: "weekly",
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    };
    let h;
    let a;
    let k;
    const p = "The Google Maps JavaScript API";
    const c = "google";
    const l = "importLibrary";
    const q = "__ib__";
    const m = document;
    let b = window;
    b = b[c] || (b[c] = {});
    const d = b.maps || (b.maps = {});
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

    if (d[l]) {
      resolve();
      return;
    }
    d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
    u().then(resolve).catch(reject);
  });
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------
async function apiGet(path) {
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`Request failed (${resp.status}) for ${path}`);
  }
  return resp.json();
}

async function apiPost(path, payload) {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || `Request failed (${resp.status})`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Banner & Status Helpers
// ---------------------------------------------------------------------------
function showApiKeyBanner(message) {
  const banner = document.getElementById("api-key-banner");
  if (!banner) return;
  const link = el(
    "a",
    {
      text: "Get a free Maps Demo Key",
      attrs: {
        href: "https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    },
    []
  );
  banner.replaceChildren(
    el("strong", { text: "API Key Required for Live Maps: " }),
    document.createTextNode(`${message} `),
    link
  );
  banner.classList.remove("hidden");
}

function setMapStatusPill(message) {
  const pill = document.getElementById("map-status-pill");
  if (!pill) return;
  if (!message) {
    pill.classList.add("hidden");
    pill.textContent = "";
    return;
  }
  pill.textContent = message;
  pill.classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Filtering & Rendering Property List
// ---------------------------------------------------------------------------
function applyFilters() {
  const maxPrice = Number(document.getElementById("filter-max-price")?.value || 0);
  const minBeds = Number(document.getElementById("filter-min-beds")?.value || 0);
  const propType = document.getElementById("filter-property-type")?.value || "all";

  state.filteredProperties = state.properties.filter((prop) => {
    if (maxPrice > 0 && prop.price > maxPrice) return false;
    if (minBeds > 0 && prop.beds < minBeds) return false;
    if (propType !== "all" && prop.propertyType !== propType) return false;

    if (state.searchPolygon && state.geometryLib?.poly) {
      const pt = new window.google.maps.LatLng(prop.lat, prop.lng);
      if (!state.geometryLib.poly.containsLocation(pt, state.searchPolygon)) {
        return false;
      }
    }
    return true;
  });

  renderPropertyList();
  syncMapMarkers();

  if (
    state.selectedId &&
    !state.filteredProperties.some((p) => p.id === state.selectedId)
  ) {
    if (state.filteredProperties.length > 0) {
      selectProperty(state.filteredProperties[0].id, { skipZoom: true });
    } else {
      clearSelectedProperty();
    }
  }
}

function renderPropertyList() {
  const listEl = document.getElementById("property-list");
  const countEl = document.getElementById("results-count");
  if (!listEl || !countEl) return;

  const total = state.filteredProperties.length;
  countEl.textContent = `${total} ${total === 1 ? "home" : "homes"}`;

  if (total === 0) {
    listEl.replaceChildren(
      el("div", {
        className: "detail-empty-state",
        text: "No properties match the current filters or drawn search area.",
      })
    );
    return;
  }

  const cards = state.filteredProperties.map((prop) => {
    const isSelected = prop.id === state.selectedId;
    const isHovered = prop.id === state.hoveredId;
    const cardClasses = [
      "property-card",
      isSelected ? "is-selected" : "",
      isHovered ? "is-hovered" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const thumb = el(
      "div",
      { className: `card-thumb ${propertyTypeClass(prop.propertyType)}` },
      [
        buildPropertyIcon(prop.propertyType),
        el("span", { className: "card-thumb-label", text: prop.propertyType }),
      ]
    );

    const body = el("div", { className: "card-body" }, [
      el("div", { className: "card-price-row" }, [
        el("span", { className: "card-price", text: formatFullPrice(prop.price) }),
        el("span", { className: "card-neighborhood", text: prop.neighborhood }),
      ]),
      el("div", {
        className: "card-specs",
        text: `${prop.beds} bd · ${prop.baths} ba · ${prop.sqft.toLocaleString()} sqft`,
      }),
      el("div", { className: "card-address", text: prop.address }),
      el("div", {
        className: "card-parcel-meta",
        text: `${prop.apn} · Lot ${prop.lotSqft.toLocaleString()} sqft · ${prop.zoning}`,
      }),
    ]);

    return el(
      "button",
      {
        type: "button",
        className: cardClasses,
        dataset: { propertyId: prop.id, testid: "property-card" },
        on: {
          click: () => selectProperty(prop.id),
          mouseenter: () => setHoveredProperty(prop.id),
          mouseleave: () => setHoveredProperty(null),
        },
      },
      [thumb, body]
    );
  });

  listEl.replaceChildren(...cards);
}

// ---------------------------------------------------------------------------
// Bidirectional Hover Highlighting & Marker Synchronization
// ---------------------------------------------------------------------------
function setHoveredProperty(propertyId) {
  state.hoveredId = propertyId;

  document.querySelectorAll(".property-card").forEach((card) => {
    card.classList.toggle("is-hovered", card.dataset.propertyId === propertyId);
  });

  for (const [id, entry] of state.markersById.entries()) {
    const isHovered = id === propertyId;
    const isSelected = id === state.selectedId;
    entry.pill.classList.toggle("is-hovered", isHovered);
    entry.marker.zIndex = isSelected ? 1000 : isHovered ? 900 : 10;
  }
}

function createClusterRenderer() {
  const { AdvancedMarkerElement } = state.markerLib;
  return {
    render({ count, position }) {
      const badge = el("div", {
        className: "price-pill-marker",
        text: `${count} homes`,
        attrs: {
          style:
            "background:#0f172a;color:#ffffff;border-color:#ffffff;padding:5px 11px;",
        },
      });
      const marker = new AdvancedMarkerElement({
        position,
        zIndex: 500 + count,
      });
      marker.append(badge);
      return marker;
    },
  };
}

function buildMarkersIfNeeded() {
  if (!state.mapsReady || state.markersById.size > 0) return;
  const { AdvancedMarkerElement } = state.markerLib;

  for (const prop of state.properties) {
    const pill = el("button", {
      type: "button",
      className: "price-pill-marker",
      text: formatPillPrice(prop.price),
      dataset: { propertyId: prop.id },
      attrs: { "aria-label": `${prop.title} ${formatFullPrice(prop.price)}` },
    });

    pill.addEventListener("mouseenter", () => setHoveredProperty(prop.id));
    pill.addEventListener("mouseleave", () => setHoveredProperty(null));
    pill.addEventListener("click", (evt) => {
      evt.stopPropagation();
      selectProperty(prop.id);
    });

    const marker = new AdvancedMarkerElement({
      position: { lat: prop.lat, lng: prop.lng },
      title: `${prop.address} (${formatFullPrice(prop.price)})`,
      zIndex: prop.id === state.selectedId ? 1000 : 10,
    });
    marker.append(pill);

    state.markersById.set(prop.id, { marker, pill, prop });
  }

  if (window.markerClusterer?.MarkerClusterer) {
    state.clusterer = new window.markerClusterer.MarkerClusterer({
      map: state.map,
      markers: [],
      renderer: createClusterRenderer(),
    });
  }
}

function syncMapMarkers() {
  if (!state.mapsReady) return;
  buildMarkersIfNeeded();

  const visibleIds = new Set(state.filteredProperties.map((p) => p.id));
  const activeMarkers = [];

  for (const [id, entry] of state.markersById.entries()) {
    const isSelected = id === state.selectedId;
    entry.pill.classList.toggle("is-selected", isSelected);
    entry.pill.classList.toggle("is-hovered", id === state.hoveredId);
    entry.marker.zIndex = isSelected ? 1000 : id === state.hoveredId ? 900 : 10;

    if (visibleIds.has(id)) {
      activeMarkers.push(entry.marker);
      if (!state.clusterer) {
        entry.marker.map = state.map;
      }
    } else {
      entry.marker.map = null;
    }
  }

  if (state.clusterer) {
    state.clusterer.clearMarkers();
    if (activeMarkers.length > 0) {
      state.clusterer.addMarkers(activeMarkers);
    }
  }
}

// ---------------------------------------------------------------------------
// Cadastral Parcel Polygon & Property Selection
// ---------------------------------------------------------------------------
function clearSelectedProperty() {
  state.selectedId = null;
  if (state.parcelPolygon) {
    state.parcelPolygon.setMap(null);
    state.parcelPolygon = null;
  }
  const panel = document.getElementById("listing-detail-panel");
  if (panel) {
    panel.replaceChildren(
      el("div", {
        className: "detail-empty-state",
        text: "No listing selected. Adjust your filters or click a property to inspect.",
      })
    );
  }
}

function renderParcelPolygon(prop) {
  if (!state.mapsReady || !state.mapsLib) return;
  if (state.parcelPolygon) {
    state.parcelPolygon.setMap(null);
    state.parcelPolygon = null;
  }
  state.parcelPolygon = new state.mapsLib.Polygon({
    paths: prop.parcelPolygon,
    strokeColor: "#1d4ed8",
    strokeOpacity: 0.95,
    strokeWeight: 2.5,
    fillColor: "#2563eb",
    fillOpacity: 0.24,
    map: state.map,
  });
}

function selectProperty(propertyId, options = {}) {
  const prop = state.properties.find((p) => p.id === propertyId);
  if (!prop) return;

  state.selectedId = propertyId;

  document.querySelectorAll(".property-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.propertyId === propertyId);
  });
  for (const [id, entry] of state.markersById.entries()) {
    entry.pill.classList.toggle("is-selected", id === propertyId);
    entry.marker.zIndex = id === propertyId ? 1000 : 10;
  }

  if (state.mapsReady && state.map) {
    renderParcelPolygon(prop);
    if (!options.skipZoom) {
      state.map.panTo({ lat: prop.lat, lng: prop.lng });
      if ((state.map.getZoom() || 13) < 16) {
        state.map.setZoom(16);
      }
    }
  }

  renderDetailPanel(prop);
}

// ---------------------------------------------------------------------------
// Detail Drawer: Parcel Metadata, Street View, 5km Amenities & Commute
// ---------------------------------------------------------------------------
function renderDetailPanel(prop) {
  const panel = document.getElementById("listing-detail-panel");
  if (!panel) return;

  const existingWorkplace =
    document.getElementById("workplace-input")?.value || WORKPLACE_PRESETS[0];

  const headerSection = el("div", { className: "detail-header" }, [
    el("div", { className: "detail-top-row" }, [
      el("p", { className: "detail-price", text: formatFullPrice(prop.price) }),
      el("span", { className: "detail-type-pill", text: prop.propertyType }),
    ]),
    el("h2", { className: "detail-title", text: prop.title }),
    el("p", {
      className: "detail-address",
      text: `${prop.address} · ${prop.beds} bd · ${prop.baths} ba · ${prop.sqft.toLocaleString()} sqft`,
    }),
    el("div", { className: "parcel-grid" }, [
      el("div", { className: "parcel-stat" }, [
        el("span", { className: "parcel-stat-label", text: "Parcel APN" }),
        el("span", { className: "parcel-stat-value", text: prop.apn }),
      ]),
      el("div", { className: "parcel-stat" }, [
        el("span", { className: "parcel-stat-label", text: "Lot Area" }),
        el("span", {
          className: "parcel-stat-value",
          text: `${prop.lotSqft.toLocaleString()} sqft`,
        }),
      ]),
      el("div", { className: "parcel-stat" }, [
        el("span", { className: "parcel-stat-label", text: "Zoning / Built" }),
        el("span", {
          className: "parcel-stat-value",
          text: `${prop.zoning} · ${prop.yearBuilt}`,
        }),
      ]),
    ]),
  ]);

  // Street View Neighborhood Preview
  const streetViewEl = el("div", {
    id: "street-view-container",
    className: "street-view-container",
    text: state.mapsReady
      ? "Loading Street View panorama..."
      : "Configure GOOGLE_MAPS_API_KEY in .env to view Street View.",
  });

  const streetViewSection = el("div", { className: "detail-section" }, [
    el("h3", {}, [
      document.createTextNode("Street View Neighborhood Preview"),
      el("span", { className: "detail-section-caption", text: "360° Panorama" }),
    ]),
    streetViewEl,
  ]);

  // Nearby Amenities (5km via Places API New)
  const tabs = [
    { id: "amenity-tab-all", key: "all", label: "All" },
    { id: "amenity-tab-schools", key: "schools", label: "Schools" },
    { id: "amenity-tab-groceries", key: "groceries", label: "Groceries" },
    { id: "amenity-tab-transit", key: "transit", label: "Transit" },
  ].map((tab) =>
    el("button", {
      id: tab.id,
      type: "button",
      className: `amenity-tab-btn${state.activeAmenityTab === tab.key ? " is-active" : ""}`,
      text: tab.label,
      on: {
        click: () => {
          state.activeAmenityTab = tab.key;
          document.querySelectorAll(".amenity-tab-btn").forEach((b) => {
            b.classList.toggle("is-active", b.id === tab.id);
          });
          renderAmenitiesList(prop);
        },
      },
    })
  );

  const amenitiesPanel = el(
    "div",
    { id: "nearby-amenities-panel", className: "detail-section" },
    [
      el("h3", {}, [
        document.createTextNode("Nearby Amenities"),
        el("span", { className: "detail-section-caption", text: "Within 5 km · Places API (New)" }),
      ]),
      el("div", { className: "amenity-tabs", attrs: { role: "tablist" } }, tabs),
      el("div", {
        id: "nearby-amenities-list",
        className: "nearby-amenities-list",
      }),
    ]
  );

  // Commute Time Calculator
  const workplaceInput = el("input", {
    id: "workplace-input",
    type: "text",
    className: "commute-input",
    value: existingWorkplace,
    placeholder: "Enter workplace address or landmark...",
    attrs: { "aria-label": "Workplace address" },
    on: {
      keydown: (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          calculateCommute(prop);
        }
      },
    },
  });

  const calcBtn = el("button", {
    id: "calculate-commute-btn",
    type: "button",
    className: "commute-btn",
    text: "Calculate",
    on: { click: () => calculateCommute(prop) },
  });

  const presetButtons = WORKPLACE_PRESETS.map((preset) =>
    el("button", {
      type: "button",
      className: "preset-chip",
      text: preset.split(",")[0],
      on: {
        click: () => {
          workplaceInput.value = preset;
          calculateCommute(prop);
        },
      },
    })
  );

  const commutePanel = el(
    "div",
    { id: "commute-calculator-panel", className: "detail-section" },
    [
      el("h3", {}, [
        document.createTextNode("Workplace Commute Calculator"),
        el("span", { className: "detail-section-caption", text: "Routes API Matrix" }),
      ]),
      el("div", { className: "commute-form" }, [workplaceInput, calcBtn]),
      el("div", { className: "workplace-presets" }, presetButtons),
      el("div", { className: "commute-results-grid" }, [
        el("div", { className: "commute-card" }, [
          el("span", { className: "commute-mode-label", text: "Driving (Live Traffic)" }),
          el("span", {
            id: "commute-drive-eta",
            className: "commute-eta-value",
            text: "Ready to calculate",
          }),
        ]),
        el("div", { className: "commute-card" }, [
          el("span", { className: "commute-mode-label", text: "Public Transit" }),
          el("span", {
            id: "commute-transit-eta",
            className: "commute-eta-value",
            text: "Ready to calculate",
          }),
        ]),
      ]),
      el("div", {
        id: "commute-status-note",
        className: "commute-status-note",
        text: "Enter a San Francisco workplace to compute driving and transit times.",
      }),
    ]
  );

  panel.replaceChildren(
    headerSection,
    streetViewSection,
    amenitiesPanel,
    commutePanel
  );

  if (state.mapsReady) {
    loadStreetView(prop, streetViewEl);
  }
  loadNearbyAmenities(prop);
  if (state.config?.hasApiKey && workplaceInput.value.trim()) {
    calculateCommute(prop);
  }
}

// ---------------------------------------------------------------------------
// Street View Neighborhood Preview
// ---------------------------------------------------------------------------
function loadStreetView(prop, container) {
  if (!state.streetViewLib) return;
  const { StreetViewPanorama, StreetViewService, StreetViewStatus } = state.streetViewLib;
  if (!state.streetViewService) {
    state.streetViewService = new StreetViewService();
  }

  state.streetViewService.getPanorama(
    { location: { lat: prop.lat, lng: prop.lng }, radius: 120 },
    (data, status) => {
      if (state.selectedId !== prop.id) return;
      if (status === StreetViewStatus.OK && data?.location?.latLng) {
        container.textContent = "";
        state.streetViewPanorama = new StreetViewPanorama(container, {
          position: data.location.latLng,
          pov: { heading: prop.streetViewHeading || 0, pitch: 4 },
          zoom: 1,
          addressControl: false,
          linksControl: true,
          panControl: true,
          fullscreenControl: true,
          motionTracking: false,
        });
      } else {
        container.replaceChildren(
          el("div", {
            className: "status-muted",
            text: "Street View panorama unavailable for this exact coordinate.",
          })
        );
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Nearby Amenities (5km radius via Places API New BFF proxy)
// ---------------------------------------------------------------------------
async function loadNearbyAmenities(prop) {
  const listEl = document.getElementById("nearby-amenities-list");
  if (!listEl) return;

  if (!state.config?.hasApiKey) {
    listEl.replaceChildren(
      el("div", {
        className: "status-muted",
        text: "Nearby schools, groceries, and transit require GOOGLE_MAPS_API_KEY.",
      })
    );
    return;
  }

  if (state.amenitiesByProperty.has(prop.id)) {
    renderAmenitiesList(prop);
    return;
  }

  listEl.replaceChildren(
    el("div", {
      className: "status-muted",
      text: "Discovering schools, groceries, and transit within 5 km...",
    })
  );

  try {
    const entries = await Promise.all(
      Object.entries(AMENITY_GROUPS).map(async ([category, cfg]) => {
        const res = await apiPost("/api/places/nearby", {
          lat: prop.lat,
          lng: prop.lng,
          radius: 5000,
          includedTypes: cfg.includedTypes,
          maxResultCount: 5,
        });
        const places = Array.isArray(res.places) ? res.places : [];
        return places.map((place) => {
          const pLat = place.location?.latitude;
          const pLng = place.location?.longitude;
          const distMeters =
            typeof pLat === "number" && typeof pLng === "number"
              ? haversineMeters({ lat: prop.lat, lng: prop.lng }, { lat: pLat, lng: pLng })
              : null;
          return {
            id: place.id,
            name: place.displayName?.text || "Unnamed Place",
            address: place.formattedAddress || "",
            category,
            categoryLabel: cfg.label,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            lat: pLat,
            lng: pLng,
            distanceMeters: distMeters,
          };
        });
      })
    );

    const merged = entries.flat().sort((a, b) => {
      return (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999);
    });
    state.amenitiesByProperty.set(prop.id, merged);

    if (state.selectedId === prop.id) {
      renderAmenitiesList(prop);
    }
  } catch (err) {
    if (state.selectedId === prop.id) {
      listEl.replaceChildren(
        el("div", {
          className: "status-muted",
          text: `Could not load nearby amenities: ${err.message}`,
        })
      );
    }
  }
}

function renderAmenitiesList(prop) {
  const listEl = document.getElementById("nearby-amenities-list");
  if (!listEl) return;

  const allItems = state.amenitiesByProperty.get(prop.id) || [];
  const filtered =
    state.activeAmenityTab === "all"
      ? allItems.slice(0, 9)
      : allItems.filter((item) => item.category === state.activeAmenityTab);

  if (filtered.length === 0) {
    listEl.replaceChildren(
      el("div", {
        className: "status-muted",
        text: "No places found for this category within 5 km.",
      })
    );
    return;
  }

  const rows = filtered.map((item) => {
    const ratingText =
      typeof item.rating === "number"
        ? `★ ${item.rating.toFixed(1)}${item.userRatingCount ? ` (${item.userRatingCount})` : ""}`
        : "No rating";
    const metaText = item.address ? `${ratingText} · ${item.address}` : ratingText;

    return el(
      "div",
      {
        className: "amenity-item",
        on: {
          click: () => focusAmenityOnMap(item),
        },
      },
      [
        el("div", {}, [
          el("div", { className: "amenity-name", text: item.name }),
          el("div", { className: "amenity-meta", text: metaText }),
        ]),
        el("div", { className: "amenity-right" }, [
          el("span", {
            className: `amenity-badge ${item.category}`,
            text: item.categoryLabel,
          }),
          el("span", {
            className: "amenity-distance",
            text:
              item.distanceMeters !== null
                ? `${(item.distanceMeters / 1000).toFixed(2)} km`
                : "",
          }),
        ]),
      ]
    );
  });

  listEl.replaceChildren(...rows);
}

function focusAmenityOnMap(item) {
  if (!state.mapsReady || !state.map || typeof item.lat !== "number") return;
  const pos = { lat: item.lat, lng: item.lng };
  state.map.panTo(pos);

  if (!state.amenityInfoWindow) {
    state.amenityInfoWindow = new state.mapsLib.InfoWindow();
  }
  const infoContent = el("div", {}, [
    el("strong", { text: item.name }),
    el("div", {
      text: `${item.categoryLabel}${item.address ? ` · ${item.address}` : ""}`,
      attrs: { style: "font-size:12px;color:#475569;margin-top:2px;" },
    }),
  ]);
  state.amenityInfoWindow.setContent(infoContent);
  state.amenityInfoWindow.setPosition(pos);
  state.amenityInfoWindow.open(state.map);
}

// ---------------------------------------------------------------------------
// Workplace Commute Time Calculator (Routes API Route Matrix + Compute Routes)
// ---------------------------------------------------------------------------
async function resolveWorkplaceLocation(query) {
  const res = await apiPost("/api/places/search-text", {
    textQuery: query,
    maxResultCount: 1,
    regionCode: "US",
    biasCenter: { lat: 37.7749, lng: -122.4194 },
    biasRadiusMeters: 30000,
  });
  const first = Array.isArray(res.places) ? res.places[0] : null;
  if (first?.location) {
    return {
      lat: first.location.latitude,
      lng: first.location.longitude,
      label: first.displayName?.text || first.formattedAddress || query,
    };
  }
  if (state.geocodingLib) {
    const geocoder = new state.geocodingLib.Geocoder();
    const geoRes = await geocoder.geocode({ address: query });
    const loc = geoRes.results?.[0]?.geometry?.location;
    if (loc) {
      return {
        lat: loc.lat(),
        lng: loc.lng(),
        label: geoRes.results[0].formatted_address || query,
      };
    }
  }
  throw new Error("Could not find that workplace destination.");
}

async function calculateCommute(prop) {
  const inputEl = document.getElementById("workplace-input");
  const btnEl = document.getElementById("calculate-commute-btn");
  const driveEl = document.getElementById("commute-drive-eta");
  const transitEl = document.getElementById("commute-transit-eta");
  const noteEl = document.getElementById("commute-status-note");

  if (!inputEl || !driveEl || !transitEl || !noteEl) return;
  const query = inputEl.value.trim();
  if (!query) {
    noteEl.textContent = "Please enter a workplace address or landmark.";
    return;
  }

  if (!state.config?.hasApiKey) {
    driveEl.textContent = "API key needed";
    transitEl.textContent = "API key needed";
    noteEl.textContent = "Add GOOGLE_MAPS_API_KEY in .env to compute live commute ETAs.";
    return;
  }

  if (btnEl) btnEl.disabled = true;
  driveEl.textContent = "Calculating...";
  transitEl.textContent = "Calculating...";
  noteEl.textContent = `Computing live driving and transit times to "${query}"...`;

  try {
    const destination = await resolveWorkplaceLocation(query);
    const origin = { lat: prop.lat, lng: prop.lng };

    const [driveMatrix, transitMatrix, driveRoute] = await Promise.all([
      apiPost("/api/routes/matrix", {
        origins: [origin],
        destinations: [{ lat: destination.lat, lng: destination.lng }],
        travelMode: "DRIVE",
      }),
      apiPost("/api/routes/matrix", {
        origins: [origin],
        destinations: [{ lat: destination.lat, lng: destination.lng }],
        travelMode: "TRANSIT",
      }),
      apiPost("/api/routes/compute", {
        origin,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: "DRIVE",
      }).catch(() => null),
    ]);

    if (state.selectedId !== prop.id) return;

    const driveElem = Array.isArray(driveMatrix) ? driveMatrix[0] : null;
    const transitElem = Array.isArray(transitMatrix) ? transitMatrix[0] : null;

    if (driveElem?.condition === "ROUTE_EXISTS") {
      const dur =
        driveElem.localizedValues?.duration?.text ||
        formatDurationSeconds(driveElem.duration);
      const dist =
        driveElem.localizedValues?.distance?.text ||
        formatDistanceMeters(driveElem.distanceMeters);
      driveEl.textContent = dist ? `${dur} (${dist})` : dur;
    } else {
      driveEl.textContent = "No route found";
    }

    if (transitElem?.condition === "ROUTE_EXISTS") {
      const dur =
        transitElem.localizedValues?.duration?.text ||
        formatDurationSeconds(transitElem.duration);
      const dist =
        transitElem.localizedValues?.distance?.text ||
        formatDistanceMeters(transitElem.distanceMeters);
      transitEl.textContent = dist ? `${dur} (${dist})` : dur;
    } else {
      transitEl.textContent = "No transit route";
    }

    noteEl.textContent = `Origin: ${prop.address} → Destination: ${destination.label}`;

    renderCommuteOverlay(prop, destination, driveRoute);
  } catch (err) {
    driveEl.textContent = "Unavailable";
    transitEl.textContent = "Unavailable";
    noteEl.textContent = `Commute calculation error: ${err.message}`;
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

function renderCommuteOverlay(prop, destination, driveRoute) {
  if (!state.mapsReady || !state.map) return;

  if (state.commutePolyline) {
    state.commutePolyline.setMap(null);
    state.commutePolyline = null;
  }
  if (state.workplaceMarker) {
    state.workplaceMarker.map = null;
    state.workplaceMarker = null;
  }

  const badge = el("div", {
    className: "workplace-pin-badge",
    text: "Workplace",
  });
  state.workplaceMarker = new state.markerLib.AdvancedMarkerElement({
    map: state.map,
    position: { lat: destination.lat, lng: destination.lng },
    title: destination.label,
    zIndex: 950,
  });
  state.workplaceMarker.append(badge);

  const encoded = driveRoute?.routes?.[0]?.polyline?.encodedPolyline;
  if (encoded && state.geometryLib?.encoding) {
    const path = state.geometryLib.encoding.decodePath(encoded);
    state.commutePolyline = new state.mapsLib.Polyline({
      path,
      strokeColor: "#0f766e",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map: state.map,
    });
  }
}

// ---------------------------------------------------------------------------
// Terra Draw Polygon Search-Area Filtering
// ---------------------------------------------------------------------------
function initTerraDraw() {
  const tdPkg = window.terraDraw || window.TerraDraw;
  const adapterPkg =
    window.terraDrawGoogleMapsAdapter || window.TerraDrawGoogleMapsAdapter;
  if (!tdPkg || !adapterPkg || !state.map) return;

  const TerraDrawClass = tdPkg.TerraDraw;
  const TerraDrawPolygonMode = tdPkg.TerraDrawPolygonMode;
  const TerraDrawSelectMode = tdPkg.TerraDrawSelectMode;
  const TerraDrawGoogleMapsAdapter =
    adapterPkg.TerraDrawGoogleMapsAdapter || adapterPkg.default;

  if (!TerraDrawClass || !TerraDrawPolygonMode || !TerraDrawGoogleMapsAdapter) {
    return;
  }

  const setup = () => {
    if (state.terraDraw || !state.map.getProjection()) return;

    const draw = new TerraDrawClass({
      adapter: new TerraDrawGoogleMapsAdapter({
        map: state.map,
        lib: window.google.maps,
        coordinatePrecision: 9,
      }),
      modes: [
        new TerraDrawPolygonMode({
          styles: {
            fillColor: "#2563eb",
            fillOpacity: 0.14,
            outlineColor: "#1d4ed8",
            outlineWidth: 2.5,
          },
        }),
        ...(TerraDrawSelectMode ? [new TerraDrawSelectMode()] : []),
      ],
    });

    draw.start();
    state.terraDraw = draw;

    draw.on("finish", () => {
      syncTerraDrawFilter();
      state.isDrawing = false;
      draw.setMode("static");
      updateDrawControlsUI();
      setMapStatusPill("Search area applied. Click Clear Area to show all homes.");
    });

    draw.on("change", () => {
      syncTerraDrawFilter();
    });
  };

  if (state.map.getProjection()) {
    setup();
  } else {
    state.map.addListener("projection_changed", setup);
  }
}

function syncTerraDrawFilter() {
  if (!state.terraDraw || !state.mapsLib) return;
  const features = state.terraDraw.getSnapshot();
  const polyFeature = features.find(
    (f) => f.geometry?.type === "Polygon" && Array.isArray(f.geometry.coordinates?.[0])
  );

  if (polyFeature && polyFeature.geometry.coordinates[0].length >= 4) {
    const ring = polyFeature.geometry.coordinates[0].map(([lng, lat]) => ({
      lat,
      lng,
    }));
    state.searchPolygon = new state.mapsLib.Polygon({ paths: ring });
    document.getElementById("area-filter-badge")?.classList.remove("hidden");
    const clearBtn = document.getElementById("clear-area-btn");
    if (clearBtn) clearBtn.disabled = false;
  } else {
    state.searchPolygon = null;
    document.getElementById("area-filter-badge")?.classList.add("hidden");
    const clearBtn = document.getElementById("clear-area-btn");
    if (clearBtn) clearBtn.disabled = true;
  }
  applyFilters();
}

function updateDrawControlsUI() {
  const drawBtn = document.getElementById("draw-area-btn");
  if (!drawBtn) return;
  drawBtn.classList.toggle("is-active", state.isDrawing);
  drawBtn.setAttribute("aria-pressed", state.isDrawing ? "true" : "false");
  drawBtn.textContent = state.isDrawing ? "Drawing Polygon..." : "Draw Search Area";
}

function wireMapToolbar() {
  const drawBtn = document.getElementById("draw-area-btn");
  const clearBtn = document.getElementById("clear-area-btn");
  const mapTypeBtn = document.getElementById("map-type-toggle");

  drawBtn?.addEventListener("click", () => {
    if (!state.terraDraw) {
      setMapStatusPill("Drawing tools initialize once the map finishes loading.");
      return;
    }
    if (state.isDrawing) {
      state.isDrawing = false;
      state.terraDraw.setMode("static");
      setMapStatusPill("");
    } else {
      state.terraDraw.clear();
      state.searchPolygon = null;
      applyFilters();
      state.isDrawing = true;
      state.terraDraw.setMode("polygon");
      setMapStatusPill("Click points on the map to outline a search area; click the start point to finish.");
    }
    updateDrawControlsUI();
  });

  clearBtn?.addEventListener("click", () => {
    if (state.terraDraw) {
      state.terraDraw.clear();
      state.terraDraw.setMode("static");
    }
    state.isDrawing = false;
    state.searchPolygon = null;
    document.getElementById("area-filter-badge")?.classList.add("hidden");
    clearBtn.disabled = true;
    updateDrawControlsUI();
    setMapStatusPill("");
    applyFilters();
  });

  mapTypeBtn?.addEventListener("click", () => {
    if (!state.map) return;
    state.mapType = state.mapType === "roadmap" ? "satellite" : "roadmap";
    state.map.setMapTypeId(state.mapType);
    const isSat = state.mapType === "satellite";
    mapTypeBtn.classList.toggle("is-active", isSat);
    mapTypeBtn.setAttribute("aria-pressed", isSat ? "true" : "false");
    mapTypeBtn.textContent = isSat ? "Roadmap" : "Satellite";
  });
}

// ---------------------------------------------------------------------------
// PlaceAutocompleteElement Top Search Bar
// ---------------------------------------------------------------------------
function initPlaceAutocomplete() {
  const host = document.getElementById("location-search-host");
  if (!host || !state.placesLib?.PlaceAutocompleteElement) return;

  const autocomplete = new state.placesLib.PlaceAutocompleteElement({
    includedRegionCodes: ["us"],
    locationBias: {
      center: { lat: 37.7749, lng: -122.4194 },
      radius: 25000,
    },
  });
  autocomplete.id = "location-search-input";
  autocomplete.placeholder = "Search San Francisco neighborhood or address...";

  autocomplete.addEventListener("gmp-select", async (event) => {
    const prediction = event.placePrediction;
    if (!prediction || !state.map) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "viewport"],
      });
      if (place.viewport) {
        state.map.fitBounds(place.viewport);
      } else if (place.location) {
        state.map.panTo(place.location);
        state.map.setZoom(14);
      }
      setMapStatusPill(`Centered near ${place.displayName || place.formattedAddress}`);
    } catch (err) {
      setMapStatusPill(`Could not load selected location: ${err.message}`);
    }
  });

  autocomplete.addEventListener("gmp-error", () => {
    setMapStatusPill("Place autocomplete is temporarily unavailable.");
  });

  host.replaceChildren(autocomplete);
}

// ---------------------------------------------------------------------------
// Application Bootstrap
// ---------------------------------------------------------------------------
async function bootstrap() {
  wireMapToolbar();

  document
    .getElementById("filter-max-price")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filter-min-beds")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filter-property-type")
    ?.addEventListener("change", applyFilters);

  try {
    const [config, propsRes] = await Promise.all([
      apiGet("/api/config"),
      apiGet("/api/properties"),
    ]);
    state.config = config;
    state.properties = propsRes.properties || [];
    state.filteredProperties = [...state.properties];

    renderPropertyList();
    if (state.filteredProperties.length > 0) {
      selectProperty(state.filteredProperties[0].id, { skipZoom: true });
    }

    if (!config.hasApiKey) {
      const fallbackInput = document.getElementById("location-search-fallback");
      if (fallbackInput) fallbackInput.id = "location-search-input";
      showApiKeyBanner(
        "Set GOOGLE_MAPS_API_KEY in .env to enable the interactive Vector Map, Places API (New), Street View, and Routes API."
      );
      return;
    }

    await loadGoogleMapsBootstrap(config.googleMapsApiKey);

    const [mapsLib, markerLib, placesLib, streetViewLib, geometryLib, geocodingLib] =
      await Promise.all([
        window.google.maps.importLibrary("maps"),
        window.google.maps.importLibrary("marker"),
        window.google.maps.importLibrary("places"),
        window.google.maps.importLibrary("streetView"),
        window.google.maps.importLibrary("geometry"),
        window.google.maps.importLibrary("geocoding"),
      ]);

    state.mapsLib = mapsLib;
    state.markerLib = markerLib;
    state.placesLib = placesLib;
    state.streetViewLib = streetViewLib;
    state.geometryLib = geometryLib;
    state.geocodingLib = geocodingLib;

    const mapContainer = document.getElementById("map-container");
    state.map = new mapsLib.Map(mapContainer, {
      center: config.initialCenter || { lat: 37.7749, lng: -122.4194 },
      zoom: config.initialZoom || 13,
      mapId: config.mapId || MAP_ID,
      mapTypeId: "roadmap",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: true,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    state.mapsReady = true;

    initPlaceAutocomplete();
    initTerraDraw();
    syncMapMarkers();

    if (state.selectedId) {
      const current = state.properties.find((p) => p.id === state.selectedId);
      if (current) {
        renderParcelPolygon(current);
        const svEl = document.getElementById("street-view-container");
        if (svEl) loadStreetView(current, svEl);
      }
    }
  } catch (err) {
    showApiKeyBanner(`Initialization notice: ${err.message}`);
  }
}

bootstrap();
