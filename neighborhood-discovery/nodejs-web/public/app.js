const NEIGHBORHOOD_PRESETS = {
  'covent-garden': { name: 'Covent Garden', lat: 51.5118, lng: -0.128, zoom: 13 },
  soho: { name: 'Soho', lat: 51.5136, lng: -0.1365, zoom: 14 },
  'south-bank': { name: 'South Bank', lat: 51.5055, lng: -0.1145, zoom: 14 },
  bloomsbury: { name: 'Bloomsbury', lat: 51.5229, lng: -0.128, zoom: 14 },
  shoreditch: { name: 'Shoreditch', lat: 51.5246, lng: -0.078, zoom: 14 },
};

const CATEGORY_META = {
  restaurant: { label: 'Restaurant', color: '#d93025', border: '#a50e0e', glyph: 'R', className: 'cat-restaurant' },
  cafe: { label: 'Cafe', color: '#e37400', border: '#b06000', glyph: 'C', className: 'cat-cafe' },
  museum: { label: 'Museum', color: '#681da8', border: '#4a0e78', glyph: 'M', className: 'cat-museum' },
  park: { label: 'Park', color: '#188038', border: '#0d652d', glyph: 'P', className: 'cat-park' },
  community: { label: 'Community', color: '#007b83', border: '#004d53', glyph: '★', className: 'cat-community' },
};

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '£',
  PRICE_LEVEL_MODERATE: '££',
  PRICE_LEVEL_EXPENSIVE: '£££',
  PRICE_LEVEL_VERY_EXPENSIVE: '££££',
};

const state = {
  center: { lat: 51.5118, lng: -0.128 },
  neighborhoodName: 'Covent Garden',
  radiusMeters: 5000,
  showRadius: true,
  activeCategory: 'all',
  activeTextQuery: '',
  places: [],
  loadedCategoriesForCenter: new Set(),
  selectedPlaceId: null,
  compareIds: [],
  detailsCache: new Map(),
  communitySpots: [],
  pendingReverseGeocode: null,
  map: null,
  radiusCircle: null,
  placeMarkers: [],
  communityMarkers: [],
  tempMarker: null,
  markerClasses: null,
  placesClasses: null,
  autocompleteEl: null,
};

const dom = {
  autocompleteContainer: document.getElementById('neighborhood-autocomplete-input'),
  geocodeBtn: document.getElementById('address-geocode-button'),
  presetSelect: document.getElementById('neighborhood-preset-select'),
  radiusToggleBtn: document.getElementById('radius-toggle-circle'),
  pinSpotBtn: document.getElementById('pin-community-spot-button'),
  toggleCompareBtn: document.getElementById('toggle-comparison-button'),
  compareCount: document.getElementById('compare-count'),
  statusBanner: document.getElementById('status-banner'),
  categoryChips: Array.from(document.querySelectorAll('.category-chips .chip')),
  textSearchForm: document.getElementById('text-search-form'),
  textSearchInput: document.getElementById('text-search-input'),
  textSearchClear: document.getElementById('text-search-clear'),
  neighborhoodLabel: document.getElementById('active-neighborhood-label'),
  resultsCountLabel: document.getElementById('results-count-label'),
  resultsList: document.getElementById('places-results-list'),
  communitySpotsCount: document.getElementById('community-spots-count'),
  communitySpotsList: document.getElementById('community-spots-list'),
  mapCanvas: document.getElementById('map-canvas'),
  drawer: document.getElementById('place-details-drawer'),
  drawerModeBadge: document.getElementById('drawer-mode-badge'),
  closeDrawerBtn: document.getElementById('close-drawer-button'),
  placeDetailsView: document.getElementById('place-details-view'),
  drawerPhotoWrap: document.getElementById('drawer-photo-wrap'),
  drawerPhoto: document.getElementById('drawer-photo'),
  drawerPhotoAttr: document.getElementById('drawer-photo-attribution'),
  drawerCategoryPill: document.getElementById('drawer-category-pill'),
  drawerPlaceTitle: document.getElementById('drawer-place-title'),
  drawerRatingRow: document.getElementById('drawer-rating-row'),
  drawerAddress: document.getElementById('drawer-address'),
  drawerCompareBtn: document.getElementById('drawer-compare-button'),
  drawerMapsLink: document.getElementById('drawer-maps-link'),
  drawerContactBlock: document.getElementById('drawer-contact-block'),
  drawerContactItems: document.getElementById('drawer-contact-items'),
  drawerHoursList: document.getElementById('drawer-hours-list'),
  drawerReviewsList: document.getElementById('drawer-reviews-list'),
  reverseInspector: document.getElementById('reverse-geocode-inspector'),
  rgFormattedAddress: document.getElementById('rg-formatted-address'),
  rgCoordinates: document.getElementById('rg-coordinates'),
  rgPlaceId: document.getElementById('rg-place-id'),
  rgPlusCodeWrap: document.getElementById('rg-plus-code-wrap'),
  rgPlusCode: document.getElementById('rg-plus-code'),
  communitySpotForm: document.getElementById('community-spot-form'),
  communitySpotNameInput: document.getElementById('community-spot-name-input'),
  communitySpotCategorySelect: document.getElementById('community-spot-category-select'),
  communitySpotNoteInput: document.getElementById('community-spot-note-input'),
  comparisonPanel: document.getElementById('comparison-panel'),
  comparisonGrid: document.getElementById('comparison-grid'),
  clearComparisonBtn: document.getElementById('clear-comparison-button'),
  closeComparisonBtn: document.getElementById('close-comparison-button'),
};

