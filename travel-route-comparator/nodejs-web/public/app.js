// Frontend application for Multi-Modal Commute Comparator & Trail Elevation Tracker.
// Uses Google Maps JavaScript API Dynamic Library Import (Map, AdvancedMarkerElement,
// PinElement, PlaceAutocompleteElement with gmp-select, Polyline, BicyclingLayer,
// geometry.encoding) and local Express BFF proxies (/api/places/*, /api/routes/compute,
// /api/elevation/profile) with zero deprecated APIs and zero innerHTML assignments.

const SVG_NS = 'http://www.w3.org/2000/svg';

const DENVER_BOULDER_BOUNDS = {
  south: 39.55,
  west: -105.45,
  north: 40.15,
  east: -104.75,
};

const ROUTE_PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#d97706'];

const MODE_LABELS = {
  BICYCLE: 'Cycling',
  DRIVE: 'Driving',
  WALK: 'Walking',
  TRANSIT: 'Transit',
};

const state = {
  config: null,
  mapsReady: false,
  map: null,
  bicyclingLayer: null,
  libs: {},
  origin: null,
  destination: null,
  activeMode: 'BICYCLE',
  selectedRouteIndex: 0,
  modifiers: {
    avoidTolls: false,
    avoidHighways: false,
    ecoFriendly: true,
  },
  routesByMode: {
    BICYCLE: [],
    DRIVE: [],
    WALK: [],
    TRANSIT: [],
  },
  polylines: [],
  originMarker: null,
  destinationMarker: null,
  hoverMarker: null,
  elevationData: null,
  elevationRequestSeq: 0,
  routeRequestSeq: 0,
};

const dom = {
  statusPill: document.getElementById('status-pill'),
  kpiEta: document.getElementById('kpi-eta'),
  kpiDistance: document.getElementById('kpi-distance'),
  kpiElevationGain: document.getElementById('kpi-elevation-gain'),
  betaBanner: document.getElementById('beta-advisory-banner'),
  errorBanner: document.getElementById('error-banner'),
  errorBannerText: document.getElementById('error-banner-text'),
  originSlot: document.getElementById('origin-autocomplete-input'),
  destinationSlot: document.getElementById('destination-autocomplete-input'),
  originChip: document.getElementById('origin-chip'),
  destinationChip: document.getElementById('destination-chip'),
  swapBtn: document.getElementById('swap-locations-btn'),
  modeButtons: Array.from(document.querySelectorAll('.mode-btn')),
  avoidTollsToggle: document.getElementById('avoid-tolls-toggle'),
  avoidHighwaysToggle: document.getElementById('avoid-highways-toggle'),
  ecoFriendlyToggle: document.getElementById('eco-friendly-toggle'),
  bicyclingLayerToggle: document.getElementById('bicycling-layer-toggle'),
  routeCountBadge: document.getElementById('route-count-badge'),
  routeCardsList: document.getElementById('route-cards-list'),
  mapCanvas: document.getElementById('map-canvas'),
  elevGainStat: document.getElementById('elev-gain-stat'),
  elevLossStat: document.getElementById('elev-loss-stat'),
  elevRangeStat: document.getElementById('elev-range-stat'),
  elevGradeStat: document.getElementById('elev-grade-stat'),
  elevHoverReadout: document.getElementById('elevation-hover-readout'),
  elevSvg: document.getElementById('elevation-profile-chart'),
  elevEmptyOverlay: document.getElementById('elevation-empty-overlay'),
  elevEmptyMessage: document.getElementById('elevation-empty-message'),
  sampleTerrainBtn: document.getElementById('sample-terrain-btn'),
};

function setStatus(text) {
  dom.statusPill.textContent = text;
}

function showError(message) {
  dom.errorBannerText.textContent = message;
  dom.errorBanner.classList.remove('hidden');
}

function clearError() {
  dom.errorBannerText.textContent = '';
  dom.errorBanner.classList.add('hidden');
}

function parseDurationSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parsed = Number.parseFloat(durationStr.replace('s', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '--';
  const miles = meters / 1609.344;
  const km = meters / 1000;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

function formatShortDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '--';
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function formatTollPrice(tollInfo) {
  const prices = tollInfo?.estimatedPrice;
  if (!Array.isArray(prices) || prices.length === 0) {
    return tollInfo ? 'Toll road' : null;
  }
  const first = prices[0];
  const units = Number(first.units || 0);
  const nanos = Number(first.nanos || 0) / 1e9;
  const amount = units + nanos;
  const currency = first.currencyCode || 'USD';
  if (!Number.isFinite(amount) || amount <= 0) return 'Toll road';
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toFixed(2)} toll`;
}

function loadGoogleMapsBootstrap(apiKey) {
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
          for (k in g) e.set(k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()), g[k]);
          e.set('callback', c + '.maps.' + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + ' could not load.')));
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          m.head.append(a);
        }));
    d[l]
      ? console.warn(p + ' only loads once. Ignoring:', g)
      : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
  })({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
  });
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function resolveSeedPlace(query) {
  const data = await apiPost('/api/places/search', { textQuery: query });
  const first = Array.isArray(data.places) ? data.places[0] : null;
  if (!first || !first.location) {
    throw new Error(`Could not resolve seeded place: ${query}`);
  }
  return {
    placeId: first.id,
    displayName: first.displayName?.text || query,
    formattedAddress: first.formattedAddress || query,
    location: {
      lat: first.location.latitude,
      lng: first.location.longitude,
    },
  };
}

function updateEndpointChips() {
  if (state.origin) {
    dom.originChip.textContent = `${state.origin.displayName} — ${state.origin.formattedAddress}`;
  }
  if (state.destination) {
    dom.destinationChip.textContent = `${state.destination.displayName} — ${state.destination.formattedAddress}`;
  }
}

function mountAutocompletePickers() {
  const { PlaceAutocompleteElement } = state.libs.places;

  const createPicker = (placeholderText, onSelected) => {
    const picker = new PlaceAutocompleteElement({
      locationBias: DENVER_BOULDER_BOUNDS,
      includedRegionCodes: ['us'],
      placeholder: placeholderText,
    });

    picker.addEventListener('gmp-select', async (event) => {
      try {
        const placePrediction = event.placePrediction;
        if (!placePrediction) return;
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        if (!place.location) return;
        onSelected({
          placeId: place.id,
          displayName: place.displayName || place.formattedAddress || 'Selected Place',
          formattedAddress: place.formattedAddress || '',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Unable to fetch selected place details.');
      }
    });

    picker.addEventListener('gmp-error', () => {
      showError('Place autocomplete service returned an error. Verify your API key permissions.');
    });

    return picker;
  };

  const originPicker = createPicker('Search origin (e.g., Denver Union Station)', async (place) => {
    state.origin = place;
    updateEndpointChips();
    updateEndpointMarkers();
    await recomputeAllModes();
  });

  const destPicker = createPicker('Search destination (e.g., Chautauqua Park, Boulder)', async (place) => {
    state.destination = place;
    updateEndpointChips();
    updateEndpointMarkers();
    await recomputeAllModes();
  });

  dom.originSlot.replaceChildren(originPicker);
  dom.destinationSlot.replaceChildren(destPicker);
}

function updateEndpointMarkers() {
  if (!state.mapsReady) return;
  const { AdvancedMarkerElement, PinElement } = state.libs.marker;

  if (state.originMarker) {
    state.originMarker.map = null;
    state.originMarker = null;
  }
  if (state.destinationMarker) {
    state.destinationMarker.map = null;
    state.destinationMarker = null;
  }

  if (state.origin?.location) {
    const pinA = new PinElement({
      background: '#0f766e',
      borderColor: '#134e4a',
      glyphColor: '#ffffff',
      glyphText: 'A',
      scale: 1.1,
    });
    const markerA = new AdvancedMarkerElement({
      map: state.map,
      position: state.origin.location,
      title: `Origin: ${state.origin.displayName}`,
    });
    markerA.append(pinA);
    state.originMarker = markerA;
  }

  if (state.destination?.location) {
    const pinB = new PinElement({
      background: '#dc2626',
      borderColor: '#7f1d1d',
      glyphColor: '#ffffff',
      glyphText: 'B',
      scale: 1.1,
    });
    const markerB = new AdvancedMarkerElement({
      map: state.map,
      position: state.destination.location,
      title: `Destination: ${state.destination.displayName}`,
    });
    markerB.append(pinB);
    state.destinationMarker = markerB;
  }
}

function clearRoutePolylines() {
  for (const poly of state.polylines) {
    poly.setMap(null);
  }
  state.polylines = [];
}

function ensureHoverMarker(position) {
  if (!state.mapsReady) return;
  const { AdvancedMarkerElement } = state.libs.marker;

  if (!state.hoverMarker) {
    const dot = document.createElement('div');
    dot.style.width = '16px';
    dot.style.height = '16px';
    dot.style.borderRadius = '999px';
    dot.style.background = '#f97316';
    dot.style.border = '3px solid #ffffff';
    dot.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.4)';

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position,
      title: 'Elevation profile position',
      zIndex: 999,
    });
    marker.append(dot);
    state.hoverMarker = marker;
  } else {
    state.hoverMarker.position = position;
    state.hoverMarker.map = state.map;
  }
}

function hideHoverMarker() {
  if (state.hoverMarker) {
    state.hoverMarker.map = null;
  }
}

function renderActiveRoutesOnMap() {
  if (!state.mapsReady) return;
  clearRoutePolylines();

  const routes = state.routesByMode[state.activeMode] || [];
  const { Polyline } = state.libs.maps;
  const { LatLngBounds } = state.libs.core;
  const { encoding } = state.libs.geometry;

  if (routes.length === 0) return;

  const bounds = new LatLngBounds();
  if (state.origin?.location) bounds.extend(state.origin.location);
  if (state.destination?.location) bounds.extend(state.destination.location);

  // Draw non-selected routes first so the selected route sits on top.
  routes.forEach((route, idx) => {
    const encoded = route.polyline?.encodedPolyline;
    if (!encoded) return;
    const path = encoding.decodePath(encoded);
    const isSelected = idx === state.selectedRouteIndex;
    const color = ROUTE_PALETTE[idx % ROUTE_PALETTE.length];

    if (isSelected) {
      for (const pt of path) bounds.extend(pt);
    }

    const poly = new Polyline({
      map: state.map,
      path,
      strokeColor: color,
      strokeOpacity: isSelected ? 0.94 : 0.45,
      strokeWeight: isSelected ? 6 : 4,
      zIndex: isSelected ? 20 : 10 + idx,
      clickable: true,
    });

    poly.addListener('click', () => {
      if (state.selectedRouteIndex !== idx) {
        selectRouteIndex(idx);
      }
    });

    state.polylines.push(poly);
  });

  state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
}

function renderBetaAdvisory() {
  const show = state.activeMode === 'BICYCLE' || state.activeMode === 'WALK';
  dom.betaBanner.classList.toggle('hidden', !show);
}

function renderBicyclingLayer() {
  if (!state.mapsReady || !state.bicyclingLayer) return;
  const enabled = dom.bicyclingLayerToggle.checked;
  state.bicyclingLayer.setMap(enabled ? state.map : null);
}

function renderModeSummaries() {
  for (const mode of Object.keys(MODE_LABELS)) {
    const routes = state.routesByMode[mode] || [];
    const primary = routes[0];
    const etaEl = document.getElementById(`eta-${mode}`);
    const distEl = document.getElementById(`dist-${mode}`);
    if (primary) {
      const secs = parseDurationSeconds(primary.duration);
      etaEl.textContent = primary.localizedValues?.duration?.text || formatDuration(secs);
      distEl.textContent = primary.localizedValues?.distance?.text || formatShortDistance(primary.distanceMeters);
    } else {
      etaEl.textContent = 'N/A';
      distEl.textContent = '--';
    }
  }

  for (const btn of dom.modeButtons) {
    const isActive = btn.dataset.mode === state.activeMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }
}

function renderRouteCards() {
  const routes = state.routesByMode[state.activeMode] || [];
  dom.routeCountBadge.textContent = `${routes.length} ${routes.length === 1 ? 'route' : 'routes'}`;

  if (routes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = `No ${MODE_LABELS[state.activeMode]} routes found for this origin and destination.`;
    dom.routeCardsList.replaceChildren(empty);
    dom.kpiEta.textContent = '--';
    dom.kpiDistance.textContent = '--';
    return;
  }

  const fragment = document.createDocumentFragment();
  routes.forEach((route, idx) => {
    const isSelected = idx === state.selectedRouteIndex;
    const color = ROUTE_PALETTE[idx % ROUTE_PALETTE.length];
    const labels = Array.isArray(route.routeLabels) ? route.routeLabels : [];
    const durationSec = parseDurationSeconds(route.duration);
    const etaText = route.localizedValues?.duration?.text || formatDuration(durationSec);
    const distText = route.localizedValues?.distance?.text || formatDistance(route.distanceMeters);

    const card = document.createElement('button');
    card.type = 'button';
    card.id = `route-card-${idx}`;
    card.className = `route-card${isSelected ? ' selected' : ''}`;
    card.style.borderLeftColor = color;
    card.addEventListener('click', () => selectRouteIndex(idx));

    const top = document.createElement('div');
    top.className = 'route-card-top';

    const title = document.createElement('span');
    title.className = 'route-card-title';
    if (labels.includes('FUEL_EFFICIENT') && !labels.includes('DEFAULT_ROUTE')) {
      title.textContent = `${MODE_LABELS[state.activeMode]} — Eco Route`;
    } else if (labels.includes('DEFAULT_ROUTE')) {
      title.textContent = `${MODE_LABELS[state.activeMode]} — Recommended`;
    } else {
      title.textContent = `${MODE_LABELS[state.activeMode]} — Option ${idx + 1}`;
    }

    const eta = document.createElement('span');
    eta.className = 'route-card-eta';
    eta.textContent = etaText;
    top.append(title, eta);

    const meta = document.createElement('div');
    meta.className = 'route-card-meta';
    const distSpan = document.createElement('span');
    distSpan.textContent = distText;
    const metricSub = document.createElement('span');
    metricSub.textContent = `${(route.distanceMeters / 1000).toFixed(1)} km`;
    meta.append(distSpan, metricSub);

    const badges = document.createElement('div');
    badges.className = 'route-badges';

    if (labels.includes('DEFAULT_ROUTE')) {
      const b = document.createElement('span');
      b.className = 'badge badge-primary';
      b.textContent = 'Recommended';
      badges.append(b);
    }
    if (labels.includes('FUEL_EFFICIENT')) {
      const b = document.createElement('span');
      b.className = 'badge badge-eco';
      b.textContent = 'Eco-Friendly';
      badges.append(b);
    }
    if (labels.includes('DEFAULT_ROUTE_ALTERNATE')) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'Alternative';
      badges.append(b);
    }

    const tollLabel = formatTollPrice(route.travelAdvisory?.tollInfo);
    if (tollLabel) {
      const b = document.createElement('span');
      b.className = 'badge badge-toll';
      b.textContent = tollLabel;
      badges.append(b);
    } else if (state.activeMode === 'DRIVE') {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'No Tolls';
      badges.append(b);
    }

    const fuelMicro = Number(route.travelAdvisory?.fuelConsumptionMicroliters || 0);
    if (fuelMicro > 0) {
      const liters = fuelMicro / 1_000_000;
      const b = document.createElement('span');
      b.className = 'badge badge-eco';
      b.textContent = `~${liters.toFixed(2)} L fuel`;
      badges.append(b);
    }

    card.append(top, meta, badges);

    if (Array.isArray(route.warnings) && route.warnings.length > 0) {
      const warn = document.createElement('div');
      warn.className = 'route-warning';
      warn.textContent = route.warnings[0];
      card.append(warn);
    }

    fragment.append(card);
  });

  dom.routeCardsList.replaceChildren(fragment);

  const selectedRoute = routes[state.selectedRouteIndex] || routes[0];
  if (selectedRoute) {
    const secs = parseDurationSeconds(selectedRoute.duration);
    dom.kpiEta.textContent = selectedRoute.localizedValues?.duration?.text || formatDuration(secs);
    dom.kpiDistance.textContent =
      selectedRoute.localizedValues?.distance?.text || formatShortDistance(selectedRoute.distanceMeters);
  }
}

function resetElevationStats() {
  dom.elevGainStat.textContent = '--';
  dom.elevLossStat.textContent = '--';
  dom.elevRangeStat.textContent = '--';
  dom.elevGradeStat.textContent = '--';
  dom.kpiElevationGain.textContent = '--';
  dom.elevHoverReadout.textContent = 'Hover chart to scrub route elevation';
}

function createSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, String(val));
  }
  return el;
}

function renderElevationChart(profile) {
  const samples = profile?.results || [];
  const metrics = profile?.metrics;
  if (samples.length < 2 || !metrics) {
    dom.elevSvg.replaceChildren();
    resetElevationStats();
    return;
  }

  dom.elevEmptyOverlay.classList.add('hidden');
  dom.elevGainStat.textContent = `+${metrics.elevationGainMeters} m`;
  dom.elevLossStat.textContent = `-${metrics.elevationLossMeters} m`;
  dom.elevRangeStat.textContent = `${metrics.minElevationMeters}–${metrics.maxElevationMeters} m`;
  dom.elevGradeStat.textContent = `${metrics.maxGradePct > 0 ? '+' : ''}${metrics.maxGradePct}%`;
  dom.kpiElevationGain.textContent = `+${metrics.elevationGainMeters} m`;

  const width = 760;
  const height = 132;
  const padLeft = 44;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minE = metrics.minElevationMeters;
  const maxE = Math.max(metrics.maxElevationMeters, minE + 5);
  const totalDist = Math.max(metrics.totalDistanceMeters, 1);

  const coords = samples.map((s) => {
    const x = padLeft + (s.distanceMeters / totalDist) * plotW;
    const y = padTop + (1 - (s.elevation - minE) / (maxE - minE)) * plotH;
    return { x, y, sample: s };
  });

  const defs = createSvgEl('defs');
  const grad = createSvgEl('linearGradient', {
    id: 'elevAreaGrad',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
  });
  grad.append(
    createSvgEl('stop', { offset: '0%', 'stop-color': '#0f766e', 'stop-opacity': '0.36' }),
    createSvgEl('stop', { offset: '100%', 'stop-color': '#0f766e', 'stop-opacity': '0.04' })
  );
  defs.append(grad);

  const children = [defs];

  // Gridlines & elevation axis labels
  const gridSteps = [0, 0.5, 1];
  for (const t of gridSteps) {
    const y = padTop + t * plotH;
    const elevVal = Math.round(maxE - t * (maxE - minE));
    children.push(
      createSvgEl('line', {
        x1: padLeft,
        y1: y,
        x2: width - padRight,
        y2: y,
        stroke: '#cbd5e1',
        'stroke-dasharray': '3,3',
        'stroke-width': '1',
      })
    );
    const label = createSvgEl('text', {
      x: padLeft - 6,
      y: y + 3,
      'text-anchor': 'end',
      'font-size': '10',
      fill: '#64748b',
    });
    label.textContent = `${elevVal}m`;
    children.push(label);
  }

  // Area polygon
  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints = [
    `${padLeft},${padTop + plotH}`,
    linePoints,
    `${coords[coords.length - 1].x.toFixed(1)},${padTop + plotH}`,
  ].join(' ');

  children.push(
    createSvgEl('polygon', {
      points: areaPoints,
      fill: 'url(#elevAreaGrad)',
    })
  );

  // Slope-colored segments along baseline
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const grade = curr.sample.gradePct;
    const segColor =
      grade >= 4 ? '#ea580c' : grade >= 1.5 ? '#f59e0b' : grade <= -3 ? '#0284c7' : '#0f766e';
    children.push(
      createSvgEl('line', {
        x1: prev.x.toFixed(1),
        y1: padTop + plotH + 4,
        x2: curr.x.toFixed(1),
        y2: padTop + plotH + 4,
        stroke: segColor,
        'stroke-width': '3',
      })
    );
  }

  // Main elevation curve
  children.push(
    createSvgEl('polyline', {
      points: linePoints,
      fill: 'none',
      stroke: '#0f766e',
      'stroke-width': '2.4',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    })
  );

  // Distance axis labels
  const startDistLabel = createSvgEl('text', {
    x: padLeft,
    y: height - 3,
    'font-size': '10',
    fill: '#64748b',
  });
  startDistLabel.textContent = '0 km';

  const midDistLabel = createSvgEl('text', {
    x: padLeft + plotW / 2,
    y: height - 3,
    'text-anchor': 'middle',
    'font-size': '10',
    fill: '#64748b',
  });
  midDistLabel.textContent = `${(totalDist / 2000).toFixed(1)} km`;

  const endDistLabel = createSvgEl('text', {
    x: width - padRight,
    y: height - 3,
    'text-anchor': 'end',
    'font-size': '10',
    fill: '#64748b',
  });
  endDistLabel.textContent = `${(totalDist / 1000).toFixed(1)} km`;

  children.push(startDistLabel, midDistLabel, endDistLabel);

  // Interactive cursor group
  const cursorLine = createSvgEl('line', {
    x1: padLeft,
    y1: padTop,
    x2: padLeft,
    y2: padTop + plotH,
    stroke: '#f97316',
    'stroke-width': '1.5',
    'stroke-dasharray': '4,2',
    visibility: 'hidden',
  });
  const cursorDot = createSvgEl('circle', {
    cx: padLeft,
    cy: padTop + plotH / 2,
    r: '5',
    fill: '#f97316',
    stroke: '#ffffff',
    'stroke-width': '2',
    visibility: 'hidden',
  });

  children.push(cursorLine, cursorDot);
  dom.elevSvg.replaceChildren(...children);

  const updateCursorAtClientX = (clientX) => {
    const rect = dom.elevSvg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(padLeft, Math.min(width - padRight, relX));

    let best = coords[0];
    let bestDelta = Infinity;
    for (const c of coords) {
      const delta = Math.abs(c.x - clampedX);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = c;
      }
    }

    cursorLine.setAttribute('x1', best.x.toFixed(1));
    cursorLine.setAttribute('x2', best.x.toFixed(1));
    cursorLine.setAttribute('visibility', 'visible');

    cursorDot.setAttribute('cx', best.x.toFixed(1));
    cursorDot.setAttribute('cy', best.y.toFixed(1));
    cursorDot.setAttribute('visibility', 'visible');

    const km = (best.sample.distanceMeters / 1000).toFixed(1);
    const elevM = Math.round(best.sample.elevation);
    const elevFt = Math.round(best.sample.elevation * 3.28084);
    const gradeSign = best.sample.gradePct > 0 ? '+' : '';
    dom.elevHoverReadout.textContent = `${km} km · ${elevM} m (${elevFt} ft) · ${gradeSign}${best.sample.gradePct}% grade`;

    ensureHoverMarker(best.sample.location);
  };

  dom.elevSvg.onpointermove = (event) => updateCursorAtClientX(event.clientX);
  dom.elevSvg.onpointerdown = (event) => updateCursorAtClientX(event.clientX);
  dom.elevSvg.onpointerleave = () => {
    cursorLine.setAttribute('visibility', 'hidden');
    cursorDot.setAttribute('visibility', 'hidden');
    dom.elevHoverReadout.textContent = 'Hover chart to scrub route elevation';
    hideHoverMarker();
  };
}

async function loadElevationForActiveRoute(force = false) {
  const routes = state.routesByMode[state.activeMode] || [];
  const activeRoute = routes[state.selectedRouteIndex];
  hideHoverMarker();

  if (!activeRoute?.polyline?.encodedPolyline) {
    dom.elevSvg.replaceChildren();
    resetElevationStats();
    dom.elevEmptyMessage.textContent = 'Select a route to inspect its elevation profile.';
    dom.sampleTerrainBtn.classList.add('hidden');
    dom.elevEmptyOverlay.classList.remove('hidden');
    return;
  }

  const isTrailMode = state.activeMode === 'BICYCLE' || state.activeMode === 'WALK';
  if (!isTrailMode && !force) {
    dom.elevSvg.replaceChildren();
    resetElevationStats();
    dom.elevEmptyMessage.textContent =
      'Elevation profile auto-loads for Cycling & Walking routes. Switch modes or sample this corridor anyway.';
    dom.sampleTerrainBtn.classList.remove('hidden');
    dom.elevEmptyOverlay.classList.remove('hidden');
    return;
  }

  const seq = ++state.elevationRequestSeq;
  dom.elevEmptyOverlay.classList.remove('hidden');
  dom.sampleTerrainBtn.classList.add('hidden');
  dom.elevEmptyMessage.textContent = 'Querying Elevation API (64 path samples)…';

  try {
    const profile = await apiPost('/api/elevation/profile', {
      encodedPolyline: activeRoute.polyline.encodedPolyline,
      samples: 64,
    });
    if (seq !== state.elevationRequestSeq) return;
    state.elevationData = profile;
    renderElevationChart(profile);
  } catch (err) {
    if (seq !== state.elevationRequestSeq) return;
    dom.elevEmptyMessage.textContent =
      err instanceof Error ? err.message : 'Unable to load Elevation API profile.';
    dom.elevEmptyOverlay.classList.remove('hidden');
  }
}

async function selectRouteIndex(idx) {
  state.selectedRouteIndex = idx;
  renderRouteCards();
  renderActiveRoutesOnMap();
  await loadElevationForActiveRoute(false);
}

async function switchMode(mode) {
  if (!MODE_LABELS[mode]) return;
  state.activeMode = mode;
  state.selectedRouteIndex = 0;

  if (mode === 'BICYCLE') {
    dom.bicyclingLayerToggle.checked = true;
  }
  renderBicyclingLayer();
  renderBetaAdvisory();
  renderModeSummaries();
  renderRouteCards();
  renderActiveRoutesOnMap();
  await loadElevationForActiveRoute(false);
}

async function computeModeRoutes(mode) {
  if (!state.origin || !state.destination) return [];
  const data = await apiPost('/api/routes/compute', {
    origin: {
      lat: state.origin.location.lat,
      lng: state.origin.location.lng,
    },
    destination: {
      lat: state.destination.location.lat,
      lng: state.destination.location.lng,
    },
    travelMode: mode,
    avoidTolls: state.modifiers.avoidTolls,
    avoidHighways: state.modifiers.avoidHighways,
    ecoFriendly: state.modifiers.ecoFriendly,
    computeAlternativeRoutes: true,
  });
  return Array.isArray(data.routes) ? data.routes : [];
}

async function recomputeAllModes() {
  if (!state.origin || !state.destination) return;
  const seq = ++state.routeRequestSeq;
  clearError();
  setStatus('Computing multi-modal routes…');

  const modes = ['BICYCLE', 'DRIVE', 'WALK', 'TRANSIT'];
  const settled = await Promise.allSettled(modes.map((m) => computeModeRoutes(m)));
  if (seq !== state.routeRequestSeq) return;

  let anySuccess = false;
  let lastError = null;
  modes.forEach((mode, i) => {
    const res = settled[i];
    if (res.status === 'fulfilled') {
      state.routesByMode[mode] = res.value;
      anySuccess = true;
    } else {
      state.routesByMode[mode] = [];
      lastError = res.reason;
    }
  });

  if (!anySuccess && lastError) {
    showError(lastError instanceof Error ? lastError.message : 'Failed to compute routes.');
    setStatus('Route computation error');
  } else {
    setStatus('Live routes ready');
  }

  state.selectedRouteIndex = 0;
  renderModeSummaries();
  renderBetaAdvisory();
  renderRouteCards();
  renderActiveRoutesOnMap();
  await loadElevationForActiveRoute(false);
}

async function recomputeDrivingOnly() {
  if (!state.origin || !state.destination) return;
  clearError();
  setStatus('Updating driving preferences…');
  try {
    state.routesByMode.DRIVE = await computeModeRoutes('DRIVE');
    if (state.activeMode === 'DRIVE') {
      state.selectedRouteIndex = 0;
      renderRouteCards();
      renderActiveRoutesOnMap();
      await loadElevationForActiveRoute(false);
    }
    renderModeSummaries();
    setStatus('Live routes ready');
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to update driving route preferences.');
    setStatus('Route update error');
  }
}

function wireEventListeners() {
  dom.modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode) void switchMode(mode);
    });
  });

  dom.avoidTollsToggle.addEventListener('change', () => {
    state.modifiers.avoidTolls = dom.avoidTollsToggle.checked;
    void recomputeDrivingOnly();
  });

  dom.avoidHighwaysToggle.addEventListener('change', () => {
    state.modifiers.avoidHighways = dom.avoidHighwaysToggle.checked;
    void recomputeDrivingOnly();
  });

  dom.ecoFriendlyToggle.addEventListener('change', () => {
    state.modifiers.ecoFriendly = dom.ecoFriendlyToggle.checked;
    void recomputeDrivingOnly();
  });

  dom.bicyclingLayerToggle.addEventListener('change', () => {
    renderBicyclingLayer();
  });

  dom.swapBtn.addEventListener('click', () => {
    if (!state.origin || !state.destination) return;
    const prevOrigin = state.origin;
    state.origin = state.destination;
    state.destination = prevOrigin;
    updateEndpointChips();
    updateEndpointMarkers();
    void recomputeAllModes();
  });

  dom.sampleTerrainBtn.addEventListener('click', () => {
    void loadElevationForActiveRoute(true);
  });
}

async function initApp() {
  wireEventListeners();
  renderBetaAdvisory();

  try {
    const configResp = await fetch('/api/config');
    if (!configResp.ok) {
      throw new Error('Failed to load server configuration from /api/config.');
    }
    const config = await configResp.json();
    state.config = config;

    if (!config.mapsApiKey) {
      setStatus('API key required');
      showError(
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your Google Maps Platform API key or Maps Demo Key, then restart the server.'
      );
      dom.originChip.textContent = config.seededOriginQuery;
      dom.destinationChip.textContent = config.seededDestinationQuery;
      return;
    }

    setStatus('Loading Google Maps JavaScript API…');
    loadGoogleMapsBootstrap(config.mapsApiKey);

    const [core, maps, marker, places, geometry] = await Promise.all([
      google.maps.importLibrary('core'),
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('places'),
      google.maps.importLibrary('geometry'),
    ]);

    state.libs = { core, maps, marker, places, geometry };
    state.map = new maps.Map(dom.mapCanvas, {
      center: config.initialCenter,
      zoom: config.initialZoom,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.bicyclingLayer = new maps.BicyclingLayer();
    state.mapsReady = true;
    renderBicyclingLayer();
    mountAutocompletePickers();

    setStatus('Resolving Denver & Boulder endpoints…');
    const [originPlace, destinationPlace] = await Promise.all([
      resolveSeedPlace(config.seededOriginQuery),
      resolveSeedPlace(config.seededDestinationQuery),
    ]);

    state.origin = originPlace;
    state.destination = destinationPlace;
    updateEndpointChips();
    updateEndpointMarkers();

    await recomputeAllModes();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Initialization error';
    showError(msg);
    setStatus('Initialization error');
  }
}

void initApp();
