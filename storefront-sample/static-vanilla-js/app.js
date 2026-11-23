import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const SAN_FRANCISCO_CENTER = { lat: 37.7879, lng: -122.4074 };
const COVERAGE_RADIUS_METERS = 5000;
const SEED_CLINIC_QUERY = 'dental clinic San Francisco, CA';
const DEFAULT_ORIGIN_TEXT = 'Ferry Building, San Francisco, CA';

const MODE_META = {
  DRIVING: { label: 'Driving', color: '#1d4ed8' },
  TRANSIT: { label: 'Transit', color: '#7c3aed' },
  WALKING: { label: 'Walking', color: '#059669' },
};

const state = {
  apiKey: '',
  map: null,
  clinicPlace: null,
  clinicLocation: null,
  clinicMarker: null,
  originLocation: null,
  originLabel: DEFAULT_ORIGIN_TEXT,
  originMarker: null,
  coverageCircle: null,
  coverageVisible: true,
  streetViewVisible: false,
  panorama: null,
  streetViewService: null,
  infoWindow: null,
  routePolylines: [],
  travelMode: 'DRIVING',
  spherical: null,
  libraries: {},
};

const dom = {
  clinicName: document.getElementById('clinic-name'),
  openNowBadge: document.getElementById('open-now-badge'),
  clinicRating: document.getElementById('clinic-rating'),
  coverageToggle: document.getElementById('coverage-overlay-toggle'),
  streetViewToggle: document.getElementById('street-view-toggle'),
  apiKeyBanner: document.getElementById('api-key-banner'),
  clinicPhoto: document.getElementById('clinic-photo'),
  clinicPhotoPlaceholder: document.getElementById('clinic-photo-placeholder'),
  clinicPhotoAttribution: document.getElementById('clinic-photo-attribution'),
  clinicAddress: document.getElementById('clinic-address'),
  clinicPhone: document.getElementById('clinic-phone'),
  clinicLinks: document.getElementById('clinic-links'),
  clinicHours: document.getElementById('clinic-hours'),
  reviewsCountPill: document.getElementById('reviews-count-pill'),
  reviewsList: document.getElementById('venue-reviews-list'),
  originSlot: document.getElementById('origin-autocomplete-slot'),
  routeSummary: document.getElementById('route-summary'),
  modeButtons: [
    document.getElementById('travel-mode-drive'),
    document.getElementById('travel-mode-transit'),
    document.getElementById('travel-mode-walk'),
  ],
  bookingForm: document.getElementById('booking-form'),
  bookingDate: document.getElementById('booking-date'),
  bookingConfirmation: document.getElementById('booking-confirmation'),
  homeVisitEligibility: document.getElementById('home-visit-eligibility'),
  viewportPane: document.getElementById('viewport-pane'),
  mapContainer: document.getElementById('clinic-map'),
  streetViewPanel: document.getElementById('street-view-panel'),
  streetViewStatus: document.getElementById('street-view-status'),
  streetViewPano: document.getElementById('street-view-pano'),
};

function showNotice(message) {
  dom.apiKeyBanner.textContent = message;
  dom.apiKeyBanner.classList.remove('is-hidden');
}

function createCrossSvg() {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', 'M12 4v16M4 12h16');
  svg.appendChild(path);
  return svg;
}

function buildClinicPinElement(labelText) {
  const badge = document.createElement('div');
  badge.className = 'clinic-pin-badge';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'clinic-pin-icon';
  iconWrap.appendChild(createCrossSvg());

  const textSpan = document.createElement('span');
  textSpan.textContent = labelText || 'Dental Clinic';

  badge.append(iconWrap, textSpan);
  return badge;
}

function createLinkElement(href, label) {
  const anchor = document.createElement('a');
  anchor.className = 'inline-link';
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = label;
  return anchor;
}