function showStatus(message, isError = false) {
  dom.statusBanner.textContent = message;
  dom.statusBanner.classList.remove('hidden', 'error');
  if (isError) {
    dom.statusBanner.classList.add('error');
  }
}

function hideStatus() {
  dom.statusBanner.classList.add('hidden');
  dom.statusBanner.textContent = '';
}

function loadMapsBootstrap(params) {
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
    const bGoogle = (b[c] = b[c] || {});
    const d = (bGoogle.maps = bGoogle.maps || {});
    const r = new Set();
    const e = new URLSearchParams();
    const u = () =>
      h ||
      (h = new Promise(async (resolve, reject) => {
        a = m.createElement('script');
        e.set('libraries', [...r].join(','));
        for (k in g) {
          e.set(
            k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
            g[k]
          );
        }
        e.set('callback', `${c}.maps.${q}`);
        a.src = `https://maps.${c}apis.com/maps/api/js?${e.toString()}`;
        d[q] = resolve;
        a.onerror = () => {
          h = undefined;
          reject(new Error(`${p} could not load.`));
        };
        a.nonce = m.querySelector('script[nonce]')?.nonce || '';
        m.head.append(a);
      }));

    if (!d[l]) {
      d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
    }
  })(params);
}

function resolveCategory(place) {
  const candidates = [place.primaryType, ...(Array.isArray(place.types) ? place.types : [])].filter(Boolean);
  for (const type of candidates) {
    if (type === 'cafe' || type === 'coffee_shop' || type === 'tea_house') return 'cafe';
    if (type === 'museum' || type === 'art_gallery' || type === 'cultural_center') return 'museum';
    if (type === 'park' || type === 'garden' || type === 'botanical_garden' || type === 'national_park') return 'park';
    if (
      type === 'restaurant' ||
      type === 'bistro' ||
      type === 'bakery' ||
      type === 'meal_takeaway' ||
      type === 'bar'
    ) {
      return 'restaurant';
    }
  }
  return 'restaurant';
}

function formatPriceLevel(priceLevel) {
  return PRICE_LEVEL_MAP[priceLevel] || null;
}

function getLondonTodayIndex() {
  try {
    const weekday = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
    }).format(new Date());
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return order.indexOf(weekday);
  } catch {
    return -1;
  }
}

function getTodayHoursText(place) {
  const descriptions = place.regularOpeningHours?.weekdayDescriptions;
  if (!Array.isArray(descriptions) || descriptions.length === 0) {
    return 'Hours not listed';
  }
  const idx = getLondonTodayIndex();
  if (idx >= 0 && descriptions[idx]) {
    return descriptions[idx];
  }
  return descriptions[0];
}

function getFilteredPlaces() {
  return state.places.filter((place) => {
    if (state.activeCategory === 'all') return true;
    return resolveCategory(place) === state.activeCategory;
  });
}

function updateCenterDisplay() {
  const latStr = state.center.lat.toFixed(4);
  const lngStr = state.center.lng.toFixed(4);
  dom.neighborhoodLabel.textContent = `${state.neighborhoodName} · ${latStr}, ${lngStr}`;
}

function mergePlaces(incomingPlaces, replaceExisting) {
  const mapById = new Map();
  if (!replaceExisting) {
    for (const p of state.places) {
      if (p.id) mapById.set(p.id, p);
    }
  }
  for (const p of incomingPlaces) {
    if (p && p.id) {
      const prev = mapById.get(p.id);
      mapById.set(p.id, prev ? { ...prev, ...p } : p);
    }
  }
  state.places = Array.from(mapById.values());
}

async function fetchNearbyPlaces({ categories, replaceExisting }) {
  const response = await fetch('/api/places/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: state.center.lat,
      lng: state.center.lng,
      radius: state.radiusMeters,
      includedTypes: categories,
      maxResultCount: 20,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load nearby places.');
  }

  mergePlaces(payload.places || [], replaceExisting);
  for (const cat of categories) {
    state.loadedCategoriesForCenter.add(cat);
  }
}

async function fetchTextSearchPlaces(textQuery) {
  const body = {
    textQuery,
    lat: state.center.lat,
    lng: state.center.lng,
    radius: state.radiusMeters,
    pageSize: 20,
  };
  if (state.activeCategory !== 'all') {
    body.includedType = state.activeCategory;
  }

  const response = await fetch('/api/places/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Text search failed.');
  }

  mergePlaces(payload.places || [], true);
}

async function fetchPlaceDetails(placeId) {
  if (state.detailsCache.has(placeId)) {
    return state.detailsCache.get(placeId);
  }

  const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch place details.');
  }

  const detailed = payload.place;
  if (detailed && detailed.id) {
    state.detailsCache.set(detailed.id, detailed);
    // Update summary item if present
    const idx = state.places.findIndex((p) => p.id === detailed.id);
    if (idx !== -1) {
      state.places[idx] = { ...state.places[idx], ...detailed };
    }
  }
  return detailed;
}

