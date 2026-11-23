/**
 * London Local — Hyperlocal Neighborhood Directory & Spot Mapper
 * Uses Maps JavaScript API (dynamic importLibrary), AdvancedMarkerElement,
 * PinElement, PlaceAutocompleteElement (gmp-select), and FastAPI BFF endpoints.
 */

const NEIGHBORHOOD_PRESETS = {
  covent_garden: { name: "Covent Garden", lat: 51.5118, lng: -0.1280 },
  soho: { name: "Soho", lat: 51.5137, lng: -0.1337 },
  south_bank: { name: "South Bank", lat: 51.5055, lng: -0.1140 },
  bloomsbury: { name: "Bloomsbury", lat: 51.5229, lng: -0.1280 },
  marylebone: { name: "Marylebone", lat: 51.5225, lng: -0.1546 },
  shoreditch: { name: "Shoreditch", lat: 51.5246, lng: -0.0780 },
};

const CATEGORY_META = {
  restaurant: {
    label: "Restaurant",
    bg: "#e11d48",
    border: "#9f1239",
    glyph: "#ffffff",
    glyphText: "R",
  },
  cafe: {
    label: "Café",
    bg: "#d97706",
    border: "#92400e",
    glyph: "#ffffff",
    glyphText: "C",
  },
  museum: {
    label: "Museum",
    bg: "#2563eb",
    border: "#1e40af",
    glyph: "#ffffff",
    glyphText: "M",
  },
  park: {
    label: "Park",
    bg: "#059669",
    border: "#065f46",
    glyph: "#ffffff",
    glyphText: "P",
  },
  community: {
    label: "Community Spot",
    bg: "#7c3aed",
    border: "#4c1d95",
    glyph: "#ffffff",
    glyphText: "★",
  },
};

const COMMUNITY_STORAGE_KEY = "london_local_community_spots_v1";

const state = {
  config: null,
  map: null,
  mapsLib: null,
  markerLib: null,
  placesLib: null,
  coreLib: null,
  infoWindow: null,
  radiusCircle: null,
  showRadiusCircle: true,
  activeCenter: { lat: 51.5118, lng: -0.1280 },
  activeAreaName: "Covent Garden",
  radiusMeters: 5000,
  activeCategory: "all",
  loadedCategoriesMode: "all",
  activeSearchQuery: "",
  places: [],
  detailsCache: new Map(),
  selectedPlaceId: null,
  comparedPlaces: [],
  isComparisonOpen: false,
  markers: [],
  communityMarkers: [],
  tempClickMarker: null,
  lastReverseGeocode: null,
  communitySpots: loadCommunitySpots(),
  autocompleteEl: null,
};

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (key === "className") {
      node.className = value;
    } else if (key === "dataset" && typeof value === "object") {
      for (const [dk, dv] of Object.entries(value)) {
        node.dataset[dk] = String(dv);
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node && key !== "list" && key !== "type") {
      node[key] = value;
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(
      child instanceof Node ? child : document.createTextNode(String(child))
    );
  }
  return node;
}

function loadCommunitySpots() {
  try {
    const raw = sessionStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCommunitySpotsToSession() {
  try {
    sessionStorage.setItem(
      COMMUNITY_STORAGE_KEY,
      JSON.stringify(state.communitySpots)
    );
  } catch {
    // Ignore storage quota errors in restricted modes
  }
}

function inferCategory(place) {
  const candidates = [
    place.primaryType,
    ...(Array.isArray(place.types) ? place.types : []),
  ]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  if (candidates.some((t) => t === "cafe" || t === "coffee_shop")) return "cafe";
  if (candidates.some((t) => t === "museum" || t === "art_gallery")) return "museum";
  if (candidates.some((t) => t === "park" || t === "garden" || t === "botanical_garden")) {
    return "park";
  }
  if (
    candidates.some(
      (t) =>
        t === "restaurant" ||
        t.endsWith("_restaurant") ||
        t === "bakery" ||
        t === "bar"
    )
  ) {
    return "restaurant";
  }
  return "restaurant";
}

function formatPriceLevel(priceLevel) {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "Free";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "£";
    case "PRICE_LEVEL_MODERATE":
      return "££";
    case "PRICE_LEVEL_EXPENSIVE":
      return "£££";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "££££";
    default:
      return "—";
  }
}

function getTodayDescription(place) {
  const descriptions = place?.regularOpeningHours?.weekdayDescriptions;
  if (!Array.isArray(descriptions) || descriptions.length === 0) return "";
  // Google weekdayDescriptions is Monday-indexed (0=Mon ... 6=Sun)
  const todayIdx = (new Date().getDay() + 6) % 7;
  return descriptions[todayIdx] || descriptions[0] || "";
}

function getPlaceName(place) {
  if (!place) return "Unnamed Place";
  if (typeof place.displayName === "string") return place.displayName;
  if (place.displayName && typeof place.displayName.text === "string") {
    return place.displayName.text;
  }
  return "Unnamed Place";
}

function getPlaceCoords(place) {
  const loc = place?.location;
  if (!loc) return null;
  const lat = typeof loc.latitude === "number" ? loc.latitude : loc.lat;
  const lng = typeof loc.longitude === "number" ? loc.longitude : loc.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

function injectMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return;
  }
  // Official Google Maps JavaScript API Dynamic Library Import bootstrap
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
          for (k in g)
            e.set(
              k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
              g[k]
            );
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
    region: "GB",
  });
}

