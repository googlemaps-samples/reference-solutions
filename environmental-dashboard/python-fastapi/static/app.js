const DEFAULT_SEED = {
  lat: 33.4484,
  lng: -112.074,
  zoom: 16,
  name: "Phoenix City Hall",
  address: "200 W Washington St, Phoenix, AZ 85003",
  seedQuery: "Phoenix City Hall, Phoenix, AZ",
};

const state = {
  config: null,
  unitsSystem: "IMPERIAL",
  aqiOverlayActive: false,
  mapTypeId: "roadmap",
  currentLocation: { ...DEFAULT_SEED },
  lastSolarPayload: null,
  lastSolarStatus: null,
  map: null,
  marker: null,
  PinElementClass: null,
  RectangleClass: null,
  solarRect: null,
  aqiImageMapType: null,
  geocoder: null,
  inspectSeq: 0,
};

function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined && textContent !== null) {
    node.textContent = String(textContent);
  }
  return node;
}

function setStatusChip(id, text, tone = "neutral") {
  const chip = document.getElementById(id);
  if (!chip) return;
  chip.textContent = text;
  chip.className = "status-chip";
  if (tone === "ok") chip.classList.add("ok");
  if (tone === "warn") chip.classList.add("warn");
}

function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function formatShortCoords(lat, lng) {
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function updateLocationHeaderUI() {
  const { name, address, lat, lng } = state.currentLocation;
  const badge = document.querySelector('[data-testid="active-location-badge"]');
  if (badge) {
    badge.textContent = `${name} · ${formatShortCoords(lat, lng)}`;
  }
  const nameEl = document.getElementById("location-name");
  const addrEl = document.getElementById("location-address");
  const coordsEl = document.getElementById("location-coords");
  if (nameEl) nameEl.textContent = name;
  if (addrEl) addrEl.textContent = address || "Resolved map coordinates";
  if (coordsEl) coordsEl.textContent = formatCoords(lat, lng);
}

function installGoogleMapsBootstrap(params) {
  ((g) => {
    var h,
      a,
      k,
      p = "The Google Maps JavaScript API",
      c = "google",
      l = "importLibrary",
      q = "__ib__",
      m = document,
      b = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}),
      r = new Set(),
      e = new URLSearchParams(),
      u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          await (a = m.createElement("script"));
          e.set("libraries", [...r] + "");
          for (k in g) {
            e.set(
              k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
              g[k]
            );
          }
          e.set("callback", c + ".maps." + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => {
            h = null;
            n(new Error(p + " could not load."));
          };
          a.nonce = m.querySelector("script[nonce]")?.nonce || "";
          m.head.append(a);
        }));
    if (d[l]) {
      return;
    }
    d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
  })(params);
}

function createMetricBox(label, value) {
  const box = el("div", "metric-box");
  box.append(el("span", "metric-label", label), el("span", "metric-value", value));
  return box;
}

function formatTemp(tempObj) {
  if (!tempObj || typeof tempObj.degrees !== "number") return "—";
  const unitChar = tempObj.unit === "CELSIUS" ? "C" : "F";
  return `${Math.round(tempObj.degrees)}°${unitChar}`;
}

function formatWind(windObj) {
  if (!windObj || !windObj.speed || typeof windObj.speed.value !== "number") return "—";
  const unit = windObj.speed.unit === "KILOMETERS_PER_HOUR" ? "km/h" : "mph";
  const cardinal = windObj.direction?.cardinal || "";
  const shortCard = cardinal
    .replace("NORTH", "N")
    .replace("SOUTH", "S")
    .replace("EAST", "E")
    .replace("WEST", "W")
    .replace(/_/g, "");
  return `${Math.round(windObj.speed.value)} ${unit}${shortCard ? " " + shortCard : ""}`;
}

