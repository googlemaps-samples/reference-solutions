// Miami Civic Flood Hazard, Incident Reporter & Safe Shelter Router
// Uses Maps JS API (importLibrary, AdvancedMarkerElement, PinElement, PlaceAutocompleteElement, Polygon, Polyline, geometry),
// deck.gl HeatmapLayer + GoogleMapsOverlay (with Canvas OverlayView fallback for non-WebGL2 environments),
// and BFF proxy endpoints for Places API (New), Routes API v2, Geocoding API, Elevation API, and Weather API.

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const MIAMI_CENTER = { lat: 25.7743, lng: -80.1937 };

// Active Miami coastal & riverfront flood-hazard zone polygons (synthetic civic hazard scenario)
const FLOOD_ZONES = [
  {
    id: 'zone-brickell-river',
    name: 'Brickell & Miami River Surge Basin',
    severity: 'CRITICAL SURGE ADVISORY',
    color: '#ef4444',
    fillOpacity: 0.28,
    paths: [
      { lat: 25.7720, lng: -80.1932 },
      { lat: 25.7720, lng: -80.1835 },
      { lat: 25.7585, lng: -80.1855 },
      { lat: 25.7595, lng: -80.1955 },
    ],
  },
  {
    id: 'zone-edgewater-tidal',
    name: 'Edgewater & Venetian Tidal Flood Zone',
    severity: 'HIGH TIDAL FLOODING',
    color: '#f97316',
    fillOpacity: 0.24,
    paths: [
      { lat: 25.8045, lng: -80.1915 },
      { lat: 25.8045, lng: -80.1820 },
      { lat: 25.7860, lng: -80.1825 },
      { lat: 25.7860, lng: -80.1920 },
    ],
  },
  {
    id: 'zone-little-river',
    name: 'Little River & Biscayne Canal Lowland',
    severity: 'FLASH FLOOD WATCH',
    color: '#eab308',
    fillOpacity: 0.22,
    paths: [
      { lat: 25.8440, lng: -80.1980 },
      { lat: 25.8440, lng: -80.1820 },
      { lat: 25.8290, lng: -80.1830 },
      { lat: 25.8290, lng: -80.1990 },
    ],
  },
];

// Initial high-density Miami flood/storm incident reports for deck.gl HeatmapLayer
const SEED_INCIDENTS = [
  { lat: 25.7685, lng: -80.1892, weight: 9, type: 'storm_surge', label: 'Brickell Key Causeway surge' },
  { lat: 25.7662, lng: -80.1910, weight: 8, type: 'street_flooding', label: 'SE 8th St standing water' },
  { lat: 25.7641, lng: -80.1878, weight: 10, type: 'storm_surge', label: 'Brickell Bay Dr seawall overtop' },
  { lat: 25.7702, lng: -80.1868, weight: 8, type: 'drainage_overflow', label: 'Miami River mouth outfall surge' },
  { lat: 25.7615, lng: -80.1918, weight: 7, type: 'street_flooding', label: 'Brickell Ave & SE 15th Rd' },
  { lat: 25.7734, lng: -80.1874, weight: 7, type: 'street_flooding', label: 'Bayfront Park promenade' },
  { lat: 25.7752, lng: -80.1898, weight: 6, type: 'drainage_overflow', label: 'Biscayne Blvd & Flagler St' },
  { lat: 25.7785, lng: -80.1879, weight: 6, type: 'street_flooding', label: 'NE 4th St & Biscayne Blvd' },
  { lat: 25.7885, lng: -80.1862, weight: 9, type: 'storm_surge', label: 'Margaret Pace Park bayfront' },
  { lat: 25.7920, lng: -80.1875, weight: 8, type: 'street_flooding', label: 'NE 17th St & N Bayshore Dr' },
  { lat: 25.7960, lng: -80.1855, weight: 9, type: 'storm_surge', label: 'Venetian Causeway approach' },
  { lat: 25.7995, lng: -80.1888, weight: 7, type: 'drainage_overflow', label: 'NE 24th St Edgewater' },
  { lat: 25.8025, lng: -80.1869, weight: 8, type: 'street_flooding', label: 'NE 28th St bayfront' },
  { lat: 25.7845, lng: -80.1945, weight: 5, type: 'drainage_overflow', label: 'I-395 underpass ponding' },
  { lat: 25.7812, lng: -80.2010, weight: 6, type: 'street_flooding', label: 'Overtown NW 11th St' },
  { lat: 25.7758, lng: -80.2072, weight: 5, type: 'downed_power', label: 'Little Havana NW 7th Ave' },
  { lat: 25.7654, lng: -80.2065, weight: 7, type: 'street_flooding', label: 'SW 8th St & SW 8th Ave' },
  { lat: 25.7540, lng: -80.2040, weight: 6, type: 'drainage_overflow', label: 'Coral Way low basin' },
  { lat: 25.7475, lng: -80.2130, weight: 5, type: 'street_flooding', label: 'South Bayshore Dr curb pooling' },
  { lat: 25.7910, lng: -80.2120, weight: 7, type: 'street_flooding', label: 'Allapattah NW 20th St' },
  { lat: 25.8040, lng: -80.2075, weight: 6, type: 'drainage_overflow', label: 'Wynwood NW 29th St' },
  { lat: 25.8125, lng: -80.1930, weight: 7, type: 'street_flooding', label: 'Design District NE 39th St' },
  { lat: 25.8220, lng: -80.1890, weight: 7, type: 'drainage_overflow', label: 'Morningside Park shoreline' },
  { lat: 25.8330, lng: -80.1885, weight: 9, type: 'storm_surge', label: 'Little River Canal overflow' },
  { lat: 25.8375, lng: -80.1912, weight: 8, type: 'street_flooding', label: 'NE 79th St Causeway west' },
  { lat: 25.8410, lng: -80.1855, weight: 8, type: 'storm_surge', label: 'Pelican Harbor seawall' },
  { lat: 25.7680, lng: -80.1955, weight: 7, type: 'street_flooding', label: 'SW 2nd Ave & SW 6th St' },
  { lat: 25.7712, lng: -80.1905, weight: 8, type: 'drainage_overflow', label: 'Riverwalk south bank' },
  { lat: 25.7892, lng: -80.1895, weight: 8, type: 'street_flooding', label: 'Omni NE 15th St' },
  { lat: 25.7945, lng: -80.1905, weight: 7, type: 'street_flooding', label: 'Biscayne Blvd & NE 20th St' },
];

