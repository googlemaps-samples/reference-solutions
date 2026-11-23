import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const RADIUS_METERS = 5000;
const MAX_COMPARE_ITEMS = 3;
const CORE_CATEGORIES = ['restaurant', 'cafe', 'museum', 'park'];

const NEIGHBORHOOD_PRESETS = {
  'covent-garden': {
    label: 'Covent Garden',
    center: { lat: 51.5118, lng: -0.128 },
  },
  soho: {
    label: 'Soho',
    center: { lat: 51.5136, lng: -0.1365 },
  },
  'south-bank': {
    label: 'South Bank',
    center: { lat: 51.5055, lng: -0.114 },
  },
  bloomsbury: {
    label: 'Bloomsbury',
    center: { lat: 51.5229, lng: -0.1263 },
  },
};

const CATEGORY_META = {
  restaurant: {
    label: 'Restaurant',
    plural: 'Restaurants',
    glyphText: 'R',
    background: '#D93025',
    borderColor: '#A50E0E',
    glyphColor: '#FFFFFF',
  },
  cafe: {
    label: 'Cafe',
    plural: 'Cafes',
    glyphText: 'C',
    background: '#E37400',
    borderColor: '#B06000',
    glyphColor: '#FFFFFF',
  },
  museum: {
    label: 'Museum',
    plural: 'Museums',
    glyphText: 'M',
    background: '#7B1FA2',
    borderColor: '#4A148C',
    glyphColor: '#FFFFFF',
  },
  park: {
    label: 'Park',
    plural: 'Parks',
    glyphText: 'P',
    background: '#1E8E3E',
    borderColor: '#137333',
    glyphColor: '#FFFFFF',
  },
  community: {
    label: 'Community Spot',
    plural: 'Community Spots',
    glyphText: '★',
    background: '#1A73E8',
    borderColor: '#174EA6',
    glyphColor: '#FFFFFF',
  },
};

const SEARCH_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'primaryTypeDisplayName',
  'types',
  'rating',
  'userRatingCount',
  'priceLevel',
  'regularOpeningHours',
  'photos',
  'googleMapsURI',
];

const DETAIL_FIELDS = [
  ...SEARCH_FIELDS,
  'reviews',
  'websiteURI',
  'internationalPhoneNumber',
];

const state = {
  activeCenter: { ...NEIGHBORHOOD_PRESETS['covent-garden'].center },
  activeNeighborhoodLabel: NEIGHBORHOOD_PRESETS['covent-garden'].label,
  activeCategory: 'all',
  radiusVisible: true,
  placesById: new Map(),
  orderedPlaceIds: [],
  selectedPlaceId: null,
  comparisonIds: [],
  comparisonOpen: false,
  communitySpots: [],
  reverseGeocodeTarget: null,
  isMapsReady: false,
  searchGeneration: 0,
};

const gmp = {
  map: null,
  circle: null,
  infoWindow: null,
  geocoder: null,
  autocompleteEl: null,
  fallbackInputEl: null,
  placeMarkers: new Map(),
  communityMarkers: new Map(),
  inspectorMarker: null,
  classes: null,
};

// Safe DOM helpers (no innerHTML / outerHTML / insertAdjacentHTML)
function el(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.type) node.type = options.type;
  if (options.text != null) node.textContent = String(options.text);
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      if (v != null) node.setAttribute(k, String(v));
    }
  }
  if (options.onClick) {
    node.addEventListener('click', options.onClick);
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(
      typeof child === 'string' ? document.createTextNode(child) : child
    );
  }
  return node;
}

function getEl(id) {
  return document.getElementById(id);
}

function toLatLngLiteral(loc) {
  if (!loc) return null;
  if (typeof loc.lat === 'function' && typeof loc.lng === 'function') {
    return { lat: loc.lat(), lng: loc.lng() };
  }
  return { lat: Number(loc.lat), lng: Number(loc.lng) };
}

function resolvePlaceCategory(place) {
  const candidates = [place.primaryType, ...(place.types || [])].filter(Boolean);
  for (const cat of CORE_CATEGORIES) {
    if (candidates.includes(cat)) return cat;
  }
  if (candidates.some((t) => t.includes('restaurant') || t.includes('food'))) {
    return 'restaurant';
  }
  if (candidates.some((t) => t.includes('cafe') || t.includes('coffee'))) {
    return 'cafe';
  }
  if (candidates.some((t) => t.includes('museum') || t.includes('gallery'))) {
    return 'museum';
  }
  if (candidates.some((t) => t.includes('park') || t.includes('garden'))) {
    return 'park';
  }
  return 'restaurant';
}

function formatPriceLevel(priceLevel) {
  if (!priceLevel && priceLevel !== 0) return 'Price N/A';
  const normalized = String(priceLevel).toUpperCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'FREE':
    case '0':
      return 'Free';
    case 'INEXPENSIVE':
    case '1':
      return '£ · Inexpensive';
    case 'MODERATE':
    case '2':
      return '££ · Moderate';
    case 'EXPENSIVE':
    case '3':
      return '£££ · Expensive';
    case 'VERY_EXPENSIVE':
    case '4':
      return '££££ · Very Expensive';
    default:
      return String(priceLevel);
  }
}

