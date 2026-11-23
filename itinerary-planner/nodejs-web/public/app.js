// Source: Google Maps Platform Code Assist (Dynamic Library Import loader pattern)

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const MAP_ID = 'DEMO_MAP_ID';

const DAY_COLORS = {
  1: '#0F766E',
  2: '#D97706',
};

const QUICK_DESTINATIONS = {
  tokyo: { key: 'tokyo', name: 'Tokyo', label: 'Tokyo, Japan', lat: 35.6812, lng: 139.7671 },
  kyoto: { key: 'kyoto', name: 'Kyoto', label: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681 },
  paris: { key: 'paris', name: 'Paris', label: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  london: { key: 'london', name: 'London', label: 'London, UK', lat: 51.5074, lng: -0.1278 },
  new_york: { key: 'new_york', name: 'New York', label: 'New York, USA', lat: 40.7128, lng: -74.006 },
  sydney: { key: 'sydney', name: 'Sydney', label: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
};

const state = {
  config: null,
  mapsReady: false,
  destination: { ...QUICK_DESTINATIONS.tokyo },
  activeDay: 1,
  activeCategory: 'attractions',
  travelMode: 'DRIVE',
  days: {
    1: [],
    2: [],
  },
  discoveryCache: {},
  routeInfo: null,
  tz: {
    timeZoneId: '',
    timeZoneName: 'Loading...',
    offsetSeconds: 0,
    source: 'pending',
  },
  clockTimer: null,
  selectedStreetViewPlace: null,
};

const gmp = {
  map: null,
  infoWindow: null,
  markers: [],
  polylines: [],
  panorama: null,
  svService: null,
  libs: {},
};

/**
 * Official Google Maps JavaScript API Dynamic Library Import bootstrapper.
 */
function bootstrapMapsJs(apiKey) {
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
          for (k in g) {
            e.set(
              k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()),
              g[k]
            );
          }
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
    internalUsageAttributionIds: ATTRIBUTION_ID,
  });
}

function showBanner(message) {
  const banner = document.getElementById('status-banner');
  banner.textContent = message;
  banner.classList.remove('hidden');
}

