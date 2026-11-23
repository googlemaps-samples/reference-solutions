import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

const NYC_CENTER = { lat: 40.7549, lng: -73.984 };
const INITIAL_ZOOM = 12;

const ORIGIN_PRESETS = [
  {
    shortLabel: 'Penn Stn',
    name: 'Penn Station, Midtown Manhattan',
    address: 'Pennsylvania Station, New York, NY 10001',
    location: { lat: 40.7506, lng: -73.9935 },
  },
  {
    shortLabel: 'Grand Central',
    name: 'Grand Central Terminal',
    address: '89 E 42nd St, New York, NY 10017',
    location: { lat: 40.7527, lng: -73.9772 },
  },
  {
    shortLabel: 'Union Sq',
    name: 'Union Square, Manhattan',
    address: '14th St & Union Square, New York, NY 10003',
    location: { lat: 40.7359, lng: -73.9911 },
  },
];

const TYPE_META = {
  flagship: {
    label: 'Flagship Store',
    code: 'F',
    badgeClass: 'badge-type--flagship',
    pinClass: 'branch-pin--flagship',
  },
  kiosk: {
    label: 'Express Kiosk',
    code: 'K',
    badgeClass: 'badge-type--kiosk',
    pinClass: 'branch-pin--kiosk',
  },
  atm: {
    label: '24/7 ATM',
    code: 'A',
    badgeClass: 'badge-type--atm',
    pinClass: 'branch-pin--atm',
  },
};

const SERVICE_META = {
  pickup: 'Click & Collect',
  coffee: 'Express Espresso',
  cash: 'Cash Deposit',
  open24: 'Open 24h',
};

const TRAVEL_MODE_MAP = {
  DRIVE: 'DRIVING',
  WALK: 'WALKING',
  TRANSIT: 'TRANSIT',
};

const TRAVEL_MODE_LABELS = {
  DRIVE: 'Drive',
  WALK: 'Walk',
  TRANSIT: 'Transit',
};

const state = {
  branches: [],
  filteredBranches: [],
  selectedBranchId: null,
  fastestBranchId: null,
  activeTypeFilter: 'all',
  activeServiceFilters: new Set(),
  travelMode: 'DRIVE',
  presetIndex: 0,
  origin: { ...ORIGIN_PRESETS[0] },
  routeMetricsById: new Map(),
  activePolylines: [],
  markersById: new Map(),
  autocompleteRequestId: 0,
};

let map = null;
let infoWindow = null;
let originMarker = null;
let markerClusterer = null;
let sessionToken = null;
let gmpLibs = null;

// Safe DOM builder — never uses innerHTML or HTML strings.
function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text !== undefined && options.text !== null) {
    node.textContent = String(options.text);
  }
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      if (v !== undefined && v !== null) {
        node.setAttribute(k, String(v));
      }
    }
  }
  if (options.dataset) {
    for (const [k, v] of Object.entries(options.dataset)) {
      if (v !== undefined && v !== null) {
        node.dataset[k] = String(v);
      }
    }
  }
  for (const child of children) {
    if (child !== null && child !== undefined) {
      node.append(child);
    }
  }
  return node;
}