function formatDurationMillis(durationMillis) {
  if (!Number.isFinite(durationMillis)) return '—';
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function formatDistanceMeters(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return '—';
  const miles = distanceMeters / 1609.344;
  return miles >= 0.2 ? `${miles.toFixed(1)} mi (${(distanceMeters / 1000).toFixed(1)} km)` : `${Math.round(distanceMeters)} m`;
}

function computeOpenNowFallback(openingHours, utcOffsetMinutes) {
  if (!openingHours?.periods?.length) return null;
  const nowUtcMs = Date.now();
  const offsetMin = Number.isFinite(utcOffsetMinutes) ? utcOffsetMinutes : -480;
  const localDate = new Date(nowUtcMs + offsetMin * 60000);
  const day = localDate.getUTCDay();
  const minutesOfDay = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();

  for (const period of openingHours.periods) {
    if (!period.open) continue;
    if (!period.close && period.open.day === 0 && period.open.hour === 0 && period.open.minute === 0) {
      return true;
    }
    const openDay = period.open.day;
    const openMin = period.open.hour * 60 + period.open.minute;
    const closeDay = period.close?.day ?? openDay;
    const closeMin = period.close ? period.close.hour * 60 + period.close.minute : 24 * 60;

    if (openDay === closeDay) {
      if (day === openDay && minutesOfDay >= openMin && minutesOfDay < closeMin) {
        return true;
      }
    } else if (
      (day === openDay && minutesOfDay >= openMin) ||
      (day === closeDay && minutesOfDay < closeMin)
    ) {
      return true;
    }
  }
  return false;
}

function renderVenueDetails(place, isOpen) {
  const displayName = place.displayName || 'San Francisco Multi-Specialty Dental';
  dom.clinicName.textContent = displayName;
  dom.clinicAddress.textContent = place.formattedAddress || 'San Francisco, CA';
  dom.clinicPhone.textContent = place.nationalPhoneNumber || 'Not listed';

  // Open/Closed status pill
  dom.openNowBadge.classList.remove('status-loading', 'status-open', 'status-closed');
  if (isOpen === true) {
    dom.openNowBadge.textContent = 'Open Now';
    dom.openNowBadge.classList.add('status-open');
  } else if (isOpen === false) {
    dom.openNowBadge.textContent = 'Closed Now';
    dom.openNowBadge.classList.add('status-closed');
  } else {
    dom.openNowBadge.textContent = 'Hours Available';
    dom.openNowBadge.classList.add('status-loading');
  }

  // Rating summary
  if (Number.isFinite(place.rating)) {
    const countText = Number.isFinite(place.userRatingCount)
      ? ` (${place.userRatingCount.toLocaleString()} reviews)`
      : '';
    dom.clinicRating.textContent = `${place.rating.toFixed(1)} ★${countText}`;
  } else {
    dom.clinicRating.textContent = 'Google Places Verified';
  }

  // Links (websiteURI & googleMapsURI)
  const linkNodes = [];
  if (place.websiteURI) {
    linkNodes.push(createLinkElement(place.websiteURI, 'Clinic Website'));
  }
  if (place.googleMapsURI) {
    linkNodes.push(createLinkElement(place.googleMapsURI, 'View on Google Maps'));
  }
  if (linkNodes.length > 0) {
    dom.clinicLinks.replaceChildren(...linkNodes);
  } else {
    dom.clinicLinks.textContent = '—';
  }

  // Opening Hours
  const descriptions =
    place.currentOpeningHours?.weekdayDescriptions ||
    place.regularOpeningHours?.weekdayDescriptions ||
    [];
  if (descriptions.length > 0) {
    const items = descriptions.map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    });
    dom.clinicHours.replaceChildren(...items);
  } else {
    const li = document.createElement('li');
    li.className = 'muted-item';
    li.textContent = 'Call clinic for current specialist appointment hours.';
    dom.clinicHours.replaceChildren(li);
  }

  // Hero Photo
  const firstPhoto = place.photos?.[0];
  if (firstPhoto && typeof firstPhoto.getURI === 'function') {
    const photoUrl = firstPhoto.getURI({ maxWidth: 800, maxHeight: 480 });
    dom.clinicPhoto.onerror = () => {
      dom.clinicPhoto.classList.add('is-hidden');
      dom.clinicPhotoPlaceholder.textContent = `${displayName} • San Francisco`;
      dom.clinicPhotoPlaceholder.classList.remove('is-hidden');
    };
    dom.clinicPhoto.src = photoUrl;
    dom.clinicPhoto.alt = `${displayName} storefront photo`;
    dom.clinicPhoto.classList.remove('is-hidden');
    dom.clinicPhotoPlaceholder.classList.add('is-hidden');

    const attrName = firstPhoto.authorAttributions?.[0]?.displayName;
    if (attrName) {
      dom.clinicPhotoAttribution.textContent = `Photo: ${attrName}`;
      dom.clinicPhotoAttribution.classList.remove('is-hidden');
    }
  } else {
    dom.clinicPhotoPlaceholder.textContent = `${displayName} • San Francisco`;
  }
}