function clearPlaceMarkers() {
  for (const marker of state.placeMarkers) {
    marker.map = null;
  }
  state.placeMarkers = [];
}

function renderMarkers() {
  if (!state.map || !state.markerClasses) return;
  const { AdvancedMarkerElement, PinElement } = state.markerClasses;

  clearPlaceMarkers();

  const visiblePlaces = getFilteredPlaces();
  for (const place of visiblePlaces) {
    const loc = place.location;
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;

    const category = resolveCategory(place);
    const meta = CATEGORY_META[category] || CATEGORY_META.restaurant;
    const isSelected = state.selectedPlaceId === place.id;

    const pin = new PinElement({
      background: meta.color,
      borderColor: isSelected ? '#0f172a' : meta.border,
      glyphColor: '#ffffff',
      glyphText: meta.glyph,
      scale: isSelected ? 1.25 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: loc.latitude, lng: loc.longitude },
      title: place.displayName?.text || 'Place',
      content: pin,
      zIndex: isSelected ? 50 : 10,
    });

    // Weekly-channel safe click listener on AdvancedMarkerElement
    marker.addListener('click', () => {
      void inspectPlace(place.id);
    });

    state.placeMarkers.push(marker);
  }
}

function renderCommunityMarkers() {
  if (!state.map || !state.markerClasses) return;
  const { AdvancedMarkerElement, PinElement } = state.markerClasses;

  for (const marker of state.communityMarkers) {
    marker.map = null;
  }
  state.communityMarkers = [];

  for (const spot of state.communitySpots) {
    const meta = CATEGORY_META[spot.category] || CATEGORY_META.community;
    const pin = new PinElement({
      background: CATEGORY_META.community.color,
      borderColor: CATEGORY_META.community.border,
      glyphColor: '#ffffff',
      glyphText: '★',
      scale: 1.1,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat: spot.lat, lng: spot.lng },
      title: `${spot.name} (${meta.label})`,
      content: pin,
      zIndex: 40,
    });

    marker.addListener('click', () => {
      state.map.panTo({ lat: spot.lat, lng: spot.lng });
      openReverseGeocodeView({
        lat: spot.lat,
        lng: spot.lng,
        formatted_address: spot.address,
        place_id: spot.placeId || 'Session Spot',
        plus_code: spot.plusCode || null,
      });
    });

    state.communityMarkers.push(marker);
  }
}

function createCategoryPill(categoryKey, customText = null) {
  const meta = CATEGORY_META[categoryKey] || CATEGORY_META.restaurant;
  const pill = document.createElement('span');
  pill.className = `category-pill ${meta.className}`;
  pill.textContent = customText || meta.label;
  return pill;
}

function renderDirectoryList() {
  const visiblePlaces = getFilteredPlaces();
  dom.resultsCountLabel.textContent = `${visiblePlaces.length} place${visiblePlaces.length === 1 ? '' : 's'} shown`;

  if (visiblePlaces.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No places matched this filter inside the 5km radius. Try "All" or another neighborhood.';
    dom.resultsList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const place of visiblePlaces) {
    const category = resolveCategory(place);
    const inCompare = state.compareIds.includes(place.id);
    const isSelected = state.selectedPlaceId === place.id;

    const card = document.createElement('article');
    card.className = `place-card${isSelected ? ' selected' : ''}`;
    card.setAttribute('role', 'listitem');
    card.dataset.placeId = place.id;

    const top = document.createElement('div');
    top.className = 'card-top';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = place.displayName?.text || 'Unnamed Place';

    top.append(title, createCategoryPill(category, place.primaryTypeDisplayName?.text || null));

    const metrics = document.createElement('div');
    metrics.className = 'card-metrics';

    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'rating-chip';
    if (typeof place.rating === 'number') {
      const countText = typeof place.userRatingCount === 'number' ? ` (${place.userRatingCount.toLocaleString()})` : '';
      ratingSpan.textContent = `★ ${place.rating.toFixed(1)}${countText}`;
    } else {
      ratingSpan.textContent = 'No rating';
    }
    metrics.append(ratingSpan);

    const priceText = formatPriceLevel(place.priceLevel);
    if (priceText) {
      const priceSpan = document.createElement('span');
      priceSpan.className = 'price-chip';
      priceSpan.textContent = priceText;
      metrics.append(priceSpan);
    }

    if (typeof place.regularOpeningHours?.openNow === 'boolean') {
      const openBadge = document.createElement('span');
      openBadge.className = `open-badge ${place.regularOpeningHours.openNow ? 'is-open' : 'is-closed'}`;
      openBadge.textContent = place.regularOpeningHours.openNow ? 'Open now' : 'Closed';
      metrics.append(openBadge);
    }

    const hours = document.createElement('p');
    hours.className = 'card-hours';
    hours.textContent = getTodayHoursText(place);

    const address = document.createElement('p');
    address.className = 'card-address';
    address.textContent = place.formattedAddress || 'Central London';

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const inspectBtn = document.createElement('button');
    inspectBtn.type = 'button';
    inspectBtn.className = 'btn btn-sm btn-primary';
    inspectBtn.textContent = 'Inspect Details';
    inspectBtn.addEventListener('click', () => {
      void inspectPlace(place.id);
    });

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = `btn btn-sm btn-secondary${inCompare ? ' active' : ''}`;
    compareBtn.textContent = inCompare ? 'In Compare ✓' : '+ Compare';
    compareBtn.addEventListener('click', () => {
      void toggleComparePlace(place.id);
    });

    actions.append(inspectBtn, compareBtn);
    card.append(top, metrics, hours, address, actions);
    fragment.append(card);
  }

  dom.resultsList.replaceChildren(fragment);
}