function hideBanner() {
  const banner = document.getElementById('status-banner');
  banner.textContent = '';
  banner.classList.add('hidden');
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistance(meters) {
  if (!meters || meters <= 0) return '0 km';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatUtcOffset(offsetSeconds) {
  const sign = offsetSeconds >= 0 ? '+' : '-';
  const abs = Math.abs(Math.round(offsetSeconds));
  const hours = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mins = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
}

function getTodayOpeningText(place) {
  const descriptions = place.weekdayDescriptions || [];
  if (descriptions.length === 0) {
    return 'Hours not listed';
  }
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  const googleIdx = jsDay === 0 ? 6 : jsDay - 1; // weekdayDescriptions starts Monday=0
  return descriptions[googleIdx] || descriptions[0];
}

function normalizePlace(raw, fallbackCategory) {
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }
  return {
    id: raw.id || `${lat.toFixed(5)},${lng.toFixed(5)}`,
    name: raw.displayName?.text || 'Unnamed Place',
    address: raw.formattedAddress || '',
    lat,
    lng,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    userRatingCount: typeof raw.userRatingCount === 'number' ? raw.userRatingCount : null,
    typeLabel: raw.primaryTypeDisplayName?.text || fallbackCategory,
    weekdayDescriptions: raw.regularOpeningHours?.weekdayDescriptions || [],
    photoName: raw.photos?.[0]?.name || null,
    googleMapsUri: raw.googleMapsUri || null,
  };
}

function updateClockDisplay() {
  const timeEl = document.getElementById('tz-time');
  const cityEl = document.getElementById('tz-city');
  const offsetEl = document.getElementById('tz-offset');
  const nameEl = document.getElementById('tz-name');

  cityEl.textContent = state.destination.name;
  offsetEl.textContent = formatUtcOffset(state.tz.offsetSeconds);
  nameEl.textContent = state.tz.timeZoneName;

  const now = new Date();
  if (state.tz.timeZoneId) {
    try {
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: state.tz.timeZoneId,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      timeEl.textContent = formatted;
      return;
    } catch {
      // Fall back to manual offset arithmetic below
    }
  }

  const shifted = new Date(now.getTime() + state.tz.offsetSeconds * 1000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
  timeEl.textContent = `${hh}:${mm}:${ss}`;
}

async function refreshTimezone(lat, lng, fallbackPlaceId, fallbackUtcOffsetMinutes) {
  try {
    const ts = Math.floor(Date.now() / 1000);
    const res = await fetch(
      `/api/timezone?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&timestamp=${ts}`
    );
    const data = await res.json();

    if (data.status === 'OK') {
      state.tz = {
        timeZoneId: data.timeZoneId || '',
        timeZoneName: data.timeZoneName || data.timeZoneId || 'Local Time',
        offsetSeconds: (data.rawOffset || 0) + (data.dstOffset || 0),
        source: 'timezone-api',
      };
      updateClockDisplay();
      return;
    }

    // Graceful Place.utcOffsetMinutes fallback (e.g. when using Maps Demo Key)
    let offsetMinutes =
      typeof fallbackUtcOffsetMinutes === 'number' ? fallbackUtcOffsetMinutes : null;

    if (offsetMinutes === null && fallbackPlaceId) {
      const detailsRes = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(fallbackPlaceId)}`
      );
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        if (typeof details.utcOffsetMinutes === 'number') {
          offsetMinutes = details.utcOffsetMinutes;
        }
      }
    }

    if (offsetMinutes !== null) {
      state.tz = {
        timeZoneId: '',
        timeZoneName: `${state.destination.name} Local Time (Places Offset)`,
        offsetSeconds: offsetMinutes * 60,
        source: 'places-utc-offset',
      };
      updateClockDisplay();
      return;
    }
  } catch {
    // Keep clean fallback below if offline/unavailable
  }

  state.tz = {
    timeZoneId: '',
    timeZoneName: 'Time zone unavailable without API key',
    offsetSeconds: 0,
    source: 'unavailable',
  };
  updateClockDisplay();
}

async function fetchDiscoveryCategory(category, dest) {
  const cacheKey = `${dest.name}:${dest.lat.toFixed(3)},${dest.lng.toFixed(3)}:${category}`;
  if (state.discoveryCache[cacheKey]) {
    return state.discoveryCache[cacheKey];
  }

  if (!state.config?.hasApiKey) {
    return [];
  }

  let response;
  if (category === 'attractions') {
    response = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: `top tourist attractions in ${dest.name}`,
        maxResultCount: 8,
        locationBias: { lat: dest.lat, lng: dest.lng, radius: 12000 },
      }),
    });
  } else if (category === 'restaurants') {
    response = await fetch('/api/places/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: dest.lat,
        lng: dest.lng,
        radius: 6000,
        includedPrimaryTypes: ['restaurant'],
        maxResultCount: 8,
        rankPreference: 'POPULARITY',
      }),
    });
  } else {
    response = await fetch('/api/places/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: dest.lat,
        lng: dest.lng,
        radius: 6000,
        includedPrimaryTypes: ['hotel'],
        maxResultCount: 8,
        rankPreference: 'POPULARITY',
      }),
    });
  }

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const labelMap = {
    attractions: 'Attraction',
    restaurants: 'Restaurant',
    hotels: 'Hotel',
  };
  const items = (data.places || [])
    .map((raw) => normalizePlace(raw, labelMap[category] || 'Place'))
    .filter(Boolean);

  state.discoveryCache[cacheKey] = items;
  return items;
}

function renderDiscoveryList(places, isLoading = false) {
  const container = document.getElementById('discovery-results-list');
  const fragment = document.createDocumentFragment();

  if (isLoading) {
    const loading = document.createElement('div');
    loading.className = 'empty-state';
    loading.textContent = `Discovering ${state.activeCategory} in ${state.destination.name}...`;
    fragment.append(loading);
    container.replaceChildren(fragment);
    return;
  }

  if (!places || places.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = state.config?.hasApiKey
      ? `No ${state.activeCategory} returned for ${state.destination.name}. Try another category or search.`
      : 'Configure GOOGLE_MAPS_API_KEY in .env to load live Places API (New) results.';
    fragment.append(empty);
    container.replaceChildren(fragment);
    return;
  }

  for (const place of places) {
    const card = document.createElement('article');
    card.className = 'place-card';

    const top = document.createElement('div');
    top.className = 'place-card-top';

    if (place.photoName) {
      const img = document.createElement('img');
      img.className = 'place-thumb';
      img.src = `/api/places/photo?name=${encodeURIComponent(place.photoName)}&maxWidthPx=360`;
      img.alt = place.name;
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'place-thumb-placeholder';
        placeholder.textContent = place.typeLabel || 'Place';
        img.replaceWith(placeholder);
      });
      top.append(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'place-thumb-placeholder';
      placeholder.textContent = place.typeLabel || 'Place';
      top.append(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'place-info';

    const nameEl = document.createElement('h3');
    nameEl.className = 'place-name';
    nameEl.textContent = place.name;
    info.append(nameEl);

    const metaRow = document.createElement('div');
    metaRow.className = 'place-type-row';

    if (place.rating !== null) {
      const ratingSpan = document.createElement('span');
      ratingSpan.className = 'place-rating';
      const countTxt =
        place.userRatingCount !== null
          ? ` (${place.userRatingCount.toLocaleString()})`
          : '';
      ratingSpan.textContent = `★ ${place.rating.toFixed(1)}${countTxt}`;
      metaRow.append(ratingSpan);
    }

    const typeSpan = document.createElement('span');
    typeSpan.textContent = place.typeLabel;
    metaRow.append(typeSpan);
    info.append(metaRow);

    if (place.address) {
      const addr = document.createElement('div');
      addr.className = 'place-address';
      addr.textContent = place.address;
      info.append(addr);
    }

    const hours = document.createElement('div');
    hours.className = 'place-hours';
    hours.textContent = getTodayOpeningText(place);
    info.append(hours);

    top.append(info);
    card.append(top);

    const actions = document.createElement('div');
    actions.className = 'place-card-actions';

    const addDay1Btn = document.createElement('button');
    addDay1Btn.type = 'button';
    addDay1Btn.className = 'btn-card day-1';
    addDay1Btn.textContent = '+ Day 1';
    addDay1Btn.addEventListener('click', () => addStopToDay(1, place));

    const addDay2Btn = document.createElement('button');
    addDay2Btn.type = 'button';
    addDay2Btn.className = 'btn-card day-2';
    addDay2Btn.textContent = '+ Day 2';
    addDay2Btn.addEventListener('click', () => addStopToDay(2, place));

    const svBtn = document.createElement('button');
    svBtn.type = 'button';
    svBtn.className = 'btn-card sv';
    svBtn.textContent = 'Street View';
    svBtn.addEventListener('click', () => inspectStreetView(place));

    actions.append(addDay1Btn, addDay2Btn, svBtn);
    card.append(actions);
    fragment.append(card);
  }

  container.replaceChildren(fragment);
}

function updateDayCounts() {
  document.getElementById('day-1-count').textContent = String(state.days[1].length);
  document.getElementById('day-2-count').textContent = String(state.days[2].length);

  const dayTabs = document.querySelectorAll('#itinerary-day-tabs .day-tab');
  dayTabs.forEach((btn) => {
    const day = Number(btn.getAttribute('data-day'));
    const isActive = day === state.activeDay;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  const activeStops = state.days[state.activeDay];
  const optBtn = document.getElementById('optimize-route-btn');
  optBtn.disabled = activeStops.length < 3 || state.travelMode === 'TRANSIT';
}

function renderItineraryStops() {
  updateDayCounts();
  const list = document.getElementById('itinerary-stops-list');
  const stops = state.days[state.activeDay];
  const fragment = document.createDocumentFragment();

  if (stops.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = `No stops in Day ${state.activeDay} yet. Add attractions, restaurants, or hotels below.`;
    fragment.append(empty);
    list.replaceChildren(fragment);
    return;
  }

  const legs = state.routeInfo?.legs || [];

  stops.forEach((stop, index) => {
    const item = document.createElement('li');
    item.className = 'stop-item';

    const badge = document.createElement('span');
    badge.className = `stop-number day-${state.activeDay}`;
    badge.textContent = String(index + 1);
    item.append(badge);

    const content = document.createElement('div');
    content.className = 'stop-content';

    const title = document.createElement('div');
    title.className = 'stop-title';
    title.textContent = stop.name;
    content.append(title);

    if (stop.address) {
      const addr = document.createElement('div');
      addr.className = 'stop-address';
      addr.textContent = stop.address;
      content.append(addr);
    }

    if (index < stops.length - 1 && legs[index]) {
      const leg = legs[index];
      const secMatch = /^(-?\d+(?:\.\d+)?)s$/.exec(String(leg.duration || ''));
      const legSec = secMatch ? Number.parseFloat(secMatch[1]) : 0;
      const legText = document.createElement('div');
      legText.className = 'stop-leg-info';
      legText.textContent = `Next stop: ${formatDuration(legSec)} · ${formatDistance(leg.distanceMeters || 0)}`;
      content.append(legText);
    }

    item.append(content);

    const actions = document.createElement('div');
    actions.className = 'stop-actions';

    const svBtn = document.createElement('button');
    svBtn.type = 'button';
    svBtn.className = 'icon-btn';
    svBtn.title = 'Inspect Street View';
    svBtn.setAttribute('aria-label', `Street View for ${stop.name}`);
    svBtn.textContent = 'SV';
    svBtn.addEventListener('click', () => inspectStreetView(stop));

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'icon-btn';
    upBtn.title = 'Move up';
    upBtn.setAttribute('aria-label', `Move ${stop.name} up`);
    upBtn.textContent = '↑';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => moveStop(index, -1));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'icon-btn';
    downBtn.title = 'Move down';
    downBtn.setAttribute('aria-label', `Move ${stop.name} down`);
    downBtn.textContent = '↓';
    downBtn.disabled = index === stops.length - 1;
    downBtn.addEventListener('click', () => moveStop(index, 1));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'icon-btn danger';
    removeBtn.title = 'Remove stop';
    removeBtn.setAttribute('aria-label', `Remove ${stop.name}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeStop(index));

    actions.append(svBtn, upBtn, downBtn, removeBtn);
    item.append(actions);
    fragment.append(item);
  });

  list.replaceChildren(fragment);
}

