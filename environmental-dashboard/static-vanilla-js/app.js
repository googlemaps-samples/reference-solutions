import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const PHOENIX_SEED = {
  query: 'Phoenix City Hall, Phoenix, AZ',
  name: 'Phoenix City Hall',
  address: '200 W Washington St, Phoenix, AZ 85003, USA',
  lat: 33.4484,
  lng: -112.074,
  zoom: 16,
  source: 'Seeded',
};

const state = {
  location: { ...PHOENIX_SEED },
  unitsSystem: 'IMPERIAL', // 'IMPERIAL' | 'METRIC'
  aqiLayerEnabled: false,
  mapTypeId: 'roadmap', // 'roadmap' | 'hybrid'
  requestSeq: 0,
  lastSolarData: null,
};

let map = null;
let marker = null;
let solarBoundsRect = null;
let aqiOverlay = null;
let geocoder = null;
let RectangleCtor = null;

// DOM helpers (never use innerHTML/outerHTML/insertAdjacentHTML/document.write)
function el(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = String(options.text);
  }
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      if (v !== undefined && v !== null) {
        node.setAttribute(k, String(v));
      }
    }
  }
  if (options.style) {
    Object.assign(node.style, options.style);
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) {
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  return node;
}

function getDom(id) {
  return document.getElementById(id);
}

function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function formatShortCoords(lat, lng) {
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function toCssColor(colorObj, fallbackRgb = '16, 185, 129') {
  if (!colorObj || typeof colorObj !== 'object') {
    return { bg: `rgb(${fallbackRgb})`, fg: '#ffffff' };
  }
  const rawR = Number(colorObj.red || 0);
  const rawG = Number(colorObj.green || 0);
  const rawB = Number(colorObj.blue || 0);
  const isNormalized = Math.max(rawR, rawG, rawB) <= 1;
  const r = Math.round(isNormalized ? rawR * 255 : rawR);
  const g = Math.round(isNormalized ? rawG * 255 : rawG);
  const b = Math.round(isNormalized ? rawB * 255 : rawB);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    fg: luminance > 0.62 ? '#0f172a' : '#ffffff',
  };
}

function showBanner(message) {
  const banner = getDom('api-key-banner');
  if (!banner) return;
  banner.replaceChildren(
    el('strong', { text: 'API Key Required: ' }),
    document.createTextNode(message)
  );
  banner.classList.remove('hidden');
}

function hideBanner() {
  const banner = getDom('api-key-banner');
  if (!banner) return;
  banner.classList.add('hidden');
  banner.replaceChildren();
}

function updateLocationUI() {
  const { name, address, lat, lng, source } = state.location;
  const badgeText = getDom('active-location-badge-text');
  if (badgeText) {
    badgeText.textContent = `${name} · ${formatShortCoords(lat, lng)}`;
  }

  const nameEl = getDom('location-name');
  if (nameEl) nameEl.textContent = name;

  const addrEl = getDom('location-address');
  if (addrEl) addrEl.textContent = address;

  const coordsEl = getDom('location-coords');
  if (coordsEl) coordsEl.textContent = formatCoords(lat, lng);

  const sourceChip = getDom('location-source-chip');
  if (sourceChip) sourceChip.textContent = source || 'Selected';
}

function renderLoadingState() {
  const weatherBody = getDom('weather-current-body');
  const forecastList = getDom('weather-forecast-list');
  const aqiBody = getDom('air-quality-body');
  const pollenBody = getDom('pollen-body');
  const solarBody = getDom('solar-body');

  weatherBody?.replaceChildren(el('p', { className: 'loading-copy', text: 'Loading current weather…' }));
  forecastList?.replaceChildren(el('p', { className: 'loading-copy', text: 'Loading 5-day forecast…' }));
  aqiBody?.replaceChildren(el('p', { className: 'loading-copy', text: 'Loading air quality index…' }));
  pollenBody?.replaceChildren(el('p', { className: 'loading-copy', text: 'Loading pollen forecast…' }));
  solarBody?.replaceChildren(el('p', { className: 'loading-copy', text: 'Inspecting rooftop solar potential…' }));
}

