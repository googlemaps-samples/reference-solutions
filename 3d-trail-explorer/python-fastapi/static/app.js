/**
 * Lake Tahoe 3D Trail Explorer
 * Uses Maps JS API maps3d (Map3DElement, Polyline3DElement, Marker3DInteractiveElement, PopoverElement),
 * marker (PinElement), places, and elevation via FastAPI BFF proxies.
 */

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

const TRAIL_CHAPTERS = [
  {
    id: 'overview',
    badge: '1',
    shortLabel: 'Emerald Bay',
    title: 'Emerald Bay Overview',
    address: 'Emerald Bay State Park, South Lake Tahoe, CA',
    description:
      'Sweeping aerial perspective across Emerald Bay, Fannette Island, and the granite glacier-carved shoreline.',
    lat: 38.9542,
    lng: -120.1103,
    altitude: 40,
    heading: 35,
    tilt: 62,
    range: 2400,
  },
  {
    id: 'trailhead',
    badge: '2',
    shortLabel: 'Eagle Falls',
    title: 'Eagle Falls Trailhead',
    address: 'Eagle Falls Trailhead, Hwy 89, South Lake Tahoe, CA',
    description:
      'Granite staircase trailhead overlooking Lower Eagle Falls cascade and the western rim of Emerald Bay.',
    lat: 38.9531,
    lng: -120.1127,
    altitude: 30,
    heading: 48,
    tilt: 68,
    range: 950,
  },
  {
    id: 'ridge',
    badge: '3',
    shortLabel: 'Rubicon Ridge',
    title: 'Rubicon Ridge',
    address: 'Rubicon Trail, Emerald Bay North Shore, CA',
    description:
      'High pine-lined traverse tracing steep granite cliffs above emerald cove waters along the Rubicon Trail.',
    lat: 38.9612,
    lng: -120.0978,
    altitude: 45,
    heading: 120,
    tilt: 72,
    range: 1100,
  },
  {
    id: 'overlook',
    badge: '4',
    shortLabel: 'Eagle Point',
    title: 'Eagle Point Overlook',
    address: 'Eagle Point Campground & Overlook, Lake Tahoe, CA',
    description:
      'Dramatic rocky promontory framing the narrow channel where Emerald Bay opens into main Lake Tahoe.',
    lat: 38.9574,
    lng: -120.0895,
    altitude: 35,
    heading: 255,
    tilt: 70,
    range: 1300,
  },
  {
    id: 'summit',
    badge: '5',
    shortLabel: 'Tahoe Summit',
    title: 'Tahoe Summit Panorama',
    address: 'Rubicon Point & Sierra Crest Vista, Lake Tahoe, CA',
    description:
      'Elevated crest panorama capturing the full Rubicon Trail corridor and deep cobalt waters of Lake Tahoe.',
    lat: 38.9698,
    lng: -120.0962,
    altitude: 80,
    heading: 175,
    tilt: 66,
    range: 3400,
  },
];

// 12-point hiking trail winding from Eagle Falls past Vikingsholm & Rubicon Ridge to Summit Panorama
const TRAIL_PATH = [
  { lat: 38.9531, lng: -120.1127 },
  { lat: 38.9524, lng: -120.1098 },
  { lat: 38.9542, lng: -120.1072 },
  { lat: 38.9562, lng: -120.1055 },
  { lat: 38.9585, lng: -120.1028 },
  { lat: 38.9602, lng: -120.1003 },
  { lat: 38.9612, lng: -120.0978 },
  { lat: 38.9604, lng: -120.0938 },
  { lat: 38.9574, lng: -120.0895 },
  { lat: 38.9625, lng: -120.0908 },
  { lat: 38.9668, lng: -120.0935 },
  { lat: 38.9698, lng: -120.0962 },
];

const state = {
  config: null,
  map3d: null,
  maps3dReady: false,
  isFlying: false,
  mapsLibs: {},
  activeChapterId: 'overview',
  autoplayTimer: null,
  searchMarker: null,
  activePopover: null,
  elevationSamples: [],
  autocompleteTimer: null,
  sessionToken: createSessionToken(),
};

function createSessionToken() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function computePathDistanceKm(path) {
  let totalM = 0;
  for (let i = 1; i < path.length; i += 1) {
    totalM += haversineMeters(path[i - 1], path[i]);
  }
  return Math.round((totalM / 1000) * 100) / 100;
}