function renderRouteSummary(customText) {
  const bar = document.getElementById('route-summary-bar');
  const fragment = document.createDocumentFragment();

  if (customText) {
    const span = document.createElement('span');
    span.textContent = customText;
    fragment.append(span);
    bar.replaceChildren(fragment);
    return;
  }

  const stops = state.days[state.activeDay];
  if (stops.length < 2) {
    const span = document.createElement('span');
    span.textContent = 'Add at least 2 stops to compute a multi-stop route.';
    fragment.append(span);
    bar.replaceChildren(fragment);
    return;
  }

  if (!state.routeInfo) {
    const span = document.createElement('span');
    span.textContent = 'Route summary ready.';
    fragment.append(span);
    bar.replaceChildren(fragment);
    return;
  }

  const left = document.createElement('span');
  const metric = document.createElement('span');
  metric.className = 'route-summary-metric';
  metric.textContent = `${formatDuration(state.routeInfo.durationSeconds)} · ${formatDistance(
    state.routeInfo.distanceMeters
  )}`;
  left.append(metric, document.createTextNode(` (${stops.length} stops)`));

  const right = document.createElement('span');
  right.textContent = state.routeInfo.note || `Day ${state.activeDay} · ${state.travelMode}`;

  fragment.append(left, right);
  bar.replaceChildren(fragment);
}