function formatTemp(tempObj) {
  if (!tempObj || typeof tempObj.degrees !== 'number') return '—';
  const unitLabel = tempObj.unit === 'CELSIUS' ? '°C' : '°F';
  return `${Math.round(tempObj.degrees)}${unitLabel}`;
}

function formatWind(windObj) {
  const speed = windObj?.speed?.value;
  if (typeof speed !== 'number') return '—';
  const unit = windObj?.speed?.unit === 'KILOMETERS_PER_HOUR' ? 'km/h' : 'mph';
  const cardinal = windObj?.direction?.cardinal || '';
  const dirShort = cardinal
    .replace('NORTH', 'N')
    .replace('SOUTH', 'S')
    .replace('EAST', 'E')
    .replace('WEST', 'W')
    .replace(/_/g, '');
  return `${Math.round(speed)} ${unit}${dirShort ? ` ${dirShort}` : ''}`;
}

function renderWeatherCurrent(data, errorMsg) {
  const container = getDom('weather-current-body');
  const timeChip = getDom('weather-time-chip');
  if (!container) return;

  if (errorMsg || !data || data.error) {
    if (timeChip) timeChip.textContent = 'Unavailable';
    const msg = errorMsg || data?.error?.message || data?.error || 'Weather data unavailable.';
    container.replaceChildren(el('div', { className: 'error-box', text: msg }));
    return;
  }

  if (timeChip) {
    timeChip.textContent = data.isDaytime === false ? 'Night' : 'Daytime';
  }

  const iconBase = data.weatherCondition?.iconBaseUri;
  const iconEl = iconBase
    ? el('img', {
        className: 'weather-icon',
        attrs: {
          src: `${iconBase}.svg`,
          alt: data.weatherCondition?.description?.text || 'Weather icon',
        },
      })
    : null;
  if (iconEl) {
    iconEl.addEventListener('error', () => {
      iconEl.style.display = 'none';
    });
  }

  const condText = data.weatherCondition?.description?.text || 'Current conditions';
  const precipPct = data.precipitation?.probability?.percent;
  const humidity = data.relativeHumidity;
  const uv = data.uvIndex;
  const cloud = data.cloudCover;

  const hero = el(
    'div',
    { className: 'weather-hero' },
    el(
      'div',
      { className: 'weather-temp-group' },
      iconEl,
      el(
        'div',
        {},
        el('div', { className: 'weather-temp-value', text: formatTemp(data.temperature) }),
        el('div', { className: 'weather-condition-text', text: condText })
      )
    ),
    el('div', {
      className: 'weather-feels',
      text: `Feels like ${formatTemp(data.feelsLikeTemperature)}`,
    })
  );

  const metrics = el(
    'div',
    { className: 'metrics-grid' },
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Humidity' }),
      el('span', { className: 'metric-value', text: typeof humidity === 'number' ? `${humidity}%` : '—' })
    ),
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'UV Index' }),
      el('span', { className: 'metric-value', text: typeof uv === 'number' ? String(uv) : '—' })
    ),
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Wind' }),
      el('span', { className: 'metric-value', text: formatWind(data.wind) })
    ),
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Precip / Clouds' }),
      el('span', {
        className: 'metric-value',
        text: `${typeof precipPct === 'number' ? `${precipPct}%` : '0%'} · ${
          typeof cloud === 'number' ? `${cloud}%` : '—'
        }`,
      })
    )
  );

  container.replaceChildren(hero, metrics);
}