async function apiJson(url, options = {}) {
  const resp = await fetch(url, options);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || `Request failed (${resp.status})`);
  }
  return data;
}

function setStatus(message) {
  const statusEl = document.getElementById("directory-status");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function renderUnconfiguredNotice() {
  const mapCanvas = document.getElementById("map-canvas");
  const card = el(
    "div",
    { className: "map-setup-card" },
    el("h2", {}, "Configure Google Maps API Key"),
    el(
      "p",
      {},
      "Set GOOGLE_MAPS_API_KEY in a local .env file (copied from .env.example) and restart the FastAPI server to load the interactive Central London map, Places API (New) discovery, and Geocoding."
    ),
    el(
      "p",
      {},
      "For prototyping without billing, generate a free Maps Demo Key at mapsplatform.google.com/maps-demo-key."
    )
  );
  mapCanvas.replaceChildren(card);
  setStatus("API key not configured in .env");

  const host = document.getElementById("neighborhood-autocomplete-input");
  const fallback = el("input", {
    id: "autocomplete-fallback-text",
    type: "text",
    className: "autocomplete-fallback-input",
    placeholder: "Enter London address or neighborhood...",
    "aria-label": "Enter London address or neighborhood",
  });
  host.replaceChildren(fallback);
}

function updateCircleGeometry() {
  if (!state.map || !state.mapsLib) return;
  if (!state.radiusCircle) {
    state.radiusCircle = new state.mapsLib.Circle({
      strokeColor: "#1a73e8",
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
      fillColor: "#1a73e8",
      fillOpacity: 0.08,
      clickable: false,
      map: state.showRadiusCircle ? state.map : null,
      center: state.activeCenter,
      radius: state.radiusMeters,
    });
  } else {
    state.radiusCircle.setCenter(state.activeCenter);
    state.radiusCircle.setRadius(state.radiusMeters);
    state.radiusCircle.setMap(state.showRadiusCircle ? state.map : null);
  }
}

function clearPlaceMarkers() {
  for (const marker of state.markers) {
    marker.map = null;
  }
  state.markers = [];
}

function getFilteredPlaces() {
  if (state.activeCategory === "all") return state.places;
  return state.places.filter(
    (place) => inferCategory(place) === state.activeCategory
  );
}

function renderPlaceMarkers() {
  if (!state.map || !state.markerLib) return;
  clearPlaceMarkers();

  const { AdvancedMarkerElement, PinElement } = state.markerLib;
  const visible = getFilteredPlaces();

  for (const place of visible) {
    const coords = getPlaceCoords(place);
    if (!coords) continue;

    const category = inferCategory(place);
    const meta = CATEGORY_META[category] || CATEGORY_META.restaurant;
    const isSelected = state.selectedPlaceId === place.id;

    const pin = new PinElement({
      background: meta.bg,
      borderColor: meta.border,
      glyphColor: meta.glyph,
      glyphText: meta.glyphText,
      scale: isSelected ? 1.25 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: coords,
      title: getPlaceName(place),
      zIndex: isSelected ? 50 : 10,
    });
    marker.append(pin);

    marker.addListener("click", () => {
      openMarkerInfoWindow(marker, place);
      inspectPlace(place);
    });

    state.markers.push(marker);
  }
}

function openMarkerInfoWindow(marker, place) {
  if (!state.infoWindow || !state.map) return;
  const name = getPlaceName(place);
  const ratingText =
    typeof place.rating === "number"
      ? `★ ${place.rating.toFixed(1)} (${place.userRatingCount || 0})`
      : "No ratings yet";
  const content = el(
    "div",
    { style: "max-width:220px;font-family:inherit;" },
    el("strong", { style: "display:block;font-size:13px;margin-bottom:2px;" }, name),
    el(
      "div",
      { style: "font-size:12px;color:#475569;margin-bottom:2px;" },
      ratingText
    ),
    el(
      "div",
      { style: "font-size:11px;color:#64748b;" },
      place.formattedAddress || ""
    )
  );
  state.infoWindow.setContent(content);
  state.infoWindow.open({ map: state.map, anchor: marker });
}

function renderCommunityMarkers() {
  if (!state.map || !state.markerLib) return;
  for (const m of state.communityMarkers) {
    m.map = null;
  }
  state.communityMarkers = [];

  const { AdvancedMarkerElement, PinElement } = state.markerLib;
  const meta = CATEGORY_META.community;

  for (const spot of state.communitySpots) {
    const pin = new PinElement({
      background: meta.bg,
      borderColor: meta.border,
      glyphColor: meta.glyph,
      glyphText: meta.glyphText,
      scale: 1.15,
    });
    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: spot.lat, lng: spot.lng },
      title: `${spot.name} (Community Spot)`,
      zIndex: 40,
    });
    marker.append(pin);

    marker.addListener("click", () => {
      if (state.infoWindow) {
        const content = el(
          "div",
          { style: "max-width:220px;" },
          el("strong", { style: "display:block;color:#4c1d95;" }, spot.name),
          spot.note
            ? el("div", { style: "font-size:12px;margin-top:2px;" }, spot.note)
            : null,
          el(
            "div",
            { style: "font-size:11px;color:#64748b;margin-top:2px;" },
            spot.address
          )
        );
        state.infoWindow.setContent(content);
        state.infoWindow.open({ map: state.map, anchor: marker });
      }
      state.map.panTo({ lat: spot.lat, lng: spot.lng });
    });

    state.communityMarkers.push(marker);
  }
}