function setTelemetryDisplay({ heading, tilt, range }) {
  const hdgEl = document.getElementById('telemetry-heading');
  const tiltEl = document.getElementById('telemetry-tilt');
  const rangeEl = document.getElementById('telemetry-range');
  if (hdgEl && Number.isFinite(heading)) {
    hdgEl.textContent = `${Math.round(heading)}°`;
  }
  if (tiltEl && Number.isFinite(tilt)) {
    tiltEl.textContent = `${Math.round(tilt)}°`;
  }
  if (rangeEl && Number.isFinite(range)) {
    rangeEl.textContent = `${Math.round(range).toLocaleString()}m`;
  }
}

function showMapBanner(message) {
  const banner = document.getElementById('map-status-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.remove('hidden');
}

function hideMapBanner() {
  const banner = document.getElementById('map-status-banner');
  if (!banner) return;
  banner.classList.add('hidden');
}

function updateSelectedViewpointCard({
  badge,
  title,
  address,
  description,
  elevationM,
  rating,
  userRatingCount,
  googleMapsUri,
}) {
  const badgeEl = document.getElementById('viewpoint-badge');
  const titleEl = document.getElementById('viewpoint-title');
  const addrEl = document.getElementById('viewpoint-address');
  const descEl = document.getElementById('viewpoint-description');
  const elevEl = document.getElementById('viewpoint-elevation-pill');
  const metaEl = document.getElementById('viewpoint-place-meta');

  if (badgeEl) badgeEl.textContent = badge;
  if (titleEl) titleEl.textContent = title;
  if (addrEl) addrEl.textContent = address;
  if (descEl) descEl.textContent = description;
  if (elevEl) {
    elevEl.textContent =
      typeof elevationM === 'number' && Number.isFinite(elevationM)
        ? `Elevation: ${Math.round(elevationM).toLocaleString()} m`
        : 'Elevation: -- m';
  }

  if (metaEl) {
    const nodes = [];
    if (typeof rating === 'number') {
      const ratingSpan = document.createElement('span');
      ratingSpan.className = 'place-rating-pill';
      const countText =
        typeof userRatingCount === 'number' ? ` (${userRatingCount.toLocaleString()})` : '';
      ratingSpan.textContent = `★ ${rating.toFixed(1)}${countText}`;
      nodes.push(ratingSpan);
    }
    if (googleMapsUri) {
      const link = document.createElement('a');
      link.className = 'place-maps-link';
      link.href = googleMapsUri;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View on Google Maps ↗';
      nodes.push(link);
    }
    metaEl.replaceChildren(...nodes);
  }
}

function flyCameraToTarget(cameraConfig, durationMillis = 2200) {
  setTelemetryDisplay(cameraConfig);

  const map3d = document.getElementById('trail-map-3d');
  if (!map3d) return;

  if (state.maps3dReady && typeof map3d.flyCameraTo === 'function') {
    state.isFlying = true;
    try {
      map3d.flyCameraTo({
        endCamera: {
          center: {
            lat: cameraConfig.center.lat,
            lng: cameraConfig.center.lng,
            altitude: cameraConfig.center.altitude ?? 40,
          },
          heading: cameraConfig.heading,
          tilt: cameraConfig.tilt,
          range: cameraConfig.range,
        },
        durationMillis,
      });
    } catch {
      state.isFlying = false;
    }
    return;
  }

  // Fallback attribute sync when WebGL2 or API key is unavailable
  map3d.setAttribute(
    'center',
    `${cameraConfig.center.lat},${cameraConfig.center.lng},${cameraConfig.center.altitude ?? 40}`
  );
  map3d.setAttribute('heading', String(cameraConfig.heading));
  map3d.setAttribute('tilt', String(cameraConfig.tilt));
  map3d.setAttribute('range', String(cameraConfig.range));
}

async function fetchPointElevation(lat, lng) {
  try {
    const resp = await fetch('/api/elevation/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: [{ lat, lng }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.configured && data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      return data.results[0].elevation;
    }
    return null;
  } catch {
    return null;
  }
}

async function selectChapter(chapterId) {
  const chapter = TRAIL_CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) return;

  state.activeChapterId = chapter.id;

  document.querySelectorAll('.chapter-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.chapterId === chapter.id);
  });

  flyCameraToTarget({
    center: { lat: chapter.lat, lng: chapter.lng, altitude: chapter.altitude },
    heading: chapter.heading,
    tilt: chapter.tilt,
    range: chapter.range,
  });

  updateSelectedViewpointCard({
    badge: `Chapter ${chapter.badge}`,
    title: chapter.title,
    address: chapter.address,
    description: chapter.description,
    elevationM: null,
  });

  const liveElevation = await fetchPointElevation(chapter.lat, chapter.lng);
  if (state.activeChapterId === chapter.id && typeof liveElevation === 'number') {
    updateSelectedViewpointCard({
      badge: `Chapter ${chapter.badge}`,
      title: chapter.title,
      address: chapter.address,
      description: chapter.description,
      elevationM: liveElevation,
    });
  }
}