function formatForecastDayLabel(dateObj) {
  if (!dateObj || !dateObj.year || !dateObj.month || !dateObj.day) {
    return 'Day';
  }
  const dt = new Date(Date.UTC(dateObj.year, dateObj.month - 1, dateObj.day));
  return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function renderWeatherForecast(data, errorMsg) {
  const listEl = getDom('weather-forecast-list');
  if (!listEl) return;

  if (errorMsg || !data || data.error || !Array.isArray(data.forecastDays)) {
    const msg = errorMsg || data?.error?.message || data?.error || 'Forecast unavailable.';
    listEl.replaceChildren(el('div', { className: 'error-box', text: msg }));
    return;
  }

  const cards = data.forecastDays.slice(0, 5).map((day) => {
    const dayLabel = formatForecastDayLabel(day.displayDate);
    const iconBase = day.daytimeForecast?.weatherCondition?.iconBaseUri;
    const icon = iconBase
      ? el('img', {
          className: 'forecast-day-icon',
          attrs: {
            src: `${iconBase}.svg`,
            alt: day.daytimeForecast?.weatherCondition?.description?.text || dayLabel,
          },
        })
      : null;
    if (icon) {
      icon.addEventListener('error', () => {
        icon.style.display = 'none';
      });
    }

    const precipPct = day.daytimeForecast?.precipitation?.probability?.percent ?? 0;
    const maxT = formatTemp(day.maxTemperature);
    const minT = formatTemp(day.minTemperature);

    return el(
      'div',
      { className: 'forecast-day-item' },
      el('span', { className: 'forecast-day-name', text: dayLabel }),
      icon,
      el(
        'div',
        { className: 'forecast-temps' },
        el('span', { text: maxT }),
        document.createTextNode(' '),
        el('span', { className: 'forecast-low', text: minT })
      ),
      el('span', { className: 'forecast-precip', text: `${precipPct}%` })
    );
  });

  listEl.replaceChildren(...cards);
}

function renderAirQuality(data, errorMsg) {
  const container = getDom('air-quality-body');
  const regionChip = getDom('aqi-region-chip');
  if (!container) return;

  if (errorMsg || !data || data.error || !Array.isArray(data.indexes) || data.indexes.length === 0) {
    const msg = errorMsg || data?.error?.message || data?.error || 'Air quality data unavailable.';
    container.replaceChildren(el('div', { className: 'error-box', text: msg }));
    return;
  }

  if (regionChip && data.regionCode) {
    regionChip.textContent = String(data.regionCode).toUpperCase();
  }

  // Prefer US EPA / local AQI if present, otherwise Universal AQI
  const primaryIndex =
    data.indexes.find((idx) => idx.code && idx.code !== 'uaqi') || data.indexes[0];
  const colorStyle = toCssColor(primaryIndex.color);

  const hero = el(
    'div',
    { className: 'aqi-hero' },
    el(
      'div',
      {
        className: 'aqi-badge',
        style: { backgroundColor: colorStyle.bg, color: colorStyle.fg },
      },
      el('span', { className: 'aqi-score', text: primaryIndex.aqiDisplay ?? primaryIndex.aqi ?? '—' }),
      el('span', { className: 'aqi-unit-label', text: primaryIndex.code === 'uaqi' ? 'UAQI' : 'AQI' })
    ),
    el(
      'div',
      { className: 'aqi-summary' },
      el('p', { className: 'aqi-category', text: primaryIndex.category || primaryIndex.displayName }),
      el('p', {
        className: 'aqi-dominant',
        text: `${primaryIndex.displayName || 'Air Quality'} · Dominant: ${String(
          primaryIndex.dominantPollutant || 'N/A'
        ).toUpperCase()}`,
      })
    )
  );

  const nodes = [hero];

  if (Array.isArray(data.pollutants) && data.pollutants.length > 0) {
    const chips = data.pollutants.slice(0, 6).map((p) => {
      const val = p.concentration?.value;
      const units = p.concentration?.units === 'PARTS_PER_BILLION' ? 'ppb' : 'µg/m³';
      const formattedVal = typeof val === 'number' ? `${val.toFixed(1)} ${units}` : '—';
      return el(
        'div',
        { className: 'pollutant-chip' },
        el('strong', { text: `${p.displayName || p.code}: ` }),
        document.createTextNode(formattedVal)
      );
    });
    nodes.push(el('div', { className: 'pollutant-chips' }, ...chips));
  }

  const recommendation =
    data.healthRecommendations?.generalPopulation ||
    data.healthRecommendations?.lungDiseasePopulation ||
    data.healthRecommendations?.athletes;

  if (recommendation) {
    nodes.push(el('div', { className: 'advice-box', text: recommendation }));
  }

  container.replaceChildren(...nodes);
}

function renderPollen(data, errorMsg) {
  const container = getDom('pollen-body');
  const dateChip = getDom('pollen-date-chip');
  if (!container) return;

  if (errorMsg || !data || data.error || !Array.isArray(data.dailyInfo) || data.dailyInfo.length === 0) {
    const msg = errorMsg || data?.error?.message || data?.error || 'Pollen forecast unavailable.';
    container.replaceChildren(el('div', { className: 'error-box', text: msg }));
    return;
  }

  const today = data.dailyInfo[0];
  if (dateChip && today.date) {
    dateChip.textContent = `${today.date.month}/${today.date.day}/${today.date.year}`;
  }

  const types = Array.isArray(today.pollenTypeInfo) ? today.pollenTypeInfo : [];
  const rows = types.map((t) => {
    const upi = typeof t.indexInfo?.value === 'number' ? t.indexInfo.value : 0;
    const category = t.indexInfo?.category || (t.inSeason ? 'Low' : 'Out of season');
    const pct = Math.min(100, Math.max(8, (upi / 5) * 100));
    const color = toCssColor(t.indexInfo?.color, '16, 185, 129');

    return el(
      'div',
      { className: 'pollen-row' },
      el(
        'div',
        { className: 'pollen-row-top' },
        el('span', { className: 'pollen-name', text: t.displayName || t.code }),
        el('span', {
          className: 'pollen-status',
          text: `${category} (${upi}/5) · ${t.inSeason ? 'In Season' : 'Off Season'}`,
        })
      ),
      el(
        'div',
        { className: 'pollen-bar-track' },
        el('div', {
          className: 'pollen-bar-fill',
          style: { width: `${pct}%`, backgroundColor: color.bg },
        })
      )
    );
  });

  const nodes = [el('div', { className: 'pollen-list' }, ...rows)];

  const activePlants = Array.isArray(today.plantInfo)
    ? today.plantInfo.filter((p) => p.inSeason || (p.indexInfo?.value ?? 0) > 0).slice(0, 5)
    : [];
  const fallbackPlants = activePlants.length
    ? activePlants
    : (Array.isArray(today.plantInfo) ? today.plantInfo.slice(0, 4) : []);

  if (fallbackPlants.length > 0) {
    const pills = fallbackPlants.map((p) => {
      const cat = p.indexInfo?.category ? ` (${p.indexInfo.category})` : '';
      return el('span', { className: 'plant-pill', text: `${p.displayName || p.code}${cat}` });
    });
    nodes.push(
      el(
        'div',
        { className: 'subsection' },
        el('h3', { className: 'subsection-title', text: 'Notable Plant Allergens' }),
        el('div', { className: 'plants-list' }, ...pills)
      )
    );
  }

  const pollenAdvice = types.find((t) => Array.isArray(t.healthRecommendations) && t.healthRecommendations.length)
    ?.healthRecommendations?.[0];
  if (pollenAdvice) {
    nodes.push(el('div', { className: 'advice-box', text: pollenAdvice }));
  }

  container.replaceChildren(...nodes);
}

function updateSolarBoundingBoxOnMap(boundingBox) {
  if (solarBoundsRect) {
    solarBoundsRect.setMap(null);
    solarBoundsRect = null;
  }
  if (!map || !RectangleCtor || !boundingBox?.sw || !boundingBox?.ne) {
    return;
  }
  solarBoundsRect = new RectangleCtor({
    map,
    clickable: false,
    strokeColor: '#ea580c',
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: '#f97316',
    fillOpacity: 0.16,
    bounds: {
      north: boundingBox.ne.latitude,
      south: boundingBox.sw.latitude,
      east: boundingBox.ne.longitude,
      west: boundingBox.sw.longitude,
    },
  });
}

function renderSolar(data, errorInfo) {
  const container = getDom('solar-body');
  const qualityChip = getDom('solar-quality-chip');
  if (!container) return;

  if (errorInfo?.notFound || data?.coverageAvailable === false) {
    state.lastSolarData = null;
    updateSolarBoundingBoxOnMap(null);
    if (qualityChip) qualityChip.textContent = 'No Building';
    container.replaceChildren(
      el(
        'div',
        {
          className: 'non-coverage-box',
          attrs: { 'data-testid': 'solar-non-coverage' },
        },
        el('p', {
          className: 'non-coverage-title',
          text: 'No rooftop solar building insights within 50m',
        }),
        el('p', {
          className: 'muted-copy',
          text:
            data?.message ||
            'Click directly on a building rooftop on the map or search a street address to inspect solar panel capacity and annual sunshine hours.',
        })
      )
    );
    return;
  }

  if (errorInfo?.message || !data || data.error || !data.solarPotential) {
    state.lastSolarData = null;
    updateSolarBoundingBoxOnMap(null);
    if (qualityChip) qualityChip.textContent = 'Unavailable';
    const msg =
      errorInfo?.message || data?.error?.message || data?.error || 'Solar API insights unavailable.';
    container.replaceChildren(
      el(
        'div',
        {
          className: 'non-coverage-box',
          attrs: { 'data-testid': 'solar-non-coverage' },
        },
        el('p', { className: 'non-coverage-title', text: 'Solar insights unavailable' }),
        el('p', { className: 'muted-copy', text: msg })
      )
    );
    return;
  }

  state.lastSolarData = data;
  updateSolarBoundingBoxOnMap(data.boundingBox);

  const sp = data.solarPotential;
  if (qualityChip) {
    qualityChip.textContent = data.imageryQuality ? `${data.imageryQuality} Imagery` : 'Verified';
  }

  const panelsCount = sp.maxArrayPanelsCount ?? 0;
  const panelWatts = sp.panelCapacityWatts ?? 400;
  const arrayKw = ((panelsCount * panelWatts) / 1000).toFixed(1);
  const sunshineHours = Math.round(sp.maxSunshineHoursPerYear ?? 0).toLocaleString('en-US');

  const roofMeters2 = sp.wholeRoofStats?.areaMeters2 ?? sp.maxArrayAreaMeters2 ?? 0;
  const roofAreaFormatted =
    state.unitsSystem === 'IMPERIAL'
      ? `${Math.round(roofMeters2 * 10.7639).toLocaleString('en-US')} sq ft`
      : `${Math.round(roofMeters2).toLocaleString('en-US')} m²`;

  const carbonFactor = sp.carbonOffsetFactorKgPerMwh
    ? `${Math.round(sp.carbonOffsetFactorKgPerMwh)} kg CO₂/MWh`
    : '—';

  const maxConfig =
    Array.isArray(sp.solarPanelConfigs) && sp.solarPanelConfigs.length > 0
      ? sp.solarPanelConfigs[sp.solarPanelConfigs.length - 1]
      : null;

  const grid = el(
    'div',
    { className: 'metrics-grid' },
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Max Solar Panels' }),
      el('span', { className: 'metric-value', text: `${panelsCount.toLocaleString('en-US')} (${arrayKw} kW)` })
    ),
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Annual Sunshine' }),
      el('span', { className: 'metric-value', text: `${sunshineHours} hrs/yr` })
    ),
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Usable Roof Area' }),
      el('span', { className: 'metric-value', text: roofAreaFormatted })
    ),
    el(
      'div',
      { className: 'metric-box' },
      el('span', { className: 'metric-label', text: 'Grid Carbon Offset' }),
      el('span', { className: 'metric-value', text: carbonFactor })
    )
  );

  const nodes = [grid];

  if (maxConfig?.yearlyEnergyDcKwh) {
    nodes.push(
      el('div', {
        className: 'advice-box',
        text: `Estimated peak DC generation: ${Math.round(
          maxConfig.yearlyEnergyDcKwh
        ).toLocaleString('en-US')} kWh/yr with ${maxConfig.panelsCount} panels (${panelWatts}W each).`,
      })
    );
  }

  if (data.imageryDate?.year) {
    nodes.push(
      el(
        'div',
        { className: 'solar-meta' },
        el('span', {
          text: `Aerial imagery: ${data.imageryDate.year}-${String(data.imageryDate.month).padStart(
            2,
            '0'
          )}-${String(data.imageryDate.day).padStart(2, '0')}`,
        }),
        el('span', { text: data.postalCode ? `ZIP ${data.postalCode}` : '' })
      )
    );
  }

  container.replaceChildren(...nodes);
}

