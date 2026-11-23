const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const TRAIL_PATH = [
  { lat: 38.9522, lng: -120.1128, altitude: 12 },
  { lat: 38.9531, lng: -120.1115, altitude: 12 },
  { lat: 38.9540, lng: -120.1098, altitude: 12 },
  { lat: 38.9546, lng: -120.1072, altitude: 12 },
  { lat: 38.9554, lng: -120.1041, altitude: 12 },
  { lat: 38.9569, lng: -120.1014, altitude: 12 },
  { lat: 38.9587, lng: -120.0985, altitude: 12 },
  { lat: 38.9612, lng: -120.0964, altitude: 12 },
  { lat: 38.9645, lng: -120.0958, altitude: 12 },
  { lat: 38.9682, lng: -120.0953, altitude: 12 },
  { lat: 38.9720, lng: -120.0962, altitude: 12 },
  { lat: 38.9758, lng: -120.0969, altitude: 12 },
  { lat: 38.9794, lng: -120.0966, altitude: 12 },
  { lat: 38.9832, lng: -120.0961, altitude: 12 },
  { lat: 38.9866, lng: -120.0972, altitude: 12 },
  { lat: 38.9895, lng: -120.0991, altitude: 12 },
];

const CHAPTERS = [
  {
    id: 'overview',
    number: 1,
    title: '1. Emerald Bay Overview',
    shortName: 'Emerald Bay Overview',
    description:
      'High-altitude vantage framing Emerald Bay, Fannette Island, and the Rubicon shoreline trail.',
    seedQuery: 'Emerald Bay State Park, Lake Tahoe',
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 1920 },
      range: 5800,
      tilt: 62,
      heading: 35,
    },
    markerPosition: { lat: 38.9542, lng: -120.1103, altitude: 28 },
  },
  {
    id: 'trailhead',
    number: 2,
    title: '2. Eagle Falls Trailhead',
    shortName: 'Eagle Falls Trailhead',
    description:
      'Granite canyon entry above Emerald Bay where the Rubicon & Eagle Falls routes begin.',
    seedQuery: 'Eagle Falls Trailhead, South Lake Tahoe',
    camera: {
      center: { lat: 38.9522, lng: -120.1128, altitude: 2040 },
      range: 1450,
      tilt: 68,
      heading: 58,
    },
    markerPosition: { lat: 38.9522, lng: -120.1128, altitude: 28 },
  },
  {
    id: 'ridge',
    number: 3,
    title: '3. Rubicon Ridge',
    shortName: 'Rubicon Ridge',
    description:
      'Mid-trail alpine traverse climbing above the western cove with sweeping lake cliff contours.',
    seedQuery: 'Rubicon Trail, Emerald Bay, Lake Tahoe',
    camera: {
      center: { lat: 38.9682, lng: -120.0953, altitude: 1960 },
      range: 2100,
      tilt: 72,
      heading: 18,
    },
    markerPosition: { lat: 38.9682, lng: -120.0953, altitude: 28 },
  },
  {
    id: 'overlook',
    number: 4,
    title: '4. Eagle Point Overlook',
    shortName: 'Eagle Point Overlook',
    description:
      'Dramatic peninsula overlook looking back across Emerald Bay toward the Desolation Wilderness.',
    seedQuery: 'Eagle Point Campground, Lake Tahoe',
    camera: {
      center: { lat: 38.9587, lng: -120.0985, altitude: 1915 },
      range: 1750,
      tilt: 74,
      heading: 315,
    },
    markerPosition: { lat: 38.9587, lng: -120.0985, altitude: 28 },
  },
  {
    id: 'summit',
    number: 5,
    title: '5. Tahoe Summit Panorama',
    shortName: 'Tahoe Summit Panorama',
    description:
      'Northern Rubicon headland panorama looking south across the entire Emerald Bay corridor.',
    seedQuery: 'Rubicon Point Lighthouse, Lake Tahoe',
    camera: {
      center: { lat: 38.9895, lng: -120.0991, altitude: 2010 },
      range: 3400,
      tilt: 76,
      heading: 165,
    },
    markerPosition: { lat: 38.9895, lng: -120.0991, altitude: 28 },
  },
];

const state = {
  apiKey: '',
  mapsReady: false,
  map3d: null,
  maps3dLib: null,
  markerLib: null,
  placesLib: null,
  elevationLib: null,
  activeChapterId: 'overview',
  autoPlayActive: false,
  autoPlayTimer: null,
  elevationSamples: [],
  elevationMetrics: null,
  searchMarker: null,
  searchPopover: null,
  elevationCursorMarker: null,
  sessionToken: generateSessionToken(),
  autocompleteDebounce: null,
};

function generateSessionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getEl(id) {
  return document.getElementById(id);
}

function showStatusBanner(title, message) {
  const banner = getEl('map-status-banner');
  const titleEl = getEl('map-status-title');
  const msgEl = getEl('map-status-message');
  if (!banner || !titleEl || !msgEl) return;
  titleEl.textContent = title;
  msgEl.textContent = message;
  banner.classList.remove('hidden');
}

function hideStatusBanner() {
  const banner = getEl('map-status-banner');
  if (banner) banner.classList.add('hidden');
}

function formatRange(rangeMeters) {
  if (typeof rangeMeters !== 'number' || !Number.isFinite(rangeMeters)) {
    return '--';
  }
  if (rangeMeters >= 1000) {
    return `${(rangeMeters / 1000).toFixed(2)}km`;
  }
  return `${Math.round(rangeMeters)}m`;
}

function updateTelemetryUI(heading, tilt, range) {
  const headingEl = getEl('telemetry-heading');
  const tiltEl = getEl('telemetry-tilt');
  const rangeEl = getEl('telemetry-range');
  if (headingEl && typeof heading === 'number' && Number.isFinite(heading)) {
    const normalized = ((Math.round(heading) % 360) + 360) % 360;
    headingEl.textContent = `${normalized}°`;
  }
  if (tiltEl && typeof tilt === 'number' && Number.isFinite(tilt)) {
    tiltEl.textContent = `${Math.round(tilt)}°`;
  }
  if (rangeEl && typeof range === 'number' && Number.isFinite(range)) {
    rangeEl.textContent = formatRange(range);
  }
}

function flyToCamera(camera) {
  updateTelemetryUI(camera.heading, camera.tilt, camera.range);
  const map3d = state.map3d;
  if (!map3d) return;

  try {
    if (typeof map3d.flyCameraTo === 'function') {
      map3d.flyCameraTo({
        endCamera: {
          center: camera.center,
          range: camera.range,
          tilt: camera.tilt,
          heading: camera.heading,
        },
        durationMillis: 2200,
      });
    } else {
      map3d.center = camera.center;
      map3d.range = camera.range;
      map3d.tilt = camera.tilt;
      map3d.heading = camera.heading;
    }
  } catch {
    // Graceful fallback when WebGL2 is unavailable in headless environments
  }
}

function setActiveChapterButton(chapterId) {
  document.querySelectorAll('.chapter-btn').forEach((btn) => {
    const isMatch = btn.getAttribute('data-chapter-id') === chapterId;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-current', isMatch ? 'step' : 'false');
  });
}

