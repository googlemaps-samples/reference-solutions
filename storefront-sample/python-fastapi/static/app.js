/**
 * 450 Sutter Dental Specialists — Interactive Storefront & Directions Client
 * Uses Google Maps JavaScript API v=weekly (Dynamic Library Import),
 * AdvancedMarkerElement, PlaceAutocompleteElement, StreetViewPanorama,
 * and FastAPI BFF proxies for Places API (New) and Routes API v2.
 */

const ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0";

const TRAVEL_MODE_META = {
  DRIVE: { label: "Driving", color: "#0f766e", dashed: false },
  TRANSIT: { label: "Public Transit", color: "#4f46e5", dashed: false },
  WALK: { label: "Walking", color: "#059669", dashed: true },
};

const state = {
  config: null,
  map: null,
  panorama: null,
  clinicLocation: { lat: 37.7896, lng: -122.4076 },
  originLocation: {
    label: "Ferry Building, San Francisco, CA",
    lat: 37.7955,
    lng: -122.3937,
  },
  clinicMarker: null,
  clinicPinLabelEl: null,
  originMarker: null,
  originPinLabelEl: null,
  clinicInfoWindow: null,
  coverageCircle: null,
  coverageVisible: true,
  routePolyline: null,
  activeTravelMode: "DRIVE",
  viewMode: "map", // "map" | "split" | "streetview"
  mapsLoaded: false,
};

function clearElement(el) {
  el.replaceChildren();
}

function createEl(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      node.setAttribute(k, v);
    }
  }
  return node;
}

function isSafeHttpUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Official Google Maps JavaScript API Dynamic Library Import bootstrap.
 * See: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 */