const HAZARD_LABELS = {
  street_flooding: 'Street Flooding (> 15 cm)',
  storm_surge: 'Coastal Storm Surge',
  drainage_overflow: 'Storm Drain Overflow',
  downed_power: 'Downed Power Line / Debris',
};

const HAZARD_WEIGHTS = {
  street_flooding: 8,
  storm_surge: 10,
  drainage_overflow: 7,
  downed_power: 6,
};

const state = {
  map: null,
  infoWindow: null,
  mapsLibs: null,
  incidents: [...SEED_INCIDENTS],
  heatmapVisible: true,
  polygonsVisible: true,
  deckOverlay: null,
  canvasHeatmapOverlay: null,
  floodPolygons: [],
  shelterMarkers: [],
  reportedIncidentMarkers: [],
  selectedOriginMarker: null,
  routePolyline: null,
  shelters: [],
  selectedShelterId: null,
  activeOrigin: { ...MIAMI_CENTER },
  activeEnrichment: {
    address: 'Miami Civic Center / Downtown',
    elevationMeters: null,
    weatherSummary: null,
  },
};

function supportsWebGL2() {
  try {
    const testCanvas = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && testCanvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function loadMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
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
      let b = window;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {});
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
      } else {
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
      }
    })({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });

    window.google.maps
      .importLibrary('core')
      .then(() => resolve())
      .catch(reject);
  });
}

function createInfoNode(title, lines) {
  const container = document.createElement('div');
  container.style.maxWidth = '250px';
  container.style.fontFamily = 'inherit';
  container.style.color = '#0f172a';

  const heading = document.createElement('strong');
  heading.textContent = title;
  heading.style.display = 'block';
  heading.style.marginBottom = '4px';
  heading.style.fontSize = '13px';
  container.appendChild(heading);

  for (const line of lines) {
    if (!line) continue;
    const p = document.createElement('div');
    p.textContent = line;
    p.style.fontSize = '12px';
    p.style.color = '#475569';
    p.style.marginTop = '2px';
    container.appendChild(p);
  }
  return container;
}

function createCanvasHeatmapFallback(OverlayViewBase) {
  class CanvasHeatmapOverlay extends OverlayViewBase {
    constructor(incidents, visible) {
      super();
      this.incidents = incidents;
      this.visible = visible;
      this.canvas = null;
    }

    onAdd() {
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.pointerEvents = 'none';
      const panes = this.getPanes();
      panes?.overlayLayer.appendChild(this.canvas);
    }

    draw() {
      if (!this.canvas) return;
      if (!this.visible) {
        this.canvas.style.display = 'none';
        return;
      }
      const projection = this.getProjection();
      const map = this.getMap();
      if (!projection || !map) return;

      const mapDiv = map.getDiv();
      const width = mapDiv.offsetWidth || 600;
      const height = mapDiv.offsetHeight || 540;
      const bounds = map.getBounds();
      if (!bounds) return;

      const topLeft = projection.fromLatLngToDivPixel(
        new state.mapsLibs.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng())
      );
      if (!topLeft) return;

      this.canvas.style.display = 'block';
      this.canvas.style.left = `${topLeft.x}px`;
      this.canvas.style.top = `${topLeft.y}px`;
      this.canvas.width = width;
      this.canvas.height = height;

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (const item of this.incidents) {
        const px = projection.fromLatLngToDivPixel(new state.mapsLibs.LatLng(item.lat, item.lng));
        if (!px) continue;
        const x = px.x - topLeft.x;
        const y = px.y - topLeft.y;
        const radius = 28 + (item.weight || 5) * 1.8;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
        grad.addColorStop(0, 'rgba(220, 38, 38, 0.55)');
        grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.32)');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    setData(incidents) {
      this.incidents = incidents;
      this.draw();
    }

    setVisible(visible) {
      this.visible = visible;
      this.draw();
    }

    onRemove() {
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
    }
  }

  return CanvasHeatmapOverlay;
}