function getLatLngLiteral(loc) {
  if (!loc) return null;
  const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—';
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

function formatDistance(meters) {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return '—';
  const miles = meters / 1609.344;
  if (miles < 0.2) {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

function showStatus(message, isError = false) {
  const banner = document.getElementById('status-banner');
  if (!banner) return;
  if (!message) {
    banner.textContent = '';
    banner.className = 'status-banner hidden';
    return;
  }
  banner.textContent = message;
  banner.className = isError ? 'status-banner is-error' : 'status-banner';
}

function getTodayHoursText(weekdayDescriptions) {
  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) {
    return 'Hours via Google Places';
  }
  // weekdayDescriptions starts on Monday (0) .. Sunday (6)
  const jsDay = new Date().getDay();
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return weekdayDescriptions[idx] || weekdayDescriptions[0];
}

function classifyBranch(place, sourceCategory, index) {
  const types = Array.isArray(place.types) ? place.types : [];
  const primary = place.primaryType || '';
  const nameLower = (place.displayName || '').toLowerCase();
  const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions || [];
  const has24hHours = weekdayDescriptions.some((line) => /open 24 hours/i.test(line));

  let typeKey = sourceCategory;
  if (
    primary === 'atm' ||
    types.includes('atm') ||
    (sourceCategory === 'atm' && (types.includes('bank') || nameLower.includes('atm')))
  ) {
    typeKey = 'atm';
  } else if (
    primary === 'cafe' ||
    primary === 'coffee_shop' ||
    types.includes('cafe') ||
    types.includes('coffee_shop') ||
    types.includes('bakery')
  ) {
    typeKey = 'kiosk';
  } else if (sourceCategory === 'flagship') {
    typeKey = 'flagship';
  }

  const services = new Set();
  if (typeKey === 'flagship') {
    services.add('pickup');
    if (index % 2 === 0 || types.includes('cafe')) {
      services.add('coffee');
    }
    if (index % 3 === 0) {
      services.add('cash');
    }
  } else if (typeKey === 'kiosk') {
    services.add('coffee');
    if (index % 2 === 0) {
      services.add('pickup');
    }
  } else if (typeKey === 'atm') {
    services.add('cash');
    services.add('open24');
  }

  if (has24hHours) {
    services.add('open24');
  }

  return {
    typeKey,
    services: Array.from(services),
  };
}

async function fetchLiveNycBranches() {
  const { Place } = gmpLibs.places;
  const searchBias = { center: NYC_CENTER, radius: 5500 };
  const fields = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'types',
    'primaryType',
    'rating',
    'userRatingCount',
    'regularOpeningHours',
    'businessStatus',
  ];

  const queries = [
    {
      category: 'flagship',
      textQuery: 'flagship retail department store Manhattan New York',
      maxResultCount: 8,
    },
    {
      category: 'kiosk',
      textQuery: 'espresso coffee kiosk cafe Midtown Manhattan New York',
      maxResultCount: 8,
    },
    {
      category: 'atm',
      textQuery: '24 hour ATM bank branch Manhattan New York',
      maxResultCount: 8,
    },
  ];

  const responses = await Promise.all(
    queries.map(async ({ category, textQuery, maxResultCount }) => {
      try {
        const { places } = await Place.searchByText({
          textQuery,
          fields,
          locationBias: searchBias,
          maxResultCount,
          language: 'en-US',
          region: 'us',
        });
        return { category, places: places || [] };
      } catch (err) {
        return { category, places: [], error: err };
      }
    })
  );

  const deduped = new Map();
  let runningIdx = 0;

  for (const { category, places } of responses) {
    for (const place of places) {
      if (!place.id || deduped.has(place.id)) continue;
      const location = getLatLngLiteral(place.location);
      if (!location) continue;
      if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;

      const { typeKey, services } = classifyBranch(place, category, runningIdx);
      runningIdx += 1;

      deduped.set(place.id, {
        id: place.id,
        name: place.displayName || 'NYC Branch',
        address: place.formattedAddress || 'Manhattan, New York, NY',
        location,
        typeKey,
        services,
        rating: typeof place.rating === 'number' ? place.rating : null,
        userRatingCount:
          typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions || [],
        businessStatus: place.businessStatus || 'OPERATIONAL',
      });
    }
  }

  return Array.from(deduped.values());
}

async function computeMatrixForBranches() {
  const matrixLabel = document.getElementById('matrix-status-label');
  if (state.branches.length === 0) {
    if (matrixLabel) matrixLabel.textContent = '0 locations';
    return;
  }

  if (matrixLabel) {
    matrixLabel.textContent = `Computing ${TRAVEL_MODE_LABELS[state.travelMode]} ETAs...`;
  }

  const { RouteMatrix } = gmpLibs.routes;
  const { UnitSystem } = gmpLibs.core;
  const geometrySpherical = gmpLibs.geometry?.spherical;
  const jsTravelMode = TRAVEL_MODE_MAP[state.travelMode] || 'DRIVING';

  const newMetrics = new Map();
  const batchSize = 24;

  for (let start = 0; start < state.branches.length; start += batchSize) {
    const chunk = state.branches.slice(start, start + batchSize);
    const request = {
      origins: [state.origin.location],
      destinations: chunk.map((b) => b.location),
      travelMode: jsTravelMode,
      units: UnitSystem.IMPERIAL,
      fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues'],
    };

    if (jsTravelMode === 'DRIVING') {
      request.routingPreference = 'TRAFFIC_AWARE';
    }

    try {
      const { matrix } = await RouteMatrix.computeRouteMatrix(request);
      const items = matrix?.rows?.[0]?.items || [];

      chunk.forEach((branch, idx) => {
        const item = items[idx];
        if (
          item &&
          item.condition === 'ROUTE_EXISTS' &&
          typeof item.durationMillis === 'number' &&
          Number.isFinite(item.durationMillis)
        ) {
          newMetrics.set(branch.id, {
            durationMillis: item.durationMillis,
            distanceMeters: item.distanceMeters,
            etaText: item.localizedValues?.duration || formatDuration(item.durationMillis),
            distanceText:
              item.localizedValues?.distance || formatDistance(item.distanceMeters),
            estimated: false,
          });
        } else {
          const fallbackMeters = geometrySpherical
            ? Math.round(
                geometrySpherical.computeDistanceBetween(
                  state.origin.location,
                  branch.location
                )
              )
            : 1600;
          const speedMps = jsTravelMode === 'WALKING' ? 1.35 : 6.2;
          const estMs = Math.round((fallbackMeters / speedMps) * 1000);
          newMetrics.set(branch.id, {
            durationMillis: estMs,
            distanceMeters: fallbackMeters,
            etaText: formatDuration(estMs),
            distanceText: formatDistance(fallbackMeters),
            estimated: true,
          });
        }
      });
    } catch {
      chunk.forEach((branch) => {
        const fallbackMeters = geometrySpherical
          ? Math.round(
              geometrySpherical.computeDistanceBetween(
                state.origin.location,
                branch.location
              )
            )
          : 1600;
        const speedMps = jsTravelMode === 'WALKING' ? 1.35 : 6.2;
        const estMs = Math.round((fallbackMeters / speedMps) * 1000);
        newMetrics.set(branch.id, {
          durationMillis: estMs,
          distanceMeters: fallbackMeters,
          etaText: formatDuration(estMs),
          distanceText: formatDistance(fallbackMeters),
          estimated: true,
        });
      });
    }
  }

  state.routeMetricsById = newMetrics;
  if (matrixLabel) {
    matrixLabel.textContent = `${TRAVEL_MODE_LABELS[state.travelMode]} ETAs updated`;
  }
}

function applyFiltersAndSort() {
  const filtered = state.branches.filter((branch) => {
    if (
      state.activeTypeFilter !== 'all' &&
      branch.typeKey !== state.activeTypeFilter
    ) {
      return false;
    }
    for (const serviceKey of state.activeServiceFilters) {
      if (!branch.services.includes(serviceKey)) {
        return false;
      }
    }
    return true;
  });

  filtered.sort((a, b) => {
    const ma = state.routeMetricsById.get(a.id);
    const mb = state.routeMetricsById.get(b.id);
    const da = ma ? ma.durationMillis : Number.POSITIVE_INFINITY;
    const db = mb ? mb.durationMillis : Number.POSITIVE_INFINITY;
    return da - db;
  });

  state.filteredBranches = filtered;
  state.fastestBranchId = filtered.length > 0 ? filtered[0].id : null;

  if (
    state.selectedBranchId &&
    !filtered.some((b) => b.id === state.selectedBranchId)
  ) {
    state.selectedBranchId = state.fastestBranchId;
  }
}

function renderBranchList() {
  const listEl = document.getElementById('branch-list');
  const countEl = document.getElementById('branch-count-label');
  if (!listEl) return;

  if (countEl) {
    countEl.textContent = `${state.filteredBranches.length} of ${state.branches.length} branches`;
  }

  if (state.filteredBranches.length === 0) {
    listEl.replaceChildren(
      el('div', {
        className: 'empty-state',
        text: 'No branches match your active type and service filters. Clear a filter chip to view nearby NYC locations.',
      })
    );
    return;
  }

  const cards = state.filteredBranches.map((branch) => {
    const typeInfo = TYPE_META[branch.typeKey];
    const metrics = state.routeMetricsById.get(branch.id);
    const isFastest = branch.id === state.fastestBranchId;
    const isSelected = branch.id === state.selectedBranchId;

    const badges = [
      el('span', {
        className: `badge-type ${typeInfo.badgeClass}`,
        text: typeInfo.label,
      }),
    ];

    if (isFastest) {
      badges.push(
        el('span', {
          className: 'badge-fastest',
          text: 'Fastest Nearby',
          attrs: { 'data-testid': 'fastest-branch-badge' },
        })
      );
    }

    const metricsBlock = el('div', { className: 'branch-metrics' }, [
      el('span', {
        className: 'branch-eta',
        text: metrics ? metrics.etaText : '...',
        attrs: { 'data-testid': 'branch-eta' },
      }),
      el('span', {
        className: 'branch-distance',
        text: metrics ? `(${metrics.distanceText})` : '',
        attrs: { 'data-testid': 'branch-distance' },
      }),
    ]);

    const metaItems = [];
    if (branch.rating !== null) {
      const ratingText =
        branch.userRatingCount !== null
          ? `★ ${branch.rating.toFixed(1)} (${branch.userRatingCount})`
          : `★ ${branch.rating.toFixed(1)}`;
      metaItems.push(el('span', { text: ratingText }));
    }
    metaItems.push(el('span', { text: getTodayHoursText(branch.weekdayDescriptions) }));

    const serviceTags = branch.services.map((svcKey) =>
      el('span', {
        className: 'service-tag',
        text: SERVICE_META[svcKey] || svcKey,
      })
    );

    const card = el(
      'article',
      {
        className: `branch-card${isSelected ? ' is-selected' : ''}`,
        attrs: {
          tabindex: '0',
          role: 'button',
          'data-testid': 'branch-card',
          'data-branch-id': branch.id,
          'data-branch-type': branch.typeKey,
        },
      },
      [
        el('div', { className: 'branch-card-top' }, [
          el('div', { className: 'branch-badges' }, badges),
          metricsBlock,
        ]),
        el('h2', { className: 'branch-name', text: branch.name }),
        el('p', { className: 'branch-address', text: branch.address }),
        el('div', { className: 'branch-meta-row' }, metaItems),
        el('div', { className: 'branch-services' }, serviceTags),
      ]
    );

    card.addEventListener('click', () => {
      void selectAndRouteToBranch(branch.id, { panToBranch: true });
    });
    card.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        void selectAndRouteToBranch(branch.id, { panToBranch: true });
      }
    });

    return card;
  });

  listEl.replaceChildren(...cards);
}

