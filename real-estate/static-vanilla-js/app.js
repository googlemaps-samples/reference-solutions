import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { PROPERTIES } from './data/listings.js';

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const SF_CENTER = { lat: 37.7749, lng: -122.4194 };
const SF_BOUNDS = { south: 37.70, west: -122.52, north: 37.82, east: -122.35 };

const state = {
  apiKey: window.__GMP_CONFIG__?.apiKey || '',
  mapsReady: false,
  selectedPropertyId: PROPERTIES[0]?.id || null,
  hoveredPropertyId: null,
  filters: {
    maxPrice: 'all',
    minBeds: 0,
    propertyType: 'all',
  },
  searchPolygon: null,
  isDrawing: false,
  mapTypeId: 'roadmap',
  amenityCategory: 'all',
  amenities: [],
  amenityCache: new Map(),
  workplaceQuery: 'Salesforce Tower, San Francisco, CA',
  workplaceLocation: null,
  workplaceLabel: '',
};

let gmp = null;
let map = null;
let markerClusterer = null;
let propertyMarkers = new Map();
let parcelPolygonOverlay = null;
let streetViewPanorama = null;
let streetViewService = null;
let terraDraw = null;
let commutePolylines = [];
let workplaceMarker = null;
let amenityMarkers = [];
let activeAmenityInfoWindow = null;

const dom = {
  locationSearchSlot: document.getElementById('location-search-input'),
  filterMaxPrice: document.getElementById('filter-max-price'),
  filterMinBeds: document.getElementById('filter-min-beds'),
  filterPropertyType: document.getElementById('filter-property-type'),
  resultsCount: document.getElementById('results-count'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  propertyList: document.getElementById('property-list'),
  detailPanel: document.getElementById('listing-detail-panel'),
  detailNeighborhood: document.getElementById('detail-neighborhood'),
  detailTitle: document.getElementById('detail-title'),
  detailAddress: document.getElementById('detail-address'),
  detailPrice: document.getElementById('detail-price'),
  detailSpecs: document.getElementById('detail-specs'),
  detailApn: document.getElementById('detail-apn'),
  detailZoning: document.getElementById('detail-zoning'),
  detailLotSqft: document.getElementById('detail-lot-sqft'),
  detailYearBuilt: document.getElementById('detail-year-built'),
  detailDescription: document.getElementById('detail-description'),
  detailHighlights: document.getElementById('detail-highlights'),
  streetViewContainer: document.getElementById('street-view-container'),
  streetViewStatus: document.getElementById('street-view-status'),
  amenitiesStatus: document.getElementById('amenities-status'),
  amenitiesList: document.getElementById('nearby-amenities-list'),
  amenityTabs: Array.from(document.querySelectorAll('.amenity-tab')),
  commuteForm: document.getElementById('commute-form'),
  workplaceInput: document.getElementById('workplace-input'),
  calculateCommuteBtn: document.getElementById('calculate-commute-btn'),
  presetChips: Array.from(document.querySelectorAll('.preset-chip')),
  commuteDriveEta: document.getElementById('commute-drive-eta'),
  commuteDriveDist: document.getElementById('commute-drive-dist'),
  commuteTransitEta: document.getElementById('commute-transit-eta'),
  commuteTransitDist: document.getElementById('commute-transit-dist'),
  commuteStatus: document.getElementById('commute-status'),
  mapContainer: document.getElementById('map-container'),
  drawAreaBtn: document.getElementById('draw-area-btn'),
  clearAreaBtn: document.getElementById('clear-area-btn'),
  mapTypeToggle: document.getElementById('map-type-toggle'),
  mapStatusPill: document.getElementById('map-status-pill'),
  apiStatusBanner: document.getElementById('api-status-banner'),
  apiStatusTitle: document.getElementById('api-status-title'),
  apiStatusMessage: document.getElementById('api-status-message'),
};

function formatCurrency(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatShortPrice(price) {
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  return `$${Math.round(price / 1000)}K`;
}

function formatNumber(val) {
  return new Intl.NumberFormat('en-US').format(val);
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms)) return '—';
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

function formatDistanceMeters(meters) {
  if (!Number.isFinite(meters)) return '';
  const miles = meters / 1609.344;
  return miles >= 0.2 ? `${miles.toFixed(1)} mi` : `${Math.round(meters)} m`;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function showApiBanner(title, message) {
  dom.apiStatusTitle.textContent = title;
  dom.apiStatusMessage.textContent = message;
  dom.apiStatusBanner.hidden = false;
}

function hideApiBanner() {
  dom.apiStatusBanner.hidden = true;
}

function getFilteredProperties() {
  return PROPERTIES.filter((prop) => {
    if (
      state.filters.maxPrice !== 'all' &&
      prop.price > Number(state.filters.maxPrice)
    ) {
      return false;
    }
    if (prop.beds < state.filters.minBeds) {
      return false;
    }
    if (
      state.filters.propertyType !== 'all' &&
      prop.propertyType !== state.filters.propertyType
    ) {
      return false;
    }
    if (state.searchPolygon && gmp?.poly && gmp?.LatLng) {
      const point = new gmp.LatLng(prop.lat, prop.lng);
      if (!gmp.poly.containsLocation(point, state.searchPolygon)) {
        return false;
      }
    }
    return true;
  });
}

function hasActiveFilters() {
  return (
    state.filters.maxPrice !== 'all' ||
    state.filters.minBeds > 0 ||
    state.filters.propertyType !== 'all' ||
    Boolean(state.searchPolygon)
  );
}

function getSelectedProperty() {
  return (
    PROPERTIES.find((p) => p.id === state.selectedPropertyId) ||
    PROPERTIES[0] ||
    null
  );
}

function renderPropertyList(filtered) {
  dom.resultsCount.textContent =
    filtered.length === 1 ? '1 home' : `${filtered.length} homes`;
  dom.resetFiltersBtn.hidden = !hasActiveFilters();

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state-card';
    const msg = document.createElement('p');
    msg.textContent = 'No listings match the current filters or drawn search area.';
    empty.appendChild(msg);
    dom.propertyList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const prop of filtered) {
    const card = document.createElement('article');
    card.className = 'property-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.dataset.propertyId = prop.id;

    if (prop.id === state.selectedPropertyId) {
      card.classList.add('is-selected');
    }
    if (prop.id === state.hoveredPropertyId) {
      card.classList.add('is-hovered');
    }

    const topRow = document.createElement('div');
    topRow.className = 'card-top-row';

    const priceEl = document.createElement('span');
    priceEl.className = 'card-price';
    priceEl.textContent = formatCurrency(prop.price);

    const typeEl = document.createElement('span');
    typeEl.className = 'card-type-pill';
    typeEl.textContent = prop.propertyType;

    topRow.append(priceEl, typeEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = `${prop.neighborhood} · ${prop.address.split(',')[0]}`;

    const metaRow = document.createElement('div');
    metaRow.className = 'card-meta-row';

    const specsEl = document.createElement('span');
    specsEl.textContent = `${prop.beds} bd · ${prop.baths} ba · ${formatNumber(prop.sqft)} sqft`;

    const lotEl = document.createElement('span');
    lotEl.textContent = `Lot ${formatNumber(prop.lotSqft)} sqft`;

    metaRow.append(specsEl, lotEl);
    card.append(topRow, titleEl, metaRow);

    card.addEventListener('mouseenter', () => setHoveredProperty(prop.id));
    card.addEventListener('mouseleave', () => setHoveredProperty(null));
    card.addEventListener('click', () => selectProperty(prop.id, { focusMap: true }));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectProperty(prop.id, { focusMap: true });
      }
    });

    fragment.appendChild(card);
  }

  dom.propertyList.replaceChildren(fragment);
}