function renderCommunitySpotsList() {
  dom.communitySpotsCount.textContent = String(state.communitySpots.length);

  if (state.communitySpots.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'community-hint';
    empty.textContent = 'No community spots pinned yet in this session.';
    dom.communitySpotsList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const spot of state.communitySpots) {
    const card = document.createElement('div');
    card.className = 'community-card';

    const top = document.createElement('div');
    top.className = 'community-card-top';

    const title = document.createElement('h4');
    title.className = 'community-card-title';
    title.textContent = spot.name;

    top.append(title, createCategoryPill(spot.category));

    const addr = document.createElement('p');
    addr.className = 'community-card-address';
    addr.textContent = spot.address;

    card.append(top, addr);

    if (spot.note) {
      const note = document.createElement('p');
      note.className = 'community-card-note';
      note.textContent = spot.note;
      card.append(note);
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const focusBtn = document.createElement('button');
    focusBtn.type = 'button';
    focusBtn.className = 'btn btn-sm btn-outline';
    focusBtn.textContent = 'Focus on Map';
    focusBtn.addEventListener('click', () => {
      if (state.map) {
        state.map.panTo({ lat: spot.lat, lng: spot.lng });
        state.map.setZoom(16);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm btn-ghost';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      state.communitySpots = state.communitySpots.filter((s) => s.id !== spot.id);
      renderCommunityMarkers();
      renderCommunitySpotsList();
    });

    actions.append(focusBtn, removeBtn);
    card.append(actions);
    fragment.append(card);
  }

  dom.communitySpotsList.replaceChildren(fragment);
}

function updateCompareHeaderButton() {
  dom.compareCount.textContent = String(state.compareIds.length);
  if (state.selectedPlaceId) {
    const inCompare = state.compareIds.includes(state.selectedPlaceId);
    dom.drawerCompareBtn.textContent = inCompare ? 'In Compare ✓' : '+ Compare';
    dom.drawerCompareBtn.classList.toggle('active', inCompare);
  }
}

function renderComparisonPanel() {
  updateCompareHeaderButton();
  const comparedPlaces = state.compareIds
    .map((id) => state.detailsCache.get(id) || state.places.find((p) => p.id === id))
    .filter(Boolean);

  if (comparedPlaces.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'compare-empty';
    empty.textContent = 'Select up to 3 places using "+ Compare" in the directory or details drawer to compare them side-by-side.';
    dom.comparisonGrid.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const place of comparedPlaces) {
    const col = document.createElement('article');
    col.className = 'compare-col';

    const head = document.createElement('div');
    head.className = 'compare-col-head';

    const titleWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = place.displayName?.text || 'Place';
    titleWrap.append(createCategoryPill(resolveCategory(place)), title);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'icon-btn';
    removeBtn.setAttribute('aria-label', `Remove ${title.textContent} from comparison`);
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      state.compareIds = state.compareIds.filter((id) => id !== place.id);
      renderDirectoryList();
      renderComparisonPanel();
    });

    head.append(titleWrap, removeBtn);

    const ratingRow = document.createElement('div');
    ratingRow.className = 'compare-row';
    const rLabel = document.createElement('strong');
    rLabel.textContent = 'Rating & Volume';
    const rVal = document.createElement('span');
    rVal.textContent =
      typeof place.rating === 'number'
        ? `★ ${place.rating.toFixed(1)} (${(place.userRatingCount || 0).toLocaleString()} reviews)`
        : 'No ratings available';
    ratingRow.append(rLabel, rVal);

    const priceRow = document.createElement('div');
    priceRow.className = 'compare-row';
    const pLabel = document.createElement('strong');
    pLabel.textContent = 'Price Level';
    const pVal = document.createElement('span');
    pVal.textContent = formatPriceLevel(place.priceLevel) || 'Not specified';
    priceRow.append(pLabel, pVal);

    const hoursRow = document.createElement('div');
    hoursRow.className = 'compare-row';
    const hLabel = document.createElement('strong');
    hLabel.textContent = "Today's Hours";
    const hVal = document.createElement('span');
    hVal.textContent = getTodayHoursText(place);
    hoursRow.append(hLabel, hVal);

    const addrRow = document.createElement('div');
    addrRow.className = 'compare-row';
    const aLabel = document.createElement('strong');
    aLabel.textContent = 'Address';
    const aVal = document.createElement('span');
    aVal.textContent = place.formattedAddress || 'Central London';
    addrRow.append(aLabel, aVal);

    const reviewRow = document.createElement('div');
    reviewRow.className = 'compare-row';
    const revLabel = document.createElement('strong');
    revLabel.textContent = 'Highlighted Review';
    const revVal = document.createElement('span');
    const firstReview = Array.isArray(place.reviews) ? place.reviews[0] : null;
    if (firstReview?.text?.text) {
      const snippet = firstReview.text.text.slice(0, 140);
      revVal.textContent = `"${snippet}${firstReview.text.text.length > 140 ? '…' : ''}"`;
    } else {
      revVal.textContent = 'Click Inspect to load live reviews.';
    }
    reviewRow.append(revLabel, revVal);

    const inspectBtn = document.createElement('button');
    inspectBtn.type = 'button';
    inspectBtn.className = 'btn btn-sm btn-outline';
    inspectBtn.textContent = 'Open Full Details';
    inspectBtn.addEventListener('click', () => {
      void inspectPlace(place.id);
    });

    col.append(head, ratingRow, priceRow, hoursRow, addrRow, reviewRow, inspectBtn);
    fragment.append(col);
  }

  dom.comparisonGrid.replaceChildren(fragment);
}