function clearMapOverlays() {
  for (const marker of gmp.markers) {
    marker.map = null;
  }
  gmp.markers = [];

  for (const line of gmp.polylines) {
    line.setMap(null);
  }
  gmp.polylines = [];
}

function buildInfoWindowContent(stop, stopIndex) {
  const wrap = document.createElement('div');
  wrap.style.maxWidth = '240px';
  wrap.style.fontFamily = 'Inter, sans-serif';

  const title = document.createElement('strong');
  title.style.display = 'block';
  title.style.fontSize = '13px';
  title.style.marginBottom = '4px';
  title.textContent = `Day ${state.activeDay} · Stop ${stopIndex + 1}: ${stop.name}`;
  wrap.append(title);

  if (stop.address) {
    const addr = document.createElement('div');
    addr.style.fontSize = '11px';
    addr.style.color = '#475569';
    addr.style.marginBottom = '6px';
    addr.textContent = stop.address;
    wrap.append(addr);
  }

  if (stop.rating !== null) {
    const rating = document.createElement('div');
    rating.style.fontSize = '11px';
    rating.style.fontWeight = '600';
    rating.style.color = '#b45309';
    rating.textContent = `★ ${stop.rating.toFixed(1)}`;
    wrap.append(rating);
  }

  return wrap;
}

