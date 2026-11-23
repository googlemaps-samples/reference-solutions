const SEED_DEFAULTS = {
  name: 'Phoenix City Hall',
  address: '200 W Washington St, Phoenix, AZ 85003',
  lat: 33.4484,
  lng: -112.074,
  zoom: 16,
  seedSearchQuery: 'Phoenix City Hall, Phoenix, AZ',
};

const state = {
  apiKeyConfigured: false,
  unitsSystem: 'IMPERIAL',
  aqiLayerVisible: false,
  mapTypeId: 'roadmap',
  activeLocation: {
    name: SEED_DEFAULTS.name,
    address: SEED_DEFAULTS.address,
    lat: SEED_DEFAULTS.lat,
    lng: SEED_DEFAULTS.lng,
  },
  map: null,
  marker: null,
  PinElementCtor: null,
  geocoder: null,
  aqiOverlay: null,
  solarRectangle: null,
  lastSolarPayload: null,
  lastSolarStatus: null,
};

const dom = {
  autocompleteContainer: document.querySelector('[data-testid="places-autocomplete-container"]'),
  activeLocationBadge: document.querySelector('[data-testid="active-location-badge"]'),
  resetPhoenixBtn: document.querySelector('[data-testid="reset-phoenix-btn"]'),
  unitsToggleBtn: document.querySelector('[data-testid="units-toggle-btn"]'),
  aqiLayerToggle: document.querySelector('[data-testid="aqi-layer-toggle"]'),
  mapTypeToggle: document.querySelector('[data-testid="map-type-toggle"]'),
  configBanner: document.getElementById('config-banner'),
  locationStatusChip: document.getElementById('location-status-chip'),
  locationName: document.getElementById('location-name'),
  locationAddress: document.getElementById('location-address'),
  locationCoords: document.getElementById('location-coords'),
  weatherUpdated: document.getElementById('weather-updated'),
  weatherContent: document.getElementById('weather-content'),
  weatherForecastList: document.querySelector('[data-testid="weather-forecast-list"]'),
  aqiContent: document.getElementById('aqi-content'),
  pollenContent: document.getElementById('pollen-content'),
  solarContent: document.getElementById('solar-content'),
  mapContainer: document.querySelector('[data-testid="map-container"]'),
  mapOverlayLegend: document.getElementById('map-overlay-legend'),
};

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (textContent !== undefined && textContent !== null) {
    node.textContent = String(textContent);
  }
  return node;
}