function toggleAutoplay() {
  const btn = document.getElementById('tour-autoplay-toggle');
  if (!btn) return;

  if (state.autoplayTimer) {
    clearInterval(state.autoplayTimer);
    state.autoplayTimer = null;
    btn.classList.remove('is-playing');
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = 'Auto-Play';
    return;
  }

  btn.classList.add('is-playing');
  btn.setAttribute('aria-pressed', 'true');
  btn.textContent = 'Stop Tour';

  state.autoplayTimer = setInterval(() => {
    const idx = TRAIL_CHAPTERS.findIndex((c) => c.id === state.activeChapterId);
    const nextIdx = (idx + 1) % TRAIL_CHAPTERS.length;
    void selectChapter(TRAIL_CHAPTERS[nextIdx].id);
  }, 4500);
}

function renderElevationChart(results, statusMessage) {
  const svg = document.getElementById('elevation-profile-chart');
  const readoutEl = document.getElementById('chart-hover-readout');
  if (!svg) return;

  const ns = 'http://www.w3.org/2000/svg';
  const width = 320;
  const height = 118;
  const padLeft = 36;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 20;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const elements = [];

  // Subtle horizontal gridlines
  for (let i = 0; i <= 3; i += 1) {
    const y = padTop + (plotH * i) / 3;
    const gridLine = document.createElementNS(ns, 'line');
    gridLine.setAttribute('x1', String(padLeft));
    gridLine.setAttribute('x2', String(width - padRight));
    gridLine.setAttribute('y1', String(y));
    gridLine.setAttribute('y2', String(y));
    gridLine.setAttribute('stroke', 'rgba(148, 163, 184, 0.16)');
    gridLine.setAttribute('stroke-width', '1');
    elements.push(gridLine);
  }

  if (!Array.isArray(results) || results.length < 2) {
    const emptyText = document.createElementNS(ns, 'text');
    emptyText.setAttribute('x', String(width / 2));
    emptyText.setAttribute('y', String(height / 2 + 4));
    emptyText.setAttribute('text-anchor', 'middle');
    emptyText.setAttribute('fill', '#94a3b8');
    emptyText.setAttribute('font-size', '10');
    emptyText.textContent =
      statusMessage || 'Add GOOGLE_MAPS_API_KEY in .env for live Elevation API chart';
    elements.push(emptyText);
    svg.replaceChildren(...elements);
    return;
  }

  const elevations = results.map((r) => Number(r.elevation));
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevSpan = Math.max(10, maxElev - minElev);

  // Y-axis min/max labels
  const maxLabel = document.createElementNS(ns, 'text');
  maxLabel.setAttribute('x', '4');
  maxLabel.setAttribute('y', String(padTop + 4));
  maxLabel.setAttribute('fill', '#94a3b8');
  maxLabel.setAttribute('font-size', '9');
  maxLabel.textContent = `${Math.round(maxElev)}m`;
  elements.push(maxLabel);

  const minLabel = document.createElementNS(ns, 'text');
  minLabel.setAttribute('x', '4');
  minLabel.setAttribute('y', String(padTop + plotH));
  minLabel.setAttribute('fill', '#94a3b8');
  minLabel.setAttribute('font-size', '9');
  minLabel.textContent = `${Math.round(minElev)}m`;
  elements.push(minLabel);

  const points = results.map((sample, idx) => {
    const x = padLeft + (idx / (results.length - 1)) * plotW;
    const normY = (Number(sample.elevation) - minElev) / elevSpan;
    const y = padTop + plotH - normY * plotH;
    return { x, y, sample };
  });

  // Area fill path
  const areaCoords = [
    `M ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    ...points.map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`),
    `L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`,
  ].join(' ');

  const areaPath = document.createElementNS(ns, 'path');
  areaPath.setAttribute('d', areaCoords);
  areaPath.setAttribute('fill', 'rgba(255, 0, 0, 0.22)');
  elements.push(areaPath);

  // Bright red trail profile line matching 3D polyline
  const lineCoords = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const linePath = document.createElementNS(ns, 'path');
  linePath.setAttribute('d', lineCoords);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'rgb(255, 0, 0)');
  linePath.setAttribute('stroke-width', '2.2');
  linePath.setAttribute('stroke-linecap', 'round');
  linePath.setAttribute('stroke-linejoin', 'round');
  elements.push(linePath);

  // Active highlight circle
  const activeDot = document.createElementNS(ns, 'circle');
  activeDot.setAttribute('r', '4');
  activeDot.setAttribute('fill', '#38bdf8');
  activeDot.setAttribute('stroke', '#ffffff');
  activeDot.setAttribute('stroke-width', '1.5');
  activeDot.setAttribute('visibility', 'hidden');
  elements.push(activeDot);

  // Interactive hit targets along the profile
  points.forEach((pt, idx) => {
    const hitCircle = document.createElementNS(ns, 'circle');
    hitCircle.setAttribute('cx', pt.x.toFixed(1));
    hitCircle.setAttribute('cy', pt.y.toFixed(1));
    hitCircle.setAttribute('r', '5');
    hitCircle.setAttribute('fill', 'transparent');

    const focusPoint = () => {
      activeDot.setAttribute('cx', pt.x.toFixed(1));
      activeDot.setAttribute('cy', pt.y.toFixed(1));
      activeDot.setAttribute('visibility', 'visible');
      if (readoutEl) {
        const distKm = typeof pt.sample.distanceKm === 'number' ? pt.sample.distanceKm.toFixed(2) : '0.00';
        readoutEl.textContent = `Sample ${idx + 1}/${results.length}: ${Math.round(pt.sample.elevation)} m at ${distKm} km`;
      }
    };

    hitCircle.addEventListener('mouseenter', focusPoint);
    hitCircle.addEventListener('click', () => {
      focusPoint();
      const loc = pt.sample.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        flyCameraToTarget(
          {
            center: { lat: loc.lat, lng: loc.lng, altitude: 35 },
            heading: 90,
            tilt: 68,
            range: 900,
          },
          1600
        );
      }
    });

    elements.push(hitCircle);
  });

  svg.replaceChildren(...elements);
}