function renderReviews(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'muted-item';
    emptyLi.textContent = 'No public Google reviews returned for this clinic.';
    dom.reviewsList.replaceChildren(emptyLi);
    dom.reviewsCountPill.textContent = '0 shown';
    return;
  }

  dom.reviewsCountPill.textContent = `${reviews.length} latest`;

  const items = reviews.slice(0, 5).map((review) => {
    const li = document.createElement('li');
    li.className = 'review-item';

    const topRow = document.createElement('div');
    topRow.className = 'review-top';

    const authorName = review.authorAttribution?.displayName || 'Google Reviewer';
    const authorUri = review.authorAttribution?.uri || review.googleMapsURI;
    let authorNode;
    if (authorUri) {
      authorNode = document.createElement('a');
      authorNode.className = 'review-author';
      authorNode.href = authorUri;
      authorNode.target = '_blank';
      authorNode.rel = 'noopener noreferrer';
      authorNode.textContent = authorName;
    } else {
      authorNode = document.createElement('span');
      authorNode.className = 'review-author';
      authorNode.textContent = authorName;
    }

    const stars = document.createElement('span');
    stars.className = 'review-stars';
    stars.textContent = Number.isFinite(review.rating) ? `${review.rating} ★` : '';

    topRow.append(authorNode, stars);
    li.appendChild(topRow);

    if (review.relativePublishTimeDescription) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'review-time';
      timeDiv.textContent = review.relativePublishTimeDescription;
      li.appendChild(timeDiv);
    }

    const bodyP = document.createElement('p');
    bodyP.className = 'review-text';
    bodyP.textContent = review.text || review.originalText || 'Rated this clinic on Google Maps.';
    li.appendChild(bodyP);

    return li;
  });

  dom.reviewsList.replaceChildren(...items);
}

function renderRouteSummary(mode, durationText, distanceText, subnoteText) {
  const modeInfo = MODE_META[mode] || MODE_META.DRIVING;

  const row = document.createElement('div');
  row.className = 'route-metric-row';

  const modeSpan = document.createElement('span');
  modeSpan.className = 'route-mode-label';
  modeSpan.textContent = modeInfo.label;

  const valueSpan = document.createElement('span');
  valueSpan.className = 'route-values';
  valueSpan.textContent = `${durationText} • ${distanceText}`;

  row.append(modeSpan, valueSpan);

  const subnote = document.createElement('div');
  subnote.className = 'route-subnote';
  subnote.textContent = subnoteText;

  dom.routeSummary.replaceChildren(row, subnote);
}

function updateHomeVisitEligibility() {
  const selectedRadio = dom.bookingForm.querySelector('input[name="visitType"]:checked');
  const isHomeVisit = selectedRadio?.value === 'home-visit';
  if (!isHomeVisit || !state.originLocation || !state.clinicLocation || !state.spherical) {
    dom.homeVisitEligibility.classList.add('is-hidden');
    return;
  }

  const distanceMeters = state.spherical.computeDistanceBetween(
    state.originLocation,
    state.clinicLocation
  );
  const km = (distanceMeters / 1000).toFixed(2);
  dom.homeVisitEligibility.classList.remove('is-hidden');

  if (distanceMeters <= COVERAGE_RADIUS_METERS) {
    dom.homeVisitEligibility.textContent = `Eligible: ${state.originLabel} is ${km} km from the clinic (within the 5.0 km home-visit zone).`;
    dom.homeVisitEligibility.style.color = '#0f766e';
  } else {
    dom.homeVisitEligibility.textContent = `Outside zone: ${state.originLabel} is ${km} km away (5.0 km limit for mobile home visits).`;
    dom.homeVisitEligibility.style.color = '#b91c1c';
  }
}

function clearRoutePolylines() {
  for (const line of state.routePolylines) {
    line.setMap(null);
  }
  state.routePolylines = [];
}

