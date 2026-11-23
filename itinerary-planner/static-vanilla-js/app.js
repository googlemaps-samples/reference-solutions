import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const DAY_CONFIG = {
  1: { label: 'Day 1', color: '#0F766E', borderColor: '#115E59' },
  2: { label: 'Day 2', color: '#D97706', borderColor: '#B45309' },
};

const CITY_PRESETS = {
  tokyo: {
    key: 'tokyo',
    name: 'Tokyo',
    label: 'Tokyo, Japan',
    lat: 35.6812,
    lng: 139.7671,
    zoom: 12,
    fallbackTzId: 'Asia/Tokyo',
    fallbackTzName: 'Japan Standard Time',
    fallbackOffsetSeconds: 9 * 3600,
  },
  kyoto: {
    key: 'kyoto',
    name: 'Kyoto',
    label: 'Kyoto, Japan',
    lat: 35.0116,
    lng: 135.7681,
    zoom: 12,
    fallbackTzId: 'Asia/Tokyo',
    fallbackTzName: 'Japan Standard Time',
    fallbackOffsetSeconds: 9 * 3600,
  },
  london: {
    key: 'london',
    name: 'London',
    label: 'London, UK',
    lat: 51.5072,
    lng: -0.1276,
    zoom: 12,
    fallbackTzId: 'Europe/London',
    fallbackTzName: 'British Time',
    fallbackOffsetSeconds: 0,
  },
  new_york: {
    key: 'new_york',
    name: 'New York',
    label: 'New York, USA',
    lat: 40.758,
    lng: -73.9855,
    zoom: 12,
    fallbackTzId: 'America/New_York',
    fallbackTzName: 'Eastern Time',
    fallbackOffsetSeconds: -5 * 3600,
  },
  paris: {
    key: 'paris',
    name: 'Paris',
    label: 'Paris, France',
    lat: 48.8566,
    lng: 2.3522,
    zoom: 12,
    fallbackTzId: 'Europe/Paris',
    fallbackTzName: 'Central European Time',
    fallbackOffsetSeconds: 3600,
  },
  sydney: {
    key: 'sydney',
    name: 'Sydney',
    label: 'Sydney, Australia',
    lat: -33.8688,
    lng: 151.2093,
    zoom: 12,
    fallbackTzId: 'Australia/Sydney',
    fallbackTzName: 'Australian Eastern Time',
    fallbackOffsetSeconds: 10 * 3600,
  },
};

const CATEGORY_CONFIG = {
  attractions: {
    label: 'Attractions',
    querySuffix: 'top tourist attractions',
    includedType: 'tourist_attraction',
  },
  restaurants: {
    label: 'Restaurants',
    querySuffix: 'top rated restaurants',
    includedType: 'restaurant',
  },
  hotels: {
    label: 'Hotels',
    querySuffix: 'best rated hotels',
    includedType: 'lodging',
  },
};

const PLACE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'viewport',
  'rating',
  'userRatingCount',
  'regularOpeningHours',
  'photos',
  'primaryTypeDisplayName',
  'priceLevel',
  'googleMapsURI',
  'utcOffsetMinutes',
  'timeZone',
  'types',
];

const state = {
  apiKey: window.__GMP_CONFIG__?.apiKey || '',
  activeCity: { ...CITY_PRESETS.tokyo },
  activeDay: 1,
  activeCategory: 'attractions',
  travelMode: 'DRIVING',
  selectedPlaceId: null,
  discoveryCache: {
    attractions: [],
    restaurants: [],
    hotels: [],
  },
  itinerary: {
    1: [],
    2: [],
  },
  routeMeta: {
    1: null,
    2: null,
  },
  timezone: {
    cityName: 'Tokyo',
    timeZoneId: 'Asia/Tokyo',
    timeZoneName: 'Japan Standard Time',
    totalOffsetSeconds: 9 * 3600,
    source: 'Preset',
  },
  gmp: null,
  map: null,
  infoWindow: null,
  panorama: null,
  streetViewService: null,
  markers: [],
  polylines: [],
  clockTimerId: null,
};

const dom = {
  searchWrapper: document.querySelector('[data-testid="destination-search-input"]'),
  fallbackSearchInput: document.getElementById('fallback-search-input'),
  quickSelect: document.getElementById('destination-quick-select'),
  tzCityName: document.getElementById('tz-city-name'),
  tzLocalClock: document.getElementById('tz-local-clock'),
  tzUtcOffset: document.getElementById('tz-utc-offset'),
  tzZoneName: document.getElementById('tz-zone-name'),
  dayTabs: document.querySelectorAll('.day-tab'),
  day1Count: document.getElementById('day-1-count'),
  day2Count: document.getElementById('day-2-count'),
  travelModeSelect: document.getElementById('travel-mode-select'),
  optimizeBtn: document.getElementById('optimize-route-btn'),
  routeSummaryBar: document.getElementById('route-summary-bar'),
  stopsList: document.getElementById('itinerary-stops-list'),
  categoryTabs: document.querySelectorAll('.cat-tab'),
  discoveryCaption: document.getElementById('discovery-caption'),
  discoveryResultsList: document.getElementById('discovery-results-list'),
  statusBanner: document.getElementById('status-banner'),
  mapContainer: document.getElementById('map-container'),
  svPlaceName: document.getElementById('sv-place-name'),
  svStatusText: document.getElementById('sv-status-text'),
  svCanvas: document.getElementById('street-view-canvas'),
  svEmptyState: document.getElementById('sv-empty-state'),
};