function buildDeckHeatmapLayer() {
  return new window.deck.HeatmapLayer({
    id: 'civic-flood-heatmap',
    data: state.incidents,
    getPosition: (d) => [d.lng, d.lat],
    getWeight: (d) => d.weight ?? 5,
    radiusPixels: 38,
    intensity: 1.4,
    threshold: 0.05,
    visible: state.heatmapVisible,
    colorRange: [
      [254, 240, 138, 120],
      [253, 186, 116, 170],
      [249, 115, 22, 200],
      [239, 68, 68, 225],
      [185, 28, 28, 245],
    ],
  });
}

function initHeatmapLayer() {
  const legendNote = document.getElementById('heatmap-mode-note');
  const canUseWebGL2 = supportsWebGL2();
  const hasDeck = Boolean(window.deck?.HeatmapLayer && window.deck?.GoogleMapsOverlay);

  if (canUseWebGL2 && hasDeck) {
    try {
      state.deckOverlay = new window.deck.GoogleMapsOverlay({
        layers: [buildDeckHeatmapLayer()],
      });
      state.deckOverlay.setMap(state.map);
      if (legendNote) {
        legendNote.textContent =
          'WebGL2 deck.gl HeatmapLayer active — civic planning only; follow Miami-Dade alerts.';
      }
      return;
    } catch {
      state.deckOverlay = null;
    }
  }

  const CanvasHeatmapOverlay = createCanvasHeatmapFallback(state.mapsLibs.OverlayView);
  state.canvasHeatmapOverlay = new CanvasHeatmapOverlay(state.incidents, state.heatmapVisible);
  state.canvasHeatmapOverlay.setMap(state.map);
  if (legendNote) {
    legendNote.textContent =
      '2D Canvas Heatmap fallback active (WebGL2 unavailable) — civic planning prototype.';
  }
}

function refreshHeatmapLayer() {
  if (state.deckOverlay && window.deck?.HeatmapLayer) {
    state.deckOverlay.setProps({
      layers: [buildDeckHeatmapLayer()],
    });
  }
  if (state.canvasHeatmapOverlay) {
    state.canvasHeatmapOverlay.setVisible(state.heatmapVisible);
    state.canvasHeatmapOverlay.setData(state.incidents);
  }
}

function renderFloodPolygons() {
  for (const zone of FLOOD_ZONES) {
    const polygon = new state.mapsLibs.Polygon({
      paths: zone.paths,
      strokeColor: zone.color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: zone.color,
      fillOpacity: zone.fillOpacity,
      map: state.polygonsVisible ? state.map : null,
      zIndex: 2,
    });

    polygon.addListener('click', (event) => {
      const content = createInfoNode(zone.name, [
        `Status: ${zone.severity}`,
        'Evacuation routes automatically bypass this polygon when "Avoid Flood Zones" is enabled.',
      ]);
      state.infoWindow.setContent(content);
      state.infoWindow.setPosition(event.latLng || zone.paths[0]);
      state.infoWindow.open(state.map);
    });

    state.floodPolygons.push({ zone, polygon });
  }
}

function setFloodPolygonsVisible(visible) {
  state.polygonsVisible = visible;
  for (const entry of state.floodPolygons) {
    entry.polygon.setMap(visible ? state.map : null);
  }
}

function updateIncidentBadge() {
  const badge = document.getElementById('incident-count-badge');
  if (badge) {
    badge.textContent = `${state.incidents.length} Reports`;
  }
}

async function fetchJsonSafe(url, options) {
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch {
    return { ok: false, error: 'Network error reaching local BFF server.' };
  }
}

function formatWind(weather) {
  if (!weather || !weather.ok) {
    return weather?.error ? `Weather unavailable (${weather.error})` : 'Weather unavailable';
  }
  const speed =
    weather.windSpeedKmh !== null ? `${Math.round(weather.windSpeedKmh)} km/h` : '--';
  const gust = weather.windGustKmh !== null ? `${Math.round(weather.windGustKmh)} km/h` : '--';
  const dir = weather.windDirectionCardinal ? weather.windDirectionCardinal.replace(/_/g, ' ') : '';
  const precip = weather.precipPercent !== null ? `${weather.precipPercent}%` : '--';
  const qpf = weather.precipQpfMm !== null ? `${weather.precipQpfMm} mm` : '0 mm';
  return `${weather.conditionText} • Wind ${speed} ${dir} (Gust ${gust}) • Precip ${precip} (${qpf})`;
}