async function updateRoute() {
  if (!state.originLocation || !state.clinicLocation || !state.map) return;

  const { Route } = state.libraries.routes;
  const { LatLngBounds } = state.libraries.core;
  const { Polyline } = state.libraries.maps;
  const modeInfo = MODE_META[state.travelMode] || MODE_META.DRIVING;

  renderRouteSummary(state.travelMode, 'Calculating...', '', `From ${state.originLabel}`);
  clearRoutePolylines();

  try {
    const { routes } = await Route.computeRoutes({
      origin: state.originLocation,
      destination: state.clinicLocation,
      travelMode: state.travelMode,
      fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'localizedValues', 'viewport'],
    });

    const route = routes?.[0];
    if (!route) {
      renderRouteSummary(
        state.travelMode,
        'Unavailable',
        'No route found',
        `Try switching travel mode or adjusting your origin (${state.originLabel}).`
      );
      return;
    }

    const polylines =
      typeof route.createPolylines === 'function'
        ? route.createPolylines({
            polylineOptions: {
              strokeColor: modeInfo.color,
              strokeWeight: 5,
              strokeOpacity: 0.9,
            },
          })
        : [];

    if (polylines.length > 0) {
      for (const poly of polylines) {
        poly.setMap(state.map);
        state.routePolylines.push(poly);
      }
    } else if (route.path?.length) {
      const fallbackLine = new Polyline({
        map: state.map,
        path: route.path,
        strokeColor: modeInfo.color,
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });
      state.routePolylines.push(fallbackLine);
    }

    if (route.viewport) {
      state.map.fitBounds(route.viewport, 60);
    } else {
      const bounds = new LatLngBounds();
      bounds.extend(state.originLocation);
      bounds.extend(state.clinicLocation);
      state.map.fitBounds(bounds, 60);
    }

    const durationText =
      route.localizedValues?.duration || formatDurationMillis(route.durationMillis);
    const distanceText =
      route.localizedValues?.distance || formatDistanceMeters(route.distanceMeters);

    renderRouteSummary(
      state.travelMode,
      durationText,
      distanceText,
      `From ${state.originLabel} to ${state.clinicPlace?.displayName || 'Clinic'}`
    );
  } catch (err) {
    renderRouteSummary(
      state.travelMode,
      'Route unavailable',
      '—',
      `Could not compute ${modeInfo.label.toLowerCase()} directions right now (${err?.message || 'check API key & Routes API'}).`
    );
  }
}

function updateOriginMarker(location, label) {
  const { AdvancedMarkerElement, PinElement } = state.libraries.marker;

  state.originLocation = location;
  state.originLabel = label || DEFAULT_ORIGIN_TEXT;

  if (!state.originMarker) {
    const originPin = new PinElement({
      background: '#1d4ed8',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: 'A',
    });
    state.originMarker = new AdvancedMarkerElement({
      map: state.map,
      position: location,
      title: `Origin: ${state.originLabel}`,
    });
    state.originMarker.append(originPin);
  } else {
    state.originMarker.position = location;
    state.originMarker.title = `Origin: ${state.originLabel}`;
  }

  updateHomeVisitEligibility();
}

async function setupStreetView(clinicLocation) {
  const { StreetViewService, StreetViewPanorama, StreetViewSource } = state.libraries.streetView;
  state.streetViewService = new StreetViewService();

  try {
    const { data } = await state.streetViewService.getPanorama({
      location: clinicLocation,
      radius: 75,
      sources: [StreetViewSource.OUTDOOR],
    });

    const panoLocation = data?.location?.latLng;
    const heading =
      panoLocation && state.spherical
        ? state.spherical.computeHeading(panoLocation, clinicLocation)
        : 0;

    state.panorama = new StreetViewPanorama(dom.streetViewPano, {
      pano: data.location.pano,
      pov: { heading, pitch: 4 },
      zoom: 1,
      addressControl: true,
      visible: true,
    });

    state.map.setStreetView(state.panorama);
    dom.streetViewStatus.textContent =
      data.location.shortDescription || data.location.description || 'Clinic entrance view';
  } catch {
    dom.streetViewStatus.textContent = 'No outdoor Street View imagery within 75 m of entrance.';
  }
}