function buildBranchPinElement(branch) {
  const typeInfo = TYPE_META[branch.typeKey];
  const isSelected = branch.id === state.selectedBranchId;
  const isFastest = branch.id === state.fastestBranchId;

  const pinEl = el(
    'div',
    {
      className: `branch-pin ${typeInfo.pinClass}${isFastest ? ' is-fastest' : ''}${
        isSelected ? ' is-selected' : ''
      }`,
      attrs: {
        'data-branch-id': branch.id,
        'data-branch-type': branch.typeKey,
      },
    },
    [
      el('span', { className: 'branch-pin-code', text: typeInfo.code }),
      el('span', { text: isFastest ? 'Fastest' : typeInfo.label.split(' ')[0] }),
    ]
  );

  return pinEl;
}

function renderMapMarkers() {
  const { AdvancedMarkerElement } = gmpLibs.marker;

  if (markerClusterer) {
    markerClusterer.clearMarkers();
  }
  state.markersById.clear();

  const markers = state.filteredBranches.map((branch) => {
    const isSelected = branch.id === state.selectedBranchId;
    const isFastest = branch.id === state.fastestBranchId;
    const marker = new AdvancedMarkerElement({
      position: branch.location,
      title: `${branch.name} (${TYPE_META[branch.typeKey].label})`,
      zIndex: isSelected ? 500 : isFastest ? 300 : 100,
    });
    marker.append(buildBranchPinElement(branch));

    // Use plain 'click' event (supported across weekly and beta channels).
    marker.addListener('click', () => {
      void selectAndRouteToBranch(branch.id, { panToBranch: false });
    });

    state.markersById.set(branch.id, marker);
    return marker;
  });

  if (!markerClusterer) {
    markerClusterer = new MarkerClusterer({
      map,
      markers,
      algorithm: new SuperClusterAlgorithm({ radius: 68, maxZoom: 15 }),
      renderer: {
        render: ({ count, position }) => {
          const clusterEl = el('div', { className: 'cluster-pin' }, [
            el('span', { text: String(count) }),
          ]);
          const clusterMarker = new AdvancedMarkerElement({
            position,
            zIndex: 1000 + count,
          });
          clusterMarker.append(clusterEl);
          return clusterMarker;
        },
      },
    });
  } else {
    markerClusterer.addMarkers(markers);
  }
}

