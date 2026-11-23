// Lake Tahoe 3D Trail Explorer — Zero-Bundler Vanilla ES Module Application
// Grounded in Google Maps Platform Maps JS 3D, Marker, Places (New), and Elevation APIs.

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

/**
 * 18-waypoint Rubicon Trail / Emerald Bay hiking corridor in Lake Tahoe.
 * Trail geometry connects Eagle Falls Trailhead along Emerald Bay cliffs to Rubicon Point.
 */
const TRAIL_PATH = [
  { lat: 38.9508, lng: -120.1128 }, // Eagle Falls Trailhead
  { lat: 38.9516, lng: -120.1112 },
  { lat: 38.9527, lng: -120.1093 },
  { lat: 38.9539, lng: -120.1071 },
  { lat: 38.9547, lng: -120.1049 },
  { lat: 38.9553, lng: -120.1026 },
  { lat: 38.9562, lng: -120.1003 },
  { lat: 38.9571, lng: -120.0985 },
  { lat: 38.9578, lng: -120.0972 }, // Rubicon Ridge
  { lat: 38.9564, lng: -120.0958 },
  { lat: 38.9548, lng: -120.0944 },
  { lat: 38.9533, lng: -120.0933 },
  { lat: 38.9522, lng: -120.0928 }, // Eagle Point Overlook
  { lat: 38.9556, lng: -120.0931 },
  { lat: 38.9589, lng: -120.0936 },
  { lat: 38.9621, lng: -120.0939 },
  { lat: 38.9648, lng: -120.0937 },
  { lat: 38.9672, lng: -120.0938 }, // Tahoe Summit / Rubicon Panorama
];

/**
 * Guided 3D camera storytelling chapters across Lake Tahoe Emerald Bay.
 */
const TOUR_CHAPTERS = [
  {
    id: 'overview',
    number: 1,
    title: '1. Emerald Bay Overview',
    shortLabel: 'Emerald Bay Overview',
    subtitle: 'Glacial fjord, Fannette Island, and the full red trail corridor',
    description:
      'Sweeping aerial perspective over Emerald Bay State Park and the Rubicon shoreline trail winding above turquoise alpine water.',
    position: { lat: 38.9542, lng: -120.1103, altitude: 1920 },
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 1920 },
      heading: 315,
      tilt: 64,
      range: 3400,
    },
    trailSampleIndex: 1,
  },
  {
    id: 'trailhead',
    number: 2,
    title: '2. Eagle Falls Trailhead',
    shortLabel: 'Eagle Falls Trailhead',
    subtitle: 'Granite canyon start & waterfall approach',
    description:
      'Trailhead gateway on the southwest rim above Emerald Bay where granite switchbacks climb past Eagle Falls toward the ridge.',
    position: { lat: 38.9508, lng: -120.1128, altitude: 2010 },
    camera: {
      center: { lat: 38.9508, lng: -120.1128, altitude: 2010 },
      heading: 48,
      tilt: 68,
      range: 1150,
    },
    trailSampleIndex: 0,
  },
  {
    id: 'ridge',
    number: 3,
    title: '3. Rubicon Ridge',
    shortLabel: 'Rubicon Ridge',
    subtitle: 'High pine-lined traverse above the bay',
    description:
      'Elevated granite traverse hugging the northern Emerald Bay cliffs with commanding sightlines across Lake Tahoe.',
    position: { lat: 38.9578, lng: -120.0972, altitude: 1985 },
    camera: {
      center: { lat: 38.9578, lng: -120.0972, altitude: 1985 },
      heading: 215,
      tilt: 71,
      range: 1350,
    },
    trailSampleIndex: 21,
  },
  {
    id: 'overlook',
    number: 4,
    title: '4. Eagle Point Overlook',
    shortLabel: 'Eagle Point Overlook',
    subtitle: 'Peninsula cliffs & emerald cove mouth',
    description:
      'Dramatic point framing the narrow entrance to Emerald Bay with deep cobalt water meeting sculpted Sierra granite.',
    position: { lat: 38.9522, lng: -120.0928, altitude: 1925 },
    camera: {
      center: { lat: 38.9522, lng: -120.0928, altitude: 1925 },
      heading: 282,
      tilt: 66,
      range: 1250,
    },
    trailSampleIndex: 31,
  },
  {
    id: 'summit',
    number: 5,
    title: '5. Tahoe Summit Panorama',
    shortLabel: 'Tahoe Summit Panorama',
    subtitle: 'Northern Rubicon crest & Sierra horizon',
    description:
      'High-altitude finale looking back south over the full Rubicon Trail arc and snow-dusted Desolation Wilderness peaks.',
    position: { lat: 38.9672, lng: -120.0938, altitude: 2040 },
    camera: {
      center: { lat: 38.9672, lng: -120.0938, altitude: 2040 },
      heading: 185,
      tilt: 62,
      range: 2200,
    },
    trailSampleIndex: 47,
  },
];

