/* Storefront Single-Venue Clinic Hub — Zero-Deprecation Maps JS + BFF Integration */

const DEFAULT_CONFIG = {
  apiKey: '',
  hasApiKey: false,
  mapId: 'DEMO_MAP_ID',
  attributionId: 'gmp_git_agentsamples_v1.0.0',
  defaultClinicQuery: '450 Sutter Dental San Francisco',
  clinicFallbackCenter: { lat: 37.7896, lng: -122.4076 },
  defaultOrigin: {
    name: 'Ferry Building, San Francisco, CA',
    lat: 37.7955,
    lng: -122.3937,
  },
  coverageRadiusMeters: 3500,
};

const MODE_LABELS = {
  DRIVE: 'Driving',
  TRANSIT: 'Public Transit',
  WALK: 'Walking',
};

const MODE_STYLES = {
  DRIVE: { strokeColor: '#0284c7', strokeOpacity: 0.9, strokeWeight: 5 },
  TRANSIT: { strokeColor: '#7c3aed', strokeOpacity: 0.9, strokeWeight: 5 },
  WALK: { strokeColor: '#059669', strokeOpacity: 0.92, strokeWeight: 5 },
};

const state = {
  config: DEFAULT_CONFIG,
  clinicCenter: { ...DEFAULT_CONFIG.clinicFallbackCenter },
  clinicPlace: null,
  currentOrigin: { ...DEFAULT_CONFIG.defaultOrigin },
  activeTravelMode: 'DRIVE',
  coverageVisible: true,
  streetViewVisible: false,
  streetViewInitialized: false,
  map: null,
  clinicMarker: null,
  originMarker: null,
  coverageCircle: null,
  routePolyline: null,
  infoWindow: null,
  panorama: null,
  mapsLibs: null,
};

function byId(id) {
  return document.getElementById(id);
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

function createClinicMarkerContent(labelText) {
  const badge = document.createElement('div');
  badge.className = 'clinic-marker-badge';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'clinic-marker-icon';
  const svg = createSvgElement('svg', {
    viewBox: '0 0 24 24',
    width: '12',
    height: '12',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '3',
    'stroke-linecap': 'round',
  });
  svg.append(createSvgElement('path', { d: 'M12 5v14M5 12h14' }));
  iconWrap.append(svg);

  const label = document.createElement('span');
  label.textContent = labelText;

  badge.append(iconWrap, label);
  return badge;
}

function createOriginMarkerContent(labelText) {
  const badge = document.createElement('div');
  badge.className = 'origin-marker-badge';

  const dot = document.createElement('span');
  dot.className = 'origin-marker-dot';

  const label = document.createElement('span');
  label.textContent = labelText;

  badge.append(dot, label);
  return badge;
}

function buildInfoWindowContent(place) {
  const card = document.createElement('div');
  card.className = 'info-window-card';

  const title = document.createElement('h4');
  title.className = 'info-window-title';
  title.textContent = place?.displayName?.text || '450 Sutter Dental Studio';

  const address = document.createElement('p');
  address.className = 'info-window-address';
  address.textContent = place?.formattedAddress || '450 Sutter St, San Francisco, CA 94108';

  card.append(title, address);

  if (typeof place?.rating === 'number') {
    const rating = document.createElement('p');
    rating.className = 'info-window-rating';
    const countText = typeof place.userRatingCount === 'number' ? ` (${place.userRatingCount} reviews)` : '';
    rating.textContent = `★ ${place.rating.toFixed(1)}${countText}`;
    card.append(rating);
  }

  return card;
}

function loadGoogleMapsBootstrap(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }

    const g = {
      key: apiKey,
      v: 'weekly',
    };

    const c = 'google';
    const l = 'importLibrary';
    const q = '__ib__';
    const m = document;
    const b = window;
    b[c] = b[c] || {};
    const d = (b[c].maps = b[c].maps || {});
    const r = new Set();
    const e = new URLSearchParams();

    let loadPromise = null;
    const ensureScript = () => {
      if (loadPromise) return loadPromise;
      loadPromise = new Promise((res, rej) => {
        const script = m.createElement('script');
        e.set('libraries', [...r].join(','));
        for (const k of Object.keys(g)) {
          e.set(k.replace(/[A-Z]/g, (t) => `_${t[0].toLowerCase()}`), g[k]);
        }
        e.set('callback', `${c}.maps.${q}`);
        script.src = `https://maps.${c}apis.com/maps/api/js?${e.toString()}`;
        d[q] = res;
        script.onerror = () => rej(new Error('Google Maps JavaScript API failed to load.'));
        m.head.append(script);
      });
      return loadPromise;
    };

    d[l] = (f, ...n) => {
      r.add(f);
      return ensureScript().then(() => d[l](f, ...n));
    };

    ensureScript().then(resolve).catch(reject);
  });
}