function renderPropertyDetailHeader(prop) {
  if (!prop) return;
  dom.detailNeighborhood.textContent = prop.neighborhood;
  dom.detailTitle.textContent = prop.title;
  dom.detailAddress.textContent = prop.address;
  dom.detailPrice.textContent = formatCurrency(prop.price);
  dom.detailSpecs.textContent = `${prop.beds} bd · ${prop.baths} ba · ${formatNumber(prop.sqft)} sqft`;
  dom.detailApn.textContent = prop.apn;
  dom.detailZoning.textContent = prop.zoning;
  dom.detailLotSqft.textContent = `${formatNumber(prop.lotSqft)} sqft`;
  dom.detailYearBuilt.textContent = String(prop.yearBuilt);
  dom.detailDescription.textContent = prop.description;

  const tags = prop.highlights.map((label) => {
    const tag = document.createElement('span');
    tag.className = 'highlight-tag';
    tag.textContent = label;
    return tag;
  });
  dom.detailHighlights.replaceChildren(...tags);
}

function syncSelectionClasses() {
  const cards = dom.propertyList.querySelectorAll('.property-card');
  cards.forEach((card) => {
    const id = card.dataset.propertyId;
    card.classList.toggle('is-selected', id === state.selectedPropertyId);
    card.classList.toggle('is-hovered', id === state.hoveredPropertyId);
  });

  propertyMarkers.forEach(({ marker, pillEl }, id) => {
    const isSelected = id === state.selectedPropertyId;
    const isHovered = id === state.hoveredPropertyId;
    pillEl.classList.toggle('is-selected', isSelected);
    pillEl.classList.toggle('is-hovered', isHovered);
    marker.zIndex = isSelected ? 10000 : isHovered ? 9000 : 100;
  });
}

function setHoveredProperty(propertyId) {
  if (state.hoveredPropertyId === propertyId) return;
  state.hoveredPropertyId = propertyId;
  syncSelectionClasses();
}

