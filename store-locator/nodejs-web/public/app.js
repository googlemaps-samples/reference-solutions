(() => {
  'use strict';

  const TYPE_META = {
    flagship: {
      label: 'Flagship Store',
      shortCode: 'F',
      badgeClass: 'type-flagship',
    },
    kiosk: {
      label: 'Express Kiosk',
      shortCode: 'K',
      badgeClass: 'type-kiosk',
    },
    atm: {
      label: '24/7 ATM',
      shortCode: '$',
      badgeClass: 'type-atm',
    },
  };

  const SERVICE_LABELS = {
    pickup: 'Click & Collect',
    coffee: 'Express Espresso',
    cash: 'Cash Deposit',
    open24: 'Open 24h',
  };

  const ROUTE_COLORS = {
    DRIVE: '#1d4ed8',
    WALK: '#059669',
    TRANSIT: '#7c3aed',
  };

  const state = {
    config: null,
    map: null,
    infoWindow: null,
    originMarker: null,
    clusterer: null,
    routePolyline: null,
    routeCasingPolyline: null,
    mapsLibs: null,
    origin: null,
    travelMode: 'DRIVE',
    activeTypeFilter: 'all',
    activeServiceFilters: new Set(),
    branches: [],
    filteredBranches: [],
    selectedBranchId: null,
    fastestBranchId: null,
    autocompleteSessionToken: createSessionToken(),
    autocompleteTimer: null,
    markerByBranchId: new Map(),
    routeRequestSeq: 0,
  };

  const dom = {
    statusBanner: document.getElementById('status-banner'),
    originSearchInput: document.getElementById('origin-search-input'),
    presetOriginButton: document.getElementById('preset-origin-button'),
    autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
    travelModeSelect: document.getElementById('travel-mode-select'),
    routeFastestButton: document.getElementById('route-fastest-button'),
    routeSummaryMode: document.getElementById('route-summary-mode'),
    routeSummaryOrigin: document.getElementById('route-summary-origin'),
    routeSummaryDetail: document.getElementById('route-summary-detail'),
    resultsCount: document.getElementById('results-count'),
    refreshBranchesBtn: document.getElementById('refresh-branches-btn'),
    branchList: document.getElementById('branch-list'),
    mapContainer: document.getElementById('map-container'),
    placesWidgetHost: document.getElementById('places-widget-host'),
    zoomHint: document.getElementById('zoom-hint'),
    typeFilterButtons: Array.from(document.querySelectorAll('[data-type-filter]')),
    serviceFilterButtons: Array.from(document.querySelectorAll('[data-service-filter]')),
  };

  function createSessionToken() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function showStatusBanner(message, isError = false) {
    if (!message) {
      dom.statusBanner.hidden = true;
      dom.statusBanner.textContent = '';
      dom.statusBanner.classList.remove('is-error');
      return;
    }
    dom.statusBanner.hidden = false;
    dom.statusBanner.textContent = message;
    dom.statusBanner.classList.toggle('is-error', isError);
  }

  function loadGoogleMapsBootstrap(params) {
    if (window.google?.maps?.importLibrary) {
      return;
    }
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
      const root = b[c] || (b[c] = {});
      const d = root.maps || (root.maps = {});
      const r = new Set();
      const e = new URLSearchParams();
      const u = () =>
        h ||
        (h = new Promise(async (resolve, reject) => {
          await (a = m.createElement('script'));
          e.set('libraries', [...r] + '');
          for (k in g) {
            e.set(
              k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
              g[k]
            );
          }
          e.set('callback', `${c}.maps.${q}`);
          a.src = `https://maps.${c}apis.com/maps/api/js?${e}`;
          d[q] = resolve;
          a.onerror = () => {
            h = reject(new Error(`${p} could not load.`));
          };
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          m.head.append(a);
        }));
      if (d[l]) {
        console.warn(`${p} only loads once. Ignoring:`, g);
      } else {
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
      }
    })(params);
  }

  function parseDurationSeconds(durationStr) {
    if (typeof durationStr !== 'string') return null;
    const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
    return match ? Math.round(Number.parseFloat(match[1])) : null;
  }

  function formatDuration(seconds, localizedText) {
    if (localizedText && typeof localizedText === 'string') {
      return localizedText;
    }
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
      return 'ETA --';
    }
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  }

  function formatDistance(meters, localizedText) {
    if (localizedText && typeof localizedText === 'string') {
      return localizedText;
    }
    if (typeof meters !== 'number' || !Number.isFinite(meters)) {
      return '--';
    }
    const miles = meters / 1609.344;
    if (miles < 0.1) {
      return `${Math.round(meters * 3.28084)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  function getTodayHoursText(weekdayDescriptions) {
    if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) {
      return 'Hours via Google Maps';
    }
    const jsDay = new Date().getDay(); // 0=Sun..6=Sat
    const googleIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
    return weekdayDescriptions[googleIdx] || weekdayDescriptions[0];
  }

  function classifyPlace(place, searchHint) {
    const name = place.displayName?.text || 'MetroGrid NYC Location';
    const types = Array.isArray(place.types) ? place.types : [];
    const primaryType = place.primaryType || '';
    const hours = Array.isArray(place.regularOpeningHours?.weekdayDescriptions)
      ? place.regularOpeningHours.weekdayDescriptions
      : [];
    const has24hHours = hours.some((line) => /open 24 hours/i.test(line));

    let branchType = 'flagship';
    if (
      primaryType === 'atm' ||
      types.includes('atm') ||
      types.includes('bank') ||
      /\batm\b/i.test(name) ||
      searchHint === 'atm'
    ) {
      branchType = 'atm';
    } else if (
      primaryType === 'coffee_shop' ||
      primaryType === 'cafe' ||
      types.includes('coffee_shop') ||
      types.includes('cafe') ||
      types.includes('bakery') ||
      searchHint === 'kiosk'
    ) {
      branchType = 'kiosk';
    } else {
      branchType = 'flagship';
    }

    const services = new Set();
    if (branchType === 'flagship') {
      services.add('pickup');
      if (types.includes('cafe') || types.includes('coffee_shop') || /cafe|coffee/i.test(name)) {
        services.add('coffee');
      }
      if (types.includes('department_store') || /flagship|soho|fifth|herald|midtown/i.test(name)) {
        services.add('cash');
      }
      if (has24hHours) {
        services.add('open24');
      }
    } else if (branchType === 'kiosk') {
      services.add('coffee');
      services.add('pickup');
      if (has24hHours) {
        services.add('open24');
      }
    } else {
      services.add('cash');
      services.add('open24');
    }

    return {
      id: place.id,
      name,
      address: place.formattedAddress || 'Manhattan, New York, NY',
      position: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      branchType,
      services: Array.from(services),
      rating: typeof place.rating === 'number' ? place.rating : null,
      userRatingCount:
        typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      weekdayDescriptions: hours,
      businessStatus: place.businessStatus || 'OPERATIONAL',
      durationSeconds: null,
      distanceMeters: null,
      etaText: 'Calculating...',
      distanceText: '--',
    };
  }

  function createSvgPinIcon(branchType) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '13');
    svg.setAttribute('height', '13');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(svgNS, 'path');
    if (branchType === 'flagship') {
      path.setAttribute('d', 'M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
    } else if (branchType === 'kiosk') {
      path.setAttribute('d', 'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z');
    } else {
      path.setAttribute('d', 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6');
    }
    svg.appendChild(path);
    return svg;
  }

  function buildBranchPinElement(branch) {
    const meta = TYPE_META[branch.branchType] || TYPE_META.flagship;
    const pin = document.createElement('div');
    pin.className = `branch-pin ${meta.badgeClass}`;
    if (branch.id === state.selectedBranchId) {
      pin.classList.add('is-selected');
    }
    if (branch.id === state.fastestBranchId) {
      pin.classList.add('is-fastest');
    }
    pin.appendChild(createSvgPinIcon(branch.branchType));

    const label = document.createElement('span');
    label.textContent = meta.shortCode;
    pin.appendChild(label);
    return pin;
  }

  function buildOriginPinElement(originName) {
    const wrapper = document.createElement('div');
    wrapper.className = 'origin-pin';

    const badge = document.createElement('div');
    badge.className = 'origin-pin-badge';
    badge.textContent = `Origin · ${originName.slice(0, 18)}`;
    wrapper.appendChild(badge);
    return wrapper;
  }

  function buildInfoWindowElement(branch) {
    const meta = TYPE_META[branch.branchType] || TYPE_META.flagship;
    const card = document.createElement('div');
    card.className = 'infowindow-card';

    const title = document.createElement('h3');
    title.className = 'infowindow-title';
    title.textContent = branch.name;
    card.appendChild(title);

    const address = document.createElement('p');
    address.className = 'infowindow-address';
    address.textContent = `${meta.label} · ${branch.address}`;
    card.appendChild(address);

    const travel = document.createElement('p');
    travel.className = 'infowindow-meta';
    travel.textContent = `${state.travelMode}: ${branch.etaText} (${branch.distanceText})`;
    card.appendChild(travel);

    const hours = document.createElement('p');
    hours.className = 'infowindow-hours';
    hours.textContent = getTodayHoursText(branch.weekdayDescriptions);
    card.appendChild(hours);

    return card;
  }

  function updateOriginMarker() {
    if (!state.map || !state.mapsLibs || !state.origin) return;
    const { AdvancedMarkerElement } = state.mapsLibs.marker;

    if (state.originMarker) {
      state.originMarker.map = null;
    }

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: state.origin.lat, lng: state.origin.lng },
      title: `Starting Origin: ${state.origin.name}`,
      zIndex: 2000,
    });
    marker.append(buildOriginPinElement(state.origin.name));
    state.originMarker = marker;
  }

  function updateRouteSummaryBanner() {
    dom.routeSummaryMode.textContent = state.travelMode;
    if (state.origin) {
      dom.routeSummaryOrigin.textContent = `From: ${state.origin.name}`;
    }

    const selected = state.branches.find((b) => b.id === state.selectedBranchId);
    const fastest = state.filteredBranches.find((b) => b.id === state.fastestBranchId);

    if (selected) {
      dom.routeSummaryDetail.textContent = `Active route to ${selected.name} — ${selected.etaText} (${selected.distanceText})`;
    } else if (fastest) {
      dom.routeSummaryDetail.textContent = `Fastest nearby: ${fastest.name} — ${fastest.etaText} (${fastest.distanceText})`;
    } else if (state.filteredBranches.length === 0 && state.branches.length > 0) {
      dom.routeSummaryDetail.textContent = 'No branches match the active filters.';
    } else {
      dom.routeSummaryDetail.textContent = 'Select any branch or click Route to Fastest.';
    }
  }

  function applyFiltersAndSort() {
    const filtered = state.branches.filter((branch) => {
      if (state.activeTypeFilter !== 'all' && branch.branchType !== state.activeTypeFilter) {
        return false;
      }
      for (const reqService of state.activeServiceFilters) {
        if (!branch.services.includes(reqService)) {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      const aDur = typeof a.durationSeconds === 'number' ? a.durationSeconds : Number.POSITIVE_INFINITY;
      const bDur = typeof b.durationSeconds === 'number' ? b.durationSeconds : Number.POSITIVE_INFINITY;
      if (aDur !== bDur) return aDur - bDur;
      return a.name.localeCompare(b.name);
    });

    state.filteredBranches = filtered;
    const fastestWithEta = filtered.find((b) => typeof b.durationSeconds === 'number');
    state.fastestBranchId = fastestWithEta ? fastestWithEta.id : filtered[0]?.id ?? null;

    renderBranchList();
    renderMapClusters();
    updateRouteSummaryBanner();
  }

  function renderBranchList() {
    const fragment = document.createDocumentFragment();
    dom.resultsCount.textContent = `${state.filteredBranches.length} of ${state.branches.length} NYC locations`;

    if (state.filteredBranches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent =
        state.branches.length === 0
          ? 'Waiting for live NYC branch results...'
          : 'No branches match your selected branch type and service filters.';
      fragment.appendChild(empty);
      dom.branchList.replaceChildren(fragment);
      return;
    }

    for (const branch of state.filteredBranches) {
      const meta = TYPE_META[branch.branchType] || TYPE_META.flagship;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'branch-card';
      card.setAttribute('data-testid', 'branch-card');
      card.setAttribute('data-branch-id', branch.id);
      if (branch.id === state.selectedBranchId) {
        card.classList.add('is-selected');
      }

      const top = document.createElement('div');
      top.className = 'branch-card-top';

      const title = document.createElement('h3');
      title.className = 'branch-name';
      title.textContent = branch.name;
      top.appendChild(title);

      const badges = document.createElement('div');
      badges.className = 'branch-badges';

      if (branch.id === state.fastestBranchId) {
        const fastestBadge = document.createElement('span');
        fastestBadge.className = 'fastest-badge';
        fastestBadge.setAttribute('data-testid', 'fastest-branch-badge');
        fastestBadge.textContent = 'Fastest';
        badges.appendChild(fastestBadge);
      }

      const typeBadge = document.createElement('span');
      typeBadge.className = `type-badge ${meta.badgeClass}`;
      typeBadge.textContent = meta.label;
      badges.appendChild(typeBadge);

      top.appendChild(badges);
      card.appendChild(top);

      const address = document.createElement('p');
      address.className = 'branch-address';
      address.textContent = branch.address;
      card.appendChild(address);

      const metaRow = document.createElement('div');
      metaRow.className = 'branch-meta';

      const ratingEl = document.createElement('span');
      ratingEl.className = 'branch-rating';
      if (typeof branch.rating === 'number') {
        const countLabel =
          typeof branch.userRatingCount === 'number'
            ? ` (${branch.userRatingCount.toLocaleString()})`
            : '';
        ratingEl.textContent = `★ ${branch.rating.toFixed(1)}${countLabel}`;
      } else {
        ratingEl.textContent = 'Verified NYC Location';
      }
      metaRow.appendChild(ratingEl);

      const travelWrap = document.createElement('span');
      travelWrap.className = 'branch-travel';

      const etaEl = document.createElement('span');
      etaEl.className = 'branch-eta';
      etaEl.setAttribute('data-testid', 'branch-eta');
      etaEl.textContent = branch.etaText;
      travelWrap.appendChild(etaEl);

      const distEl = document.createElement('span');
      distEl.className = 'branch-distance';
      distEl.setAttribute('data-testid', 'branch-distance');
      distEl.textContent = branch.distanceText;
      travelWrap.appendChild(distEl);

      metaRow.appendChild(travelWrap);
      card.appendChild(metaRow);

      const hoursEl = document.createElement('p');
      hoursEl.className = 'branch-hours';
      hoursEl.textContent = getTodayHoursText(branch.weekdayDescriptions);
      card.appendChild(hoursEl);

      const tagsRow = document.createElement('div');
      tagsRow.className = 'service-tags';
      for (const svc of branch.services) {
        const tag = document.createElement('span');
        tag.className = 'service-tag';
        tag.textContent = SERVICE_LABELS[svc] || svc;
        tagsRow.appendChild(tag);
      }
      card.appendChild(tagsRow);

      card.addEventListener('click', () => {
        void selectBranch(branch.id);
      });

      fragment.appendChild(card);
    }

    dom.branchList.replaceChildren(fragment);
  }

  function renderMapClusters() {
    if (!state.map || !state.mapsLibs) return;
    const { AdvancedMarkerElement } = state.mapsLibs.marker;

    if (state.clusterer) {
      state.clusterer.clearMarkers(true);
    }
    for (const marker of state.markerByBranchId.values()) {
      marker.map = null;
    }
    state.markerByBranchId.clear();

    const newMarkers = state.filteredBranches.map((branch) => {
      const marker = new AdvancedMarkerElement({
        position: branch.position,
        title: `${branch.name} (${TYPE_META[branch.branchType].label})`,
        zIndex: branch.id === state.selectedBranchId ? 1500 : 100,
      });
      marker.append(buildBranchPinElement(branch));
      marker.addEventListener('click', () => {
        void selectBranch(branch.id);
      });
      state.markerByBranchId.set(branch.id, marker);
      return marker;
    });

    if (!window.markerClusterer?.MarkerClusterer) {
      for (const m of newMarkers) {
        m.map = state.map;
      }
      return;
    }

    if (!state.clusterer) {
      const { MarkerClusterer, SuperClusterAlgorithm } = window.markerClusterer;
      state.clusterer = new MarkerClusterer({
        map: state.map,
        markers: newMarkers,
        algorithm: new SuperClusterAlgorithm({
          radius: 68,
          maxZoom: 14,
        }),
        renderer: {
          render: ({ count, position }) => {
            const size = count < 6 ? 36 : count < 15 ? 42 : 48;
            const clusterPin = document.createElement('div');
            clusterPin.className = 'cluster-pin';
            clusterPin.style.width = `${size}px`;
            clusterPin.style.height = `${size}px`;
            clusterPin.style.fontSize = count < 10 ? '13px' : '14px';
            clusterPin.textContent = String(count);

            const clusterMarker = new AdvancedMarkerElement({
              position,
              zIndex: 1000 + count,
              gmpClickable: true,
              title: `${count} NYC branches in cluster — click to zoom in`,
            });
            clusterMarker.append(clusterPin);
            return clusterMarker;
          },
        },
        onClusterClick: (_event, cluster, map) => {
          if (cluster.bounds) {
            map.fitBounds(cluster.bounds, 64);
          } else if (cluster.position) {
            map.panTo(cluster.position);
            map.setZoom(Math.min((map.getZoom() || 12) + 2, 16));
          }
        },
      });
    } else {
      state.clusterer.addMarkers(newMarkers);
    }
  }

  function refreshMarkerHighlights() {
    for (const branch of state.filteredBranches) {
      const marker = state.markerByBranchId.get(branch.id);
      if (!marker) continue;
      marker.zIndex = branch.id === state.selectedBranchId ? 1500 : 100;
      marker.replaceChildren(buildBranchPinElement(branch));
    }
  }

  function clearRoutePolyline() {
    if (state.routePolyline) {
      state.routePolyline.setMap(null);
      state.routePolyline = null;
    }
    if (state.routeCasingPolyline) {
      state.routeCasingPolyline.setMap(null);
      state.routeCasingPolyline = null;
    }
  }

  async function selectBranch(branchId) {
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch) return;

    state.selectedBranchId = branch.id;
    renderBranchList();
    refreshMarkerHighlights();
    updateRouteSummaryBanner();

    if (!state.map || !state.mapsLibs || !state.origin) return;

    const reqId = ++state.routeRequestSeq;
    const { Polyline } = state.mapsLibs.maps;
    const { LatLngBounds } = state.mapsLibs.core;
    const { encoding } = state.mapsLibs.geometry;

    try {
      const response = await fetch('/api/routes/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: state.origin.lat, lng: state.origin.lng },
          destination: branch.position,
          travelMode: state.travelMode,
        }),
      });
      const payload = await response.json();
      if (reqId !== state.routeRequestSeq) return;

      if (!response.ok || !payload.route) {
        clearRoutePolyline();
        showStatusBanner(
          payload.error || `No ${state.travelMode} route returned for ${branch.name}.`,
          true
        );
        state.map.panTo(branch.position);
        state.map.setZoom(Math.max(state.map.getZoom() || 12, 15));
        return;
      }

      showStatusBanner('');
      const route = payload.route;
      const durationSec = parseDurationSeconds(route.duration);
      const etaText = formatDuration(durationSec, route.localizedValues?.duration?.text);
      const distanceText = formatDistance(
        route.distanceMeters,
        route.localizedValues?.distance?.text
      );

      branch.durationSeconds = durationSec ?? branch.durationSeconds;
      branch.distanceMeters =
        typeof route.distanceMeters === 'number' ? route.distanceMeters : branch.distanceMeters;
      branch.etaText = etaText;
      branch.distanceText = distanceText;

      renderBranchList();
      updateRouteSummaryBanner();

      clearRoutePolyline();

      const encoded = route.polyline?.encodedPolyline;
      const bounds = new LatLngBounds();
      bounds.extend({ lat: state.origin.lat, lng: state.origin.lng });
      bounds.extend(branch.position);

      if (encoded) {
        const path = encoding.decodePath(encoded);
        for (const pt of path) {
          bounds.extend(pt);
        }

        state.routeCasingPolyline = new Polyline({
          map: state.map,
          path,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 8,
          zIndex: 40,
        });

        state.routePolyline = new Polyline({
          map: state.map,
          path,
          strokeColor: ROUTE_COLORS[state.travelMode] || '#1d4ed8',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          zIndex: 45,
        });
      }

      state.map.fitBounds(bounds, { top: 70, right: 60, bottom: 70, left: 60 });

      if (state.infoWindow) {
        const marker = state.markerByBranchId.get(branch.id);
        state.infoWindow.setContent(buildInfoWindowElement(branch));
        if (marker && marker.map) {
          state.infoWindow.open({ anchor: marker, map: state.map });
        } else {
          state.infoWindow.setPosition(branch.position);
          state.infoWindow.open({ map: state.map });
        }
      }
    } catch (error) {
      if (reqId !== state.routeRequestSeq) return;
      showStatusBanner(
        error instanceof Error ? error.message : 'Unable to compute route.',
        true
      );
    }
  }

  async function computeTravelMatrix() {
    if (!state.origin || state.branches.length === 0) return;

    const candidateBranches = state.branches.slice(0, 30);
    try {
      const response = await fetch('/api/routes/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: state.origin.lat, lng: state.origin.lng },
          destinations: candidateBranches.map((b) => b.position),
          travelMode: state.travelMode,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        showStatusBanner(payload.error || 'Unable to compute route matrix.', true);
        return;
      }

      const elements = Array.isArray(payload.elements) ? payload.elements : [];
      for (const el of elements) {
        const idx = el.destinationIndex;
        if (typeof idx !== 'number' || !candidateBranches[idx]) continue;
        const branch = candidateBranches[idx];

        if (el.condition && el.condition !== 'ROUTE_EXISTS') {
          branch.durationSeconds = null;
          branch.etaText = 'Unavailable';
          branch.distanceText = '--';
          continue;
        }

        const durationSec = parseDurationSeconds(el.duration);
        branch.durationSeconds = durationSec;
        branch.distanceMeters =
          typeof el.distanceMeters === 'number' ? el.distanceMeters : null;
        branch.etaText = formatDuration(durationSec, el.localizedValues?.duration?.text);
        branch.distanceText = formatDistance(
          el.distanceMeters,
          el.localizedValues?.distance?.text
        );
      }

      applyFiltersAndSort();
    } catch (error) {
      showStatusBanner(
        error instanceof Error ? error.message : 'Failed to load travel time matrix.',
        true
      );
    }
  }

  async function loadNycBranches() {
    showStatusBanner('');
    dom.routeSummaryDetail.textContent = 'Searching live NYC Flagship Stores, Kiosks & ATMs...';

    const queries = [
      {
        hint: 'flagship',
        textQuery: 'flagship retail department store Manhattan New York',
        maxResultCount: 10,
      },
      {
        hint: 'kiosk',
        textQuery: 'espresso coffee kiosk grab and go Manhattan New York',
        maxResultCount: 10,
      },
      {
        hint: 'atm',
        textQuery: '24 hour ATM bank Manhattan New York',
        maxResultCount: 10,
      },
    ];

    try {
      const responses = await Promise.all(
        queries.map(async (q) => {
          const res = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textQuery: q.textQuery,
              maxResultCount: q.maxResultCount,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Places search failed (${res.status})`);
          }
          return { hint: q.hint, places: Array.isArray(data.places) ? data.places : [] };
        })
      );

      const deduped = new Map();
      for (const group of responses) {
        for (const place of group.places) {
          if (!place?.id || !place.location) continue;
          if (!deduped.has(place.id)) {
            deduped.set(place.id, classifyPlace(place, group.hint));
          }
        }
      }

      state.branches = Array.from(deduped.values());
      applyFiltersAndSort();
      await computeTravelMatrix();
    } catch (error) {
      showStatusBanner(
        error instanceof Error ? error.message : 'Failed to load NYC branch locations.',
        true
      );
      dom.routeSummaryDetail.textContent = 'Unable to load NYC branches.';
    }
  }

  async function setCustomerOrigin(nextOrigin) {
    state.origin = nextOrigin;
    dom.originSearchInput.value = nextOrigin.name;
    clearRoutePolyline();
    if (state.infoWindow) {
      state.infoWindow.close();
    }
    state.selectedBranchId = null;

    updateOriginMarker();
    updateRouteSummaryBanner();
    await computeTravelMatrix();

    if (state.map) {
      state.map.panTo({ lat: nextOrigin.lat, lng: nextOrigin.lng });
    }
  }

  function hideAutocompleteDropdown() {
    dom.autocompleteDropdown.hidden = true;
    dom.autocompleteDropdown.replaceChildren();
  }

  function renderAutocompletePredictions(suggestions) {
    const fragment = document.createDocumentFragment();
    const predictions = suggestions
      .map((s) => s.placePrediction)
      .filter((p) => p && p.placeId);

    if (predictions.length === 0) {
      hideAutocompleteDropdown();
      return;
    }

    for (const prediction of predictions) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'autocomplete-item';

      const main = document.createElement('span');
      main.className = 'autocomplete-main';
      main.textContent =
        prediction.structuredFormat?.mainText?.text ||
        prediction.text?.text ||
        'Selected Place';
      btn.appendChild(main);

      const subText = prediction.structuredFormat?.secondaryText?.text;
      if (subText) {
        const sub = document.createElement('span');
        sub.className = 'autocomplete-sub';
        sub.textContent = subText;
        btn.appendChild(sub);
      }

      btn.addEventListener('click', () => {
        void selectAutocompletePrediction(prediction.placeId, main.textContent);
      });

      li.appendChild(btn);
      fragment.appendChild(li);
    }

    dom.autocompleteDropdown.replaceChildren(fragment);
    dom.autocompleteDropdown.hidden = false;
  }

  async function fetchAutocompletePredictions(input) {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      hideAutocompleteDropdown();
      return;
    }

    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          sessionToken: state.autocompleteSessionToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        hideAutocompleteDropdown();
        return;
      }
      renderAutocompletePredictions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      hideAutocompleteDropdown();
    }
  }

  async function selectAutocompletePrediction(placeId, fallbackLabel) {
    hideAutocompleteDropdown();
    const token = state.autocompleteSessionToken;
    state.autocompleteSessionToken = createSessionToken();

    try {
      const params = new URLSearchParams({ placeId, sessionToken: token });
      const res = await fetch(`/api/places/details?${params.toString()}`);
      const details = await res.json();
      if (!res.ok || !details.location) {
        showStatusBanner(details.error || 'Unable to resolve selected location.', true);
        return;
      }

      await setCustomerOrigin({
        name: details.displayName?.text || fallbackLabel || details.formattedAddress || 'Selected Origin',
        address: details.formattedAddress || '',
        lat: details.location.latitude,
        lng: details.location.longitude,
      });
    } catch (error) {
      showStatusBanner(
        error instanceof Error ? error.message : 'Unable to fetch place details.',
        true
      );
    }
  }

  function mountPlaceAutocompleteWidget() {
    if (!state.mapsLibs?.places?.PlaceAutocompleteElement) return;
    const { PlaceAutocompleteElement } = state.mapsLibs.places;
    const placeAutocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: state.config.defaultCenter,
        radius: 25000,
      },
    });

    placeAutocomplete.addEventListener('gmp-select', async (event) => {
      const prediction = event.placePrediction;
      if (!prediction) return;
      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        if (place.location) {
          await setCustomerOrigin({
            name: place.displayName || place.formattedAddress || 'Selected Origin',
            address: place.formattedAddress || '',
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
        }
      } catch (error) {
        showStatusBanner(
          error instanceof Error ? error.message : 'Places widget selection failed.',
          true
        );
      }
    });

    dom.placesWidgetHost.replaceChildren(placeAutocomplete);
  }

  function bindUiEvents() {
    dom.originSearchInput.addEventListener('input', (event) => {
      const value = event.target.value;
      if (state.autocompleteTimer) {
        clearTimeout(state.autocompleteTimer);
      }
      state.autocompleteTimer = setTimeout(() => {
        void fetchAutocompletePredictions(value);
      }, 220);
    });

    dom.originSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideAutocompleteDropdown();
        return;
      }
      if (event.key === 'Enter') {
        const firstOption = dom.autocompleteDropdown.querySelector('.autocomplete-item');
        if (firstOption && !dom.autocompleteDropdown.hidden) {
          event.preventDefault();
          firstOption.click();
        }
      }
    });

    document.addEventListener('click', (event) => {
      if (
        !dom.autocompleteDropdown.contains(event.target) &&
        event.target !== dom.originSearchInput
      ) {
        hideAutocompleteDropdown();
      }
    });

    dom.presetOriginButton.addEventListener('click', () => {
      if (state.config?.defaultOrigin) {
        hideAutocompleteDropdown();
        void setCustomerOrigin({ ...state.config.defaultOrigin });
      }
    });

    dom.travelModeSelect.addEventListener('change', (event) => {
      state.travelMode = event.target.value;
      updateRouteSummaryBanner();
      void computeTravelMatrix().then(() => {
        if (state.selectedBranchId) {
          return selectBranch(state.selectedBranchId);
        }
        return undefined;
      });
    });

    dom.routeFastestButton.addEventListener('click', () => {
      const targetId = state.fastestBranchId || state.filteredBranches[0]?.id;
      if (targetId) {
        void selectBranch(targetId);
      }
    });

    dom.refreshBranchesBtn.addEventListener('click', () => {
      void loadNycBranches();
    });

    for (const btn of dom.typeFilterButtons) {
      btn.addEventListener('click', () => {
        const typeVal = btn.getAttribute('data-type-filter') || 'all';
        state.activeTypeFilter = typeVal;
        for (const other of dom.typeFilterButtons) {
          other.classList.toggle('is-active', other === btn);
        }
        applyFiltersAndSort();
      });
    }

    for (const btn of dom.serviceFilterButtons) {
      btn.addEventListener('click', () => {
        const svc = btn.getAttribute('data-service-filter');
        if (!svc) return;
        if (state.activeServiceFilters.has(svc)) {
          state.activeServiceFilters.delete(svc);
          btn.classList.remove('is-active');
        } else {
          state.activeServiceFilters.add(svc);
          btn.classList.add('is-active');
        }
        applyFiltersAndSort();
      });
    }
  }

  async function init() {
    bindUiEvents();

    let config;
    try {
      const res = await fetch('/api/config');
      if (!res.ok) {
        throw new Error(`Configuration fetch failed (${res.status})`);
      }
      config = await res.json();
    } catch (error) {
      showStatusBanner(
        error instanceof Error ? error.message : 'Unable to load server configuration.',
        true
      );
      return;
    }

    state.config = config;
    state.origin = { ...config.defaultOrigin };
    dom.originSearchInput.value = state.origin.name;
    updateRouteSummaryBanner();

    if (!config.hasApiKey || !config.apiKey) {
      showStatusBanner(
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your Maps Demo Key or Cloud API key, then restart the server.',
        true
      );
      dom.routeSummaryDetail.textContent = 'Waiting for GOOGLE_MAPS_API_KEY in .env.';
      return;
    }

    try {
      loadGoogleMapsBootstrap({
        key: config.apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
      });

      const [coreLib, mapsLib, markerLib, placesLib, geometryLib] = await Promise.all([
        google.maps.importLibrary('core'),
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('geometry'),
      ]);

      state.mapsLibs = {
        core: coreLib,
        maps: mapsLib,
        marker: markerLib,
        places: placesLib,
        geometry: geometryLib,
      };

      const { Map, InfoWindow } = mapsLib;
      state.map = new Map(dom.mapContainer, {
        center: config.defaultCenter,
        zoom: config.defaultZoom,
        mapId: config.mapId,
        internalUsageAttributionIds: config.internalUsageAttributionIds,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      state.infoWindow = new InfoWindow();

      state.map.addListener('zoom_changed', () => {
        const z = state.map.getZoom();
        if (typeof z === 'number') {
          dom.zoomHint.textContent =
            z >= 14
              ? `Zoom ${z} · Individual branch markers expanded`
              : `Zoom ${z} · Click a cluster or zoom in (z14+) for branch pins`;
        }
      });

      mountPlaceAutocompleteWidget();
      updateOriginMarker();
      await loadNycBranches();
    } catch (error) {
      showStatusBanner(
        error instanceof Error ? error.message : 'Failed to initialize Google Maps.',
        true
      );
    }
  }

  void init();
})();