async function loadTrailElevationProfile() {
  const distEl = document.getElementById('metric-distance');
  const maxEl = document.getElementById('metric-max-elev');
  const ascentEl = document.getElementById('metric-ascent');
  const descentEl = document.getElementById('metric-descent');
  const statusEl = document.getElementById('elevation-status-text');

  const computedDistanceKm = computePathDistanceKm(TRAIL_PATH);
  if (distEl) distEl.textContent = `${computedDistanceKm.toFixed(2)} km`;

  try {
    const resp = await fetch('/api/elevation/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TRAIL_PATH, samples: 48 }),
    });
    const data = await resp.json();

    if (!data.configured) {
      if (statusEl) statusEl.textContent = 'Set GOOGLE_MAPS_API_KEY for live terrain sampling';
      renderElevationChart([], 'Set GOOGLE_MAPS_API_KEY in .env for Elevation API');
      return;
    }

    if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      state.elevationSamples = data.results;
      const metrics = data.metrics || {};
      if (distEl && typeof metrics.totalDistanceKm === 'number') {
        distEl.textContent = `${metrics.totalDistanceKm.toFixed(2)} km`;
      }
      if (maxEl && typeof metrics.maxElevationM === 'number') {
        maxEl.textContent = `${Math.round(metrics.maxElevationM)} m`;
      }
      if (ascentEl && typeof metrics.totalAscentM === 'number') {
        ascentEl.textContent = `+${Math.round(metrics.totalAscentM)} m`;
      }
      if (descentEl && typeof metrics.totalDescentM === 'number') {
        descentEl.textContent = `-${Math.round(metrics.totalDescentM)} m`;
      }
      if (statusEl) statusEl.textContent = `Live Elevation API (${data.results.length} samples)`;
      renderElevationChart(data.results);
    } else {
      if (statusEl) statusEl.textContent = data.error || 'Elevation API unavailable';
      renderElevationChart([], data.error || 'Elevation API unavailable');
    }
  } catch {
    renderElevationChart([], 'Unable to reach /api/elevation/profile');
  }
}