function formatTodayHours(regularOpeningHours) {
  const descriptions = regularOpeningHours?.weekdayDescriptions;
  if (!Array.isArray(descriptions) || descriptions.length === 0) {
    return 'Hours not listed';
  }
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const todayName = dayNames[new Date().getDay()];
  const match = descriptions.find((line) => line.startsWith(todayName));
  return match || descriptions[0];
}

function showBanner(message, isError = false, demoLink = false) {
  const banner = getEl('config-banner');
  if (!banner) return;
  banner.classList.remove('hidden', 'error');
  if (isError) banner.classList.add('error');

  const nodes = [document.createTextNode(message)];
  if (demoLink) {
    nodes.push(document.createTextNode(' '));
    nodes.push(
      el('a', {
        text: 'Get a free Maps Demo Key',
        attrs: {
          href: 'https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      })
    );
  }
  banner.replaceChildren(...nodes);
}

function hideBanner() {
  const banner = getEl('config-banner');
  if (banner) {
    banner.classList.add('hidden');
    banner.replaceChildren();
  }
}

function updateStatusBar(messageOverride) {
  const hoodEl = getEl('status-neighborhood');
  const countEl = getEl('status-count');
  if (hoodEl) hoodEl.textContent = state.activeNeighborhoodLabel;
  if (countEl) {
    if (messageOverride) {
      countEl.textContent = messageOverride;
    } else {
      const visible = getFilteredPlaces();
      countEl.textContent = `${visible.length} place${visible.length === 1 ? '' : 's'} within 5 km`;
    }
  }
}

function getFilteredPlaces() {
  const list = [];
  for (const id of state.orderedPlaceIds) {
    const entry = state.placesById.get(id);
    if (!entry) continue;
    if (
      state.activeCategory === 'all' ||
      entry.category === state.activeCategory
    ) {
      list.push(entry);
    }
  }
  return list;
}

function renderCategoryChips() {
  const categories = ['all', ...CORE_CATEGORIES];
  for (const cat of categories) {
    const btn = getEl(`category-filter-${cat}`);
    if (!btn) continue;
    const isActive = state.activeCategory === cat;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  }
}

function renderPlacesList() {
  const listEl = getEl('places-results-list');
  if (!listEl) return;

  const visiblePlaces = getFilteredPlaces();
  if (visiblePlaces.length === 0) {
    const emptyText = state.isMapsReady
      ? 'No matching places found in this 5 km radius. Try another category or neighborhood.'
      : 'Configure GOOGLE_MAPS_API_KEY in .env to load live Central London places.';
    listEl.replaceChildren(el('li', { className: 'empty-state', text: emptyText }));
    updateStatusBar();
    return;
  }

  const cards = visiblePlaces.map((entry) => {
    const meta = CATEGORY_META[entry.category] || CATEGORY_META.restaurant;
    const isComparing = state.comparisonIds.includes(entry.id);
    const isSelected = state.selectedPlaceId === entry.id;

    const ratingText =
      typeof entry.rating === 'number'
        ? `★ ${entry.rating.toFixed(1)} (${entry.userRatingCount ?? 0})`
        : 'No rating yet';

    const compareBtn = el('button', {
      type: 'button',
      className: `btn btn-outline btn-sm${isComparing ? ' is-comparing' : ''}`,
      text: isComparing ? 'Comparing ✓' : '+ Compare',
      onClick: (ev) => {
        ev.stopPropagation();
        toggleComparison(entry.id);
      },
    });

    const inspectBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-sm',
      text: 'Inspect',
      onClick: (ev) => {
        ev.stopPropagation();
        void inspectPlace(entry.id);
      },
    });

    const card = el(
      'li',
      {
        className: `place-card${isSelected ? ' selected' : ''}`,
        onClick: () => void inspectPlace(entry.id),
      },
      el(
        'div',
        { className: 'place-card-top' },
        el('h3', { className: 'place-name', text: entry.displayName }),
        el('span', {
          className: `category-badge ${entry.category}`,
          text: entry.primaryTypeDisplayName || meta.label,
        })
      ),
      el(
        'div',
        { className: 'place-meta-line' },
        el('span', { className: 'rating-pill', text: ratingText }),
        el('span', {
          className: 'price-badge',
          text: formatPriceLevel(entry.priceLevel),
        })
      ),
      el('div', {
        className: 'place-hours-line',
        text: formatTodayHours(entry.regularOpeningHours),
      }),
      el('div', {
        className: 'place-address-line',
        text: entry.formattedAddress || 'Central London',
      }),
      el('div', { className: 'place-card-actions' }, inspectBtn, compareBtn)
    );

    return card;
  });

  listEl.replaceChildren(...cards);
  updateStatusBar();
}

function renderCommunitySpots() {
  const listEl = getEl('community-spots-list');
  const countEl = getEl('community-spots-count');
  if (countEl) countEl.textContent = String(state.communitySpots.length);
  if (!listEl) return;

  if (state.communitySpots.length === 0) {
    listEl.replaceChildren(
      el('li', {
        className: 'empty-state',
        text: 'No community spots pinned in this session yet.',
      })
    );
    return;
  }

  const items = state.communitySpots.map((spot) => {
    const meta = CATEGORY_META[spot.category] || CATEGORY_META.community;
    return el(
      'li',
      {
        className: 'community-card',
        onClick: () => focusCommunitySpot(spot),
      },
      el(
        'div',
        { className: 'place-card-top' },
        el('strong', { text: spot.name }),
        el('span', { className: `category-badge ${spot.category}`, text: meta.label })
      ),
      spot.note ? el('p', { className: 'community-card-note', text: spot.note }) : null,
      el('div', {
        className: 'place-address-line',
        text: `${spot.address} (${spot.coords.lat.toFixed(5)}, ${spot.coords.lng.toFixed(5)})`,
      })
    );
  });

  listEl.replaceChildren(...items);
}

function syncMapMarkers() {
  if (!gmp.map || !gmp.classes) return;
  const { AdvancedMarkerElement, PinElement } = gmp.classes;
  const visibleIds = new Set(getFilteredPlaces().map((p) => p.id));

  for (const [id, marker] of gmp.placeMarkers.entries()) {
    marker.map = visibleIds.has(id) ? gmp.map : null;
  }

  for (const entry of state.placesById.values()) {
    if (!entry.location) continue;
    if (gmp.placeMarkers.has(entry.id)) continue;

    const meta = CATEGORY_META[entry.category] || CATEGORY_META.restaurant;
    const pin = new PinElement({
      background: meta.background,
      borderColor: meta.borderColor,
      glyphColor: meta.glyphColor,
      glyphText: meta.glyphText,
    });

    const marker = new AdvancedMarkerElement({
      map: visibleIds.has(entry.id) ? gmp.map : null,
      position: entry.location,
      title: entry.displayName,
      content: pin,
    });

    // Weekly-channel safe standard click listener
    marker.addListener('click', () => {
      void inspectPlace(entry.id);
    });

    gmp.placeMarkers.set(entry.id, marker);
  }
}

function openInfoWindowForPlace(entry, marker) {
  if (!gmp.infoWindow || !gmp.map || !entry.location) return;
  const box = el(
    'div',
    { className: 'iw-box' },
    el('div', { className: 'iw-title', text: entry.displayName }),
    el('div', {
      className: 'iw-sub',
      text: `${
        typeof entry.rating === 'number' ? `★ ${entry.rating.toFixed(1)} · ` : ''
      }${entry.formattedAddress || ''}`,
    })
  );
  gmp.infoWindow.setContent(box);
  if (marker) {
    gmp.infoWindow.open({ map: gmp.map, anchor: marker });
  } else {
    gmp.infoWindow.setPosition(entry.location);
    gmp.infoWindow.open({ map: gmp.map });
  }
}

async function inspectPlace(placeId) {
  const entry = state.placesById.get(placeId);
  if (!entry) return;

  state.selectedPlaceId = placeId;
  renderPlacesList();

  if (gmp.map && entry.location) {
    gmp.map.panTo(entry.location);
  }
  const marker = gmp.placeMarkers.get(placeId);
  openInfoWindowForPlace(entry, marker);

  // Fetch rich fields (reviews, full hours, phone, website) on demand
  if (!entry.detailsLoaded && entry.placeRef) {
    try {
      await entry.placeRef.fetchFields({ fields: DETAIL_FIELDS });
      hydratePlaceEntry(entry, entry.placeRef);
      entry.detailsLoaded = true;
      renderPlacesList();
      if (state.comparisonIds.includes(placeId)) {
        renderComparisonPanel();
      }
    } catch (err) {
      showBanner(
        `Could not load full details for ${entry.displayName}: ${err.message}`,
        true
      );
    }
  }

  renderPlaceDetailsDrawer(entry);
}

function renderPlaceDetailsDrawer(entry) {
  const drawer = getEl('place-details-drawer');
  const detailsView = getEl('place-details-view');
  const inspectorView = getEl('reverse-geocode-inspector');
  const titleEl = getEl('drawer-title');

  if (!drawer || !detailsView || !inspectorView || !titleEl) return;

  titleEl.textContent = entry.displayName;
  detailsView.classList.remove('hidden');
  inspectorView.classList.add('hidden');
  drawer.classList.remove('hidden');

  // Photos
  const photosEl = getEl('drawer-photos');
  if (photosEl) {
    const photoCards = (entry.photos || []).slice(0, 4).map((photo) => {
      const uri = photo.getURI({ maxWidth: 480, maxHeight: 320 });
      const attr = photo.authorAttributions?.[0];
      return el(
        'figure',
        { className: 'drawer-photo-item' },
        el('img', {
          attrs: {
            src: uri,
            alt: `Photo of ${entry.displayName}`,
            loading: 'lazy',
          },
        }),
        attr?.displayName
          ? el('figcaption', {
              className: 'drawer-photo-credit',
              text: `Photo: ${attr.displayName}`,
            })
          : null
      );
    });
    photosEl.replaceChildren(...photoCards);
    photosEl.classList.toggle('hidden', photoCards.length === 0);
  }

  // Badges & Rating
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.restaurant;
  const catBadge = getEl('drawer-category-badge');
  if (catBadge) {
    catBadge.className = `category-badge ${entry.category}`;
    catBadge.textContent = entry.primaryTypeDisplayName || meta.label;
  }

  const priceBadge = getEl('drawer-price-badge');
  if (priceBadge) {
    priceBadge.textContent = formatPriceLevel(entry.priceLevel);
  }

  const ratingRow = getEl('drawer-rating-row');
  if (ratingRow) {
    ratingRow.textContent =
      typeof entry.rating === 'number'
        ? `★ ${entry.rating.toFixed(1)} · ${entry.userRatingCount ?? 0} Google reviews`
        : 'No Google ratings yet';
  }

  const addrEl = getEl('drawer-address');
  if (addrEl) {
    addrEl.textContent = entry.formattedAddress || 'Address unavailable';
  }

  // Contact & Google Maps ToS attribution link
  const linksEl = getEl('drawer-contact-links');
  if (linksEl) {
    const links = [];
    if (entry.googleMapsURI) {
      links.push(
        el('a', {
          text: 'View on Google Maps',
          attrs: {
            href: entry.googleMapsURI,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        })
      );
    }
    if (entry.websiteURI) {
      links.push(
        el('a', {
          text: 'Official Website',
          attrs: {
            href: entry.websiteURI,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        })
      );
    }
    if (entry.internationalPhoneNumber) {
      links.push(
        el('span', {
          text: entry.internationalPhoneNumber,
        })
      );
    }
    linksEl.replaceChildren(...links);
  }

  // Drawer Compare button
  const compareBtn = getEl('drawer-compare-button');
  if (compareBtn) {
    const isComparing = state.comparisonIds.includes(entry.id);
    compareBtn.textContent = isComparing ? 'Remove from Compare' : 'Add to Compare';
    compareBtn.onclick = () => {
      toggleComparison(entry.id);
      renderPlaceDetailsDrawer(entry);
    };
  }

  // Pin as Community Spot button
  const pinBtn = getEl('pin-community-spot-button');
  if (pinBtn) {
    pinBtn.onclick = () => {
      if (!entry.location) return;
      openReverseGeocodeInspector(
        {
          coords: entry.location,
          address: entry.formattedAddress || entry.displayName,
          placeId: entry.id,
          suggestedName: entry.displayName,
          suggestedCategory: entry.category,
        },
        false
      );
    };
  }

  // Weekly Opening Hours (weekly channel safe)
  const hoursEl = getEl('drawer-hours-list');
  if (hoursEl) {
    const descriptions = entry.regularOpeningHours?.weekdayDescriptions || [];
    if (descriptions.length === 0) {
      hoursEl.replaceChildren(el('li', { text: 'Opening hours not provided.' }));
    } else {
      hoursEl.replaceChildren(
        ...descriptions.map((line) => el('li', { text: line }))
      );
    }
  }

  // Reviews
  const reviewsEl = getEl('drawer-reviews-list');
  if (reviewsEl) {
    const reviews = entry.reviews || [];
    if (reviews.length === 0) {
      reviewsEl.replaceChildren(
        el('p', { className: 'section-hint', text: 'No customer reviews returned.' })
      );
    } else {
      const reviewNodes = reviews.slice(0, 5).map((rev) => {
        const authorName = rev.authorAttribution?.displayName || 'Google User';
        const stars = typeof rev.rating === 'number' ? `★ ${rev.rating}` : '';
        const relTime = rev.relativePublishTimeDescription || '';
        const bodyText = rev.text || rev.originalText || '';

        return el(
          'article',
          { className: 'review-card' },
          el(
            'div',
            { className: 'review-header' },
            el('span', { className: 'review-author', text: authorName }),
            el('span', {
              className: 'review-meta',
              text: [stars, relTime].filter(Boolean).join(' · '),
            })
          ),
          el('p', { className: 'review-text', text: bodyText })
        );
      });
      reviewsEl.replaceChildren(...reviewNodes);
    }
  }
}

function openReverseGeocodeInspector(target, dropInspectorPin = true) {
  state.reverseGeocodeTarget = target;

  const drawer = getEl('place-details-drawer');
  const detailsView = getEl('place-details-view');
  const inspectorView = getEl('reverse-geocode-inspector');
  const titleEl = getEl('drawer-title');

  if (!drawer || !detailsView || !inspectorView || !titleEl) return;

  titleEl.textContent = 'Reverse-Geocode & Spot Pin';
  detailsView.classList.add('hidden');
  inspectorView.classList.remove('hidden');
  drawer.classList.remove('hidden');

  const addrEl = getEl('inspector-address');
  const coordsEl = getEl('inspector-coords');
  const placeIdEl = getEl('inspector-place-id');
  const nameInput = getEl('community-spot-name-input');
  const catSelect = getEl('community-spot-category-select');
  const noteInput = getEl('community-spot-note-input');

  if (addrEl) addrEl.textContent = target.address || 'Unknown street address';
  if (coordsEl) {
    coordsEl.textContent = `${target.coords.lat.toFixed(6)}, ${target.coords.lng.toFixed(6)}`;
  }
  if (placeIdEl) placeIdEl.textContent = target.placeId || 'N/A';

  if (nameInput) nameInput.value = target.suggestedName || '';
  if (catSelect) catSelect.value = target.suggestedCategory || 'community';
  if (noteInput) noteInput.value = '';

  if (dropInspectorPin && gmp.map && gmp.classes) {
    const { AdvancedMarkerElement, PinElement } = gmp.classes;
    if (!gmp.inspectorMarker) {
      const pin = new PinElement({
        background: '#0F172A',
        borderColor: '#38BDF8',
        glyphColor: '#FFFFFF',
        glyphText: '?',
      });
      gmp.inspectorMarker = new AdvancedMarkerElement({
        map: gmp.map,
        position: target.coords,
        title: target.address || 'Inspected Location',
        content: pin,
      });
    } else {
      gmp.inspectorMarker.position = target.coords;
      gmp.inspectorMarker.map = gmp.map;
    }

    if (gmp.infoWindow) {
      const box = el(
        'div',
        { className: 'iw-box' },
        el('div', { className: 'iw-title', text: target.address }),
        el('div', {
          className: 'iw-sub',
          text: `${target.coords.lat.toFixed(5)}, ${target.coords.lng.toFixed(5)}`,
        })
      );
      gmp.infoWindow.setContent(box);
      gmp.infoWindow.open({ map: gmp.map, anchor: gmp.inspectorMarker });
    }
  }
}

function saveCommunitySpotFromForm(event) {
  event.preventDefault();
  const target = state.reverseGeocodeTarget;
  if (!target) {
    showBanner('Click anywhere on the map first to select coordinates for your spot.', true);
    return;
  }

  const nameInput = getEl('community-spot-name-input');
  const catSelect = getEl('community-spot-category-select');
  const noteInput = getEl('community-spot-note-input');

  const name = (nameInput?.value || '').trim();
  if (!name) return;

  const category = catSelect?.value || 'community';
  const note = (noteInput?.value || '').trim();

  const spot = {
    id: `community-${Date.now()}`,
    name,
    category,
    note,
    address: target.address,
    placeId: target.placeId,
    coords: { ...target.coords },
  };

  state.communitySpots.unshift(spot);

  if (gmp.map && gmp.classes) {
    const { AdvancedMarkerElement, PinElement } = gmp.classes;
    const meta = CATEGORY_META[spot.category] || CATEGORY_META.community;
    const pin = new PinElement({
      background: '#1A73E8',
      borderColor: '#174EA6',
      glyphColor: '#FFFFFF',
      glyphText: '★',
    });
    const marker = new AdvancedMarkerElement({
      map: gmp.map,
      position: spot.coords,
      title: `${spot.name} (${meta.label})`,
      content: pin,
    });
    marker.addListener('click', () => focusCommunitySpot(spot));
    gmp.communityMarkers.set(spot.id, marker);
  }

  renderCommunitySpots();
  if (nameInput) nameInput.value = '';
  if (noteInput) noteInput.value = '';
  if (gmp.inspectorMarker) {
    gmp.inspectorMarker.map = null;
  }
  closeDrawer();
  focusCommunitySpot(spot);
}

function focusCommunitySpot(spot) {
  if (gmp.map) {
    gmp.map.panTo(spot.coords);
  }
  const marker = gmp.communityMarkers.get(spot.id);
  if (gmp.infoWindow && gmp.map) {
    const box = el(
      'div',
      { className: 'iw-box' },
      el('div', { className: 'iw-title', text: `★ ${spot.name}` }),
      el('div', {
        className: 'iw-sub',
        text: spot.note ? `${spot.note} — ${spot.address}` : spot.address,
      })
    );
    gmp.infoWindow.setContent(box);
    if (marker) {
      gmp.infoWindow.open({ map: gmp.map, anchor: marker });
    } else {
      gmp.infoWindow.setPosition(spot.coords);
      gmp.infoWindow.open({ map: gmp.map });
    }
  }
}

function closeDrawer() {
  const drawer = getEl('place-details-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function toggleComparison(placeId) {
  const idx = state.comparisonIds.indexOf(placeId);
  if (idx >= 0) {
    state.comparisonIds.splice(idx, 1);
  } else {
    if (state.comparisonIds.length >= MAX_COMPARE_ITEMS) {
      showBanner(
        `Comparison tray holds up to ${MAX_COMPARE_ITEMS} places. Remove one to add another.`,
        false
      );
      state.comparisonOpen = true;
      renderComparisonPanel();
      return;
    }
    state.comparisonIds.push(placeId);
    state.comparisonOpen = true;
  }

  updateCompareToggleButton();
  renderPlacesList();
  renderComparisonPanel();
}

function updateCompareToggleButton() {
  const btn = getEl('toggle-comparison-button');
  if (!btn) return;
  btn.textContent = `Compare (${state.comparisonIds.length}/${MAX_COMPARE_ITEMS})`;
  btn.setAttribute('aria-expanded', String(state.comparisonOpen));
}

function renderComparisonPanel() {
  const panel = getEl('comparison-panel');
  const grid = getEl('comparison-grid');
  if (!panel || !grid) return;

  updateCompareToggleButton();

  if (!state.comparisonOpen) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  if (state.comparisonIds.length === 0) {
    grid.replaceChildren(
      el('div', {
        className: 'empty-state',
        text: 'Select "+ Compare" on up to 3 places from the directory or details drawer.',
      })
    );
    return;
  }

  const cards = state.comparisonIds
    .map((id) => state.placesById.get(id))
    .filter(Boolean)
    .map((entry) => {
      const meta = CATEGORY_META[entry.category] || CATEGORY_META.restaurant;
      return el(
        'article',
        { className: 'compare-card' },
        el(
          'div',
          { className: 'compare-card-head' },
          el('h3', { className: 'compare-card-title', text: entry.displayName }),
          el('span', {
            className: `category-badge ${entry.category}`,
            text: entry.primaryTypeDisplayName || meta.label,
          })
        ),
        el(
          'div',
          { className: 'compare-row' },
          el('span', { className: 'compare-key', text: 'Rating' }),
          el('span', {
            className: 'compare-val',
            text:
              typeof entry.rating === 'number'
                ? `★ ${entry.rating.toFixed(1)} (${entry.userRatingCount ?? 0})`
                : 'N/A',
          })
        ),
        el(
          'div',
          { className: 'compare-row' },
          el('span', { className: 'compare-key', text: 'Price Level' }),
          el('span', {
            className: 'compare-val',
            text: formatPriceLevel(entry.priceLevel),
          })
        ),
        el(
          'div',
          { className: 'compare-row' },
          el('span', { className: 'compare-key', text: 'Today Hours' }),
          el('span', {
            className: 'compare-val',
            text: formatTodayHours(entry.regularOpeningHours),
          })
        ),
        el(
          'div',
          { className: 'compare-row' },
          el('span', { className: 'compare-key', text: 'Address' }),
          el('span', {
            className: 'compare-val',
            text: entry.formattedAddress || 'Central London',
          })
        ),
        el(
          'div',
          { className: 'compare-card-actions' },
          el('button', {
            type: 'button',
            className: 'btn btn-primary btn-sm',
            text: 'Inspect',
            onClick: () => void inspectPlace(entry.id),
          }),
          el('button', {
            type: 'button',
            className: 'btn btn-outline btn-sm',
            text: 'Remove',
            onClick: () => toggleComparison(entry.id),
          })
        )
      );
    });

  grid.replaceChildren(...cards);
}

function hydratePlaceEntry(target, placeObj) {
  target.displayName = placeObj.displayName || target.displayName || 'Unnamed Place';
  target.formattedAddress = placeObj.formattedAddress || target.formattedAddress || '';
  target.location = toLatLngLiteral(placeObj.location) || target.location;
  target.primaryType = placeObj.primaryType || target.primaryType;
  target.primaryTypeDisplayName =
    placeObj.primaryTypeDisplayName || target.primaryTypeDisplayName;
  target.types = placeObj.types || target.types || [];
  target.category = resolvePlaceCategory(target);
  target.rating =
    typeof placeObj.rating === 'number' ? placeObj.rating : target.rating;
  target.userRatingCount =
    typeof placeObj.userRatingCount === 'number'
      ? placeObj.userRatingCount
      : target.userRatingCount;
  target.priceLevel = placeObj.priceLevel ?? target.priceLevel;
  target.regularOpeningHours =
    placeObj.regularOpeningHours || target.regularOpeningHours;
  target.photos = placeObj.photos || target.photos || [];
  target.reviews = placeObj.reviews || target.reviews || [];
  target.websiteURI = placeObj.websiteURI || target.websiteURI;
  target.internationalPhoneNumber =
    placeObj.internationalPhoneNumber || target.internationalPhoneNumber;
  target.googleMapsURI = placeObj.googleMapsURI || target.googleMapsURI;
}

function clearPlaceMarkers() {
  for (const marker of gmp.placeMarkers.values()) {
    marker.map = null;
  }
  gmp.placeMarkers.clear();
}

async function runNearbySearchForCenter() {
  if (!gmp.classes || !state.isMapsReady) return;
  const { Place, SearchNearbyRankPreference } = gmp.classes;
  const gen = ++state.searchGeneration;

  hideBanner();
  updateStatusBar('Searching within 5 km...');

  clearPlaceMarkers();
  state.placesById.clear();
  state.orderedPlaceIds = [];

  try {
    const categoriesToFetch =
      state.activeCategory === 'all' ? CORE_CATEGORIES : [state.activeCategory];
    const perCategoryLimit = state.activeCategory === 'all' ? 6 : 14;

    const responses = await Promise.all(
      categoriesToFetch.map((cat) =>
        Place.searchNearby({
          fields: SEARCH_FIELDS,
          locationRestriction: {
            center: state.activeCenter,
            radius: RADIUS_METERS,
          },
          includedPrimaryTypes: [cat],
          maxResultCount: perCategoryLimit,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: 'en',
          region: 'gb',
        })
      )
    );

    if (gen !== state.searchGeneration) return;

    for (let i = 0; i < responses.length; i += 1) {
      const cat = categoriesToFetch[i];
      const places = responses[i]?.places || [];
      for (const p of places) {
        if (!p.id || state.placesById.has(p.id)) continue;
        const entry = {
          id: p.id,
          placeRef: p,
          category: cat,
          detailsLoaded: false,
        };
        hydratePlaceEntry(entry, p);
        entry.category = cat;
        state.placesById.set(p.id, entry);
        state.orderedPlaceIds.push(p.id);
      }
    }

    // Fallback to Place.searchByText if nearby search returned zero results
    if (state.orderedPlaceIds.length === 0) {
      const queryCat =
        state.activeCategory === 'all'
          ? 'restaurants, cafes, museums, and parks'
          : CATEGORY_META[state.activeCategory]?.plural || 'places';
      const { places } = await Place.searchByText({
        textQuery: `${queryCat} near ${state.activeNeighborhoodLabel}, London`,
        fields: SEARCH_FIELDS,
        locationBias: {
          center: state.activeCenter,
          radius: RADIUS_METERS,
        },
        maxResultCount: 16,
        language: 'en',
        region: 'gb',
      });
      if (gen !== state.searchGeneration) return;
      for (const p of places || []) {
        if (!p.id || state.placesById.has(p.id)) continue;
        const entry = {
          id: p.id,
          placeRef: p,
          detailsLoaded: false,
        };
        hydratePlaceEntry(entry, p);
        state.placesById.set(p.id, entry);
        state.orderedPlaceIds.push(p.id);
      }
    }

    syncMapMarkers();
    renderPlacesList();
  } catch (err) {
    if (gen !== state.searchGeneration) return;
    showBanner(
      `Places search error: ${err?.message || String(err)}. Ensure Places API (New) is enabled for your key.`,
      true
    );
    renderPlacesList();
  }
}

function updateNeighborhoodCenter(center, label, viewport = null) {
  state.activeCenter = { lat: Number(center.lat), lng: Number(center.lng) };
  state.activeNeighborhoodLabel = label;

  if (gmp.circle) {
    gmp.circle.setCenter(state.activeCenter);
  }
  if (gmp.autocompleteEl) {
    gmp.autocompleteEl.locationBias = {
      center: state.activeCenter,
      radius: RADIUS_METERS,
    };
  }
  if (gmp.map) {
    if (viewport) {
      gmp.map.fitBounds(viewport);
    } else {
      gmp.map.panTo(state.activeCenter);
      gmp.map.setZoom(13);
    }
  }

  void runNearbySearchForCenter();
}

async function handleForwardGeocode() {
  const rawQuery = (
    gmp.autocompleteEl?.value ||
    gmp.fallbackInputEl?.value ||
    ''
  ).trim();

  if (!rawQuery) {
    showBanner('Enter a London address or neighborhood to geocode.', false);
    return;
  }
  if (!gmp.geocoder || !state.isMapsReady) {
    showBanner('Geocoding requires an active GOOGLE_MAPS_API_KEY.', true, true);
    return;
  }

  hideBanner();
  updateStatusBar('Geocoding address...');

  try {
    const { results } = await gmp.geocoder.geocode({
      address: rawQuery,
      region: 'GB',
    });
    const best = results?.[0];
    if (!best?.geometry?.location) {
      showBanner(`No geocoding match found for "${rawQuery}".`, true);
      updateStatusBar();
      return;
    }

    const coords = toLatLngLiteral(best.geometry.location);
    updateNeighborhoodCenter(
      coords,
      best.formatted_address || rawQuery,
      best.geometry.viewport || null
    );
  } catch (err) {
    showBanner(`Geocoding failed: ${err?.message || String(err)}`, true);
    updateStatusBar();
  }
}

async function handleMapClickReverseGeocode(latLng) {
  const coords = toLatLngLiteral(latLng);
  if (!coords) return;

  if (!gmp.geocoder) {
    openReverseGeocodeInspector({
      coords,
      address: 'Geocoder unavailable',
      placeId: 'N/A',
    });
    return;
  }

  try {
    const { results } = await gmp.geocoder.geocode({ location: coords });
    const best = results?.[0];
    openReverseGeocodeInspector({
      coords,
      address:
        best?.formatted_address ||
        `Coordinates ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      placeId: best?.place_id || 'N/A',
    });
  } catch (err) {
    openReverseGeocodeInspector({
      coords,
      address: `Reverse geocode error: ${err?.message || String(err)}`,
      placeId: 'N/A',
    });
  }
}

function toggleRadiusCircle() {
  state.radiusVisible = !state.radiusVisible;
  const btn = getEl('radius-toggle-circle');
  if (btn) {
    btn.classList.toggle('active', state.radiusVisible);
    btn.setAttribute('aria-pressed', String(state.radiusVisible));
    btn.textContent = state.radiusVisible ? '5 km Radius: On' : '5 km Radius: Off';
  }
  if (gmp.circle && gmp.map) {
    gmp.circle.setMap(state.radiusVisible ? gmp.map : null);
  }
}

function wireStaticControls() {
  const presetSelect = getEl('neighborhood-preset-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const preset = NEIGHBORHOOD_PRESETS[presetSelect.value];
      if (!preset) return;
      updateNeighborhoodCenter(preset.center, preset.label);
    });
  }

  const geocodeBtn = getEl('address-geocode-button');
  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', () => {
      void handleForwardGeocode();
    });
  }

  const radiusBtn = getEl('radius-toggle-circle');
  if (radiusBtn) {
    radiusBtn.addEventListener('click', toggleRadiusCircle);
  }

  const toggleCompareBtn = getEl('toggle-comparison-button');
  if (toggleCompareBtn) {
    toggleCompareBtn.addEventListener('click', () => {
      state.comparisonOpen = !state.comparisonOpen;
      renderComparisonPanel();
    });
  }

  const closeCompareBtn = getEl('close-comparison-button');
  if (closeCompareBtn) {
    closeCompareBtn.addEventListener('click', () => {
      state.comparisonOpen = false;
      renderComparisonPanel();
    });
  }

  const clearCompareBtn = getEl('clear-comparison-button');
  if (clearCompareBtn) {
    clearCompareBtn.addEventListener('click', () => {
      state.comparisonIds = [];
      updateCompareToggleButton();
      renderPlacesList();
      renderComparisonPanel();
    });
  }

  const closeDrawerBtn = getEl('drawer-close-button');
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', closeDrawer);
  }

  const spotForm = getEl('community-spot-form');
  if (spotForm) {
    spotForm.addEventListener('submit', saveCommunitySpotFromForm);
  }

  for (const cat of ['all', ...CORE_CATEGORIES]) {
    const chip = getEl(`category-filter-${cat}`);
    if (!chip) continue;
    chip.addEventListener('click', () => {
      state.activeCategory = cat;
      renderCategoryChips();
      if (state.isMapsReady) {
        void runNearbySearchForCenter();
      } else {
        renderPlacesList();
      }
    });
  }

  const mobileSidebarBtn = getEl('mobile-sidebar-toggle');
  const sidebar = getEl('directory-sidebar');
  if (mobileSidebarBtn && sidebar) {
    mobileSidebarBtn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('mobile-collapsed');
      mobileSidebarBtn.setAttribute('aria-expanded', String(!collapsed));
    });
  }
}

function renderFallbackSearchInput() {
  const container = getEl('neighborhood-autocomplete-input');
  if (!container) return;
  const input = el('input', {
    type: 'text',
    className: 'fallback-search-input',
    attrs: {
      placeholder: 'Enter London address or neighborhood...',
      'aria-label': 'Enter London address or neighborhood',
    },
  });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      void handleForwardGeocode();
    }
  });
  gmp.fallbackInputEl = input;
  container.replaceChildren(input);
}

function renderMissingKeyFallback(reason) {
  const mapCanvas = getEl('map-canvas');
  if (mapCanvas) {
    mapCanvas.replaceChildren(
      el(
        'div',
        { className: 'map-fallback-overlay' },
        el(
          'div',
          { className: 'map-fallback-card' },
          el('h2', { text: 'Google Maps API Key Required' }),
          el('p', { text: reason }),
          el('p', {
            text: 'Copy .env.example to .env, set GOOGLE_MAPS_API_KEY, and restart the server. You can mint a free zero-billing Maps Demo Key for prototyping:',
          }),
          el('p', {}, el('a', {
            text: 'Open Maps Demo Key Quickstart',
            attrs: {
              href: 'https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          }))
        )
      )
    );
  }
  showBanner(reason, false, true);
  renderPlacesList();
  renderCommunitySpots();
}

async function initApp() {
  wireStaticControls();
  renderCategoryChips();
  renderCommunitySpots();
  updateCompareToggleButton();

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  if (!apiKey) {
    renderFallbackSearchInput();
    renderMissingKeyFallback(
      'No GOOGLE_MAPS_API_KEY configured in .env. Live Central London map tiles, Places API (New), and Geocoding will activate once configured.'
    );
    return;
  }

  window.gm_authFailure = () => {
    state.isMapsReady = false;
    showBanner(
      'Google Maps authentication failed. Check GOOGLE_MAPS_API_KEY restrictions and ensure Maps JavaScript API, Places API (New), and Geocoding API are enabled.',
      true
    );
  };

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'GB',
    });

    const [
      { Map, InfoWindow, Circle },
      { AdvancedMarkerElement, PinElement },
      { Place, PlaceAutocompleteElement, SearchNearbyRankPreference },
      { Geocoder },
    ] = await Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('geocoding'),
      importLibrary('core'),
    ]);

    gmp.classes = {
      Map,
      InfoWindow,
      Circle,
      AdvancedMarkerElement,
      PinElement,
      Place,
      PlaceAutocompleteElement,
      SearchNearbyRankPreference,
      Geocoder,
    };

    const mapEl = getEl('map-canvas');
    gmp.map = new Map(mapEl, {
      center: state.activeCenter,
      zoom: 13,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      clickableIcons: false,
    });

    gmp.infoWindow = new InfoWindow();
    gmp.geocoder = new Geocoder();

    gmp.circle = new Circle({
      map: state.radiusVisible ? gmp.map : null,
      center: state.activeCenter,
      radius: RADIUS_METERS,
      strokeColor: '#1A73E8',
      strokeOpacity: 0.75,
      strokeWeight: 2,
      fillColor: '#1A73E8',
      fillOpacity: 0.08,
      clickable: false,
    });

    // Mount PlaceAutocompleteElement (<gmp-place-autocomplete>)
    const autocompleteContainer = getEl('neighborhood-autocomplete-input');
    if (autocompleteContainer) {
      const autocompleteEl = new PlaceAutocompleteElement({
        includedRegionCodes: ['gb'],
        locationBias: {
          center: state.activeCenter,
          radius: RADIUS_METERS,
        },
      });
      autocompleteEl.setAttribute(
        'placeholder',
        'Search London address or neighborhood...'
      );
      autocompleteEl.addEventListener('gmp-select', async (event) => {
        try {
          const place = event.placePrediction.toPlace();
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
          });
          const coords = toLatLngLiteral(place.location);
          if (coords) {
            updateNeighborhoodCenter(
              coords,
              place.displayName || place.formattedAddress || 'Selected Location',
              place.viewport || null
            );
          }
        } catch (err) {
          showBanner(
            `Autocomplete selection failed: ${err?.message || String(err)}`,
            true
          );
        }
      });
      autocompleteEl.addEventListener('gmp-error', () => {
        showBanner(
          'Places Autocomplete encountered an error. Verify Places API (New) is enabled.',
          true
        );
      });
      gmp.autocompleteEl = autocompleteEl;
      autocompleteContainer.replaceChildren(autocompleteEl);
    }

    // Reverse geocode on map click
    gmp.map.addListener('click', (event) => {
      if (event.latLng) {
        void handleMapClickReverseGeocode(event.latLng);
      }
    });

    state.isMapsReady = true;
    await runNearbySearchForCenter();
  } catch (err) {
    renderFallbackSearchInput();
    renderMissingKeyFallback(
      `Failed to initialize Google Maps Platform libraries: ${err?.message || String(err)}`
    );
  }
}

void initApp();