async function loadClinicVenue() {
  const { Place } = state.libraries.places;
  const { Circle, InfoWindow } = state.libraries.maps;
  const { AdvancedMarkerElement } = state.libraries.marker;

  const { places } = await Place.searchByText({
    textQuery: SEED_CLINIC_QUERY,
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'rating',
      'userRatingCount',
      'regularOpeningHours',
      'currentOpeningHours',
      'utcOffsetMinutes',
      'nationalPhoneNumber',
      'websiteURI',
      'photos',
      'reviews',
      'googleMapsURI',
    ],
    locationBias: { center: SAN_FRANCISCO_CENTER, radius: 15000 },
    maxResultCount: 1,
    language: 'en-US',
    region: 'us',
  });

  const clinic = places?.[0];
  if (!clinic || !clinic.location) {
    throw new Error('No San Francisco dental clinic returned from Places API (New).');
  }

  state.clinicPlace = clinic;
  state.clinicLocation = clinic.location;

  const isOpen = computeOpenNowFallback(
    clinic.currentOpeningHours || clinic.regularOpeningHours,
    clinic.utcOffsetMinutes
  );

  renderVenueDetails(clinic, isOpen);
  renderReviews(clinic.reviews || []);

  state.map.setCenter(clinic.location);
  state.map.setZoom(14);

  // Custom branded clinic AdvancedMarkerElement
  const pinContent = buildClinicPinElement(clinic.displayName);
  state.clinicMarker = new AdvancedMarkerElement({
    map: state.map,
    position: clinic.location,
    title: clinic.displayName || 'San Francisco Dental Clinic',
    gmpClickable: true,
  });
  state.clinicMarker.append(pinContent);

  state.infoWindow = new InfoWindow();
  state.clinicMarker.addEventListener('gmp-click', () => {
    const infoBox = document.createElement('div');
    const titleEl = document.createElement('strong');
    titleEl.textContent = clinic.displayName || 'San Francisco Dental Clinic';
    const addrEl = document.createElement('div');
    addrEl.textContent = clinic.formattedAddress || '';
    infoBox.append(titleEl, addrEl);
    state.infoWindow.setContent(infoBox);
    state.infoWindow.open({ anchor: state.clinicMarker, map: state.map });
  });

  // 5,000 m Home-Visit Coverage Circle
  state.coverageCircle = new Circle({
    map: state.coverageVisible ? state.map : null,
    center: clinic.location,
    radius: COVERAGE_RADIUS_METERS,
    strokeColor: '#0f766e',
    strokeOpacity: 0.85,
    strokeWeight: 2,
    fillColor: '#14b8a6',
    fillOpacity: 0.12,
    clickable: false,
  });

  await setupStreetView(clinic.location);
}

async function mountOriginAutocomplete() {
  const { Place, PlaceAutocompleteElement } = state.libraries.places;

  const autocompleteEl = new PlaceAutocompleteElement({
    locationBias: { center: SAN_FRANCISCO_CENTER, radius: 25000 },
    includedRegionCodes: ['us'],
    internalUsageAttributionIds: [ATTRIBUTION_ID],
  });
  autocompleteEl.id = 'origin-autocomplete-input';
  autocompleteEl.setAttribute('data-testid', 'origin-autocomplete-input');
  autocompleteEl.setAttribute('placeholder', 'Enter a San Francisco starting address');
  autocompleteEl.value = DEFAULT_ORIGIN_TEXT;

  dom.originSlot.replaceChildren(autocompleteEl);

  autocompleteEl.addEventListener('gmp-select', async (event) => {
    const prediction = event.placePrediction;
    if (!prediction) return;
    const selectedPlace = prediction.toPlace();
    await selectedPlace.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    });
    if (!selectedPlace.location) return;
    const label =
      selectedPlace.displayName || selectedPlace.formattedAddress || DEFAULT_ORIGIN_TEXT;
    updateOriginMarker(selectedPlace.location, label);
    await updateRoute();
  });

  // Pre-seed origin marker & initial route for "Ferry Building, San Francisco, CA"
  const { places: seedOrigins } = await Place.searchByText({
    textQuery: DEFAULT_ORIGIN_TEXT,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: { center: SAN_FRANCISCO_CENTER, radius: 20000 },
    maxResultCount: 1,
  });

  const seedOrigin = seedOrigins?.[0];
  if (seedOrigin?.location) {
    updateOriginMarker(
      seedOrigin.location,
      seedOrigin.displayName || seedOrigin.formattedAddress || DEFAULT_ORIGIN_TEXT
    );
    await updateRoute();
  }
}