async function fetchJsonSafe(url, options) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      data: { error: err instanceof Error ? err.message : 'Network error' },
    };
  }
}

async function loadEnvironmentalData(lat, lng) {
  const reqId = ++state.requestSeq;
  const units = state.unitsSystem;

  renderLoadingState();

  const [weatherCurrRes, weatherForecastRes, aqiRes, pollenRes, solarRes] = await Promise.all([
    fetchJsonSafe(`/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`),
    fetchJsonSafe(`/api/weather/forecast?lat=${lat}&lng=${lng}&unitsSystem=${units}&days=5`),
    fetchJsonSafe('/api/air-quality/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    }),
    fetchJsonSafe(`/api/pollen/forecast?lat=${lat}&lng=${lng}&days=3`),
    fetchJsonSafe(`/api/solar/building-insights?lat=${lat}&lng=${lng}`),
  ]);

  // Discard stale responses if user selected a newer location
  if (reqId !== state.requestSeq) {
    return;
  }

  renderWeatherCurrent(
    weatherCurrRes.data,
    weatherCurrRes.ok ? null : weatherCurrRes.data?.error?.message || weatherCurrRes.data?.error
  );
  renderWeatherForecast(
    weatherForecastRes.data,
    weatherForecastRes.ok
      ? null
      : weatherForecastRes.data?.error?.message || weatherForecastRes.data?.error
  );
  renderAirQuality(
    aqiRes.data,
    aqiRes.ok ? null : aqiRes.data?.error?.message || aqiRes.data?.error
  );
  renderPollen(
    pollenRes.data,
    pollenRes.ok ? null : pollenRes.data?.error?.message || pollenRes.data?.error
  );

  if (solarRes.status === 404 || solarRes.data?.coverageAvailable === false) {
    renderSolar(solarRes.data, { notFound: true });
  } else if (!solarRes.ok) {
    renderSolar(solarRes.data, {
      message: solarRes.data?.error?.message || solarRes.data?.error || 'Solar API unavailable.',
    });
  } else {
    renderSolar(solarRes.data, null);
  }
}

async function refreshWeatherOnly() {
  const reqId = ++state.requestSeq;
  const { lat, lng } = state.location;
  const units = state.unitsSystem;

  const [weatherCurrRes, weatherForecastRes] = await Promise.all([
    fetchJsonSafe(`/api/weather/current?lat=${lat}&lng=${lng}&unitsSystem=${units}`),
    fetchJsonSafe(`/api/weather/forecast?lat=${lat}&lng=${lng}&unitsSystem=${units}&days=5`),
  ]);

  if (reqId !== state.requestSeq) return;

  renderWeatherCurrent(
    weatherCurrRes.data,
    weatherCurrRes.ok ? null : weatherCurrRes.data?.error?.message || weatherCurrRes.data?.error
  );
  renderWeatherForecast(
    weatherForecastRes.data,
    weatherForecastRes.ok
      ? null
      : weatherForecastRes.data?.error?.message || weatherForecastRes.data?.error
  );
  if (state.lastSolarData) {
    renderSolar(state.lastSolarData, null);
  }
}

function setActiveLocation(nextLoc, options = { panMap: true, zoom: null }) {
  state.location = { ...nextLoc };
  updateLocationUI();

  if (marker) {
    marker.position = { lat: nextLoc.lat, lng: nextLoc.lng };
    marker.title = nextLoc.name;
  }
  if (map && options.panMap) {
    map.panTo({ lat: nextLoc.lat, lng: nextLoc.lng });
    if (options.zoom) {
      map.setZoom(options.zoom);
    }
  }

  loadEnvironmentalData(nextLoc.lat, nextLoc.lng);
}

async function resolveSeedLocation() {
  const res = await fetchJsonSafe('/api/places/search-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textQuery: PHOENIX_SEED.query }),
  });

  const first = res.ok && Array.isArray(res.data?.places) ? res.data.places[0] : null;
  if (first?.location) {
    return {
      query: PHOENIX_SEED.query,
      name: first.displayName?.text || PHOENIX_SEED.name,
      address: first.formattedAddress || PHOENIX_SEED.address,
      lat: Number(first.location.latitude),
      lng: Number(first.location.longitude),
      zoom: PHOENIX_SEED.zoom,
      source: 'Seeded',
    };
  }
  return { ...PHOENIX_SEED };
}