function bootstrapMapsJsApi(params) {
  return ((g) => {
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
      (h = new Promise((resolve, reject) => {
        a = m.createElement("script");
        e.set("libraries", [...r] + "");
        for (k in g) {
          e.set(
            k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
            g[k]
          );
        }
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = resolve;
        a.onerror = () => {
          h = reject(new Error(p + " could not load."));
        };
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
    if (!d[l]) {
      d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
    }
    return d[l];
  })(params);
}

/**
 * Computes open-now status on the weekly channel without calling beta-only Place.isOpen().
 */
function computeOpenStatus(place) {
  const currentOpen = place?.currentOpeningHours?.openNow;
  if (typeof currentOpen === "boolean") {
    return currentOpen;
  }
  const regularOpen = place?.regularOpeningHours?.openNow;
  if (typeof regularOpen === "boolean") {
    return regularOpen;
  }

  const periods = place?.regularOpeningHours?.periods;
  if (!Array.isArray(periods) || periods.length === 0) {
    return null;
  }

  try {
    const now = new Date();
    const sfParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayStr = sfParts.find((p) => p.type === "weekday")?.value || "Mon";
    const hourNum = Number(sfParts.find((p) => p.type === "hour")?.value || 0);
    const minuteNum = Number(sfParts.find((p) => p.type === "minute")?.value || 0);
    const currentDay = weekdayMap[dayStr] ?? 1;
    const currentMinutes = currentDay * 1440 + hourNum * 60 + minuteNum;

    for (const period of periods) {
      const open = period.open;
      const close = period.close;
      if (!open) continue;
      if (!close && open.day === 0 && open.hour === 0 && open.minute === 0) {
        return true;
      }
      const start = (open.day ?? 0) * 1440 + (open.hour ?? 0) * 60 + (open.minute ?? 0);
      if (!close) continue;
      let end = (close.day ?? 0) * 1440 + (close.hour ?? 0) * 60 + (close.minute ?? 0);
      if (end <= start) end += 7 * 1440;
      const testMinutes = currentMinutes < start ? currentMinutes + 7 * 1440 : currentMinutes;
      if (testMinutes >= start && testMinutes < end) {
        return true;
      }
    }
    return false;
  } catch {
    return null;
  }
}

function updateStatusPill(el, isOpen) {
  el.classList.remove("status-pill--open", "status-pill--closed", "status-pill--loading");
  if (isOpen === true) {
    el.textContent = "Open Now";
    el.classList.add("status-pill--open");
  } else if (isOpen === false) {
    el.textContent = "Closed Now";
    el.classList.add("status-pill--closed");
  } else {
    el.textContent = "Hours Unavailable";
    el.classList.add("status-pill--loading");
  }
}

function formatDurationSeconds(durationStr) {
  if (!durationStr || !durationStr.endsWith("s")) return "--";
  const totalSeconds = Number.parseInt(durationStr.slice(0, -1), 10);
  if (!Number.isFinite(totalSeconds)) return "--";
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistanceMeters(meters) {
  if (!Number.isFinite(meters)) return "--";
  const miles = meters / 1609.344;
  return miles >= 0.2 ? `${miles.toFixed(1)} mi` : `${Math.round(meters * 3.28084)} ft`;
}

function createClinicPinElement(labelText) {
  const badge = createEl("div", { className: "clinic-pin-badge" });
  const dot = createEl("span", { className: "clinic-pin-dot" });
  const label = createEl("span", { text: labelText });
  badge.append(dot, label);
  return { container: badge, labelEl: label };
}

function createOriginPinElement(labelText) {
  const badge = createEl("div", { className: "origin-pin-badge" });
  const text = createEl("span", { text: `Origin: ${labelText}` });
  badge.append(text);
  return { container: badge, labelEl: text };
}

function renderMissingKeyState() {
  const banner = document.getElementById("venue-status-banner");
  banner.classList.remove("hidden");
  clearElement(banner);
  banner.append(
    createEl("strong", { text: "Google Maps API Key Required" }),
    createEl("span", {
      text: "Copy .env.example to .env and set GOOGLE_MAPS_API_KEY (a free Maps Demo Key works for prototyping) to load live map tiles, clinic reviews, Street View, and directions.",
    })
  );

  const mapContainer = document.getElementById("map-container");
  clearElement(mapContainer);
  const notice = createEl("div", { className: "fallback-map-notice" });
  notice.append(
    createEl("h2", { text: "Map & Directions Awaiting API Key" }),
    createEl("p", {
      text: "Set GOOGLE_MAPS_API_KEY in .env and restart the FastAPI server to activate the interactive Google Map, Places API (New) storefront, Street View panorama, and Routes API v2.",
    })
  );
  mapContainer.append(notice);

  updateStatusPill(document.getElementById("header-open-badge"), null);
  updateStatusPill(document.getElementById("venue-open-status"), null);
}

function renderClinicDetails(place) {
  if (!place) return;

  const displayName = place.displayName?.text || "450 Sutter Dental Specialists";
  const address = place.formattedAddress || "450 Sutter St, San Francisco, CA 94108";
  const phone = place.nationalPhoneNumber || "Unavailable";
  const isOpen = computeOpenStatus(place);

  document.getElementById("header-clinic-name").textContent = displayName;
  document.getElementById("header-clinic-meta").textContent = `${address}${phone !== "Unavailable" ? ` • ${phone}` : ""}`;
  document.getElementById("venue-name").textContent = displayName;
  document.getElementById("venue-address").textContent = address;
  document.getElementById("venue-phone").textContent = phone;

  updateStatusPill(document.getElementById("header-open-badge"), isOpen);
  updateStatusPill(document.getElementById("venue-open-status"), isOpen);

  const websiteEl = document.getElementById("venue-website");
  clearElement(websiteEl);
  if (isSafeHttpUrl(place.websiteUri)) {
    const link = createEl("a", {
      text: place.websiteUri.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      attrs: {
        href: place.websiteUri,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });
    websiteEl.append(link);
  } else {
    websiteEl.textContent = "Not listed";
  }

  const mapsLink = document.getElementById("venue-maps-link");
  if (isSafeHttpUrl(place.googleMapsUri)) {
    mapsLink.href = place.googleMapsUri;
  }

  document.getElementById("venue-rating-value").textContent =
    typeof place.rating === "number" ? place.rating.toFixed(1) : "N/A";
  document.getElementById("venue-rating-count").textContent =
    typeof place.userRatingCount === "number"
      ? `(${place.userRatingCount.toLocaleString()} Google reviews)`
      : "(No review count)";

  // Weekly hours
  const hoursList = document.getElementById("venue-hours-list");
  clearElement(hoursList);
  const descriptions = place.regularOpeningHours?.weekdayDescriptions || [];
  if (descriptions.length > 0) {
    for (const line of descriptions) {
      hoursList.append(createEl("li", { text: line }));
    }
  } else {
    hoursList.append(createEl("li", { className: "muted-text", text: "Schedule not published." }));
  }

  // Photos (proxied via /api/places/photo without exposing API key)
  const photosStrip = document.getElementById("venue-photos-strip");
  clearElement(photosStrip);
  const photos = Array.isArray(place.photos) ? place.photos.slice(0, 4) : [];
  if (photos.length > 0) {
    for (const photo of photos) {
      if (!photo.name) continue;
      const figure = createEl("figure", { className: "photo-card" });
      const img = createEl("img", {
        attrs: {
          src: `/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=640`,
          alt: `${displayName} clinic photo`,
          loading: "lazy",
        },
      });
      figure.append(img);

      const authorName = photo.authorAttributions?.[0]?.displayName;
      if (authorName) {
        figure.append(createEl("figcaption", { className: "photo-attribution", text: `Photo: ${authorName}` }));
      }
      photosStrip.append(figure);
    }
  } else {
    photosStrip.append(createEl("div", { className: "photo-skeleton", text: "No storefront photos returned." }));
  }

  // User reviews
  const reviewsList = document.getElementById("venue-reviews-list");
  clearElement(reviewsList);
  const reviews = Array.isArray(place.reviews) ? place.reviews.slice(0, 5) : [];
  if (reviews.length > 0) {
    for (const rev of reviews) {
      const card = createEl("article", { className: "review-card" });
      const top = createEl("div", { className: "review-top" });
      const author = createEl("span", {
        className: "review-author",
        text: rev.authorAttribution?.displayName || "Google Reviewer",
      });
      const stars = createEl("span", {
        className: "review-stars",
        text: typeof rev.rating === "number" ? `${"★".repeat(Math.round(rev.rating))} ${rev.rating}/5` : "",
      });
      top.append(author, stars);

      const timeEl = createEl("span", {
        className: "review-time",
        text: rev.relativePublishTimeDescription || "",
      });

      const bodyText = rev.text?.text || rev.originalText?.text || "";
      const bodyEl = createEl("p", {
        className: "review-text",
        text: bodyText || "Rated without comment.",
      });

      card.append(top, timeEl, bodyEl);
      reviewsList.append(card);
    }
  } else {
    reviewsList.append(
      createEl("p", {
        className: "muted-text",
        text: "No Google Places reviews returned for this query.",
      })
    );
  }
}

async function fetchLiveClinicDetails() {
  try {
    const response = await fetch("/api/places/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textQuery: state.config.clinicDefaults.query,
        languageCode: "en",
        regionCode: "US",
        locationBias: {
          center: state.config.clinicDefaults.center,
          radius: 5000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Places proxy returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const place = payload.place;
    if (!place) return;

    renderClinicDetails(place);

    if (place.location?.latitude && place.location?.longitude) {
      state.clinicLocation = {
        lat: place.location.latitude,
        lng: place.location.longitude,
      };
      if (state.clinicMarker) {
        state.clinicMarker.position = state.clinicLocation;
        const shortTitle = place.displayName?.text || "450 Sutter Dental";
        if (state.clinicPinLabelEl) {
          state.clinicPinLabelEl.textContent = shortTitle;
        }
      }
      if (state.coverageCircle) {
        state.coverageCircle.setCenter(state.clinicLocation);
      }
      if (state.clinicInfoWindow) {
        const content = createEl("div");
        content.append(
          createEl("strong", { text: place.displayName?.text || "450 Sutter Dental" }),
          createEl("div", { text: place.formattedAddress || "" })
        );
        state.clinicInfoWindow.setContent(content);
      }
    }
  } catch (err) {
    const banner = document.getElementById("venue-status-banner");
    banner.classList.remove("hidden");
    clearElement(banner);
    banner.append(
      createEl("strong", { text: "Unable to load live clinic details" }),
      createEl("span", { text: err.message || "Check Places API (New) availability." })
    );
  }
}

async function initStreetView() {
  if (!state.mapsLoaded) return;
  const statusEl = document.getElementById("street-view-status");
  const container = document.getElementById("street-view-container");

  try {
    const { StreetViewPanorama, StreetViewService, StreetViewPreference, StreetViewSource } =
      await google.maps.importLibrary("streetView");
    const { spherical } = await google.maps.importLibrary("geometry");

    const svService = new StreetViewService();
    const response = await svService.getPanorama({
      location: state.clinicLocation,
      radius: 80,
      preference: StreetViewPreference.BEST,
      source: StreetViewSource.OUTDOOR,
    });

    const panoData = response?.data;
    const panoLatLng = panoData?.location?.latLng;
    const heading = panoLatLng
      ? spherical.computeHeading(panoLatLng, state.clinicLocation)
      : 0;

    state.panorama = new StreetViewPanorama(container, {
      pano: panoData?.location?.pano,
      pov: { heading, pitch: 8 },
      zoom: 1,
      visible: true,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
    });

    statusEl.textContent = panoData?.location?.shortDescription || "450 Sutter St Entrance";
  } catch {
    statusEl.textContent = "Street-level imagery unavailable for this location.";
  }
}

async function computeAndDrawRoute(travelMode = state.activeTravelMode) {
  state.activeTravelMode = travelMode;
  const modeMeta = TRAVEL_MODE_META[travelMode] || TRAVEL_MODE_META.DRIVE;

  document.getElementById("route-mode-label").textContent = modeMeta.label;
  document.getElementById("route-status-note").textContent =
    `Calculating ${modeMeta.label.toLowerCase()} directions from ${state.originLocation.label}…`;

  try {
    const response = await fetch("/api/routes/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: {
          lat: state.originLocation.lat,
          lng: state.originLocation.lng,
        },
        destination: state.clinicLocation,
        travelMode,
        units: "IMPERIAL",
      }),
    });

    if (!response.ok) {
      throw new Error(`Routes proxy returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.available || !data.encodedPolyline) {
      document.getElementById("route-duration-value").textContent = "--";
      document.getElementById("route-distance-value").textContent = "--";
      document.getElementById("route-status-note").textContent =
        data.message || `No ${modeMeta.label.toLowerCase()} route available for this selection.`;
      if (state.routePolyline) {
        state.routePolyline.setMap(null);
      }
      return;
    }

    const durationText = data.durationText || formatDurationSeconds(data.duration);
    const distanceText = data.distanceText || formatDistanceMeters(data.distanceMeters);

    document.getElementById("route-duration-value").textContent = durationText;
    document.getElementById("route-distance-value").textContent = distanceText;
    document.getElementById("route-status-note").textContent =
      `${modeMeta.label} route from ${state.originLocation.label} to clinic.`;

    if (!state.mapsLoaded || !state.map) return;

    const { Polyline } = await google.maps.importLibrary("maps");
    const { LatLngBounds } = await google.maps.importLibrary("core");
    const { encoding } = await google.maps.importLibrary("geometry");

    const decodedPath = encoding.decodePath(data.encodedPolyline);
    if (state.routePolyline) {
      state.routePolyline.setMap(null);
    }

    const polylineOptions = {
      path: decodedPath,
      map: state.map,
      strokeColor: modeMeta.color,
      strokeOpacity: modeMeta.dashed ? 0.0 : 0.9,
      strokeWeight: 5,
    };

    if (modeMeta.dashed) {
      polylineOptions.icons = [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 1,
            scale: 3.5,
            strokeColor: modeMeta.color,
          },
          offset: "0",
          repeat: "14px",
        },
      ];
    }

    state.routePolyline = new Polyline(polylineOptions);

    const bounds = new LatLngBounds();
    bounds.extend(state.clinicLocation);
    bounds.extend({ lat: state.originLocation.lat, lng: state.originLocation.lng });
    for (const pt of decodedPath) {
      bounds.extend(pt);
    }
    state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 64, left: 48 });
  } catch (err) {
    document.getElementById("route-status-note").textContent =
      `Unable to compute route (${err.message || "Routes API error"}).`;
  }
}

async function initOriginAutocomplete() {
  const host = document.getElementById("origin-autocomplete-container");
  clearElement(host);

  const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

  const autocompleteEl = new PlaceAutocompleteElement({
    locationBias: {
      center: state.clinicLocation,
      radius: 25000,
    },
    includedRegionCodes: ["us"],
    placeholder: "Enter starting address in San Francisco...",
    internalUsageAttributionIds: [ATTRIBUTION_ID],
  });

  autocompleteEl.value = state.originLocation.label;
  autocompleteEl.setAttribute("aria-label", "Visitor starting address in San Francisco");

  autocompleteEl.addEventListener("gmp-select", async (event) => {
    const prediction = event?.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      if (!place.location) return;

      const label = place.displayName || place.formattedAddress || "Selected Origin";
      state.originLocation = {
        label,
        lat: place.location.lat(),
        lng: place.location.lng(),
      };

      document.getElementById("origin-active-caption").textContent = `Origin: ${label}`;

      if (state.originMarker) {
        state.originMarker.position = {
          lat: state.originLocation.lat,
          lng: state.originLocation.lng,
        };
        if (state.originPinLabelEl) {
          state.originPinLabelEl.textContent = `Origin: ${label.split(",")[0]}`;
        }
      }

      await computeAndDrawRoute(state.activeTravelMode);
    } catch {
      document.getElementById("route-status-note").textContent =
        "Could not resolve selected address. Try another San Francisco address.";
    }
  });

  autocompleteEl.addEventListener("gmp-error", () => {
    document.getElementById("route-status-note").textContent =
      "Autocomplete request could not be completed. Check your API key permissions.";
  });

  host.append(autocompleteEl);
  state.autocompleteEl = autocompleteEl;
}

function setViewMode(mode) {
  state.viewMode = mode;
  const viewport = document.getElementById("viewport-column");
  const mapWrapper = document.getElementById("map-wrapper");
  const svWrapper = document.getElementById("street-view-wrapper");
  const svToggle = document.getElementById("street-view-toggle");

  viewport.classList.remove("viewport-column--map", "viewport-column--split", "viewport-column--streetview");

  if (mode === "split") {
    viewport.classList.add("viewport-column--split");
    mapWrapper.classList.remove("hidden");
    svWrapper.classList.remove("hidden");
    svToggle.classList.add("control-btn--active");
    svToggle.setAttribute("aria-pressed", "true");
  } else if (mode === "streetview") {
    viewport.classList.add("viewport-column--streetview");
    mapWrapper.classList.add("hidden");
    svWrapper.classList.remove("hidden");
    svToggle.classList.add("control-btn--active");
    svToggle.setAttribute("aria-pressed", "true");
  } else {
    viewport.classList.add("viewport-column--map");
    mapWrapper.classList.remove("hidden");
    svWrapper.classList.add("hidden");
    svToggle.classList.remove("control-btn--active");
    svToggle.setAttribute("aria-pressed", "false");
  }

  for (const btn of document.querySelectorAll("[data-view-mode]")) {
    const active = btn.dataset.viewMode === mode;
    btn.classList.toggle("mode-pill--active", active);
    btn.setAttribute("aria-pressed", String(active));
  }

  if (state.mapsLoaded) {
    if (state.map && mode !== "streetview") {
      google.maps.event.trigger(state.map, "resize");
    }
    if (state.panorama && mode !== "map") {
      google.maps.event.trigger(state.panorama, "resize");
    }
  }
}

function bindUiEvents() {
  // Coverage 3.5 km circle toggle
  const coverageBtn = document.getElementById("coverage-overlay-toggle");
  coverageBtn.addEventListener("click", () => {
    state.coverageVisible = !state.coverageVisible;
    coverageBtn.classList.toggle("control-btn--active", state.coverageVisible);
    coverageBtn.setAttribute("aria-pressed", String(state.coverageVisible));
    document.getElementById("legend-coverage-item").classList.toggle("hidden", !state.coverageVisible);
    if (state.coverageCircle) {
      state.coverageCircle.setMap(state.coverageVisible ? state.map : null);
    }
  });

  // Street View entrance toggle (toggles Split View vs Map View)
  const streetViewBtn = document.getElementById("street-view-toggle");
  streetViewBtn.addEventListener("click", () => {
    const nextMode = state.viewMode === "map" ? "split" : "map";
    setViewMode(nextMode);
  });

  for (const pill of document.querySelectorAll("[data-view-mode]")) {
    pill.addEventListener("click", () => {
      setViewMode(pill.dataset.viewMode);
    });
  }

  // Travel mode pills
  for (const btn of document.querySelectorAll("[data-mode]")) {
    btn.addEventListener("click", () => {
      const selectedMode = btn.dataset.mode;
      for (const peer of document.querySelectorAll("[data-mode]")) {
        const isCurrent = peer === btn;
        peer.classList.toggle("mode-btn--active", isCurrent);
        peer.setAttribute("aria-pressed", String(isCurrent));
      }
      computeAndDrawRoute(selectedMode);
    });
  }

  // Reset Origin to Ferry Building
  document.getElementById("reset-origin-btn").addEventListener("click", () => {
    const defaultOrigin = state.config?.clinicDefaults?.defaultOrigin || {
      label: "Ferry Building, San Francisco, CA",
      lat: 37.7955,
      lng: -122.3937,
    };
    state.originLocation = { ...defaultOrigin };
    document.getElementById("origin-active-caption").textContent = `Origin: ${defaultOrigin.label}`;
    if (state.autocompleteEl) {
      state.autocompleteEl.value = defaultOrigin.label;
    }
    if (state.originMarker) {
      state.originMarker.position = { lat: defaultOrigin.lat, lng: defaultOrigin.lng };
      if (state.originPinLabelEl) {
        state.originPinLabelEl.textContent = "Origin: Ferry Building";
      }
    }
    computeAndDrawRoute(state.activeTravelMode);
  });

  // Sync visit type radio with coverage circle visibility
  for (const radio of document.querySelectorAll('input[name="visitType"]')) {
    radio.addEventListener("change", (ev) => {
      if (ev.target.value.includes("Home Visit") && !state.coverageVisible) {
        coverageBtn.click();
      }
    });
  }

  // Booking form submission
  const bookingForm = document.getElementById("booking-form");
  const dateInput = document.getElementById("preferred-date");
  const tomorrow = new Date(Date.now() + 86400000);
  dateInput.value = tomorrow.toISOString().split("T")[0];
  dateInput.min = new Date().toISOString().split("T")[0];

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById("booking-submit-btn");
    const confirmationEl = document.getElementById("booking-confirmation");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const formData = new FormData(bookingForm);
    const payload = {
      patientName: String(formData.get("patientName") || "").trim(),
      contactEmail: String(formData.get("contactEmail") || "").trim(),
      contactPhone: String(formData.get("contactPhone") || "").trim(),
      specialty: String(formData.get("specialty") || ""),
      visitType: String(formData.get("visitType") || ""),
      preferredDate: String(formData.get("preferredDate") || ""),
      preferredTime: String(formData.get("preferredTime") || ""),
      notes: String(formData.get("notes") || "").trim(),
    };

    try {
      const resp = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`Booking request failed (HTTP ${resp.status})`);
      }
      const result = await resp.json();
      clearElement(confirmationEl);
      confirmationEl.append(
        createEl("strong", {
          text: `Appointment Request Confirmed (${result.confirmationId})`,
        }),
        createEl("span", {
          text: `${result.patientName} — ${result.specialty} (${result.visitType}) on ${result.preferredDate} at ${result.preferredTime}.`,
        })
      );
      confirmationEl.classList.remove("hidden");
      bookingForm.reset();
      dateInput.value = tomorrow.toISOString().split("T")[0];
    } catch (err) {
      clearElement(confirmationEl);
      confirmationEl.append(
        createEl("strong", { text: "Unable to complete booking request" }),
        createEl("span", { text: err.message || "Please verify your details and try again." })
      );
      confirmationEl.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Request Appointment";
    }
  });
}

async function initMapsAndServices() {
  bootstrapMapsJsApi({
    key: state.config.googleMapsApiKey,
    v: "weekly",
    language: "en",
    region: "US",
  });

  await Promise.all([
    google.maps.importLibrary("core"),
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("places"),
    google.maps.importLibrary("routes"),
    google.maps.importLibrary("streetView"),
    google.maps.importLibrary("geometry"),
  ]);

  state.mapsLoaded = true;

  const { Map, Circle, InfoWindow } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const mapContainer = document.getElementById("map-container");
  state.map = new Map(mapContainer, {
    center: state.clinicLocation,
    zoom: state.config.clinicDefaults.zoom,
    mapId: state.config.mapId,
    internalUsageAttributionIds: [ATTRIBUTION_ID],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
  });

  state.clinicInfoWindow = new InfoWindow();

  const clinicPin = createClinicPinElement("450 Sutter Dental");
  state.clinicPinLabelEl = clinicPin.labelEl;
  state.clinicMarker = new AdvancedMarkerElement({
    map: state.map,
    position: state.clinicLocation,
    title: "450 Sutter Dental Specialists",
    content: clinicPin.container,
  });

  state.clinicMarker.addListener("click", () => {
    if (!state.clinicInfoWindow.getContent()) {
      const box = createEl("div");
      box.append(
        createEl("strong", { text: "450 Sutter Dental Specialists" }),
        createEl("div", { text: "450 Sutter St, San Francisco, CA" })
      );
      state.clinicInfoWindow.setContent(box);
    }
    state.clinicInfoWindow.open({ map: state.map, anchor: state.clinicMarker });
  });

  const originPin = createOriginPinElement("Ferry Building");
  state.originPinLabelEl = originPin.labelEl;
  state.originMarker = new AdvancedMarkerElement({
    map: state.map,
    position: {
      lat: state.originLocation.lat,
      lng: state.originLocation.lng,
    },
    title: state.originLocation.label,
    content: originPin.container,
  });

  state.coverageCircle = new Circle({
    map: state.map,
    center: state.clinicLocation,
    radius: state.config.clinicDefaults.serviceRadiusMeters,
    strokeColor: "#0d9488",
    strokeOpacity: 0.7,
    strokeWeight: 2,
    fillColor: "#0d9488",
    fillOpacity: 0.1,
    clickable: false,
  });

  await fetchLiveClinicDetails();

  await Promise.all([
    initOriginAutocomplete(),
    initStreetView(),
    computeAndDrawRoute("DRIVE"),
  ]);
}

async function main() {
  bindUiEvents();

  try {
    const configResp = await fetch("/api/config");
    if (!configResp.ok) {
      throw new Error(`Config endpoint failed with HTTP ${configResp.status}`);
    }
    state.config = await configResp.json();
    if (state.config?.clinicDefaults?.center) {
      state.clinicLocation = { ...state.config.clinicDefaults.center };
    }
    if (state.config?.clinicDefaults?.defaultOrigin) {
      state.originLocation = { ...state.config.clinicDefaults.defaultOrigin };
    }
  } catch (err) {
    const banner = document.getElementById("venue-status-banner");
    banner.classList.remove("hidden");
    banner.textContent = `Configuration load failed: ${err.message}`;
    return;
  }

  if (!state.config.configured || !state.config.googleMapsApiKey) {
    renderMissingKeyState();
    return;
  }

  await initMapsAndServices();
}

main();