function hideSuggestions() {
  const list = document.getElementById('search-suggestions');
  if (!list) return;
  list.classList.add('hidden');
  list.replaceChildren();
}

function renderSuggestions(suggestions) {
  const list = document.getElementById('search-suggestions');
  if (!list) return;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    hideSuggestions();
    return;
  }

  const items = suggestions
    .filter((s) => s.placePrediction)
    .slice(0, 5)
    .map((s) => {
      const pred = s.placePrediction;
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.setAttribute('role', 'option');
      li.tabIndex = 0;

      const mainText =
        pred.structuredFormat?.mainText?.text || pred.text?.text || 'Lake Tahoe Landmark';
      const secondaryText = pred.structuredFormat?.secondaryText?.text || '';

      const mainSpan = document.createElement('span');
      mainSpan.className = 'suggestion-main';
      mainSpan.textContent = mainText;
      li.appendChild(mainSpan);

      if (secondaryText) {
        const subSpan = document.createElement('span');
        subSpan.className = 'suggestion-secondary';
        subSpan.textContent = secondaryText;
        li.appendChild(subSpan);
      }

      const chooseSuggestion = () => {
        const input = document.getElementById('landmark-search-input');
        const fullQuery = pred.text?.text || mainText;
        if (input) input.value = fullQuery;
        hideSuggestions();
        void searchLandmark(fullQuery, false);
      };

      li.addEventListener('click', chooseSuggestion);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          chooseSuggestion();
        }
      });

      return li;
    });

  if (items.length === 0) {
    hideSuggestions();
    return;
  }

  list.replaceChildren(...items);
  list.classList.remove('hidden');
}

async function fetchAutocompleteSuggestions(inputText) {
  const trimmed = inputText.trim();
  if (trimmed.length < 2) {
    hideSuggestions();
    return;
  }
  try {
    const resp = await fetch('/api/places/autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: trimmed,
        sessionToken: state.sessionToken,
      }),
    });
    const data = await resp.json();
    if (data.configured && Array.isArray(data.suggestions)) {
      renderSuggestions(data.suggestions);
    } else {
      hideSuggestions();
    }
  } catch {
    hideSuggestions();
  }
}

async function placeSearchMarker(lat, lng, title) {
  if (!state.maps3dReady || !state.map3d) return;
  const { Marker3DInteractiveElement } = state.mapsLibs.maps3d || {};
  const { PinElement } = state.mapsLibs.marker || {};
  if (!Marker3DInteractiveElement || !PinElement) return;

  if (state.searchMarker && state.searchMarker.parentNode) {
    state.searchMarker.parentNode.removeChild(state.searchMarker);
  }

  const pin = new PinElement({
    glyphText: '★',
    background: '#0284c7',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    scale: 1.2,
  });

  const marker = new Marker3DInteractiveElement({
    position: { lat, lng, altitude: 36 },
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    label: title,
    title,
  });
  marker.append(pin);
  state.map3d.append(marker);
  state.searchMarker = marker;
}

