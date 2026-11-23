import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const MIAMI_CENTER = { lat: 25.7743, lng: -80.1937 };

// Active Miami flood-hazard zone polygons (situational awareness zones)
const FLOOD_ZONE_DEFINITIONS = [
  {
    id: 'zone-miami-river',
    name: 'Miami River & Brickell Surge Corridor',
    severity: 'High Flood Risk (Storm Surge + Tidal)',
    fillColor: '#dc2626',
    strokeColor: '#b91c1c',
    paths: [
      { lat: 25.7748, lng: -80.2055 },
      { lat: 25.7748, lng: -80.1865 },
      { lat: 25.7642, lng: -80.1865 },
      { lat: 25.7642, lng: -80.2055 },
    ],
  },
  {
    id: 'zone-edgewater-bayfront',
    name: 'Edgewater & Biscayne Bayfront Basin',
    severity: 'Moderate-High Coastal Flooding',
    fillColor: '#ea580c',
    strokeColor: '#c2410c',
    paths: [
      { lat: 25.8025, lng: -80.1935 },
      { lat: 25.8025, lng: -80.1835 },
      { lat: 25.7875, lng: -80.1835 },
      { lat: 25.7875, lng: -80.1935 },
    ],
  },
  {
    id: 'zone-little-river',
    name: 'Little River & Biscayne Canal Lowlands',
    severity: 'Flash Flood Advisory Zone',
    fillColor: '#d97706',
    strokeColor: '#b45309',
    paths: [
      { lat: 25.8445, lng: -80.2065 },
      { lat: 25.8445, lng: -80.1865 },
      { lat: 25.8315, lng: -80.1865 },
      { lat: 25.8315, lng: -80.2065 },
    ],
  },
];

// Baseline civic storm & flood incident density reports in Miami
const INITIAL_INCIDENTS = [
  { lat: 25.7688, lng: -80.1932, weight: 5, type: 'Coastal Storm Surge', address: 'Brickell Key Dr & Brickell Ave' },
  { lat: 25.7709, lng: -80.1986, weight: 4, type: 'Flash Flooding', address: 'SW 2nd Ave & Miami River' },
  { lat: 25.7661, lng: -80.1904, weight: 5, type: 'Flash Flooding', address: 'SE 8th St, Brickell' },
  { lat: 25.7726, lng: -80.1912, weight: 4, type: 'Storm Drain Overflow', address: 'SE 2nd St, Downtown Miami' },
  { lat: 25.7785, lng: -80.1872, weight: 3, type: 'Standing Water', address: 'Biscayne Blvd & NE 4th St' },
  { lat: 25.7924, lng: -80.1879, weight: 4, type: 'Coastal Storm Surge', address: 'NE 17th St, Edgewater' },
  { lat: 25.7962, lng: -80.1869, weight: 5, type: 'Road Washout', address: 'N Bayshore Dr & NE 21st St' },
  { lat: 25.7995, lng: -80.1895, weight: 4, type: 'Flash Flooding', address: 'NE 25th St, Edgewater' },
  { lat: 25.7764, lng: -80.2145, weight: 3, type: 'Storm Drain Overflow', address: 'W Flagler St, Little Havana' },
  { lat: 25.7712, lng: -80.2218, weight: 3, type: 'Standing Water', address: 'SW 8th St & SW 17th Ave' },
  { lat: 25.7832, lng: -80.2091, weight: 4, type: 'Flash Flooding', address: 'NW 7th St & NW 10th Ave' },
  { lat: 25.7891, lng: -80.2102, weight: 3, type: 'Downed Power Line', address: 'NW 14th St, Civic Center' },
  { lat: 25.8042, lng: -80.1991, weight: 4, type: 'Storm Drain Overflow', address: 'NW 2nd Ave, Wynwood' },
  { lat: 25.8118, lng: -80.1924, weight: 3, type: 'Standing Water', address: 'NE 36th St, Midtown' },
  { lat: 25.8365, lng: -80.1955, weight: 5, type: 'Flash Flooding', address: 'NE 67th St, Little River' },
  { lat: 25.8398, lng: -80.1912, weight: 4, type: 'Road Washout', address: 'NE 2nd Ave & NE 71st St' },
  { lat: 25.7545, lng: -80.2041, weight: 3, type: 'Standing Water', address: 'S Dixie Hwy, Coral Way' },
  { lat: 25.7618, lng: -80.2194, weight: 4, type: 'Storm Drain Overflow', address: 'SW 13th St & SW 15th Ave' },
];