function isCompared(placeId) {
  return state.comparedPlaces.some((p) => p.id === placeId);
}

function toggleCompare(place) {
  if (!place?.id) return;
  const existingIdx = state.comparedPlaces.findIndex((p) => p.id === place.id);
  if (existingIdx >= 0) {
    state.comparedPlaces.splice(existingIdx, 1);
  } else {
    if (state.comparedPlaces.length >= 3) {
      state.comparedPlaces.shift();
    }
    state.comparedPlaces.push(place);
    state.isComparisonOpen = true;
  }
  updateCompareControls();
  renderDirectoryList();
  renderComparisonPanel();
  if (state.selectedPlaceId === place.id) {
    const btn = document.getElementById("drawer-compare-button");
    if (btn) {
      btn.textContent = isCompared(place.id)
        ? "✓ In Comparison"
        : "+ Add to Compare";
    }
  }
}

function updateCompareControls() {
  const toggleBtn = document.getElementById("toggle-comparison-button");
  const panel = document.getElementById("comparison-panel");
  if (toggleBtn) {
    toggleBtn.textContent = `Compare (${state.comparedPlaces.length}/3)`;
    toggleBtn.classList.toggle("is-active", state.isComparisonOpen);
    toggleBtn.setAttribute("aria-expanded", String(state.isComparisonOpen));
  }
  if (panel) {
    panel.classList.toggle("hidden", !state.isComparisonOpen);
  }
}

function renderComparisonPanel() {
  const grid = document.getElementById("comparison-grid");
  if (!grid) return;

  if (state.comparedPlaces.length === 0) {
    grid.replaceChildren(
      el(
        "div",
        { className: "empty-state", style: "grid-column: 1 / -1;" },
        "No places selected yet. Click '+ Compare' on up to 3 places from the directory or details drawer."
      )
    );
    return;
  }

  const cards = state.comparedPlaces.map((place) => {
    const category = inferCategory(place);
    const meta = CATEGORY_META[category] || CATEGORY_META.restaurant;
    const ratingStr =
      typeof place.rating === "number"
        ? `★ ${place.rating.toFixed(1)} (${(place.userRatingCount || 0).toLocaleString()})`
        : "No ratings";
    const todayHours = getTodayDescription(place) || "Hours unavailable";

    return el(
      "article",
      { className: "compare-card" },
      el(
        "div",
        { className: "compare-card-head" },
        el(
          "div",
          {},
          el("h3", { className: "compare-card-title" }, getPlaceName(place)),
          el(
            "span",
            { className: "category-badge", style: "margin-top:4px;" },
            el("span", { className: `dot dot-${category}` }),
            meta.label
          )
        ),
        el(
          "button",
          {
            type: "button",
            className: "btn btn-ghost btn-sm",
            onClick: () => toggleCompare(place),
            title: "Remove from comparison",
          },
          "Remove"
        )
      ),
      el(
        "div",
        { className: "compare-metrics" },
        el("span", { className: "compare-metric-label" }, "Rating"),
        el("span", {}, ratingStr),
        el("span", { className: "compare-metric-label" }, "Price"),
        el("span", {}, formatPriceLevel(place.priceLevel)),
        el("span", { className: "compare-metric-label" }, "Today"),
        el("span", {}, todayHours),
        el("span", { className: "compare-metric-label" }, "Address"),
        el("span", {}, place.formattedAddress || "—")
      ),
      el(
        "button",
        {
          type: "button",
          className: "btn btn-secondary btn-sm",
          onClick: () => inspectPlace(place),
        },
        "Inspect Full Details"
      )
    );
  });

  grid.replaceChildren(...cards);
}