async function enrichIncidentLocation(coords, presetAddress) {
  const coordsEl = document.getElementById('incident-coords');
  const addressEl = document.getElementById('incident-address');
  const elevationEl = document.getElementById('incident-elevation');
  const weatherEl = document.getElementById('incident-weather');
  const routeOriginLabel = document.getElementById('route-destination-label');

  state.activeOrigin = { lat: coords.lat, lng: coords.lng };

  if (coordsEl) {
    coordsEl.textContent = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }
  if (addressEl) {
    addressEl.textContent = presetAddress || 'Resolving street address…';
  }
  if (elevationEl) {
    elevationEl.textContent = 'Sampling elevation…';
  }
  if (weatherEl) {
    weatherEl.textContent = 'Fetching live conditions…';
  }

  const [geoRes, elevRes, weatherRes] = await Promise.all([
    fetchJsonSafe(`/api/geocode/reverse?lat=${coords.lat}&lng=${coords.lng}`),
    fetchJsonSafe(`/api/elevation?lat=${coords.lat}&lng=${coords.lng}`),
    fetchJsonSafe(`/api/weather/current?lat=${coords.lat}&lng=${coords.lng}`),
  ]);

  let resolvedAddress = presetAddress || '';
  if (geoRes.ok && geoRes.formattedAddress) {
    resolvedAddress = geoRes.formattedAddress;
  } else if (!resolvedAddress) {
    resolvedAddress = `Near ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}, Miami, FL`;
  }
  state.activeEnrichment.address = resolvedAddress;
  if (addressEl) {
    addressEl.textContent = resolvedAddress;
  }

  if (elevRes.ok && typeof elevRes.elevationMeters === 'number') {
    state.activeEnrichment.elevationMeters = elevRes.elevationMeters;
    if (elevationEl) {
      const riskNote = elevRes.elevationMeters < 2.0 ? ' (Low Surge Zone)' : ' (Elevated)';
      elevationEl.textContent = `${elevRes.elevationMeters.toFixed(2)} m${riskNote}`;
    }
  } else {
    state.activeEnrichment.elevationMeters = null;
    if (elevationEl) {
      elevationEl.textContent = elevRes.error ? 'Unavailable on current key' : 'Unavailable';
    }
  }

  const weatherText = formatWind(weatherRes);
  state.activeEnrichment.weatherSummary = weatherText;
  if (weatherEl) {
    weatherEl.textContent = weatherText;
  }

  if (weatherRes.ok) {
    updateHeaderWeatherPill(weatherRes);
  }

  if (routeOriginLabel && !state.selectedShelterId) {
    routeOriginLabel.textContent = `Origin: ${resolvedAddress}`;
  }
}

function updateHeaderWeatherPill(weather) {
  const pillText = document.getElementById('weather-status-text');
  if (!pillText || !weather?.ok) return;
  const temp = weather.temperatureC !== null ? `${Math.round(weather.temperatureC)}°C` : '';
  const wind = weather.windSpeedKmh !== null ? `Wind ${Math.round(weather.windSpeedKmh)} km/h` : '';
  const precip = weather.precipPercent !== null ? `Rain ${weather.precipPercent}%` : '';
  pillText.textContent = ['Miami Live:', weather.conditionText, temp, wind, precip]
    .filter(Boolean)
    .join(' • ');
}

function placeSelectedOriginMarker(coords, label) {
  if (!state.map || !state.mapsLibs) return;
  const pin = new state.mapsLibs.PinElement({
    background: '#0284c7',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: '!',
    scale: 1.1,
  });

  if (!state.selectedOriginMarker) {
    state.selectedOriginMarker = new state.mapsLibs.AdvancedMarkerElement({
      map: state.map,
      position: coords,
      title: label || 'Selected Incident / Evacuation Origin',
    });
    state.selectedOriginMarker.append(pin);
    state.selectedOriginMarker.addEventListener('click', () => {
      const content = createInfoNode('Selected Origin / Incident Point', [
        state.activeEnrichment.address,
        state.activeEnrichment.elevationMeters !== null
          ? `Elevation: ${state.activeEnrichment.elevationMeters.toFixed(2)} m`
          : '',
        state.activeEnrichment.weatherSummary || '',
      ]);
      state.infoWindow.setContent(content);
      state.infoWindow.open({ anchor: state.selectedOriginMarker, map: state.map });
    });
  } else {
    state.selectedOriginMarker.position = coords;
    state.selectedOriginMarker.replaceChildren(pin);
  }
}

async function selectIncidentLocation(coords, presetAddress) {
  placeSelectedOriginMarker(coords, presetAddress);
  await enrichIncidentLocation(coords, presetAddress);
}