async function toggleComparePlace(placeId) {
  if (state.compareIds.includes(placeId)) {
    state.compareIds = state.compareIds.filter((id) => id !== placeId);
  } else {
    if (state.compareIds.length >= 3) {
      showStatus('Comparison supports up to 3 places at a time. Remove one to add another.');
      dom.comparisonPanel.classList.remove('hidden');
      return;
    }
    state.compareIds.push(placeId);
    dom.comparisonPanel.classList.remove('hidden');
    if (!state.detailsCache.has(placeId)) {
      try {
        await fetchPlaceDetails(placeId);
      } catch {
        // Summary fields still render cleanly if details call fails
      }
    }
  }

  renderDirectoryList();
  renderComparisonPanel();
}

function renderPlaceDetailsDrawer(place, isLoadingDetails = false) {
  dom.drawer.classList.remove('hidden');
  dom.reverseInspector.classList.add('hidden');
  dom.placeDetailsView.classList.remove('hidden');
  dom.drawerModeBadge.textContent = 'Place Details';

  const category = resolveCategory(place);
  const meta = CATEGORY_META[category] || CATEGORY_META.restaurant;
  dom.drawerCategoryPill.className = `category-pill ${meta.className}`;
  dom.drawerCategoryPill.textContent = place.primaryTypeDisplayName?.text || meta.label;
  dom.drawerPlaceTitle.textContent = place.displayName?.text || 'Place';
  dom.drawerAddress.textContent = place.formattedAddress || 'Central London';

  // Photo
  const firstPhoto = Array.isArray(place.photos) && place.photos.length > 0 ? place.photos[0] : null;
  if (firstPhoto?.name) {
    dom.drawerPhoto.src = `/api/places/photo?name=${encodeURIComponent(firstPhoto.name)}&maxWidthPx=720`;
    dom.drawerPhoto.alt = place.displayName?.text || 'Place photo';
    dom.drawerPhotoWrap.classList.remove('hidden');
    const authorName = firstPhoto.authorAttributions?.[0]?.displayName;
    if (authorName) {
      dom.drawerPhotoAttr.textContent = `Photo attribution: ${authorName}`;
      dom.drawerPhotoAttr.classList.remove('hidden');
    } else {
      dom.drawerPhotoAttr.classList.add('hidden');
    }
  } else {
    dom.drawerPhotoWrap.classList.add('hidden');
    dom.drawerPhoto.removeAttribute('src');
  }

  // Rating / Price / Open Now
  const ratingNodes = [];
  const ratingBadge = document.createElement('span');
  ratingBadge.className = 'rating-chip';
  ratingBadge.textContent =
    typeof place.rating === 'number'
      ? `★ ${place.rating.toFixed(1)} (${(place.userRatingCount || 0).toLocaleString()} reviews)`
      : 'No ratings yet';
  ratingNodes.push(ratingBadge);

  const price = formatPriceLevel(place.priceLevel);
  if (price) {
    const priceBadge = document.createElement('span');
    priceBadge.className = 'price-chip';
    priceBadge.textContent = price;
    ratingNodes.push(priceBadge);
  }

  if (typeof place.regularOpeningHours?.openNow === 'boolean') {
    const openBadge = document.createElement('span');
    openBadge.className = `open-badge ${place.regularOpeningHours.openNow ? 'is-open' : 'is-closed'}`;
    openBadge.textContent = place.regularOpeningHours.openNow ? 'Open now' : 'Closed now';
    ratingNodes.push(openBadge);
  }
  dom.drawerRatingRow.replaceChildren(...ratingNodes);

  // Google Maps Link
  if (place.googleMapsUri) {
    dom.drawerMapsLink.href = place.googleMapsUri;
    dom.drawerMapsLink.classList.remove('hidden');
  } else {
    dom.drawerMapsLink.classList.add('hidden');
  }

  updateCompareHeaderButton();

  // Contact items
  const contactNodes = [];
  if (place.internationalPhoneNumber) {
    const phone = document.createElement('span');
    phone.textContent = `Phone: ${place.internationalPhoneNumber}`;
    contactNodes.push(phone);
  }
  if (place.websiteUri) {
    const link = document.createElement('a');
    link.href = place.websiteUri;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = place.websiteUri;
    contactNodes.push(link);
  }
  if (contactNodes.length > 0) {
    dom.drawerContactItems.replaceChildren(...contactNodes);
    dom.drawerContactBlock.classList.remove('hidden');
  } else {
    dom.drawerContactBlock.classList.add('hidden');
  }

  // Weekly Opening Hours (from weekdayDescriptions — weekly-channel safe)
  const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions;
  if (Array.isArray(weekdayDescriptions) && weekdayDescriptions.length > 0) {
    const todayIdx = getLondonTodayIndex();
    const items = weekdayDescriptions.map((line, index) => {
      const li = document.createElement('li');
      if (index === todayIdx) li.className = 'today';
      li.textContent = line;
      return li;
    });
    dom.drawerHoursList.replaceChildren(...items);
  } else {
    const li = document.createElement('li');
    li.textContent = isLoadingDetails ? 'Loading opening hours...' : 'Opening hours not published by Google Places.';
    dom.drawerHoursList.replaceChildren(li);
  }

  // Reviews
  const reviews = Array.isArray(place.reviews) ? place.reviews : [];
  if (reviews.length > 0) {
    const reviewCards = reviews.slice(0, 5).map((rev) => {
      const card = document.createElement('div');
      card.className = 'review-card';

      const head = document.createElement('div');
      head.className = 'review-head';

      const author = document.createElement('span');
      const authorName = rev.authorAttribution?.displayName || 'Google Maps User';
      const starStr = typeof rev.rating === 'number' ? ` · ★ ${rev.rating}` : '';
      author.textContent = `${authorName}${starStr}`;

      const time = document.createElement('span');
      time.className = 'review-time';
      time.textContent = rev.relativePublishTimeDescription || '';

      head.append(author, time);

      const text = document.createElement('p');
      text.className = 'review-text';
      text.textContent = rev.text?.text || rev.originalText?.text || 'Rating submitted without text comment.';

      card.append(head, text);
      return card;
    });
    dom.drawerReviewsList.replaceChildren(...reviewCards);
  } else {
    const emptyRev = document.createElement('p');
    emptyRev.className = 'review-text';
    emptyRev.textContent = isLoadingDetails ? 'Fetching live customer reviews...' : 'No written reviews returned for this place.';
    dom.drawerReviewsList.replaceChildren(emptyRev);
  }
}