function bindUiHandlers() {
  // Travel mode pills
  for (const btn of dom.modeButtons) {
    btn.addEventListener('click', async () => {
      const nextMode = btn.dataset.mode;
      if (!nextMode || nextMode === state.travelMode) return;
      state.travelMode = nextMode;
      for (const other of dom.modeButtons) {
        const active = other === btn;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      }
      await updateRoute();
    });
  }

  // Coverage radius overlay toggle
  dom.coverageToggle.addEventListener('click', () => {
    state.coverageVisible = !state.coverageVisible;
    dom.coverageToggle.classList.toggle('is-active', state.coverageVisible);
    dom.coverageToggle.setAttribute('aria-pressed', String(state.coverageVisible));
    if (state.coverageCircle) {
      state.coverageCircle.setMap(state.coverageVisible ? state.map : null);
    }
  });

  // Street View entrance toggle
  dom.streetViewToggle.addEventListener('click', () => {
    state.streetViewVisible = !state.streetViewVisible;
    dom.streetViewToggle.classList.toggle('is-active', state.streetViewVisible);
    dom.streetViewToggle.setAttribute('aria-pressed', String(state.streetViewVisible));
    dom.viewportPane.classList.toggle('split-view', state.streetViewVisible);
    dom.streetViewPanel.classList.toggle('is-hidden', !state.streetViewVisible);

    if (window.google?.maps?.event) {
      if (state.map) window.google.maps.event.trigger(state.map, 'resize');
      if (state.panorama && state.streetViewVisible) {
        state.panorama.setVisible(true);
        window.google.maps.event.trigger(state.panorama, 'resize');
      }
    }
  });

  // Home-visit radio check
  const visitRadios = dom.bookingForm.querySelectorAll('input[name="visitType"]');
  for (const radio of visitRadios) {
    radio.addEventListener('change', updateHomeVisitEligibility);
  }

  // Booking form default date (tomorrow)
  const tomorrow = new Date(Date.now() + 86400000);
  dom.bookingDate.value = tomorrow.toISOString().slice(0, 10);

  // Booking form submit handler
  dom.bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(dom.bookingForm);
    const patientName = String(formData.get('patientName') || '').trim();
    const patientContact = String(formData.get('patientContact') || '').trim();
    const specialty = String(formData.get('specialty') || '');
    const visitType =
      formData.get('visitType') === 'home-visit' ? 'Home Visit (5 km zone)' : 'In-Clinic Visit';
    const date = String(formData.get('date') || '');
    const timeSlot = String(formData.get('timeSlot') || '');
    const clinicLabel = state.clinicPlace?.displayName || 'San Francisco Multi-Specialty Dental';

    const titleEl = document.createElement('strong');
    titleEl.textContent = `Appointment request confirmed for ${patientName}!`;

    const detailsEl = document.createElement('div');
    detailsEl.textContent = `${specialty} • ${visitType} at ${clinicLabel} on ${date} at ${timeSlot}. Confirmation sent to ${patientContact}.`;

    dom.bookingConfirmation.replaceChildren(titleEl, detailsEl);
    dom.bookingConfirmation.classList.remove('is-hidden');
  });
}

async function initApp() {
  bindUiHandlers();

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  state.apiKey = apiKey;

  if (!apiKey) {
    showNotice(
      'Missing GOOGLE_MAPS_API_KEY in .env. Copy .env.example to .env and add a Maps Demo Key or Cloud API key to load live Google Maps, Places, Routes, and Street View.'
    );
    dom.openNowBadge.textContent = 'API Key Required';
    dom.clinicRating.textContent = 'Configure .env';
    dom.clinicAddress.textContent = 'Add GOOGLE_MAPS_API_KEY to .env and restart server.mjs.';
    dom.reviewsList.replaceChildren();
    const li = document.createElement('li');
    li.className = 'muted-item';
    li.textContent = 'Live Google Places reviews will appear once GOOGLE_MAPS_API_KEY is configured.';
    dom.reviewsList.appendChild(li);
    dom.streetViewStatus.textContent = 'API key required for Street View.';
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      solutionChannel: `GMP_${ATTRIBUTION_ID}_vanilla`,
    });

    const [coreLib, mapsLib, markerLib, placesLib, routesLib, streetViewLib, geometryLib] =
      await Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('streetView'),
        importLibrary('geometry'),
      ]);

    state.libraries = {
      core: coreLib,
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      streetView: streetViewLib,
      geometry: geometryLib,
    };
    state.spherical = geometryLib.spherical;

    state.map = new mapsLib.Map(dom.mapContainer, {
      center: SAN_FRANCISCO_CENTER,
      zoom: 13,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
    });

    await loadClinicVenue();
    await mountOriginAutocomplete();
  } catch (err) {
    showNotice(
      `Unable to initialize Google Maps Platform services: ${err?.message || 'Unknown error'}. Verify your GOOGLE_MAPS_API_KEY and enabled APIs (Maps JS, Places New, Routes).`
    );
  }
}

void initApp();