function logIncidentReport() {
  const typeSelect = document.getElementById('incident-type-select');
  const notesInput = document.getElementById('incident-notes-input');
  const feedbackEl = document.getElementById('incident-feedback');

  const type = typeSelect?.value || 'street_flooding';
  const notes = notesInput?.value?.trim() || '';
  const weight = HAZARD_WEIGHTS[type] || 8;
  const label = notes || `${HAZARD_LABELS[type] || 'Hazard'} — ${state.activeEnrichment.address}`;

  const entry = {
    lat: state.activeOrigin.lat,
    lng: state.activeOrigin.lng,
    weight,
    type,
    label,
    address: state.activeEnrichment.address,
    elevationMeters: state.activeEnrichment.elevationMeters,
    timestamp: new Date().toLocaleTimeString(),
  };

  state.incidents.push(entry);
  updateIncidentBadge();
  refreshHeatmapLayer();

  if (state.map && state.mapsLibs) {
    const pin = new state.mapsLibs.PinElement({
      background: '#dc2626',
      borderColor: '#fef2f2',
      glyphColor: '#ffffff',
      glyphText: '⚠',
      scale: 0.9,
    });
    const marker = new state.mapsLibs.AdvancedMarkerElement({
      map: state.map,
      position: { lat: entry.lat, lng: entry.lng },
      title: entry.label,
    });
    marker.append(pin);
    marker.addEventListener('click', () => {
      const infoNode = createInfoNode(HAZARD_LABELS[entry.type] || 'Reported Hazard', [
        entry.address,
        entry.elevationMeters !== null ? `Elevation: ${entry.elevationMeters.toFixed(2)} m` : '',
        notes ? `Note: ${notes}` : '',
        `Logged at ${entry.timestamp}`,
      ]);
      state.infoWindow.setContent(infoNode);
      state.infoWindow.open({ anchor: marker, map: state.map });
    });
    state.reportedIncidentMarkers.push(marker);
  }

  if (notesInput) {
    notesInput.value = '';
  }
  if (feedbackEl) {
    feedbackEl.textContent = `Logged "${HAZARD_LABELS[type]}" to heatmap (${state.incidents.length} total reports).`;
  }
}

function clearShelterMarkers() {
  for (const m of state.shelterMarkers) {
    m.map = null;
  }
  state.shelterMarkers = [];
}

function renderShelters(places) {
  state.shelters = places;
  clearShelterMarkers();

  const countBadge = document.getElementById('shelter-count-badge');
  const listEl = document.getElementById('shelter-list');
  if (countBadge) {
    countBadge.textContent = `${places.length} Found`;
  }
  if (!listEl) return;

  if (!places.length) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'panel-hint';
    emptyMsg.textContent = 'No shelters matched your query. Try searching "hospital in Miami".';
    listEl.replaceChildren(emptyMsg);
    return;
  }

  const fragment = document.createDocumentFragment();

  places.forEach((place, idx) => {
    const pos = place.location
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : null;
    const name = place.displayName?.text || `Shelter ${idx + 1}`;
    const address = place.formattedAddress || 'Miami, FL';
    const ratingText =
      typeof place.rating === 'number'
        ? `★ ${place.rating.toFixed(1)} (${place.userRatingCount ?? 0})`
        : 'Rating N/A';
    const statusText =
      place.businessStatus === 'OPERATIONAL'
        ? 'Operational'
        : place.businessStatus || 'Verified Place';

    if (pos && state.map && state.mapsLibs) {
      const pin = new state.mapsLibs.PinElement({
        background: '#059669',
        borderColor: '#ecfdf5',
        glyphColor: '#ffffff',
        glyphText: String(idx + 1),
        scale: 1.0,
      });
      const marker = new state.mapsLibs.AdvancedMarkerElement({
        map: state.map,
        position: pos,
        title: name,
      });
      marker.append(pin);
      marker.addEventListener('click', () => {
        const infoNode = createInfoNode(name, [address, `${ratingText} • ${statusText}`]);
        state.infoWindow.setContent(infoNode);
        state.infoWindow.open({ anchor: marker, map: state.map });
        computeEvacuationRoute(place);
      });
      state.shelterMarkers.push(marker);
    }

    const card = document.createElement('div');
    card.className = `shelter-item${state.selectedShelterId === place.id ? ' selected' : ''}`;
    card.setAttribute('role', 'listitem');
    card.dataset.placeId = place.id || '';

    const top = document.createElement('div');
    top.className = 'shelter-item-top';

    const title = document.createElement('h3');
    title.className = 'shelter-name';
    title.textContent = `${idx + 1}. ${name}`;

    const meta = document.createElement('span');
    meta.className = 'shelter-meta';
    meta.textContent = ratingText;

    top.appendChild(title);
    top.appendChild(meta);

    const addr = document.createElement('p');
    addr.className = 'shelter-address';
    addr.textContent = address;

    const actions = document.createElement('div');
    actions.className = 'shelter-actions';

    const status = document.createElement('span');
    status.className = 'shelter-meta';
    status.textContent = statusText;

    const routeBtn = document.createElement('button');
    routeBtn.type = 'button';
    routeBtn.className = 'route-here-btn';
    routeBtn.textContent = 'Route Here';
    routeBtn.addEventListener('click', () => {
      computeEvacuationRoute(place);
    });

    actions.appendChild(status);
    actions.appendChild(routeBtn);

    card.appendChild(top);
    card.appendChild(addr);
    card.appendChild(actions);

    fragment.appendChild(card);
  });

  listEl.replaceChildren(fragment);
}