function updateParcelPolygon(prop) {
  if (!map || !gmp?.Polygon || !prop) return;
  if (parcelPolygonOverlay) {
    parcelPolygonOverlay.setMap(null);
    parcelPolygonOverlay = null;
  }

  parcelPolygonOverlay = new gmp.Polygon({
    paths: prop.parcelPolygon,
    strokeColor: '#f59e0b',
    strokeOpacity: 0.98,
    strokeWeight: 3,
    fillColor: '#fbbf24',
    fillOpacity: 0.28,
    clickable: false,
    zIndex: 40,
    map,
  });
}

function createClusterRenderer() {
  return {
    render({ count, position }) {
      const clusterEl = document.createElement('div');
      clusterEl.className = 'cluster-pill-marker';
      clusterEl.textContent = String(count);

      const marker = new gmp.AdvancedMarkerElement({
        map,
        position,
        zIndex: 100000 + count,
        title: `${count} listings in this area`,
      });
      marker.append(clusterEl);
      return marker;
    },
  };
}

function syncMapMarkers(filtered) {
  if (!map || !gmp?.AdvancedMarkerElement) return;

  if (markerClusterer) {
    markerClusterer.clearMarkers();
  }
  propertyMarkers.forEach(({ marker }) => {
    marker.map = null;
  });
  propertyMarkers.clear();

  const markersForClusterer = [];

  for (const prop of filtered) {
    const pillEl = document.createElement('button');
    pillEl.type = 'button';
    pillEl.className = 'price-pill-marker';
    pillEl.textContent = formatShortPrice(prop.price);
    pillEl.setAttribute('aria-label', `${prop.title}, ${formatCurrency(prop.price)}`);

    if (prop.id === state.selectedPropertyId) {
      pillEl.classList.add('is-selected');
    }

    pillEl.addEventListener('mouseenter', () => setHoveredProperty(prop.id));
    pillEl.addEventListener('mouseleave', () => setHoveredProperty(null));

    const marker = new gmp.AdvancedMarkerElement({
      position: { lat: prop.lat, lng: prop.lng },
      title: `${prop.title} (${formatCurrency(prop.price)})`,
      zIndex: prop.id === state.selectedPropertyId ? 10000 : 100,
    });
    marker.append(pillEl);

    marker.addListener('click', () => {
      selectProperty(prop.id, { focusMap: true });
    });

    propertyMarkers.set(prop.id, { marker, pillEl });
    markersForClusterer.push(marker);
  }

  if (!markerClusterer) {
    markerClusterer = new MarkerClusterer({
      map,
      markers: markersForClusterer,
      renderer: createClusterRenderer(),
    });
  } else {
    markerClusterer.addMarkers(markersForClusterer);
  }
}

async function updateStreetView(prop) {
  if (!prop) return;
  if (!state.mapsReady || !gmp?.StreetViewPanorama || !gmp?.StreetViewService) {
    dom.streetViewStatus.textContent = 'Requires Google Maps API key';
    return;
  }

  dom.streetViewStatus.textContent = 'Locating panorama…';

  try {
    const targetLatLng = new gmp.LatLng(prop.lat, prop.lng);
    const response = await streetViewService.getPanorama({
      location: targetLatLng,
      radius: 120,
      source: 'outdoor',
    });

    const panoData = response?.data;
    const panoLatLng = panoData?.location?.latLng;

    if (!panoLatLng) {
      dom.streetViewStatus.textContent = 'No outdoor panorama nearby';
      return;
    }

    const heading = gmp.spherical.computeHeading(panoLatLng, targetLatLng);

    if (!streetViewPanorama) {
      streetViewPanorama = new gmp.StreetViewPanorama(dom.streetViewContainer, {
        position: panoLatLng,
        pov: { heading, pitch: 5 },
        zoom: 1,
        addressControl: false,
        fullscreenControl: true,
        linksControl: true,
        panControl: false,
        motionTracking: false,
      });
    } else {
      streetViewPanorama.setPosition(panoLatLng);
      streetViewPanorama.setPov({ heading, pitch: 5 });
      streetViewPanorama.setVisible(true);
    }

    dom.streetViewStatus.textContent =
      panoData.location?.shortDescription || prop.neighborhood;
  } catch {
    dom.streetViewStatus.textContent = 'Street View unavailable for this parcel';
  }
}

function clearAmenityMarkers() {
  for (const m of amenityMarkers) {
    m.map = null;
  }
  amenityMarkers = [];
  if (activeAmenityInfoWindow) {
    activeAmenityInfoWindow.close();
  }
}