async function searchLandmark(query, isSeedSearch = false) {
  const trimmed = query.trim();
  if (!trimmed) return;

  try {
    const resp = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed }),
    });
    const data = await resp.json();

    if (!data.configured) {
      if (!isSeedSearch) {
        updateSelectedViewpointCard({
          badge: 'Search Pending Key',
          title: trimmed,
          address: 'Configure GOOGLE_MAPS_API_KEY in .env for live Places API (New) lookup',
          description:
            'Server-side /api/places/search proxy is ready. Add your Maps Demo Key or Cloud API key to fly directly to searched landmarks.',
          elevationM: null,
        });
      }
      return;
    }

    const place = Array.isArray(data.places) && data.places.length > 0 ? data.places[0] : null;
    if (!place || !place.location) {
      if (!isSeedSearch) {
        updateSelectedViewpointCard({
          badge: 'Not Found',
          title: trimmed,
          address: 'No matching Lake Tahoe landmark returned by Places API (New)',
          description: 'Try another Lake Tahoe destination such as Inspiration Point or Vikingsholm.',
          elevationM: null,
        });
      }
      return;
    }

    const displayName = place.displayName?.text || trimmed;
    const lat = place.location.latitude;
    const lng = place.location.longitude;

    if (isSeedSearch) {
      const elevation = await fetchPointElevation(lat, lng);
      // Enrich initial Emerald Bay card with live Places API (New) attributes
      const active = TRAIL_CHAPTERS.find((c) => c.id === state.activeChapterId) || TRAIL_CHAPTERS[0];
      updateSelectedViewpointCard({
        badge: `Chapter ${active.badge}`,
        title: displayName,
        address: place.formattedAddress || active.address,
        description: active.description,
        elevationM: elevation,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        googleMapsUri: place.googleMapsUri,
      });
      return;
    }

    state.sessionToken = createSessionToken();
    state.activeChapterId = `search:${place.id || displayName}`;

    updateSelectedViewpointCard({
      badge: 'Searched Landmark',
      title: displayName,
      address: place.formattedAddress || 'Lake Tahoe, CA',
      description: `Live Places API (New) result for "${trimmed}" (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
      elevationM: null,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      googleMapsUri: place.googleMapsUri,
    });

    await placeSearchMarker(lat, lng, displayName);
    flyCameraToTarget(
      {
        center: { lat, lng, altitude: 35 },
        heading: 25,
        tilt: 66,
        range: 1350,
      },
      2400
    );

    const elevation = await fetchPointElevation(lat, lng);
    if (state.activeChapterId === `search:${place.id || displayName}` && typeof elevation === 'number') {
      updateSelectedViewpointCard({
        badge: 'Searched Landmark',
        title: displayName,
        address: place.formattedAddress || 'Lake Tahoe, CA',
        description: `Live Places API (New) result for "${trimmed}" (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
        elevationM: elevation,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        googleMapsUri: place.googleMapsUri,
      });
    }
  } catch {
    // Keep UI responsive without console errors
  }
}

function loadGoogleMapsBootstrap(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }

    // Standard Google Maps JS API dynamic bootstrap loader
    ((g) => {
      let h;
      let a;
      let k;
      const p = 'The Google Maps JavaScript API';
      const c = 'google';
      const l = 'importLibrary';
      const q = '__ib__';
      const m = document;
      const b = window;
      const ns = (b[c] = b[c] || {});
      const d = (ns.maps = ns.maps || {});
      const r = new Set();
      const e = new URLSearchParams();
      const u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          await (a = m.createElement('script'));
          e.set('libraries', [...r] + '');
          for (k in g) {
            e.set(
              k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
              g[k]
            );
          }
          e.set('callback', c + '.maps.' + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(new Error(p + ' could not load.')));
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          m.head.append(a);
        }));
      if (d[l]) {
        resolve();
      } else {
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
        resolve();
      }
    })({
      key: apiKey,
      v: 'weekly',
    });
  });
}