function renderDirectoryList() {
  const container = document.getElementById("places-results-list");
  if (!container) return;

  const filtered = getFilteredPlaces();
  const modeText = state.activeSearchQuery
    ? `"${state.activeSearchQuery}" near ${state.activeAreaName}`
    : state.activeAreaName;
  setStatus(`${modeText} · ${filtered.length} places within 5 km`);

  if (filtered.length === 0) {
    container.replaceChildren(
      el(
        "div",
        { className: "empty-state" },
        "No places matched this filter within 5 km. Try selecting 'All' or choosing another London neighborhood."
      )
    );
    return;
  }

  const cards = filtered.map((place) => {
    const category = inferCategory(place);
    const meta = CATEGORY_META[category] || CATEGORY_META.restaurant;
    const isSelected = state.selectedPlaceId === place.id;
    const compared = isCompared(place.id);
    const todayHours = getTodayDescription(place);

    const ratingBadge =
      typeof place.rating === "number"
        ? el(
            "span",
            { className: "rating-pill" },
            `★ ${place.rating.toFixed(1)} (${(place.userRatingCount || 0).toLocaleString()})`
          )
        : el("span", {}, "No rating");

    const priceLabel = formatPriceLevel(place.priceLevel);

    return el(
      "article",
      {
        className: `place-card${isSelected ? " is-selected" : ""}`,
        role: "listitem",
      },
      el(
        "div",
        { className: "place-card-top" },
        el("h3", { className: "place-card-title" }, getPlaceName(place)),
        el(
          "span",
          { className: "category-badge" },
          el("span", { className: `dot dot-${category}` }),
          meta.label
        )
      ),
      el(
        "div",
        { className: "place-meta-row" },
        ratingBadge,
        priceLabel !== "—" ? el("span", { className: "price-pill" }, priceLabel) : null,
        place.primaryTypeDisplayName?.text
          ? el("span", {}, place.primaryTypeDisplayName.text)
          : null
      ),
      todayHours ? el("div", { className: "place-hours" }, todayHours) : null,
      el(
        "div",
        { className: "place-address" },
        place.formattedAddress || "Central London"
      ),
      el(
        "div",
        { className: "place-card-actions" },
        el(
          "button",
          {
            type: "button",
            className: "btn btn-primary btn-sm",
            onClick: () => {
              const coords = getPlaceCoords(place);
              if (coords && state.map) {
                state.map.panTo(coords);
              }
              inspectPlace(place);
            },
          },
          "Inspect"
        ),
        el(
          "button",
          {
            type: "button",
            className: `btn btn-sm ${compared ? "btn-accent" : "btn-secondary"}`,
            onClick: () => toggleCompare(place),
          },
          compared ? "✓ Comparing" : "+ Compare"
        )
      )
    );
  });

  container.replaceChildren(...cards);
}

function renderCommunitySpotsList() {
  const listEl = document.getElementById("community-spots-list");
  const countEl = document.getElementById("community-spots-count");
  if (countEl) {
    countEl.textContent = String(state.communitySpots.length);
  }
  if (!listEl) return;

  if (state.communitySpots.length === 0) {
    listEl.replaceChildren();
    return;
  }

  const cards = state.communitySpots.map((spot) =>
    el(
      "div",
      { className: "community-card" },
      el(
        "div",
        { className: "community-card-header" },
        el("span", { className: "community-card-title" }, spot.name),
        el(
          "div",
          { style: "display:flex;gap:4px;" },
          el(
            "button",
            {
              type: "button",
              className: "btn btn-secondary btn-sm",
              onClick: () => {
                if (state.map) {
                  state.map.panTo({ lat: spot.lat, lng: spot.lng });
                  state.map.setZoom(15);
                }
              },
            },
            "Focus"
          ),
          el(
            "button",
            {
              type: "button",
              className: "btn btn-ghost btn-sm",
              onClick: () => removeCommunitySpot(spot.id),
            },
            "Remove"
          )
        )
      ),
      spot.note ? el("div", { className: "community-card-note" }, spot.note) : null,
      el(
        "div",
        { className: "community-card-addr" },
        `${spot.address} (${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)})`
      )
    )
  );

  listEl.replaceChildren(...cards);
}

function removeCommunitySpot(spotId) {
  state.communitySpots = state.communitySpots.filter((s) => s.id !== spotId);
  saveCommunitySpotsToSession();
  renderCommunitySpotsList();
  renderCommunityMarkers();
}