function renderAmenitiesList() {
  const filtered =
    state.amenityCategory === 'all'
      ? state.amenities
      : state.amenities.filter((item) => item.category === state.amenityCategory);

  clearAmenityMarkers();

  if (!state.mapsReady) {
    const li = document.createElement('li');
    li.className = 'amenity-item';
    const text = document.createElement('div');
    text.className = 'amenity-sub';
    text.textContent = 'Add GOOGLE_MAPS_API_KEY in .env to fetch live Places within 5 km.';
    li.appendChild(text);
    dom.amenitiesList.replaceChildren(li);
    return;
  }

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'amenity-item';
    const text = document.createElement('div');
    text.className = 'amenity-sub';
    text.textContent = 'No matching nearby amenities found within 5 km.';
    li.appendChild(text);
    dom.amenitiesList.replaceChildren(li);
    return;
  }

  const fragment = document.createDocumentFragment();
  const visibleItems = filtered.slice(0, 12);

  for (const item of visibleItems) {
    const li = document.createElement('li');
    li.className = 'amenity-item';

    const main = document.createElement('div');
    main.className = 'amenity-main';

    const nameEl = document.createElement('div');
    nameEl.className = 'amenity-name';
    nameEl.textContent = item.name;

    const subParts = [formatDistanceMeters(item.distanceMeters)];
    if (typeof item.rating === 'number') {
      const countText = item.userRatingCount ? ` (${item.userRatingCount})` : '';
      subParts.push(`★ ${item.rating.toFixed(1)}${countText}`);
    }
    if (item.address) {
      subParts.push(item.address);
    }

    const subEl = document.createElement('div');
    subEl.className = 'amenity-sub';
    subEl.textContent = subParts.filter(Boolean).join(' · ');

    main.append(nameEl, subEl);

    const badge = document.createElement('span');
    badge.className = `amenity-badge ${item.category}`;
    badge.textContent = item.category;

    li.append(main, badge);

    if (item.location && map && gmp?.AdvancedMarkerElement) {
      const pin = document.createElement('div');
      pin.className = `amenity-pin ${item.category}`;
      pin.textContent =
        item.category === 'schools' ? 'S' : item.category === 'groceries' ? 'G' : 'T';

      const marker = new gmp.AdvancedMarkerElement({
        map,
        position: item.location,
        title: item.name,
        zIndex: 50,
      });
      marker.append(pin);

      const openInfo = () => {
        if (!activeAmenityInfoWindow) {
          activeAmenityInfoWindow = new gmp.InfoWindow();
        }
        const infoNode = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = item.name;
        const meta = document.createElement('div');
        meta.textContent = `${item.category.toUpperCase()} · ${formatDistanceMeters(item.distanceMeters)}`;
        infoNode.append(strong, meta);
        activeAmenityInfoWindow.setContent(infoNode);
        activeAmenityInfoWindow.open({ map, anchor: marker });
      };

      marker.addListener('click', openInfo);
      li.addEventListener('click', () => {
        map.panTo(item.location);
        openInfo();
      });

      amenityMarkers.push(marker);
    }

    fragment.appendChild(li);
  }

  dom.amenitiesList.replaceChildren(fragment);
}

async function fetchNearbyAmenities(prop) {
  if (!prop) return;
  if (!state.mapsReady || !gmp?.Place) {
    state.amenities = [];
    renderAmenitiesList();
    return;
  }

  if (state.amenityCache.has(prop.id)) {
    state.amenities = state.amenityCache.get(prop.id);
    dom.amenitiesStatus.textContent = `${state.amenities.length} places within 5 km`;
    renderAmenitiesList();
    return;
  }

  dom.amenitiesStatus.textContent = 'Searching 5 km radius…';
  const loadingItem = document.createElement('li');
  loadingItem.className = 'amenity-item';
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'amenity-sub';
  loadingMsg.textContent = 'Fetching nearby schools, groceries, and transit…';
  loadingItem.appendChild(loadingMsg);
  dom.amenitiesList.replaceChildren(loadingItem);

  const categories = [
    {
      category: 'schools',
      includedPrimaryTypes: ['school', 'primary_school', 'secondary_school', 'university'],
    },
    {
      category: 'groceries',
      includedPrimaryTypes: ['supermarket', 'grocery_store'],
    },
    {
      category: 'transit',
      includedPrimaryTypes: [
        'subway_station',
        'light_rail_station',
        'train_station',
        'bus_station',
        'transit_station',
      ],
    },
  ];

  const center = { lat: prop.lat, lng: prop.lng };

  try {
    const settled = await Promise.allSettled(
      categories.map(async ({ category, includedPrimaryTypes }) => {
        const { places } = await gmp.Place.searchNearby({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'primaryType',
            'rating',
            'userRatingCount',
          ],
          locationRestriction: {
            center,
            radius: 5000,
          },
          includedPrimaryTypes,
          maxResultCount: 6,
          rankPreference: gmp.SearchNearbyRankPreference.DISTANCE,
          language: 'en-US',
          region: 'us',
          internalUsageAttributionIds: [ATTRIBUTION_ID],
        });

        return (places || []).map((place) => {
          const loc = place.location
            ? { lat: place.location.lat(), lng: place.location.lng() }
            : null;
          return {
            id: place.id,
            category,
            name: place.displayName || 'Unnamed Place',
            address: place.formattedAddress || '',
            location: loc,
            rating: place.rating ?? null,
            userRatingCount: place.userRatingCount ?? null,
            distanceMeters: loc ? haversineMeters(center, loc) : Number.POSITIVE_INFINITY,
          };
        });
      })
    );

    const combined = [];
    const seenIds = new Set();
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      for (const placeItem of result.value) {
        if (placeItem.id && seenIds.has(placeItem.id)) continue;
        if (placeItem.id) seenIds.add(placeItem.id);
        combined.push(placeItem);
      }
    }

    combined.sort((a, b) => a.distanceMeters - b.distanceMeters);
    state.amenityCache.set(prop.id, combined);

    if (state.selectedPropertyId === prop.id) {
      state.amenities = combined;
      dom.amenitiesStatus.textContent = `${combined.length} places within 5 km`;
      renderAmenitiesList();
    }
  } catch (err) {
    dom.amenitiesStatus.textContent = 'Nearby search unavailable';
    const errItem = document.createElement('li');
    errItem.className = 'amenity-item';
    const errMsg = document.createElement('div');
    errMsg.className = 'amenity-sub';
    errMsg.textContent = err?.message || 'Unable to load nearby places.';
    errItem.appendChild(errMsg);
    dom.amenitiesList.replaceChildren(errItem);
  }
}

