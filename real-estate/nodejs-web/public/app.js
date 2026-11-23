(function () {
  'use strict';

  const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

  const AMENITY_TYPE_GROUPS = {
    all: [
      'school',
      'supermarket',
      'grocery_store',
      'transit_station',
      'subway_station',
      'bus_station',
    ],
    schools: ['school', 'primary_school', 'secondary_school'],
    groceries: ['supermarket', 'grocery_store'],
    transit: ['transit_station', 'subway_station', 'bus_station', 'light_rail_station', 'train_station'],
  };

  const state = {
    config: null,
    allListings: [],
    filteredListings: [],
    selectedListingId: null,
    hoveredListingId: null,
    activeAmenityCategory: 'all',
    nearbyCache: new Map(),
    filters: {
      maxPrice: 'any',
      minBeds: 0,
      propertyType: 'all',
    },
    activeSearchPolygon: null,
    isDrawing: false,
    mapTypeId: 'roadmap',
    lastWorkplaceQuery: 'Salesforce Tower, San Francisco, CA',
    resolvedWorkplace: null,
  };

  // Google Maps SDK references (populated after importLibrary)
  let map = null;
  let mapsLib = null;
  let markerLib = null;
  let placesLib = null;
  let streetViewLib = null;
  let coreLib = null;
  let geometryLib = null;

  let clusterer = null;
  let terraDraw = null;
  let selectedParcelPolygon = null;
  let commutePolyline = null;
  let workplaceMarker = null;
  let streetViewPanorama = null;
  let streetViewService = null;

  const listingMarkers = new Map();
  const amenityMarkers = [];

  // DOM References
  const el = {
    searchHost: document.getElementById('location-search-input'),
    fallbackSearchInput: document.getElementById('fallback-location-input'),
    maxPriceSelect: document.getElementById('filter-max-price'),
    minBedsSelect: document.getElementById('filter-min-beds'),
    propertyTypeSelect: document.getElementById('filter-property-type'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    resultsCount: document.getElementById('results-count'),
    activeFilterChip: document.getElementById('active-filter-chip'),
    propertyList: document.getElementById('property-list'),
    detailHeader: document.getElementById('detail-header'),
    streetViewContainer: document.getElementById('street-view-container'),
    amenityTabs: Array.from(document.querySelectorAll('.amenity-tabs .tab-btn')),
    nearbyAmenitiesList: document.getElementById('nearby-amenities-list'),
    workplaceInput: document.getElementById('workplace-input'),
    commuteForm: document.getElementById('commute-form'),
    calculateCommuteBtn: document.getElementById('calculate-commute-btn'),
    commuteDestinationLabel: document.getElementById('commute-destination-label'),
    commuteDriveEta: document.getElementById('commute-drive-eta'),
    commuteTransitEta: document.getElementById('commute-transit-eta'),
    presetChips: Array.from(document.querySelectorAll('.preset-chip')),
    mapContainer: document.getElementById('map-container'),
    drawAreaBtn: document.getElementById('draw-area-btn'),
    clearAreaBtn: document.getElementById('clear-area-btn'),
    mapTypeToggleBtn: document.getElementById('map-type-toggle'),
    drawStatusBanner: document.getElementById('draw-status-banner'),
  };

  function clearElement(node) {
    if (node) {
      node.replaceChildren();
    }
  }

  function createEl(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined && textContent !== null) {
      node.textContent = String(textContent);
    }
    return node;
  }

  function formatCurrency(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  }

  function formatShortPrice(price) {
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return `$${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(2).replace(/0$/, '')}M`;
    }
    return `$${Math.round(price / 1000)}K`;
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return '';
    const miles = meters / 1609.344;
    if (miles < 0.2) {
      return `${Math.round(meters)} m`;
    }
    return `${miles.toFixed(1)} mi`;
  }

  function parseDurationLabel(durationStr, localizedDuration) {
    if (localizedDuration) return localizedDuration;
    if (!durationStr || typeof durationStr !== 'string') return 'Unavailable';
    const seconds = Number.parseInt(durationStr.replace('s', ''), 10);
    if (!Number.isFinite(seconds)) return durationStr;
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
    }
    return `${minutes} min`;
  }

  function installMapsBootstrap(apiKey) {
    if (window.google?.maps?.importLibrary) {
      return;
    }
    const g = window.google || (window.google = {});
    const m = g.maps || (g.maps = {});
    const libs = new Set();
    let bootstrapPromise = null;

    const triggerBootstrap = () => {
      if (bootstrapPromise) return bootstrapPromise;
      bootstrapPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const params = new URLSearchParams();
        params.set('key', apiKey);
        params.set('v', 'weekly');
        params.set('language', 'en');
        params.set('region', 'US');
        params.set('libraries', [...libs].join(','));
        params.set('callback', 'google.maps.__ib__');
        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
        script.async = true;
        m.__ib__ = resolve;
        script.onerror = () => reject(new Error('The Google Maps JavaScript API could not load.'));
        document.head.appendChild(script);
      });
      return bootstrapPromise;
    };

    m.importLibrary = (libraryName, ...args) => {
      libs.add(libraryName);
      return triggerBootstrap().then(() => m.importLibrary(libraryName, ...args));
    };
  }

  function renderMissingKeyState(container, title, message) {
    clearElement(container);
    const wrap = createEl('div', 'missing-key-overlay');
    const card = createEl('div', 'missing-key-card');
    card.appendChild(createEl('h2', '', title));
    card.appendChild(createEl('p', '', message));
    const link = createEl('a', '', 'Get a free Google Maps Demo Key');
    link.href = 'https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    card.appendChild(link);
    wrap.appendChild(card);
    container.appendChild(wrap);
  }

  function getSelectedListing() {
    return state.allListings.find((item) => item.id === state.selectedListingId) || null;
  }

  function applyFilters() {
    const maxPrice =
      state.filters.maxPrice === 'any' ? Infinity : Number(state.filters.maxPrice);
    const minBeds = Number(state.filters.minBeds) || 0;
    const propertyType = state.filters.propertyType;

    state.filteredListings = state.allListings.filter((listing) => {
      if (listing.price > maxPrice) return false;
      if (listing.beds < minBeds) return false;
      if (propertyType !== 'all' && listing.propertyType !== propertyType) return false;

      if (state.activeSearchPolygon && geometryLib && coreLib) {
        const point = new coreLib.LatLng(listing.lat, listing.lng);
        const inside = geometryLib.poly.containsLocation(point, state.activeSearchPolygon);
        if (!inside) return false;
      }

      return true;
    });

    renderResultsCount();
    renderPropertyList();
    syncMapMarkers();

    if (
      state.selectedListingId &&
      !state.filteredListings.some((item) => item.id === state.selectedListingId)
    ) {
      if (state.filteredListings.length > 0) {
        selectListing(state.filteredListings[0].id, { panTo: false });
      } else {
        clearSelectedListingVisuals();
      }
    }
  }

  function renderResultsCount() {
    const count = state.filteredListings.length;
    el.resultsCount.textContent = `${count} ${count === 1 ? 'home' : 'homes'}`;
    if (state.activeSearchPolygon) {
      el.activeFilterChip.classList.remove('hidden');
      el.clearAreaBtn.disabled = false;
    } else {
      el.activeFilterChip.classList.add('hidden');
      el.clearAreaBtn.disabled = true;
    }
  }

  function renderPropertyList() {
    clearElement(el.propertyList);

    if (state.filteredListings.length === 0) {
      const empty = createEl(
        'div',
        'empty-state-msg',
        'No San Francisco homes match your current price, bed, or drawn-area filters.'
      );
      el.propertyList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const listing of state.filteredListings) {
      const card = createEl('article', 'property-card');
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-testid', 'property-card');
      card.dataset.listingId = listing.id;
      if (listing.id === state.selectedListingId) card.classList.add('is-selected');
      if (listing.id === state.hoveredListingId) card.classList.add('is-hovered');

      const topRow = createEl('div', 'card-top-row');
      topRow.appendChild(createEl('span', 'card-price', formatCurrency(listing.price)));
      topRow.appendChild(createEl('span', 'card-badge', listing.badge));

      const stats = createEl(
        'div',
        'card-stats',
        `${listing.beds} bd · ${listing.baths} ba · ${formatNumber(listing.sqft)} sqft`
      );

      const address = createEl('div', 'card-address', listing.address);

      const metaRow = createEl('div', 'card-meta-row');
      metaRow.appendChild(createEl('span', '', `${listing.neighborhood} · ${listing.propertyType}`));
      metaRow.appendChild(createEl('span', '', `Lot ${formatNumber(listing.lotSqft)} sqft`));

      card.append(topRow, stats, address, metaRow);

      card.addEventListener('mouseenter', () => setHoveredListing(listing.id));
      card.addEventListener('mouseleave', () => setHoveredListing(null));
      card.addEventListener('click', () => selectListing(listing.id, { panTo: true }));

      fragment.appendChild(card);
    }

    el.propertyList.appendChild(fragment);
  }

  function setHoveredListing(listingId) {
    state.hoveredListingId = listingId;

    const cards = el.propertyList.querySelectorAll('.property-card');
    cards.forEach((card) => {
      if (card.dataset.listingId === listingId) {
        card.classList.add('is-hovered');
      } else {
        card.classList.remove('is-hovered');
      }
    });

    listingMarkers.forEach(({ marker, pill, listing }) => {
      if (listing.id === listingId) {
        pill.classList.add('is-hovered');
        marker.zIndex = 950;
      } else {
        pill.classList.remove('is-hovered');
        marker.zIndex = listing.id === state.selectedListingId ? 900 : 10;
      }
    });
  }

  function syncMapMarkers() {
    if (!map || !markerLib) return;

    const { AdvancedMarkerElement } = markerLib;

    if (clusterer) {
      clusterer.clearMarkers(true);
    }
    listingMarkers.forEach(({ marker }) => {
      marker.map = null;
    });
    listingMarkers.clear();

    const activeMarkers = [];
    for (const listing of state.filteredListings) {
      const pill = createEl('button', 'price-pill-marker', formatShortPrice(listing.price));
      pill.type = 'button';
      pill.setAttribute('aria-label', `${listing.title} (${formatCurrency(listing.price)})`);

      if (listing.id === state.selectedListingId) pill.classList.add('is-selected');
      if (listing.id === state.hoveredListingId) pill.classList.add('is-hovered');

      const marker = new AdvancedMarkerElement({
        position: { lat: listing.lat, lng: listing.lng },
        title: listing.address,
        zIndex: listing.id === state.selectedListingId ? 900 : 10,
      });
      marker.append(pill);

      pill.addEventListener('mouseenter', () => setHoveredListing(listing.id));
      pill.addEventListener('mouseleave', () => setHoveredListing(null));
      pill.addEventListener('click', (event) => {
        event.stopPropagation();
        selectListing(listing.id, { panTo: false });
      });

      listingMarkers.set(listing.id, { marker, pill, listing });
      activeMarkers.push(marker);
    }

    if (clusterer) {
      clusterer.addMarkers(activeMarkers);
    } else {
      activeMarkers.forEach((m) => {
        m.map = map;
      });
    }
  }

  function clearSelectedListingVisuals() {
    state.selectedListingId = null;
    if (selectedParcelPolygon) {
      selectedParcelPolygon.setMap(null);
      selectedParcelPolygon = null;
    }
    clearElement(el.detailHeader);
    el.detailHeader.appendChild(
      createEl('div', 'empty-state-msg', 'Select a property card or map pin to inspect parcel & commute details.')
    );
  }

  function renderListingDetails(listing) {
    clearElement(el.detailHeader);

    const titleRow = createEl('div', 'detail-title-row');
    titleRow.appendChild(createEl('span', 'detail-price', formatCurrency(listing.price)));
    titleRow.appendChild(createEl('span', 'detail-type-pill', listing.propertyType));

    const name = createEl('h2', 'detail-name', listing.title);
    const addr = createEl('div', 'detail-address', listing.address);
    const desc = createEl('p', 'detail-desc', listing.description);

    const parcelGrid = createEl('div', 'parcel-grid');
    const cells = [
      ['Parcel APN', listing.apn],
      ['Zoning', listing.zoning],
      ['Lot Size', `${formatNumber(listing.lotSqft)} sqft`],
      ['Living Area', `${formatNumber(listing.sqft)} sqft`],
      ['Year Built', String(listing.yearBuilt)],
      ['HOA Dues', listing.hoaMonthly ? `${formatCurrency(listing.hoaMonthly)}/mo` : 'None'],
    ];

    for (const [label, value] of cells) {
      const cell = createEl('div', 'parcel-cell');
      cell.appendChild(createEl('span', 'parcel-label', label));
      cell.appendChild(createEl('span', 'parcel-value', value));
      parcelGrid.appendChild(cell);
    }

    el.detailHeader.append(titleRow, name, addr, desc, parcelGrid);
  }

  function renderParcelPolygon(listing) {
    if (!map || !mapsLib) return;
    if (selectedParcelPolygon) {
      selectedParcelPolygon.setMap(null);
      selectedParcelPolygon = null;
    }

    const { Polygon } = mapsLib;
    selectedParcelPolygon = new Polygon({
      paths: listing.parcelPolygon,
      strokeColor: '#0f766e',
      strokeOpacity: 0.95,
      strokeWeight: 2.5,
      fillColor: '#14b8a6',
      fillOpacity: 0.28,
      zIndex: 40,
      map,
    });
  }

  async function updateStreetView(listing) {
    if (!state.config?.hasApiKey) {
      renderMissingKeyState(
        el.streetViewContainer,
        'Street View Preview',
        'Configure GOOGLE_MAPS_API_KEY in .env to view live Street View neighborhood imagery.'
      );
      return;
    }

    if (!streetViewLib) return;
    const { StreetViewPanorama, StreetViewService, StreetViewStatus } = streetViewLib;

    if (!streetViewService) {
      streetViewService = new StreetViewService();
    }

    const target = { lat: listing.lat, lng: listing.lng };

    try {
      const result = await streetViewService.getPanorama({
        location: target,
        radius: 120,
      });

      const panoPosition = result?.data?.location?.latLng || target;
      if (!streetViewPanorama) {
        clearElement(el.streetViewContainer);
        streetViewPanorama = new StreetViewPanorama(el.streetViewContainer, {
          position: panoPosition,
          pov: { heading: listing.streetViewHeading, pitch: 4 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
          motionTracking: false,
          motionTrackingControl: false,
        });
      } else {
        streetViewPanorama.setPosition(panoPosition);
        streetViewPanorama.setPov({ heading: listing.streetViewHeading, pitch: 4 });
        streetViewPanorama.setVisible(true);
      }

      if (result?.data && StreetViewStatus && !result.data.location) {
        streetViewPanorama.setPosition(target);
      }
    } catch {
      clearElement(el.streetViewContainer);
      streetViewPanorama = null;
      el.streetViewContainer.appendChild(
        createEl('div', 'empty-state-msg', 'Street View imagery is unavailable for this exact parcel coordinate.')
      );
    }
  }

  function clearAmenityMarkers() {
    while (amenityMarkers.length > 0) {
      const m = amenityMarkers.pop();
      m.map = null;
    }
  }

  function getAmenityCategoryMeta(primaryType) {
    const t = (primaryType || '').toLowerCase();
    if (t.includes('school')) {
      return { badge: 'S', cls: 'amenity-pin amenity-pin-school', label: 'School' };
    }
    if (t.includes('grocery') || t.includes('supermarket')) {
      return { badge: 'G', cls: 'amenity-pin amenity-pin-grocery', label: 'Grocery' };
    }
    if (
      t.includes('transit') ||
      t.includes('subway') ||
      t.includes('bus') ||
      t.includes('rail') ||
      t.includes('train')
    ) {
      return { badge: 'T', cls: 'amenity-pin amenity-pin-transit', label: 'Transit' };
    }
    return { badge: 'P', cls: 'amenity-pin amenity-pin-grocery', label: primaryType || 'Place' };
  }

  function renderAmenityList(places, listing) {
    clearElement(el.nearbyAmenitiesList);
    clearAmenityMarkers();

    if (!places || places.length === 0) {
      el.nearbyAmenitiesList.appendChild(
        createEl('div', 'empty-state-msg', 'No nearby places found within 5 km for this category.')
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const place of places) {
      const name = place.displayName?.text || 'Unnamed Place';
      const addr = place.formattedAddress || '';
      const loc = place.location;
      const distMeters =
        loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
          ? haversineMeters(listing.lat, listing.lng, loc.latitude, loc.longitude)
          : NaN;

      const meta = getAmenityCategoryMeta(place.primaryType);
      const item = createEl('div', 'amenity-item');

      const top = createEl('div', 'amenity-top');
      top.appendChild(createEl('span', 'amenity-name', name));
      top.appendChild(createEl('span', 'amenity-dist', formatDistance(distMeters)));

      const sub = createEl('div', 'amenity-sub');
      sub.appendChild(createEl('span', '', `${meta.label}${addr ? ` · ${addr}` : ''}`));

      const ratingText =
        typeof place.rating === 'number'
          ? `${place.rating.toFixed(1)} ★ (${place.userRatingCount || 0})`
          : '';
      if (ratingText) {
        sub.appendChild(createEl('span', '', ratingText));
      }

      item.append(top, sub);

      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        item.addEventListener('click', () => {
          if (map) {
            map.panTo({ lat: loc.latitude, lng: loc.longitude });
            if ((map.getZoom() || 13) < 15) map.setZoom(15);
          }
        });

        if (map && markerLib) {
          const pinEl = createEl('div', meta.cls, meta.badge);
          pinEl.title = name;
          const amMarker = new markerLib.AdvancedMarkerElement({
            position: { lat: loc.latitude, lng: loc.longitude },
            title: name,
            zIndex: 5,
            map,
          });
          amMarker.append(pinEl);
          amenityMarkers.push(amMarker);
        }
      }

      fragment.appendChild(item);
    }

    el.nearbyAmenitiesList.appendChild(fragment);
  }

  async function loadNearbyAmenities(listing) {
    if (!state.config?.hasApiKey) {
      clearElement(el.nearbyAmenitiesList);
      el.nearbyAmenitiesList.appendChild(
        createEl(
          'div',
          'empty-state-msg',
          'Configure GOOGLE_MAPS_API_KEY to discover live schools, groceries, and transit within 5 km.'
        )
      );
      return;
    }

    const category = state.activeAmenityCategory;
    const cacheKey = `${listing.id}:${category}`;
    if (state.nearbyCache.has(cacheKey)) {
      renderAmenityList(state.nearbyCache.get(cacheKey), listing);
      return;
    }

    clearElement(el.nearbyAmenitiesList);
    el.nearbyAmenitiesList.appendChild(
      createEl('div', 'empty-state-msg', 'Searching within 5 km via Places API (New)...')
    );

    try {
      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: listing.lat,
          longitude: listing.lng,
          radiusMeters: 5000,
          includedTypes: AMENITY_TYPE_GROUPS[category] || AMENITY_TYPE_GROUPS.all,
          maxResultCount: 12,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        clearElement(el.nearbyAmenitiesList);
        el.nearbyAmenitiesList.appendChild(
          createEl('div', 'empty-state-msg', data.error || 'Unable to load nearby places.')
        );
        return;
      }

      const places = Array.isArray(data.places) ? data.places : [];
      state.nearbyCache.set(cacheKey, places);

      // Guard against stale async responses if user selected another listing
      if (state.selectedListingId === listing.id && state.activeAmenityCategory === category) {
        renderAmenityList(places, listing);
      }
    } catch {
      clearElement(el.nearbyAmenitiesList);
      el.nearbyAmenitiesList.appendChild(
        createEl('div', 'empty-state-msg', 'Network error while fetching nearby places.')
      );
    }
  }

  function clearCommuteOverlays() {
    if (commutePolyline) {
      commutePolyline.setMap(null);
      commutePolyline = null;
    }
    if (workplaceMarker) {
      workplaceMarker.map = null;
      workplaceMarker = null;
    }
  }

  async function resolveWorkplaceDestination(queryText) {
    const trimmed = queryText.trim();
    if (!trimmed) return null;

    if (
      state.resolvedWorkplace &&
      state.resolvedWorkplace.query.toLowerCase() === trimmed.toLowerCase()
    ) {
      return state.resolvedWorkplace;
    }

    const res = await fetch('/api/places/search-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textQuery: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not resolve workplace destination.');
    }
    const first = Array.isArray(data.places) ? data.places[0] : null;
    if (!first?.location) {
      throw new Error('No matching workplace location found.');
    }

    const resolved = {
      query: trimmed,
      name: first.displayName?.text || trimmed,
      address: first.formattedAddress || '',
      lat: first.location.latitude,
      lng: first.location.longitude,
    };
    state.resolvedWorkplace = resolved;
    return resolved;
  }

  async function calculateCommute(fitMapToRoute) {
    const listing = getSelectedListing();
    if (!listing) return;

    if (!state.config?.hasApiKey) {
      el.commuteDestinationLabel.textContent =
        'Configure GOOGLE_MAPS_API_KEY to compute live driving & transit ETAs.';
      el.commuteDriveEta.textContent = 'API key needed';
      el.commuteTransitEta.textContent = 'API key needed';
      return;
    }

    const queryText = el.workplaceInput.value.trim();
    if (!queryText) return;

    el.calculateCommuteBtn.disabled = true;
    el.commuteDriveEta.textContent = 'Calculating...';
    el.commuteTransitEta.textContent = 'Calculating...';
    el.commuteDestinationLabel.textContent = `Resolving "${queryText}"...`;

    try {
      const dest = await resolveWorkplaceDestination(queryText);
      if (!dest) return;

      el.commuteDestinationLabel.textContent = `To: ${dest.name}${dest.address ? ` (${dest.address})` : ''}`;

      const [matrixRes, routeRes] = await Promise.all([
        fetch('/api/routes/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { lat: listing.lat, lng: listing.lng },
            destination: { lat: dest.lat, lng: dest.lng },
            travelModes: ['DRIVE', 'TRANSIT'],
          }),
        }),
        fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { lat: listing.lat, lng: listing.lng },
            destination: { lat: dest.lat, lng: dest.lng },
            travelMode: 'DRIVE',
          }),
        }),
      ]);

      const matrixData = await matrixRes.json();
      if (!matrixRes.ok) {
        throw new Error(matrixData.error || 'Commute matrix calculation failed.');
      }

      const drive = matrixData.drive;
      if (drive && drive.condition === 'ROUTE_EXISTS') {
        const dur = parseDurationLabel(drive.duration, drive.localizedValues?.duration?.text);
        const dist = drive.localizedValues?.distance?.text || formatDistance(drive.distanceMeters);
        el.commuteDriveEta.textContent = dist ? `${dur} · ${dist}` : dur;
      } else {
        el.commuteDriveEta.textContent = 'Route unavailable';
      }

      const transit = matrixData.transit;
      if (transit && transit.condition === 'ROUTE_EXISTS') {
        const dur = parseDurationLabel(
          transit.duration,
          transit.localizedValues?.duration?.text
        );
        const dist =
          transit.localizedValues?.distance?.text || formatDistance(transit.distanceMeters);
        el.commuteTransitEta.textContent = dist ? `${dur} · ${dist}` : dur;
      } else {
        el.commuteTransitEta.textContent = 'Transit unavailable';
      }

      // Draw commute route polyline & workplace pin
      clearCommuteOverlays();
      if (routeRes.ok && map && mapsLib && geometryLib) {
        const routeData = await routeRes.json();
        const encoded = routeData?.route?.polyline?.encodedPolyline;
        if (encoded) {
          const path = geometryLib.encoding.decodePath(encoded);
          commutePolyline = new mapsLib.Polyline({
            path,
            strokeColor: '#f97316',
            strokeOpacity: 0.9,
            strokeWeight: 4,
            zIndex: 35,
            map,
          });
        }
      }

      if (map && markerLib) {
        const workBadge = createEl('div', 'workplace-pin', `Work: ${dest.name}`);
        workplaceMarker = new markerLib.AdvancedMarkerElement({
          position: { lat: dest.lat, lng: dest.lng },
          title: dest.name,
          zIndex: 800,
          map,
        });
        workplaceMarker.append(workBadge);
      }

      if (fitMapToRoute && map && coreLib) {
        const bounds = new coreLib.LatLngBounds();
        bounds.extend({ lat: listing.lat, lng: listing.lng });
        bounds.extend({ lat: dest.lat, lng: dest.lng });
        map.fitBounds(bounds, 72);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to compute commute.';
      el.commuteDestinationLabel.textContent = msg;
      el.commuteDriveEta.textContent = 'Unavailable';
      el.commuteTransitEta.textContent = 'Unavailable';
    } finally {
      el.calculateCommuteBtn.disabled = false;
    }
  }

  function selectListing(listingId, options = { panTo: true }) {
    const listing = state.allListings.find((item) => item.id === listingId);
    if (!listing) return;

    state.selectedListingId = listing.id;

    // Update card & marker highlight state
    const cards = el.propertyList.querySelectorAll('.property-card');
    cards.forEach((card) => {
      if (card.dataset.listingId === listing.id) {
        card.classList.add('is-selected');
      } else {
        card.classList.remove('is-selected');
      }
    });

    listingMarkers.forEach(({ marker, pill, listing: mListing }) => {
      if (mListing.id === listing.id) {
        pill.classList.add('is-selected');
        marker.zIndex = 900;
      } else {
        pill.classList.remove('is-selected');
        marker.zIndex = 10;
      }
    });

    renderListingDetails(listing);
    renderParcelPolygon(listing);
    void updateStreetView(listing);
    void loadNearbyAmenities(listing);

    if (el.workplaceInput.value.trim()) {
      void calculateCommute(false);
    }

    if (options.panTo && map) {
      map.panTo({ lat: listing.lat, lng: listing.lng });
      if ((map.getZoom() || 13) < 16) {
        map.setZoom(16);
      }
    }
  }

  function setupTerraDraw() {
    if (!map || !window.terraDraw || !window.terraDrawGoogleMapsAdapter) return;
    const { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } = window.terraDraw;
    const { TerraDrawGoogleMapsAdapter } = window.terraDrawGoogleMapsAdapter;

    terraDraw = new TerraDraw({
      adapter: new TerraDrawGoogleMapsAdapter({
        map,
        lib: google.maps,
        coordinatePrecision: 9,
      }),
      modes: [
        new TerraDrawPolygonMode({
          styles: {
            fillColor: '#1a56db',
            fillOpacity: 0.16,
            outlineColor: '#1a56db',
            outlineWidth: 2.5,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: false,
                coordinates: {
                  midpoints: false,
                  draggable: false,
                  deletable: false,
                },
              },
            },
          },
        }),
      ],
    });

    terraDraw.start();
    terraDraw.setMode('static');

    terraDraw.on('finish', (id) => {
      const feature = terraDraw.getSnapshotFeature(id);
      state.isDrawing = false;
      el.drawAreaBtn.classList.remove('is-active');
      el.drawAreaBtn.textContent = 'Draw Search Area';
      el.drawStatusBanner.classList.add('hidden');
      terraDraw.setMode('static');

      if (feature?.geometry?.type === 'Polygon' && Array.isArray(feature.geometry.coordinates?.[0])) {
        const ring = feature.geometry.coordinates[0];
        const path = ring.map(([lng, lat]) => ({ lat, lng }));
        state.activeSearchPolygon = new mapsLib.Polygon({ paths: path });
        applyFilters();
      }
    });
  }

  async function initAutocompleteWidget() {
    if (!placesLib || !placesLib.PlaceAutocompleteElement) return;

    const { PlaceAutocompleteElement } = placesLib;
    const autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: { lat: 37.7749, lng: -122.4194 },
        radius: 40000,
      },
    });
    autocomplete.id = 'place-autocomplete-element';
    autocomplete.setAttribute('aria-label', 'Search San Francisco neighborhood or address');

    clearElement(el.searchHost);
    el.searchHost.appendChild(autocomplete);

    autocomplete.addEventListener('gmp-select', async (event) => {
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        if (place.viewport && map) {
          map.fitBounds(place.viewport);
        } else if (place.location && map) {
          map.panTo(place.location);
          map.setZoom(15);
        }
      } catch {
        // Ignore transient selection cancellations cleanly
      }
    });

    autocomplete.addEventListener('gmp-error', () => {
      // Handled gracefully without uncaught rejections
    });
  }

  async function initGoogleMaps() {
    const config = state.config;
    if (!config?.hasApiKey) {
      renderMissingKeyState(
        el.mapContainer,
        'Google Maps API Key Required',
        'Add GOOGLE_MAPS_API_KEY to a local .env file to activate the interactive vector map, Terra Draw polygon filtering, Street View, Places nearby search, and Routes commute calculator.'
      );
      el.drawAreaBtn.disabled = true;
      el.mapTypeToggleBtn.disabled = true;
      return;
    }

    installMapsBootstrap(config.apiKey);

    try {
      const [core, maps, marker, places, streetView, geometry] = await Promise.all([
        google.maps.importLibrary('core'),
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('streetView'),
        google.maps.importLibrary('geometry'),
      ]);

      coreLib = core;
      mapsLib = maps;
      markerLib = marker;
      placesLib = places;
      streetViewLib = streetView;
      geometryLib = geometry;

      const { Map } = mapsLib;
      const { AdvancedMarkerElement } = markerLib;

      map = new Map(el.mapContainer, {
        center: config.defaultCenter || { lat: 37.7749, lng: -122.4194 },
        zoom: config.defaultZoom || 13,
        mapId: config.mapId || 'DEMO_MAP_ID',
        internalUsageAttributionIds: [ATTRIBUTION_ID],
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: false,
        clickableIcons: false,
      });

      if (window.markerClusterer?.MarkerClusterer) {
        const { MarkerClusterer } = window.markerClusterer;
        clusterer = new MarkerClusterer({
          map,
          markers: [],
          renderer: {
            render(cluster) {
              const clusterPill = createEl(
                'button',
                'cluster-pill-marker',
                `${cluster.count} homes`
              );
              clusterPill.type = 'button';
              clusterPill.setAttribute('aria-label', `Zoom to ${cluster.count} homes`);
              clusterPill.addEventListener('click', (event) => {
                event.stopPropagation();
                if (cluster.bounds) {
                  map.fitBounds(cluster.bounds, 56);
                }
              });

              const clusterMarker = new AdvancedMarkerElement({
                position: cluster.position,
                zIndex: 1000 + cluster.count,
              });
              clusterMarker.append(clusterPill);
              return clusterMarker;
            },
          },
          onClusterClick(_event, cluster, targetMap) {
            if (cluster.bounds) {
              targetMap.fitBounds(cluster.bounds, 56);
            }
          },
        });
      }

      google.maps.event.addListenerOnce(map, 'projection_changed', () => {
        setupTerraDraw();
      });

      await initAutocompleteWidget();
      syncMapMarkers();

      const selected = getSelectedListing();
      if (selected) {
        renderParcelPolygon(selected);
        void updateStreetView(selected);
        void loadNearbyAmenities(selected);
        void calculateCommute(false);
      }
    } catch (error) {
      renderMissingKeyState(
        el.mapContainer,
        'Unable to Initialize Google Map',
        error instanceof Error ? error.message : 'Check your GOOGLE_MAPS_API_KEY configuration.'
      );
    }
  }

  function bindUiEvents() {
    el.maxPriceSelect.addEventListener('change', (e) => {
      state.filters.maxPrice = e.target.value;
      applyFilters();
    });

    el.minBedsSelect.addEventListener('change', (e) => {
      state.filters.minBeds = Number(e.target.value) || 0;
      applyFilters();
    });

    el.propertyTypeSelect.addEventListener('change', (e) => {
      state.filters.propertyType = e.target.value;
      applyFilters();
    });

    el.resetFiltersBtn.addEventListener('click', () => {
      state.filters.maxPrice = 'any';
      state.filters.minBeds = 0;
      state.filters.propertyType = 'all';
      el.maxPriceSelect.value = 'any';
      el.minBedsSelect.value = '0';
      el.propertyTypeSelect.value = 'all';
      clearDrawnSearchArea();
      applyFilters();
      if (map && state.config?.defaultCenter) {
        map.panTo(state.config.defaultCenter);
        map.setZoom(state.config.defaultZoom || 13);
      }
    });

    el.fallbackSearchInput?.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const query = el.fallbackSearchInput.value.trim();
      if (!query || !state.config?.hasApiKey) return;
      try {
        const res = await fetch('/api/places/search-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textQuery: query }),
        });
        const data = await res.json();
        const first = data?.places?.[0];
        if (first?.location && map) {
          map.panTo({ lat: first.location.latitude, lng: first.location.longitude });
          map.setZoom(14);
        }
      } catch {
        // Ignore network errors on fallback input
      }
    });

    el.amenityTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category || 'all';
        state.activeAmenityCategory = cat;
        el.amenityTabs.forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        const selected = getSelectedListing();
        if (selected) {
          void loadNearbyAmenities(selected);
        }
      });
    });

    el.commuteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      void calculateCommute(true);
    });

    el.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const target = chip.dataset.workplace || '';
        if (!target) return;
        el.workplaceInput.value = target;
        void calculateCommute(true);
      });
    });

    el.drawAreaBtn.addEventListener('click', () => {
      if (!terraDraw) return;
      if (state.isDrawing) {
        state.isDrawing = false;
        terraDraw.setMode('static');
        el.drawAreaBtn.classList.remove('is-active');
        el.drawAreaBtn.textContent = 'Draw Search Area';
        el.drawStatusBanner.classList.add('hidden');
        return;
      }

      terraDraw.clear();
      state.activeSearchPolygon = null;
      state.isDrawing = true;
      terraDraw.setMode('polygon');
      el.drawAreaBtn.classList.add('is-active');
      el.drawAreaBtn.textContent = 'Cancel Drawing';
      el.drawStatusBanner.textContent =
        'Click points on the map to outline a neighborhood; click the first point or double-click to finish.';
      el.drawStatusBanner.classList.remove('hidden');
    });

    el.clearAreaBtn.addEventListener('click', () => {
      clearDrawnSearchArea();
      applyFilters();
    });

    el.mapTypeToggleBtn.addEventListener('click', () => {
      if (!map) return;
      if (state.mapTypeId === 'roadmap') {
        state.mapTypeId = 'satellite';
        map.setMapTypeId('satellite');
        el.mapTypeToggleBtn.textContent = 'Roadmap';
        el.mapTypeToggleBtn.classList.add('is-active');
      } else {
        state.mapTypeId = 'roadmap';
        map.setMapTypeId('roadmap');
        el.mapTypeToggleBtn.textContent = 'Satellite';
        el.mapTypeToggleBtn.classList.remove('is-active');
      }
    });
  }

  function clearDrawnSearchArea() {
    state.isDrawing = false;
    state.activeSearchPolygon = null;
    if (terraDraw) {
      terraDraw.clear();
      terraDraw.setMode('static');
    }
    el.drawAreaBtn.classList.remove('is-active');
    el.drawAreaBtn.textContent = 'Draw Search Area';
    el.drawStatusBanner.classList.add('hidden');
  }

  async function bootstrap() {
    bindUiEvents();

    const [configRes, listingsRes] = await Promise.all([
      fetch('/api/config'),
      fetch('/api/listings'),
    ]);

    state.config = await configRes.json();
    const listingsJson = await listingsRes.json();
    state.allListings = Array.isArray(listingsJson.listings) ? listingsJson.listings : [];
    state.filteredListings = [...state.allListings];

    renderResultsCount();
    renderPropertyList();

    if (state.filteredListings.length > 0) {
      selectListing(state.filteredListings[0].id, { panTo: false });
    }

    await initGoogleMaps();
  }

  void bootstrap();
})();