function openDrawerMode(mode) {
  const drawer = document.getElementById("place-details-drawer");
  const badge = document.getElementById("drawer-mode-badge");
  const placeView = document.getElementById("drawer-place-view");
  const reverseView = document.getElementById("reverse-geocode-inspector");

  drawer.classList.remove("hidden");
  if (mode === "place") {
    badge.textContent = "Place Details";
    placeView.classList.remove("hidden");
    reverseView.classList.add("hidden");
  } else {
    badge.textContent = "Reverse Geocode";
    placeView.classList.add("hidden");
    reverseView.classList.remove("hidden");
  }
}

function closeDrawer() {
  const drawer = document.getElementById("place-details-drawer");
  drawer.classList.add("hidden");
  state.selectedPlaceId = null;
  renderDirectoryList();
  renderPlaceMarkers();
}

async function inspectPlace(place) {
  if (!place?.id) return;
  state.selectedPlaceId = place.id;
  renderDirectoryList();
  renderPlaceMarkers();
  openDrawerMode("place");

  const view = document.getElementById("drawer-place-view");
  view.replaceChildren(
    el("h2", { className: "drawer-title" }, getPlaceName(place)),
    el("div", { className: "inspector-subtitle" }, "Loading live details, hours, and reviews...")
  );

  let detailed = state.detailsCache.get(place.id);
  if (!detailed) {
    try {
      detailed = await apiJson(
        `/api/places/details?placeId=${encodeURIComponent(place.id)}`
      );
      state.detailsCache.set(place.id, detailed);
      // Merge fresher details into comparedPlaces if present
      const cmpIdx = state.comparedPlaces.findIndex((p) => p.id === place.id);
      if (cmpIdx >= 0) {
        state.comparedPlaces[cmpIdx] = detailed;
        renderComparisonPanel();
      }
    } catch (err) {
      detailed = place;
      console.warn("Could not fetch full place details:", err.message);
    }
  }

  renderPlaceDetailsContent(detailed);
}