// DOM References
const map3d = document.getElementById('map-3d');
const statusBanner = document.getElementById('map-status-banner');
const chapterButtons = Array.from(document.querySelectorAll('.chapter-btn'));
const autoplayBtn = document.getElementById('tour-autoplay-toggle');
const viewpointCardEl = document.getElementById('selected-viewpoint-card');
const metricsSummaryEl = document.getElementById('trail-metrics-summary');
const elevationSvgEl = document.getElementById('elevation-profile-chart');
const elevationStatusEl = document.getElementById('elevation-status');
const elevationHoverEl = document.getElementById('elevation-hover-readout');
const telemetryHeadingEl = document.getElementById('telemetry-heading');
const telemetryTiltEl = document.getElementById('telemetry-tilt');
const telemetryRangeEl = document.getElementById('telemetry-range');
const autocompleteMountEl = document.getElementById('autocomplete-mount');
const searchFormEl = document.getElementById('landmark-search-form');
const searchInputEl = document.getElementById('landmark-search-input');

// Application State
const state = {
  mapsReady: false,
  activeChapterId: 'overview',
  isAutoPlaying: false,
  autoPlayTimerId: null,
  elevationSamples: [],
  totalDistanceKm: 0,
  seedPlace: null,
  chapterElevations: new Map(),
  searchedMarker: null,
  searchedPopover: null,
  trailFocusMarker: null,
  maps3dLib: null,
  markerLib: null,
  placesLib: null,
  elevationLib: null,
  elevatorService: null,
};

function showStatusBanner(message) {
  statusBanner.textContent = message;
  statusBanner.classList.remove('is-hidden');
}

function hideStatusBanner() {
  statusBanner.textContent = '';
  statusBanner.classList.add('is-hidden');
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
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeTotalDistanceKm(path) {
  let meters = 0;
  for (let i = 1; i < path.length; i += 1) {
    meters += haversineMeters(path[i - 1], path[i]);
  }
  return meters / 1000;
}

function formatNumber(value, decimals = 0) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function updateTelemetryUI({ heading, tilt, range }) {
  if (Number.isFinite(heading)) {
    const normalized = ((Math.round(heading) % 360) + 360) % 360;
    telemetryHeadingEl.textContent = `${normalized}°`;
  }
  if (Number.isFinite(tilt)) {
    telemetryTiltEl.textContent = `${Math.round(tilt)}°`;
  }
  if (Number.isFinite(range)) {
    telemetryRangeEl.textContent = `${formatNumber(Math.round(range))} m`;
  }
}

/**
 * Safely renders the Selected Viewpoint or Searched Landmark card using DOM APIs only.
 */
function renderSelectedCard({
  tagLabel,
  isPlace = false,
  title,
  description,
  lat,
  lng,
  elevationMeters = null,
  rating = null,
  userRatingCount = null,
  address = null,
  googleMapsUri = null,
}) {
  const fragment = document.createDocumentFragment();

  const topRow = document.createElement('div');
  topRow.className = 'viewpoint-top';

  const tag = document.createElement('span');
  tag.className = isPlace ? 'viewpoint-tag is-place' : 'viewpoint-tag';
  tag.textContent = tagLabel;
  topRow.appendChild(tag);

  const elevPill = document.createElement('span');
  elevPill.className = 'viewpoint-elev-pill';
  if (Number.isFinite(elevationMeters)) {
    const feet = Math.round(elevationMeters * 3.28084);
    elevPill.textContent = `${formatNumber(Math.round(elevationMeters))} m (${formatNumber(feet)} ft)`;
  } else {
    elevPill.textContent = 'Tahoe Basin';
  }
  topRow.appendChild(elevPill);
  fragment.appendChild(topRow);

  const headingEl = document.createElement('h3');
  headingEl.className = 'viewpoint-heading';
  headingEl.textContent = title;
  fragment.appendChild(headingEl);

  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'viewpoint-desc';
    descEl.textContent = description;
    fragment.appendChild(descEl);
  }

  if (address) {
    const addrEl = document.createElement('p');
    addrEl.className = 'viewpoint-desc';
    addrEl.textContent = address;
    fragment.appendChild(addrEl);
  }

  const metaRow = document.createElement('div');
  metaRow.className = 'viewpoint-meta-row';

  const coordsEl = document.createElement('span');
  coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  metaRow.appendChild(coordsEl);

  if (Number.isFinite(rating)) {
    const ratingEl = document.createElement('span');
    const countSuffix = Number.isFinite(userRatingCount)
      ? ` (${formatNumber(userRatingCount)})`
      : '';
    ratingEl.textContent = `★ ${rating.toFixed(1)}${countSuffix}`;
    metaRow.appendChild(ratingEl);
  }

  if (googleMapsUri) {
    const linkEl = document.createElement('a');
    linkEl.className = 'viewpoint-link';
    linkEl.href = googleMapsUri;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener noreferrer';
    linkEl.textContent = 'Open in Google Maps ↗';
    metaRow.appendChild(linkEl);
  }

  fragment.appendChild(metaRow);
  viewpointCardEl.replaceChildren(fragment);
}