function renderWeatherCurrent(data, errorMsg) {
  const container = document.getElementById("weather-current-body");
  if (!container) return;

  if (errorMsg) {
    setStatusChip("weather-status-chip", "Unavailable", "warn");
    container.replaceChildren(el("div", "error-box", errorMsg));
    return;
  }

  setStatusChip("weather-status-chip", "Live", "ok");

  const hero = el("div", "weather-hero");
  const left = el("div", "weather-hero-left");
  if (data.weatherCondition?.iconBaseUri) {
    const icon = el("img", "weather-icon");
    icon.src = `${data.weatherCondition.iconBaseUri}.svg`;
    icon.alt = data.weatherCondition.description?.text || "Weather condition";
    left.append(icon);
  }
  const tempWrap = el("div");
  tempWrap.append(
    el("div", "weather-temp", formatTemp(data.temperature)),
    el(
      "div",
      "weather-desc",
      data.weatherCondition?.description?.text || "Current conditions"
    )
  );
  left.append(tempWrap);

  const tzId = data.timeZone?.id || "";
  hero.append(left, el("span", "muted-copy", tzId));

  const precipPct = data.precipitation?.probability?.percent;
  const qpf = data.precipitation?.qpf;
  const qpfText =
    qpf && typeof qpf.quantity === "number"
      ? `${qpf.quantity} ${qpf.unit === "INCHES" ? "in" : "mm"}`
      : "";
  const precipText =
    typeof precipPct === "number"
      ? `${precipPct}%${qpfText ? " (" + qpfText + ")" : ""}`
      : "—";

  const grid = el("div", "metrics-grid");
  grid.append(
    createMetricBox("Feels Like", formatTemp(data.feelsLikeTemperature)),
    createMetricBox(
      "Humidity",
      typeof data.relativeHumidity === "number" ? `${data.relativeHumidity}%` : "—"
    ),
    createMetricBox("UV Index", typeof data.uvIndex === "number" ? String(data.uvIndex) : "—"),
    createMetricBox("Wind", formatWind(data.wind)),
    createMetricBox("Precipitation", precipText),
    createMetricBox(
      "Cloud Cover",
      typeof data.cloudCover === "number" ? `${data.cloudCover}%` : "—"
    )
  );

  container.replaceChildren(hero, grid);
}