function updateViewpointCard({
  badge,
  title,
  description,
  lat,
  lng,
  elevationText,
  placeName,
  address,
  ratingText,
  googleMapsUri,
}) {
  const badgeEl = getEl('viewpoint-badge');
  const coordsEl = getEl('viewpoint-coords');
  const titleEl = getEl('viewpoint-title');
  const descEl = getEl('viewpoint-description');
  const elevEl = getEl('viewpoint-elevation');
  const placeNameEl = getEl('viewpoint-place-name');
  const addrRowEl = getEl('viewpoint-address-row');
  const addrEl = getEl('viewpoint-address');
  const ratingRowEl = getEl('viewpoint-rating-row');
  const ratingEl = getEl('viewpoint-rating');
  const linkEl = getEl('viewpoint-maps-link');

  if (badgeEl) badgeEl.textContent = badge;
  if (coordsEl && typeof lat === 'number' && typeof lng === 'number') {
    coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = description;
  if (elevEl && elevationText) elevEl.textContent = elevationText;
  if (placeNameEl && placeName) placeNameEl.textContent = placeName;

  if (addrRowEl && addrEl) {
    if (address) {
      addrEl.textContent = address;
      addrRowEl.classList.remove('hidden');
    } else {
      addrRowEl.classList.add('hidden');
    }
  }

  if (ratingRowEl && ratingEl) {
    if (ratingText) {
      ratingEl.textContent = ratingText;
      ratingRowEl.classList.remove('hidden');
    } else {
      ratingRowEl.classList.add('hidden');
    }
  }

  if (linkEl) {
    if (googleMapsUri) {
      linkEl.setAttribute('href', googleMapsUri);
      linkEl.classList.remove('hidden');
    } else {
      linkEl.removeAttribute('href');
      linkEl.classList.add('hidden');
    }
  }
}

async function fetchSinglePointElevation(lat, lng) {
  if (state.apiKey) {
    try {
      const response = await fetch('/api/elevation/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: [{ lat, lng }] }),
      });
      if (response.ok) {
        const data = await response.json();
        const first = Array.isArray(data.results) ? data.results[0] : null;
        if (first && typeof first.elevation === 'number') {
          return first.elevation;
        }
      }
    } catch {
      // Fall through to JS ElevationService if available
    }
  }

  if (state.elevationLib?.ElevationService) {
    try {
      const service = new state.elevationLib.ElevationService();
      const { results } = await service.getElevationForLocations({
        locations: [{ lat, lng }],
      });
      if (results && results[0] && typeof results[0].elevation === 'number') {
        return results[0].elevation;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function enrichPlaceForViewpoint(query, fallbackName) {
  if (!state.apiKey) {
    return null;
  }
  try {
    const response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: query,
        locationBias: { lat: 38.9542, lng: -120.1103, radiusMeters: 35000 },
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.places) && data.places.length > 0) {
        return data.places[0];
      }
    }
  } catch {
    // Fallback below
  }

  if (state.placesLib?.Place?.searchByText) {
    try {
      const { places } = await state.placesLib.Place.searchByText({
        textQuery: query,
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'userRatingCount',
          'googleMapsUri',
        ],
        maxResultCount: 1,
      });
      if (places && places.length > 0) {
        const p = places[0];
        return {
          id: p.id,
          displayName: { text: p.displayName || fallbackName },
          formattedAddress: p.formattedAddress,
          location: p.location
            ? { latitude: p.location.lat(), longitude: p.location.lng() }
            : undefined,
          rating: p.rating,
          userRatingCount: p.userRatingCount,
          googleMapsUri: p.googleMapsUri,
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function selectChapter(chapterId) {
  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) return;

  state.activeChapterId = chapter.id;
  setActiveChapterButton(chapter.id);
  flyToCamera(chapter.camera);

  const { lat, lng } = chapter.camera.center;
  updateViewpointCard({
    badge: `Chapter ${chapter.number} of ${CHAPTERS.length}`,
    title: chapter.title,
    description: chapter.description,
    lat,
    lng,
    elevationText: state.apiKey ? 'Querying Elevation API...' : 'Requires GOOGLE_MAPS_API_KEY',
    placeName: state.apiKey ? 'Querying Places API (New)...' : 'Configure key for live Places data',
  });

  const [elevationMeters, place] = await Promise.all([
    fetchSinglePointElevation(lat, lng),
    enrichPlaceForViewpoint(chapter.seedQuery, chapter.shortName),
  ]);

  // Avoid race if user clicked another chapter while awaiting
  if (state.activeChapterId !== chapter.id) return;

  const elevStr =
    typeof elevationMeters === 'number'
      ? `${Math.round(elevationMeters)} m (${Math.round(elevationMeters * 3.28084)} ft)`
      : state.apiKey
      ? 'Unavailable'
      : 'API key required';

  const placeDisplay = place?.displayName?.text || (state.apiKey ? 'No match returned' : 'API key required');
  const ratingText =
    typeof place?.rating === 'number'
      ? `${place.rating.toFixed(1)} ★ (${place.userRatingCount ?? 0} reviews)`
      : '';

  updateViewpointCard({
    badge: `Chapter ${chapter.number} of ${CHAPTERS.length}`,
    title: chapter.title,
    description: chapter.description,
    lat,
    lng,
    elevationText: elevStr,
    placeName: placeDisplay,
    address: place?.formattedAddress || '',
    ratingText,
    googleMapsUri: place?.googleMapsUri || '',
  });
}

function toggleAutoPlay() {
  const toggleBtn = getEl('tour-autoplay-toggle');
  state.autoPlayActive = !state.autoPlayActive;

  if (toggleBtn) {
    toggleBtn.classList.toggle('active', state.autoPlayActive);
    toggleBtn.setAttribute('aria-pressed', String(state.autoPlayActive));
    toggleBtn.textContent = state.autoPlayActive ? 'Pause Tour' : 'Auto-Play';
  }

  if (state.autoPlayTimer) {
    clearInterval(state.autoPlayTimer);
    state.autoPlayTimer = null;
  }

  if (state.autoPlayActive) {
    const advance = () => {
      const currentIdx = CHAPTERS.findIndex((c) => c.id === state.activeChapterId);
      const nextIdx = (currentIdx + 1) % CHAPTERS.length;
      void selectChapter(CHAPTERS[nextIdx].id);
    };
    advance();
    state.autoPlayTimer = setInterval(advance, 5500);
  }
}

function stopAutoPlay() {
  if (!state.autoPlayActive) return;
  state.autoPlayActive = false;
  const toggleBtn = getEl('tour-autoplay-toggle');
  if (toggleBtn) {
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.textContent = 'Auto-Play';
  }
  if (state.autoPlayTimer) {
    clearInterval(state.autoPlayTimer);
    state.autoPlayTimer = null;
  }
}

function placeOrUpdateSearchMarker(lat, lng, title, subtitle) {
  const map3d = state.map3d;
  if (!map3d || !state.maps3dLib || !state.markerLib) return;

  const { Marker3DInteractiveElement, PopoverElement } = state.maps3dLib;
  const { PinElement } = state.markerLib;

  if (state.searchMarker) {
    state.searchMarker.remove();
    state.searchMarker = null;
  }
  if (state.searchPopover) {
    state.searchPopover.remove();
    state.searchPopover = null;
  }

  const popover = new PopoverElement();
  const header = document.createElement('span');
  header.slot = 'header';
  header.textContent = title;
  const bodyText = document.createElement('span');
  bodyText.textContent = subtitle || 'Searched Lake Tahoe Landmark';
  popover.append(header, bodyText);

  const pin = new PinElement({
    background: '#0ea5e9',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: '★',
    scale: 1.3,
  });

  const marker = new Marker3DInteractiveElement({
    position: { lat, lng, altitude: 32 },
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    title,
    gmpPopoverTargetElement: popover,
  });
  marker.append(pin);

  map3d.append(marker);
  map3d.append(popover);
  state.searchMarker = marker;
  state.searchPopover = popover;
}

async function focusLandmark({
  name,
  lat,
  lng,
  address,
  rating,
  userRatingCount,
  googleMapsUri,
}) {
  stopAutoPlay();
  state.activeChapterId = '';
  setActiveChapterButton('');

  const targetCamera = {
    center: { lat, lng, altitude: 1950 },
    range: 2200,
    tilt: 68,
    heading: 25,
  };
  flyToCamera(targetCamera);
  placeOrUpdateSearchMarker(lat, lng, name, address);

  updateViewpointCard({
    badge: 'Searched Landmark',
    title: name,
    description: '3D camera flown to searched landmark via Places API (New).',
    lat,
    lng,
    elevationText: 'Querying Elevation API...',
    placeName: name,
    address: address || '',
    ratingText:
      typeof rating === 'number'
        ? `${rating.toFixed(1)} ★ (${userRatingCount ?? 0} reviews)`
        : '',
    googleMapsUri: googleMapsUri || '',
  });

  const elevationMeters = await fetchSinglePointElevation(lat, lng);
  const elevStr =
    typeof elevationMeters === 'number'
      ? `${Math.round(elevationMeters)} m (${Math.round(elevationMeters * 3.28084)} ft)`
      : 'Unavailable';

  updateViewpointCard({
    badge: 'Searched Landmark',
    title: name,
    description: '3D camera flown to searched landmark via Places API (New).',
    lat,
    lng,
    elevationText: elevStr,
    placeName: name,
    address: address || '',
    ratingText:
      typeof rating === 'number'
        ? `${rating.toFixed(1)} ★ (${userRatingCount ?? 0} reviews)`
        : '',
    googleMapsUri: googleMapsUri || '',
  });
}

async function handleTextSearchSubmit(queryText) {
  const trimmed = queryText.trim();
  if (!trimmed) return;

  const dropdown = getEl('autocomplete-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  if (!state.apiKey) {
    showStatusBanner(
      'API Key Required for Places Search',
      'Set GOOGLE_MAPS_API_KEY in .env to enable live Places API (New) landmark search.'
    );
    return;
  }

  const place = await enrichPlaceForViewpoint(trimmed, trimmed);
  if (!place || !place.location) {
    showStatusBanner(
      'Landmark Not Found',
      `No coordinates returned for "${trimmed}". Try a Lake Tahoe landmark such as Vikingsholm or Sand Harbor.`
    );
    return;
  }

  hideStatusBanner();
  await focusLandmark({
    name: place.displayName?.text || trimmed,
    lat: place.location.latitude,
    lng: place.location.longitude,
    address: place.formattedAddress || '',
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    googleMapsUri: place.googleMapsUri || '',
  });
}

function renderAutocompleteSuggestions(suggestions) {
  const dropdown = getEl('autocomplete-dropdown');
  const input = getEl('landmark-search-input');
  if (!dropdown || !input) return;

  dropdown.replaceChildren();
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    dropdown.classList.add('hidden');
    return;
  }

  suggestions.forEach((item) => {
    const prediction = item.placePrediction;
    if (!prediction || !prediction.text?.text) return;

    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'autocomplete-item';

    const mainSpan = document.createElement('span');
    mainSpan.textContent =
      prediction.structuredFormat?.mainText?.text || prediction.text.text;

    const subSpan = document.createElement('span');
    subSpan.className = 'autocomplete-secondary';
    subSpan.textContent =
      prediction.structuredFormat?.secondaryText?.text || '';

    btn.append(mainSpan);
    if (subSpan.textContent) {
      btn.append(subSpan);
    }

    btn.addEventListener('click', () => {
      input.value = prediction.text.text;
      dropdown.classList.add('hidden');
      state.sessionToken = generateSessionToken();
      void handleTextSearchSubmit(prediction.text.text);
    });

    li.append(btn);
    dropdown.append(li);
  });

  dropdown.classList.toggle('hidden', dropdown.childElementCount === 0);
}

async function fetchAutocompleteSuggestions(inputText) {
  if (!state.apiKey || inputText.trim().length < 2) {
    renderAutocompleteSuggestions([]);
    return;
  }

  try {
    const response = await fetch('/api/places/autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: inputText.trim(),
        sessionToken: state.sessionToken,
      }),
    });
    if (!response.ok) {
      renderAutocompleteSuggestions([]);
      return;
    }
    const data = await response.json();
    renderAutocompleteSuggestions(data.suggestions || []);
  } catch {
    renderAutocompleteSuggestions([]);
  }
}