async function searchEmergencyShelters(queryText) {
  const countBadge = document.getElementById('shelter-count-badge');
  if (countBadge) {
    countBadge.textContent = 'Searching…';
  }

  const data = await fetchJsonSafe('/api/places/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      textQuery: queryText || 'hospital and community center in Miami, FL',
      lat: state.activeOrigin.lat,
      lng: state.activeOrigin.lng,
      radiusMeters: 12000,
      maxResultCount: 10,
    }),
  });

  if (!data.ok) {
    if (countBadge) countBadge.textContent = 'Unavailable';
    const listEl = document.getElementById('shelter-list');
    if (listEl) {
      const msg = document.createElement('p');
      msg.className = 'panel-hint';
      msg.textContent = data.error || 'Places search unavailable.';
      listEl.replaceChildren(msg);
    }
    return [];
  }

  renderShelters(data.places || []);
  return data.places || [];
}

function isPointInAnyFloodZone(latLng) {
  if (!state.mapsLibs?.poly) return false;
  return state.floodPolygons.some(({ polygon }) =>
    state.mapsLibs.poly.containsLocation(latLng, polygon)
  );
}

function analyzePathFloodIntersections(decodedPath) {
  const intersectedEntries = new Set();
  let intersectionHits = 0;

  for (let i = 0; i < decodedPath.length; i += 1) {
    const pt = decodedPath[i];
    for (const entry of state.floodPolygons) {
      if (state.mapsLibs.poly.containsLocation(pt, entry.polygon)) {
        intersectedEntries.add(entry);
        intersectionHits += 1;
      }
    }

    if (i < decodedPath.length - 1) {
      const next = decodedPath[i + 1];
      const mid = new state.mapsLibs.LatLng(
        (pt.lat() + next.lat()) / 2,
        (pt.lng() + next.lng()) / 2
      );
      for (const entry of state.floodPolygons) {
        if (state.mapsLibs.poly.containsLocation(mid, entry.polygon)) {
          intersectedEntries.add(entry);
          intersectionHits += 1;
        }
      }
    }
  }

  return {
    hits: intersectionHits,
    zones: [...intersectedEntries],
  };
}

function approxDistSq(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

function generateBypassWaypoints(origin, destination, intersectedZones) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const entry of intersectedZones) {
    for (const vertex of entry.zone.paths) {
      if (vertex.lat < minLat) minLat = vertex.lat;
      if (vertex.lat > maxLat) maxLat = vertex.lat;
      if (vertex.lng < minLng) minLng = vertex.lng;
      if (vertex.lng > maxLng) maxLng = vertex.lng;
    }
  }

  const pad = 0.0075;
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const rawCandidates = [
    { lat: midLat, lng: minLng - pad }, // West inland perimeter
    { lat: maxLat + pad, lng: minLng - pad }, // NW perimeter
    { lat: minLat - pad, lng: minLng - pad }, // SW perimeter
    { lat: maxLat + pad, lng: midLng }, // North perimeter
    { lat: minLat - pad, lng: midLng }, // South perimeter
    { lat: midLat, lng: maxLng + pad }, // East perimeter
  ];

  const valid = rawCandidates.filter((pt) => {
    const ll = new state.mapsLibs.LatLng(pt.lat, pt.lng);
    return !isPointInAnyFloodZone(ll);
  });

  valid.sort(
    (a, b) =>
      approxDistSq(origin, a) +
      approxDistSq(a, destination) -
      (approxDistSq(origin, b) + approxDistSq(b, destination))
  );

  return valid.slice(0, 3);
}