async function inspectPlace(placeId) {
  state.selectedPlaceId = placeId;
  const summary = state.detailsCache.get(placeId) || state.places.find((p) => p.id === placeId);
  if (!summary) return;

  if (state.map && summary.location) {
    state.map.panTo({ lat: summary.location.latitude, lng: summary.location.longitude });
  }

  renderMarkers();
  renderDirectoryList();
  renderPlaceDetailsDrawer(summary, !state.detailsCache.has(placeId));

  if (!state.detailsCache.has(placeId)) {
    try {
      const detailed = await fetchPlaceDetails(placeId);
      if (state.selectedPlaceId === placeId && detailed) {
        renderPlaceDetailsDrawer(detailed, false);
        renderComparisonPanel();
      }
    } catch (err) {
      showStatus(err.message || 'Unable to load full place details.', true);
    }
  }
}

function openReverseGeocodeView({ lat, lng, formatted_address, place_id, plus_code }) {
  state.selectedPlaceId = null;
  renderMarkers();
  renderDirectoryList();

  dom.drawer.classList.remove('hidden');
  dom.placeDetailsView.classList.add('hidden');
  dom.reverseInspector.classList.remove('hidden');
  dom.drawerModeBadge.textContent = 'Reverse Geocode';

  dom.rgFormattedAddress.textContent = formatted_address;
  dom.rgCoordinates.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  dom.rgPlaceId.textContent = place_id || 'Unavailable';

  const plusText = plus_code?.compound_code || plus_code?.global_code || '';
  if (plusText) {
    dom.rgPlusCode.textContent = plusText;
    dom.rgPlusCodeWrap.classList.remove('hidden');
  } else {
    dom.rgPlusCodeWrap.classList.add('hidden');
  }

  state.pendingReverseGeocode = {
    lat,
    lng,
    address: formatted_address,
    placeId: place_id || '',
    plusCode: plus_code || null,
  };
}