async function init3DScene() {
  const map3d = document.getElementById('trail-map-3d');
  if (!map3d) return;
  state.map3d = map3d;

  if (!state.config?.hasApiKey || !state.config?.apiKey) {
    showMapBanner(
      'Photorealistic 3D Tiles require GOOGLE_MAPS_API_KEY in .env. Camera tour presets, telemetry, and BFF endpoints are active.'
    );
    return;
  }

  try {
    await loadGoogleMapsBootstrap(state.config.apiKey);

    // Load Places & Elevation JS libraries
    const [placesLib, elevationLib] = await Promise.all([
      google.maps.importLibrary('places'),
      google.maps.importLibrary('elevation'),
    ]);
    state.mapsLibs.places = placesLib;
    state.mapsLibs.elevation = elevationLib;

    if (!supportsWebGL2()) {
      showMapBanner(
        'WebGL2 is unavailable in this browser environment; 3D terrain rendering is paused while camera controls, Places, and Elevation APIs remain active.'
      );
      return;
    }

    const [maps3dLib, markerLib] = await Promise.all([
      google.maps.importLibrary('maps3d'),
      google.maps.importLibrary('marker'),
    ]);
    state.mapsLibs.maps3d = maps3dLib;
    state.mapsLibs.marker = markerLib;

    await customElements.whenDefined('gmp-map-3d');

    const { Polyline3DElement, Marker3DInteractiveElement, PopoverElement } = maps3dLib;
    const { PinElement } = markerLib;

    map3d.mode = 'HYBRID';
    map3d.internalUsageAttributionIds = [ATTRIBUTION_ID];

    // Extruded bright-red RGB(255, 0, 0) 3D hiking trail polyline
    const trailPolyline = new Polyline3DElement({
      path: TRAIL_PATH.map((pt) => ({ lat: pt.lat, lng: pt.lng, altitude: 18 })),
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      strokeColor: 'rgb(255, 0, 0)',
      strokeWidth: 8,
      outerColor: 'rgba(255, 255, 255, 0.78)',
      outerWidth: 0.25,
      drawsOccludedSegments: true,
    });
    map3d.append(trailPolyline);

    // Shared 3D Popover element
    const popover = new PopoverElement({
      open: false,
    });
    const popoverContent = document.createElement('div');
    popoverContent.style.padding = '6px 8px';
    popoverContent.style.maxWidth = '220px';
    const popoverTitle = document.createElement('strong');
    popoverTitle.style.display = 'block';
    popoverTitle.style.marginBottom = '3px';
    const popoverDesc = document.createElement('span');
    popoverDesc.style.fontSize = '12px';
    popoverContent.append(popoverTitle, popoverDesc);
    popover.append(popoverContent);
    map3d.append(popover);
    state.activePopover = popover;

    // Interactive 3D trailhead & viewpoint markers
    TRAIL_CHAPTERS.forEach((chapter) => {
      const pin = new PinElement({
        glyphText: chapter.badge,
        background: '#ef4444',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 1.15,
      });

      const marker = new Marker3DInteractiveElement({
        position: { lat: chapter.lat, lng: chapter.lng, altitude: 32 },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
        label: chapter.shortLabel,
        title: chapter.title,
        gmpPopoverTargetElement: popover,
      });
      marker.append(pin);

      marker.addEventListener('gmp-click', () => {
        popoverTitle.textContent = chapter.title;
        popoverDesc.textContent = chapter.description;
        popover.positionAnchor = marker;
        popover.open = true;
        void selectChapter(chapter.id);
      });

      map3d.append(marker);
    });

    // Live camera telemetry listeners
    const syncTelemetryFromMap = () => {
      if (state.isFlying) return;
      const heading = Number(map3d.heading);
      const tilt = Number(map3d.tilt);
      const range = Number(map3d.range);
      if (!Number.isFinite(range) || range <= 0) return;
      setTelemetryDisplay({ heading, tilt, range });
    };

    map3d.addEventListener('gmp-animationend', () => {
      state.isFlying = false;
      syncTelemetryFromMap();
    });
    map3d.addEventListener('gmp-headingchange', syncTelemetryFromMap);
    map3d.addEventListener('gmp-tiltchange', syncTelemetryFromMap);
    map3d.addEventListener('gmp-rangechange', syncTelemetryFromMap);
    map3d.addEventListener('gmp-error', () => {
      showMapBanner('3D map encountered a rendering error. Check your API key permissions.');
    });

    state.maps3dReady = true;
    hideMapBanner();
  } catch {
    showMapBanner('3D Map initialization fell back gracefully; sidebar controls remain active.');
  }
}

function wireUIEvents() {
  document.querySelectorAll('.chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.autoplayTimer) {
        toggleAutoplay();
      }
      void selectChapter(btn.dataset.chapterId);
    });
  });

  const autoplayBtn = document.getElementById('tour-autoplay-toggle');
  if (autoplayBtn) {
    autoplayBtn.addEventListener('click', toggleAutoplay);
  }

  const searchForm = document.getElementById('landmark-search-form');
  const searchInput = document.getElementById('landmark-search-input');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (state.autocompleteTimer) {
        clearTimeout(state.autocompleteTimer);
      }
      state.autocompleteTimer = setTimeout(() => {
        void fetchAutocompleteSuggestions(value);
      }, 220);
    });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      hideSuggestions();
      void searchLandmark(searchInput.value, false);
    });
  }

  document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.search-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      hideSuggestions();
    }
  });
}

async function bootstrap() {
  wireUIEvents();
  setTelemetryDisplay(TRAIL_CHAPTERS[0]);

  try {
    const cfgResp = await fetch('/api/config');
    state.config = await cfgResp.json();
  } catch {
    state.config = { apiKey: '', hasApiKey: false, mapId: 'DEMO_MAP_ID', attributionId: ATTRIBUTION_ID };
  }

  await Promise.all([
    init3DScene(),
    loadTrailElevationProfile(),
    searchLandmark(SEED_SEARCH_QUERY, true),
  ]);
}

void bootstrap();