function formatDuration(durationStr) {
  if (!durationStr) return '--';
  const seconds = parseInt(String(durationStr).replace('s', ''), 10);
  if (!Number.isFinite(seconds)) return durationStr;
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

function formatDistance(meters) {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return '--';
  const km = meters / 1000;
  const mi = meters / 1609.344;
  return `${mi.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

async function computeEvacuationRoute(shelter) {
  if (!shelter?.location || !state.mapsLibs) return;

  state.selectedShelterId = shelter.id || null;
  document.querySelectorAll('.shelter-item').forEach((el) => {
    el.classList.toggle('selected', el.dataset.placeId === state.selectedShelterId);
  });

  const origin = { ...state.activeOrigin };
  const destination = {
    lat: shelter.location.latitude,
    lng: shelter.location.longitude,
  };
  const avoidFlood = Boolean(document.getElementById('avoid-flood-toggle')?.checked);

  const badgeEl = document.getElementById('route-status-badge');
  const etaEl = document.getElementById('route-eta');
  const distEl = document.getElementById('route-distance');
  const destLabelEl = document.getElementById('route-destination-label');
  const stepsEl = document.getElementById('route-steps-list');

  if (badgeEl) {
    badgeEl.className = 'route-badge route-badge-idle';
    badgeEl.textContent = 'Computing evacuation corridor via Routes API v2…';
  }

  const directRes = await fetchJsonSafe('/api/routes/compute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, travelMode: 'DRIVE' }),
  });

  if (!directRes.ok || !directRes.routes?.length) {
    if (badgeEl) {
      badgeEl.className = 'route-badge route-badge-warn';
      badgeEl.textContent = directRes.error || 'Could not compute evacuation route.';
    }
    return;
  }

  let chosenRoute = directRes.routes[0];
  let chosenPath = state.mapsLibs.encoding.decodePath(chosenRoute.polyline.encodedPolyline);
  let analysis = analyzePathFloodIntersections(chosenPath);
  let bypassApplied = false;

  if (avoidFlood && analysis.hits > 0 && analysis.zones.length > 0) {
    const candidates = generateBypassWaypoints(origin, destination, analysis.zones);
    let bestHits = analysis.hits;

    for (const waypoint of candidates) {
      const detourRes = await fetchJsonSafe('/api/routes/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          intermediates: [{ lat: waypoint.lat, lng: waypoint.lng, via: true }],
          travelMode: 'DRIVE',
        }),
      });

      if (detourRes.ok && detourRes.routes?.length) {
        const candidateRoute = detourRes.routes[0];
        const candidatePath = state.mapsLibs.encoding.decodePath(
          candidateRoute.polyline.encodedPolyline
        );
        const candidateAnalysis = analyzePathFloodIntersections(candidatePath);

        if (candidateAnalysis.hits < bestHits) {
          chosenRoute = candidateRoute;
          chosenPath = candidatePath;
          analysis = candidateAnalysis;
          bestHits = candidateAnalysis.hits;
          bypassApplied = true;
          if (bestHits === 0) {
            break;
          }
        }
      }
    }
  }

  if (state.routePolyline) {
    state.routePolyline.setMap(null);
  }

  const isSafe = analysis.hits === 0;
  state.routePolyline = new state.mapsLibs.Polyline({
    path: chosenPath,
    geodesic: true,
    strokeColor: isSafe ? '#0ea5e9' : '#f59e0b',
    strokeOpacity: 0.95,
    strokeWeight: 6,
    map: state.map,
    zIndex: 10,
  });

  const bounds = new state.mapsLibs.LatLngBounds();
  chosenPath.forEach((pt) => bounds.extend(pt));
  state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });

  if (etaEl) etaEl.textContent = formatDuration(chosenRoute.duration);
  if (distEl) distEl.textContent = formatDistance(chosenRoute.distanceMeters);
  if (destLabelEl) {
    const shelterName = shelter.displayName?.text || 'Emergency Shelter';
    destLabelEl.textContent = `To: ${shelterName}`;
  }

  if (badgeEl) {
    if (avoidFlood && bypassApplied && isSafe) {
      badgeEl.className = 'route-badge route-badge-safe';
      badgeEl.textContent = '✓ Flood-Zone Bypass Active (0 zone intersections)';
    } else if (isSafe) {
      badgeEl.className = 'route-badge route-badge-safe';
      badgeEl.textContent = '✓ Clear Evacuation Corridor (0 flood intersections)';
    } else if (!avoidFlood) {
      badgeEl.className = 'route-badge route-badge-warn';
      badgeEl.textContent = `⚠ Direct Route Crosses Flood Zone (${analysis.zones.length} zone)`;
    } else {
      badgeEl.className = 'route-badge route-badge-warn';
      badgeEl.textContent = '⚠ Origin/Shelter Inside Flood Basin — Closest Exit Computed';
    }
  }

  if (stepsEl) {
    const steps = chosenRoute.legs?.flatMap((leg) => leg.steps || []) || [];
    const fragment = document.createDocumentFragment();
    steps.slice(0, 8).forEach((step) => {
      const li = document.createElement('li');
      const instr = step.navigationInstruction?.instructions || 'Continue along corridor';
      const dist = step.distanceMeters ? ` (${Math.round(step.distanceMeters)} m)` : '';
      li.textContent = `${instr}${dist}`;
      fragment.appendChild(li);
    });
    stepsEl.replaceChildren(fragment);
  }
}

async function findNearestSafeShelter() {
  let shelters = state.shelters;
  if (!shelters.length) {
    const inputVal = document.getElementById('shelter-search-input')?.value?.trim();
    shelters = await searchEmergencyShelters(inputVal);
  }
  if (!shelters.length) return;

  const sorted = [...shelters]
    .filter((s) => s.location)
    .sort((a, b) => {
      const aCoord = { lat: a.location.latitude, lng: a.location.longitude };
      const bCoord = { lat: b.location.latitude, lng: b.location.longitude };
      return approxDistSq(state.activeOrigin, aCoord) - approxDistSq(state.activeOrigin, bCoord);
    });

  if (sorted.length) {
    await computeEvacuationRoute(sorted[0]);
  }
}

function initPlaceAutocomplete(PlaceAutocompleteElement) {
  const slot = document.getElementById('origin-autocomplete-slot');
  if (!slot || !PlaceAutocompleteElement) return;

  const autocompleteEl = new PlaceAutocompleteElement({
    includedRegionCodes: ['us'],
    locationBias: {
      center: MIAMI_CENTER,
      radius: 25000,
    },
  });
  autocompleteEl.id = 'place-autocomplete';
  autocompleteEl.setAttribute('aria-label', 'Jump to Miami street or landmark');
  slot.replaceChildren(autocompleteEl);

  autocompleteEl.addEventListener('gmp-select', async (event) => {
    const prediction = event.placePrediction;
    if (!prediction) return;
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
    if (place.location) {
      const coords = {
        lat: place.location.lat(),
        lng: place.location.lng(),
      };
      state.map.panTo(coords);
      state.map.setZoom(14);
      await selectIncidentLocation(coords, place.formattedAddress || place.displayName || '');
    }
  });
}

function bindUiListeners() {
  const heatmapToggle = document.getElementById('layer-toggle-heatmap');
  const polygonsToggle = document.getElementById('layer-toggle-polygons');
  const submitIncidentBtn = document.getElementById('incident-submit-btn');
  const findShelterBtn = document.getElementById('find-shelter-btn');
  const shelterSearchBtn = document.getElementById('shelter-search-btn');
  const shelterSearchInput = document.getElementById('shelter-search-input');
  const avoidFloodToggle = document.getElementById('avoid-flood-toggle');
  const drawerToggle = document.getElementById('mobile-drawer-toggle');
  const sidebar = document.getElementById('control-sidebar');

  heatmapToggle?.addEventListener('change', (e) => {
    state.heatmapVisible = Boolean(e.target.checked);
    refreshHeatmapLayer();
  });

  polygonsToggle?.addEventListener('change', (e) => {
    setFloodPolygonsVisible(Boolean(e.target.checked));
  });

  submitIncidentBtn?.addEventListener('click', () => {
    logIncidentReport();
  });

  findShelterBtn?.addEventListener('click', () => {
    findNearestSafeShelter();
  });

  shelterSearchBtn?.addEventListener('click', () => {
    const query = shelterSearchInput?.value?.trim() || 'hospital and community center in Miami, FL';
    searchEmergencyShelters(query);
  });

  shelterSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = shelterSearchInput.value.trim() || 'hospital and community center in Miami, FL';
      searchEmergencyShelters(query);
    }
  });

  avoidFloodToggle?.addEventListener('change', () => {
    if (state.selectedShelterId) {
      const selected = state.shelters.find((s) => s.id === state.selectedShelterId);
      if (selected) computeEvacuationRoute(selected);
    }
  });

  drawerToggle?.addEventListener('click', () => {
    if (!sidebar) return;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    drawerToggle.setAttribute('aria-expanded', String(!isCollapsed));
  });
}

function showConfigNotice(message) {
  const banner = document.getElementById('config-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.remove('hidden');
}

async function bootstrapApp() {
  updateIncidentBadge();
  bindUiListeners();

  const config = await fetchJsonSafe('/api/config');
  if (!config?.hasApiKey || !config.mapsApiKey) {
    showConfigNotice(
      'Configuration required: Set GOOGLE_MAPS_API_KEY in .env (or obtain a free zero-billing Maps Demo Key at https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) and restart the server.'
    );
    const pillText = document.getElementById('weather-status-text');
    if (pillText) pillText.textContent = 'API Key Needed (.env)';
    const shelterCount = document.getElementById('shelter-count-badge');
    if (shelterCount) shelterCount.textContent = 'Awaiting API Key';
    return;
  }

  try {
    await loadMapsScript(config.mapsApiKey);

    const [coreLib, mapsLib, markerLib, placesLib, geometryLib] = await Promise.all([
      window.google.maps.importLibrary('core'),
      window.google.maps.importLibrary('maps'),
      window.google.maps.importLibrary('marker'),
      window.google.maps.importLibrary('places'),
      window.google.maps.importLibrary('geometry'),
    ]);

    state.mapsLibs = {
      LatLng: coreLib.LatLng,
      LatLngBounds: coreLib.LatLngBounds,
      Map: mapsLib.Map,
      InfoWindow: mapsLib.InfoWindow,
      Polygon: mapsLib.Polygon,
      Polyline: mapsLib.Polyline,
      OverlayView: mapsLib.OverlayView,
      AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
      PinElement: markerLib.PinElement,
      PlaceAutocompleteElement: placesLib.PlaceAutocompleteElement,
      poly: geometryLib.poly,
      encoding: geometryLib.encoding,
    };

    const mapEl = document.getElementById('map-container');
    if (!mapEl) return;

    state.map = new state.mapsLibs.Map(mapEl, {
      center: config.defaultCenter || MIAMI_CENTER,
      zoom: config.defaultZoom || 13,
      mapId: config.mapId || 'DEMO_MAP_ID',
      internalUsageAttributionIds: [config.attributionId || ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    state.infoWindow = new state.mapsLibs.InfoWindow();

    initHeatmapLayer();
    renderFloodPolygons();
    initPlaceAutocomplete(state.mapsLibs.PlaceAutocompleteElement);

    state.map.addListener('click', (event) => {
      if (!event.latLng) return;
      selectIncidentLocation({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    });

    await Promise.all([
      selectIncidentLocation(MIAMI_CENTER, 'Miami Civic Center, Downtown Miami, FL'),
      searchEmergencyShelters('hospital and community center in Miami, FL'),
    ]);
  } catch (err) {
    showConfigNotice(
      `Maps initialization error: ${err instanceof Error ? err.message : 'Unable to load Google Maps JS API.'}`
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapApp();
});