function renderOriginMarker() {
  const { AdvancedMarkerElement } = gmpLibs.marker;
  if (originMarker) {
    originMarker.position = state.origin.location;
    originMarker.title = `Origin: ${state.origin.name}`;
    return;
  }

  const originEl = el('div', { className: 'origin-pin' }, [
    el('span', { text: '★' }),
    el('span', { text: 'Origin' }),
  ]);

  originMarker = new AdvancedMarkerElement({
    map,
    position: state.origin.location,
    title: `Origin: ${state.origin.name}`,
    zIndex: 2000,
  });
  originMarker.append(originEl);
}

function updateMarkerStyles() {
  for (const branch of state.filteredBranches) {
    const marker = state.markersById.get(branch.id);
    if (!marker) continue;
    const isSelected = branch.id === state.selectedBranchId;
    const isFastest = branch.id === state.fastestBranchId;
    marker.zIndex = isSelected ? 500 : isFastest ? 300 : 100;
    marker.replaceChildren(buildBranchPinElement(branch));
  }
}

function clearPolylines() {
  for (const poly of state.activePolylines) {
    poly.setMap(null);
  }
  state.activePolylines = [];
}

function updateSummaryBanner(branch, routeSummary = null) {
  const titleEl = document.getElementById('route-summary-title');
  const metaEl = document.getElementById('route-summary-meta');
  if (!titleEl || !metaEl) return;

  if (!branch) {
    titleEl.textContent = `Origin: ${state.origin.name}`;
    metaEl.textContent = 'Select any branch to compute a live route.';
    return;
  }

  const metrics = routeSummary || state.routeMetricsById.get(branch.id);
  const modeLabel = TRAVEL_MODE_LABELS[state.travelMode];
  const typeLabel = TYPE_META[branch.typeKey].label;

  titleEl.textContent = `${branch.name} (${typeLabel})`;
  const parts = [`From ${state.origin.name}`, `${modeLabel}`];
  if (metrics) {
    parts.push(`${metrics.etaText} · ${metrics.distanceText}`);
  }
  metaEl.textContent = parts.join(' • ');
}