const state = {
  apiKey: '',
  map: null,
  infoWindow: null,
  origin: { ...MIAMI_CENTER },
  selectedIncidentPoint: { ...MIAMI_CENTER },
  originMarker: null,
  incidents: [...INITIAL_INCIDENTS],
  userIncidentMarkers: [],
  floodPolygons: [],
  shelterRecords: [],
  activeShelterId: null,
  routePolylines: [],
  showHeatmap: true,
  showPolygons: true,
  avoidFloodZones: true,
  webglSupported: false,
  googleMapsOverlay: null,
  heatmapLayer: null,
  fallbackCircles: [],
  libs: {},
};

function getEl(id) {
  return document.getElementById(id);
}

function toLatLngLiteral(point) {
  if (!point) return null;
  const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
  const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return { lat, lng };
}

function formatCoords(latLng) {
  return `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const miles = meters / 1609.344;
  return `${(meters / 1000).toFixed(1)} km (${miles.toFixed(1)} mi)`;
}

function formatDuration(durationMillis) {
  if (!Number.isFinite(durationMillis)) return '--';
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function showApiKeyBanner(message) {
  const banner = getEl('api-key-banner');
  if (!banner) return;
  const strong = document.createElement('strong');
  strong.textContent = 'Google Maps API Key Required: ';
  const span = document.createElement('span');
  span.textContent = message;
  banner.replaceChildren(strong, span);
  banner.hidden = false;
}

function buildInfoWindowNode(title, lines) {
  const card = document.createElement('div');
  card.className = 'iw-card';
  const heading = document.createElement('h3');
  heading.className = 'iw-title';
  heading.textContent = title;
  card.appendChild(heading);

  for (const line of lines) {
    if (!line) continue;
    const p = document.createElement('p');
    p.className = 'iw-line';
    p.textContent = line;
    card.appendChild(p);
  }
  return card;
}

function isPointInsideFloodZones(latLng) {
  const { LatLng } = state.libs.core;
  const { poly } = state.libs.geometry;
  const point = new LatLng(latLng.lat, latLng.lng);

  for (const item of state.floodPolygons) {
    if (poly.containsLocation(point, item.polygon)) {
      return item;
    }
  }
  return null;
}

function doesPathIntersectFloodZones(pathPoints) {
  if (!Array.isArray(pathPoints) || pathPoints.length === 0) {
    return { intersects: false, zone: null };
  }
  const { LatLng } = state.libs.core;
  const { poly } = state.libs.geometry;

  for (let i = 0; i < pathPoints.length; i += 1) {
    const pt = toLatLngLiteral(pathPoints[i]);
    if (!pt) continue;

    const samples = [pt];
    if (i + 1 < pathPoints.length) {
      const nextPt = toLatLngLiteral(pathPoints[i + 1]);
      if (nextPt) {
        samples.push({
          lat: (pt.lat + nextPt.lat) / 2,
          lng: (pt.lng + nextPt.lng) / 2,
        });
      }
    }

    for (const sample of samples) {
      const gPoint = new LatLng(sample.lat, sample.lng);
      for (const item of state.floodPolygons) {
        if (
          poly.containsLocation(gPoint, item.polygon) ||
          poly.isLocationOnEdge(gPoint, item.polygon, 0.00035)
        ) {
          return { intersects: true, zone: item };
        }
      }
    }
  }

  return { intersects: false, zone: null };
}

function generateSafeDetourCandidates(origin, destination, intersectedZone) {
  const bounds = intersectedZone.bounds;
  const pad = 0.0065; // ~700m outside flood polygon boundary
  const north = bounds.maxLat + pad;
  const south = bounds.minLat - pad;
  const east = bounds.maxLng + pad;
  const west = bounds.minLng - pad;
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const midLng = (bounds.minLng + bounds.maxLng) / 2;

  const rawCandidates = [
    { lat: midLat, lng: west },
    { lat: north, lng: west },
    { lat: south, lng: west },
    { lat: north, lng: midLng },
    { lat: south, lng: midLng },
    { lat: midLat, lng: east },
    { lat: north, lng: east },
    { lat: south, lng: east },
  ];

  const safeCandidates = rawCandidates.filter((pt) => !isPointInsideFloodZones(pt));
  safeCandidates.sort((a, b) => {
    const scoreA = haversineMeters(origin, a) + haversineMeters(a, destination);
    const scoreB = haversineMeters(origin, b) + haversineMeters(b, destination);
    return scoreA - scoreB;
  });

  return safeCandidates.slice(0, 4);
}

async function fetchLiveWeather(latLng) {
  if (!state.apiKey) {
    return null;
  }
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.set('key', state.apiKey);
  url.searchParams.set('location.latitude', latLng.lat.toFixed(6));
  url.searchParams.set('location.longitude', latLng.lng.toFixed(6));
  url.searchParams.set('unitsSystem', 'METRIC');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return { unavailable: true, status: response.status };
    }
    const data = await response.json();
    const conditionText = data.weatherCondition?.description?.text || 'Conditions Active';
    const temp = data.temperature?.degrees;
    const windSpeed = data.wind?.speed?.value;
    const windGust = data.wind?.gust?.value;
    const windCardinal = data.wind?.direction?.cardinal || '';
    const precipProb = data.precipitation?.probability?.percent ?? 0;
    const precipMm = data.precipitation?.qpf?.quantity ?? 0;
    const thunderstormProb = data.thunderstormProbability ?? 0;

    return {
      unavailable: false,
      conditionText,
      tempText: typeof temp === 'number' ? `${temp.toFixed(1)}°C` : '--',
      windText:
        typeof windSpeed === 'number'
          ? `${Math.round(windSpeed)} km/h${windGust ? ` (gust ${Math.round(windGust)} km/h)` : ''} ${windCardinal.replaceAll('_', ' ')}`.trim()
          : 'Wind unavailable',
      precipText: `Precip ${precipProb}% (${precipMm} mm/h), Storm ${thunderstormProb}%`,
    };
  } catch {
    return { unavailable: true };
  }
}

async function refreshHeaderWeather() {
  const pillText = getEl('weather-pill-text');
  if (!pillText) return;
  const weather = await fetchLiveWeather(MIAMI_CENTER);
  if (!weather || weather.unavailable) {
    pillText.textContent = 'Miami Coastal Flood Watch';
    return;
  }
  pillText.textContent = `Miami: ${weather.conditionText} • ${weather.tempText} • ${weather.windText}`;
}

async function reverseGeocodePoint(latLng) {
  try {
    const { Geocoder } = state.libs.geocoding;
    const geocoder = new Geocoder();
    const response = await geocoder.geocode({ location: latLng });
    const first = response?.results?.[0];
    return first?.formatted_address || `${formatCoords(latLng)} (Miami, FL)`;
  } catch {
    return `${formatCoords(latLng)} (Miami, FL)`;
  }
}

async function fetchElevationPoint(latLng) {
  try {
    const { ElevationService } = state.libs.elevation;
    const service = new ElevationService();
    const response = await service.getElevationForLocations({ locations: [latLng] });
    const result = response?.results?.[0];
    if (typeof result?.elevation === 'number') {
      return {
        meters: result.elevation,
        text: `${result.elevation.toFixed(2)} m MSL${result.elevation < 2.0 ? ' (Low-lying)' : ''}`,
      };
    }
    return { meters: null, text: 'Elevation unavailable' };
  } catch {
    return { meters: null, text: 'Elevation unavailable' };
  }
}

function updateIncidentCountBadge() {
  const badge = getEl('incident-count-badge');
  if (badge) {
    badge.textContent = `${state.incidents.length} reports`;
  }
}

function updateHeatmapOverlay() {
  const modeBadge = getEl('heatmap-mode-badge');

  if (state.webglSupported && window.deck?.HeatmapLayer && window.deck?.GoogleMapsOverlay) {
    try {
      const layerConfig = {
        id: 'miami-flood-heatmap',
        data: [...state.incidents],
        getPosition: (d) => [d.lng, d.lat],
        getWeight: (d) => d.weight || 3,
        radiusPixels: 42,
        intensity: 1.35,
        threshold: 0.05,
        visible: state.showHeatmap,
      };

      if (!state.heatmapLayer || !state.googleMapsOverlay) {
        state.heatmapLayer = new window.deck.HeatmapLayer(layerConfig);
        state.googleMapsOverlay = new window.deck.GoogleMapsOverlay({
          layers: [state.heatmapLayer],
        });
        state.googleMapsOverlay.setMap(state.map);
      } else {
        state.heatmapLayer = state.heatmapLayer.clone(layerConfig);
        state.googleMapsOverlay.setProps({
          layers: [state.heatmapLayer],
        });
      }

      if (modeBadge) {
        modeBadge.textContent = state.showHeatmap
          ? 'deck.gl HeatmapLayer Active (WebGL2)'
          : 'deck.gl HeatmapLayer Hidden';
      }
      return;
    } catch {
      state.webglSupported = false;
    }
  }

  // Graceful fallback for headless / non-WebGL2 environments
  for (const circle of state.fallbackCircles) {
    circle.setMap(null);
  }
  state.fallbackCircles = [];

  if (state.showHeatmap) {
    const { Circle } = state.libs.maps;
    for (const incident of state.incidents) {
      const weight = incident.weight || 3;
      const circle = new Circle({
        map: state.map,
        center: { lat: incident.lat, lng: incident.lng },
        radius: 110 + weight * 45,
        strokeColor: weight >= 4 ? '#dc2626' : '#f97316',
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: weight >= 4 ? '#ef4444' : '#f59e0b',
        fillOpacity: Math.min(0.32, 0.12 + weight * 0.035),
        clickable: false,
      });
      state.fallbackCircles.push(circle);
    }
  }

  if (modeBadge) {
    modeBadge.textContent = state.showHeatmap
      ? 'Density Halo Fallback (Headless / No WebGL2)'
      : 'Heatmap Layer Hidden';
  }
}

function renderFloodPolygons() {
  const { Polygon } = state.libs.maps;

  for (const item of state.floodPolygons) {
    item.polygon.setMap(null);
  }
  state.floodPolygons = [];

  for (const def of FLOOD_ZONE_DEFINITIONS) {
    const lats = def.paths.map((p) => p.lat);
    const lngs = def.paths.map((p) => p.lng);
    const bounds = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };

    const polygon = new Polygon({
      paths: def.paths,
      strokeColor: def.strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: def.fillColor,
      fillOpacity: 0.24,
      map: state.showPolygons ? state.map : null,
    });

    polygon.addListener('click', (event) => {
      const latLng = toLatLngLiteral(event.latLng);
      if (!latLng) return;
      void handleMapCoordinateSelection(latLng, def.name);
    });

    state.floodPolygons.push({
      ...def,
      bounds,
      polygon,
    });
  }
}

function setOriginMarker(latLng, title = 'Selected Origin / Incident Point') {
  const { AdvancedMarkerElement, PinElement } = state.libs.marker;
  if (!state.originMarker) {
    const pin = new PinElement({
      background: '#d97706',
      borderColor: '#78350f',
      glyphColor: '#ffffff',
      glyphText: '!',
      scale: 1.1,
    });
    state.originMarker = new AdvancedMarkerElement({
      map: state.map,
      position: latLng,
      title,
      content: pin,
      gmpClickable: true,
    });
    state.originMarker.addListener('gmp-click', () => {
      const address = getEl('telemetry-address')?.textContent || '';
      const elev = getEl('telemetry-elevation')?.textContent || '';
      const weather = getEl('telemetry-weather')?.textContent || '';
      state.infoWindow.setContent(
        buildInfoWindowNode('Active Origin / Incident Pin', [address, `Elevation: ${elev}`, weather])
      );
      state.infoWindow.open({ map: state.map, anchor: state.originMarker });
    });
  } else {
    state.originMarker.position = latLng;
    state.originMarker.title = title;
  }
}

async function handleMapCoordinateSelection(latLng, zoneHint = '') {
  state.origin = { ...latLng };
  state.selectedIncidentPoint = { ...latLng };
  setOriginMarker(latLng);

  getEl('telemetry-coords').textContent = formatCoords(latLng);
  getEl('telemetry-address').textContent = 'Resolving street address...';
  getEl('telemetry-elevation').textContent = 'Sampling elevation...';
  getEl('telemetry-weather').textContent = 'Fetching live conditions...';
  getEl('incident-status-line').textContent = '';

  const inZone = isPointInsideFloodZones(latLng);
  const zoneFlag = getEl('incident-zone-flag');
  if (zoneFlag) {
    if (inZone) {
      zoneFlag.className = 'badge badge-danger';
      zoneFlag.textContent = `Inside ${inZone.name}`;
    } else {
      zoneFlag.className = 'badge badge-safe';
      zoneFlag.textContent = 'Outside Flood Polygons';
    }
  }

  const [address, elevation, weather] = await Promise.all([
    reverseGeocodePoint(latLng),
    fetchElevationPoint(latLng),
    fetchLiveWeather(latLng),
  ]);

  getEl('telemetry-address').textContent = address;
  getEl('telemetry-elevation').textContent = elevation.text;
  if (weather && !weather.unavailable) {
    getEl('telemetry-weather').textContent = `${weather.conditionText} • ${weather.tempText} • ${weather.windText} • ${weather.precipText}`;
  } else {
    getEl('telemetry-weather').textContent = 'Live weather telemetry unavailable (check Weather API key quota)';
  }

  const infoLines = [
    address,
    `Elevation: ${elevation.text}`,
    weather && !weather.unavailable ? `${weather.windText} • ${weather.precipText}` : null,
    inZone ? `Alert: Inside ${inZone.name}` : zoneHint ? `Near ${zoneHint}` : 'Outside active flood polygons',
  ];

  state.infoWindow.setContent(buildInfoWindowNode('Geotagged Hazard Point', infoLines));
  state.infoWindow.open({ map: state.map, anchor: state.originMarker });

  updateShelterDistances();
}

function handleLogIncidentReport() {
  const select = getEl('incident-type-select');
  const [typeCode, weightRaw] = (select?.value || 'flash_flood|4').split('|');
  const typeLabel = select?.options[select.selectedIndex]?.textContent || typeCode;
  const weight = Number(weightRaw) || 4;
  const address = getEl('telemetry-address')?.textContent || formatCoords(state.selectedIncidentPoint);

  const newIncident = {
    lat: state.selectedIncidentPoint.lat,
    lng: state.selectedIncidentPoint.lng,
    weight,
    type: typeLabel,
    address,
  };

  state.incidents = [...state.incidents, newIncident];
  updateIncidentCountBadge();
  updateHeatmapOverlay();

  const { AdvancedMarkerElement, PinElement } = state.libs.marker;
  const pin = new PinElement({
    background: '#dc2626',
    borderColor: '#7f1d1d',
    glyphColor: '#ffffff',
    glyphText: String(weight),
    scale: 0.85,
  });
  const incidentMarker = new AdvancedMarkerElement({
    map: state.map,
    position: { lat: newIncident.lat, lng: newIncident.lng },
    title: `${typeLabel} — ${address}`,
    content: pin,
    gmpClickable: true,
  });
  incidentMarker.addListener('gmp-click', () => {
    state.infoWindow.setContent(
      buildInfoWindowNode('Reported Civic Hazard', [
        typeLabel,
        address,
        `Coordinates: ${formatCoords(newIncident)}`,
      ])
    );
    state.infoWindow.open({ map: state.map, anchor: incidentMarker });
  });
  state.userIncidentMarkers.push(incidentMarker);

  const statusLine = getEl('incident-status-line');
  if (statusLine) {
    statusLine.textContent = `Logged "${typeLabel}" at ${address}. HeatmapLayer updated (${state.incidents.length} reports).`;
  }
}

function clearShelterMarkers() {
  for (const record of state.shelterRecords) {
    record.marker.map = null;
  }
  state.shelterRecords = [];
}

function clearRoutePolylines() {
  for (const poly of state.routePolylines) {
    poly.setMap(null);
  }
  state.routePolylines = [];
}

function updateShelterDistances() {
  for (const record of state.shelterRecords) {
    record.distanceFromOrigin = haversineMeters(state.origin, record.location);
  }
  state.shelterRecords.sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);
  renderShelterList();
}

function renderShelterList() {
  const listEl = getEl('shelter-list');
  const countBadge = getEl('shelter-count-badge');
  if (!listEl) return;

  if (countBadge) {
    countBadge.textContent = `${state.shelterRecords.length} found`;
    countBadge.className = state.shelterRecords.length > 0 ? 'badge badge-safe' : 'badge badge-warn';
  }

  if (state.shelterRecords.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'helper-text';
    emptyMsg.textContent = 'No nearby hospitals or community centers returned yet.';
    listEl.replaceChildren(emptyMsg);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const record of state.shelterRecords) {
    const item = document.createElement('article');
    item.className = `shelter-item${state.activeShelterId === record.id ? ' is-active' : ''}`;

    const top = document.createElement('div');
    top.className = 'shelter-item-top';

    const title = document.createElement('h3');
    title.className = 'shelter-name';
    title.textContent = record.displayName;

    const statusBadge = document.createElement('span');
    const isOperational = record.businessStatus === 'OPERATIONAL' || !record.businessStatus;
    statusBadge.className = `badge ${isOperational ? 'badge-safe' : 'badge-warn'}`;
    statusBadge.textContent = isOperational ? 'Operational' : record.businessStatus;

    top.append(title, statusBadge);

    const meta = document.createElement('p');
    meta.className = 'shelter-meta';
    const distLabel = Number.isFinite(record.distanceFromOrigin)
      ? `${formatDistance(record.distanceFromOrigin)} away`
      : '';
    meta.textContent = [record.formattedAddress, distLabel].filter(Boolean).join(' • ');

    const actions = document.createElement('div');
    actions.className = 'shelter-actions';

    const rating = document.createElement('span');
    rating.className = 'shelter-rating';
    rating.textContent =
      typeof record.rating === 'number'
        ? `★ ${record.rating.toFixed(1)} (${record.userRatingCount || 0})`
        : 'Civic Facility';

    const routeBtn = document.createElement('button');
    routeBtn.type = 'button';
    routeBtn.className = 'btn-secondary';
    routeBtn.textContent = 'Route Here';
    routeBtn.addEventListener('click', () => {
      void computeSafeEvacuationRoute(record);
    });

    actions.append(rating, routeBtn);
    item.append(top, meta, actions);
    fragment.appendChild(item);
  }

  listEl.replaceChildren(fragment);
}

function addShelterPlaceToMap(place) {
  const loc = toLatLngLiteral(place.location);
  if (!loc) return null;

  const { AdvancedMarkerElement, PinElement } = state.libs.marker;
  const types = Array.isArray(place.types) ? place.types : [];
  const isHospital = types.includes('hospital') || /hospital|medical|clinic/i.test(place.displayName || '');

  const pin = new PinElement({
    background: isHospital ? '#0f766e' : '#0284c7',
    borderColor: isHospital ? '#134e4a' : '#0c4a6e',
    glyphColor: '#ffffff',
    glyphText: isHospital ? 'H' : 'S',
    scale: 1.05,
  });

  const marker = new AdvancedMarkerElement({
    map: state.map,
    position: loc,
    title: place.displayName || 'Emergency Shelter',
    content: pin,
    gmpClickable: true,
  });

  const record = {
    id: place.id || `${loc.lat},${loc.lng}`,
    displayName: place.displayName || 'Emergency Shelter',
    formattedAddress: place.formattedAddress || 'Miami, FL',
    location: loc,
    types,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    businessStatus: place.businessStatus,
    distanceFromOrigin: haversineMeters(state.origin, loc),
    marker,
  };

  marker.addListener('gmp-click', () => {
    state.infoWindow.setContent(
      buildInfoWindowNode(record.displayName, [
        record.formattedAddress,
        typeof record.rating === 'number'
          ? `Rating: ${record.rating.toFixed(1)} (${record.userRatingCount || 0} reviews)`
          : null,
        `Status: ${record.businessStatus || 'OPERATIONAL'}`,
      ])
    );
    state.infoWindow.open({ map: state.map, anchor: marker });
    void computeSafeEvacuationRoute(record);
  });

  return record;
}

async function searchNearbyShelters(autoRouteBest = false) {
  const findBtn = getEl('find-shelter-btn');
  if (findBtn) {
    findBtn.disabled = true;
    findBtn.textContent = 'Searching Shelters...';
  }

  try {
    const { Place } = state.libs.places;
    const { places } = await Place.searchByText({
      textQuery: 'hospital and community center in Miami, FL',
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'types',
        'rating',
        'userRatingCount',
        'businessStatus',
        'regularOpeningHours',
      ],
      locationBias: {
        center: state.origin,
        radius: 10000,
      },
      maxResultCount: 10,
      region: 'us',
      language: 'en-US',
    });

    clearShelterMarkers();

    if (Array.isArray(places)) {
      for (const place of places) {
        const record = addShelterPlaceToMap(place);
        if (record) {
          state.shelterRecords.push(record);
        }
      }
    }

    state.shelterRecords.sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);
    renderShelterList();

    if (autoRouteBest && state.shelterRecords.length > 0) {
      // Prefer a shelter outside flood polygons first
      const dryShelter =
        state.shelterRecords.find((s) => !isPointInsideFloodZones(s.location)) ||
        state.shelterRecords[0];
      await computeSafeEvacuationRoute(dryShelter);
    }
  } catch (err) {
    const countBadge = getEl('shelter-count-badge');
    if (countBadge) {
      countBadge.textContent = 'Search Error';
      countBadge.className = 'badge badge-danger';
    }
    const detail = getEl('route-detail-note');
    if (detail) {
      detail.textContent = `Unable to query Places API (New): ${err instanceof Error ? err.message : 'Check API key permissions.'}`;
    }
  } finally {
    if (findBtn) {
      findBtn.disabled = false;
      findBtn.textContent = 'Find Safe Shelter';
    }
  }
}

async function computeSafeEvacuationRoute(shelterRecord) {
  if (!shelterRecord) return;
  state.activeShelterId = shelterRecord.id;
  renderShelterList();

  const bypassBadge = getEl('route-bypass-badge');
  const etaEl = getEl('route-eta');
  const distEl = getEl('route-distance');
  const destEl = getEl('route-destination');
  const noteEl = getEl('route-detail-note');

  if (bypassBadge) {
    bypassBadge.className = 'badge badge-neutral';
    bypassBadge.textContent = 'Routing...';
  }
  if (destEl) {
    destEl.textContent = shelterRecord.displayName;
  }

  try {
    const { Route } = state.libs.routes;
    const fields = ['path', 'distanceMeters', 'durationMillis', 'localizedValues', 'legs', 'viewport', 'routeLabels'];

    const primaryRes = await Route.computeRoutes({
      origin: state.origin,
      destination: shelterRecord.location,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: true,
      fields,
    });

    const candidates = primaryRes?.routes || [];
    if (candidates.length === 0) {
      throw new Error('No driving evacuation route returned.');
    }

    let chosenRoute = candidates[0];
    let check = doesPathIntersectFloodZones(chosenRoute.path);
    let bypassMode = check.intersects ? 'intersected' : 'direct_safe';

    if (state.avoidFloodZones && check.intersects && check.zone) {
      // 1. Check if Google Routes API already returned a flood-free alternative route
      const safeAlt = candidates.slice(1).find((alt) => !doesPathIntersectFloodZones(alt.path).intersects);
      if (safeAlt) {
        chosenRoute = safeAlt;
        check = { intersects: false, zone: null };
        bypassMode = 'bypass_verified';
      } else {
        // 2. Compute safe perimeter via-waypoints outside the intersected flood-hazard polygon
        const detourWaypoints = generateSafeDetourCandidates(
          state.origin,
          shelterRecord.location,
          check.zone
        );

        let bestDetourRoute = null;
        for (const wp of detourWaypoints) {
          try {
            const detourRes = await Route.computeRoutes({
              origin: state.origin,
              destination: shelterRecord.location,
              intermediates: [{ location: wp, via: true }],
              travelMode: 'DRIVING',
              routingPreference: 'TRAFFIC_AWARE',
              fields,
            });
            const detourRoute = detourRes?.routes?.[0];
            if (!detourRoute) continue;
            const detourCheck = doesPathIntersectFloodZones(detourRoute.path);
            if (!detourCheck.intersects) {
              if (
                !bestDetourRoute ||
                (detourRoute.distanceMeters || Infinity) < (bestDetourRoute.distanceMeters || Infinity)
              ) {
                bestDetourRoute = detourRoute;
              }
            }
          } catch {
            // Try next candidate perimeter waypoint
          }
        }

        if (bestDetourRoute) {
          chosenRoute = bestDetourRoute;
          check = { intersects: false, zone: null };
          bypassMode = 'bypass_verified';
        }
      }
    }

    clearRoutePolylines();

    const routeStrokeColor = check.intersects ? '#dc2626' : '#0f766e';
    const polylines = chosenRoute.createPolylines({
      polylineOptions: {
        map: state.map,
        strokeColor: routeStrokeColor,
        strokeOpacity: 0.94,
        strokeWeight: 6,
      },
    });
    state.routePolylines.push(...polylines);

    if (chosenRoute.viewport) {
      state.map.fitBounds(chosenRoute.viewport, 60);
    }

    if (etaEl) {
      etaEl.textContent =
        chosenRoute.localizedValues?.duration || formatDuration(chosenRoute.durationMillis);
    }
    if (distEl) {
      distEl.textContent =
        chosenRoute.localizedValues?.distance || formatDistance(chosenRoute.distanceMeters);
    }

    const originInsideFlood = isPointInsideFloodZones(state.origin);
    if (bypassBadge && noteEl) {
      if (bypassMode === 'bypass_verified') {
        bypassBadge.className = 'badge badge-safe';
        bypassBadge.textContent = 'Bypass Verified';
        noteEl.textContent = `Route rerouted around active flood-hazard polygons to ${shelterRecord.displayName} (${shelterRecord.formattedAddress}).`;
      } else if (bypassMode === 'direct_safe') {
        bypassBadge.className = 'badge badge-safe';
        bypassBadge.textContent = 'Flood-Free Route';
        noteEl.textContent = `Direct route to ${shelterRecord.displayName} verified clear of all active flood-hazard polygons.`;
      } else if (originInsideFlood && state.avoidFloodZones) {
        bypassBadge.className = 'badge badge-warn';
        bypassBadge.textContent = 'Flood Exit Required';
        noteEl.textContent = `Origin is inside ${originInsideFlood.name}. Proceed outward carefully toward ${shelterRecord.displayName}.`;
      } else {
        bypassBadge.className = 'badge badge-danger';
        bypassBadge.textContent = 'Flood Zone Crossed';
        noteEl.textContent = `Warning: Route intersects ${check.zone?.name || 'active flood polygon'}. Enable "Avoid Active Flood-Hazard Polygons" to detour.`;
      }
    }
  } catch (err) {
    if (bypassBadge) {
      bypassBadge.className = 'badge badge-danger';
      bypassBadge.textContent = 'Route Unavailable';
    }
    if (noteEl) {
      noteEl.textContent = `Routes API error: ${err instanceof Error ? err.message : 'Unable to calculate evacuation route.'}`;
    }
  }
}

function mountPlaceAutocomplete() {
  const host = getEl('shelter-search-container');
  const fallbackInput = getEl('shelter-search-fallback');
  if (!host || !state.libs.places?.PlaceAutocompleteElement) return;

  const { PlaceAutocompleteElement } = state.libs.places;
  const autocomplete = new PlaceAutocompleteElement({
    locationBias: {
      center: MIAMI_CENTER,
      radius: 20000,
    },
    includedRegionCodes: ['us'],
    placeholder: 'Search Miami address or shelter...',
  });
  autocomplete.id = 'shelter-search-input';

  if (fallbackInput) {
    fallbackInput.replaceWith(autocomplete);
  } else {
    host.appendChild(autocomplete);
  }

  autocomplete.addEventListener('gmp-select', async (event) => {
    try {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'types',
          'rating',
          'userRatingCount',
          'businessStatus',
        ],
      });

      const loc = toLatLngLiteral(place.location);
      if (!loc) return;

      state.map.panTo(loc);
      state.map.setZoom(14);

      const types = Array.isArray(place.types) ? place.types : [];
      const looksLikeShelter =
        types.includes('hospital') ||
        types.includes('community_center') ||
        /hospital|medical|shelter|community center/i.test(place.displayName || '');

      if (looksLikeShelter) {
        let existing = state.shelterRecords.find((s) => s.id === place.id);
        if (!existing) {
          existing = addShelterPlaceToMap(place);
          if (existing) {
            state.shelterRecords.unshift(existing);
            renderShelterList();
          }
        }
        if (existing) {
          await computeSafeEvacuationRoute(existing);
        }
      } else {
        await handleMapCoordinateSelection(loc);
        await searchNearbyShelters(true);
      }
    } catch {
      // Keep UI responsive on canceled selection
    }
  });
}

function bindUiEvents() {
  getEl('layer-toggle-heatmap')?.addEventListener('change', (event) => {
    state.showHeatmap = Boolean(event.target.checked);
    updateHeatmapOverlay();
  });

  getEl('layer-toggle-polygons')?.addEventListener('change', (event) => {
    state.showPolygons = Boolean(event.target.checked);
    for (const item of state.floodPolygons) {
      item.polygon.setMap(state.showPolygons ? state.map : null);
    }
  });

  getEl('avoid-flood-toggle')?.addEventListener('change', (event) => {
    state.avoidFloodZones = Boolean(event.target.checked);
    if (state.activeShelterId) {
      const active = state.shelterRecords.find((s) => s.id === state.activeShelterId);
      if (active) {
        void computeSafeEvacuationRoute(active);
      }
    }
  });

  getEl('incident-submit-btn')?.addEventListener('click', () => {
    handleLogIncidentReport();
  });

  getEl('find-shelter-btn')?.addEventListener('click', () => {
    void searchNearbyShelters(true);
  });
}

async function initApp() {
  updateIncidentCountBadge();
  bindUiEvents();

  const apiKey = window.__GMP_CONFIG__?.apiKey?.trim() || '';
  state.apiKey = apiKey;

  if (!apiKey) {
    showApiKeyBanner(
      'Set GOOGLE_MAPS_API_KEY in your .env file (use a free Maps Demo Key for prototyping) and restart the server.'
    );
    const badge = getEl('heatmap-mode-badge');
    if (badge) badge.textContent = 'Awaiting GOOGLE_MAPS_API_KEY';
    const pillText = getEl('weather-pill-text');
    if (pillText) pillText.textContent = 'Miami Weather: API Key Needed';
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });

    const [coreLib, mapsLib, markerLib, placesLib, routesLib, geocodingLib, elevationLib, geometryLib] =
      await Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('geocoding'),
        importLibrary('elevation'),
        importLibrary('geometry'),
      ]);

    state.libs = {
      core: coreLib,
      maps: mapsLib,
      marker: markerLib,
      places: placesLib,
      routes: routesLib,
      geocoding: geocodingLib,
      elevation: elevationLib,
      geometry: geometryLib,
    };

    const mapContainer = getEl('map-container');
    state.map = new mapsLib.Map(mapContainer, {
      center: MIAMI_CENTER,
      zoom: 13,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    });

    state.infoWindow = new mapsLib.InfoWindow();
    state.webglSupported = supportsWebGL2();

    renderFloodPolygons();
    updateHeatmapOverlay();
    setOriginMarker(MIAMI_CENTER, 'Downtown Miami Evacuation Origin');
    mountPlaceAutocomplete();

    state.map.addListener('click', (event) => {
      const latLng = toLatLngLiteral(event.latLng);
      if (!latLng) return;
      void handleMapCoordinateSelection(latLng);
    });

    await Promise.all([
      refreshHeaderWeather(),
      handleMapCoordinateSelection(MIAMI_CENTER),
      searchNearbyShelters(true),
    ]);
  } catch (err) {
    showApiKeyBanner(
      `Maps initialization failed: ${err instanceof Error ? err.message : 'Check API key and enabled APIs.'}`
    );
  }
}

void initApp();