function wireHeaderControls() {
  const resetBtn = getDom('reset-phoenix-btn');
  resetBtn?.addEventListener('click', () => {
    setActiveLocation({ ...PHOENIX_SEED }, { panMap: true, zoom: PHOENIX_SEED.zoom });
  });

  const unitsBtn = getDom('units-toggle-btn');
  unitsBtn?.addEventListener('click', () => {
    const nextIsMetric = state.unitsSystem === 'IMPERIAL';
    state.unitsSystem = nextIsMetric ? 'METRIC' : 'IMPERIAL';
    unitsBtn.setAttribute('aria-pressed', String(nextIsMetric));
    unitsBtn.textContent = nextIsMetric ? '°C · Metric' : '°F · Imperial';
    refreshWeatherOnly();
  });

  const aqiBtn = getDom('aqi-layer-toggle');
  aqiBtn?.addEventListener('click', () => {
    state.aqiLayerEnabled = !state.aqiLayerEnabled;
    aqiBtn.setAttribute('aria-pressed', String(state.aqiLayerEnabled));
    aqiBtn.textContent = state.aqiLayerEnabled ? 'AQI Tiles: On' : 'AQI Tiles: Off';

    const legend = getDom('aqi-legend');
    if (legend) {
      legend.hidden = !state.aqiLayerEnabled;
    }

    if (map && aqiOverlay) {
      if (state.aqiLayerEnabled) {
        if (map.overlayMapTypes.getLength() === 0) {
          map.overlayMapTypes.push(aqiOverlay);
        }
      } else {
        map.overlayMapTypes.clear();
      }
    }
  });

  const mapTypeBtn = getDom('map-type-toggle');
  mapTypeBtn?.addEventListener('click', () => {
    const nextIsHybrid = state.mapTypeId === 'roadmap';
    state.mapTypeId = nextIsHybrid ? 'hybrid' : 'roadmap';
    mapTypeBtn.setAttribute('aria-pressed', String(nextIsHybrid));
    mapTypeBtn.textContent = nextIsHybrid ? 'Map: Hybrid' : 'Map: Roadmap';
    if (map) {
      map.setMapTypeId(state.mapTypeId);
    }
  });
}