function openBranchInfoWindow(branch, routeSummary = null) {
  if (!infoWindow) return;
  const metrics = routeSummary || state.routeMetricsById.get(branch.id);
  const typeLabel = TYPE_META[branch.typeKey].label;

  const content = el('div', { className: 'iw-card' }, [
    el('h3', { className: 'iw-title', text: branch.name }),
    el('div', { className: 'iw-meta', text: `${typeLabel} • ${branch.address}` }),
    el('div', {
      className: 'iw-meta',
      text: getTodayHoursText(branch.weekdayDescriptions),
    }),
    metrics
      ? el('div', {
          className: 'iw-route',
          text: `${TRAVEL_MODE_LABELS[state.travelMode]}: ${metrics.etaText} (${metrics.distanceText})`,
        })
      : null,
  ]);

  infoWindow.setContent(content);
  const marker = state.markersById.get(branch.id);
  if (marker && marker.map) {
    infoWindow.open({ map, anchor: marker });
  } else {
    infoWindow.setPosition(branch.location);
    infoWindow.open({ map });
  }
}

async function selectAndRouteToBranch(branchId, { panToBranch = false } = {}) {
  const branch = state.filteredBranches.find((b) => b.id === branchId);
  if (!branch) return;

  state.selectedBranchId = branch.id;
  renderBranchList();
  updateMarkerStyles();
  updateSummaryBanner(branch);

  const { Route } = gmpLibs.routes;
  const { Polyline } = gmpLibs.maps;
  const { LatLngBounds, UnitSystem } = gmpLibs.core;
  const jsTravelMode = TRAVEL_MODE_MAP[state.travelMode] || 'DRIVING';

  clearPolylines();

  const request = {
    origin: state.origin.location,
    destination: branch.location,
    travelMode: jsTravelMode,
    units: UnitSystem.IMPERIAL,
    fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'localizedValues'],
  };

  if (jsTravelMode === 'DRIVING') {
    request.routingPreference = 'TRAFFIC_AWARE';
  }

  let routeSummary = null;

  try {
    const { routes } = await Route.computeRoutes(request);
    const route = routes?.[0];

    if (route) {
      const polylineOptions =
        jsTravelMode === 'TRANSIT'
          ? undefined
          : {
              polylineOptions: {
                strokeColor: jsTravelMode === 'WALKING' ? '#0f766e' : '#2563eb',
                strokeOpacity: 0.92,
                strokeWeight: 6,
              },
            };

      const polylines = route.createPolylines(polylineOptions);
      for (const poly of polylines) {
        poly.setMap(map);
      }
      state.activePolylines = polylines;

      routeSummary = {
        durationMillis: route.durationMillis,
        distanceMeters: route.distanceMeters,
        etaText:
          route.localizedValues?.duration || formatDuration(route.durationMillis),
        distanceText:
          route.localizedValues?.distance || formatDistance(route.distanceMeters),
      };
      state.routeMetricsById.set(branch.id, routeSummary);

      if (panToBranch) {
        const bounds = new LatLngBounds();
        bounds.extend(state.origin.location);
        bounds.extend(branch.location);
        if (Array.isArray(route.path)) {
          for (const pt of route.path) {
            bounds.extend(pt);
          }
        }
        map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
      }
    }
  } catch {
    // Draw clean direct connector fallback if a specific transit pair cannot be routed.
    const fallbackLine = new Polyline({
      path: [state.origin.location, branch.location],
      strokeColor: '#64748b',
      strokeOpacity: 0.75,
      strokeWeight: 4,
      map,
    });
    state.activePolylines = [fallbackLine];
  }

  renderBranchList();
  updateSummaryBanner(branch, routeSummary);
  openBranchInfoWindow(branch, routeSummary);
}

