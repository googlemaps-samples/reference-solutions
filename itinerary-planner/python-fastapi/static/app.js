/**
 * VoyagePulse — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub
 * Zero-deprecation Google Maps Platform client using Dynamic Library Import,
 * AdvancedMarkerElement, PinElement (glyphText), PlaceAutocompleteElement (gmp-select),
 * StreetViewPanorama, and FastAPI BFF endpoints (/api/places/*, /api/routes/compute, /api/timezone).
 */

const DAY_META = {
  1: { label: "Day 1", color: "#0f766e", border: "#115e59" },
  2: { label: "Day 2", color: "#d97706", border: "#b45309" },
};

const PRESET_DESTINATIONS = {
  tokyo: {
    name: "Tokyo",
    displayName: "Tokyo, Japan",
    lat: 35.6812,
    lng: 139.7671,
    zoom: 12,
    fallbackOffsetSeconds: 9 * 3600,
    fallbackTzName: "Japan Standard Time",
    fallbackTzId: "Asia/Tokyo",
  },
  kyoto: {
    name: "Kyoto",
    displayName: "Kyoto, Japan",
    lat: 35.0116,
    lng: 135.7681,
    zoom: 12,
    fallbackOffsetSeconds: 9 * 3600,
    fallbackTzName: "Japan Standard Time",
    fallbackTzId: "Asia/Tokyo",
  },
  paris: {
    name: "Paris",
    displayName: "Paris, France",
    lat: 48.8566,
    lng: 2.3522,
    zoom: 12,
    fallbackOffsetSeconds: 3600,
    fallbackTzName: "Central European Time",
    fallbackTzId: "Europe/Paris",
  },
  new_york: {
    name: "New York",
    displayName: "New York, USA",
    lat: 40.7128,
    lng: -74.006,
    zoom: 12,
    fallbackOffsetSeconds: -5 * 3600,
    fallbackTzName: "Eastern Standard Time",
    fallbackTzId: "America/New_York",
  },
  london: {
    name: "London",
    displayName: "London, UK",
    lat: 51.5074,
    lng: -0.1278,
    zoom: 12,
    fallbackOffsetSeconds: 0,
    fallbackTzName: "Greenwich Mean Time",
    fallbackTzId: "Europe/London",
  },
  sydney: {
    name: "Sydney",
    displayName: "Sydney, Australia",
    lat: -33.8688,
    lng: 151.2093,
    zoom: 12,
    fallbackOffsetSeconds: 11 * 3600,
    fallbackTzName: "Australian Eastern Daylight Time",
    fallbackTzId: "Australia/Sydney",
  },
};

const state = {
  config: null,
  destination: { ...PRESET_DESTINATIONS.tokyo },
  activeDay: 1,
  activeCategory: "attractions",
  travelMode: "DRIVE",
  days: { 1: [], 2: [] },
  legMetrics: { 1: [], 2: [] },
  routeSummaries: { 1: null, 2: null },
  discoveryResults: [],
  discoveryCache: {},
  selectedPlaceId: null,
  timezone: {
    timeZoneId: "Asia/Tokyo",
    timeZoneName: "Japan Standard Time",
    totalOffsetSeconds: 9 * 3600,
  },
  clockTimerId: null,
};

let gmp = {
  map: null,
  infoWindow: null,
  panorama: null,
  svService: null,
  libs: {},
  markers: [],
  polylines: [],
};

const dom = {
  searchHost: document.getElementById("destination-search-host"),
  fallbackInput: document.getElementById("destination-fallback-input"),
  quickSelect: document.getElementById("destination-quick-select"),
  tzCity: document.getElementById("tz-city-label"),
  tzOffset: document.getElementById("tz-offset-badge"),
  tzClock: document.getElementById("tz-clock-value"),
  tzName: document.getElementById("tz-name-label"),
  statusBanner: document.getElementById("status-banner"),
  activeDestPill: document.getElementById("active-destination-pill"),
  dayTabsContainer: document.querySelector('[data-testid="itinerary-day-tabs"]'),
  day1Count: document.getElementById("day-1-count"),
  day2Count: document.getElementById("day-2-count"),
  travelModeSelect: document.getElementById("travel-mode-select"),
  optimizeBtn: document.getElementById("optimize-route-btn"),
  routeSummaryText: document.getElementById("route-summary-text"),
  routeModeBadge: document.getElementById("route-mode-badge"),
  stopsList: document.getElementById("itinerary-stops-list"),
  discoveryForm: document.getElementById("discovery-search-form"),
  discoveryQueryInput: document.getElementById("discovery-query-input"),
  categoryTabsContainer: document.querySelector('[data-testid="discovery-category-tabs"]'),
  discoveryCount: document.getElementById("discovery-count"),
  discoveryList: document.getElementById("discovery-results-list"),
  mapContainer: document.getElementById("map-container"),
  svTitle: document.getElementById("street-view-title"),
  svStatus: document.getElementById("street-view-status"),
  svCanvas: document.getElementById("street-view-canvas"),
  svEmpty: document.getElementById("street-view-empty"),
};