function renderElevationChart(results, metrics) {
  const host = getEl('elevation-profile-chart');
  const readout = getEl('chart-hover-readout');
  const statusEl = getEl('elevation-status-text');
  if (!host) return;

  host.replaceChildren();

  if (!Array.isArray(results) || results.length < 2) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'panel-caption';
    emptyMsg.textContent = state.apiKey
      ? 'Elevation profile unavailable.'
      : 'Configure GOOGLE_MAPS_API_KEY in .env to fetch live Elevation API trail samples.';
    host.append(emptyMsg);
    return;
  }

  if (statusEl) {
    statusEl.textContent = `${results.length} live Elevation API samples · Click to fly`;
  }

  const distEl = getEl('metric-distance');
  const minMaxEl = getEl('metric-minmax');
  const ascentEl = getEl('metric-ascent');
  const descentEl = getEl('metric-descent');

  if (metrics) {
    if (distEl) distEl.textContent = `${metrics.totalDistanceKm.toFixed(2)} km`;
    if (minMaxEl) {
      minMaxEl.textContent = `${Math.round(metrics.minElevationMeters)}–${Math.round(
        metrics.maxElevationMeters
      )} m`;
    }
    if (ascentEl) ascentEl.textContent = `+${metrics.totalAscentMeters} m`;
    if (descentEl) descentEl.textContent = `-${metrics.totalDescentMeters} m`;
  }

  const width = 320;
  const height = 132;
  const padLeft = 36;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const elevations = results.map((r) => r.elevation);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevSpan = Math.max(10, maxElev - minElev);
  const minDomain = minElev - elevSpan * 0.1;
  const maxDomain = maxElev + elevSpan * 0.1;
  const domainSpan = maxDomain - minDomain;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Lake Tahoe trail elevation profile');

  const defs = document.createElementNS(svgNS, 'defs');
  const grad = document.createElementNS(svgNS, 'linearGradient');
  grad.setAttribute('id', 'elevFillGrad');
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', '1');

  const stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#38bdf8');
  stop1.setAttribute('stop-opacity', '0.45');

  const stop2 = document.createElementNS(svgNS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#0ea5e9');
  stop2.setAttribute('stop-opacity', '0.02');

  grad.append(stop1, stop2);
  defs.append(grad);
  svg.append(defs);

  // Horizontal grid lines + labels
  [0, 0.5, 1].forEach((ratio) => {
    const y = padTop + plotH * (1 - ratio);
    const val = Math.round(minDomain + domainSpan * ratio);

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', String(padLeft));
    line.setAttribute('y1', y.toFixed(1));
    line.setAttribute('x2', String(width - padRight));
    line.setAttribute('y2', y.toFixed(1));
    line.setAttribute('stroke', 'rgba(148, 163, 184, 0.18)');
    line.setAttribute('stroke-dasharray', '3 3');
    svg.append(line);

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', String(padLeft - 5));
    label.setAttribute('y', (y + 3).toFixed(1));
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '9');
    label.setAttribute('fill', '#94a3b8');
    label.textContent = `${val}m`;
    svg.append(label);
  });

  const points = results.map((sample, idx) => {
    const x = padLeft + (idx / (results.length - 1)) * plotW;
    const y = padTop + plotH - ((sample.elevation - minDomain) / domainSpan) * plotH;
    return { x, y, sample, idx };
  });

  const lineCoords = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPathData = [
    `M ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    ...points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    'Z',
  ].join(' ');

  const areaPath = document.createElementNS(svgNS, 'path');
  areaPath.setAttribute('d', areaPathData);
  areaPath.setAttribute('fill', 'url(#elevFillGrad)');
  svg.append(areaPath);

  const polyline = document.createElementNS(svgNS, 'polyline');
  polyline.setAttribute('points', lineCoords);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', '#38bdf8');
  polyline.setAttribute('stroke-width', '2.2');
  polyline.setAttribute('stroke-linejoin', 'round');
  svg.append(polyline);

  const hoverLine = document.createElementNS(svgNS, 'line');
  hoverLine.setAttribute('y1', String(padTop));
  hoverLine.setAttribute('y2', String(padTop + plotH));
  hoverLine.setAttribute('stroke', '#ef4444');
  hoverLine.setAttribute('stroke-width', '1.2');
  hoverLine.setAttribute('opacity', '0');
  svg.append(hoverLine);

  const hoverDot = document.createElementNS(svgNS, 'circle');
  hoverDot.setAttribute('r', '4');
  hoverDot.setAttribute('fill', 'rgb(255, 0, 0)');
  hoverDot.setAttribute('stroke', '#ffffff');
  hoverDot.setAttribute('stroke-width', '1.5');
  hoverDot.setAttribute('opacity', '0');
  svg.append(hoverDot);

  // Interactive hit circles for each sampled point
  points.forEach((pt) => {
    const hit = document.createElementNS(svgNS, 'rect');
    const sliceW = plotW / points.length;
    hit.setAttribute('x', (pt.x - sliceW / 2).toFixed(1));
    hit.setAttribute('y', String(padTop));
    hit.setAttribute('width', Math.max(4, sliceW).toFixed(1));
    hit.setAttribute('height', String(plotH));
    hit.setAttribute('fill', 'transparent');

    const updateReadout = () => {
      hoverLine.setAttribute('x1', pt.x.toFixed(1));
      hoverLine.setAttribute('x2', pt.x.toFixed(1));
      hoverLine.setAttribute('opacity', '1');
      hoverDot.setAttribute('cx', pt.x.toFixed(1));
      hoverDot.setAttribute('cy', pt.y.toFixed(1));
      hoverDot.setAttribute('opacity', '1');

      const distKm = metrics?.cumulativeDistancesKm?.[pt.idx] ?? 0;
      const elevM = Math.round(pt.sample.elevation);
      const elevFt = Math.round(pt.sample.elevation * 3.28084);
      if (readout) {
        readout.textContent = `${distKm.toFixed(2)} km · ${elevM} m (${elevFt} ft)`;
      }
    };

    hit.addEventListener('mouseenter', updateReadout);
    hit.addEventListener('click', () => {
      updateReadout();
      stopAutoPlay();
      const loc = pt.sample.location;
      flyToCamera({
        center: { lat: loc.lat, lng: loc.lng, altitude: Math.round(pt.sample.elevation + 60) },
        range: 1350,
        tilt: 70,
        heading: 42,
      });
      if (state.elevationCursorMarker) {
        state.elevationCursorMarker.position = {
          lat: loc.lat,
          lng: loc.lng,
          altitude: 22,
        };
      }
    });

    svg.append(hit);
  });

  // Start / End axis labels
  const startLabel = document.createElementNS(svgNS, 'text');
  startLabel.setAttribute('x', String(padLeft));
  startLabel.setAttribute('y', String(height - 5));
  startLabel.setAttribute('font-size', '9');
  startLabel.setAttribute('fill', '#94a3b8');
  startLabel.textContent = '0.0 km';

  const endLabel = document.createElementNS(svgNS, 'text');
  endLabel.setAttribute('x', String(width - padRight));
  endLabel.setAttribute('y', String(height - 5));
  endLabel.setAttribute('text-anchor', 'end');
  endLabel.setAttribute('font-size', '9');
  endLabel.setAttribute('fill', '#94a3b8');
  endLabel.textContent = metrics ? `${metrics.totalDistanceKm.toFixed(2)} km` : 'End';

  svg.append(startLabel, endLabel);
  host.append(svg);
}

async function loadTrailElevationProfile() {
  if (!state.apiKey) {
    renderElevationChart([], null);
    return;
  }

  try {
    const response = await fetch('/api/elevation/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: TRAIL_PATH.map((p) => ({ lat: p.lat, lng: p.lng })),
        samples: 48,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results) && data.results.length >= 2) {
        state.elevationSamples = data.results;
        state.elevationMetrics = data.metrics || null;
        renderElevationChart(data.results, data.metrics || null);
        return;
      }
    }
  } catch {
    // Fallback to client ElevationService below
  }

  if (state.elevationLib?.ElevationService) {
    try {
      const service = new state.elevationLib.ElevationService();
      const { results } = await service.getElevationAlongPath({
        path: TRAIL_PATH.map((p) => ({ lat: p.lat, lng: p.lng })),
        samples: 48,
      });
      if (Array.isArray(results) && results.length >= 2) {
        const normalized = results.map((r) => ({
          elevation: r.elevation,
          location: { lat: r.location.lat(), lng: r.location.lng() },
          resolution: r.resolution,
        }));
        renderElevationChart(normalized, null);
        return;
      }
    } catch {
      // Handled below
    }
  }

  renderElevationChart([], null);
}

function loadGoogleMapsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      ((g) => {
        var h,
          a,
          k,
          p = 'The Google Maps JavaScript API',
          c = 'google',
          l = 'importLibrary',
          q = '__ib__',
          m = document,
          b = window;
        b = b[c] || (b[c] = {});
        var d = b.maps || (b.maps = {}),
          r = new Set(),
          e = new URLSearchParams(),
          u = () =>
            h ||
            (h = new Promise(async (f, n) => {
              await (a = m.createElement('script'));
              e.set('libraries', [...r] + '');
              for (k in g)
                e.set(
                  k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
                  g[k]
                );
              e.set('callback', c + '.maps.' + q);
              a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
              d[q] = f;
              a.onerror = () => (h = n(new Error(p + ' could not load.')));
              a.nonce = m.querySelector('script[nonce]')?.nonce || '';
              m.head.append(a);
            }));
        if (!d[l]) {
          d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
        }
      })({
        key: apiKey,
        v: 'weekly',
      });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

async function init3DScene(apiKey) {
  await loadGoogleMapsBootstrap(apiKey);

  const [maps3dLib, markerLib, placesLib, elevationLib] = await Promise.all([
    google.maps.importLibrary('maps3d'),
    google.maps.importLibrary('marker'),
    google.maps.importLibrary('places'),
    google.maps.importLibrary('elevation'),
  ]);

  state.maps3dLib = maps3dLib;
  state.markerLib = markerLib;
  state.placesLib = placesLib;
  state.elevationLib = elevationLib;

  await customElements.whenDefined('gmp-map-3d');
  const map3d = document.querySelector('gmp-map-3d');
  if (!map3d) return;

  state.map3d = map3d;
  map3d.internalUsageAttributionIds = [ATTRIBUTION_ID];

  map3d.addEventListener('gmp-error', () => {
    showStatusBanner(
      '3D WebGL Rendering Unavailable',
      'Photorealistic 3D tiles require hardware WebGL2 support and a valid Google Maps Platform API key with Map Tiles & Maps JS APIs enabled.'
    );
  });

  // Keep camera telemetry synchronized with live user pan/tilt/orbit
  map3d.addEventListener('gmp-camerapositionchange', () => {
    updateTelemetryUI(map3d.heading, map3d.tilt, map3d.range);
  });

  // Render the extruded bright-red RGB(255, 0, 0) 3D hiking trail polyline
  const { Polyline3DElement, Marker3DInteractiveElement, PopoverElement } = maps3dLib;
  const { PinElement } = markerLib;

  const trailPolyline = new Polyline3DElement({
    path: TRAIL_PATH,
    strokeColor: 'rgb(255, 0, 0)',
    strokeWidth: 8,
    outerColor: 'rgba(255, 255, 255, 0.85)',
    outerWidth: 0.25,
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    drawsOccludedSegments: true,
  });
  map3d.append(trailPolyline);

  // Add interactive 3D trailhead & viewpoint markers with PopoverElement
  CHAPTERS.forEach((chapter) => {
    const popover = new PopoverElement();
    const header = document.createElement('span');
    header.slot = 'header';
    header.textContent = chapter.title;
    const desc = document.createElement('span');
    desc.textContent = chapter.description;
    popover.append(header, desc);

    const pin = new PinElement({
      glyphText: String(chapter.number),
      background: '#dc2626',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      scale: 1.25,
    });

    const marker = new Marker3DInteractiveElement({
      position: chapter.markerPosition,
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      title: chapter.title,
      gmpPopoverTargetElement: popover,
    });
    marker.append(pin);

    marker.addEventListener('gmp-click', () => {
      stopAutoPlay();
      void selectChapter(chapter.id);
    });

    map3d.append(marker);
    map3d.append(popover);
  });

  // Elevation hover/click cursor marker on the trail
  const cursorPin = new PinElement({
    background: '#10b981',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: '▲',
    scale: 1.0,
  });
  const cursorMarker = new Marker3DInteractiveElement({
    position: { lat: TRAIL_PATH[0].lat, lng: TRAIL_PATH[0].lng, altitude: 22 },
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    title: 'Selected Trail Elevation Point',
  });
  cursorMarker.append(cursorPin);
  map3d.append(cursorMarker);
  state.elevationCursorMarker = cursorMarker;

  // Mount official PlaceAutocompleteElement listening to gmp-select
  const widgetHost = getEl('place-autocomplete-host');
  if (widgetHost && placesLib.PlaceAutocompleteElement) {
    const placeAutocomplete = new placesLib.PlaceAutocompleteElement({
      locationBias: {
        center: { lat: 38.9542, lng: -120.1103 },
        radius: 40000,
      },
    });
    placeAutocomplete.setAttribute('placeholder', 'Quick Place Picker...');
    placeAutocomplete.addEventListener('gmp-select', async (event) => {
      try {
        const prediction = event.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: [
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsUri',
          ],
        });
        if (!place.location) return;
        await focusLandmark({
          name: place.displayName || 'Selected Place',
          lat: place.location.lat(),
          lng: place.location.lng(),
          address: place.formattedAddress || '',
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          googleMapsUri: place.googleMapsUri || '',
        });
      } catch {
        // Ignore transient widget fetch errors gracefully
      }
    });
    widgetHost.replaceChildren(placeAutocomplete);
  }

  state.mapsReady = true;
}

function wireUIControls() {
  // Chapter buttons
  document.querySelectorAll('.chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chapterId = btn.getAttribute('data-chapter-id');
      if (!chapterId) return;
      stopAutoPlay();
      void selectChapter(chapterId);
    });
  });

  // Auto-Play Tour toggle
  const autoPlayBtn = getEl('tour-autoplay-toggle');
  if (autoPlayBtn) {
    autoPlayBtn.addEventListener('click', toggleAutoPlay);
  }

  // Map Mode switcher (HYBRID / SATELLITE)
  const modeButtons = [getEl('mode-hybrid-btn'), getEl('mode-satellite-btn')].filter(Boolean);
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (!mode) return;
      modeButtons.forEach((b) => b.classList.toggle('active', b === btn));
      const map3d = state.map3d || document.querySelector('gmp-map-3d');
      if (map3d) {
        map3d.setAttribute('mode', mode);
        try {
          map3d.mode = mode;
        } catch {
          // Ignore if map3d is not yet upgraded
        }
      }
    });
  });

  // Landmark search form + BFF autocomplete
  const searchForm = getEl('landmark-search-form');
  const searchInput = getEl('landmark-search-input');
  const dropdown = getEl('autocomplete-dropdown');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void handleTextSearchSubmit(searchInput.value);
    });

    searchInput.addEventListener('input', () => {
      if (state.autocompleteDebounce) {
        clearTimeout(state.autocompleteDebounce);
      }
      const val = searchInput.value;
      state.autocompleteDebounce = setTimeout(() => {
        void fetchAutocompleteSuggestions(val);
      }, 240);
    });

    document.addEventListener('click', (event) => {
      if (dropdown && !searchForm.contains(event.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }
}

async function bootstrapApp() {
  wireUIControls();
  state.map3d = document.querySelector('gmp-map-3d');

  let config = { apiKey: '', hasApiKey: false };
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      config = await res.json();
    }
  } catch {
    // Handled gracefully below
  }

  state.apiKey = typeof config.apiKey === 'string' ? config.apiKey : '';

  if (!state.apiKey) {
    showStatusBanner(
      'Demo / API Key Setup Required',
      'Set GOOGLE_MAPS_API_KEY in .env (obtain a free zero-billing Maps Demo Key at mapsplatform.google.com/maps-demo-key) and restart the server to render Photorealistic 3D tiles, live Places search, and Elevation profiles.'
    );
    await selectChapter('overview');
    renderElevationChart([], null);
    return;
  }

  try {
    await init3DScene(state.apiKey);
  } catch {
    showStatusBanner(
      '3D Scene Initialization Notice',
      'Photorealistic 3D map tiles require WebGL2 and a valid Google Maps Platform API key.'
    );
  }

  await Promise.all([selectChapter('overview'), loadTrailElevationProfile()]);
}

void bootstrapApp();