function clearCommuteGraphics() {
  for (const line of commutePolylines) {
    line.setMap(null);
  }
  commutePolylines = [];
  if (workplaceMarker) {
    workplaceMarker.map = null;
    workplaceMarker = null;
  }
}

async function resolveWorkplaceLocation(queryText) {
  const { places } = await gmp.Place.searchByText({
    textQuery: queryText,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: SF_BOUNDS,
    maxResultCount: 1,
    language: 'en-US',
    region: 'us',
    internalUsageAttributionIds: [ATTRIBUTION_ID],
  });

  const match = places?.[0];
  if (!match || !match.location) {
    throw new Error('Destination not found. Try a San Francisco address or landmark.');
  }

  return {
    location: { lat: match.location.lat(), lng: match.location.lng() },
    label: match.displayName || match.formattedAddress || queryText,
  };
}

async function calculateCommute(options = { drawRoute: true }) {
  const prop = getSelectedProperty();
  const queryText = dom.workplaceInput.value.trim();

  if (!prop || !queryText) return;
  if (!state.mapsReady || !gmp?.RouteMatrix || !gmp?.Place) {
    dom.commuteStatus.textContent =
      'Add GOOGLE_MAPS_API_KEY in .env to calculate live driving and transit commutes.';
    return;
  }

  dom.calculateCommuteBtn.disabled = true;
  dom.commuteStatus.textContent = `Computing Route Matrix to "${queryText}"…`;
  dom.commuteDriveEta.textContent = '…';
  dom.commuteTransitEta.textContent = '…';

  try {
    let targetLoc = state.workplaceLocation;
    let targetLabel = state.workplaceLabel;

    if (!targetLoc || state.workplaceQuery !== queryText) {
      const resolved = await resolveWorkplaceLocation(queryText);
      targetLoc = resolved.location;
      targetLabel = resolved.label;
      state.workplaceQuery = queryText;
      state.workplaceLocation = targetLoc;
      state.workplaceLabel = targetLabel;
    }

    const origin = { lat: prop.lat, lng: prop.lng };

    const [driveRes, transitRes] = await Promise.allSettled([
      gmp.RouteMatrix.computeRouteMatrix({
        origins: [origin],
        destinations: [targetLoc],
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_AWARE',
        fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
        internalUsageAttributionIds: [ATTRIBUTION_ID],
      }),
      gmp.RouteMatrix.computeRouteMatrix({
        origins: [origin],
        destinations: [targetLoc],
        travelMode: 'TRANSIT',
        fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
        internalUsageAttributionIds: [ATTRIBUTION_ID],
      }),
    ]);

    if (driveRes.status === 'fulfilled') {
      const item = driveRes.value?.matrix?.rows?.[0]?.items?.[0];
      if (item && item.condition === 'ROUTE_EXISTS') {
        dom.commuteDriveEta.textContent =
          item.localizedValues?.duration || formatDurationMs(item.durationMillis);
        dom.commuteDriveDist.textContent =
          item.localizedValues?.distance || formatDistanceMeters(item.distanceMeters);
      } else {
        dom.commuteDriveEta.textContent = 'N/A';
        dom.commuteDriveDist.textContent = 'No driving route';
      }
    } else {
      dom.commuteDriveEta.textContent = 'N/A';
      dom.commuteDriveDist.textContent = 'Driving lookup failed';
    }

    if (transitRes.status === 'fulfilled') {
      const item = transitRes.value?.matrix?.rows?.[0]?.items?.[0];
      if (item && item.condition === 'ROUTE_EXISTS') {
        dom.commuteTransitEta.textContent =
          item.localizedValues?.duration || formatDurationMs(item.durationMillis);
        dom.commuteTransitDist.textContent =
          item.localizedValues?.distance || formatDistanceMeters(item.distanceMeters);
      } else {
        dom.commuteTransitEta.textContent = 'N/A';
        dom.commuteTransitDist.textContent = 'No transit route';
      }
    } else {
      dom.commuteTransitEta.textContent = 'N/A';
      dom.commuteTransitDist.textContent = 'Transit lookup failed';
    }

    if (options.drawRoute && gmp?.Route) {
      clearCommuteGraphics();
      try {
        const { routes } = await gmp.Route.computeRoutes({
          origin,
          destination: targetLoc,
          travelMode: 'DRIVING',
          fields: ['path'],
          internalUsageAttributionIds: [ATTRIBUTION_ID],
        });
        if (routes?.[0]) {
          commutePolylines = routes[0].createPolylines({
            polylineOptions: {
              map,
              strokeColor: '#1a56db',
              strokeOpacity: 0.78,
              strokeWeight: 4,
            },
          });
        }
      } catch {
        // Commute polyline overlay is supplemental; matrix ETAs already succeeded.
      }

      if (gmp.AdvancedMarkerElement && map) {
        const workBadge = document.createElement('div');
        workBadge.className = 'price-pill-marker';
        workBadge.style.borderColor = '#0d652d';
        workBadge.style.color = '#0d652d';
        workBadge.textContent = `Work: ${targetLabel.split(',')[0]}`;

        workplaceMarker = new gmp.AdvancedMarkerElement({
          map,
          position: targetLoc,
          title: targetLabel,
          zIndex: 8500,
        });
        workplaceMarker.append(workBadge);
      }
    }

    dom.commuteStatus.textContent = `From ${prop.address.split(',')[0]} to ${targetLabel}`;
  } catch (err) {
    dom.commuteDriveEta.textContent = '—';
    dom.commuteTransitEta.textContent = '—';
    dom.commuteStatus.textContent = err?.message || 'Unable to compute commute times.';
  } finally {
    dom.calculateCommuteBtn.disabled = false;
  }
}