function formatCoords(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function updateLocationUI() {
  const { name, address, lat, lng } = state.activeLocation;
  dom.locationName.textContent = name;
  dom.locationAddress.textContent = address;
  dom.locationCoords.textContent = formatCoords(lat, lng);
  dom.activeLocationBadge.textContent = `${name} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function showConfigNotice(message) {
  dom.configBanner.classList.remove('hidden');
  dom.configBanner.textContent = message;
}

/**
 * Loads the Google Maps JavaScript API using the official Dynamic Library Import bootstrap.
 * See: https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0
 */
function loadMapsJsBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
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
      b[c] = b[c] || {};
      const d = b[c].maps || (b[c].maps = {});
      const r = new Set();
      const e = new URLSearchParams();
      const u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          a = m.createElement('script');
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
          a.onerror = () => (h = n(new Error(p + ' could not load.')));
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          m.head.append(a);
        }));
      if (d[l]) {
        resolve();
        return;
      }
      d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
    })({
      key: apiKey,
      v: 'weekly',
    });

    resolve();
  });
}

function setMapMarker(lat, lng, title) {
  if (!state.map || !state.marker) {
    return;
  }
  const position = { lat, lng };
  state.marker.position = position;
  state.marker.title = title;
  state.map.panTo(position);
}

function clearSolarBoundingBox() {
  if (state.solarRectangle) {
    state.solarRectangle.setMap(null);
    state.solarRectangle = null;
  }
}

function renderSolarBoundingBox(boundingBox) {
  clearSolarBoundingBox();
  if (!state.map || !boundingBox?.sw || !boundingBox?.ne || !window.google?.maps?.Rectangle) {
    return;
  }
  state.solarRectangle = new window.google.maps.Rectangle({
    map: state.map,
    bounds: {
      south: boundingBox.sw.latitude,
      west: boundingBox.sw.longitude,
      north: boundingBox.ne.latitude,
      east: boundingBox.ne.longitude,
    },
    strokeColor: '#d97706',
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: '#f59e0b',
    fillOpacity: 0.22,
    clickable: false,
  });
}

function formatTemp(tempObj) {
  if (!tempObj || typeof tempObj.degrees !== 'number') {
    return '—';
  }
  const suffix = tempObj.unit === 'CELSIUS' ? '°C' : '°F';
  return `${Math.round(tempObj.degrees)}${suffix}`;
}

function formatWind(windObj) {
  if (!windObj?.speed || typeof windObj.speed.value !== 'number') {
    return '—';
  }
  const unitLabel = windObj.speed.unit === 'KILOMETERS_PER_HOUR' ? 'km/h' : 'mph';
  const dir = windObj.direction?.cardinal ? `${windObj.direction.cardinal} ` : '';
  return `${dir}${Math.round(windObj.speed.value)} ${unitLabel}`;
}

function renderWeatherCurrent(data) {
  const hero = el('div', 'weather-hero');
  const tempWrap = el('div', 'weather-temp-wrap');

  if (data.weatherCondition?.iconBaseUri) {
    const icon = el('img', 'weather-icon');
    icon.src = `${data.weatherCondition.iconBaseUri}.svg`;
    icon.alt = data.weatherCondition?.description?.text ?? 'Weather condition';
    tempWrap.appendChild(icon);
  }

  const tempStack = el('div');
  tempStack.appendChild(el('div', 'weather-temp', formatTemp(data.temperature)));
  tempStack.appendChild(
    el('div', 'weather-condition-text', data.weatherCondition?.description?.text ?? 'Current')
  );
  tempWrap.appendChild(tempStack);
  hero.appendChild(tempWrap);

  const tzLabel = data.timeZone?.id ?? 'Local';
  dom.weatherUpdated.textContent = tzLabel;

  const grid = el('div', 'metrics-grid');
  const metrics = [
    ['Feels Like', formatTemp(data.feelsLikeTemperature)],
    [
      'Humidity',
      typeof data.relativeHumidity === 'number' ? `${data.relativeHumidity}%` : '—',
    ],
    ['UV Index', typeof data.uvIndex === 'number' ? String(data.uvIndex) : '—'],
    ['Wind', formatWind(data.wind)],
    [
      'Precip Chance',
      typeof data.precipitation?.probability?.percent === 'number'
        ? `${data.precipitation.probability.percent}%`
        : '0%',
    ],
    [
      'Cloud Cover',
      typeof data.cloudCover === 'number' ? `${data.cloudCover}%` : '—',
    ],
  ];

  for (const [label, value] of metrics) {
    const box = el('div', 'metric-box');
    box.appendChild(el('span', 'metric-label', label));
    box.appendChild(el('span', 'metric-value', value));
    grid.appendChild(box);
  }

  dom.weatherContent.replaceChildren(hero, grid);
}

function renderWeatherForecast(data) {
  const days = Array.isArray(data.forecastDays) ? data.forecastDays.slice(0, 5) : [];
  if (days.length === 0) {
    dom.weatherForecastList.replaceChildren(
      el('p', 'muted-state', 'No multi-day forecast entries returned.')
    );
    return;
  }

  const cards = days.map((day) => {
    const card = el('div', 'forecast-day');
    let label = 'Day';
    if (day.displayDate) {
      const dt = new Date(
        Date.UTC(day.displayDate.year, day.displayDate.month - 1, day.displayDate.day)
      );
      label = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    }
    card.appendChild(el('span', 'forecast-date', label));

    const iconBase = day.daytimeForecast?.weatherCondition?.iconBaseUri;
    if (iconBase) {
      const icon = el('img', 'forecast-icon');
      icon.src = `${iconBase}.svg`;
      icon.alt = day.daytimeForecast?.weatherCondition?.description?.text ?? label;
      card.appendChild(icon);
    }

    const temps = el('div', 'forecast-temps');
    temps.appendChild(document.createTextNode(`${formatTemp(day.maxTemperature)} / `));
    temps.appendChild(el('span', 'forecast-low', formatTemp(day.minTemperature)));
    card.appendChild(temps);
    return card;
  });

  dom.weatherForecastList.replaceChildren(...cards);
}

function aqiBadgeStyle(color) {
  if (!color) {
    return { bg: '#e2e8f0', fg: '#0f172a' };
  }
  // Air Quality API color values may arrive as 0..1 floats or 0..255 ints depending on index
  const scale = (v) => {
    if (typeof v !== 'number') return 0;
    return v <= 1 ? Math.round(v * 255) : Math.round(v);
  };
  const r = scale(color.red);
  const g = scale(color.green);
  const b = scale(color.blue);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    fg: luminance < 140 ? '#ffffff' : '#0f172a',
  };
}

function renderAirQuality(data) {
  const indexes = Array.isArray(data.indexes) ? data.indexes : [];
  const preferred =
    indexes.find((idx) => idx.code === 'usa_epa') ??
    indexes.find((idx) => idx.code === 'uaqi') ??
    indexes[0];

  if (!preferred) {
    dom.aqiContent.replaceChildren(
      el('p', 'muted-state', 'Air quality index data is unavailable for these coordinates.')
    );
    return;
  }

  const hero = el('div', 'aqi-hero');
  const badge = el('div', 'aqi-badge');
  const palette = aqiBadgeStyle(preferred.color);
  badge.style.backgroundColor = palette.bg;
  badge.style.color = palette.fg;
  badge.appendChild(el('span', 'aqi-number', preferred.aqiDisplay ?? String(preferred.aqi ?? '—')));
  badge.appendChild(el('span', 'aqi-label', preferred.displayName ?? 'AQI'));
  hero.appendChild(badge);

  const summary = el('div');
  summary.appendChild(el('div', 'aqi-category', preferred.category ?? 'Air Quality'));
  summary.appendChild(
    el(
      'div',
      'aqi-dominant',
      `Dominant pollutant: ${(preferred.dominantPollutant ?? 'N/A').toUpperCase()}`
    )
  );
  hero.appendChild(summary);

  const nodes = [hero];

  const pollutants = Array.isArray(data.pollutants) ? data.pollutants.slice(0, 5) : [];
  if (pollutants.length > 0) {
    const list = el('div', 'pollutant-list');
    for (const p of pollutants) {
      const val =
        typeof p.concentration?.value === 'number' ? p.concentration.value.toFixed(1) : '—';
      const unit = p.concentration?.units === 'MICROGRAMS_PER_CUBIC_METER' ? 'µg/m³' : 'ppb';
      list.appendChild(el('span', 'pollutant-chip', `${p.displayName}: ${val} ${unit}`));
    }
    nodes.push(list);
  }

  const advice =
    data.healthRecommendations?.generalPopulation ??
    data.healthRecommendations?.athletes ??
    data.healthRecommendations?.sensitiveGroups;
  if (advice) {
    nodes.push(el('div', 'advice-box', advice));
  }

  dom.aqiContent.replaceChildren(...nodes);
}

function renderPollen(data) {
  const today = Array.isArray(data.dailyInfo) ? data.dailyInfo[0] : null;
  const types = Array.isArray(today?.pollenTypeInfo) ? today.pollenTypeInfo : [];

  if (types.length === 0) {
    dom.pollenContent.replaceChildren(
      el('p', 'muted-state', 'Pollen forecast data is unavailable for these coordinates.')
    );
    return;
  }

  const grid = el('div', 'pollen-grid');
  const recommendations = [];

  for (const code of ['TREE', 'GRASS', 'WEED']) {
    const entry = types.find((t) => t.code === code) ?? { displayName: code };
    const tile = el('div', 'pollen-tile');
    tile.appendChild(el('div', 'pollen-type', entry.displayName ?? code));
    const category = entry.indexInfo?.category ?? (entry.inSeason ? 'Low' : 'Out of Season');
    const val = typeof entry.indexInfo?.value === 'number' ? ` (${entry.indexInfo.value}/5)` : '';
    tile.appendChild(el('div', 'pollen-upi', `${category}${val}`));
    tile.appendChild(
      el('div', 'pollen-season', entry.inSeason ? 'In Season' : 'Off-Peak / Low')
    );
    grid.appendChild(tile);

    if (Array.isArray(entry.healthRecommendations) && entry.healthRecommendations.length > 0) {
      recommendations.push(entry.healthRecommendations[0]);
    }
  }

  const nodes = [grid];

  const plants = Array.isArray(today?.plantInfo)
    ? today.plantInfo.filter((p) => p.inSeason || (p.indexInfo?.value ?? 0) > 0).slice(0, 6)
    : [];
  if (plants.length > 0) {
    const tags = el('div', 'plant-tags');
    for (const plant of plants) {
      const label = plant.indexInfo?.category
        ? `${plant.displayName} (${plant.indexInfo.category})`
        : plant.displayName;
      tags.appendChild(el('span', 'plant-tag', label));
    }
    nodes.push(tags);
  }

  if (recommendations.length > 0) {
    nodes.push(el('div', 'advice-box', recommendations[0]));
  }

  dom.pollenContent.replaceChildren(...nodes);
}

function renderSolar(status, data) {
  state.lastSolarStatus = status;
  state.lastSolarPayload = data;

  if (status === 404 || data?.coverageAvailable === false) {
    clearSolarBoundingBox();
    const fallback = el(
      'div',
      'solar-non-coverage',
      data?.message ??
        'No Solar API building footprint found within 50m of these coordinates or location is outside Solar coverage. Click directly on a building rooftop to inspect solar capacity.'
    );
    fallback.setAttribute('data-testid', 'solar-non-coverage');
    dom.solarContent.replaceChildren(fallback);
    return;
  }

  if (status >= 400 || !data?.solarPotential) {
    clearSolarBoundingBox();
    dom.solarContent.replaceChildren(
      el('p', 'error-state', data?.error ?? 'Unable to retrieve Solar API building insights.')
    );
    return;
  }

  renderSolarBoundingBox(data.boundingBox);

  const potential = data.solarPotential;
  const maxPanels = potential.maxArrayPanelsCount ?? 0;
  const panelWatts = potential.panelCapacityWatts ?? 400;
  const systemKw = ((maxPanels * panelWatts) / 1000).toFixed(1);
  const sunshineHours =
    typeof potential.maxSunshineHoursPerYear === 'number'
      ? `${Math.round(potential.maxSunshineHoursPerYear).toLocaleString()} hrs/yr`
      : '—';

  const roofAreaM2 = potential.wholeRoofStats?.areaMeters2;
  const roofAreaLabel =
    typeof roofAreaM2 === 'number'
      ? state.unitsSystem === 'IMPERIAL'
        ? `${Math.round(roofAreaM2 * 10.7639).toLocaleString()} sq ft`
        : `${Math.round(roofAreaM2).toLocaleString()} m²`
      : '—';

  const carbonFactor =
    typeof potential.carbonOffsetFactorKgPerMwh === 'number'
      ? `${Math.round(potential.carbonOffsetFactorKgPerMwh).toLocaleString()} kg CO₂/MWh`
      : '—';

  const badgeRow = el('div', 'solar-badge-row');
  const imageryDate = data.imageryDate
    ? `Imagery ${data.imageryDate.year}-${String(data.imageryDate.month).padStart(2, '0')}`
    : 'Aerial Imagery';
  badgeRow.appendChild(el('span', 'card-meta', imageryDate));
  badgeRow.appendChild(
    el('span', 'solar-quality-pill', `Quality: ${data.imageryQuality ?? 'HIGH'}`)
  );

  const grid = el('div', 'metrics-grid');
  const metrics = [
    ['Max Panel Count', `${maxPanels.toLocaleString()} panels`],
    ['Estimated Array Size', `${systemKw} kW DC`],
    ['Annual Sunshine', sunshineHours],
    ['Total Roof Area', roofAreaLabel],
    ['Carbon Offset Factor', carbonFactor],
    [
      'Best Config Output',
      Array.isArray(potential.solarPanelConfigs) && potential.solarPanelConfigs.length > 0
        ? `${Math.round(
            potential.solarPanelConfigs[potential.solarPanelConfigs.length - 1]
              .yearlyEnergyDcKwh ?? 0
          ).toLocaleString()} kWh/yr`
        : '—',
    ],
  ];

  for (const [label, value] of metrics) {
    const box = el('div', 'metric-box');
    box.appendChild(el('span', 'metric-label', label));
    box.appendChild(el('span', 'metric-value', value));
    grid.appendChild(box);
  }

  dom.solarContent.replaceChildren(badgeRow, grid);
}

async function fetchJsonSafe(url, options) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      data: { error: err instanceof Error ? err.message : 'Network error' },
    };
  }
}

async function loadWeatherOnly(lat, lng) {
  const units = state.unitsSystem;
  const [curRes, fcRes] = await Promise.all([
    fetchJsonSafe(`/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`),
    fetchJsonSafe(`/api/weather/forecast?lat=${lat}&lng=${lng}&unitsSystem=${units}&days=5`),
  ]);

  if (curRes.ok) {
    renderWeatherCurrent(curRes.data);
  } else {
    dom.weatherContent.replaceChildren(
      el('p', 'error-state', curRes.data?.error ?? 'Weather API unavailable.')
    );
  }

  if (fcRes.ok) {
    renderWeatherForecast(fcRes.data);
  } else {
    dom.weatherForecastList.replaceChildren(
      el('p', 'error-state', fcRes.data?.error ?? 'Weather forecast unavailable.')
    );
  }
}

async function loadEnvironmentalData(lat, lng) {
  dom.locationStatusChip.textContent = 'Updating…';

  if (!state.apiKeyConfigured) {
    dom.locationStatusChip.textContent = 'Key Needed';
    return;
  }

  const units = state.unitsSystem;

  const [curWeather, fcWeather, aqiRes, pollenRes, solarRes] = await Promise.all([
    fetchJsonSafe(`/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`),
    fetchJsonSafe(`/api/weather/forecast?lat=${lat}&lng=${lng}&unitsSystem=${units}&days=5`),
    fetchJsonSafe('/api/air-quality/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: { latitude: lat, longitude: lng } }),
    }),
    fetchJsonSafe(`/api/pollen/forecast?lat=${lat}&lng=${lng}&days=5`),
    fetchJsonSafe(`/api/solar/building-insights?lat=${lat}&lng=${lng}`),
  ]);

  if (curWeather.ok) {
    renderWeatherCurrent(curWeather.data);
  } else {
    dom.weatherContent.replaceChildren(
      el('p', 'error-state', curWeather.data?.error ?? 'Weather API unavailable.')
    );
  }

  if (fcWeather.ok) {
    renderWeatherForecast(fcWeather.data);
  } else {
    dom.weatherForecastList.replaceChildren(
      el('p', 'error-state', fcWeather.data?.error ?? 'Weather forecast unavailable.')
    );
  }

  if (aqiRes.ok) {
    renderAirQuality(aqiRes.data);
  } else {
    dom.aqiContent.replaceChildren(
      el('p', 'error-state', aqiRes.data?.error ?? 'Air Quality API unavailable.')
    );
  }

  if (pollenRes.ok) {
    renderPollen(pollenRes.data);
  } else {
    dom.pollenContent.replaceChildren(
      el('p', 'error-state', pollenRes.data?.error ?? 'Pollen API unavailable.')
    );
  }

  renderSolar(solarRes.status, solarRes.data);
  dom.locationStatusChip.textContent = 'Live';
}

async function inspectLocation({ name, address, lat, lng, zoom }) {
  state.activeLocation = { name, address, lat, lng };
  updateLocationUI();
  setMapMarker(lat, lng, name);
  if (state.map && typeof zoom === 'number') {
    state.map.setZoom(zoom);
  }
  await loadEnvironmentalData(lat, lng);
}

async function resolveSeedLocation() {
  if (!state.apiKeyConfigured) {
    return { ...SEED_DEFAULTS };
  }
  const res = await fetchJsonSafe('/api/places/search-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textQuery: SEED_DEFAULTS.seedSearchQuery }),
  });

  const place = res.ok && Array.isArray(res.data?.places) ? res.data.places[0] : null;
  if (place?.location) {
    return {
      name: place.displayName?.text ?? SEED_DEFAULTS.name,
      address: place.formattedAddress ?? SEED_DEFAULTS.address,
      lat: place.location.latitude,
      lng: place.location.longitude,
    };
  }
  return { ...SEED_DEFAULTS };
}

function toggleAqiOverlay() {
  if (!state.map || !window.google?.maps) {
    return;
  }

  state.aqiLayerVisible = !state.aqiLayerVisible;
  dom.aqiLayerToggle.setAttribute('aria-pressed', String(state.aqiLayerVisible));
  dom.aqiLayerToggle.textContent = state.aqiLayerVisible ? 'AQI Tiles: On' : 'AQI Tiles: Off';

  if (state.aqiLayerVisible) {
    if (!state.aqiOverlay) {
      state.aqiOverlay = new window.google.maps.ImageMapType({
        name: 'US_AQI',
        tileSize: new window.google.maps.Size(256, 256),
        minZoom: 0,
        maxZoom: 16,
        opacity: 0.58,
        getTileUrl: (coord, zoom) => {
          if (zoom < 0 || zoom > 16) {
            return null;
          }
          const maxCoord = 1 << zoom;
          if (coord.y < 0 || coord.y >= maxCoord) {
            return null;
          }
          const normalizedX = ((coord.x % maxCoord) + maxCoord) % maxCoord;
          return `/api/air-quality/tiles?mapType=US_AQI&zoom=${zoom}&x=${normalizedX}&y=${coord.y}`;
        },
      });
    }
    state.map.overlayMapTypes.clear();
    state.map.overlayMapTypes.push(state.aqiOverlay);
    dom.mapOverlayLegend.classList.remove('hidden');
  } else {
    state.map.overlayMapTypes.clear();
    dom.mapOverlayLegend.classList.add('hidden');
  }
}

function toggleMapType() {
  if (!state.map) {
    return;
  }
  state.mapTypeId = state.mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap';
  state.map.setMapTypeId(state.mapTypeId);
  const isHybrid = state.mapTypeId === 'hybrid';
  dom.mapTypeToggle.setAttribute('aria-pressed', String(isHybrid));
  dom.mapTypeToggle.textContent = isHybrid ? 'Map: Hybrid' : 'Map: Roadmap';
}

async function toggleUnits() {
  state.unitsSystem = state.unitsSystem === 'IMPERIAL' ? 'METRIC' : 'IMPERIAL';
  const isMetric = state.unitsSystem === 'METRIC';
  dom.unitsToggleBtn.setAttribute('aria-pressed', String(isMetric));
  dom.unitsToggleBtn.textContent = isMetric ? '°C · Metric' : '°F · Imperial';

  if (state.lastSolarStatus !== null) {
    renderSolar(state.lastSolarStatus, state.lastSolarPayload);
  }
  if (state.apiKeyConfigured) {
    await loadWeatherOnly(state.activeLocation.lat, state.activeLocation.lng);
  }
}

function wireControls() {
  dom.resetPhoenixBtn.addEventListener('click', async () => {
    const seed = await resolveSeedLocation();
    await inspectLocation({ ...seed, zoom: SEED_DEFAULTS.zoom });
  });

  dom.unitsToggleBtn.addEventListener('click', () => {
    void toggleUnits();
  });

  dom.aqiLayerToggle.addEventListener('click', () => {
    toggleAqiOverlay();
  });

  dom.mapTypeToggle.addEventListener('click', () => {
    toggleMapType();
  });
}

async function initGoogleMap(config) {
  await loadMapsJsBootstrap(config.mapsApiKey);

  const [{ Map }, { AdvancedMarkerElement, PinElement }, { PlaceAutocompleteElement }, { Geocoder }] =
    await Promise.all([
      window.google.maps.importLibrary('maps'),
      window.google.maps.importLibrary('marker'),
      window.google.maps.importLibrary('places'),
      window.google.maps.importLibrary('geocoding'),
    ]);

  state.PinElementCtor = PinElement;
  state.geocoder = new Geocoder();

  const seed = await resolveSeedLocation();
  state.activeLocation = {
    name: seed.name,
    address: seed.address,
    lat: seed.lat,
    lng: seed.lng,
  };
  updateLocationUI();

  state.map = new Map(dom.mapContainer, {
    center: { lat: seed.lat, lng: seed.lng },
    zoom: config.initialZoom ?? SEED_DEFAULTS.zoom,
    mapId: 'DEMO_MAP_ID',
    mapTypeId: state.mapTypeId,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const pin = new PinElement({
    background: '#0f766e',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
  });

  state.marker = new AdvancedMarkerElement({
    map: state.map,
    position: { lat: seed.lat, lng: seed.lng },
    content: pin,
    title: seed.name,
  });

  const autocompleteEl = new PlaceAutocompleteElement({
    locationBias: { center: { lat: seed.lat, lng: seed.lng }, radius: 50000 },
  });
  autocompleteEl.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
  autocompleteEl.setAttribute('placeholder', 'Search any address, city, or building…');

  autocompleteEl.addEventListener('gmp-select', async (event) => {
    try {
      const placePrediction = event.placePrediction;
      if (!placePrediction) return;
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      if (!place.location) return;

      await inspectLocation({
        name: place.displayName ?? 'Selected Place',
        address: place.formattedAddress ?? formatCoords(place.location.lat(), place.location.lng()),
        lat: place.location.lat(),
        lng: place.location.lng(),
        zoom: 17,
      });
    } catch {
      dom.locationStatusChip.textContent = 'Search Error';
    }
  });

  autocompleteEl.addEventListener('gmp-error', () => {
    showConfigNotice(
      'Places Autocomplete could not authorize with the configured API key. Verify Places API (New) and Maps JavaScript API are enabled.'
    );
  });

  dom.autocompleteContainer.replaceChildren(autocompleteEl);

  state.map.addListener('click', async (event) => {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    let resolvedName = 'Selected Map Coordinate';
    let resolvedAddress = formatCoords(lat, lng);

    if (state.geocoder) {
      try {
        const geocodeResult = await state.geocoder.geocode({ location: { lat, lng } });
        const top = geocodeResult?.results?.[0];
        if (top) {
          resolvedAddress = top.formatted_address ?? resolvedAddress;
          resolvedName = resolvedAddress.split(',')[0] || resolvedName;
        }
      } catch {
        // Fallback to raw coordinates if Geocoding API is unavailable
      }
    }

    await inspectLocation({
      name: resolvedName,
      address: resolvedAddress,
      lat,
      lng,
    });
  });

  await loadEnvironmentalData(seed.lat, seed.lng);
}

async function bootstrap() {
  updateLocationUI();
  wireControls();

  const configRes = await fetchJsonSafe('/api/config');
  if (!configRes.ok) {
    showConfigNotice('Unable to reach local Express backend (/api/config).');
    return;
  }

  const config = configRes.data;
  state.apiKeyConfigured = Boolean(config.hasApiKey && config.mapsApiKey);

  if (!state.apiKeyConfigured) {
    showConfigNotice(
      'GOOGLE_MAPS_API_KEY is not configured in .env. Add a Maps Demo Key or Google Cloud API key to load the interactive Google Map and live Weather, Air Quality, Pollen, and Solar telemetry.'
    );
    dom.locationStatusChip.textContent = 'Key Required';
    dom.autocompleteContainer.replaceChildren(
      el('div', 'autocomplete-fallback', 'Configure GOOGLE_MAPS_API_KEY in .env to enable Places search')
    );
    dom.weatherContent.replaceChildren(
      el('p', 'muted-state', 'Configure GOOGLE_MAPS_API_KEY in .env to load live Weather API conditions.')
    );
    dom.weatherForecastList.replaceChildren(
      el('p', 'muted-state', 'Waiting for API key.')
    );
    dom.aqiContent.replaceChildren(
      el('p', 'muted-state', 'Configure GOOGLE_MAPS_API_KEY in .env to load Air Quality Index data.')
    );
    dom.pollenContent.replaceChildren(
      el('p', 'muted-state', 'Configure GOOGLE_MAPS_API_KEY in .env to load Pollen forecast data.')
    );
    const solarNotice = el(
      'div',
      'solar-non-coverage',
      'Configure GOOGLE_MAPS_API_KEY in .env to evaluate Solar API rooftop insights.'
    );
    solarNotice.setAttribute('data-testid', 'solar-non-coverage');
    dom.solarContent.replaceChildren(solarNotice);
    return;
  }

  try {
    await initGoogleMap(config);
  } catch (err) {
    showConfigNotice(
      `Failed to initialize Google Maps JavaScript API: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`
    );
  }
}

void bootstrap();