async function handleMapClick(lat, lng) {
  if (state.map && state.markerClasses) {
    const { AdvancedMarkerElement, PinElement } = state.markerClasses;
    if (state.tempMarker) {
      state.tempMarker.map = null;
    }
    const pin = new PinElement({
      background: '#0f172a',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: '?',
      scale: 1.1,
    });
    state.tempMarker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat, lng },
      title: 'Clicked map location',
      content: pin,
      zIndex: 60,
    });
  }

  openReverseGeocodeView({
    lat,
    lng,
    formatted_address: 'Resolving street address via Geocoding API...',
    place_id: 'Loading...',
    plus_code: null,
  });

  try {
    const response = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Reverse geocoding failed.');
    }

    const first = Array.isArray(payload.results) && payload.results.length > 0 ? payload.results[0] : null;
    openReverseGeocodeView({
      lat,
      lng,
      formatted_address: first?.formatted_address || `Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      place_id: first?.place_id || 'No Place ID',
      plus_code: first?.plus_code || null,
    });
  } catch (err) {
    openReverseGeocodeView({
      lat,
      lng,
      formatted_address: `Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)}) — address lookup unavailable`,
      place_id: 'Unavailable',
      plus_code: null,
    });
    showStatus(err.message || 'Reverse geocoding error.', true);
  }
}

async function moveSearchCenter({ lat, lng, name, zoom = 13 }) {
  state.center = { lat, lng };
  state.neighborhoodName = name;
  state.loadedCategoriesForCenter.clear();
  state.activeTextQuery = '';
  dom.textSearchInput.value = '';
  dom.textSearchClear.classList.add('hidden');
  updateCenterDisplay();

  if (state.map) {
    state.map.panTo(state.center);
    state.map.setZoom(zoom);
  }
  if (state.radiusCircle) {
    state.radiusCircle.setCenter(state.center);
  }
  if (state.autocompleteEl) {
    state.autocompleteEl.locationBias = { center: state.center, radius: state.radiusMeters };
  }

  dom.resultsCountLabel.textContent = 'Loading places...';
  const categories = state.activeCategory === 'all' ? ['restaurant', 'cafe', 'museum', 'park'] : [state.activeCategory];
  try {
    await fetchNearbyPlaces({ categories, replaceExisting: true });
    hideStatus();
  } catch (err) {
    showStatus(err.message || 'Failed to refresh neighborhood places.', true);
  }
  renderMarkers();
  renderDirectoryList();
}

async function handleAddressGeocodeClick() {
  const autoValue = typeof state.autocompleteEl?.value === 'string' ? state.autocompleteEl.value.trim() : '';
  const sidebarText = dom.textSearchInput.value.trim();
  const query = autoValue || sidebarText || `${state.neighborhoodName}, London, UK`;

  try {
    showStatus(`Geocoding "${query}"...`);
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Address geocoding failed.');
    }

    const first = Array.isArray(payload.results) && payload.results.length > 0 ? payload.results[0] : null;
    if (!first?.geometry?.location) {
      showStatus(`No coordinates found for "${query}". Try a London street or neighborhood.`, true);
      return;
    }

    const { lat, lng } = first.geometry.location;
    await moveSearchCenter({
      lat,
      lng,
      name: first.formatted_address.split(',')[0] || query,
      zoom: 14,
    });
    hideStatus();
  } catch (err) {
    showStatus(err.message || 'Geocoding failed.', true);
  }
}

function bindStaticEventListeners() {
  dom.presetSelect.addEventListener('change', (e) => {
    const preset = NEIGHBORHOOD_PRESETS[e.target.value];
    if (preset) {
      void moveSearchCenter({ lat: preset.lat, lng: preset.lng, name: preset.name, zoom: preset.zoom });
    }
  });

  dom.geocodeBtn.addEventListener('click', () => {
    void handleAddressGeocodeClick();
  });

  dom.radiusToggleBtn.addEventListener('click', () => {
    state.showRadius = !state.showRadius;
    dom.radiusToggleBtn.classList.toggle('active', state.showRadius);
    dom.radiusToggleBtn.setAttribute('aria-pressed', String(state.showRadius));
    dom.radiusToggleBtn.textContent = `5km Radius: ${state.showRadius ? 'On' : 'Off'}`;
    if (state.radiusCircle) {
      state.radiusCircle.setMap(state.showRadius ? state.map : null);
    }
  });

  dom.pinSpotBtn.addEventListener('click', () => {
    if (!dom.reverseInspector.classList.contains('hidden')) {
      dom.communitySpotNameInput.focus();
      return;
    }
    showStatus('Click anywhere on the map to reverse-geocode its street address and pin a Community Spot.');
  });

  dom.toggleCompareBtn.addEventListener('click', () => {
    dom.comparisonPanel.classList.toggle('hidden');
    renderComparisonPanel();
  });

  dom.closeComparisonBtn.addEventListener('click', () => {
    dom.comparisonPanel.classList.add('hidden');
  });

  dom.clearComparisonBtn.addEventListener('click', () => {
    state.compareIds = [];
    renderDirectoryList();
    renderComparisonPanel();
  });

  dom.closeDrawerBtn.addEventListener('click', () => {
    dom.drawer.classList.add('hidden');
    state.selectedPlaceId = null;
    if (state.tempMarker) {
      state.tempMarker.map = null;
      state.tempMarker = null;
    }
    renderMarkers();
    renderDirectoryList();
  });

  dom.drawerCompareBtn.addEventListener('click', () => {
    if (state.selectedPlaceId) {
      void toggleComparePlace(state.selectedPlaceId);
    }
  });

  for (const chip of dom.categoryChips) {
    chip.addEventListener('click', async () => {
      const cat = chip.dataset.category || 'all';
      state.activeCategory = cat;
      for (const btn of dom.categoryChips) {
        btn.classList.toggle('chip-active', btn === chip);
      }

      renderMarkers();
      renderDirectoryList();

      if (cat !== 'all' && !state.loadedCategoriesForCenter.has(cat) && !state.activeTextQuery) {
        try {
          await fetchNearbyPlaces({ categories: [cat], replaceExisting: false });
          renderMarkers();
          renderDirectoryList();
        } catch (err) {
          showStatus(err.message || `Failed to load ${cat} places.`, true);
        }
      }
    });
  }

  dom.textSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = dom.textSearchInput.value.trim();
    if (!q) return;

    state.activeTextQuery = q;
    dom.textSearchClear.classList.remove('hidden');
    dom.resultsCountLabel.textContent = 'Searching...';

    try {
      await fetchTextSearchPlaces(q);
      hideStatus();
      renderMarkers();
      renderDirectoryList();
    } catch (err) {
      showStatus(err.message || 'Text search failed.', true);
    }
  });

  dom.textSearchClear.addEventListener('click', () => {
    void moveSearchCenter({
      lat: state.center.lat,
      lng: state.center.lng,
      name: state.neighborhoodName,
      zoom: state.map ? state.map.getZoom() : 13,
    });
  });

  dom.communitySpotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.pendingReverseGeocode) return;

    const name = dom.communitySpotNameInput.value.trim();
    if (!name) return;

    const spot = {
      id: `community-${Date.now()}`,
      name,
      category: dom.communitySpotCategorySelect.value || 'community',
      note: dom.communitySpotNoteInput.value.trim(),
      lat: state.pendingReverseGeocode.lat,
      lng: state.pendingReverseGeocode.lng,
      address: state.pendingReverseGeocode.address,
      placeId: state.pendingReverseGeocode.placeId,
      plusCode: state.pendingReverseGeocode.plusCode,
    };

    state.communitySpots.unshift(spot);
    dom.communitySpotNameInput.value = '';
    dom.communitySpotNoteInput.value = '';
    if (state.tempMarker) {
      state.tempMarker.map = null;
      state.tempMarker = null;
    }

    renderCommunityMarkers();
    renderCommunitySpotsList();
    showStatus(`Pinned "${spot.name}" to Community Spots (session).`);
  });
}

async function initApp() {
  bindStaticEventListeners();
  updateCenterDisplay();
  renderCommunitySpotsList();
  renderComparisonPanel();

  let config;
  try {
    const configRes = await fetch('/api/config');
    config = await configRes.json();
  } catch (err) {
    showStatus('Failed to connect to the Node.js Express backend.', true);
    return;
  }

  if (!config?.apiKey) {
    showStatus(
      'GOOGLE_MAPS_API_KEY is missing in .env. Copy .env.example to .env and add a Maps Demo Key or Cloud API key to load the map and live places.',
      true
    );
    dom.resultsCountLabel.textContent = 'API key required';
    return;
  }

  try {
    loadMapsBootstrap({
      key: config.apiKey,
      v: 'weekly',
      language: 'en',
      region: 'GB',
    });

    const [{ Map, Circle }, markerLib, placesLib] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker'),
      google.maps.importLibrary('places'),
    ]);

    state.markerClasses = markerLib;
    state.placesClasses = placesLib;

    state.map = new Map(dom.mapCanvas, {
      center: state.center,
      zoom: config.defaultZoom || 13,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
    });

    state.radiusCircle = new Circle({
      strokeColor: '#1a73e8',
      strokeOpacity: 0.75,
      strokeWeight: 2,
      fillColor: '#1a73e8',
      fillOpacity: 0.08,
      map: state.showRadius ? state.map : null,
      center: state.center,
      radius: state.radiusMeters,
      clickable: false,
    });

    state.map.addListener('click', (event) => {
      if (!event?.latLng) return;
      void handleMapClick(event.latLng.lat(), event.latLng.lng());
    });

    // Mount Places API (New) PlaceAutocompleteElement
    const { PlaceAutocompleteElement } = placesLib;
    const autocompleteEl = new PlaceAutocompleteElement({
      locationBias: { center: state.center, radius: state.radiusMeters },
      includedRegionCodes: ['gb'],
      requestedLanguage: 'en',
      requestedRegion: 'GB',
    });
    autocompleteEl.id = 'gmp-neighborhood-autocomplete';
    autocompleteEl.setAttribute('aria-label', 'Search London address or neighborhood');

    autocompleteEl.addEventListener('gmp-select', async (event) => {
      try {
        const prediction = event?.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
        if (!place.location) return;
        await moveSearchCenter({
          lat: place.location.lat(),
          lng: place.location.lng(),
          name: place.displayName || place.formattedAddress || 'Selected Location',
          zoom: 14,
        });
      } catch (err) {
        showStatus(err.message || 'Unable to resolve selected place.', true);
      }
    });

    autocompleteEl.addEventListener('gmp-error', () => {
      showStatus('Place Autocomplete could not complete the request. You can still use Geocode or neighborhood presets.', true);
    });

    state.autocompleteEl = autocompleteEl;
    dom.autocompleteContainer.replaceChildren(autocompleteEl);

    // Seed Central London discovery on load
    await fetchNearbyPlaces({
      categories: ['restaurant', 'cafe', 'museum', 'park'],
      replaceExisting: true,
    });
    renderMarkers();
    renderDirectoryList();
  } catch (err) {
    console.error('Initialization error:', err);
    showStatus(err.message || 'Failed to initialize Google Maps Platform libraries.', true);
  }
}

void initApp();