function renderMapMarkersAndPolyline() {
  if (!state.mapsReady || !gmp.map) return;

  clearMapOverlays();

  const { AdvancedMarkerElement, PinElement } = gmp.libs.marker;
  const { encoding } = gmp.libs.geometry;
  const { LatLngBounds } = gmp.libs.core;

  const stops = state.days[state.activeDay];
  const dayColor = DAY_COLORS[state.activeDay];
  const bounds = new LatLngBounds();
  let hasBounds = false;

  stops.forEach((stop, index) => {
    const position = { lat: stop.lat, lng: stop.lng };
    bounds.extend(position);
    hasBounds = true;

    const pin = new PinElement({
      glyphText: String(index + 1),
      background: dayColor,
      borderColor: '#FFFFFF',
      glyphColor: '#FFFFFF',
      scale: 1.15,
    });

    const marker = new AdvancedMarkerElement({
      map: gmp.map,
      position,
      content: pin,
      title: `${index + 1}. ${stop.name}`,
      gmpClickable: true,
    });

    marker.addListener('click', () => {
      if (gmp.infoWindow) {
        gmp.infoWindow.close();
        gmp.infoWindow.setContent(buildInfoWindowContent(stop, index));
        gmp.infoWindow.open({ map: gmp.map, anchor: marker });
      }
      inspectStreetView(stop);
    });

    gmp.markers.push(marker);
  });

  const encodedList = state.routeInfo?.encodedPolylines || [];
  for (const encoded of encodedList) {
    if (!encoded) continue;
    const path = encoding.decodePath(encoded);
    path.forEach((pt) => {
      bounds.extend(pt);
      hasBounds = true;
    });
    const polyline = new google.maps.Polyline({
      path,
      map: gmp.map,
      strokeColor: dayColor,
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    gmp.polylines.push(polyline);
  }

  if (hasBounds) {
    if (stops.length === 1 && encodedList.length === 0) {
      gmp.map.setCenter({ lat: stops[0].lat, lng: stops[0].lng });
      gmp.map.setZoom(14);
    } else {
      gmp.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  } else {
    gmp.map.setCenter({ lat: state.destination.lat, lng: state.destination.lng });
    gmp.map.setZoom(12);
  }
}

async function computeActiveDayRoute(optimizeWaypointOrder = false) {
  const stops = state.days[state.activeDay];
  if (stops.length < 2) {
    state.routeInfo = null;
    renderRouteSummary();
    renderItineraryStops();
    renderMapMarkersAndPolyline();
    return;
  }

  if (!state.config?.hasApiKey) {
    state.routeInfo = null;
    renderRouteSummary('Configure GOOGLE_MAPS_API_KEY to compute Routes API paths.');
    renderItineraryStops();
    return;
  }

  renderRouteSummary(
    optimizeWaypointOrder
      ? `Optimizing Day ${state.activeDay} stop order...`
      : `Computing Day ${state.activeDay} ${state.travelMode.toLowerCase()} route...`
  );

  try {
    const res = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stops: stops.map((s) => ({
          lat: s.lat,
          lng: s.lng,
          placeId: s.id,
          name: s.name,
        })),
        travelMode: state.travelMode,
        optimizeWaypointOrder,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      state.routeInfo = null;
      renderRouteSummary(data.error || 'Could not compute route.');
      renderItineraryStops();
      renderMapMarkersAndPolyline();
      return;
    }

    if (
      optimizeWaypointOrder &&
      Array.isArray(data.optimizedIntermediateWaypointIndex) &&
      data.optimizedIntermediateWaypointIndex.length === stops.length - 2 &&
      stops.length >= 3
    ) {
      const first = stops[0];
      const last = stops[stops.length - 1];
      const intermediates = stops.slice(1, -1);
      const reordered = data.optimizedIntermediateWaypointIndex.map((idx) => intermediates[idx]);
      if (reordered.every(Boolean)) {
        state.days[state.activeDay] = [first, ...reordered, last];
      }
    }

    state.routeInfo = data;
    renderRouteSummary();
    renderItineraryStops();
    renderMapMarkersAndPolyline();
  } catch {
    state.routeInfo = null;
    renderRouteSummary('Route calculation failed.');
    renderItineraryStops();
    renderMapMarkersAndPolyline();
  }
}

async function addStopToDay(day, place) {
  const targetDay = state.days[day];
  if (!targetDay.some((s) => s.id === place.id)) {
    targetDay.push({ ...place });
  }
  if (state.activeDay !== day) {
    state.activeDay = day;
  }
  await computeActiveDayRoute(false);
}

async function moveStop(index, delta) {
  const stops = state.days[state.activeDay];
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= stops.length) return;
  const temp = stops[index];
  stops[index] = stops[nextIndex];
  stops[nextIndex] = temp;
  await computeActiveDayRoute(false);
}

async function removeStop(index) {
  state.days[state.activeDay].splice(index, 1);
  await computeActiveDayRoute(false);
}

async function inspectStreetView(place) {
  if (!place) return;
  state.selectedStreetViewPlace = place;

  const titleEl = document.getElementById('street-view-title');
  const metaEl = document.getElementById('street-view-meta');
  const emptyEl = document.getElementById('street-view-empty');

  titleEl.textContent = place.name;
  metaEl.textContent = 'Locating panorama...';

  if (!state.mapsReady || !gmp.svService || !gmp.panorama) {
    emptyEl.classList.remove('hidden');
    metaEl.textContent = 'Maps JS API required';
    return;
  }

  const targetLoc = { lat: place.lat, lng: place.lng };

  const tryRadius = async (radius) => {
    return gmp.svService.getPanorama({
      location: targetLoc,
      radius,
      preference: gmp.libs.streetView.StreetViewPreference.BEST,
    });
  };

  try {
    let response;
    try {
      response = await tryRadius(150);
    } catch {
      response = await tryRadius(600);
    }

    const panoData = response?.data;
    const panoLocation = panoData?.location;
    if (!panoLocation?.pano) {
      throw new Error('No Street View pano');
    }

    emptyEl.classList.add('hidden');
    gmp.panorama.setPano(panoLocation.pano);

    let heading = 0;
    if (panoLocation.latLng && gmp.libs.geometry?.spherical) {
      heading = gmp.libs.geometry.spherical.computeHeading(panoLocation.latLng, targetLoc);
    }

    gmp.panorama.setPov({ heading, pitch: 5 });
    gmp.panorama.setVisible(true);
    metaEl.textContent = panoLocation.description || place.address || 'Street View active';
  } catch {
    gmp.panorama.setVisible(false);
    emptyEl.classList.remove('hidden');
    metaEl.textContent = 'No nearby panorama';
  }
}

async function loadDestination(dest, fallbackPlaceId = null, fallbackUtcOffsetMinutes = null) {
  state.destination = { ...dest };
  document.getElementById('active-destination-pill').textContent = dest.name;

  if (gmp.map) {
    gmp.map.setCenter({ lat: dest.lat, lng: dest.lng });
    gmp.map.setZoom(12);
  }

  // Run Time Zone + initial discovery in parallel
  const tzPromise = refreshTimezone(
    dest.lat,
    dest.lng,
    fallbackPlaceId,
    fallbackUtcOffsetMinutes
  );

  renderDiscoveryList([], true);
  const [attractions, hotels] = await Promise.all([
    fetchDiscoveryCategory('attractions', dest),
    fetchDiscoveryCategory('hotels', dest),
    tzPromise,
  ]);

  // Seed Day 1 and Day 2 with real live Places API results for the active destination
  state.days[1] = attractions.slice(0, 3);
  state.days[2] = [...attractions.slice(3, 5), ...hotels.slice(0, 1)].filter(Boolean);
  if (state.days[2].length === 0 && attractions.length > 0) {
    state.days[2] = attractions.slice(0, 2);
  }

  state.activeDay = 1;
  const activePlaces =
    state.activeCategory === 'attractions'
      ? attractions
      : state.activeCategory === 'hotels'
        ? hotels
        : await fetchDiscoveryCategory(state.activeCategory, dest);

  renderDiscoveryList(activePlaces, false);
  await computeActiveDayRoute(false);

  const firstInspect = state.days[1][0] || activePlaces[0];
  if (firstInspect) {
    await inspectStreetView(firstInspect);
  }
}

function setupAutocompleteWidget() {
  const mount = document.getElementById('destination-search-mount');

  if (!state.mapsReady || !gmp.libs.places?.PlaceAutocompleteElement) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fallback-search-input';
    input.placeholder = 'Search city or landmark (API key needed for autocomplete)';
    input.setAttribute('data-testid', 'destination-search-input');
    input.setAttribute('aria-label', 'Destination search');
    mount.replaceChildren(input);
    return;
  }

  const { PlaceAutocompleteElement } = gmp.libs.places;
  const autocomplete = new PlaceAutocompleteElement({
    placeholder: 'Search destination city or landmark...',
  });
  autocomplete.setAttribute('data-testid', 'destination-search-input');
  autocomplete.setAttribute('aria-label', 'Destination search');

  autocomplete.addEventListener('gmp-select', async (event) => {
    try {
      const prediction = event.placePrediction;
      if (!prediction) return;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'viewport',
          'utcOffsetMinutes',
        ],
      });
      if (!place.location) return;
      const lat = place.location.lat();
      const lng = place.location.lng();
      const name = place.displayName || place.formattedAddress || 'Selected Destination';

      await loadDestination(
        {
          key: 'custom',
          name,
          label: place.formattedAddress || name,
          lat,
          lng,
        },
        place.id || null,
        typeof place.utcOffsetMinutes === 'number' ? place.utcOffsetMinutes : null
      );
    } catch {
      // Ignore transient place fetch failures gracefully
    }
  });

  autocomplete.addEventListener('gmp-error', () => {
    // Handled silently to prevent uncaught widget errors
  });

  mount.replaceChildren(autocomplete);
}