function createEl(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.attrs) {
    for (const [key, val] of Object.entries(options.attrs)) {
      if (val !== undefined && val !== null) {
        node.setAttribute(key, String(val));
      }
    }
  }
  if (options.dataset) {
    for (const [key, val] of Object.entries(options.dataset)) {
      if (val !== undefined && val !== null) {
        node.dataset[key] = String(val);
      }
    }
  }
  if (options.onClick) {
    node.addEventListener('click', options.onClick);
  }
  for (const child of children) {
    if (child !== null && child !== undefined) {
      node.append(child);
    }
  }
  return node;
}

function showStatusBanner(message) {
  if (!message) {
    dom.statusBanner.classList.add('hidden');
    dom.statusBanner.textContent = '';
    return;
  }
  dom.statusBanner.textContent = message;
  dom.statusBanner.classList.remove('hidden');
}

function formatUtcOffset(totalSeconds) {
  const sign = totalSeconds >= 0 ? '+' : '-';
  const absMinutes = Math.round(Math.abs(totalSeconds) / 60);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const mins = String(absMinutes % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
}

function renderTimeZoneClock() {
  const { cityName, timeZoneId, timeZoneName, totalOffsetSeconds } = state.timezone;
  dom.tzCityName.textContent = cityName;
  dom.tzUtcOffset.textContent = formatUtcOffset(totalOffsetSeconds);
  dom.tzZoneName.textContent = timeZoneName || timeZoneId || 'Local Time';

  const now = new Date();
  try {
    if (timeZoneId) {
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZoneId,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);
      dom.tzLocalClock.textContent = formatted;
      return;
    }
  } catch {
    // Fall back to offset calculation if IANA timeZoneId is unavailable or unsupported.
  }

  const shifted = new Date(now.getTime() + totalOffsetSeconds * 1000);
  const formattedUtc = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(shifted);
  dom.tzLocalClock.textContent = formattedUtc;
}

function startClockTicker() {
  if (state.clockTimerId) {
    window.clearInterval(state.clockTimerId);
  }
  renderTimeZoneClock();
  state.clockTimerId = window.setInterval(renderTimeZoneClock, 1000);
}