function formatDayName(displayDate) {
  if (!displayDate || !displayDate.year) return "Day";
  const dt = new Date(Date.UTC(displayDate.year, (displayDate.month || 1) - 1, displayDate.day || 1));
  return dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function renderWeatherForecast(data, errorMsg) {
  const container = document.getElementById("weather-forecast-body");
  if (!container) return;

  if (errorMsg) {
    container.replaceChildren();
    return;
  }

  const days = Array.isArray(data?.forecastDays) ? data.forecastDays.slice(0, 5) : [];
  if (days.length === 0) {
    container.replaceChildren(el("p", "muted-copy", "No daily forecast entries returned."));
    return;
  }

  const nodes = days.map((day) => {
    const card = el("div", "forecast-day");
    card.append(el("span", "forecast-day-name", formatDayName(day.displayDate)));

    const iconUri = day.daytimeForecast?.weatherCondition?.iconBaseUri;
    if (iconUri) {
      const img = el("img", "forecast-day-icon");
      img.src = `${iconUri}.svg`;
      img.alt = day.daytimeForecast?.weatherCondition?.description?.text || "Forecast";
      card.append(img);
    }

    const temps = el("div", "forecast-temps");
    const hi = formatTemp(day.maxTemperature);
    const lo = formatTemp(day.minTemperature);
    temps.append(document.createTextNode(`${hi} `));
    temps.append(el("span", "forecast-low", lo));
    card.append(temps);

    const rain = day.daytimeForecast?.precipitation?.probability?.percent;
    if (typeof rain === "number") {
      card.append(el("span", "muted-copy", `${rain}% rain`));
    }
    return card;
  });

  container.replaceChildren(...nodes);
}

function resolveColorCss(colorObj) {
  if (!colorObj) return "#e2e8f0";
  const rRaw = colorObj.red || 0;
  const gRaw = colorObj.green || 0;
  const bRaw = colorObj.blue || 0;
  const scale = Math.max(rRaw, gRaw, bRaw) <= 1 ? 255 : 1;
  const r = Math.round(rRaw * scale);
  const g = Math.round(gRaw * scale);
  const b = Math.round(bRaw * scale);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatPollutantUnit(units) {
  if (units === "MICROGRAMS_PER_CUBIC_METER") return "µg/m³";
  if (units === "PARTS_PER_BILLION") return "ppb";
  return units || "";
}

function renderAirQuality(data, errorMsg) {
  const container = document.getElementById("air-quality-body");
  if (!container) return;

  if (errorMsg) {
    setStatusChip("aqi-status-chip", "Unavailable", "warn");
    container.replaceChildren(el("div", "error-box", errorMsg));
    return;
  }

  const indexes = Array.isArray(data?.indexes) ? data.indexes : [];
  const primary =
    indexes.find((idx) => idx.code === "usa_epa") ||
    indexes[0] ||
    null;

  if (!primary) {
    setStatusChip("aqi-status-chip", "No Index", "warn");
    container.replaceChildren(el("p", "muted-copy", "No AQI data available for this point."));
    return;
  }

  setStatusChip("aqi-status-chip", primary.displayName || "Live", "ok");

  const hero = el("div", "aqi-hero");
  const badge = el("div", "aqi-badge");
  badge.style.backgroundColor = resolveColorCss(primary.color);
  badge.append(
    el("span", null, primary.aqiDisplay || String(primary.aqi ?? "—")),
    el("span", "aqi-badge-sub", primary.code === "usa_epa" ? "US AQI" : "UAQI")
  );

  const info = el("div");
  info.append(el("div", "aqi-category", primary.category || "Air Quality Index"));
  const dom = primary.dominantPollutant ? primary.dominantPollutant.toUpperCase() : "N/A";
  const secondary = indexes.find((idx) => idx.code !== primary.code);
  const metaParts = [`Dominant pollutant: ${dom}`];
  if (secondary) {
    metaParts.push(`${secondary.displayName}: ${secondary.aqiDisplay || secondary.aqi}`);
  }
  info.append(el("div", "aqi-meta", metaParts.join(" · ")));
  hero.append(badge, info);

  const children = [hero];

  const pollutants = Array.isArray(data?.pollutants) ? data.pollutants : [];
  if (pollutants.length > 0) {
    const pRow = el("div", "pollutant-row");
    for (const p of pollutants.slice(0, 6)) {
      const val =
        typeof p.concentration?.value === "number"
          ? p.concentration.value.toFixed(1)
          : "—";
      const unit = formatPollutantUnit(p.concentration?.units);
      const chip = el("span", "pollutant-chip", `${p.displayName}: ${val} ${unit}`.trim());
      if (p.additionalInfo?.effects) {
        chip.title = p.additionalInfo.effects;
      }
      pRow.append(chip);
    }
    children.push(pRow);
  }

  const rec = data?.healthRecommendations?.generalPopulation;
  if (rec) {
    children.push(el("div", "guidance-box", rec));
  }

  container.replaceChildren(...children);
}

function renderPollen(data, errorMsg) {
  const container = document.getElementById("pollen-body");
  if (!container) return;

  if (errorMsg) {
    setStatusChip("pollen-status-chip", "Unavailable", "warn");
    container.replaceChildren(el("div", "error-box", errorMsg));
    return;
  }

  const today = Array.isArray(data?.dailyInfo) ? data.dailyInfo[0] : null;
  if (!today) {
    setStatusChip("pollen-status-chip", "No Data", "warn");
    container.replaceChildren(el("p", "muted-copy", "No pollen forecast returned for this location."));
    return;
  }

  setStatusChip("pollen-status-chip", "Live", "ok");

  const types = Array.isArray(today.pollenTypeInfo) ? today.pollenTypeInfo : [];
  const grid = el("div", "pollen-grid");
  for (const t of types) {
    const tile = el("div", "pollen-tile");
    tile.append(el("div", "pollen-type", t.displayName || t.code));
    const score = t.indexInfo?.value;
    tile.append(el("div", "pollen-score", typeof score === "number" ? `${score}/5` : "0/5"));
    tile.append(el("div", "pollen-cat", t.indexInfo?.category || "Low / None"));
    tile.append(el("span", "pollen-season", t.inSeason ? "In season" : "Off season"));
    grid.append(tile);
  }

  const children = [grid];

  const plants = Array.isArray(today.plantInfo) ? today.plantInfo : [];
  const activePlants = plants.filter((p) => p.indexInfo || p.inSeason).slice(0, 6);
  if (activePlants.length > 0) {
    const tags = el("div", "plant-tags");
    for (const plant of activePlants) {
      const cat = plant.indexInfo?.category ? ` (${plant.indexInfo.category})` : "";
      const tag = el("span", "plant-tag", `${plant.displayName}${cat}`);
      if (plant.plantDescription?.crossReaction) {
        tag.title = `Cross-reaction: ${plant.plantDescription.crossReaction}`;
      }
      tags.append(tag);
    }
    children.push(tags);
  }

  const rec = types.find((t) => Array.isArray(t.healthRecommendations) && t.healthRecommendations.length > 0)
    ?.healthRecommendations?.[0];
  if (rec) {
    children.push(el("div", "guidance-box", rec));
  }

  container.replaceChildren(...children);
}

function updateSolarBoundingBox(boundingBox) {
  if (state.solarRect) {
    state.solarRect.setMap(null);
    state.solarRect = null;
  }
  if (!state.map || !state.RectangleClass || !boundingBox?.sw || !boundingBox?.ne) {
    return;
  }
  state.solarRect = new state.RectangleClass({
    map: state.map,
    bounds: {
      south: boundingBox.sw.latitude,
      west: boundingBox.sw.longitude,
      north: boundingBox.ne.latitude,
      east: boundingBox.ne.longitude,
    },
    strokeColor: "#d97706",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#fbbf24",
    fillOpacity: 0.22,
    clickable: false,
  });
}

function renderSolar(data, statusCode, errorMsg) {
  const container = document.getElementById("solar-body");
  if (!container) return;

  if (statusCode === 404) {
    setStatusChip("solar-status-chip", "No Building (<50m)", "warn");
    updateSolarBoundingBox(null);
    const box = el("div", "non-coverage-box");
    box.setAttribute("data-testid", "solar-non-coverage");
    box.append(
      el(
        "p",
        null,
        errorMsg ||
          "No building solar insights available within 50 meters of these coordinates."
      ),
      el(
        "p",
        "muted-copy",
        "Tip: Switch to Hybrid View and click directly on a nearby rooftop footprint to inspect panel capacity."
      )
    );
    container.replaceChildren(box);
    return;
  }

  if (errorMsg || !data?.solarPotential) {
    setStatusChip("solar-status-chip", "Unavailable", "warn");
    updateSolarBoundingBox(null);
    container.replaceChildren(
      el("div", "error-box", errorMsg || "Solar Building Insights unavailable.")
    );
    return;
  }

  setStatusChip("solar-status-chip", data.imageryQuality || "Live", "ok");
  updateSolarBoundingBox(data.boundingBox);

  const sp = data.solarPotential;
  const panels = sp.maxArrayPanelsCount || 0;
  const watts = sp.panelCapacityWatts || 400;
  const kwPeak = ((panels * watts) / 1000).toFixed(1);

  const highlight = el("div", "solar-highlight");
  highlight.append(
    el("span", "solar-capacity", `${kwPeak} kW Peak`),
    el("span", "solar-panels-sub", `${panels} panels (${Math.round(watts)}W each)`)
  );

  const roofM2 = sp.wholeRoofStats?.areaMeters2;
  let roofAreaText = "—";
  if (typeof roofM2 === "number") {
    if (state.unitsSystem === "IMPERIAL") {
      roofAreaText = `${Math.round(roofM2 * 10.7639).toLocaleString()} sq ft`;
    } else {
      roofAreaText = `${Math.round(roofM2).toLocaleString()} m²`;
    }
  }

  const maxSun =
    typeof sp.maxSunshineHoursPerYear === "number"
      ? `${Math.round(sp.maxSunshineHoursPerYear).toLocaleString()} hrs/yr`
      : "—";

  const carbon =
    typeof sp.carbonOffsetFactorKgPerMwh === "number"
      ? `${Math.round(sp.carbonOffsetFactorKgPerMwh)} kg/MWh`
      : "—";

  const configs = Array.isArray(sp.solarPanelConfigs) ? sp.solarPanelConfigs : [];
  const maxConfig = configs.length > 0 ? configs[configs.length - 1] : null;
  const annualKwh =
    typeof maxConfig?.yearlyEnergyDcKwh === "number"
      ? `${Math.round(maxConfig.yearlyEnergyDcKwh).toLocaleString()} kWh/yr`
      : "—";

  const grid = el("div", "metrics-grid");
  grid.append(
    createMetricBox("Max Sunshine", maxSun),
    createMetricBox("Roof Area", roofAreaText),
    createMetricBox("Est. Output", annualKwh),
    createMetricBox("CO₂ Offset", carbon)
  );

  container.replaceChildren(highlight, grid);
}

async function fetchJsonSafe(url, options) {
  try {
    const resp = await fetch(url, options);
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: err?.message || "Network error" } };
  }
}