async function setNewOrigin(newOrigin) {
  state.origin = newOrigin;
  renderOriginMarker();
  await computeMatrixForBranches();
  applyFiltersAndSort();
  renderBranchList();
  renderMapMarkers();

  const targetId = state.fastestBranchId || state.selectedBranchId;
  if (targetId) {
    await selectAndRouteToBranch(targetId, { panToBranch: true });
  } else {
    clearPolylines();
    updateSummaryBanner(null);
    map.panTo(state.origin.location);
  }
}

function hideAutocompleteDropdown() {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (!dropdown) return;
  dropdown.classList.add('hidden');
  dropdown.replaceChildren();
}

function setupAutocomplete() {
  const inputEl = document.getElementById('origin-search-input');
  const dropdownEl = document.getElementById('autocomplete-dropdown');
  if (!inputEl || !dropdownEl) return;

  let debounceTimer = null;

  const ensureToken = () => {
    if (!sessionToken) {
      const { AutocompleteSessionToken } = gmpLibs.places;
      sessionToken = new AutocompleteSessionToken();
    }
    return sessionToken;
  };

  const resetToken = () => {
    const { AutocompleteSessionToken } = gmpLibs.places;
    sessionToken = new AutocompleteSessionToken();
  };

  const selectSuggestion = async (placePrediction) => {
    hideAutocompleteDropdown();
    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    });
    resetToken();

    const loc = getLatLngLiteral(place.location);
    if (!loc) return;

    const label = place.displayName || place.formattedAddress || 'Selected Origin';
    inputEl.value = label;
    await setNewOrigin({
      name: label,
      address: place.formattedAddress || label,
      location: loc,
    });
  };

  const runGeocodeFallback = async (queryText) => {
    if (!queryText.trim()) return;
    hideAutocompleteDropdown();
    try {
      const { Geocoder } = gmpLibs.geocoding;
      const geocoder = new Geocoder();
      const { results } = await geocoder.geocode({
        address: `${queryText}, New York, NY`,
        componentRestrictions: { country: 'US' },
      });
      const first = results?.[0];
      const loc = getLatLngLiteral(first?.geometry?.location);
      if (loc) {
        inputEl.value = first.formatted_address || queryText;
        await setNewOrigin({
          name: first.formatted_address || queryText,
          address: first.formatted_address || queryText,
          location: loc,
        });
      }
    } catch {
      showStatus(`Could not find NYC location for "${queryText}".`, true);
    }
  };

  const fetchSuggestions = async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      hideAutocompleteDropdown();
      return;
    }

    const reqId = ++state.autocompleteRequestId;
    try {
      const { AutocompleteSuggestion } = gmpLibs.places;
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: ensureToken(),
        includedRegionCodes: ['us'],
        locationBias: { center: NYC_CENTER, radius: 22000 },
        origin: state.origin.location,
      });

      if (reqId !== state.autocompleteRequestId) return;

      const items = (suggestions || [])
        .map((s) => s.placePrediction)
        .filter(Boolean)
        .slice(0, 6);

      if (items.length === 0) {
        hideAutocompleteDropdown();
        return;
      }

      const nodes = items.map((prediction) => {
        const mainText =
          prediction.mainText?.toString() || prediction.text?.toString() || '';
        const secondaryText = prediction.secondaryText?.toString() || '';

        const btn = el(
          'button',
          {
            className: 'autocomplete-item-btn',
            attrs: { type: 'button' },
          },
          [
            el('span', { className: 'autocomplete-main', text: mainText }),
            secondaryText
              ? el('span', { className: 'autocomplete-sub', text: secondaryText })
              : null,
          ]
        );

        btn.addEventListener('click', () => {
          void selectSuggestion(prediction);
        });

        return el('li', { attrs: { role: 'option' } }, [btn]);
      });

      dropdownEl.replaceChildren(...nodes);
      dropdownEl.classList.remove('hidden');
    } catch {
      hideAutocompleteDropdown();
    }
  };

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void fetchSuggestions(inputEl.value);
    }, 220);
  });

  inputEl.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter') {
      evt.preventDefault();
      const firstBtn = dropdownEl.querySelector('.autocomplete-item-btn');
      if (firstBtn && !dropdownEl.classList.contains('hidden')) {
        firstBtn.click();
      } else {
        void runGeocodeFallback(inputEl.value);
      }
    } else if (evt.key === 'Escape') {
      hideAutocompleteDropdown();
    }
  });

  document.addEventListener('click', (evt) => {
    if (!inputEl.contains(evt.target) && !dropdownEl.contains(evt.target)) {
      hideAutocompleteDropdown();
    }
  });
}