function renderTrailMetrics(samples, totalDistanceKm) {
  if (!samples.length) {
    metricsSummaryEl.replaceChildren();
    return;
  }

  let minElev = Infinity;
  let maxElev = -Infinity;
  let ascent = 0;
  let descent = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const elev = samples[i].elevation;
    if (elev < minElev) minElev = elev;
    if (elev > maxElev) maxElev = elev;
    if (i > 0) {
      const delta = elev - samples[i - 1].elevation;
      if (delta > 0) ascent += delta;
      else descent += Math.abs(delta);
    }
  }

  const metrics = [
    { label: 'Distance', value: `${totalDistanceKm.toFixed(2)} km` },
    { label: 'Range', value: `${Math.round(minElev)}–${Math.round(maxElev)} m` },
    { label: 'Ascent', value: `+${Math.round(ascent)} m` },
    { label: 'Descent', value: `-${Math.round(descent)} m` },
  ];

  const fragment = document.createDocumentFragment();
  for (const metric of metrics) {
    const box = document.createElement('div');
    box.className = 'metric-box';

    const labelEl = document.createElement('span');
    labelEl.className = 'metric-label';
    labelEl.textContent = metric.label;

    const valueEl = document.createElement('span');
    valueEl.className = 'metric-value';
    valueEl.textContent = metric.value;

    box.appendChild(labelEl);
    box.appendChild(valueEl);
    fragment.appendChild(box);
  }
  metricsSummaryEl.replaceChildren(fragment);
}

/**
 * Renders the interactive SVG Elevation Profile chart via createElementNS (no innerHTML).
 */