function bindUiListeners() {
  document.getElementById('destination-quick-select').addEventListener('change', async (e) => {
    const key = e.target.value;
    const dest = QUICK_DESTINATIONS[key];
    if (dest) {
      await loadDestination(dest);
    }
  });

  document.querySelectorAll('#itinerary-day-tabs .day-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const day = Number(btn.getAttribute('data-day'));
      if (day === 1 || day === 2) {
        state.activeDay = day;
        await computeActiveDayRoute(false);
        const firstStop = state.days[day][0];
        if (firstStop) {
          await inspectStreetView(firstStop);
        }
      }
    });
  });

  document.getElementById('travel-mode-select').addEventListener('change', async (e) => {
    state.travelMode = e.target.value;
    updateDayCounts();
    await computeActiveDayRoute(false);
  });

  document.getElementById('optimize-route-btn').addEventListener('click', async () => {
    await computeActiveDayRoute(true);
  });

  document.querySelectorAll('#discovery-category-tabs .category-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const category = btn.getAttribute('data-category');
      if (!category) return;
      state.activeCategory = category;

      document.querySelectorAll('#discovery-category-tabs .category-tab').forEach((tab) => {
        const isActive = tab.getAttribute('data-category') === category;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      renderDiscoveryList([], true);
      const places = await fetchDiscoveryCategory(category, state.destination);
      renderDiscoveryList(places, false);
    });
  });
}