function selectProperty(propertyId, options = { focusMap: false }) {
  const prop = PROPERTIES.find((p) => p.id === propertyId);
  if (!prop) return;

  state.selectedPropertyId = prop.id;
  syncSelectionClasses();
  renderPropertyDetailHeader(prop);
  updateParcelPolygon(prop);

  if (options.focusMap && map) {
    map.panTo({ lat: prop.lat, lng: prop.lng });
    if ((map.getZoom() || 13) < 16) {
      map.setZoom(16);
    }
    dom.mapStatusPill.textContent = `Parcel APN ${prop.apn} · ${prop.address} (${formatNumber(prop.lotSqft)} sqft lot)`;
  }

  void updateStreetView(prop);
  void fetchNearbyAmenities(prop);
  void calculateCommute({ drawRoute: Boolean(options.focusMap) });
}

function applyFiltersAndRender() {
  const filtered = getFilteredProperties();
  renderPropertyList(filtered);
  syncMapMarkers(filtered);

  if (
    filtered.length > 0 &&
    !filtered.some((p) => p.id === state.selectedPropertyId)
  ) {
    selectProperty(filtered[0].id, { focusMap: false });
  }
}

function extractPolygonRing(snapshot) {
  const feature = snapshot.find(
    (item) =>
      item?.geometry?.type === 'Polygon' &&
      Array.isArray(item.geometry.coordinates?.[0]) &&
      item.geometry.coordinates[0].length >= 3 &&
      !item.properties?.currentlyDrawing
  );
  if (!feature) return null;
  return feature.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
}

function applyDrawnPolygonFilter() {
  if (!terraDraw || !gmp?.Polygon) return;
  const snapshot = terraDraw.getSnapshot();
  const ring = extractPolygonRing(snapshot);

  if (!ring) {
    state.searchPolygon = null;
    dom.clearAreaBtn.disabled = true;
    applyFiltersAndRender();
    return;
  }

  state.searchPolygon = new gmp.Polygon({ paths: ring });
  dom.clearAreaBtn.disabled = false;
  applyFiltersAndRender();

  const count = getFilteredProperties().length;
  dom.mapStatusPill.textContent = `Search area active · ${count} ${count === 1 ? 'home' : 'homes'} inside polygon`;
}

