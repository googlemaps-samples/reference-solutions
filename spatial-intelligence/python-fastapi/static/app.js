(function () {
  'use strict';

  const NYC_CENTER = { lat: 40.73061, lng: -73.98661 };
  const NYC_BOUNDS = {
    north: 40.917577,
    south: 40.477399,
    east: -73.700272,
    west: -74.25909,
  };
  const SEED_SEARCH_QUERY = 'New York City civic transit hub';

  const spatial = window.NYC_SPATIAL_DATA;

  const state = {
    map: null,
    coreLib: null,
    mapsLib: null,
    markerLib: null,
    placesLib: null,
    infoWindow: null,
    basemap: 'roadmap',
    deckMode: 'scatterplot',
    showGeoJson: true,
    selectedDistrictId: null,
    customPolygonRing: null,
    deckOverlay: null,
    webgl2Available: false,
    terraDraw: null,
    terraDrawMode: 'static',
    placeMarkers: [],
    jumpMarker: null,
    lastConfig: null,
  };

  function el(id) {
    return document.getElementById(id);
  }

  function supportsWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return Boolean(gl && typeof WebGL2RenderingContext !== 'undefined');
    } catch {
      return false;
    }
  }

  function loadGoogleMapsBootstrap(apiKey) {
    if (window.google && window.google.maps && typeof window.google.maps.importLibrary === 'function') {
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
      if (!d[l]) {
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
      }
    })({
      key: apiKey,
      v: 'weekly',
    });
  }

  function getFilteredSensors() {
    if (state.customPolygonRing) {
      return spatial.sensors.filter((s) =>
        spatial.pointInRing(s.lng, s.lat, state.customPolygonRing)
      );
    }
    if (state.selectedDistrictId) {
      return spatial.sensors.filter((s) => s.districtId === state.selectedDistrictId);
    }
    return spatial.sensors;
  }

  function getActiveStudyAreaKm2() {
    if (state.customPolygonRing) {
      return spatial.computePolygonAreaKm2(state.customPolygonRing);
    }
    if (state.selectedDistrictId) {
      const feature = spatial.districtsGeoJson.features.find(
        (f) => f.properties.id === state.selectedDistrictId
      );
      if (feature) {
        return spatial.computePolygonAreaKm2(feature.geometry.coordinates[0]);
      }
    }
    return spatial.districtsGeoJson.features.reduce(
      (sum, f) => sum + spatial.computePolygonAreaKm2(f.geometry.coordinates[0]),
      0
    );
  }

  function updateAnalyticsPanel() {
    const activeSensors = getFilteredSensors();
    const totalSensors = spatial.sensors.length;
    const count = activeSensors.length;
    const sharePct = totalSensors > 0 ? ((count / totalSensors) * 100).toFixed(1) : '0.0';

    let avgLoad = 0;
    let peakLoad = 0;
    let totalMw = 0;
    for (const s of activeSensors) {
      avgLoad += s.loadPct;
      if (s.loadPct > peakLoad) peakLoad = s.loadPct;
      totalMw += s.capacityMw;
    }
    avgLoad = count > 0 ? avgLoad / count : 0;

    const areaKm2 = getActiveStudyAreaKm2();
    const density = areaKm2 > 0 ? count / areaKm2 : 0;

    el('kpi-sensor-count').textContent = count.toLocaleString();
    el('kpi-sensor-share').textContent = `${sharePct}% of grid`;
    el('kpi-avg-load').textContent = count > 0 ? `${avgLoad.toFixed(1)}%` : '0.0%';
    el('kpi-peak-load').textContent = `Peak: ${count > 0 ? peakLoad.toFixed(1) : '0.0'}%`;
    el('kpi-total-mw').textContent = `${totalMw.toFixed(0)} MW`;
    el('kpi-area-km2').textContent = `${areaKm2.toFixed(2)} km²`;
    el('kpi-density').textContent = `${density.toFixed(0)} sensors/km²`;

    const scopePill = el('active-scope-pill');
    const filterNote = el('zone-filter-note');
    const resetBtn = el('reset-scope-btn');

    if (state.customPolygonRing) {
      scopePill.textContent = 'Custom Terra Draw Zone';
      filterNote.textContent = `Polygon filter active (${state.customPolygonRing.length - 1} vertices).`;
      resetBtn.classList.remove('hidden');
    } else if (state.selectedDistrictId) {
      const feature = spatial.districtsGeoJson.features.find(
        (f) => f.properties.id === state.selectedDistrictId
      );
      const name = feature ? feature.properties.name : state.selectedDistrictId;
      scopePill.textContent = `District: ${name}`;
      filterNote.textContent = `Filtered to ${feature ? feature.properties.borough : 'NYC'} planning district.`;
      resetBtn.classList.remove('hidden');
    } else {
      scopePill.textContent = 'Citywide (8 Zones)';
      filterNote.textContent = 'Showing all 8 NYC planning zones.';
      resetBtn.classList.add('hidden');
    }
  }

  function renderDistrictList() {
    const list = el('district-selector-list');
    const nodes = spatial.districtsGeoJson.features.map((feature) => {
      const props = feature.properties;
      const color = spatial.getCapacityColor(props.capacityUtilization);
      const districtSensors = spatial.sensors.filter((s) => s.districtId === props.id);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'district-item';
      if (state.selectedDistrictId === props.id && !state.customPolygonRing) {
        btn.classList.add('active');
      }
      btn.dataset.districtId = props.id;
      btn.setAttribute('data-testid', `district-item-${props.id}`);

      const top = document.createElement('div');
      top.className = 'district-top';

      const nameWrap = document.createElement('div');
      nameWrap.className = 'district-name-wrap';

      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color.fill;

      const name = document.createElement('span');
      name.className = 'district-name';
      name.textContent = props.name;

      nameWrap.append(swatch, name);

      const util = document.createElement('span');
      util.className = 'district-util';
      util.style.color = color.fill;
      util.textContent = `${props.capacityUtilization.toFixed(1)}%`;

      top.append(nameWrap, util);

      const meta = document.createElement('div');
      meta.className = 'district-meta';

      const leftMeta = document.createElement('span');
      leftMeta.textContent = `${props.borough} • ${props.capacityTier}`;

      const rightMeta = document.createElement('span');
      rightMeta.textContent = `${districtSensors.length} sensors • ${props.gridCapacityMw} MW`;

      meta.append(leftMeta, rightMeta);
      btn.append(top, meta);

      btn.addEventListener('click', () => selectDistrict(props.id));
      return btn;
    });

    list.replaceChildren(...nodes);
  }

  function applyGeoJsonStyle() {
    if (!state.map) return;
    state.map.data.setStyle((feature) => {
      if (!state.showGeoJson) {
        return { visible: false };
      }
      const id = feature.getProperty('id');
      const utilization = Number(feature.getProperty('capacityUtilization') || 70);
      const color = spatial.getCapacityColor(utilization);
      const isSelected = id === state.selectedDistrictId && !state.customPolygonRing;
      return {
        visible: true,
        fillColor: color.fill,
        fillOpacity: isSelected ? 0.38 : 0.16,
        strokeColor: isSelected ? '#38bdf8' : color.stroke,
        strokeWeight: isSelected ? 3 : 1.5,
        strokeOpacity: 0.9,
        zIndex: isSelected ? 5 : 1,
      };
    });
  }

  function fitMapToRing(ring) {
    if (!state.map || !state.coreLib || !Array.isArray(ring) || ring.length === 0) return;
    const bounds = new state.coreLib.LatLngBounds();
    for (const [lng, lat] of ring) {
      bounds.extend({ lat, lng });
    }
    state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }

  function selectDistrict(districtId) {
    const feature = spatial.districtsGeoJson.features.find(
      (f) => f.properties.id === districtId
    );
    if (!feature) return;

    if (state.terraDraw && state.customPolygonRing) {
      state.terraDraw.clear();
      state.customPolygonRing = null;
    }

    state.selectedDistrictId = districtId;
    renderDistrictList();
    updateAnalyticsPanel();
    applyGeoJsonStyle();
    updateDeckGlLayers();
    fitMapToRing(feature.geometry.coordinates[0]);
    sampleElevationForActiveScope();
  }

  function resetScopeToCitywide() {
    state.selectedDistrictId = null;
    state.customPolygonRing = null;
    if (state.terraDraw) {
      try {
        state.terraDraw.clear();
        state.terraDraw.setMode('static');
      } catch {
        // Ignore if Terra Draw is not yet ready
      }
      setTerraDrawToolbarState('static');
    }
    renderDistrictList();
    updateAnalyticsPanel();
    applyGeoJsonStyle();
    updateDeckGlLayers();
    if (state.map) {
      state.map.panTo(NYC_CENTER);
      state.map.setZoom(12);
    }
    sampleElevationForActiveScope();
  }

  function buildDeckLayers() {
    if (!window.deck) return [];
    const { ScatterplotLayer, HexagonLayer } = window.deck;
    const hasFilter = Boolean(state.customPolygonRing || state.selectedDistrictId);
    const activeSensors = getFilteredSensors();

    if (state.deckMode === 'hexagon' && typeof HexagonLayer === 'function') {
      return [
        new HexagonLayer({
          id: 'nyc-sensor-hexagon-layer',
          data: activeSensors,
          pickable: true,
          extruded: true,
          radius: 260,
          elevationScale: 12,
          coverage: 0.85,
          getPosition: (d) => d.position,
          getColorWeight: (d) => d.loadPct,
          colorAggregation: 'MEAN',
          colorRange: [
            [16, 185, 129, 190],
            [234, 179, 8, 200],
            [249, 115, 22, 215],
            [239, 68, 68, 235],
          ],
        }),
      ];
    }

    if (typeof ScatterplotLayer === 'function') {
      return [
        new ScatterplotLayer({
          id: 'nyc-sensor-scatterplot-layer',
          data: spatial.sensors,
          pickable: true,
          opacity: 0.85,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          lineWidthMinPixels: 1,
          getPosition: (d) => d.position,
          getRadius: (d) => 22 + d.capacityMw * 8,
          getFillColor: (d) => {
            const inScope = state.customPolygonRing
              ? spatial.pointInRing(d.lng, d.lat, state.customPolygonRing)
              : state.selectedDistrictId
                ? d.districtId === state.selectedDistrictId
                : true;
            const rgb = spatial.getCapacityColor(d.loadPct).rgb;
            if (!hasFilter || inScope) {
              return [rgb[0], rgb[1], rgb[2], 210];
            }
            return [100, 116, 139, 45];
          },
          getLineColor: [15, 23, 42, 180],
          updateTriggers: {
            getFillColor: [state.selectedDistrictId, state.customPolygonRing],
          },
        }),
      ];
    }

    return [];
  }

  function initDeckGlOverlay() {
    const statusText = el('deckgl-status-text');
    state.webgl2Available = supportsWebGL2();

    if (!state.webgl2Available) {
      statusText.textContent = '2D GeoJSON mode (WebGL2 unavailable in headless GPU)';
      return;
    }

    if (!window.deck || typeof window.deck.GoogleMapsOverlay !== 'function') {
      statusText.textContent = 'Deck.gl UMD bundle unavailable; GeoJSON layer active';
      return;
    }

    try {
      state.deckOverlay = new window.deck.GoogleMapsOverlay({
        interleaved: false,
        layers: buildDeckLayers(),
        onError: () => {
          statusText.textContent = '2D GeoJSON mode (WebGL layer fallback)';
        },
      });
      state.deckOverlay.setMap(state.map);
      statusText.textContent = `Deck.gl ${state.deckMode} active (${spatial.sensors.length.toLocaleString()} sensors)`;
    } catch {
      state.deckOverlay = null;
      statusText.textContent = '2D GeoJSON mode (WebGL context fallback)';
    }
  }

  function updateDeckGlLayers() {
    const statusText = el('deckgl-status-text');
    if (!state.deckOverlay) {
      if (!state.webgl2Available) {
        statusText.textContent = `2D GeoJSON mode (${getFilteredSensors().length.toLocaleString()} sensors in scope)`;
      }
      return;
    }
    try {
      state.deckOverlay.setProps({ layers: buildDeckLayers() });
      statusText.textContent = `Deck.gl ${state.deckMode} active (${getFilteredSensors().length.toLocaleString()} in scope)`;
    } catch {
      statusText.textContent = 'Deck.gl layer update fallback active';
    }
  }

  function setTerraDrawToolbarState(mode) {
    state.terraDrawMode = mode;
    const polyBtn = el('terradraw-polygon-btn');
    const selectBtn = el('terradraw-select-btn');
    polyBtn.classList.toggle('active', mode === 'polygon');
    selectBtn.classList.toggle('active', mode === 'select');
  }

  function syncTerraDrawPolygon() {
    if (!state.terraDraw) return;
    let snapshot = [];
    try {
      snapshot = state.terraDraw.getSnapshot() || [];
    } catch {
      return;
    }

    const completedPolygons = snapshot.filter(
      (f) =>
        f &&
        f.geometry &&
        f.geometry.type === 'Polygon' &&
        Array.isArray(f.geometry.coordinates) &&
        Array.isArray(f.geometry.coordinates[0]) &&
        f.geometry.coordinates[0].length >= 4 &&
        !f.properties?.currentlyDrawing &&
        !f.properties?.midPoint &&
        !f.properties?.selectionPoint
    );

    if (completedPolygons.length === 0) {
      if (state.customPolygonRing) {
        state.customPolygonRing = null;
        renderDistrictList();
        updateAnalyticsPanel();
        applyGeoJsonStyle();
        updateDeckGlLayers();
      }
      return;
    }

    const latest = completedPolygons[completedPolygons.length - 1];
    state.customPolygonRing = latest.geometry.coordinates[0];
    state.selectedDistrictId = null;
    renderDistrictList();
    updateAnalyticsPanel();
    applyGeoJsonStyle();
    updateDeckGlLayers();
    sampleElevationForActiveScope();
  }

  function initTerraDraw() {
    if (!state.map || state.terraDraw) return;
    const td = window.terraDraw;
    const adapterPkg = window.terraDrawGoogleMapsAdapter;
    if (!td || !adapterPkg || !td.TerraDraw || !adapterPkg.TerraDrawGoogleMapsAdapter) {
      return;
    }

    const setupInstance = () => {
      if (state.terraDraw) return;
      try {
        const instance = new td.TerraDraw({
          adapter: new adapterPkg.TerraDrawGoogleMapsAdapter({
            map: state.map,
            lib: google.maps,
            coordinatePrecision: 9,
          }),
          modes: [
            new td.TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    rotateable: true,
                    coordinates: {
                      midpoints: true,
                      draggable: true,
                      deletable: true,
                    },
                  },
                },
              },
            }),
            new td.TerraDrawPolygonMode({
              editable: true,
              styles: {
                fillColor: '#38bdf8',
                fillOpacity: 0.22,
                outlineColor: '#0284c7',
                outlineWidth: 2.5,
              },
            }),
          ],
        });

        instance.start();
        instance.on('finish', () => {
          syncTerraDrawPolygon();
        });
        instance.on('change', () => {
          if (state.terraDrawMode === 'select') {
            syncTerraDrawPolygon();
          }
        });
        state.terraDraw = instance;
      } catch {
        state.terraDraw = null;
      }
    };

    if (state.map.getProjection()) {
      setupInstance();
    } else {
      const listener = state.map.addListener('projection_changed', () => {
        if (state.map.getProjection()) {
          listener.remove();
          setupInstance();
        }
      });
    }
  }

  function getElevationSampleLocations(overridePoint) {
    if (overridePoint) {
      return [
        overridePoint,
        { lat: overridePoint.lat + 0.004, lng: overridePoint.lng + 0.004 },
        { lat: overridePoint.lat - 0.004, lng: overridePoint.lng - 0.004 },
      ];
    }

    let ring = state.customPolygonRing;
    if (!ring && state.selectedDistrictId) {
      const feature = spatial.districtsGeoJson.features.find(
        (f) => f.properties.id === state.selectedDistrictId
      );
      if (feature) ring = feature.geometry.coordinates[0];
    }

    if (ring && ring.length >= 3) {
      const centroid = spatial.computePolygonCentroid(ring);
      const pts = [centroid];
      const step = Math.max(1, Math.floor(ring.length / 8));
      for (let i = 0; i < ring.length && pts.length < 12; i += step) {
        pts.push({ lat: ring[i][1], lng: ring[i][0] });
      }
      return pts;
    }

    const center = state.map ? state.map.getCenter() : null;
    const baseLat = center ? center.lat() : NYC_CENTER.lat;
    const baseLng = center ? center.lng() : NYC_CENTER.lng;
    return [
      { lat: baseLat, lng: baseLng },
      { lat: baseLat + 0.015, lng: baseLng - 0.012 },
      { lat: baseLat + 0.015, lng: baseLng + 0.012 },
      { lat: baseLat - 0.015, lng: baseLng - 0.012 },
      { lat: baseLat - 0.015, lng: baseLng + 0.012 },
    ];
  }

  async function sampleElevationForActiveScope(overridePoint) {
    const btn = el('sample-elevation-btn');
    const statusText = el('elevation-status-text');
    btn.disabled = true;
    statusText.textContent = 'Querying /api/elevation...';

    try {
      const locations = getElevationSampleLocations(overridePoint);
      const response = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations }),
      });
      const data = await response.json();

      if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
        const elevations = data.results.map((r) => Number(r.elevation)).filter((n) => Number.isFinite(n));
        const resolutions = data.results.map((r) => Number(r.resolution)).filter((n) => Number.isFinite(n));
        const minVal = Math.min(...elevations);
        const maxVal = Math.max(...elevations);
        const meanVal = elevations.reduce((a, b) => a + b, 0) / elevations.length;
        const avgRes =
          resolutions.length > 0
            ? resolutions.reduce((a, b) => a + b, 0) / resolutions.length
            : null;

        el('elev-min').textContent = minVal.toFixed(1);
        el('elev-mean').textContent = meanVal.toFixed(1);
        el('elev-max').textContent = maxVal.toFixed(1);
        statusText.textContent = avgRes
          ? `Sampled ${elevations.length} points (avg resolution ${avgRes.toFixed(1)} m).`
          : `Sampled ${elevations.length} terrain points via Elevation API.`;
      } else {
        el('elev-min').textContent = '--';
        el('elev-mean').textContent = '--';
        el('elev-max').textContent = '--';
        statusText.textContent =
          data.message || `Elevation API status: ${data.status || 'UNAVAILABLE'}.`;
      }
    } catch {
      statusText.textContent = 'Unable to reach /api/elevation endpoint.';
    } finally {
      btn.disabled = false;
    }
  }

  function clearPlaceMarkers() {
    for (const marker of state.placeMarkers) {
      marker.map = null;
    }
    state.placeMarkers = [];
  }

  function createInfoWindowContent(title, subtitle, coordsText) {
    const wrapper = document.createElement('div');
    wrapper.style.color = '#0f172a';
    wrapper.style.fontFamily = 'sans-serif';
    wrapper.style.padding = '2px 4px';
    wrapper.style.maxWidth = '240px';

    const strong = document.createElement('div');
    strong.style.fontWeight = '700';
    strong.style.fontSize = '13px';
    strong.style.marginBottom = '3px';
    strong.textContent = title;

    const addr = document.createElement('div');
    addr.style.fontSize = '12px';
    addr.style.color = '#334155';
    addr.textContent = subtitle;

    wrapper.append(strong, addr);

    if (coordsText) {
      const coords = document.createElement('div');
      coords.style.fontSize = '11px';
      coords.style.color = '#64748b';
      coords.style.marginTop = '4px';
      coords.textContent = coordsText;
      wrapper.append(coords);
    }
    return wrapper;
  }

  async function loadLiveCivicPlaces() {
    const listEl = el('live-places-list');
    const badgeEl = el('places-status-badge');

    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery: SEED_SEARCH_QUERY,
          lat: NYC_CENTER.lat,
          lng: NYC_CENTER.lng,
          radiusMeters: 12000,
          maxResultCount: 6,
        }),
      });
      const data = await response.json();

      if (data.status !== 'OK' || !Array.isArray(data.places) || data.places.length === 0) {
        badgeEl.textContent = data.status || 'Unavailable';
        const note = document.createElement('p');
        note.className = 'status-note';
        note.textContent =
          data.message || 'Configure GOOGLE_MAPS_API_KEY with Places API (New) to load live hubs.';
        listEl.replaceChildren(note);
        return;
      }

      badgeEl.textContent = `${data.places.length} Live Hubs`;
      clearPlaceMarkers();

      const items = data.places.map((place, idx) => {
        const displayName = place.displayName?.text || 'Civic Transit Hub';
        const address = place.formattedAddress || 'New York, NY';
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;

        let marker = null;
        if (state.map && state.markerLib && Number.isFinite(lat) && Number.isFinite(lng)) {
          const pin = new state.markerLib.PinElement({
            background: '#0f172a',
            borderColor: '#38bdf8',
            glyphColor: '#f8fafc',
            glyphText: String(idx + 1),
            scale: 0.95,
          });
          marker = new state.markerLib.AdvancedMarkerElement({
            map: state.map,
            position: { lat, lng },
            title: displayName,
          });
          marker.append(pin);

          marker.addListener('click', () => {
            if (state.infoWindow) {
              state.infoWindow.setContent(
                createInfoWindowContent(
                  displayName,
                  address,
                  `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                )
              );
              state.infoWindow.open({ anchor: marker, map: state.map });
            }
            sampleElevationForActiveScope({ lat, lng });
          });

          state.placeMarkers.push(marker);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'place-item';

        const nameEl = document.createElement('div');
        nameEl.className = 'place-name';
        nameEl.textContent = `${idx + 1}. ${displayName}`;

        const addrEl = document.createElement('div');
        addrEl.className = 'place-addr';
        addrEl.textContent = address;

        btn.append(nameEl, addrEl);
        btn.addEventListener('click', () => {
          if (state.map && Number.isFinite(lat) && Number.isFinite(lng)) {
            state.map.panTo({ lat, lng });
            state.map.setZoom(14);
            if (marker && state.infoWindow) {
              state.infoWindow.setContent(
                createInfoWindowContent(
                  displayName,
                  address,
                  `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                )
              );
              state.infoWindow.open({ anchor: marker, map: state.map });
            }
            sampleElevationForActiveScope({ lat, lng });
          }
        });
        return btn;
      });

      listEl.replaceChildren(...items);
    } catch {
      badgeEl.textContent = 'Error';
      const note = document.createElement('p');
      note.className = 'status-note';
      note.textContent = 'Failed to fetch live civic hubs from /api/places/search.';
      listEl.replaceChildren(note);
    }
  }

  function mountPlaceAutocomplete() {
    const host = el('place-autocomplete-host');
    if (!state.placesLib || !state.placesLib.PlaceAutocompleteElement || !state.map) {
      return;
    }

    try {
      const autocomplete = new state.placesLib.PlaceAutocompleteElement({
        locationBias: NYC_BOUNDS,
        includedRegionCodes: ['us'],
      });
      autocomplete.id = 'place-autocomplete-input';
      autocomplete.setAttribute('aria-label', 'Jump to NYC location');

      autocomplete.addEventListener('gmp-select', async (event) => {
        try {
          const prediction = event.placePrediction;
          if (!prediction) return;
          const place = prediction.toPlace();
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
          });

          if (place.viewport) {
            state.map.fitBounds(place.viewport);
          } else if (place.location) {
            state.map.panTo(place.location);
            state.map.setZoom(15);
          }

          if (place.location && state.markerLib) {
            if (state.jumpMarker) {
              state.jumpMarker.map = null;
            }
            const pin = new state.markerLib.PinElement({
              background: '#0284c7',
              borderColor: '#f8fafc',
              glyphColor: '#ffffff',
              glyphText: '★',
            });
            state.jumpMarker = new state.markerLib.AdvancedMarkerElement({
              map: state.map,
              position: place.location,
              title: place.displayName || 'Selected Location',
            });
            state.jumpMarker.append(pin);

            if (state.infoWindow) {
              state.infoWindow.setContent(
                createInfoWindowContent(
                  place.displayName || 'Selected Location',
                  place.formattedAddress || 'New York City',
                  `${place.location.lat().toFixed(5)}, ${place.location.lng().toFixed(5)}`
                )
              );
              state.infoWindow.open({ anchor: state.jumpMarker, map: state.map });
            }

            sampleElevationForActiveScope({
              lat: place.location.lat(),
              lng: place.location.lng(),
            });
          }
        } catch {
          // Handle prediction selection errors gracefully
        }
      });

      autocomplete.addEventListener('gmp-error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'autocomplete-fallback';
        fallback.textContent = 'Autocomplete unavailable';
        host.replaceChildren(fallback);
      });

      host.replaceChildren(autocomplete);
    } catch {
      // Keep fallback status badge if web component is unavailable
    }
  }

  function wireControls() {
    document.querySelectorAll('[data-maptype]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mapType = btn.dataset.maptype;
        if (!mapType) return;
        state.basemap = mapType;
        document.querySelectorAll('[data-maptype]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        if (state.map) {
          state.map.setMapTypeId(mapType);
        }
      });
    });

    document.querySelectorAll('[data-layer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.layer;
        if (!mode) return;
        state.deckMode = mode;
        document.querySelectorAll('[data-layer]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        updateDeckGlLayers();
      });
    });

    const toggleGeoJsonBtn = el('toggle-geojson-btn');
    if (toggleGeoJsonBtn) {
      toggleGeoJsonBtn.addEventListener('click', () => {
        state.showGeoJson = !state.showGeoJson;
        toggleGeoJsonBtn.classList.toggle('active', state.showGeoJson);
        toggleGeoJsonBtn.setAttribute('aria-pressed', String(state.showGeoJson));
        toggleGeoJsonBtn.textContent = `GeoJSON Zones: ${state.showGeoJson ? 'ON' : 'OFF'}`;
        applyGeoJsonStyle();
      });
    }

    el('reset-scope-btn')?.addEventListener('click', resetScopeToCitywide);
    el('sample-elevation-btn')?.addEventListener('click', () =>
      sampleElevationForActiveScope()
    );

    el('terradraw-polygon-btn')?.addEventListener('click', () => {
      if (!state.terraDraw) return;
      try {
        state.terraDraw.setMode('polygon');
        setTerraDrawToolbarState('polygon');
      } catch {
        // Ignore if Terra Draw mode switch fails
      }
    });

    el('terradraw-select-btn')?.addEventListener('click', () => {
      if (!state.terraDraw) return;
      try {
        state.terraDraw.setMode('select');
        setTerraDrawToolbarState('select');
      } catch {
        // Ignore if Terra Draw mode switch fails
      }
    });

    el('terradraw-clear-btn')?.addEventListener('click', () => {
      if (state.terraDraw) {
        try {
          state.terraDraw.clear();
          state.terraDraw.setMode('static');
        } catch {
          // Ignore
        }
      }
      state.customPolygonRing = null;
      setTerraDrawToolbarState('static');
      renderDistrictList();
      updateAnalyticsPanel();
      applyGeoJsonStyle();
      updateDeckGlLayers();
      sampleElevationForActiveScope();
    });
  }

  async function initWorkbench() {
    renderDistrictList();
    updateAnalyticsPanel();
    wireControls();

    let config;
    try {
      const resp = await fetch('/api/config');
      config = await resp.json();
    } catch {
      config = { hasKey: false, googleMapsApiKey: '', mapId: 'DEMO_MAP_ID' };
    }
    state.lastConfig = config;

    if (!config.hasKey || !config.googleMapsApiKey) {
      el('map-setup-banner').classList.remove('hidden');
      el('deckgl-status-text').textContent = 'Awaiting GOOGLE_MAPS_API_KEY configuration';
      loadLiveCivicPlaces();
      return;
    }

    try {
      loadGoogleMapsBootstrap(config.googleMapsApiKey);
      const [coreLib, mapsLib, markerLib, placesLib] = await Promise.all([
        google.maps.importLibrary('core'),
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('elevation'),
      ]);

      state.coreLib = coreLib;
      state.mapsLib = mapsLib;
      state.markerLib = markerLib;
      state.placesLib = placesLib;

      const mapContainer = el('map');
      state.map = new mapsLib.Map(mapContainer, {
        center: NYC_CENTER,
        zoom: 12,
        mapId: config.mapId || 'DEMO_MAP_ID',
        mapTypeId: state.basemap,
        internalUsageAttributionIds: [config.attributionId || 'gmp_git_agentsamples_v1.0.0'],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: true,
      });

      state.infoWindow = new mapsLib.InfoWindow();

      state.map.data.addGeoJson(spatial.districtsGeoJson);
      applyGeoJsonStyle();
      state.map.data.addListener('click', (event) => {
        const districtId = event.feature.getProperty('id');
        if (districtId && state.terraDrawMode !== 'polygon') {
          selectDistrict(districtId);
        }
      });

      initDeckGlOverlay();
      initTerraDraw();
      mountPlaceAutocomplete();
      loadLiveCivicPlaces();
      sampleElevationForActiveScope();
    } catch {
      el('map-setup-banner').classList.remove('hidden');
      el('deckgl-status-text').textContent = 'Maps initialization failed; check API key permissions';
    }
  }

  document.addEventListener('DOMContentLoaded', initWorkbench);
})();