async function initApp() {
  bindUiListeners();

  try {
    const configRes = await fetch('/api/config');
    state.config = await configRes.json();
  } catch {
    state.config = { hasApiKey: false, mapsApiKey: '', mapId: MAP_ID };
  }

  state.clockTimer = setInterval(updateClockDisplay, 1000);

  if (!state.config.hasApiKey || !state.config.mapsApiKey) {
    showBanner(
      'GOOGLE_MAPS_API_KEY is not configured in .env. Copy .env.example to .env and add your Google Maps API key to enable live Maps, Places, Routes, Time Zone, and Street View.'
    );
    setupAutocompleteWidget();
    renderDiscoveryList([], false);
    renderItineraryStops();
    renderRouteSummary('API key required for route calculation.');
    updateClockDisplay();
    return;
  }

  hideBanner();

  try {
    bootstrapMapsJs(state.config.mapsApiKey);

    const [mapsLib, markerLib, placesLib, routesLib, streetViewLib, geometryLib, coreLib] =
      await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('routes'),
        google.maps.importLibrary('streetView'),
        google.maps.importLibrary('geometry'),
        google.maps.importLibrary('core'),
      ]);

    gmp.libs = {
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      streetView: streetViewLib,
      geometry: geometryLib,
      core: coreLib,
    };

    gmp.map = new mapsLib.Map(document.getElementById('map'), {
      center: { lat: QUICK_DESTINATIONS.tokyo.lat, lng: QUICK_DESTINATIONS.tokyo.lng },
      zoom: 12,
      mapId: MAP_ID,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    gmp.infoWindow = new mapsLib.InfoWindow();
    gmp.svService = new streetViewLib.StreetViewService();
    gmp.panorama = new streetViewLib.StreetViewPanorama(
      document.getElementById('street-view-pano'),
      {
        addressControl: false,
        linksControl: true,
        panControl: true,
        enableCloseButton: false,
        visible: false,
      }
    );

    state.mapsReady = true;
    setupAutocompleteWidget();

    // Pre-seed Tokyo on load using live Places API (New), Routes API, Time Zone API, and Street View
    await loadDestination(QUICK_DESTINATIONS.tokyo);
  } catch (err) {
    showBanner(
      `Unable to initialize Google Maps Platform libraries: ${
        err instanceof Error ? err.message : 'Check API key configuration.'
      }`
    );
    setupAutocompleteWidget();
    renderDiscoveryList([], false);
    renderItineraryStops();
  }
}

void initApp();