function renderElevationChart(samples, totalDistanceKm, highlightIndex = -1) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const width = 320;
  const height = 112;
  const padLeft = 8;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 18;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  elevationSvgEl.replaceChildren();
  if (samples.length < 2) return;

  const elevations = samples.map((s) => s.elevation);
  const minElev = Math.min(...elevations) - 8;
  const maxElev = Math.max(...elevations) + 8;
  const elevSpan = Math.max(1, maxElev - minElev);

  const toX = (idx) => padLeft + (idx / (samples.length - 1)) * plotW;
  const toY = (elev) =>
    padTop + plotH - ((elev - minElev) / elevSpan) * plotH;

  // Gradient fill definition
  const defs = document.createElementNS(SVG_NS, 'defs');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  grad.setAttribute('id', 'tahoe-elev-grad');
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', '1');

  const stop1 = document.createElementNS(SVG_NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#ef4444');
  stop1.setAttribute('stop-opacity', '0.52');

  const stop2 = document.createElementNS(SVG_NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#ef4444');
  stop2.setAttribute('stop-opacity', '0.03');

  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  elevationSvgEl.appendChild(defs);

  // Subtle horizontal grid lines
  for (let g = 0; g <= 2; g += 1) {
    const gy = padTop + (g / 2) * plotH;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(padLeft));
    line.setAttribute('x2', String(width - padRight));
    line.setAttribute('y1', gy.toFixed(1));
    line.setAttribute('y2', gy.toFixed(1));
    line.setAttribute('stroke', 'rgba(148, 163, 184, 0.16)');
    line.setAttribute('stroke-dasharray', '3 3');
    elevationSvgEl.appendChild(line);
  }

  const points = samples.map((s, idx) => ({
    x: toX(idx),
    y: toY(s.elevation),
    sample: s,
    idx,
  }));

  const lineCoords = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPathData = [
    `M ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    ...points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    'Z',
  ].join(' ');

  const areaPath = document.createElementNS(SVG_NS, 'path');
  areaPath.setAttribute('d', areaPathData);
  areaPath.setAttribute('fill', 'url(#tahoe-elev-grad)');
  elevationSvgEl.appendChild(areaPath);

  const linePath = document.createElementNS(SVG_NS, 'polyline');
  linePath.setAttribute('points', lineCoords);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'rgb(255, 0, 0)');
  linePath.setAttribute('stroke-width', '2.2');
  linePath.setAttribute('stroke-linejoin', 'round');
  linePath.setAttribute('stroke-linecap', 'round');
  elevationSvgEl.appendChild(linePath);

  // Highlight marker elements
  const cursorLine = document.createElementNS(SVG_NS, 'line');
  cursorLine.setAttribute('y1', String(padTop));
  cursorLine.setAttribute('y2', String(padTop + plotH));
  cursorLine.setAttribute('stroke', '#38bdf8');
  cursorLine.setAttribute('stroke-width', '1');
  cursorLine.setAttribute('stroke-dasharray', '2 2');
  cursorLine.style.display = 'none';
  elevationSvgEl.appendChild(cursorLine);

  const cursorDot = document.createElementNS(SVG_NS, 'circle');
  cursorDot.setAttribute('r', '4');
  cursorDot.setAttribute('fill', '#38bdf8');
  cursorDot.setAttribute('stroke', '#ffffff');
  cursorDot.setAttribute('stroke-width', '1.5');
  cursorDot.style.display = 'none';
  elevationSvgEl.appendChild(cursorDot);

  const setActivePoint = (idx) => {
    if (idx < 0 || idx >= points.length) return;
    const p = points[idx];
    cursorLine.setAttribute('x1', p.x.toFixed(1));
    cursorLine.setAttribute('x2', p.x.toFixed(1));
    cursorLine.style.display = 'block';
    cursorDot.setAttribute('cx', p.x.toFixed(1));
    cursorDot.setAttribute('cy', p.y.toFixed(1));
    cursorDot.style.display = 'block';
    const distKm = ((idx / (samples.length - 1)) * totalDistanceKm).toFixed(2);
    elevationHoverEl.textContent = `${Math.round(p.sample.elevation)} m @ ${distKm} km`;
  };

  if (highlightIndex >= 0) {
    setActivePoint(highlightIndex);
  }

  // Axis labels
  const startLabel = document.createElementNS(SVG_NS, 'text');
  startLabel.setAttribute('x', String(padLeft));
  startLabel.setAttribute('y', String(height - 4));
  startLabel.setAttribute('fill', '#64748b');
  startLabel.setAttribute('font-size', '9');
  startLabel.textContent = '0.0 km';
  elevationSvgEl.appendChild(startLabel);

  const endLabel = document.createElementNS(SVG_NS, 'text');
  endLabel.setAttribute('x', String(width - padRight));
  endLabel.setAttribute('y', String(height - 4));
  endLabel.setAttribute('text-anchor', 'end');
  endLabel.setAttribute('fill', '#64748b');
  endLabel.setAttribute('font-size', '9');
  endLabel.textContent = `${totalDistanceKm.toFixed(2)} km`;
  elevationSvgEl.appendChild(endLabel);

  // Interactive overlay hit-rect
  const hitRect = document.createElementNS(SVG_NS, 'rect');
  hitRect.setAttribute('x', String(padLeft));
  hitRect.setAttribute('y', String(padTop));
  hitRect.setAttribute('width', String(plotW));
  hitRect.setAttribute('height', String(plotH));
  hitRect.setAttribute('fill', 'transparent');

  const resolveIndexFromPointer = (clientX) => {
    const rect = elevationSvgEl.getBoundingClientRect();
    if (!rect.width) return 0;
    const relX = ((clientX - rect.left) / rect.width) * width;
    const norm = Math.max(0, Math.min(1, (relX - padLeft) / plotW));
    return Math.round(norm * (samples.length - 1));
  };

  hitRect.addEventListener('pointermove', (ev) => {
    const idx = resolveIndexFromPointer(ev.clientX);
    setActivePoint(idx);
  });

  hitRect.addEventListener('click', (ev) => {
    const idx = resolveIndexFromPointer(ev.clientX);
    setActivePoint(idx);
    const sample = samples[idx];
    if (sample && sample.location) {
      focusTrailSample(sample);
    }
  });

  elevationSvgEl.appendChild(hitRect);
}

function focusTrailSample(sample) {
  stopAutoPlay();
  const lat =
    typeof sample.location.lat === 'function'
      ? sample.location.lat()
      : sample.location.lat;
  const lng =
    typeof sample.location.lng === 'function'
      ? sample.location.lng()
      : sample.location.lng;

  const targetCamera = {
    center: { lat, lng, altitude: sample.elevation + 25 },
    tilt: 68,
    heading: 315,
    range: 950,
  };

  updateTelemetryUI(targetCamera);

  if (state.mapsReady && typeof map3d.flyCameraTo === 'function') {
    map3d.flyCameraTo({
      endCamera: targetCamera,
      durationMillis: 1600,
    });
  }

  if (state.mapsReady && state.maps3dLib && state.markerLib) {
    const { Marker3DInteractiveElement } = state.maps3dLib;
    const { PinElement } = state.markerLib;
    if (!state.trailFocusMarker) {
      const pin = new PinElement({
        glyphText: '•',
        background: '#38bdf8',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 1.0,
      });
      state.trailFocusMarker = new Marker3DInteractiveElement({
        title: 'Selected Trail Sample',
        position: { lat, lng, altitude: 18 },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
      });
      state.trailFocusMarker.append(pin);
      map3d.append(state.trailFocusMarker);
    } else {
      state.trailFocusMarker.position = { lat, lng, altitude: 18 };
    }
  }
}

/**
 * Selects a chapter viewpoint, updates active UI state, and flies the 3D camera smoothly.
 */
function selectChapter(chapterId, { fromAutoPlay = false } = {}) {
  const chapter = TOUR_CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) return;

  if (!fromAutoPlay) {
    stopAutoPlay();
  }

  state.activeChapterId = chapter.id;

  for (const btn of chapterButtons) {
    const isMatch = btn.dataset.chapterId === chapter.id;
    btn.classList.toggle('is-active', isMatch);
    btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
  }

  const elev = state.chapterElevations.get(chapter.id) ?? chapter.position.altitude;
  const seed = chapter.id === 'overview' ? state.seedPlace : null;

  renderSelectedCard({
    tagLabel: `Chapter ${chapter.number} of ${TOUR_CHAPTERS.length}`,
    isPlace: false,
    title: chapter.shortLabel,
    description: chapter.description,
    lat: chapter.position.lat,
    lng: chapter.position.lng,
    elevationMeters: elev,
    rating: seed?.rating ?? null,
    userRatingCount: seed?.userRatingCount ?? null,
    address: seed?.formattedAddress ?? null,
    googleMapsUri: seed?.googleMapsURI ?? null,
  });

  updateTelemetryUI(chapter.camera);

  if (state.elevationSamples.length) {
    const idx = Math.min(
      state.elevationSamples.length - 1,
      Math.max(0, chapter.trailSampleIndex)
    );
    renderElevationChart(state.elevationSamples, state.totalDistanceKm, idx);
  }

  if (state.mapsReady && typeof map3d.flyCameraTo === 'function') {
    try {
      map3d.flyCameraTo({
        endCamera: chapter.camera,
        durationMillis: 2400,
      });
    } catch {
      // Fallback to direct camera property assignment if animation is interrupted
      map3d.center = chapter.camera.center;
      map3d.heading = chapter.camera.heading;
      map3d.tilt = chapter.camera.tilt;
      map3d.range = chapter.camera.range;
    }
  }
}

function stopAutoPlay() {
  if (state.autoPlayTimerId !== null) {
    window.clearInterval(state.autoPlayTimerId);
    state.autoPlayTimerId = null;
  }
  state.isAutoPlaying = false;
  autoplayBtn.classList.remove('is-playing');
  autoplayBtn.setAttribute('aria-pressed', 'false');
  autoplayBtn.textContent = 'Auto-Play';
}

function toggleAutoPlay() {
  if (state.isAutoPlaying) {
    stopAutoPlay();
    return;
  }
  state.isAutoPlaying = true;
  autoplayBtn.classList.add('is-playing');
  autoplayBtn.setAttribute('aria-pressed', 'true');
  autoplayBtn.textContent = 'Stop Tour';

  const advance = () => {
    const currentIdx = TOUR_CHAPTERS.findIndex((c) => c.id === state.activeChapterId);
    const nextIdx = (currentIdx + 1) % TOUR_CHAPTERS.length;
    selectChapter(TOUR_CHAPTERS[nextIdx].id, { fromAutoPlay: true });
  };

  advance();
  state.autoPlayTimerId = window.setInterval(advance, 5200);
}

/**
 * Fallback terrain elevation curve when running without a configured API key
 * so the interactive SVG chart and metrics remain functional in preview mode.
 */
function buildFallbackElevationSamples(path) {
  const sampleCount = 48;
  const fallbackHeights = [
    1985, 1972, 1960, 1945, 1938, 1930, 1924, 1918,
    1915, 1919, 1928, 1940, 1952, 1961, 1969, 1978,
    1986, 1994, 1998, 2003, 1995, 1985, 1974, 1962,
    1948, 1939, 1931, 1926, 1920, 1916, 1914, 1918,
    1924, 1932, 1941, 1955, 1968, 1982, 1996, 2008,
    2016, 2024, 2031, 2038, 2042, 2046, 2049, 2052,
  ];

  const samples = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / (sampleCount - 1);
    const scaled = t * (path.length - 1);
    const idx = Math.min(path.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    const p0 = path[idx];
    const p1 = path[idx + 1];
    samples.push({
      elevation: fallbackHeights[i],
      location: {
        lat: p0.lat + (p1.lat - p0.lat) * frac,
        lng: p0.lng + (p1.lng - p0.lng) * frac,
      },
    });
  }
  return samples;
}

/**
 * Queries ElevationService.getElevationAlongPath for live terrain elevation samples.
 */
async function loadLiveElevationProfile() {
  if (!state.elevatorService) return;
  try {
    const { results } = await state.elevatorService.getElevationAlongPath({
      path: TRAIL_PATH,
      samples: 48,
    });
    if (results && results.length) {
      state.elevationSamples = results;
      elevationStatusEl.textContent = `Live Elevation API (${results.length} samples)`;
      renderTrailMetrics(results, state.totalDistanceKm);
      const activeChapter = TOUR_CHAPTERS.find((c) => c.id === state.activeChapterId);
      renderElevationChart(
        results,
        state.totalDistanceKm,
        activeChapter ? activeChapter.trailSampleIndex : 0
      );
    }
  } catch {
    elevationStatusEl.textContent = 'Terrain elevation preview (API unavailable)';
  }
}

async function loadChapterElevations() {
  if (!state.elevatorService) return;
  try {
    const { results } = await state.elevatorService.getElevationForLocations({
      locations: TOUR_CHAPTERS.map((c) => ({
        lat: c.position.lat,
        lng: c.position.lng,
      })),
    });
    if (results && results.length === TOUR_CHAPTERS.length) {
      results.forEach((res, idx) => {
        if (Number.isFinite(res.elevation)) {
          state.chapterElevations.set(TOUR_CHAPTERS[idx].id, res.elevation);
        }
      });
      // Refresh active card with live ground elevation
      const activeChapter = TOUR_CHAPTERS.find((c) => c.id === state.activeChapterId);
      if (activeChapter) {
        selectChapter(activeChapter.id, { fromAutoPlay: true });
      }
    }
  } catch {
    // Keep chapter baseline altitudes cleanly
  }
}

async function queryPointElevation(latLng) {
  if (!state.elevatorService) return null;
  try {
    const { results } = await state.elevatorService.getElevationForLocations({
      locations: [latLng],
    });
    if (results && results[0] && Number.isFinite(results[0].elevation)) {
      return results[0].elevation;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Focuses a user-searched or autocompleted Place on the 3D map with a PinElement marker and flyCameraTo.
 */
async function focusSearchedPlace(place) {
  if (!place || !place.location) return;
  stopAutoPlay();

  const lat =
    typeof place.location.lat === 'function'
      ? place.location.lat()
      : place.location.lat;
  const lng =
    typeof place.location.lng === 'function'
      ? place.location.lng()
      : place.location.lng;

  const elevation = (await queryPointElevation({ lat, lng })) ?? 1920;

  if (state.mapsReady && state.maps3dLib && state.markerLib) {
    const { Marker3DInteractiveElement, PopoverElement } = state.maps3dLib;
    const { PinElement } = state.markerLib;

    if (state.searchedMarker) state.searchedMarker.remove();
    if (state.searchedPopover) state.searchedPopover.remove();

    const pin = new PinElement({
      glyphText: '★',
      glyphColor: '#ffffff',
      background: '#f59e0b',
      borderColor: '#ffffff',
      scale: 1.35,
    });

    const popover = new PopoverElement();
    const header = document.createElement('span');
    header.slot = 'header';
    header.textContent = place.displayName || 'Searched Landmark';
    popover.append(header);

    const body = document.createElement('span');
    body.textContent =
      place.formattedAddress ||
      `Elevation: ${Math.round(elevation)} m`;
    popover.append(body);

    const marker = new Marker3DInteractiveElement({
      title: place.displayName || 'Searched Landmark',
      position: { lat, lng, altitude: 28 },
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      gmpPopoverTargetElement: popover,
    });
    marker.append(pin);

    map3d.append(marker);
    map3d.append(popover);
    state.searchedMarker = marker;
    state.searchedPopover = popover;
  }

  for (const btn of chapterButtons) {
    btn.classList.remove('is-active');
  }

  renderSelectedCard({
    tagLabel: 'Places API (New)',
    isPlace: true,
    title: place.displayName || 'Lake Tahoe Landmark',
    description: 'Live landmark search result centered in 3D view.',
    lat,
    lng,
    elevationMeters: elevation,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    address: place.formattedAddress || null,
    googleMapsUri: place.googleMapsURI || null,
  });

  const endCamera = {
    center: { lat, lng, altitude: elevation + 55 },
    tilt: 66,
    heading: 330,
    range: 1350,
  };
  updateTelemetryUI(endCamera);

  if (state.mapsReady && typeof map3d.flyCameraTo === 'function') {
    map3d.flyCameraTo({
      endCamera,
      durationMillis: 2400,
    });
  }
}

async function runTextPlaceSearch(query, { isSeed = false } = {}) {
  const trimmed = (query || '').trim();
  if (!trimmed) return;

  if (!state.mapsReady || !state.placesLib) {
    showStatusBanner(
      'Configure GOOGLE_MAPS_API_KEY in .env to enable live Places API (New) landmark search.'
    );
    return;
  }

  try {
    const { Place } = state.placesLib;
    const { places } = await Place.searchByText({
      textQuery: trimmed,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsURI',
      ],
      locationBias: { lat: 38.9542, lng: -120.1103 },
      maxResultCount: 1,
    });

    if (!places || !places.length) {
      if (!isSeed) {
        showStatusBanner(`No Lake Tahoe place found for "${trimmed}".`);
      }
      return;
    }

    const firstPlace = places[0];
    if (isSeed) {
      state.seedPlace = firstPlace;
      if (state.activeChapterId === 'overview') {
        selectChapter('overview', { fromAutoPlay: true });
      }
      return;
    }

    hideStatusBanner();
    await focusSearchedPlace(firstPlace);
  } catch {
    if (!isSeed) {
      showStatusBanner(`Unable to search "${trimmed}" right now.`);
    }
  }
}

/**
 * Renders the extruded red RGB(255, 0, 0) 3D trail polyline and 3D viewpoint markers.
 */
function render3DTrailAndMarkers() {
  const {
    Polyline3DElement,
    Marker3DInteractiveElement,
    PopoverElement,
  } = state.maps3dLib;
  const { PinElement } = state.markerLib;

  // Bright red extruded 3D hiking trail route
  const trailPolyline = new Polyline3DElement({
    path: TRAIL_PATH.map((pt) => ({ lat: pt.lat, lng: pt.lng, altitude: 14 })),
    strokeColor: 'rgb(255, 0, 0)',
    outerColor: 'rgba(255, 255, 255, 0.78)',
    outerWidth: 0.22,
    strokeWidth: 8,
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    drawsOccludedSegments: true,
  });
  map3d.append(trailPolyline);

  // Interactive 3D trailhead & viewpoint markers
  TOUR_CHAPTERS.forEach((chapter) => {
    const pin = new PinElement({
      glyphText: String(chapter.number),
      glyphColor: '#FFFFFF',
      background: '#dc2626',
      borderColor: '#FFFFFF',
      scale: 1.25,
    });

    const popover = new PopoverElement();
    const header = document.createElement('span');
    header.slot = 'header';
    header.textContent = chapter.shortLabel;
    popover.append(header);

    const body = document.createElement('span');
    body.textContent = chapter.subtitle;
    popover.append(body);

    const marker = new Marker3DInteractiveElement({
      title: chapter.shortLabel,
      position: {
        lat: chapter.position.lat,
        lng: chapter.position.lng,
        altitude: 26,
      },
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      gmpPopoverTargetElement: popover,
    });

    marker.append(pin);
    marker.addEventListener('gmp-click', () => {
      selectChapter(chapter.id);
    });

    map3d.append(marker);
    map3d.append(popover);
  });
}

function initPlaceAutocomplete() {
  if (!state.placesLib) return;
  const { PlaceAutocompleteElement } = state.placesLib;
  const autocompleteEl = new PlaceAutocompleteElement({
    locationBias: {
      north: 39.28,
      south: 38.82,
      east: -119.85,
      west: -120.28,
    },
  });
  autocompleteEl.setAttribute('aria-label', 'Autocomplete Lake Tahoe landmark');
  autocompleteMountEl.replaceChildren(autocompleteEl);

  autocompleteEl.addEventListener('gmp-select', async ({ placePrediction }) => {
    if (!placePrediction) return;
    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsURI',
      ],
    });
    if (place.location) {
      if (searchInputEl && place.displayName) {
        searchInputEl.value = place.displayName;
      }
      await focusSearchedPlace(place);
    }
  });
}

function attachMap3DTelemetryListeners() {
  const syncCameraTelemetry = () => {
    updateTelemetryUI({
      heading: map3d.heading,
      tilt: map3d.tilt,
      range: map3d.range,
    });
  };

  map3d.addEventListener('gmp-camerapositionchange', syncCameraTelemetry);
  map3d.addEventListener('gmp-headingchange', syncCameraTelemetry);
  map3d.addEventListener('gmp-tiltchange', syncCameraTelemetry);
  map3d.addEventListener('gmp-rangechange', syncCameraTelemetry);
  map3d.addEventListener('gmp-error', () => {
    showStatusBanner(
      'Photorealistic 3D Tiles require WebGL2 support and an API key enabled for Maps JavaScript API.'
    );
  });
}

function wireStaticUIEvents() {
  for (const btn of chapterButtons) {
    btn.addEventListener('click', () => {
      selectChapter(btn.dataset.chapterId);
    });
  }

  autoplayBtn.addEventListener('click', toggleAutoPlay);

  searchFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    await runTextPlaceSearch(searchInputEl.value);
  });
}

async function bootstrap() {
  state.totalDistanceKm = computeTotalDistanceKm(TRAIL_PATH);

  // Render initial trail metrics & elevation chart immediately so UI is responsive
  const fallbackSamples = buildFallbackElevationSamples(TRAIL_PATH);
  state.elevationSamples = fallbackSamples;
  renderTrailMetrics(fallbackSamples, state.totalDistanceKm);
  renderElevationChart(fallbackSamples, state.totalDistanceKm, 1);

  wireStaticUIEvents();
  selectChapter('overview', { fromAutoPlay: true });

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    elevationStatusEl.textContent = 'Preview terrain profile (configure API key for live Elevation API)';
    showStatusBanner(
      'API key not configured. Add GOOGLE_MAPS_API_KEY to .env to load Photorealistic 3D Tiles, live Elevation API, and Places API (New).'
    );
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });

    const [maps3dLib, markerLib, placesLib, elevationLib] = await Promise.all([
      importLibrary('maps3d'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('elevation'),
    ]);

    state.maps3dLib = maps3dLib;
    state.markerLib = markerLib;
    state.placesLib = placesLib;
    state.elevationLib = elevationLib;
    state.elevatorService = new elevationLib.ElevationService();

    // Ensure attribution ID and mode are configured on the upgraded Map3DElement
    map3d.internalUsageAttributionIds = [ATTRIBUTION_ID];
    map3d.mode = 'SATELLITE';
    state.mapsReady = true;

    attachMap3DTelemetryListeners();
    render3DTrailAndMarkers();
    initPlaceAutocomplete();

    await Promise.all([
      loadLiveElevationProfile(),
      loadChapterElevations(),
      runTextPlaceSearch(SEED_SEARCH_QUERY, { isSeed: true }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to initialize 3D map.';
    elevationStatusEl.textContent = 'Preview terrain profile (Maps JS load failed)';
    showStatusBanner(`Google Maps 3D initialization note: ${message}`);
  }
}

void bootstrap();