function initTerraDraw() {
  if (terraDraw || !map) return;

  terraDraw = new TerraDraw({
    adapter: new TerraDrawGoogleMapsAdapter({
      map,
      lib: google.maps,
      coordinatePrecision: 9,
    }),
    modes: [
      new TerraDrawPolygonMode({
        editable: false,
        styles: {
          fillColor: '#1a56db',
          fillOpacity: 0.14,
          outlineColor: '#1a56db',
          outlineWidth: 2.5,
          closingPointColor: '#1a56db',
          closingPointWidth: 5,
          closingPointOutlineColor: '#ffffff',
          closingPointOutlineWidth: 2,
        },
      }),
      new TerraDrawSelectMode({
        flags: {
          polygon: {
            feature: {
              draggable: true,
              coordinates: {
                midpoints: true,
                draggable: true,
                deletable: true,
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
    const allFeatures = terraDraw.getSnapshot();
    const staleIds = allFeatures
      .filter((f) => f.id !== id)
      .map((f) => f.id);
    if (staleIds.length > 0) {
      terraDraw.removeFeatures(staleIds);
    }
    state.isDrawing = false;
    dom.drawAreaBtn.classList.remove('is-active');
    dom.drawAreaBtn.textContent = 'Draw Search Area';
    terraDraw.setMode('select');
    applyDrawnPolygonFilter();
  });

  terraDraw.on('change', () => {
    if (!state.isDrawing && state.searchPolygon) {
      applyDrawnPolygonFilter();
    }
  });
}

function initLocationAutocomplete() {
  if (!gmp?.PlaceAutocompleteElement) return;
  try {
    const autocomplete = new gmp.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: SF_BOUNDS,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
    autocomplete.setAttribute(
      'aria-label',
      'Search San Francisco neighborhood or address'
    );

    autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        if (place.viewport) {
          map.fitBounds(place.viewport);
        } else if (place.location) {
          map.panTo(place.location);
          map.setZoom(15);
        }
        const label = place.displayName || place.formattedAddress || 'Selected location';
        dom.mapStatusPill.textContent = `Map centered on ${label}`;
      } catch (err) {
        dom.mapStatusPill.textContent = err?.message || 'Unable to load selected place';
      }
    });

    dom.locationSearchSlot.replaceChildren(autocomplete);
  } catch {
    const fallbackInput = document.createElement('input');
    fallbackInput.type = 'search';
    fallbackInput.className = 'fallback-search-input';
    fallbackInput.placeholder = 'Search San Francisco neighborhood...';
    dom.locationSearchSlot.replaceChildren(fallbackInput);
  }
}

function bindUIEvents() {
  dom.filterMaxPrice.addEventListener('change', (e) => {
    state.filters.maxPrice = e.target.value;
    applyFiltersAndRender();
  });

  dom.filterMinBeds.addEventListener('change', (e) => {
    state.filters.minBeds = Number(e.target.value) || 0;
    applyFiltersAndRender();
  });

  dom.filterPropertyType.addEventListener('change', (e) => {
    state.filters.propertyType = e.target.value;
    applyFiltersAndRender();
  });

  dom.resetFiltersBtn.addEventListener('click', () => {
    state.filters.maxPrice = 'all';
    state.filters.minBeds = 0;
    state.filters.propertyType = 'all';
    dom.filterMaxPrice.value = 'all';
    dom.filterMinBeds.value = '0';
    dom.filterPropertyType.value = 'all';

    if (terraDraw) {
      terraDraw.clear();
      terraDraw.setMode('static');
    }
    state.searchPolygon = null;
    state.isDrawing = false;
    dom.drawAreaBtn.classList.remove('is-active');
    dom.drawAreaBtn.textContent = 'Draw Search Area';
    dom.clearAreaBtn.disabled = true;

    applyFiltersAndRender();
    if (map) {
      map.panTo(SF_CENTER);
      map.setZoom(13);
    }
    dom.mapStatusPill.textContent = 'Showing all San Francisco listings';
  });

  dom.drawAreaBtn.addEventListener('click', () => {
    if (!terraDraw) {
      dom.mapStatusPill.textContent = 'Map drawing initializes once Google Maps is loaded.';
      return;
    }

    if (state.isDrawing) {
      state.isDrawing = false;
      terraDraw.setMode(state.searchPolygon ? 'select' : 'static');
      dom.drawAreaBtn.classList.remove('is-active');
      dom.drawAreaBtn.textContent = 'Draw Search Area';
      dom.mapStatusPill.textContent = 'Polygon drawing cancelled';
      return;
    }

    terraDraw.clear();
    state.searchPolygon = null;
    dom.clearAreaBtn.disabled = true;
    state.isDrawing = true;
    terraDraw.setMode('polygon');
    dom.drawAreaBtn.classList.add('is-active');
    dom.drawAreaBtn.textContent = 'Cancel Drawing';
    dom.mapStatusPill.textContent =
      'Click on the map to add vertices, then click the first vertex to close your search polygon';
  });

  dom.clearAreaBtn.addEventListener('click', () => {
    if (terraDraw) {
      terraDraw.clear();
      terraDraw.setMode('static');
    }
    state.searchPolygon = null;
    state.isDrawing = false;
    dom.drawAreaBtn.classList.remove('is-active');
    dom.drawAreaBtn.textContent = 'Draw Search Area';
    dom.clearAreaBtn.disabled = true;
    applyFiltersAndRender();
    dom.mapStatusPill.textContent = 'Search polygon cleared';
  });

  dom.mapTypeToggle.addEventListener('click', () => {
    if (!map) return;
    const nextType = state.mapTypeId === 'roadmap' ? 'satellite' : 'roadmap';
    state.mapTypeId = nextType;
    map.setMapTypeId(nextType);
    const isSat = nextType === 'satellite';
    dom.mapTypeToggle.textContent = isSat ? 'Roadmap' : 'Satellite';
    dom.mapTypeToggle.classList.toggle('is-active', isSat);
    dom.mapTypeToggle.setAttribute('aria-pressed', String(isSat));
  });

  dom.amenityTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category || 'all';
      state.amenityCategory = category;
      dom.amenityTabs.forEach((btn) => {
        const active = btn === tab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      renderAmenitiesList();
    });
  });

  dom.commuteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void calculateCommute({ drawRoute: true });
  });

  dom.presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const dest = chip.dataset.dest || '';
      dom.workplaceInput.value = dest;
      void calculateCommute({ drawRoute: true });
    });
  });
}