function renderPlaceDetailsContent(place) {
  const view = document.getElementById("drawer-place-view");
  const category = inferCategory(place);
  const meta = CATEGORY_META[category] || CATEGORY_META.restaurant;
  const photoName = place?.photos?.[0]?.name;
  const todayIdx = (new Date().getDay() + 6) % 7;

  const photoEl = photoName
    ? el("img", {
        className: "drawer-photo",
        src: `/api/places/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=640`,
        alt: getPlaceName(place),
        loading: "lazy",
        onError: (e) => {
          e.currentTarget.classList.add("hidden");
        },
      })
    : null;

  const ratingStr =
    typeof place.rating === "number"
      ? `★ ${place.rating.toFixed(1)} · ${(place.userRatingCount || 0).toLocaleString()} reviews`
      : "No ratings available";

  const priceStr = formatPriceLevel(place.priceLevel);

  const compareBtn = el(
    "button",
    {
      id: "drawer-compare-button",
      type: "button",
      className: `btn btn-full ${isCompared(place.id) ? "btn-accent" : "btn-primary"}`,
      onClick: () => toggleCompare(place),
    },
    isCompared(place.id) ? "✓ In Comparison" : "+ Add to Compare"
  );

  const hoursDescriptions = place?.regularOpeningHours?.weekdayDescriptions;
  const hoursSection = el(
    "div",
    { className: "drawer-section" },
    el("h3", {}, "Opening Hours"),
    Array.isArray(hoursDescriptions) && hoursDescriptions.length > 0
      ? el(
          "ul",
          { className: "hours-list" },
          hoursDescriptions.map((line, idx) =>
            el("li", { className: idx === todayIdx ? "is-today" : "" }, line)
          )
        )
      : el("span", { className: "inspector-subtitle" }, "Opening hours not published.")
  );

  const reviews = Array.isArray(place.reviews) ? place.reviews : [];
  const reviewsSection = el(
    "div",
    { className: "drawer-section" },
    el("h3", {}, `Live Customer Reviews (${reviews.length})`),
    reviews.length > 0
      ? el(
          "div",
          { className: "reviews-list" },
          reviews.slice(0, 5).map((rev) =>
            el(
              "article",
              { className: "review-item" },
              el(
                "div",
                { className: "review-header" },
                el("span", {}, rev.authorAttribution?.displayName || "Google Reviewer"),
                el(
                  "span",
                  { className: "rating-pill" },
                  typeof rev.rating === "number" ? `★ ${rev.rating}` : ""
                )
              ),
              rev.relativePublishTimeDescription
                ? el(
                    "span",
                    { className: "inspector-subtitle" },
                    rev.relativePublishTimeDescription
                  )
                : null,
              el(
                "p",
                { className: "review-text" },
                rev.text?.text || rev.originalText?.text || "Rating submitted without text."
              )
            )
          )
        )
      : el("span", { className: "inspector-subtitle" }, "No customer reviews returned.")
  );

  const linksRow = el(
    "div",
    { style: "display:flex;flex-wrap:wrap;gap:8px;" },
    place.websiteUri
      ? el(
          "a",
          {
            href: place.websiteUri,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "btn btn-secondary btn-sm",
          },
          "Website"
        )
      : null,
    place.googleMapsUri
      ? el(
          "a",
          {
            href: place.googleMapsUri,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "btn btn-secondary btn-sm",
          },
          "Open in Google Maps"
        )
      : null
  );

  view.replaceChildren(
    photoEl,
    el(
      "div",
      { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap;" },
      el(
        "span",
        { className: "category-badge" },
        el("span", { className: `dot dot-${category}` }),
        meta.label
      ),
      priceStr !== "—" ? el("span", { className: "price-pill" }, priceStr) : null
    ),
    el("h2", { className: "drawer-title" }, getPlaceName(place)),
    el("div", { className: "place-meta-row" }, el("span", { className: "rating-pill" }, ratingStr)),
    el("div", { className: "place-address" }, place.formattedAddress || ""),
    place.internationalPhoneNumber
      ? el("div", { className: "inspector-subtitle" }, place.internationalPhoneNumber)
      : null,
    linksRow,
    compareBtn,
    hoursSection,
    reviewsSection
  );
}

async function handleMapReverseGeocode(lat, lng) {
  openDrawerMode("reverse");

  document.getElementById("rg-address").textContent = "Resolving street address...";
  document.getElementById("rg-coords").textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  document.getElementById("rg-place-id").textContent = "—";
  document.getElementById("rg-plus-code").textContent = "—";

  if (state.map && state.markerLib) {
    const { AdvancedMarkerElement, PinElement } = state.markerLib;
    if (state.tempClickMarker) {
      state.tempClickMarker.position = { lat, lng };
      state.tempClickMarker.map = state.map;
    } else {
      const pin = new PinElement({
        background: "#0f172a",
        borderColor: "#ffffff",
        glyphColor: "#ffffff",
        glyphText: "?",
        scale: 1.05,
      });
      state.tempClickMarker = new AdvancedMarkerElement({
        map: state.map,
        position: { lat, lng },
        title: "Selected Map Point",
        zIndex: 60,
      });
      state.tempClickMarker.append(pin);
    }
  }

  try {
    const data = await apiJson(
      `/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
    const first = data.results?.[0];
    const address =
      first?.formatted_address ||
      `Coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const placeId = first?.place_id || "Unavailable";
    const plusCode =
      first?.plus_code?.compound_code ||
      first?.plus_code?.global_code ||
      "Unavailable";

    state.lastReverseGeocode = { lat, lng, address, placeId, plusCode };
    document.getElementById("rg-address").textContent = address;
    document.getElementById("rg-place-id").textContent = placeId;
    document.getElementById("rg-plus-code").textContent = plusCode;
  } catch (err) {
    state.lastReverseGeocode = {
      lat,
      lng,
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      placeId: "Unavailable",
      plusCode: "Unavailable",
    };
    document.getElementById("rg-address").textContent = `Lookup error: ${err.message}`;
  }
}

async function fetchNearbyPlaces() {
  setStatus(`Searching ${state.activeAreaName} (5 km radius)...`);
  try {
    let places = [];
    if (state.activeCategory === "all") {
      // Query all 4 core categories in parallel so all categories are well represented
      const categories = ["restaurant", "cafe", "museum", "park"];
      const responses = await Promise.all(
        categories.map((cat) =>
          apiJson("/api/places/nearby", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: state.activeCenter.lat,
              lng: state.activeCenter.lng,
              radiusMeters: state.radiusMeters,
              includedTypes: [cat],
              maxResultCount: 6,
              rankPreference: "POPULARITY",
            }),
          })
        )
      );
      const deduped = new Map();
      for (const res of responses) {
        for (const p of res.places || []) {
          if (p.id && !deduped.has(p.id)) {
            deduped.set(p.id, p);
          }
        }
      }
      places = Array.from(deduped.values());
    } else {
      const res = await apiJson("/api/places/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: state.activeCenter.lat,
          lng: state.activeCenter.lng,
          radiusMeters: state.radiusMeters,
          includedTypes: [state.activeCategory],
          maxResultCount: 16,
          rankPreference: "POPULARITY",
        }),
      });
      places = res.places || [];
    }

    state.places = places;
    state.loadedCategoriesMode = state.activeCategory;
    renderDirectoryList();
    renderPlaceMarkers();
  } catch (err) {
    setStatus(`Could not load places: ${err.message}`);
  }
}