async function initMapAndSearch(apiKey, initialLoc) {
  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
  });

  const [mapsLib, markerLib, placesLib, geocodingLib] = await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('geocoding'),
  ]);

  const { Map, ImageMapType, Rectangle, Size } = mapsLib;
  const { AdvancedMarkerElement, PinElement } = markerLib;
  const { PlaceAutocompleteElement } = placesLib;
  const { Geocoder } = geocodingLib;

  RectangleCtor = Rectangle;
  geocoder = new Geocoder();

  const mapEl = getDom('map');
  if (!mapEl) return;

  map = new Map(mapEl, {
    center: { lat: initialLoc.lat, lng: initialLoc.lng },
    zoom: initialLoc.zoom || 16,
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const pin = new PinElement({
    background: '#0f766e',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    scale: 1.1,
  });

  marker = new AdvancedMarkerElement({
    map,
    position: { lat: initialLoc.lat, lng: initialLoc.lng },
    title: initialLoc.name,
  });
  marker.append(pin);

  // Native WebGL-free ImageMapType overlay for US_AQI heatmap tiles
  aqiOverlay = new ImageMapType({
    name: 'US AQI',
    alt: 'US Air Quality Index Heatmap',
    tileSize: new Size(256, 256),
    minZoom: 0,
    maxZoom: 16,
    opacity: 0.65,
    getTileUrl(coord, zoom) {
      if (zoom < 0 || zoom > 16) return '';
      const maxTile = 1 << zoom;
      if (coord.y < 0 || coord.y >= maxTile) return '';
      const wrappedX = ((coord.x % maxTile) + maxTile) % maxTile;
      return `/api/air-quality/tiles?mapType=US_AQI&zoom=${zoom}&x=${wrappedX}&y=${coord.y}`;
    },
  });

  // Mount modern PlaceAutocompleteElement in header
  const autocompleteContainer = document.querySelector(
    '[data-testid="places-autocomplete-container"]'
  );
  if (autocompleteContainer) {
    const placeAutocomplete = new PlaceAutocompleteElement();
    autocompleteContainer.replaceChildren(placeAutocomplete);

    placeAutocomplete.addEventListener('gmp-select', async (event) => {
      const placePrediction = event?.placePrediction;
      if (!placePrediction) return;
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
      });
      if (!place.location) return;

      const lat = place.location.lat();
      const lng = place.location.lng();
      if (place.viewport) {
        map.fitBounds(place.viewport);
        const currentZoom = map.getZoom();
        if (typeof currentZoom === 'number' && currentZoom < 15) {
          map.setZoom(16);
        }
      }

      setActiveLocation(
        {
          name: place.displayName || 'Selected Place',
          address: place.formattedAddress || formatCoords(lat, lng),
          lat,
          lng,
          zoom: 17,
          source: 'Search',
        },
        { panMap: !place.viewport, zoom: place.viewport ? null : 17 }
      );
    });
  }

  // Click any building or coordinate on the map to inspect
  map.addListener('click', async (event) => {
    if (!event?.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    let resolvedName = 'Selected Map Coordinate';
    let resolvedAddress = formatCoords(lat, lng);

    if (geocoder) {
      try {
        const geocodeRes = await geocoder.geocode({ location: { lat, lng } });
        const topResult = geocodeRes?.results?.[0];
        if (topResult?.formatted_address) {
          resolvedAddress = topResult.formatted_address;
          resolvedName = topResult.formatted_address.split(',')[0] || 'Map Building Selection';
        }
      } catch {
        // Keep coordinate fallback if reverse geocoding is unavailable
      }
    }

    setActiveLocation(
      {
        name: resolvedName,
        address: resolvedAddress,
        lat,
        lng,
        source: 'Map Click',
      },
      { panMap: true }
    );
  });
}

async function bootstrap() {
  wireHeaderControls();
  updateLocationUI();

  const apiKey = (window.__GMP_CONFIG__?.apiKey || '').trim();
  if (!apiKey) {
    showBanner(
      'Set GOOGLE_MAPS_API_KEY in your .env file to load the interactive Google Map, Places Autocomplete, Weather, Air Quality, Pollen, and Solar APIs.'
    );
    const mapEl = getDom('map');
    mapEl?.replaceChildren(
      el(
        'div',
        {
          style: {
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#e2e8f0',
            color: '#334155',
            textAlign: 'center',
            fontWeight: '600',
          },
        },
        el('div', {}, 'Google Map awaits GOOGLE_MAPS_API_KEY in .env')
      )
    );
    return;
  }

  hideBanner();

  const seeded = await resolveSeedLocation();
  state.location = seeded;
  updateLocationUI();

  await Promise.all([
    initMapAndSearch(apiKey, seeded),
    loadEnvironmentalData(seeded.lat, seeded.lng),
  ]);
}

bootstrap().catch((err) => {
  showBanner(err instanceof Error ? err.message : 'Failed to initialize dashboard.');
});