function showStatus(message, isError = false) {
  if (!message) {
    dom.statusBanner.textContent = "";
    dom.statusBanner.className = "status-banner hidden";
    return;
  }
  dom.statusBanner.textContent = message;
  dom.statusBanner.className = isError ? "status-banner error" : "status-banner";
}

function loadMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return;
  }
  const params = {
    key: apiKey,
    v: "weekly",
    language: "en",
    region: "US",
  };
  ((g) => {
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
    d[l]
      ? console.warn(p + " only loads once. Ignoring:", g)
      : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
  })(params);
}

function formatUtcOffset(totalSeconds) {
  const sign = totalSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(totalSeconds);
  const hours = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mins = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `UTC${sign}${hours}:${mins}`;
}

function formatDurationSeconds(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function parseDurationString(durationStr) {
  if (!durationStr) return 0;
  const num = parseFloat(String(durationStr).replace("s", ""));
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function updateTimezoneClock() {
  const tz = state.timezone;
  dom.tzCity.textContent = state.destination.name;
  dom.tzOffset.textContent = formatUtcOffset(tz.totalOffsetSeconds || 0);
  dom.tzName.textContent = tz.timeZoneName || tz.timeZoneId || "Local Time";

  try {
    if (tz.timeZoneId) {
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: tz.timeZoneId,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
      dom.tzClock.textContent = formatted;
      return;
    }
  } catch {
    // Fall back to offset arithmetic if IANA zone is unavailable
  }

  const shifted = new Date(Date.now() + (tz.totalOffsetSeconds || 0) * 1000);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  const ss = String(shifted.getUTCSeconds()).padStart(2, "0");
  dom.tzClock.textContent = `${hh}:${mm}:${ss}`;
}

function startTimezoneClock() {
  if (state.clockTimerId) {
    clearInterval(state.clockTimerId);
  }
  updateTimezoneClock();
  state.clockTimerId = setInterval(updateTimezoneClock, 1000);
}

async function fetchDestinationTimezone(lat, lng, fallbackInfo = {}) {
  try {
    const resp = await fetch(
      `/api/timezone?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (data.status !== "OK") {
      throw new Error(data.detail || data.status || "Time Zone fallback");
    }
    state.timezone = {
      timeZoneId: data.timeZoneId || fallbackInfo.fallbackTzId || "",
      timeZoneName: data.timeZoneName || fallbackInfo.fallbackTzName || "Local Time",
      totalOffsetSeconds: Number(data.totalOffsetSeconds ?? fallbackInfo.fallbackOffsetSeconds ?? 0),
    };
  } catch {
    const offsetSec =
      typeof fallbackInfo.utcOffsetMinutes === "number"
        ? fallbackInfo.utcOffsetMinutes * 60
        : fallbackInfo.fallbackOffsetSeconds ?? 0;
    state.timezone = {
      timeZoneId: fallbackInfo.fallbackTzId || "",
      timeZoneName: fallbackInfo.fallbackTzName || "Destination Local Time",
      totalOffsetSeconds: offsetSec,
    };
  }
  startTimezoneClock();
}

function normalizePlace(raw) {
  const lat = raw?.location?.latitude ?? raw?.location?.lat;
  const lng = raw?.location?.longitude ?? raw?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  const weekdayDescriptions = Array.isArray(raw?.regularOpeningHours?.weekdayDescriptions)
    ? raw.regularOpeningHours.weekdayDescriptions
    : [];
  const openNow =
    typeof raw?.regularOpeningHours?.openNow === "boolean"
      ? raw.regularOpeningHours.openNow
      : null;

  return {
    id: raw.id || `${lat.toFixed(5)},${lng.toFixed(5)}`,
    name: raw?.displayName?.text || raw.displayName || "Unnamed Place",
    address: raw.formattedAddress || "",
    location: { lat, lng },
    rating: typeof raw.rating === "number" ? raw.rating : null,
    userRatingCount: typeof raw.userRatingCount === "number" ? raw.userRatingCount : 0,
    typeLabel: raw?.primaryTypeDisplayName?.text || "Place",
    photoName: photos[0]?.name || null,
    weekdayDescriptions,
    openNow,
    googleMapsUri: raw.googleMapsUri || null,
  };
}

function getTodayHoursText(place) {
  if (place.weekdayDescriptions && place.weekdayDescriptions.length > 0) {
    const jsDay = new Date().getDay();
    // weekdayDescriptions starts on Monday (index 0) ... Sunday (index 6)
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    const line = place.weekdayDescriptions[idx] || place.weekdayDescriptions[0];
    return place.openNow === true
      ? `Open now · ${line}`
      : place.openNow === false
        ? `Closed now · ${line}`
        : line;
  }
  if (place.openNow === true) return "Open now";
  if (place.openNow === false) return "Closed now";
  return "Hours available on Google Maps";
}

async function apiSearchPlaces(textQuery, includedType = null) {
  const resp = await fetch("/api/places/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      textQuery,
      includedType,
      locationBias: {
        lat: state.destination.lat,
        lng: state.destination.lng,
        radiusMeters: 18000,
      },
      maxResultCount: 8,
      languageCode: "en",
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Places search failed (${resp.status})`);
  }
  const data = await resp.json();
  return (data.places || []).map(normalizePlace).filter(Boolean);
}

async function apiNearbyPlaces(includedTypes) {
  const resp = await fetch("/api/places/nearby", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat: state.destination.lat,
      lng: state.destination.lng,
      radiusMeters: 6500,
      includedTypes,
      maxResultCount: 8,
      rankPreference: "POPULARITY",
      languageCode: "en",
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `Nearby search failed (${resp.status})`);
  }
  const data = await resp.json();
  return (data.places || []).map(normalizePlace).filter(Boolean);
}

async function loadCategoryResults(category, customQuery = "") {
  const cacheKey = `${state.destination.name}:${category}:${customQuery}`;
  if (state.discoveryCache[cacheKey]) {
    state.discoveryResults = state.discoveryCache[cacheKey];
    renderDiscoveryList();
    renderMapAnnotations();
    return;
  }

  renderDiscoveryLoading();
  try {
    let places = [];
    if (customQuery) {
      places = await apiSearchPlaces(`${customQuery} in ${state.destination.name}`);
    } else if (category === "attractions") {
      places = await apiSearchPlaces(`top tourist attractions in ${state.destination.name}`);
    } else if (category === "restaurants") {
      places = await apiSearchPlaces(`top rated restaurants in ${state.destination.name}`, "restaurant");
    } else if (category === "hotels") {
      try {
        places = await apiNearbyPlaces(["hotel"]);
      } catch {
        places = [];
      }
      if (places.length === 0) {
        places = await apiSearchPlaces(`best hotels in ${state.destination.name}`, "hotel");
      }
    }
    state.discoveryCache[cacheKey] = places;
    state.discoveryResults = places;
    showStatus("");
  } catch (err) {
    state.discoveryResults = [];
    showStatus(err.message || "Unable to load places.", true);
  }
  renderDiscoveryList();
  renderMapAnnotations();
}

async function loadDestinationData(dest, initialSeedPlace = null) {
  state.destination = { ...dest };
  state.discoveryCache = {};
  state.days = { 1: [], 2: [] };
  state.legMetrics = { 1: [], 2: [] };
  state.routeSummaries = { 1: null, 2: null };
  dom.activeDestPill.textContent = dest.name;

  if (gmp.map) {
    gmp.map.setCenter({ lat: dest.lat, lng: dest.lng });
    gmp.map.setZoom(dest.zoom || 12);
  }

  await fetchDestinationTimezone(dest.lat, dest.lng, dest);

  if (!state.config?.hasApiKey) {
    renderItinerary();
    renderDiscoveryList();
    return;
  }

  renderDiscoveryLoading();
  try {
    const [attractions, restaurants] = await Promise.all([
      apiSearchPlaces(`top tourist attractions in ${dest.name}`),
      apiSearchPlaces(`best restaurants in ${dest.name}`, "restaurant").catch(() => []),
    ]);

    state.discoveryCache[`${dest.name}:attractions:`] = attractions;
    state.discoveryCache[`${dest.name}:restaurants:`] = restaurants;
    state.discoveryResults =
      state.activeCategory === "restaurants" ? restaurants : attractions;

    // Pre-seed Day 1 and Day 2 from live Places API (New) results
    const day1Seed = [];
    if (initialSeedPlace) {
      day1Seed.push(initialSeedPlace);
    }
    for (const p of attractions) {
      if (day1Seed.length >= 3) break;
      if (!day1Seed.some((existing) => existing.id === p.id)) {
        day1Seed.push(p);
      }
    }

    const day2Seed = [];
    for (const p of attractions.slice(3)) {
      if (day2Seed.length >= 2) break;
      if (!day1Seed.some((existing) => existing.id === p.id)) {
        day2Seed.push(p);
      }
    }
    for (const r of restaurants) {
      if (day2Seed.length >= 3) break;
      if (!day2Seed.some((existing) => existing.id === r.id)) {
        day2Seed.push(r);
      }
    }

    state.days[1] = day1Seed;
    state.days[2] = day2Seed;

    if (state.activeCategory === "hotels") {
      await loadCategoryResults("hotels");
    } else {
      renderDiscoveryList();
    }

    await recomputeActiveRoute(false);
    renderItinerary();
    renderMapAnnotations();

    const firstStop = state.days[state.activeDay][0] || attractions[0];
    if (firstStop) {
      await inspectStreetView(firstStop, false);
    }
  } catch (err) {
    showStatus(err.message || "Failed to load destination data.", true);
    renderItinerary();
    renderDiscoveryList();
  }
}

async function recomputeActiveRoute(optimize = false) {
  const day = state.activeDay;
  const stops = state.days[day];
  state.routeSummaries[day] = null;
  state.legMetrics[day] = [];

  if (!state.config?.hasApiKey || stops.length < 2) {
    renderRouteSummary();
    renderItinerary();
    renderMapPolylines();
    return;
  }

  dom.routeSummaryText.textContent = optimize
    ? "Optimizing stop order..."
    : "Computing route...";

  const origin = {
    lat: stops[0].location.lat,
    lng: stops[0].location.lng,
    label: stops[0].name,
  };
  const destination = {
    lat: stops[stops.length - 1].location.lat,
    lng: stops[stops.length - 1].location.lng,
    label: stops[stops.length - 1].name,
  };
  const intermediates = stops.slice(1, -1).map((s) => ({
    lat: s.location.lat,
    lng: s.location.lng,
    label: s.name,
  }));

  try {
    const resp = await fetch("/api/routes/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin,
        destination,
        intermediates,
        travelMode: state.travelMode,
        optimizeWaypointOrder: optimize && intermediates.length >= 2,
        languageCode: "en",
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Route calculation failed (${resp.status})`);
    }
    const data = await resp.json();
    const route = (data.routes || [])[0];
    if (!route) {
      throw new Error("No route found between the selected stops.");
    }

    if (
      optimize &&
      Array.isArray(route.optimizedIntermediateWaypointIndex) &&
      route.optimizedIntermediateWaypointIndex.length === intermediates.length
    ) {
      const middle = stops.slice(1, -1);
      const reordered = route.optimizedIntermediateWaypointIndex.map((idx) => middle[idx]);
      state.days[day] = [stops[0], ...reordered, stops[stops.length - 1]];
      showStatus(
        `Optimized ${DAY_META[day].label} intermediate stop order for ${state.travelMode}.`
      );
    }

    const totalDistKm = ((route.distanceMeters || 0) / 1000).toFixed(1);
    const totalSec = parseDurationString(route.duration);
    const polylines =
      Array.isArray(route.encodedPolylines) && route.encodedPolylines.length > 0
        ? route.encodedPolylines
        : route.polyline?.encodedPolyline
          ? [route.polyline.encodedPolyline]
          : [];

    state.routeSummaries[day] = {
      distanceKm: totalDistKm,
      durationText: formatDurationSeconds(totalSec),
      polylines,
    };
    state.legMetrics[day] = (route.legs || []).map((leg) => ({
      distanceKm: ((leg.distanceMeters || 0) / 1000).toFixed(1),
      durationText: formatDurationSeconds(parseDurationString(leg.duration)),
    }));
  } catch (err) {
    state.routeSummaries[day] = {
      error: err.message || "Route unavailable for current travel mode.",
      polylines: [],
    };
  }

  renderRouteSummary();
  renderItinerary();
  renderMapAnnotations();
}

function renderRouteSummary() {
  const day = state.activeDay;
  const stops = state.days[day];
  const summary = state.routeSummaries[day];
  dom.routeModeBadge.textContent = state.travelMode;
  dom.optimizeBtn.disabled = stops.length < 4 || state.travelMode === "TRANSIT";

  if (stops.length < 2) {
    dom.routeSummaryText.textContent = "Add 2+ stops to compute route";
    return;
  }
  if (!summary) {
    dom.routeSummaryText.textContent = `${stops.length} stops ready`;
    return;
  }
  if (summary.error) {
    dom.routeSummaryText.textContent = summary.error;
    return;
  }
  dom.routeSummaryText.textContent = `${stops.length} stops · ${summary.distanceKm} km · ${summary.durationText}`;
}

function renderItinerary() {
  dom.day1Count.textContent = String(state.days[1].length);
  dom.day2Count.textContent = String(state.days[2].length);

  const tabs = dom.dayTabsContainer.querySelectorAll(".day-tab");
  tabs.forEach((tab) => {
    const dayNum = Number(tab.dataset.day);
    const isActive = dayNum === state.activeDay;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  const stops = state.days[state.activeDay];
  const legs = state.legMetrics[state.activeDay] || [];

  if (stops.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `No stops scheduled for Day ${state.activeDay}. Add attractions, restaurants, or hotels below.`;
    dom.stopsList.replaceChildren(empty);
    renderRouteSummary();
    return;
  }

  const fragment = document.createDocumentFragment();
  stops.forEach((stop, index) => {
    const card = document.createElement("article");
    card.className = `stop-card${state.selectedPlaceId === stop.id ? " selected" : ""}`;

    const badge = document.createElement("span");
    badge.className = `stop-number day-${state.activeDay}`;
    badge.textContent = String(index + 1);

    const info = document.createElement("div");
    info.className = "stop-info";

    const nameEl = document.createElement("h3");
    nameEl.className = "stop-name";
    nameEl.textContent = stop.name;

    const metaEl = document.createElement("p");
    metaEl.className = "stop-meta";
    const ratingPart = stop.rating ? `★ ${stop.rating.toFixed(1)}` : "Unrated";
    metaEl.textContent = `${stop.typeLabel} · ${ratingPart}`;

    info.append(nameEl, metaEl);

    if (index < legs.length && legs[index]) {
      const legEl = document.createElement("p");
      legEl.className = "stop-leg-info";
      legEl.textContent = `Next leg: ${legs[index].distanceKm} km (${legs[index].durationText})`;
      info.append(legEl);
    }

    const actions = document.createElement("div");
    actions.className = "stop-actions";

    const svBtn = document.createElement("button");
    svBtn.type = "button";
    svBtn.className = "icon-btn";
    svBtn.title = "Inspect Street View";
    svBtn.textContent = "SV";
    svBtn.addEventListener("click", () => {
      state.selectedPlaceId = stop.id;
      inspectStreetView(stop, true);
      renderItinerary();
    });

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "icon-btn";
    upBtn.title = "Move stop earlier";
    upBtn.textContent = "↑";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", () => moveStop(index, -1));

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "icon-btn";
    downBtn.title = "Move stop later";
    downBtn.textContent = "↓";
    downBtn.disabled = index === stops.length - 1;
    downBtn.addEventListener("click", () => moveStop(index, 1));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn danger";
    delBtn.title = "Remove stop";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => removeStop(index));

    actions.append(svBtn, upBtn, downBtn, delBtn);
    card.append(badge, info, actions);
    fragment.append(card);
  });

  dom.stopsList.replaceChildren(fragment);
  renderRouteSummary();
}

function renderDiscoveryLoading() {
  const box = document.createElement("div");
  box.className = "empty-state";
  box.textContent = `Fetching live ${state.activeCategory} in ${state.destination.name}...`;
  dom.discoveryList.replaceChildren(box);
}

function renderDiscoveryList() {
  const tabs = dom.categoryTabsContainer.querySelectorAll(".category-tab");
  tabs.forEach((tab) => {
    const active = tab.dataset.category === state.activeCategory;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  const places = state.discoveryResults;
  dom.discoveryCount.textContent = `${places.length} place${places.length === 1 ? "" : "s"}`;

  if (places.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.config?.hasApiKey
      ? "No places matched your filter. Try another category or keyword."
      : "Configure GOOGLE_MAPS_API_KEY in .env to load live Google Places attractions, restaurants, and hotels.";
    dom.discoveryList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  places.forEach((place) => {
    const card = document.createElement("article");
    card.className = "place-card";

    const media = document.createElement("div");
    media.className = "place-card-media";

    if (place.photoName) {
      const img = document.createElement("img");
      img.className = "place-card-img";
      img.alt = place.name;
      img.loading = "lazy";
      img.src = `/api/places/photo?name=${encodeURIComponent(place.photoName)}&maxWidthPx=480`;
      img.addEventListener("error", () => {
        const fallback = document.createElement("div");
        fallback.className = "place-card-placeholder";
        fallback.textContent = place.typeLabel;
        media.replaceChildren(fallback, chip);
      });
      media.append(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "place-card-placeholder";
      placeholder.textContent = place.typeLabel;
      media.append(placeholder);
    }

    const chip = document.createElement("span");
    chip.className = "place-type-chip";
    chip.textContent = place.typeLabel;
    media.append(chip);

    const body = document.createElement("div");
    body.className = "place-card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "place-card-title-row";

    const title = document.createElement("h3");
    title.className = "place-card-title";
    title.textContent = place.name;

    const rating = document.createElement("span");
    rating.className = "place-rating";
    rating.textContent = place.rating
      ? `★ ${place.rating.toFixed(1)} (${place.userRatingCount.toLocaleString()})`
      : "No ratings";

    titleRow.append(title, rating);

    const address = document.createElement("p");
    address.className = "place-address";
    address.textContent = place.address;

    const hours = document.createElement("p");
    hours.className = "place-hours";
    hours.textContent = getTodayHoursText(place);

    const actions = document.createElement("div");
    actions.className = "place-card-actions";

    const addDay1Btn = document.createElement("button");
    addDay1Btn.type = "button";
    addDay1Btn.className = "card-btn day1";
    addDay1Btn.textContent = "+ Day 1";
    addDay1Btn.addEventListener("click", () => addStopToDay(place, 1));

    const addDay2Btn = document.createElement("button");
    addDay2Btn.type = "button";
    addDay2Btn.className = "card-btn day2";
    addDay2Btn.textContent = "+ Day 2";
    addDay2Btn.addEventListener("click", () => addStopToDay(place, 2));

    const svBtn = document.createElement("button");
    svBtn.type = "button";
    svBtn.className = "card-btn sv";
    svBtn.textContent = "Street View";
    svBtn.addEventListener("click", () => {
      state.selectedPlaceId = place.id;
      inspectStreetView(place, true);
    });

    actions.append(addDay1Btn, addDay2Btn, svBtn);

    if (place.googleMapsUri) {
      const mapsLink = document.createElement("a");
      mapsLink.className = "card-btn";
      mapsLink.href = place.googleMapsUri;
      mapsLink.target = "_blank";
      mapsLink.rel = "noopener noreferrer";
      mapsLink.textContent = "Maps ↗";
      actions.append(mapsLink);
    }

    body.append(titleRow, address, hours, actions);
    card.append(media, body);
    fragment.append(card);
  });

  dom.discoveryList.replaceChildren(fragment);
}

async function addStopToDay(place, day) {
  const existing = state.days[day];
  if (!existing.some((s) => s.id === place.id)) {
    existing.push(place);
  }
  state.activeDay = day;
  state.selectedPlaceId = place.id;
  renderItinerary();
  await recomputeActiveRoute(false);
  await inspectStreetView(place, true);
}

async function moveStop(index, delta) {
  const stops = state.days[state.activeDay];
  const target = index + delta;
  if (target < 0 || target >= stops.length) return;
  const copy = [...stops];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  state.days[state.activeDay] = copy;
  renderItinerary();
  await recomputeActiveRoute(false);
}

async function removeStop(index) {
  const stops = state.days[state.activeDay];
  stops.splice(index, 1);
  renderItinerary();
  await recomputeActiveRoute(false);
}

function clearMapMarkers() {
  for (const m of gmp.markers) {
    m.map = null;
  }
  gmp.markers = [];
}

function clearMapPolylines() {
  for (const p of gmp.polylines) {
    p.setMap(null);
  }
  gmp.polylines = [];
}

function openPlaceInfoWindow(marker, place, stopNumber = null) {
  if (!gmp.infoWindow || !gmp.map) return;
  const container = document.createElement("div");
  container.className = "iw-card";

  const title = document.createElement("h4");
  title.className = "iw-title";
  title.textContent = stopNumber ? `${stopNumber}. ${place.name}` : place.name;

  const addr = document.createElement("p");
  addr.className = "iw-address";
  addr.textContent = place.address;

  const rating = document.createElement("p");
  rating.className = "iw-rating";
  rating.textContent = place.rating
    ? `★ ${place.rating.toFixed(1)} (${place.userRatingCount.toLocaleString()} reviews)`
    : place.typeLabel;

  const svBtn = document.createElement("button");
  svBtn.type = "button";
  svBtn.className = "iw-btn";
  svBtn.textContent = "Inspect Street View";
  svBtn.addEventListener("click", () => {
    inspectStreetView(place, false);
  });

  container.append(title, addr, rating, svBtn);
  gmp.infoWindow.setContent(container);
  gmp.infoWindow.open({ anchor: marker, map: gmp.map });
}

function renderMapPolylines() {
  clearMapPolylines();
  if (!gmp.map || !gmp.libs.maps || !gmp.libs.geometry) return;

  const summary = state.routeSummaries[state.activeDay];
  const polylines = summary?.polylines || [];
  const { Polyline } = gmp.libs.maps;
  const { encoding } = gmp.libs.geometry;
  const dayColor = DAY_META[state.activeDay].color;

  for (const encoded of polylines) {
    if (!encoded) continue;
    const path = encoding.decodePath(encoded);
    const poly = new Polyline({
      path,
      map: gmp.map,
      strokeColor: dayColor,
      strokeOpacity: 0.9,
      strokeWeight: 5,
      geodesic: true,
    });
    gmp.polylines.push(poly);
  }
}

function renderMapAnnotations() {
  clearMapMarkers();
  renderMapPolylines();

  if (!gmp.map || !gmp.libs.marker || !gmp.libs.core) return;
  const { AdvancedMarkerElement, PinElement } = gmp.libs.marker;
  const { LatLngBounds } = gmp.libs.core;

  const activeStops = state.days[state.activeDay];
  const dayMeta = DAY_META[state.activeDay];
  const activeIds = new Set(activeStops.map((s) => s.id));
  const bounds = new LatLngBounds();
  let hasBounds = false;

  // Numbered day-colored AdvancedMarkerElement pins for the active itinerary day
  activeStops.forEach((stop, index) => {
    const pin = new PinElement({
      glyphText: String(index + 1),
      glyphColor: "#ffffff",
      background: dayMeta.color,
      borderColor: dayMeta.border,
      scale: 1.15,
    });

    const marker = new AdvancedMarkerElement({
      map: gmp.map,
      position: stop.location,
      title: `${dayMeta.label} Stop ${index + 1}: ${stop.name}`,
      content: pin,
      zIndex: 200 + index,
    });

    marker.addListener("click", () => {
      state.selectedPlaceId = stop.id;
      openPlaceInfoWindow(marker, stop, index + 1);
      inspectStreetView(stop, false);
    });

    gmp.markers.push(marker);
    bounds.extend(stop.location);
    hasBounds = true;
  });

  // Discovery pins for non-scheduled places in the current category
  state.discoveryResults.forEach((place) => {
    if (activeIds.has(place.id)) return;
    const pin = new PinElement({
      background: "#334155",
      borderColor: "#0f172a",
      glyphColor: "#ffffff",
      scale: 0.85,
    });

    const marker = new AdvancedMarkerElement({
      map: gmp.map,
      position: place.location,
      title: place.name,
      content: pin,
      zIndex: 50,
    });

    marker.addListener("click", () => {
      state.selectedPlaceId = place.id;
      openPlaceInfoWindow(marker, place);
      inspectStreetView(place, false);
    });

    gmp.markers.push(marker);
    if (activeStops.length === 0) {
      bounds.extend(place.location);
      hasBounds = true;
    }
  });

  if (hasBounds && (activeStops.length > 1 || state.discoveryResults.length > 0)) {
    gmp.map.fitBounds(bounds, 60);
  }
}

async function inspectStreetView(place, panMap = true) {
  if (!place) return;
  dom.svTitle.textContent = place.name;

  if (panMap && gmp.map) {
    gmp.map.panTo(place.location);
    if ((gmp.map.getZoom() || 12) < 14) {
      gmp.map.setZoom(14);
    }
  }

  if (!gmp.svService || !gmp.panorama || !gmp.libs.streetView) {
    dom.svStatus.textContent = "Street View ready when Maps loads";
    return;
  }

  dom.svStatus.textContent = "Loading 360° panorama...";
  const { StreetViewPreference } = gmp.libs.streetView;

  try {
    const response = await gmp.svService.getPanorama({
      location: place.location,
      radius: 250,
      preference: StreetViewPreference.BEST,
    });
    const panoId = response?.data?.location?.pano;
    if (!panoId) {
      throw new Error("No panorama found");
    }
    gmp.panorama.setPano(panoId);
    gmp.panorama.setPov({ heading: 25, pitch: 4 });
    gmp.panorama.setVisible(true);
    dom.svEmpty.classList.add("hidden");
    dom.svStatus.textContent = "360° Panorama active";
  } catch {
    gmp.panorama.setVisible(false);
    dom.svEmpty.textContent = `No outdoor Street View panorama found near ${place.name}.`;
    dom.svEmpty.classList.remove("hidden");
    dom.svStatus.textContent = "No Street View nearby";
  }
}

function mountPlaceAutocomplete() {
  const { PlaceAutocompleteElement } = gmp.libs.places || {};
  if (!PlaceAutocompleteElement) return;

  const autocompleteEl = new PlaceAutocompleteElement({
    placeholder: "Search destination city or landmark...",
  });
  autocompleteEl.setAttribute("data-testid", "destination-search-input");
  autocompleteEl.setAttribute("aria-label", "Search destination city or landmark");

  autocompleteEl.addEventListener("gmp-select", async (event) => {
    try {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "rating",
          "userRatingCount",
          "regularOpeningHours",
          "photos",
          "primaryTypeDisplayName",
          "googleMapsUri",
          "utcOffsetMinutes",
        ],
      });

      const loc = place.location;
      if (!loc) return;
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      const name = place.displayName || "Selected Destination";

      const isCity =
        Array.isArray(place.types) &&
        (place.types.includes("locality") || place.types.includes("administrative_area_level_1"));

      const seedPlace = isCity
        ? null
        : {
            id: place.id || `${lat.toFixed(5)},${lng.toFixed(5)}`,
            name,
            address: place.formattedAddress || "",
            location: { lat, lng },
            rating: typeof place.rating === "number" ? place.rating : null,
            userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
            typeLabel: place.primaryTypeDisplayName || "Selected Landmark",
            photoName: place.photos?.[0]?.name || null,
            weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions || [],
            openNow: null,
            googleMapsUri: place.googleMapsUri || null,
          };

      await loadDestinationData(
        {
          name,
          displayName: place.formattedAddress || name,
          lat,
          lng,
          zoom: 12,
          utcOffsetMinutes: place.utcOffsetMinutes,
        },
        seedPlace
      );
    } catch (err) {
      showStatus(err.message || "Unable to load selected destination.", true);
    }
  });

  autocompleteEl.addEventListener("gmp-error", () => {
    showStatus("Place Autocomplete encountered an API key or quota error.", true);
  });

  dom.searchHost.replaceChildren(autocompleteEl);
}

async function initGoogleMaps() {
  if (!state.config?.hasApiKey || !state.config.googleMapsApiKey) {
    showStatus(
      "GOOGLE_MAPS_API_KEY is not configured in .env. Add a valid key or Maps Demo Key to load the interactive map, Places, Routes, Time Zone, and Street View.",
      false
    );
    return;
  }

  loadMapsBootstrap(state.config.googleMapsApiKey);

  const [mapsLib, markerLib, placesLib, streetViewLib, geometryLib, coreLib] =
    await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
      google.maps.importLibrary("places"),
      google.maps.importLibrary("streetView"),
      google.maps.importLibrary("geometry"),
      google.maps.importLibrary("core"),
    ]);

  gmp.libs = {
    maps: mapsLib,
    marker: markerLib,
    places: placesLib,
    streetView: streetViewLib,
    geometry: geometryLib,
    core: coreLib,
  };

  const { Map, InfoWindow } = mapsLib;
  const { StreetViewPanorama, StreetViewService } = streetViewLib;

  gmp.map = new Map(dom.mapContainer, {
    center: { lat: state.destination.lat, lng: state.destination.lng },
    zoom: state.destination.zoom,
    mapId: state.config.mapId || "DEMO_MAP_ID",
    internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  gmp.infoWindow = new InfoWindow();
  gmp.svService = new StreetViewService();
  gmp.panorama = new StreetViewPanorama(dom.svCanvas, {
    addressControl: false,
    linksControl: true,
    panControl: true,
    enableCloseButton: false,
    visible: false,
  });

  mountPlaceAutocomplete();
}

function bindEvents() {
  dom.quickSelect.addEventListener("change", async (e) => {
    const key = e.target.value;
    const preset = PRESET_DESTINATIONS[key];
    if (preset) {
      await loadDestinationData(preset);
    }
  });

  dom.fallbackInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const query = dom.fallbackInput.value.trim();
    if (!query || !state.config?.hasApiKey) return;
    try {
      const results = await apiSearchPlaces(query);
      if (results.length > 0) {
        const first = results[0];
        await loadDestinationData(
          {
            name: first.name,
            displayName: first.address || first.name,
            lat: first.location.lat,
            lng: first.location.lng,
            zoom: 12,
          },
          first
        );
      }
    } catch (err) {
      showStatus(err.message || "Search failed.", true);
    }
  });

  dom.dayTabsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".day-tab");
    if (!btn) return;
    const day = Number(btn.dataset.day);
    if (day === state.activeDay) return;
    state.activeDay = day;
    renderItinerary();
    await recomputeActiveRoute(false);
    renderMapAnnotations();
  });

  dom.travelModeSelect.addEventListener("change", async (e) => {
    state.travelMode = e.target.value;
    await recomputeActiveRoute(false);
  });

  dom.optimizeBtn.addEventListener("click", async () => {
    await recomputeActiveRoute(true);
  });

  dom.categoryTabsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".category-tab");
    if (!btn) return;
    state.activeCategory = btn.dataset.category;
    dom.discoveryQueryInput.value = "";
    if (state.config?.hasApiKey) {
      await loadCategoryResults(state.activeCategory);
    } else {
      renderDiscoveryList();
    }
  });

  dom.discoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = dom.discoveryQueryInput.value.trim();
    if (!state.config?.hasApiKey) return;
    await loadCategoryResults(state.activeCategory, q);
  });
}

async function bootstrap() {
  bindEvents();
  startTimezoneClock();

  try {
    const resp = await fetch("/api/config");
    state.config = await resp.json();
  } catch {
    state.config = { hasApiKey: false, googleMapsApiKey: "" };
  }

  try {
    await initGoogleMaps();
  } catch (err) {
    showStatus(err.message || "Failed to initialize Google Maps.", true);
  }

  await loadDestinationData(PRESET_DESTINATIONS.tokyo);
}

bootstrap();