function showMissingKeyBanner() {
  const banner = byId('api-key-banner');
  if (!banner) return;

  banner.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = 'Google Maps API key not configured: ';
  const msg = document.createElement('span');
  msg.textContent = 'Add GOOGLE_MAPS_API_KEY to your .env file to enable the interactive map, live Places details, and routing. Obtain a free prototyping key at ';
  const link = document.createElement('a');
  link.href = 'https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Google Maps Demo Key';

  banner.append(strong, msg, link, '.');
  banner.hidden = false;
}

function formatDurationSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return '—';
  const match = /^(\d+(?:\.\d+)?)s$/.exec(durationStr.trim());
  if (!match) return durationStr;
  const totalSeconds = Math.round(Number(match[1]));
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} hr ${remMins} min` : `${hours} hr`;
}

function formatDistanceMeters(meters) {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return '—';
  const miles = meters / 1609.344;
  return miles >= 0.2 ? `${miles.toFixed(1)} mi` : `${Math.round(meters * 3.28084)} ft`;
}

function computeOpenNowFallback(periods) {
  if (!Array.isArray(periods) || periods.length === 0) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayStr = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
    const minStr = parts.find((p) => p.type === 'minute')?.value ?? '0';
    const nowDay = weekdayMap[dayStr];
    if (typeof nowDay !== 'number') return null;

    const nowMinutes = nowDay * 1440 + Number(hourStr) * 60 + Number(minStr);
    for (const period of periods) {
      if (!period?.open) continue;
      if (!period.close && period.open.day === 0 && period.open.hour === 0 && period.open.minute === 0) {
        return true;
      }
      if (!period.close) continue;
      const openMinutes = period.open.day * 1440 + period.open.hour * 60 + (period.open.minute ?? 0);
      let closeMinutes = period.close.day * 1440 + period.close.hour * 60 + (period.close.minute ?? 0);
      if (closeMinutes <= openMinutes) closeMinutes += 7 * 1440;
      const adjustedNow = nowMinutes < openMinutes ? nowMinutes + 7 * 1440 : nowMinutes;
      if (adjustedNow >= openMinutes && adjustedNow < closeMinutes) {
        return true;
      }
    }
    return false;
  } catch {
    return null;
  }
}

function applyOpenBadge(badgeEl, isOpen) {
  if (!badgeEl) return;
  badgeEl.classList.remove('status-pill--open', 'status-pill--closed', 'status-pill--neutral');
  if (isOpen === true) {
    badgeEl.textContent = 'Open Now';
    badgeEl.classList.add('status-pill--open');
  } else if (isOpen === false) {
    badgeEl.textContent = 'Closed Now';
    badgeEl.classList.add('status-pill--closed');
  } else {
    badgeEl.textContent = 'Hours Available';
    badgeEl.classList.add('status-pill--neutral');
  }
}

function renderVenueDetails(place) {
  state.clinicPlace = place;

  const clinicName = place.displayName?.text || '450 Sutter Dental Studio';
  const address = place.formattedAddress || '450 Sutter St, San Francisco, CA 94108';
  const phone = place.nationalPhoneNumber || '';
  const website = place.websiteUri || '';
  const mapsUri = place.googleMapsUri || 'https://maps.google.com';

  const openNow =
    typeof place.currentOpeningHours?.openNow === 'boolean'
      ? place.currentOpeningHours.openNow
      : typeof place.regularOpeningHours?.openNow === 'boolean'
        ? place.regularOpeningHours.openNow
        : computeOpenNowFallback(place.regularOpeningHours?.periods);

  byId('header-clinic-name').textContent = clinicName;
  byId('header-clinic-meta').textContent = phone ? `${address} · ${phone}` : address;
  applyOpenBadge(byId('header-open-badge'), openNow);

  byId('venue-name').textContent = clinicName;
  byId('venue-address').textContent = address;
  applyOpenBadge(byId('venue-open-badge'), openNow);

  const ratingBadge = byId('venue-rating-badge');
  const reviewCountEl = byId('venue-review-count');
  if (typeof place.rating === 'number') {
    ratingBadge.textContent = `★ ${place.rating.toFixed(1)}`;
    const totalCount = typeof place.userRatingCount === 'number' ? place.userRatingCount : 0;
    reviewCountEl.textContent = `${totalCount.toLocaleString()} Google reviews`;
  } else {
    ratingBadge.textContent = '★ —';
    reviewCountEl.textContent = 'Rating unavailable';
  }

  const phoneEl = byId('venue-phone');
  phoneEl.replaceChildren();
  if (phone) {
    const telLink = document.createElement('a');
    telLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
    telLink.textContent = phone;
    phoneEl.append(telLink);
  } else {
    phoneEl.textContent = 'Contact via booking form';
  }

  const websiteEl = byId('venue-website');
  websiteEl.replaceChildren();
  if (website) {
    const webLink = document.createElement('a');
    webLink.href = website;
    webLink.target = '_blank';
    webLink.rel = 'noopener noreferrer';
    try {
      webLink.textContent = new URL(website).hostname.replace(/^www\./, '');
    } catch {
      webLink.textContent = website;
    }
    websiteEl.append(webLink);
  } else {
    websiteEl.textContent = '—';
  }

  const mapsLink = byId('venue-maps-link');
  mapsLink.href = mapsUri;

  // Weekly hours
  const hoursList = byId('venue-hours-list');
  hoursList.replaceChildren();
  const descriptions =
    place.regularOpeningHours?.weekdayDescriptions ||
    place.currentOpeningHours?.weekdayDescriptions ||
    [];
  if (descriptions.length > 0) {
    for (const line of descriptions) {
      const li = document.createElement('li');
      li.textContent = line;
      hoursList.append(li);
    }
  } else {
    const li = document.createElement('li');
    li.textContent = 'Weekly schedule not published by venue.';
    hoursList.append(li);
  }

  // Photos via BFF proxy
  const photoStrip = byId('venue-photo-strip');
  photoStrip.replaceChildren();
  const photos = Array.isArray(place.photos) ? place.photos.slice(0, 4) : [];
  if (photos.length > 0) {
    for (const photo of photos) {
      if (!photo.name) continue;
      const tile = document.createElement('div');
      tile.className = 'photo-tile';
      const img = document.createElement('img');
      img.src = `/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=640`;
      img.alt = `${clinicName} clinic photo`;
      img.loading = 'lazy';
      tile.append(img);
      photoStrip.append(tile);
    }
  } else {
    const empty = document.createElement('div');
    empty.className = 'photo-skeleton';
    empty.textContent = 'No venue photos returned from Places API.';
    photoStrip.append(empty);
  }

  // Live Google Places Reviews
  const reviewsList = byId('venue-reviews-list');
  reviewsList.replaceChildren();
  const reviews = Array.isArray(place.reviews) ? place.reviews.slice(0, 5) : [];
  if (reviews.length > 0) {
    for (const review of reviews) {
      const li = document.createElement('li');
      li.className = 'review-item';

      const top = document.createElement('div');
      top.className = 'review-top';

      const author = document.createElement('span');
      author.className = 'review-author';
      author.textContent = review.authorAttribution?.displayName || 'Google User';

      const meta = document.createElement('span');
      meta.className = 'review-meta';
      const stars = typeof review.rating === 'number' ? `★ ${review.rating} · ` : '';
      meta.textContent = `${stars}${review.relativePublishTimeDescription || ''}`;

      top.append(author, meta);

      const textEl = document.createElement('p');
      textEl.className = 'review-text';
      textEl.textContent = review.text?.text || review.originalText?.text || 'Rated without written comment.';

      li.append(top, textEl);
      reviewsList.append(li);
    }
  } else {
    const empty = document.createElement('li');
    empty.className = 'review-placeholder';
    empty.textContent = 'No reviews available for this venue yet.';
    reviewsList.append(empty);
  }
}

async function fetchVenueDetails() {
  try {
    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textQuery: state.config.defaultClinicQuery }),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.places) || data.places.length === 0) {
      throw new Error(data.error || 'No matching clinic found.');
    }

    const place = data.places[0];
    if (
      typeof place.location?.latitude === 'number' &&
      typeof place.location?.longitude === 'number'
    ) {
      state.clinicCenter = {
        lat: place.location.latitude,
        lng: place.location.longitude,
      };
    }

    renderVenueDetails(place);
    updateClinicMapAssets();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load venue details.';
    byId('venue-name').textContent = '450 Sutter Dental Studio';
    byId('venue-review-count').textContent = message;
  }
}

function updateClinicMapAssets() {
  if (!state.map || !state.mapsLibs) return;
  const { AdvancedMarkerElement } = state.mapsLibs.marker;
  const clinicName = state.clinicPlace?.displayName?.text || '450 Sutter Dental';

  if (state.clinicMarker) {
    state.clinicMarker.position = state.clinicCenter;
    state.clinicMarker.replaceChildren(createClinicMarkerContent(clinicName));
  } else {
    state.clinicMarker = new AdvancedMarkerElement({
      map: state.map,
      position: state.clinicCenter,
      title: clinicName,
    });
    state.clinicMarker.append(createClinicMarkerContent(clinicName));
    state.clinicMarker.addListener('click', () => {
      if (!state.infoWindow) return;
      state.infoWindow.setContent(buildInfoWindowContent(state.clinicPlace));
      state.infoWindow.open({
        anchor: state.clinicMarker,
        map: state.map,
      });
    });
  }

  if (state.coverageCircle) {
    state.coverageCircle.setCenter(state.clinicCenter);
  }
}

function updateOriginMarker() {
  if (!state.map || !state.mapsLibs) return;
  const { AdvancedMarkerElement } = state.mapsLibs.marker;
  const position = { lat: state.currentOrigin.lat, lng: state.currentOrigin.lng };
  const label = state.currentOrigin.name.split(',')[0] || 'Origin';

  if (state.originMarker) {
    state.originMarker.position = position;
    state.originMarker.title = state.currentOrigin.name;
    state.originMarker.replaceChildren(createOriginMarkerContent(`From: ${label}`));
  } else {
    state.originMarker = new AdvancedMarkerElement({
      map: state.map,
      position,
      title: state.currentOrigin.name,
    });
    state.originMarker.append(createOriginMarkerContent(`From: ${label}`));
  }

  byId('active-origin-caption').textContent = `Origin: ${state.currentOrigin.name}`;
}

async function computeAndRenderRoute() {
  const durationEl = byId('route-duration');
  const distanceEl = byId('route-distance');
  const statusEl = byId('route-status-text');

  const modeLabel = MODE_LABELS[state.activeTravelMode] || state.activeTravelMode;
  statusEl.textContent = `Calculating ${modeLabel.toLowerCase()} route from ${state.currentOrigin.name}…`;

  try {
    const response = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: {
          lat: state.currentOrigin.lat,
          lng: state.currentOrigin.lng,
        },
        destination: {
          lat: state.clinicCenter.lat,
          lng: state.clinicCenter.lng,
        },
        travelMode: state.activeTravelMode,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to compute route.');
    }

    const route = Array.isArray(data.routes) && data.routes.length > 0 ? data.routes[0] : null;
    if (!route) {
      durationEl.textContent = 'N/A';
      distanceEl.textContent = 'N/A';
      statusEl.textContent = `No ${modeLabel.toLowerCase()} route returned between these locations.`;
      if (state.routePolyline) {
        state.routePolyline.setMap(null);
      }
      return;
    }

    const durationText = route.localizedValues?.duration?.text || formatDurationSeconds(route.duration);
    const distanceText = route.localizedValues?.distance?.text || formatDistanceMeters(route.distanceMeters);

    durationEl.textContent = durationText;
    distanceEl.textContent = distanceText;
    statusEl.textContent = `${modeLabel} route from ${state.currentOrigin.name} to clinic`;

    if (route.polyline?.encodedPolyline && state.map && state.mapsLibs) {
      const { Polyline } = state.mapsLibs.maps;
      const { LatLngBounds } = state.mapsLibs.core;
      const { encoding } = state.mapsLibs.geometry;
      const path = encoding.decodePath(route.polyline.encodedPolyline);
      const style = MODE_STYLES[state.activeTravelMode] || MODE_STYLES.DRIVE;

      if (!state.routePolyline) {
        state.routePolyline = new Polyline({
          map: state.map,
          path,
          ...style,
        });
      } else {
        state.routePolyline.setOptions({
          ...style,
          path,
          map: state.map,
        });
      }

      const bounds = new LatLngBounds();
      for (const point of path) {
        bounds.extend(point);
      }
      bounds.extend(state.clinicCenter);
      bounds.extend({ lat: state.currentOrigin.lat, lng: state.currentOrigin.lng });
      state.map.fitBounds(bounds, 56);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compute route.';
    durationEl.textContent = '—';
    distanceEl.textContent = '—';
    statusEl.textContent = message;
  }
}

function initOriginAutocomplete() {
  if (!state.mapsLibs?.places) return;
  const { PlaceAutocompleteElement } = state.mapsLibs.places;
  const container = byId('origin-autocomplete-container');
  if (!container) return;

  const autocompleteEl = new PlaceAutocompleteElement({
    includedRegionCodes: ['us'],
    locationBias: {
      center: state.clinicCenter,
      radius: 25000,
    },
    placeholder: 'Search a San Francisco starting address…',
  });
  autocompleteEl.value = state.currentOrigin.name;

  autocompleteEl.addEventListener('gmp-select', async (event) => {
    const prediction = event?.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (!place.location) return;
      state.currentOrigin = {
        name: place.displayName || place.formattedAddress || 'Selected Origin',
        lat: place.location.lat(),
        lng: place.location.lng(),
      };
      updateOriginMarker();
      await computeAndRenderRoute();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select origin place.';
      byId('route-status-text').textContent = message;
    }
  });

  container.replaceChildren(autocompleteEl);
}

async function initOrSyncStreetView() {
  if (!state.mapsLibs) return;
  const { StreetViewPanorama, StreetViewService, StreetViewPreference, StreetViewSource, StreetViewStatus } =
    state.mapsLibs.streetView;
  const { spherical } = state.mapsLibs.geometry;

  const svContainer = byId('street-view-container');
  const statusEl = byId('street-view-status');
  if (!svContainer) return;

  if (!state.panorama) {
    state.panorama = new StreetViewPanorama(svContainer, {
      position: state.clinicCenter,
      pov: { heading: 15, pitch: 8 },
      zoom: 1,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
    });
    state.streetViewInitialized = true;
  }

  try {
    const svService = new StreetViewService();
    const response = await svService.getPanorama({
      location: state.clinicCenter,
      radius: 100,
      preference: StreetViewPreference.NEAREST,
      source: StreetViewSource.OUTDOOR,
    });

    if (response?.data?.location?.latLng && response.data.location.pano) {
      const panoLatLng = response.data.location.latLng;
      const heading = spherical.computeHeading(panoLatLng, state.clinicCenter);
      state.panorama.setPano(response.data.location.pano);
      state.panorama.setPov({ heading, pitch: 8 });
      state.panorama.setVisible(true);
      statusEl.textContent = response.data.location.shortDescription || 'Building entrance Street View';
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === StreetViewStatus.ZERO_RESULTS) {
      statusEl.textContent = 'Outdoor Street View imagery unavailable at this exact coordinate.';
    } else {
      statusEl.textContent = 'Entrance panorama centered near 450 Sutter St.';
    }
  }
}

function setCoverageVisibility(visible) {
  state.coverageVisible = visible;
  const btn = byId('coverage-overlay-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(visible));
    btn.classList.toggle('toolbar-btn--active', visible);
  }
  if (state.coverageCircle) {
    state.coverageCircle.setMap(visible ? state.map : null);
  }
}

async function setStreetViewVisibility(visible) {
  state.streetViewVisible = visible;
  const btn = byId('street-view-toggle');
  const label = byId('street-view-toggle-label');
  const viewport = byId('map-viewport');
  const svPanel = byId('street-view-panel');

  if (btn) {
    btn.setAttribute('aria-pressed', String(visible));
    btn.classList.toggle('toolbar-btn--active', visible);
  }
  if (label) {
    label.textContent = visible ? 'Hide Street View' : 'Street View Entrance';
  }
  if (viewport) {
    viewport.classList.toggle('split-street-view', visible);
  }
  if (svPanel) {
    svPanel.hidden = !visible;
  }

  if (state.map && window.google?.maps?.event) {
    window.google.maps.event.trigger(state.map, 'resize');
  }

  if (visible) {
    await initOrSyncStreetView();
    if (state.panorama && window.google?.maps?.event) {
      window.google.maps.event.trigger(state.panorama, 'resize');
    }
  }
}

function setupUiEventListeners() {
  const coverageBtn = byId('coverage-overlay-toggle');
  coverageBtn?.addEventListener('click', () => {
    setCoverageVisibility(!state.coverageVisible);
  });

  const svToggleBtn = byId('street-view-toggle');
  svToggleBtn?.addEventListener('click', () => {
    void setStreetViewVisibility(!state.streetViewVisible);
  });

  const svCloseBtn = byId('street-view-close-btn');
  svCloseBtn?.addEventListener('click', () => {
    void setStreetViewVisibility(false);
  });

  const modeButtons = [
    byId('travel-mode-driving'),
    byId('travel-mode-transit'),
    byId('travel-mode-walking'),
  ];
  for (const btn of modeButtons) {
    btn?.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (!mode || mode === state.activeTravelMode) return;
      state.activeTravelMode = mode;
      for (const candidate of modeButtons) {
        if (!candidate) continue;
        const isSelected = candidate === btn;
        candidate.setAttribute('aria-pressed', String(isSelected));
        candidate.classList.toggle('mode-pill--active', isSelected);
      }
      void computeAndRenderRoute();
    });
  }

  // Ensure tomorrow's date is pre-selected in the booking form
  const dateInput = byId('booking-date');
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date(Date.now() + 86400000);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // Highlight 3.5 km coverage circle when user selects Home Visit
  const bookingForm = byId('booking-form');
  bookingForm?.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === 'visitType' && target.value === 'home-visit') {
      setCoverageVisibility(true);
    }
  });

  bookingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorEl = byId('booking-error');
    const submitBtn = byId('booking-submit-btn');
    errorEl.hidden = true;
    errorEl.textContent = '';

    const formData = new FormData(bookingForm);
    const payload = {
      specialty: String(formData.get('specialty') || ''),
      visitType: String(formData.get('visitType') || 'in-clinic'),
      preferredDate: String(formData.get('preferredDate') || ''),
      preferredTime: String(formData.get('preferredTime') || ''),
      patientName: String(formData.get('patientName') || ''),
      contactEmail: String(formData.get('contactEmail') || ''),
      contactPhone: String(formData.get('contactPhone') || ''),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Request…';

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Could not submit appointment request.');
      }

      bookingForm.hidden = true;
      const confirmationEl = byId('booking-confirmation');
      byId('confirmation-title').textContent = `Confirmed (${result.confirmationId})`;
      const visitLabel = result.visitType === 'home-visit' ? 'Home Visit (3.5 km SF zone)' : 'In-Clinic (450 Sutter St)';
      byId('confirmation-details').textContent =
        `${result.patientName} · ${result.specialty} · ${visitLabel} on ${result.preferredDate} at ${result.preferredTime}.`;
      confirmationEl.hidden = false;
    } catch (error) {
      errorEl.textContent = error instanceof Error ? error.message : 'Unable to submit booking.';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Appointment Request';
    }
  });

  byId('book-another-btn')?.addEventListener('click', () => {
    const confirmationEl = byId('booking-confirmation');
    confirmationEl.hidden = true;
    bookingForm?.reset();
    if (dateInput && !dateInput.value) {
      const tomorrow = new Date(Date.now() + 86400000);
      dateInput.value = tomorrow.toISOString().slice(0, 10);
    }
    if (bookingForm) {
      bookingForm.hidden = false;
    }
  });
}

async function initApp() {
  setupUiEventListeners();

  try {
    const configResponse = await fetch('/api/config');
    if (configResponse.ok) {
      const remoteConfig = await configResponse.json();
      state.config = { ...DEFAULT_CONFIG, ...remoteConfig };
      state.clinicCenter = { ...state.config.clinicFallbackCenter };
      state.currentOrigin = { ...state.config.defaultOrigin };
    }
  } catch {
    // Keep defaults if /api/config fails temporarily
  }

  if (!state.config.hasApiKey || !state.config.apiKey) {
    showMissingKeyBanner();
    return;
  }

  await loadGoogleMapsBootstrap(state.config.apiKey);

  const [coreLib, mapsLib, markerLib, placesLib, streetViewLib, geometryLib] = await Promise.all([
    google.maps.importLibrary('core'),
    google.maps.importLibrary('maps'),
    google.maps.importLibrary('marker'),
    google.maps.importLibrary('places'),
    google.maps.importLibrary('streetView'),
    google.maps.importLibrary('geometry'),
  ]);

  state.mapsLibs = {
    core: coreLib,
    maps: mapsLib,
    marker: markerLib,
    places: placesLib,
    streetView: streetViewLib,
    geometry: geometryLib,
  };

  const { Map, Circle, InfoWindow } = mapsLib;
  const mapContainer = byId('map-container');

  state.map = new Map(mapContainer, {
    center: state.clinicCenter,
    zoom: 13,
    mapId: state.config.mapId || 'DEMO_MAP_ID',
    internalUsageAttributionIds: [state.config.attributionId || 'gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  state.infoWindow = new InfoWindow();

  state.coverageCircle = new Circle({
    map: state.coverageVisible ? state.map : null,
    center: state.clinicCenter,
    radius: state.config.coverageRadiusMeters || 3500,
    strokeColor: '#0f766e',
    strokeOpacity: 0.78,
    strokeWeight: 2,
    fillColor: '#14b8a6',
    fillOpacity: 0.12,
    clickable: false,
  });

  updateClinicMapAssets();
  updateOriginMarker();
  initOriginAutocomplete();

  await Promise.all([fetchVenueDetails(), computeAndRenderRoute()]);
}

void initApp().catch((error) => {
  const banner = byId('api-key-banner');
  if (banner) {
    banner.textContent = error instanceof Error ? error.message : 'Failed to initialize Google Maps storefront.';
    banner.hidden = false;
  }
});