function setupControls() {
  const typeButtons = document.querySelectorAll('.filter-chip[data-type]');
  for (const btn of typeButtons) {
    btn.addEventListener('click', () => {
      state.activeTypeFilter = btn.dataset.type || 'all';
      for (const b of typeButtons) {
        b.classList.toggle('is-active', b === btn);
      }
      applyFiltersAndSort();
      renderBranchList();
      renderMapMarkers();
      if (state.selectedBranchId) {
        void selectAndRouteToBranch(state.selectedBranchId, { panToBranch: false });
      } else {
        clearPolylines();
        updateSummaryBanner(null);
      }
    });
  }

  const serviceButtons = document.querySelectorAll('.filter-chip[data-service]');
  for (const btn of serviceButtons) {
    btn.addEventListener('click', () => {
      const svc = btn.dataset.service;
      if (!svc) return;
      if (state.activeServiceFilters.has(svc)) {
        state.activeServiceFilters.delete(svc);
        btn.classList.remove('is-active');
      } else {
        state.activeServiceFilters.add(svc);
        btn.classList.add('is-active');
      }
      applyFiltersAndSort();
      renderBranchList();
      renderMapMarkers();
      if (state.selectedBranchId) {
        void selectAndRouteToBranch(state.selectedBranchId, { panToBranch: false });
      } else {
        clearPolylines();
        updateSummaryBanner(null);
      }
    });
  }

  const travelModeSelect = document.getElementById('travel-mode-select');
  if (travelModeSelect) {
    travelModeSelect.addEventListener('change', async () => {
      state.travelMode = travelModeSelect.value;
      await computeMatrixForBranches();
      applyFiltersAndSort();
      renderBranchList();
      renderMapMarkers();
      const targetId = state.selectedBranchId || state.fastestBranchId;
      if (targetId) {
        await selectAndRouteToBranch(targetId, { panToBranch: false });
      }
    });
  }

  const routeFastestBtn = document.getElementById('route-fastest-button');
  if (routeFastestBtn) {
    routeFastestBtn.addEventListener('click', () => {
      if (state.fastestBranchId) {
        void selectAndRouteToBranch(state.fastestBranchId, { panToBranch: true });
      }
    });
  }

  const presetBtn = document.getElementById('preset-origin-button');
  const searchInput = document.getElementById('origin-search-input');
  if (presetBtn) {
    presetBtn.addEventListener('click', () => {
      state.presetIndex = (state.presetIndex + 1) % ORIGIN_PRESETS.length;
      const preset = ORIGIN_PRESETS[state.presetIndex];
      presetBtn.textContent = preset.shortLabel;
      if (searchInput) {
        searchInput.value = preset.name;
      }
      hideAutocompleteDropdown();
      void setNewOrigin({ ...preset });
    });
  }
}