async function fetchWeatherOnly(lat, lng) {
  const seq = state.inspectSeq;
  setStatusChip("weather-status-chip", "Updating…");
  const qs = `lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&unitsSystem=${state.unitsSystem}`;
  const [curRes, fcRes] = await Promise.all([
    fetchJsonSafe(`/api/weather/current?${qs}`),
    fetchJsonSafe(`/api/weather/forecast?${qs}&days=5`),
  ]);
  if (seq !== state.inspectSeq) return;

  if (curRes.ok) {
    renderWeatherCurrent(curRes.data, null);
  } else {
    renderWeatherCurrent(null, curRes.data?.message || curRes.data?.detail || "Weather API error");
  }

  if (fcRes.ok) {
    renderWeatherForecast(fcRes.data, null);
  } else {
    renderWeatherForecast(null, fcRes.data?.message || "Forecast unavailable");
  }
}

async function inspectLocation({ lat, lng, name, address, zoom, panTo = false }) {
  const seq = ++state.inspectSeq;
  state.currentLocation = {
    lat,
    lng,
    name: name || "Inspected Location",
    address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
  updateLocationHeaderUI();

  if (state.marker) {
    state.marker.position = { lat, lng };
    state.marker.title = state.currentLocation.name;
  }
  if (state.map && panTo) {
    state.map.panTo({ lat, lng });
    if (typeof zoom === "number") {
      state.map.setZoom(zoom);
    }
  }

  if (!state.config?.configured) {
    return;
  }

  setStatusChip("weather-status-chip", "Loading…");
  setStatusChip("aqi-status-chip", "Loading…");
  setStatusChip("pollen-status-chip", "Loading…");
  setStatusChip("solar-status-chip", "Loading…");

  const qs = `lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&unitsSystem=${state.unitsSystem}`;
  const coordsQs = `lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;

  const [weatherCur, weatherFc, aqiRes, pollenRes, solarRes] = await Promise.all([
    fetchJsonSafe(`/api/weather/current?${qs}`),
    fetchJsonSafe(`/api/weather/forecast?${qs}&days=5`),
    fetchJsonSafe("/api/air-quality/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: { latitude: lat, longitude: lng },
        universalAqi: true,
        languageCode: "en",
      }),
    }),
    fetchJsonSafe(`/api/pollen/forecast?${coordsQs}&days=3&plantsDescription=true`),
    fetchJsonSafe(`/api/solar/building-insights?${coordsQs}&requiredQuality=MEDIUM`),
  ]);

  if (seq !== state.inspectSeq) return;

  if (weatherCur.ok) {
    renderWeatherCurrent(weatherCur.data, null);
  } else {
    renderWeatherCurrent(null, weatherCur.data?.message || weatherCur.data?.detail || "Weather unavailable");
  }

  if (weatherFc.ok) {
    renderWeatherForecast(weatherFc.data, null);
  } else {
    renderWeatherForecast(null, weatherFc.data?.message || "Forecast unavailable");
  }

  if (aqiRes.ok) {
    renderAirQuality(aqiRes.data, null);
  } else {
    renderAirQuality(null, aqiRes.data?.message || aqiRes.data?.detail || "Air Quality unavailable");
  }

  if (pollenRes.ok) {
    renderPollen(pollenRes.data, null);
  } else {
    renderPollen(null, pollenRes.data?.message || pollenRes.data?.detail || "Pollen unavailable");
  }

  state.lastSolarPayload = solarRes.ok ? solarRes.data : null;
  state.lastSolarStatus = solarRes.status;
  if (solarRes.ok) {
    renderSolar(solarRes.data, 200, null);
  } else {
    renderSolar(
      null,
      solarRes.status,
      solarRes.data?.message || solarRes.data?.detail || "Solar data unavailable"
    );
  }
}

async function resolveSeedAndInspect() {
  const seedQuery = state.config?.initialLocation?.seedQuery || DEFAULT_SEED.seedQuery;
  let lat = state.config?.initialLocation?.lat ?? DEFAULT_SEED.lat;
  let lng = state.config?.initialLocation?.lng ?? DEFAULT_SEED.lng;
  let name = DEFAULT_SEED.name;
  let address = DEFAULT_SEED.address;

  const res = await fetchJsonSafe("/api/places/search-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ textQuery: seedQuery, maxResultCount: 1 }),
  });

  if (res.ok && Array.isArray(res.data?.places) && res.data.places.length > 0) {
    const place = res.data.places[0];
    if (place.location) {
      lat = place.location.latitude;
      lng = place.location.longitude;
    }
    if (place.displayName?.text) name = place.displayName.text;
    if (place.formattedAddress) address = place.formattedAddress;
  }

  setStatusChip("location-status-chip", "Seeded", "ok");
  await inspectLocation({
    lat,
    lng,
    name,
    address,
    zoom: state.config?.initialLocation?.zoom ?? DEFAULT_SEED.zoom,
    panTo: true,
  });
}

function toggleAqiLayer() {
  const btn = document.querySelector('[data-testid="aqi-layer-toggle"]');
  const legend = document.getElementById("aqi-legend");
  state.aqiOverlayActive = !state.aqiOverlayActive;

  if (btn) {
    btn.classList.toggle("active", state.aqiOverlayActive);
    btn.setAttribute("aria-pressed", String(state.aqiOverlayActive));
    btn.textContent = state.aqiOverlayActive ? "AQI Tiles: On" : "AQI Tiles: Off";
  }
  if (legend) {
    legend.classList.toggle("hidden", !state.aqiOverlayActive);
  }

  if (!state.map || !state.aqiImageMapType) return;
  state.map.overlayMapTypes.clear();
  if (state.aqiOverlayActive) {
    state.map.overlayMapTypes.push(state.aqiImageMapType);
  }
}

function toggleMapType() {
  const btn = document.querySelector('[data-testid="map-type-toggle"]');
  state.mapTypeId = state.mapTypeId === "roadmap" ? "hybrid" : "roadmap";
  const isHybrid = state.mapTypeId === "hybrid";

  if (btn) {
    btn.classList.toggle("active", isHybrid);
    btn.setAttribute("aria-pressed", String(isHybrid));
    btn.textContent = isHybrid ? "Roadmap View" : "Hybrid View";
  }
  if (state.map) {
    state.map.setMapTypeId(state.mapTypeId);
  }
}

async function toggleUnits() {
  const btn = document.querySelector('[data-testid="units-toggle-btn"]');
  state.unitsSystem = state.unitsSystem === "IMPERIAL" ? "METRIC" : "IMPERIAL";
  if (btn) {
    btn.textContent = state.unitsSystem === "IMPERIAL" ? "°F · Imperial" : "°C · Metric";
  }

  if (state.lastSolarPayload && state.lastSolarStatus === 200) {
    renderSolar(state.lastSolarPayload, 200, null);
  }
  if (state.config?.configured) {
    await fetchWeatherOnly(state.currentLocation.lat, state.currentLocation.lng);
  }
}

function showMissingKeyState() {
  const banner = document.getElementById("config-banner");
  if (banner) {
    banner.classList.remove("hidden");
    banner.textContent =
      "GOOGLE_MAPS_API_KEY is not configured in .env. Copy .env.example to .env and add your Maps Demo Key or Google Cloud API key to load live Google Maps, Places Autocomplete, Weather, Air Quality, Pollen, and Solar insights.";
  }
  setStatusChip("location-status-chip", "Key Required", "warn");
  setStatusChip("weather-status-chip", "Key Required", "warn");
  setStatusChip("aqi-status-chip", "Key Required", "warn");
  setStatusChip("pollen-status-chip", "Key Required", "warn");
  setStatusChip("solar-status-chip", "Key Required", "warn");

  const mapEl = document.querySelector('[data-testid="map-container"]');
  if (mapEl) {
    const placeholder = el("div", "non-coverage-box");
    placeholder.style.margin = "24px";
    placeholder.textContent =
      "Map preview waiting for GOOGLE_MAPS_API_KEY in .env.";
    mapEl.replaceChildren(placeholder);
  }
}

async function initApp() {
  document
    .querySelector('[data-testid="reset-phoenix-btn"]')
    ?.addEventListener("click", () => {
      void resolveSeedAndInspect();
    });
  document
    .querySelector('[data-testid="units-toggle-btn"]')
    ?.addEventListener("click", () => {
      void toggleUnits();
    });
  document
    .querySelector('[data-testid="aqi-layer-toggle"]')
    ?.addEventListener("click", toggleAqiLayer);
  document
    .querySelector('[data-testid="map-type-toggle"]')
    ?.addEventListener("click", toggleMapType);

  updateLocationHeaderUI();

  const cfgRes = await fetchJsonSafe("/api/config");
  if (!cfgRes.ok) {
    showMissingKeyState();
    return;
  }
  state.config = cfgRes.data;

  if (!state.config.configured || !state.config.googleMapsApiKey) {
    showMissingKeyState();
    return;
  }

  installGoogleMapsBootstrap({
    key: state.config.googleMapsApiKey,
    v: "weekly",
    language: "en",
    region: "US",
  });

  const [
    { Map, ImageMapType, Rectangle },
    { Size },
    { AdvancedMarkerElement, PinElement },
    { PlaceAutocompleteElement },
    { Geocoder },
  ] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("core"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("places"),
    google.maps.importLibrary("geocoding"),
  ]);

  state.PinElementClass = PinElement;
  state.RectangleClass = Rectangle;
  state.geocoder = new Geocoder();

  const mapContainer = document.querySelector('[data-testid="map-container"]');
  const initialLat = state.config.initialLocation?.lat ?? DEFAULT_SEED.lat;
  const initialLng = state.config.initialLocation?.lng ?? DEFAULT_SEED.lng;
  const initialZoom = state.config.initialLocation?.zoom ?? DEFAULT_SEED.zoom;

  state.map = new Map(mapContainer, {
    center: { lat: initialLat, lng: initialLng },
    zoom: initialZoom,
    mapId: state.config.mapId || "DEMO_MAP_ID",
    internalUsageAttributionIds: [
      state.config.attributionId || "gmp_git_agentsamples_v1.0.0",
    ],
    mapTypeId: state.mapTypeId,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: false,
  });

  const pin = new PinElement({
    background: "#0f766e",
    borderColor: "#ffffff",
    glyphColor: "#ffffff",
    glyphText: "☀",
    scale: 1.15,
  });

  state.marker = new AdvancedMarkerElement({
    map: state.map,
    position: { lat: initialLat, lng: initialLng },
    title: DEFAULT_SEED.name,
  });
  state.marker.append(pin);

  state.aqiImageMapType = new ImageMapType({
    getTileUrl(coord, zoom) {
      if (zoom < 0 || zoom > 16) return "";
      const maxTile = 1 << zoom;
      if (coord.x < 0 || coord.y < 0 || coord.x >= maxTile || coord.y >= maxTile) {
        return "";
      }
      return `/api/air-quality/tiles?mapType=US_AQI&zoom=${zoom}&x=${coord.x}&y=${coord.y}`;
    },
    tileSize: new Size(256, 256),
    opacity: 0.62,
    minZoom: 0,
    maxZoom: 16,
    name: "US AQI Heatmap",
  });

  const acHost = document.querySelector('[data-testid="places-autocomplete-container"]');
  if (acHost) {
    const autocompleteEl = new PlaceAutocompleteElement({
      requestedLanguage: "en",
      requestedRegion: "us",
    });
    autocompleteEl.placeholder = "Search any address, building, or city…";
    autocompleteEl.addEventListener("gmp-select", async (event) => {
      const prediction = event.placePrediction;
      if (!prediction) return;
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });
      if (!place.location) return;
      setStatusChip("location-status-chip", "Searched", "ok");
      await inspectLocation({
        lat: place.location.lat(),
        lng: place.location.lng(),
        name: place.displayName || "Selected Place",
        address: place.formattedAddress || "",
        zoom: 17,
        panTo: true,
      });
    });
    acHost.replaceChildren(autocompleteEl);
  }

  state.map.addListener("click", async (event) => {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    setStatusChip("location-status-chip", "Map Click", "ok");
    let resolvedName = "Inspected Building / Site";
    let resolvedAddress = formatCoords(lat, lng);

    const inspectPromise = inspectLocation({
      lat,
      lng,
      name: resolvedName,
      address: resolvedAddress,
      panTo: false,
    });

    try {
      const geo = await state.geocoder.geocode({ location: { lat, lng } });
      const topResult = geo?.results?.[0];
      if (topResult?.formatted_address) {
        state.currentLocation.address = topResult.formatted_address;
        state.currentLocation.name =
          topResult.formatted_address.split(",")[0] || resolvedName;
        updateLocationHeaderUI();
      }
    } catch {
      // Keep coordinate label cleanly without polluting console errors
    }

    await inspectPromise;
  });

  await resolveSeedAndInspect();
}

void initApp();