async function runTextSearch(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    state.activeSearchQuery = "";
    document.getElementById("reset-nearby-button").classList.add("hidden");
    await fetchNearbyPlaces();
    return;
  }

  state.activeSearchQuery = trimmed;
  document.getElementById("reset-nearby-button").classList.remove("hidden");
  setStatus(`Searching "${trimmed}" near ${state.activeAreaName}...`);

  try {
    const body = {
      textQuery: trimmed,
      lat: state.activeCenter.lat,
      lng: state.activeCenter.lng,
      radiusMeters: state.radiusMeters,
      pageSize: 20,
    };
    if (state.activeCategory !== "all") {
      body.includedType = state.activeCategory;
    }
    const res = await apiJson("/api/places/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    state.places = res.places || [];
    renderDirectoryList();
    renderPlaceMarkers();
  } catch (err) {
    setStatus(`Search error: ${err.message}`);
  }
}

async function recenterAndDiscover(lat, lng, label) {
  state.activeCenter = { lat, lng };
  state.activeAreaName = label;
  state.activeSearchQuery = "";
  document.getElementById("text-search-input").value = "";
  document.getElementById("reset-nearby-button").classList.add("hidden");

  if (state.map) {
    state.map.panTo({ lat, lng });
    state.map.setZoom(13);
  }
  updateCircleGeometry();

  if (state.autocompleteEl) {
    state.autocompleteEl.locationBias = {
      center: { lat, lng },
      radius: state.radiusMeters,
    };
  }

  await fetchNearbyPlaces();
}

async function handleForwardGeocode() {
  let rawInput = "";
  if (state.autocompleteEl && typeof state.autocompleteEl.value === "string") {
    rawInput = state.autocompleteEl.value.trim();
  }
  if (!rawInput) {
    const fallback = document.getElementById("autocomplete-fallback-text");
    if (fallback) rawInput = fallback.value.trim();
  }
  if (!rawInput) {
    rawInput = document.getElementById("text-search-input").value.trim();
  }
  if (!rawInput) {
    setStatus("Type a London street, postcode, or neighborhood to geocode.");
    return;
  }

  setStatus(`Geocoding "${rawInput}"...`);
  try {
    const res = await apiJson(
      `/api/geocode?address=${encodeURIComponent(rawInput)}`
    );
    const first = res.results?.[0];
    const loc = first?.geometry?.location;
    if (!loc) {
      setStatus(`No geocoding match found for "${rawInput}".`);
      return;
    }
    const shortLabel =
      first.formatted_address?.split(",")[0] || rawInput;
    await recenterAndDiscover(loc.lat, loc.lng, shortLabel);
  } catch (err) {
    setStatus(`Geocode failed: ${err.message}`);
  }
}

function mountPlaceAutocomplete() {
  const host = document.getElementById("neighborhood-autocomplete-input");
  const { PlaceAutocompleteElement } = state.placesLib;

  const autocomplete = new PlaceAutocompleteElement({
    includedRegionCodes: ["gb"],
    requestedLanguage: "en",
    requestedRegion: "GB",
    locationBias: {
      center: state.activeCenter,
      radius: state.radiusMeters,
    },
    internalUsageAttributionIds: [
      state.config.attributionId || "gmp_git_agentsamples_v1.0.0",
    ],
  });
  autocomplete.placeholder = "Search London address or neighborhood...";
  autocomplete.setAttribute(
    "aria-label",
    "Search London address or neighborhood"
  );

  autocomplete.addEventListener("gmp-select", async (event) => {
    try {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "location", "types"],
      });
      if (!place.location) return;
      const lat = place.location.lat();
      const lng = place.location.lng();
      const label = place.displayName || place.formattedAddress || "Selected Area";
      await recenterAndDiscover(lat, lng, label);
    } catch (err) {
      setStatus(`Autocomplete selection failed: ${err.message}`);
    }
  });

  state.autocompleteEl = autocomplete;
  host.replaceChildren(autocomplete);
}