async function initGoogleMaps() {
  if (!state.apiKey) {
    showApiBanner(
      'Google Maps API Key Not Configured',
      'Copy .env.example to .env and set GOOGLE_MAPS_API_KEY (or get a free Maps Demo Key) to enable interactive vector maps, Street View, Places (New), and Routes Matrix.'
    );
    dom.streetViewStatus.textContent = 'API key required';
    dom.amenitiesStatus.textContent = 'API key required';
    dom.commuteStatus.textContent = 'Add GOOGLE_MAPS_API_KEY in .env to compute live ETAs.';
    renderAmenitiesList();
    return;
  }

  window.gm_authFailure = () => {
    state.mapsReady = false;
    showApiBanner(
      'Google Maps Authentication Error',
      'Verify that GOOGLE_MAPS_API_KEY in .env is valid and has Maps JavaScript API, Places API (New), and Routes API enabled.'
    );
  };

  try {
    setOptions({
      key: state.apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });

    const [
      coreLib,
      mapsLib,
      markerLib,
      placesLib,
      routesLib,
      streetViewLib,
      geometryLib,
      geocodingLib,
    ] = await Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('streetView'),
      importLibrary('geometry'),
      importLibrary('geocoding'),
    ]);

    gmp = {
      LatLng: coreLib.LatLng,
      LatLngBounds: coreLib.LatLngBounds,
      Map: mapsLib.Map,
      Polygon: mapsLib.Polygon,
      InfoWindow: mapsLib.InfoWindow,
      AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
      Place: placesLib.Place,
      PlaceAutocompleteElement: placesLib.PlaceAutocompleteElement,
      SearchNearbyRankPreference: placesLib.SearchNearbyRankPreference,
      RouteMatrix: routesLib.RouteMatrix,
      Route: routesLib.Route,
      StreetViewPanorama: streetViewLib.StreetViewPanorama,
      StreetViewService: streetViewLib.StreetViewService,
      StreetViewStatus: streetViewLib.StreetViewStatus,
      poly: geometryLib.poly,
      spherical: geometryLib.spherical,
      Geocoder: geocodingLib.Geocoder,
    };

    map = new gmp.Map(dom.mapContainer, {
      center: SF_CENTER,
      zoom: 13,
      mapId: 'DEMO_MAP_ID',
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: true,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    streetViewService = new gmp.StreetViewService();
    state.mapsReady = true;
    hideApiBanner();

    map.addListener('projection_changed', () => {
      initTerraDraw();
    });
    if (map.getProjection()) {
      initTerraDraw();
    }

    initLocationAutocomplete();
    syncMapMarkers(getFilteredProperties());
    selectProperty(state.selectedPropertyId, { focusMap: false });
  } catch (err) {
    state.mapsReady = false;
    showApiBanner(
      'Unable to Initialize Google Maps Platform',
      err?.message || 'Check your network connection and GOOGLE_MAPS_API_KEY configuration.'
    );
  }
}

function bootstrap() {
  bindUIEvents();
  const initialFiltered = getFilteredProperties();
  renderPropertyList(initialFiltered);
  renderPropertyDetailHeader(getSelectedProperty());
  void initGoogleMaps();
}

bootstrap();