async function updateTimeZoneForLocation(lat, lng, cityName, placeFallback = null) {
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const res = await fetch(
      `/api/timezone?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&timestamp=${timestamp}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.timeZoneId) {
        const totalOffsetSeconds = (data.rawOffset || 0) + (data.dstOffset || 0);
        state.timezone = {
          cityName,
          timeZoneId: data.timeZoneId,
          timeZoneName: data.timeZoneName || data.timeZoneId,
          totalOffsetSeconds,
          source: 'Time Zone API',
        };
        renderTimeZoneClock();
        return;
      }
    }
  } catch {
    // Graceful fallback below.
  }

  // Fallback to Place.timeZone / Place.utcOffsetMinutes from Places API (New)
  const placeTzId = placeFallback?.timeZone?.id || null;
  const utcMinutes =
    typeof placeFallback?.utcOffsetMinutes === 'number'
      ? placeFallback.utcOffsetMinutes
      : null;

  if (placeTzId || utcMinutes !== null) {
    state.timezone = {
      cityName,
      timeZoneId: placeTzId,
      timeZoneName: placeTzId || 'Destination Local Time',
      totalOffsetSeconds:
        utcMinutes !== null ? utcMinutes * 60 : state.activeCity.fallbackOffsetSeconds || 0,
      source: 'Place Offset',
    };
    renderTimeZoneClock();
    return;
  }

  state.timezone = {
    cityName,
    timeZoneId: state.activeCity.fallbackTzId || null,
    timeZoneName: state.activeCity.fallbackTzName || 'Local Time',
    totalOffsetSeconds: state.activeCity.fallbackOffsetSeconds || 0,
    source: 'City Preset',
  };
  renderTimeZoneClock();
}

function toNumberLatLng(location) {
  if (!location) return null;
  const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
  const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

function getTodayHoursSummary(regularOpeningHours) {
  const descriptions = regularOpeningHours?.weekdayDescriptions;
  if (!Array.isArray(descriptions) || descriptions.length === 0) {
    return 'Hours not listed';
  }
  // JS getDay(): 0=Sun..6=Sat; weekdayDescriptions starts Monday (index 0)
  const jsDay = new Date().getDay();
  const mondayIndex = (jsDay + 6) % 7;
  return descriptions[mondayIndex] || descriptions[0];
}

function serializePlace(place, categoryTag = 'place') {
  const coords = toNumberLatLng(place.location);
  if (!coords) return null;

  let photoUrl = null;
  if (Array.isArray(place.photos) && place.photos.length > 0) {
    try {
      photoUrl = place.photos[0].getURI({ maxWidth: 480, maxHeight: 320 });
    } catch {
      photoUrl = null;
    }
  }

  return {
    id: place.id || `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
    name: place.displayName || 'Unnamed Place',
    address: place.formattedAddress || '',
    lat: coords.lat,
    lng: coords.lng,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    categoryLabel: place.primaryTypeDisplayName || categoryTag,
    hoursSummary: getTodayHoursSummary(place.regularOpeningHours),
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions || [],
    photoUrl,
    googleMapsURI: place.googleMapsURI || null,
    utcOffsetMinutes:
      typeof place.utcOffsetMinutes === 'number' ? place.utcOffsetMinutes : null,
    timeZoneId: place.timeZone?.id || null,
  };
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDurationMillis(ms) {
  if (!Number.isFinite(ms)) return '--';
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
}

function clearMapOverlays() {
  for (const marker of state.markers) {
    marker.map = null;
  }
  state.markers = [];

  for (const polyline of state.polylines) {
    polyline.setMap(null);
  }
  state.polylines = [];
}

function buildInfoWindowContent(stop, stopIndex) {
  const wrapper = createEl('div', { className: 'gm-info-card' });
  const title = createEl('h3', {
    className: 'gm-info-title',
    text: `${stopIndex + 1}. ${stop.name}`,
  });
  const ratingText = stop.rating ? `★ ${stop.rating.toFixed(1)}` : 'No rating';
  const meta = createEl('p', {
    className: 'gm-info-meta',
    text: `${stop.categoryLabel} · ${ratingText}${stop.address ? ` · ${stop.address}` : ''}`,
  });
  const actions = createEl('div', { className: 'gm-info-actions' });
  const svBtn = createEl('button', {
    className: 'btn-street-view',
    text: 'Inspect Street View',
    attrs: { type: 'button' },
    onClick: () => {
      void inspectStreetView(stop);
    },
  });
  actions.append(svBtn);
  wrapper.append(title, meta, actions);
  return wrapper;
}

function renderActiveDayMarkers(fitToStops = false) {
  if (!state.map || !state.gmp) return;

  for (const marker of state.markers) {
    marker.map = null;
  }
  state.markers = [];

  const { AdvancedMarkerElement, PinElement } = state.gmp;
  const { LatLngBounds } = state.gmp;
  const stops = state.itinerary[state.activeDay];
  const dayTheme = DAY_CONFIG[state.activeDay];
  const bounds = new LatLngBounds();

  stops.forEach((stop, index) => {
    const position = { lat: stop.lat, lng: stop.lng };
    const pin = new PinElement({
      glyphText: String(index + 1),
      glyphColor: '#FFFFFF',
      background: dayTheme.color,
      borderColor: dayTheme.borderColor,
      scale: stop.id === state.selectedPlaceId ? 1.25 : 1.05,
    });

    const marker = new AdvancedMarkerElement({
      map: state.map,
      position,
      title: `${dayTheme.label} Stop ${index + 1}: ${stop.name}`,
      zIndex: stop.id === state.selectedPlaceId ? 200 : 100 + index,
    });
    marker.append(pin);

    // Use standard DOM 'click' event on AdvancedMarkerElement for weekly channel compatibility
    marker.addEventListener('click', () => {
      state.selectedPlaceId = stop.id;
      if (state.infoWindow) {
        state.infoWindow.setContent(buildInfoWindowContent(stop, index));
        state.infoWindow.open({ anchor: marker, map: state.map });
      }
      renderItinerary();
      renderDiscoveryResults();
      void inspectStreetView(stop);
    });

    state.markers.push(marker);
    bounds.extend(position);
  });

  if (fitToStops && stops.length > 1) {
    state.map.fitBounds(bounds, 56);
  } else if (fitToStops && stops.length === 1) {
    state.map.panTo({ lat: stops[0].lat, lng: stops[0].lng });
    state.map.setZoom(14);
  }
}

function computeHeadingDegrees(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

async function inspectStreetView(place) {
  if (!place) return;
  state.selectedPlaceId = place.id;
  dom.svPlaceName.textContent = place.name;

  if (!state.gmp || !state.streetViewService || !state.panorama) {
    dom.svStatusText.textContent = 'API key required';
    return;
  }

  const { StreetViewPreference, StreetViewStatus } = state.gmp;
  const target = { lat: place.lat, lng: place.lng };
  dom.svStatusText.textContent = 'Loading panorama...';

  const tryRadius = async (radius) => {
    try {
      const response = await state.streetViewService.getPanorama({
        location: target,
        radius,
        preference: StreetViewPreference.BEST,
      });
      return response?.data || null;
    } catch {
      return null;
    }
  };

  let panoData = await tryRadius(150);
  if (!panoData) {
    panoData = await tryRadius(500);
  }

  if (panoData && panoData.location?.pano) {
    dom.svEmptyState.classList.add('hidden');
    const panoLatLng = toNumberLatLng(panoData.location.latLng);
    const heading = panoLatLng ? computeHeadingDegrees(panoLatLng, target) : 0;

    state.panorama.setPano(panoData.location.pano);
    state.panorama.setPov({ heading, pitch: 2 });
    state.panorama.setVisible(true);

    const dateLabel = panoData.imageDate ? ` · Captured ${panoData.imageDate}` : '';
    dom.svStatusText.textContent = `Interactive 360°${dateLabel}`;
    if (StreetViewStatus.OK) {
      // Reference kept explicit for clarity
    }
  } else {
    state.panorama.setVisible(false);
    dom.svEmptyState.textContent = `No Street View panorama available within 500m of ${place.name}.`;
    dom.svEmptyState.classList.remove('hidden');
    dom.svStatusText.textContent = 'Unavailable nearby';
  }
}

function focusPlaceOnMap(place) {
  state.selectedPlaceId = place.id;
  if (state.map) {
    state.map.panTo({ lat: place.lat, lng: place.lng });
    if ((state.map.getZoom() || 12) < 14) {
      state.map.setZoom(14);
    }
  }
  renderActiveDayMarkers(false);
  renderItinerary();
  renderDiscoveryResults();
  void inspectStreetView(place);
}

async function computeActiveDayRoute({ optimize = false, fitBounds = true } = {}) {
  const day = state.activeDay;
  const stops = state.itinerary[day];
  const dayTheme = DAY_CONFIG[day];

  for (const polyline of state.polylines) {
    polyline.setMap(null);
  }
  state.polylines = [];

  if (stops.length < 2) {
    state.routeMeta[day] = null;
    renderRouteSummary();
    renderActiveDayMarkers(fitBounds);
    renderItinerary();
    return;
  }

  if (!state.gmp) {
    renderRouteSummary();
    return;
  }

  const { Route, TravelMode } = state.gmp;
  const modeKey = state.travelMode;
  const travelMode = TravelMode?.[modeKey] || modeKey;

  dom.routeSummaryBar.textContent = optimize
    ? 'Optimizing waypoint order via Routes API...'
    : 'Calculating multi-stop route via Routes API...';

  try {
    // If optimizing in TRANSIT mode with intermediates, first optimize order via WALKING/DRIVING
    if (optimize && stops.length > 2 && modeKey === 'TRANSIT') {
      const optRequest = {
        origin: { lat: stops[0].lat, lng: stops[0].lng },
        destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
        intermediates: stops.slice(1, -1).map((s) => ({
          location: { lat: s.lat, lng: s.lng },
        })),
        travelMode: TravelMode?.WALKING || 'WALKING',
        optimizeWaypointOrder: true,
        fields: ['optimizedIntermediateWaypointIndices'],
      };
      const optRes = await Route.computeRoutes(optRequest);
      const order = optRes?.routes?.[0]?.optimizedIntermediateWaypointIndices;
      if (Array.isArray(order) && order.length === stops.length - 2) {
        const middle = stops.slice(1, -1);
        const reorderedMiddle = order.map((idx) => middle[idx]);
        state.itinerary[day] = [stops[0], ...reorderedMiddle, stops[stops.length - 1]];
      }
    }

    const currentStops = state.itinerary[day];

    // TRANSIT mode does not support intermediate waypoints in a single request; compute sequential legs.
    if (modeKey === 'TRANSIT' && currentStops.length > 2) {
      let totalDistanceMeters = 0;
      let totalDurationMillis = 0;
      const legSummaries = [];

      for (let i = 0; i < currentStops.length - 1; i += 1) {
        const origin = { lat: currentStops[i].lat, lng: currentStops[i].lng };
        const destination = { lat: currentStops[i + 1].lat, lng: currentStops[i + 1].lng };
        let legRes = await Route.computeRoutes({
          origin,
          destination,
          travelMode: TravelMode?.TRANSIT || 'TRANSIT',
          fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
        });

        if (!legRes?.routes?.length) {
          legRes = await Route.computeRoutes({
            origin,
            destination,
            travelMode: TravelMode?.WALKING || 'WALKING',
            fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
          });
        }

        const legRoute = legRes?.routes?.[0];
        if (legRoute) {
          totalDistanceMeters += legRoute.distanceMeters || 0;
          totalDurationMillis += legRoute.durationMillis || 0;
          legSummaries.push({
            distanceMeters: legRoute.distanceMeters || 0,
            durationMillis: legRoute.durationMillis || 0,
            distanceText: legRoute.localizedValues?.distance || formatDistance(legRoute.distanceMeters),
            durationText:
              legRoute.localizedValues?.duration || formatDurationMillis(legRoute.durationMillis),
          });
          const legPolylines = legRoute.createPolylines({
            polylineOptions: {
              map: state.map,
              strokeColor: dayTheme.color,
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          });
          state.polylines.push(...legPolylines);
        } else {
          legSummaries.push(null);
        }
      }

      state.routeMeta[day] = {
        distanceMeters: totalDistanceMeters,
        durationMillis: totalDurationMillis,
        legs: legSummaries,
        optimized: optimize,
        mode: modeKey,
      };
      renderActiveDayMarkers(fitBounds);
      renderItinerary();
      renderRouteSummary();
      return;
    }

    const request = {
      origin: { lat: currentStops[0].lat, lng: currentStops[0].lng },
      destination: {
        lat: currentStops[currentStops.length - 1].lat,
        lng: currentStops[currentStops.length - 1].lng,
      },
      travelMode,
      fields: [
        'path',
        'distanceMeters',
        'durationMillis',
        'legs',
        'localizedValues',
        'viewport',
        ...(optimize && currentStops.length > 2
          ? ['optimizedIntermediateWaypointIndices']
          : []),
      ],
    };

    if (currentStops.length > 2) {
      request.intermediates = currentStops.slice(1, -1).map((s) => ({
        location: { lat: s.lat, lng: s.lng },
      }));
      if (optimize) {
        request.optimizeWaypointOrder = true;
      }
    }

    const { routes } = await Route.computeRoutes(request);
    if (!routes || routes.length === 0) {
      state.routeMeta[day] = { error: 'No route available for the selected mode.' };
      renderActiveDayMarkers(fitBounds);
      renderItinerary();
      renderRouteSummary();
      return;
    }

    const primaryRoute = routes[0];
    if (
      optimize &&
      Array.isArray(primaryRoute.optimizedIntermediateWaypointIndices) &&
      primaryRoute.optimizedIntermediateWaypointIndices.length === currentStops.length - 2
    ) {
      const middle = currentStops.slice(1, -1);
      const reordered = primaryRoute.optimizedIntermediateWaypointIndices.map(
        (idx) => middle[idx]
      );
      state.itinerary[day] = [
        currentStops[0],
        ...reordered,
        currentStops[currentStops.length - 1],
      ];
    }

    const routePolylines = primaryRoute.createPolylines({
      polylineOptions: {
        map: state.map,
        strokeColor: dayTheme.color,
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    });
    state.polylines.push(...routePolylines);

    const legs = (primaryRoute.legs || []).map((leg) => ({
      distanceMeters: leg.distanceMeters,
      durationMillis: leg.durationMillis,
      distanceText: leg.localizedValues?.distance || formatDistance(leg.distanceMeters),
      durationText: leg.localizedValues?.duration || formatDurationMillis(leg.durationMillis),
    }));

    state.routeMeta[day] = {
      distanceMeters: primaryRoute.distanceMeters,
      durationMillis: primaryRoute.durationMillis,
      distanceText:
        primaryRoute.localizedValues?.distance || formatDistance(primaryRoute.distanceMeters),
      durationText:
        primaryRoute.localizedValues?.duration || formatDurationMillis(primaryRoute.durationMillis),
      legs,
      optimized: optimize,
      mode: modeKey,
    };

    if (fitBounds && primaryRoute.viewport && state.map) {
      state.map.fitBounds(primaryRoute.viewport, 52);
      renderActiveDayMarkers(false);
    } else {
      renderActiveDayMarkers(fitBounds);
    }
    renderItinerary();
    renderRouteSummary();
  } catch (err) {
    state.routeMeta[day] = {
      error: err instanceof Error ? err.message : 'Unable to compute route.',
    };
    renderActiveDayMarkers(fitBounds);
    renderItinerary();
    renderRouteSummary();
  }
}

function renderRouteSummary() {
  const day = state.activeDay;
  const stops = state.itinerary[day];
  const meta = state.routeMeta[day];

  dom.optimizeBtn.dataset.day = String(day);
  dom.optimizeBtn.disabled = stops.length < 3 || !state.gmp;

  if (stops.length < 2) {
    dom.routeSummaryBar.replaceChildren(
      createEl('span', {
        text: `Day ${day}: Add at least 2 stops to compute a route polyline.`,
      })
    );
    return;
  }

  if (!meta) {
    dom.routeSummaryBar.replaceChildren(
      createEl('span', { text: `${stops.length} stops ready for routing.` })
    );
    return;
  }

  if (meta.error) {
    dom.routeSummaryBar.replaceChildren(
      createEl('span', { text: `Route notice: ${meta.error}` })
    );
    return;
  }

  const distLabel = meta.distanceText || formatDistance(meta.distanceMeters);
  const durLabel = meta.durationText || formatDurationMillis(meta.durationMillis);
  const modeLabel =
    meta.mode === 'WALKING' ? 'Walk' : meta.mode === 'TRANSIT' ? 'Transit' : 'Drive';

  const left = createEl('span', {},
    createEl('strong', { className: 'route-summary-strong', text: `${distLabel} · ${durLabel}` }),
    createEl('span', { text: ` (${stops.length} stops · ${modeLabel})` })
  );
  const right = createEl('span', {
    text: meta.optimized ? 'Optimized order' : 'Custom order',
  });
  dom.routeSummaryBar.replaceChildren(left, right);
}

function renderItinerary() {
  dom.day1Count.textContent = String(state.itinerary[1].length);
  dom.day2Count.textContent = String(state.itinerary[2].length);

  for (const tab of dom.dayTabs) {
    const tabDay = Number(tab.dataset.day);
    const isActive = tabDay === state.activeDay;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  }

  const stops = state.itinerary[state.activeDay];
  const meta = state.routeMeta[state.activeDay];

  if (stops.length === 0) {
    dom.stopsList.replaceChildren(
      createEl('li', {
        className: 'empty-state-box',
        text: `No stops scheduled for Day ${state.activeDay} yet. Add attractions, restaurants, or hotels below.`,
      })
    );
    renderRouteSummary();
    return;
  }

  const items = stops.map((stop, index) => {
    const li = createEl('li', {
      className: `stop-item${stop.id === state.selectedPlaceId ? ' selected' : ''}`,
    });

    const mainRow = createEl('div', { className: 'stop-main-row' });
    const numBadge = createEl('span', {
      className: `stop-number day-${state.activeDay}`,
      text: String(index + 1),
    });

    const info = createEl('div', { className: 'stop-info' });
    const title = createEl('p', {
      className: 'stop-name',
      text: stop.name,
      onClick: () => focusPlaceOnMap(stop),
    });

    const ratingPiece = stop.rating ? `★ ${stop.rating.toFixed(1)}` : 'Unrated';
    const metaLine = createEl('p', {
      className: 'stop-meta',
      text: `${stop.categoryLabel} · ${ratingPiece}${stop.address ? ` · ${stop.address}` : ''}`,
    });
    info.append(title, metaLine);

    if (index > 0 && meta?.legs?.[index - 1]) {
      const leg = meta.legs[index - 1];
      info.append(
        createEl('span', {
          className: 'stop-leg-badge',
          text: `From Stop ${index}: ${leg.distanceText} (${leg.durationText})`,
        })
      );
    }

    mainRow.append(numBadge, info);

    const actions = createEl('div', { className: 'stop-actions' });
    actions.append(
      createEl('button', {
        className: 'btn-xs',
        text: 'Street View',
        attrs: { type: 'button' },
        onClick: () => focusPlaceOnMap(stop),
      }),
      createEl('button', {
        className: 'btn-xs',
        text: '↑',
        attrs: { type: 'button', 'aria-label': `Move ${stop.name} up`, disabled: index === 0 ? 'disabled' : null },
        onClick: () => moveStop(index, -1),
      }),
      createEl('button', {
        className: 'btn-xs',
        text: '↓',
        attrs: {
          type: 'button',
          'aria-label': `Move ${stop.name} down`,
          disabled: index === stops.length - 1 ? 'disabled' : null,
        },
        onClick: () => moveStop(index, 1),
      }),
      createEl('button', {
        className: 'btn-xs btn-danger',
        text: 'Remove',
        attrs: { type: 'button' },
        onClick: () => removeStop(index),
      })
    );

    li.append(mainRow, actions);
    return li;
  });

  dom.stopsList.replaceChildren(...items);
  renderRouteSummary();
}

function addStopToDay(place, targetDay) {
  const list = state.itinerary[targetDay];
  if (!list.some((item) => item.id === place.id)) {
    list.push({ ...place });
  }
  state.activeDay = targetDay;
  state.selectedPlaceId = place.id;
  renderItinerary();
  void computeActiveDayRoute({ optimize: false, fitBounds: true });
  void inspectStreetView(place);
}

function moveStop(index, delta) {
  const list = state.itinerary[state.activeDay];
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  const copy = [...list];
  const [moved] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, moved);
  state.itinerary[state.activeDay] = copy;
  renderItinerary();
  void computeActiveDayRoute({ optimize: false, fitBounds: true });
}

function removeStop(index) {
  const list = state.itinerary[state.activeDay];
  list.splice(index, 1);
  renderItinerary();
  void computeActiveDayRoute({ optimize: false, fitBounds: true });
}

function renderDiscoveryResults() {
  for (const tab of dom.categoryTabs) {
    const isActive = tab.dataset.category === state.activeCategory;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  }

  dom.discoveryCaption.textContent = `Live Places API (New) around ${state.activeCity.name}`;
  const results = state.discoveryCache[state.activeCategory] || [];

  if (results.length === 0) {
    dom.discoveryResultsList.replaceChildren(
      createEl('div', {
        className: 'empty-state-box',
        text: state.apiKey
          ? `Loading ${CATEGORY_CONFIG[state.activeCategory].label.toLowerCase()} in ${state.activeCity.name}...`
          : 'Configure GOOGLE_MAPS_API_KEY in .env to discover live places, photos, ratings, and hours.',
      })
    );
    return;
  }

  const cards = results.map((place) => {
    const card = createEl('article', {
      className: `place-card${place.id === state.selectedPlaceId ? ' selected' : ''}`,
    });

    const photoWrap = createEl('div', { className: 'place-photo-wrap' });
    if (place.photoUrl) {
      photoWrap.append(
        createEl('img', {
          className: 'place-photo-img',
          attrs: {
            src: place.photoUrl,
            alt: place.name,
            loading: 'lazy',
          },
        })
      );
    } else {
      photoWrap.append(
        createEl('div', {
          className: 'place-photo-fallback',
          text: place.categoryLabel || 'Place Preview',
        })
      );
    }

    if (place.categoryLabel) {
      photoWrap.append(
        createEl('span', { className: 'place-type-pill', text: place.categoryLabel })
      );
    }

    const body = createEl('div', { className: 'place-body' });
    const titleRow = createEl('div', { className: 'place-title-row' });
    titleRow.append(createEl('h3', { className: 'place-name', text: place.name }));

    if (place.rating !== null) {
      const countText = place.userRatingCount
        ? ` (${place.userRatingCount.toLocaleString()})`
        : '';
      titleRow.append(
        createEl('span', {
          className: 'place-rating',
          text: `★ ${place.rating.toFixed(1)}${countText}`,
        })
      );
    }

    const address = createEl('p', {
      className: 'place-address',
      text: place.address || `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`,
    });

    const hours = createEl('p', {
      className: 'place-hours',
      text: `Hours: ${place.hoursSummary}`,
    });

    const actions = createEl('div', { className: 'place-actions' });
    actions.append(
      createEl('button', {
        className: 'btn-add-day btn-add-day-1',
        text: '+ Day 1',
        attrs: { type: 'button' },
        onClick: () => addStopToDay(place, 1),
      }),
      createEl('button', {
        className: 'btn-add-day btn-add-day-2',
        text: '+ Day 2',
        attrs: { type: 'button' },
        onClick: () => addStopToDay(place, 2),
      }),
      createEl('button', {
        className: 'btn-street-view',
        text: 'Street View',
        attrs: { type: 'button' },
        onClick: () => focusPlaceOnMap(place),
      })
    );

    if (place.googleMapsURI) {
      actions.append(
        createEl('a', {
          className: 'btn-maps-link',
          text: 'Google Maps ↗',
          attrs: {
            href: place.googleMapsURI,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        })
      );
    }

    body.append(titleRow, address, hours, actions);
    card.append(photoWrap, body);
    return card;
  });

  dom.discoveryResultsList.replaceChildren(...cards);
}

async function fetchCategoryPlaces(categoryKey, city) {
  if (!state.gmp) return [];
  const { Place } = state.gmp;
  const cfg = CATEGORY_CONFIG[categoryKey];
  const textQuery =
    city.key === 'tokyo' && categoryKey === 'attractions'
      ? 'top tourist attractions in Tokyo'
      : `${cfg.querySuffix} in ${city.name}`;

  try {
    const { places } = await Place.searchByText({
      textQuery,
      fields: PLACE_FIELDS,
      includedType: cfg.includedType,
      locationBias: {
        center: { lat: city.lat, lng: city.lng },
        radius: 18000,
      },
      maxResultCount: 10,
      language: 'en',
    });

    const serialized = (places || [])
      .map((p) => serializePlace(p, cfg.label))
      .filter(Boolean);

    if (serialized.length > 0) {
      return serialized;
    }

    // Fallback to Place.searchNearby if text search returned empty
    const nearby = await Place.searchNearby({
      fields: PLACE_FIELDS,
      locationRestriction: {
        center: { lat: city.lat, lng: city.lng },
        radius: 10000,
      },
      includedPrimaryTypes: [cfg.includedType],
      maxResultCount: 8,
      language: 'en',
    });

    return (nearby?.places || [])
      .map((p) => serializePlace(p, cfg.label))
      .filter(Boolean);
  } catch (err) {
    showStatusBanner(
      `Places API (New) lookup failed for ${cfg.label}: ${
        err instanceof Error ? err.message : 'Check API key and enabled APIs.'
      }`
    );
    return [];
  }
}

async function loadDestinationCity(city) {
  state.activeCity = { ...city };
  state.discoveryCache = { attractions: [], restaurants: [], hotels: [] };
  state.itinerary = { 1: [], 2: [] };
  state.routeMeta = { 1: null, 2: null };
  state.activeDay = 1;
  state.activeCategory = 'attractions';

  renderItinerary();
  renderDiscoveryResults();
  clearMapOverlays();

  if (state.map) {
    state.map.panTo({ lat: city.lat, lng: city.lng });
    state.map.setZoom(city.zoom || 12);
  }

  void updateTimeZoneForLocation(city.lat, city.lng, city.name);

  if (!state.gmp) return;

  const [attractions, hotels] = await Promise.all([
    fetchCategoryPlaces('attractions', city),
    fetchCategoryPlaces('hotels', city),
  ]);

  state.discoveryCache.attractions = attractions;
  state.discoveryCache.hotels = hotels;

  // Seed Day 1 & Day 2 exclusively from live Places API (New) results
  if (attractions.length > 0) {
    state.itinerary[1] = attractions.slice(0, 3).map((p) => ({ ...p }));
    const day2Attractions = attractions.slice(3, 5).map((p) => ({ ...p }));
    const day2Hotel = hotels.length > 0 ? [{ ...hotels[0] }] : [];
    state.itinerary[2] = [...day2Attractions, ...day2Hotel];

    if (state.itinerary[2].length < 2 && attractions.length > 3) {
      state.itinerary[2] = attractions.slice(2, 5).map((p) => ({ ...p }));
    }
  }

  renderItinerary();
  renderDiscoveryResults();

  const firstStop = state.itinerary[1][0] || attractions[0] || hotels[0];
  if (firstStop) {
    state.selectedPlaceId = firstStop.id;
    void inspectStreetView(firstStop);
  }

  await computeActiveDayRoute({ optimize: false, fitBounds: true });
}

async function handleAutocompleteSelection(place) {
  await place.fetchFields({ fields: PLACE_FIELDS });
  const coords = toNumberLatLng(place.location);
  if (!coords) return;

  const types = place.types || [];
  const isCityLike =
    types.includes('locality') ||
    types.includes('administrative_area_level_1') ||
    types.includes('country') ||
    types.includes('colloquial_area');

  const displayName = place.displayName || 'Selected Destination';

  if (isCityLike) {
    if (place.viewport && state.map) {
      state.map.fitBounds(place.viewport);
    }
    await loadDestinationCity({
      key: `custom-${place.id}`,
      name: displayName,
      label: place.formattedAddress || displayName,
      lat: coords.lat,
      lng: coords.lng,
      zoom: 12,
      fallbackTzId: place.timeZone?.id || null,
      fallbackTzName: place.timeZone?.id || 'Local Time',
      fallbackOffsetSeconds:
        typeof place.utcOffsetMinutes === 'number' ? place.utcOffsetMinutes * 60 : 0,
    });
    return;
  }

  // Selected a specific landmark, restaurant, or hotel
  const serialized = serializePlace(place, 'Selected Place');
  if (!serialized) return;

  state.activeCity = {
    ...state.activeCity,
    name: displayName,
    lat: serialized.lat,
    lng: serialized.lng,
  };
  void updateTimeZoneForLocation(serialized.lat, serialized.lng, displayName, place);

  const existing = state.discoveryCache[state.activeCategory] || [];
  state.discoveryCache[state.activeCategory] = [
    serialized,
    ...existing.filter((item) => item.id !== serialized.id),
  ];

  focusPlaceOnMap(serialized);
}

function mountPlaceAutocomplete() {
  if (!state.gmp) return;
  const { PlaceAutocompleteElement } = state.gmp;

  const autocomplete = new PlaceAutocompleteElement({
    requestedLanguage: 'en',
  });
  autocomplete.setAttribute('aria-label', 'Search destination city or landmark');
  dom.searchWrapper.replaceChildren(autocomplete);

  autocomplete.addEventListener('gmp-select', async (event) => {
    const prediction = event.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await handleAutocompleteSelection(place);
    } catch (err) {
      showStatusBanner(
        `Could not load selected place: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  });

  autocomplete.addEventListener('gmp-error', () => {
    showStatusBanner(
      'Place Autocomplete reported an API error. Check that Places API (New) is enabled on your key.'
    );
  });
}

function wireUiEvents() {
  dom.quickSelect.addEventListener('change', (event) => {
    const presetKey = event.target.value;
    const preset = CITY_PRESETS[presetKey];
    if (preset) {
      void loadDestinationCity(preset);
    }
  });

  for (const tab of dom.dayTabs) {
    tab.addEventListener('click', () => {
      const day = Number(tab.dataset.day);
      if (day !== 1 && day !== 2) return;
      state.activeDay = day;
      renderItinerary();
      void computeActiveDayRoute({ optimize: false, fitBounds: true });
      const firstStop = state.itinerary[day][0];
      if (firstStop) {
        void inspectStreetView(firstStop);
      }
    });
  }

  dom.travelModeSelect.addEventListener('change', (event) => {
    state.travelMode = event.target.value;
    void computeActiveDayRoute({ optimize: false, fitBounds: true });
  });

  dom.optimizeBtn.addEventListener('click', () => {
    void computeActiveDayRoute({ optimize: true, fitBounds: true });
  });

  for (const tab of dom.categoryTabs) {
    tab.addEventListener('click', async () => {
      const category = tab.dataset.category;
      if (!CATEGORY_CONFIG[category]) return;
      state.activeCategory = category;
      renderDiscoveryResults();

      if (
        state.gmp &&
        (!state.discoveryCache[category] || state.discoveryCache[category].length === 0)
      ) {
        state.discoveryCache[category] = await fetchCategoryPlaces(
          category,
          state.activeCity
        );
        renderDiscoveryResults();
      }
    });
  }

  if (dom.fallbackSearchInput) {
    dom.fallbackSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !state.apiKey) {
        showStatusBanner(
          'Set GOOGLE_MAPS_API_KEY in .env to enable live Place Autocomplete & Discovery.'
        );
      }
    });
  }
}

function renderMissingKeyPlaceholder() {
  showStatusBanner(
    'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add a Maps Demo Key or Cloud API key to load live Maps, Places, Routes, and Street View.'
  );
  dom.mapContainer.replaceChildren(
    createEl(
      'div',
      { className: 'map-empty-placeholder' },
      createEl('h2', { text: 'Google Maps API Key Required' }),
      createEl('p', {
        text: 'Add GOOGLE_MAPS_API_KEY to .env and restart server.mjs to activate interactive 2D maps, live Tokyo Places discovery, multi-stop Routes, and Street View.',
      })
    )
  );
  dom.svStatusText.textContent = 'Awaiting API key';
}

async function initApp() {
  wireUiEvents();
  startClockTicker();
  renderItinerary();
  renderDiscoveryResults();

  if (!state.apiKey) {
    renderMissingKeyPlaceholder();
    return;
  }

  try {
    setOptions({
      key: state.apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });

    const [mapsLib, markerLib, placesLib, routesLib, streetViewLib, coreLib] =
      await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('streetView'),
        importLibrary('core'),
      ]);

    state.gmp = {
      ...mapsLib,
      ...markerLib,
      ...placesLib,
      ...routesLib,
      ...streetViewLib,
      ...coreLib,
    };

    const { Map, InfoWindow, StreetViewPanorama, StreetViewService } = state.gmp;

    state.map = new Map(dom.mapContainer, {
      center: { lat: CITY_PRESETS.tokyo.lat, lng: CITY_PRESETS.tokyo.lng },
      zoom: CITY_PRESETS.tokyo.zoom,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.infoWindow = new InfoWindow();
    state.streetViewService = new StreetViewService();
    state.panorama = new StreetViewPanorama(dom.svCanvas, {
      visible: false,
      addressControl: false,
      fullscreenControl: true,
      motionTracking: false,
    });

    mountPlaceAutocomplete();
    await loadDestinationCity(CITY_PRESETS.tokyo);
  } catch (err) {
    showStatusBanner(
      `Failed to initialize Google Maps Platform libraries: ${
        err instanceof Error ? err.message : 'Check API key configuration.'
      }`
    );
  }
}

void initApp();