function wireUiEvents() {
  document
    .getElementById("address-geocode-button")
    .addEventListener("click", () => {
      handleForwardGeocode();
    });

  document
    .getElementById("neighborhood-preset-select")
    .addEventListener("change", (event) => {
      const preset = NEIGHBORHOOD_PRESETS[event.target.value];
      if (preset) {
        recenterAndDiscover(preset.lat, preset.lng, preset.name);
      }
    });

  document
    .getElementById("radius-toggle-circle")
    .addEventListener("click", (event) => {
      state.showRadiusCircle = !state.showRadiusCircle;
      event.currentTarget.classList.toggle("is-active", state.showRadiusCircle);
      event.currentTarget.setAttribute(
        "aria-pressed",
        String(state.showRadiusCircle)
      );
      updateCircleGeometry();
    });

  document
    .getElementById("toggle-comparison-button")
    .addEventListener("click", () => {
      state.isComparisonOpen = !state.isComparisonOpen;
      updateCompareControls();
      renderComparisonPanel();
    });

  document
    .getElementById("close-comparison-button")
    .addEventListener("click", () => {
      state.isComparisonOpen = false;
      updateCompareControls();
    });

  document
    .getElementById("clear-comparison-button")
    .addEventListener("click", () => {
      state.comparedPlaces = [];
      updateCompareControls();
      renderComparisonPanel();
      renderDirectoryList();
    });

  document
    .getElementById("close-drawer-button")
    .addEventListener("click", () => {
      closeDrawer();
    });

  document
    .getElementById("pin-community-spot-button")
    .addEventListener("click", () => {
      const center = state.map
        ? {
            lat: state.map.getCenter().lat(),
            lng: state.map.getCenter().lng(),
          }
        : state.activeCenter;
      handleMapReverseGeocode(center.lat, center.lng);
      document.getElementById("community-spot-name-input").focus();
    });

  document
    .getElementById("rg-search-here-button")
    .addEventListener("click", () => {
      if (!state.lastReverseGeocode) return;
      const { lat, lng, address } = state.lastReverseGeocode;
      const shortLabel = address.split(",")[0] || "Selected Location";
      recenterAndDiscover(lat, lng, shortLabel);
    });

  document
    .getElementById("community-spot-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      if (!state.lastReverseGeocode) return;

      const nameInput = document.getElementById("community-spot-name-input");
      const noteInput = document.getElementById("community-spot-note-input");
      const name = nameInput.value.trim();
      if (!name) return;

      const newSpot = {
        id: `spot_${Date.now()}`,
        name,
        note: noteInput.value.trim(),
        lat: state.lastReverseGeocode.lat,
        lng: state.lastReverseGeocode.lng,
        address: state.lastReverseGeocode.address,
      };

      state.communitySpots.unshift(newSpot);
      saveCommunitySpotsToSession();
      renderCommunitySpotsList();
      renderCommunityMarkers();

      if (state.tempClickMarker) {
        state.tempClickMarker.map = null;
      }

      nameInput.value = "";
      noteInput.value = "";
      closeDrawer();
    });

  document
    .getElementById("text-search-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const query = document.getElementById("text-search-input").value;
      runTextSearch(query);
    });

  document
    .getElementById("reset-nearby-button")
    .addEventListener("click", () => {
      document.getElementById("text-search-input").value = "";
      state.activeSearchQuery = "";
      document.getElementById("reset-nearby-button").classList.add("hidden");
      fetchNearbyPlaces();
    });

  for (const chip of document.querySelectorAll(".category-filters .chip")) {
    chip.addEventListener("click", () => {
      for (const c of document.querySelectorAll(".category-filters .chip")) {
        c.classList.remove("is-active");
      }
      chip.classList.add("is-active");
      state.activeCategory = chip.dataset.category || "all";

      if (state.activeSearchQuery) {
        runTextSearch(state.activeSearchQuery);
      } else if (
        state.loadedCategoriesMode !== "all" &&
        state.loadedCategoriesMode !== state.activeCategory
      ) {
        fetchNearbyPlaces();
      } else {
        renderDirectoryList();
        renderPlaceMarkers();
      }
    });
  }
}

async function initApp() {
  wireUiEvents();
  renderCommunitySpotsList();
  updateCompareControls();
  renderComparisonPanel();

  try {
    state.config = await apiJson("/api/config");
  } catch (err) {
    setStatus(`Configuration error: ${err.message}`);
    return;
  }

  state.activeCenter = {
    lat: state.config.defaultCenter?.lat ?? 51.5118,
    lng: state.config.defaultCenter?.lng ?? -0.128,
  };
  state.radiusMeters = state.config.radiusMeters ?? 5000;

  if (!state.config.configured || !state.config.googleMapsApiKey) {
    renderUnconfiguredNotice();
    return;
  }

  injectMapsBootstrap(state.config.googleMapsApiKey);

  try {
    const [mapsLib, markerLib, placesLib, coreLib] = await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
      google.maps.importLibrary("places"),
      google.maps.importLibrary("core"),
    ]);

    state.mapsLib = mapsLib;
    state.markerLib = markerLib;
    state.placesLib = placesLib;
    state.coreLib = coreLib;

    state.map = new mapsLib.Map(document.getElementById("map-canvas"), {
      center: state.activeCenter,
      zoom: state.config.defaultZoom ?? 13,
      mapId: state.config.mapId || "DEMO_MAP_ID",
      internalUsageAttributionIds: [
        state.config.attributionId || "gmp_git_agentsamples_v1.0.0",
      ],
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
    });

    state.infoWindow = new mapsLib.InfoWindow();

    state.map.addListener("click", (event) => {
      if (!event.latLng) return;
      handleMapReverseGeocode(event.latLng.lat(), event.latLng.lng());
    });

    updateCircleGeometry();
    mountPlaceAutocomplete();
    renderCommunityMarkers();
    await fetchNearbyPlaces();
  } catch (err) {
    setStatus(`Google Maps initialization failed: ${err.message}`);
  }
}

initApp();