async function init() {
  const apiKey = window.__GMP_CONFIG__?.apiKey?.trim() || '';
  const mapEl = document.getElementById('map');

  setupControls();

  if (!apiKey) {
    showStatus(
      'Missing GOOGLE_MAPS_API_KEY. Create a .env file from .env.example with a Maps Demo Key or Google Cloud API key, then restart the server.',
      true
    );
    document.getElementById('route-summary-title').textContent =
      'API key required to load live NYC places & routes';
    document.getElementById('matrix-status-label').textContent = 'Awaiting API key';
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en-US',
      region: 'US',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    const [maps, marker, places, routes, geocoding, core, geometry] =
      await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('geocoding'),
        importLibrary('core'),
        importLibrary('geometry'),
      ]);

    gmpLibs = { maps, marker, places, routes, geocoding, core, geometry };

    map = new maps.Map(mapEl, {
      center: NYC_CENTER,
      zoom: INITIAL_ZOOM,
      mapId: 'DEMO_MAP_ID',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    infoWindow = new maps.InfoWindow();
    renderOriginMarker();
    setupAutocomplete();

    showStatus('Fetching live NYC flagship stores, kiosks, and 24/7 ATMs...');
    state.branches = await fetchLiveNycBranches();

    if (state.branches.length === 0) {
      showStatus(
        'No live NYC places were returned. Check that Places API (New) and Routes API are enabled on your key.',
        true
      );
      return;
    }

    showStatus('');
    await computeMatrixForBranches();
    applyFiltersAndSort();
    renderBranchList();
    renderMapMarkers();

    if (state.fastestBranchId) {
      await selectAndRouteToBranch(state.fastestBranchId, { panToBranch: false });
    }
  } catch (err) {
    showStatus(
      `Failed to initialize Google Maps Platform services: ${err?.message || 'Unknown error'}`,
      true
    );
  }
}

void init();
