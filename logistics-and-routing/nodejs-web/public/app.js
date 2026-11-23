(() => {
  'use strict';

  const DALLAS_CENTER = { lat: 32.7767, lng: -96.797 };

  const STATUS_META = {
    'en-route': {
      label: 'En Route',
      color: '#059669',
      border: '#047857',
      glyph: '#ffffff',
    },
    delayed: {
      label: 'Delayed',
      color: '#d97706',
      border: '#b45309',
      glyph: '#ffffff',
    },
    idle: {
      label: 'Idle',
      color: '#64748b',
      border: '#475569',
      glyph: '#ffffff',
    },
  };

  /**
   * Simulated Dallas commercial fleet telematics units with noisy GPS breadcrumb traces
   * along real Dallas highway corridors (~120-200m spacing for Roads API snapToRoads).
   */
  const FLEET_VEHICLES = [
    {
      id: 'veh-104',
      unitCode: 'TRK-104',
      shortCode: 'T1',
      driver: 'M. Alvarez',
      vehicleType: 'Class 8 Freight',
      status: 'en-route',
      speedMph: 58,
      nextStop: 'Stemmons Hub #2',
      etaMinutes: 11,
      position: { lat: 32.8058, lng: -96.8351 },
      rawGpsTrace: [
        { lat: 32.7902, lng: -96.8195 },
        { lat: 32.7918, lng: -96.8214 },
        { lat: 32.7931, lng: -96.8227 },
        { lat: 32.7949, lng: -96.8248 },
        { lat: 32.7963, lng: -96.8260 },
        { lat: 32.7981, lng: -96.8279 },
        { lat: 32.7996, lng: -96.8291 },
        { lat: 32.8014, lng: -96.8312 },
        { lat: 32.8029, lng: -96.8325 },
        { lat: 32.8045, lng: -96.8342 },
        { lat: 32.8058, lng: -96.8351 },
      ],
    },
    {
      id: 'veh-208',
      unitCode: 'VAN-208',
      shortCode: 'V2',
      driver: 'K. Brooks',
      vehicleType: 'Sprinter Shuttle',
      status: 'delayed',
      speedMph: 19,
      nextStop: 'West I-30 Crossdock',
      etaMinutes: 26,
      position: { lat: 32.7711, lng: -96.8378 },
      rawGpsTrace: [
        { lat: 32.7704, lng: -96.8142 },
        { lat: 32.7709, lng: -96.8168 },
        { lat: 32.7702, lng: -96.8195 },
        { lat: 32.7710, lng: -96.8223 },
        { lat: 32.7703, lng: -96.8251 },
        { lat: 32.7711, lng: -96.8279 },
        { lat: 32.7705, lng: -96.8306 },
        { lat: 32.7713, lng: -96.8334 },
        { lat: 32.7706, lng: -96.8357 },
        { lat: 32.7711, lng: -96.8378 },
      ],
    },
    {
      id: 'veh-312',
      unitCode: 'SHU-312',
      shortCode: 'S3',
      driver: 'D. Patel',
      vehicleType: 'Box Truck 26ft',
      status: 'en-route',
      speedMph: 49,
      nextStop: 'US-75 North Annex',
      etaMinutes: 14,
      position: { lat: 32.8302, lng: -96.7745 },
      rawGpsTrace: [
        { lat: 32.8115, lng: -96.7834 },
        { lat: 32.8136, lng: -96.7821 },
        { lat: 32.8154, lng: -96.7817 },
        { lat: 32.8177, lng: -96.7803 },
        { lat: 32.8198, lng: -96.7798 },
        { lat: 32.8220, lng: -96.7785 },
        { lat: 32.8241, lng: -96.7779 },
        { lat: 32.8263, lng: -96.7764 },
        { lat: 32.8283, lng: -96.7757 },
        { lat: 32.8302, lng: -96.7745 },
      ],
    },
    {
      id: 'veh-419',
      unitCode: 'TRK-419',
      shortCode: 'T4',
      driver: 'R. Chen',
      vehicleType: 'Class 8 Refrigerated',
      status: 'idle',
      speedMph: 0,
      nextStop: 'Inland Port Staging',
      etaMinutes: 0,
      position: { lat: 32.6819, lng: -96.7715 },
      rawGpsTrace: [
        { lat: 32.6889, lng: -96.7848 },
        { lat: 32.6877, lng: -96.7825 },
        { lat: 32.6869, lng: -96.7804 },
        { lat: 32.6856, lng: -96.7782 },
        { lat: 32.6844, lng: -96.7760 },
        { lat: 32.6831, lng: -96.7738 },
        { lat: 32.6819, lng: -96.7715 },
      ],
    },
    {
      id: 'veh-505',
      unitCode: 'VAN-505',
      shortCode: 'V5',
      driver: 'L. Morales',
      vehicleType: 'Cargo Van EV',
      status: 'delayed',
      speedMph: 22,
      nextStop: 'East Garland Yard',
      etaMinutes: 19,
      position: { lat: 32.8018, lng: -96.7165 },
      rawGpsTrace: [
        { lat: 32.7892, lng: -96.7376 },
        { lat: 32.7908, lng: -96.7351 },
        { lat: 32.7919, lng: -96.7327 },
        { lat: 32.7936, lng: -96.7302 },
        { lat: 32.7948, lng: -96.7278 },
        { lat: 32.7965, lng: -96.7254 },
        { lat: 32.7979, lng: -96.7231 },
        { lat: 32.7994, lng: -96.7206 },
        { lat: 32.8007, lng: -96.7185 },
        { lat: 32.8018, lng: -96.7165 },
      ],
    },
  ];

  // Fallback coordinate waypoints used ONLY when GOOGLE_MAPS_API_KEY is not configured
  const OFFLINE_CORRIDOR_ZONES = [
    {
      id: 'zone-depot',
      name: 'Central Dallas Dispatch Zone (Depot)',
      address: 'Downtown Dallas Corridor (Set GOOGLE_MAPS_API_KEY for live Places)',
      location: { lat: 32.7767, lng: -96.797 },
      isDepot: true,
    },
    {
      id: 'zone-west',
      name: 'West Industrial Corridor Zone',
      address: 'I-30 West Logistics Sector, Dallas, TX',
      location: { lat: 32.7698, lng: -96.8615 },
      isDepot: false,
    },
    {
      id: 'zone-north',
      name: 'North Stemmons Corridor Zone',
      address: 'I-35E Stemmons Freight Sector, Dallas, TX',
      location: { lat: 32.8421, lng: -96.8722 },
      isDepot: false,
    },
    {
      id: 'zone-east',
      name: 'East Freight Corridor Zone',
      address: 'I-30 East / Garland Sector, Dallas, TX',
      location: { lat: 32.8114, lng: -96.6884 },
      isDepot: false,
    },
  ];

  const state = {
    config: null,
    activeFilter: 'all',
    selectedVehicleId: FLEET_VEHICLES[0].id,
    showSnappedTrace: true,
    optimizeWaypoints: true,
    trafficVisible: false,
    hubs: [],
    optimizedStopOrder: null,
    routeSummary: null,
    matrixRows: [],
    roadsMetrics: {
      rawCount: FLEET_VEHICLES[0].rawGpsTrace.length,
      snappedCount: 0,
      segmentCount: 0,
      meanOffsetMeters: null,
      note: '',
    },
    gmaps: {
      map: null,
      infoWindow: null,
      trafficLayer: null,
      AdvancedMarkerElement: null,
      PinElement: null,
      Polyline: null,
      encoding: null,
      spherical: null,
      vehicleMarkers: new Map(),
      hubMarkers: [],
      rawTracePolyline: null,
      snappedTracePolyline: null,
      dispatchPolyline: null,
    },
  };

  const dom = {
    fleetSummaryCounts: document.getElementById('fleet-summary-counts'),
    countAll: document.getElementById('count-all'),
    countEnRoute: document.getElementById('count-en-route'),
    countDelayed: document.getElementById('count-delayed'),
    countIdle: document.getElementById('count-idle'),
    filterButtons: Array.from(document.querySelectorAll('.filter-pill')),
    trafficToggleBtn: document.getElementById('traffic-layer-toggle'),
    autocompleteContainer: document.getElementById('place-autocomplete-container'),
    vehicleList: document.getElementById('fleet-vehicle-list'),
    snapToggle: document.getElementById('snap-to-roads-toggle'),
    roadsActiveVehicle: document.getElementById('roads-active-vehicle'),
    metricRawCount: document.getElementById('metric-raw-count'),
    metricSnappedCount: document.getElementById('metric-snapped-count'),
    metricSegmentCount: document.getElementById('metric-segment-count'),
    metricMeanOffset: document.getElementById('metric-mean-offset'),
    roadsStatusNote: document.getElementById('roads-status-note'),
    optimizeToggle: document.getElementById('optimize-waypoints-toggle'),
    hubSequenceList: document.getElementById('hub-sequence-list'),
    computeDispatchBtn: document.getElementById('calculate-dispatch-route-btn'),
    dispatchSummary: document.getElementById('dispatch-route-summary'),
    dispatchMatrixWrap: document.getElementById('dispatch-matrix-table-wrap'),
    mapContainer: document.getElementById('map-container'),
    mapNoticeBanner: document.getElementById('map-notice-banner'),
  };

  function haversineMeters(a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h =
      sinLat * sinLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function parseDurationSeconds(durationStr) {
    if (typeof durationStr !== 'string') {
      return 0;
    }
    const numeric = Number.parseFloat(durationStr.replace('s', ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatMinutes(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return '--';
    }
    const mins = Math.round(seconds / 60);
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }

  function formatMiles(meters) {
    if (!Number.isFinite(meters) || meters <= 0) {
      return '--';
    }
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }

  function getSelectedVehicle() {
    return (
      FLEET_VEHICLES.find((v) => v.id === state.selectedVehicleId) ||
      FLEET_VEHICLES[0]
    );
  }

  function getFilteredVehicles() {
    if (state.activeFilter === 'all') {
      return FLEET_VEHICLES;
    }
    return FLEET_VEHICLES.filter((v) => v.status === state.activeFilter);
  }

  function setMapNotice(text) {
    if (!text) {
      dom.mapNoticeBanner.textContent = '';
      dom.mapNoticeBanner.classList.add('is-hidden');
      return;
    }
    dom.mapNoticeBanner.textContent = text;
    dom.mapNoticeBanner.classList.remove('is-hidden');
  }

  function renderFleetCounts() {
    const enRoute = FLEET_VEHICLES.filter((v) => v.status === 'en-route').length;
    const delayed = FLEET_VEHICLES.filter((v) => v.status === 'delayed').length;
    const idle = FLEET_VEHICLES.filter((v) => v.status === 'idle').length;
    dom.countAll.textContent = String(FLEET_VEHICLES.length);
    dom.countEnRoute.textContent = String(enRoute);
    dom.countDelayed.textContent = String(delayed);
    dom.countIdle.textContent = String(idle);
    dom.fleetSummaryCounts.textContent = `${FLEET_VEHICLES.length} units active • ${enRoute} En Route • ${delayed} Delayed • ${idle} Idle`;
  }

  function renderVehicleList() {
    const vehicles = getFilteredVehicles();
    const cards = vehicles.map((vehicle) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vehicle-card';
      btn.dataset.vehicleId = vehicle.id;
      if (vehicle.id === state.selectedVehicleId) {
        btn.classList.add('is-selected');
      }

      const top = document.createElement('div');
      top.className = 'vehicle-top';

      const code = document.createElement('span');
      code.className = 'vehicle-code';
      code.textContent = `${vehicle.unitCode} • ${vehicle.driver}`;

      const badge = document.createElement('span');
      badge.className = `status-badge status-${vehicle.status}`;
      badge.textContent = STATUS_META[vehicle.status].label;

      top.append(code, badge);

      const details = document.createElement('div');
      details.className = 'vehicle-details';

      const speedCell = document.createElement('div');
      const speedLabel = document.createTextNode('Speed');
      const speedStrong = document.createElement('strong');
      speedStrong.textContent = `${vehicle.speedMph} mph`;
      speedCell.append(speedLabel, speedStrong);

      const stopCell = document.createElement('div');
      const stopLabel = document.createTextNode('Next Stop');
      const stopStrong = document.createElement('strong');
      stopStrong.textContent = vehicle.nextStop;
      stopCell.append(stopLabel, stopStrong);

      const etaCell = document.createElement('div');
      const etaLabel = document.createTextNode('ETA');
      const etaStrong = document.createElement('strong');
      etaStrong.textContent =
        vehicle.etaMinutes > 0 ? `${vehicle.etaMinutes} min` : 'Staged';
      etaCell.append(etaLabel, etaStrong);

      details.append(speedCell, stopCell, etaCell);
      btn.append(top, details);

      btn.addEventListener('click', () => {
        selectVehicle(vehicle.id);
      });

      return btn;
    });

    if (cards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'panel-meta';
      empty.textContent = 'No vehicles match the selected status filter.';
      dom.vehicleList.replaceChildren(empty);
      return;
    }

    dom.vehicleList.replaceChildren(...cards);
  }

  function renderRoadsMetrics() {
    const vehicle = getSelectedVehicle();
    dom.roadsActiveVehicle.textContent = `Tracing ${vehicle.unitCode} (${vehicle.vehicleType}) — ${vehicle.rawGpsTrace.length} raw breadcrumbs`;
    dom.metricRawCount.textContent = String(state.roadsMetrics.rawCount);
    dom.metricSnappedCount.textContent = String(state.roadsMetrics.snappedCount);
    dom.metricSegmentCount.textContent = String(state.roadsMetrics.segmentCount);
    dom.metricMeanOffset.textContent =
      state.roadsMetrics.meanOffsetMeters !== null
        ? `${state.roadsMetrics.meanOffsetMeters.toFixed(1)} m`
        : '-- m';

    if (state.roadsMetrics.note) {
      dom.roadsStatusNote.textContent = state.roadsMetrics.note;
      dom.roadsStatusNote.classList.remove('is-hidden');
    } else {
      dom.roadsStatusNote.textContent = '';
      dom.roadsStatusNote.classList.add('is-hidden');
    }
  }

  function renderHubSequence() {
    if (state.hubs.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'panel-meta';
      msg.textContent = 'Discovering Dallas logistics hubs…';
      dom.hubSequenceList.replaceChildren(msg);
      return;
    }

    const orderedHubs = getOrderedHubs();
    const items = orderedHubs.map((hub, idx) => {
      const row = document.createElement('div');
      row.className = 'hub-item';

      const badge = document.createElement('span');
      badge.className = idx === 0 ? 'hub-index is-depot' : 'hub-index';
      badge.textContent = idx === 0 ? 'D' : String(idx);

      const info = document.createElement('div');
      info.className = 'hub-info';

      const name = document.createElement('span');
      name.className = 'hub-name';
      name.textContent = hub.name;

      const addr = document.createElement('span');
      addr.className = 'hub-address';
      addr.textContent = hub.address;

      info.append(name, addr);
      row.append(badge, info);
      return row;
    });

    dom.hubSequenceList.replaceChildren(...items);
  }

  function renderDispatchSummaryAndMatrix() {
    if (!state.routeSummary) {
      const card = document.createElement('div');
      card.className = 'metric-card';
      const label = document.createElement('span');
      label.className = 'metric-label';
      label.textContent = 'Dispatch Status';
      const val = document.createElement('strong');
      val.className = 'metric-value';
      val.textContent = state.config?.hasApiKey
        ? 'Ready to compute'
        : 'API key required';
      card.append(label, val);
      dom.dispatchSummary.replaceChildren(card);
    } else {
      const durCard = document.createElement('div');
      durCard.className = 'metric-card';
      const durLabel = document.createElement('span');
      durLabel.className = 'metric-label';
      durLabel.textContent = 'Total Corridor Time';
      const durVal = document.createElement('strong');
      durVal.className = 'metric-value';
      durVal.textContent = state.routeSummary.durationText;
      durCard.append(durLabel, durVal);

      const distCard = document.createElement('div');
      distCard.className = 'metric-card';
      const distLabel = document.createElement('span');
      distLabel.className = 'metric-label';
      distLabel.textContent = 'Corridor Distance';
      const distVal = document.createElement('strong');
      distVal.className = 'metric-value';
      distVal.textContent = state.routeSummary.distanceText;
      distCard.append(distLabel, distVal);

      dom.dispatchSummary.replaceChildren(durCard, distCard);
    }

    if (state.matrixRows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'panel-meta';
      empty.textContent = state.config?.hasApiKey
        ? 'Click "Compute Dispatch Route & Matrix" to evaluate depot-to-hub ETAs.'
        : 'Configure GOOGLE_MAPS_API_KEY in .env to compute live Routes API matrices.';
      dom.dispatchMatrixWrap.replaceChildren(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'matrix-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const heading of ['Stop', 'Hub', 'Depot ETA', 'Distance']) {
      const th = document.createElement('th');
      th.textContent = heading;
      headerRow.append(th);
    }
    thead.append(headerRow);

    const tbody = document.createElement('tbody');
    for (const rowData of state.matrixRows) {
      const tr = document.createElement('tr');

      const stopTd = document.createElement('td');
      stopTd.textContent = rowData.stopBadge;

      const hubTd = document.createElement('td');
      hubTd.textContent = rowData.hubName;

      const etaTd = document.createElement('td');
      etaTd.textContent = rowData.durationText;

      const distTd = document.createElement('td');
      distTd.textContent = rowData.distanceText;

      tr.append(stopTd, hubTd, etaTd, distTd);
      tbody.append(tr);
    }

    table.append(thead, tbody);
    dom.dispatchMatrixWrap.replaceChildren(table);
  }

  function getOrderedHubs() {
    if (state.hubs.length <= 2 || !Array.isArray(state.optimizedStopOrder)) {
      return state.hubs;
    }
    const depot = state.hubs[0];
    const intermediates = state.hubs.slice(1, state.hubs.length - 1);
    const destination = state.hubs[state.hubs.length - 1];
    const reordered = state.optimizedStopOrder
      .filter((idx) => idx >= 0 && idx < intermediates.length)
      .map((idx) => intermediates[idx]);
    if (reordered.length !== intermediates.length) {
      return state.hubs;
    }
    return [depot, ...reordered, destination];
  }

  function buildVehicleInfoContent(vehicle) {
    const card = document.createElement('div');
    card.className = 'info-window-card';

    const title = document.createElement('div');
    title.className = 'info-window-title';
    title.textContent = `${vehicle.unitCode} (${STATUS_META[vehicle.status].label})`;

    const row1 = document.createElement('div');
    row1.className = 'info-window-row';
    row1.textContent = `Driver: ${vehicle.driver} • ${vehicle.vehicleType}`;

    const row2 = document.createElement('div');
    row2.className = 'info-window-row';
    row2.textContent = `Speed: ${vehicle.speedMph} mph • Next: ${vehicle.nextStop}`;

    const row3 = document.createElement('div');
    row3.className = 'info-window-row';
    row3.textContent =
      vehicle.etaMinutes > 0
        ? `Estimated Arrival: ${vehicle.etaMinutes} min`
        : 'Status: Staged at Yard';

    card.append(title, row1, row2, row3);
    return card;
  }

  function syncVehicleMarkers() {
    const { map, AdvancedMarkerElement, PinElement, infoWindow, vehicleMarkers } =
      state.gmaps;
    if (!map || !AdvancedMarkerElement || !PinElement) {
      return;
    }

    const visibleIds = new Set(getFilteredVehicles().map((v) => v.id));

    for (const vehicle of FLEET_VEHICLES) {
      let marker = vehicleMarkers.get(vehicle.id);
      if (!marker) {
        const meta = STATUS_META[vehicle.status];
        const pin = new PinElement({
          background: meta.color,
          borderColor: meta.border,
          glyphColor: meta.glyph,
          glyphText: vehicle.shortCode,
          scale: vehicle.id === state.selectedVehicleId ? 1.15 : 1.0,
        });

        marker = new AdvancedMarkerElement({
          map: visibleIds.has(vehicle.id) ? map : null,
          position: vehicle.position,
          title: `${vehicle.unitCode} - ${meta.label}`,
          gmpClickable: true,
        });
        marker.append(pin);

        marker.addEventListener('gmp-click', () => {
          selectVehicle(vehicle.id);
          if (infoWindow) {
            infoWindow.setContent(buildVehicleInfoContent(vehicle));
            infoWindow.open({ anchor: marker, map });
          }
        });

        vehicleMarkers.set(vehicle.id, marker);
      } else {
        marker.map = visibleIds.has(vehicle.id) ? map : null;
      }
    }
  }

  function syncHubMarkers() {
    const { map, AdvancedMarkerElement, PinElement, infoWindow } = state.gmaps;
    if (!map || !AdvancedMarkerElement || !PinElement) {
      return;
    }

    for (const marker of state.gmaps.hubMarkers) {
      marker.map = null;
    }
    state.gmaps.hubMarkers = [];

    const orderedHubs = getOrderedHubs();
    orderedHubs.forEach((hub, idx) => {
      const isDepot = idx === 0;
      const pin = new PinElement({
        background: isDepot ? '#0f172a' : '#7c3aed',
        borderColor: isDepot ? '#020617' : '#5b21b6',
        glyphColor: '#ffffff',
        glyphText: isDepot ? 'D' : String(idx),
        scale: isDepot ? 1.15 : 1.0,
      });

      const marker = new AdvancedMarkerElement({
        map,
        position: hub.location,
        title: hub.name,
        gmpClickable: true,
      });
      marker.append(pin);

      marker.addEventListener('gmp-click', () => {
        if (!infoWindow) {
          return;
        }
        const card = document.createElement('div');
        card.className = 'info-window-card';

        const title = document.createElement('div');
        title.className = 'info-window-title';
        title.textContent = isDepot ? `Depot: ${hub.name}` : `Stop ${idx}: ${hub.name}`;

        const addr = document.createElement('div');
        addr.className = 'info-window-row';
        addr.textContent = hub.address;

        card.append(title, addr);
        infoWindow.setContent(card);
        infoWindow.open({ anchor: marker, map });
      });

      state.gmaps.hubMarkers.push(marker);
    });
  }

  function drawVehicleTraces(rawPath, snappedPath) {
    const { map, Polyline } = state.gmaps;
    if (!map || !Polyline) {
      return;
    }

    if (state.gmaps.rawTracePolyline) {
      state.gmaps.rawTracePolyline.setMap(null);
      state.gmaps.rawTracePolyline = null;
    }
    if (state.gmaps.snappedTracePolyline) {
      state.gmaps.snappedTracePolyline.setMap(null);
      state.gmaps.snappedTracePolyline = null;
    }

    if (Array.isArray(rawPath) && rawPath.length > 1) {
      state.gmaps.rawTracePolyline = new Polyline({
        map,
        path: rawPath,
        strokeOpacity: 0,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.9,
              strokeColor: '#ef4444',
              scale: 3,
            },
            offset: '0',
            repeat: '12px',
          },
        ],
        zIndex: 20,
      });
    }

    if (state.showSnappedTrace && Array.isArray(snappedPath) && snappedPath.length > 1) {
      state.gmaps.snappedTracePolyline = new Polyline({
        map,
        path: snappedPath,
        strokeColor: '#0891b2',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        zIndex: 25,
      });
    }
  }

  async function inspectSelectedVehicleTrace() {
    const vehicle = getSelectedVehicle();
    const rawPath = vehicle.rawGpsTrace;

    state.roadsMetrics = {
      rawCount: rawPath.length,
      snappedCount: 0,
      segmentCount: 0,
      meanOffsetMeters: null,
      note: '',
    };
    renderRoadsMetrics();

    if (!state.config?.hasApiKey) {
      state.roadsMetrics.note =
        'Configure GOOGLE_MAPS_API_KEY in .env to run Roads API snapToRoads on these breadcrumbs.';
      renderRoadsMetrics();
      return;
    }

    try {
      const resp = await fetch('/api/roads/snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rawPath, interpolate: true }),
      });

      const data = await resp.json();
      if (!data.ok || !Array.isArray(data.snappedPoints) || data.snappedPoints.length === 0) {
        state.roadsMetrics.note =
          data.error ||
          'Roads API unavailable for this key (enable Roads API in Google Cloud Console). Showing raw GPS trace.';
        renderRoadsMetrics();
        drawVehicleTraces(rawPath, []);
        return;
      }

      const snappedPath = data.snappedPoints
        .filter((pt) => pt.location && typeof pt.location.latitude === 'number')
        .map((pt) => ({
          lat: pt.location.latitude,
          lng: pt.location.longitude,
        }));

      const uniquePlaceIds = new Set(
        data.snappedPoints
          .map((pt) => pt.placeId)
          .filter((id) => typeof id === 'string' && id.length > 0)
      );

      let offsetSum = 0;
      let offsetCount = 0;
      for (const pt of data.snappedPoints) {
        if (
          typeof pt.originalIndex === 'number' &&
          pt.originalIndex >= 0 &&
          pt.originalIndex < rawPath.length &&
          pt.location
        ) {
          const orig = rawPath[pt.originalIndex];
          const snapped = {
            lat: pt.location.latitude,
            lng: pt.location.longitude,
          };
          const dist = state.gmaps.spherical
            ? state.gmaps.spherical.computeDistanceBetween(orig, snapped)
            : haversineMeters(orig, snapped);
          offsetSum += dist;
          offsetCount += 1;
        }
      }

      state.roadsMetrics = {
        rawCount: rawPath.length,
        snappedCount: snappedPath.length,
        segmentCount: uniquePlaceIds.size,
        meanOffsetMeters: offsetCount > 0 ? offsetSum / offsetCount : 0,
        note: data.warningMessage || '',
      };
      renderRoadsMetrics();
      drawVehicleTraces(rawPath, snappedPath);
    } catch (_err) {
      state.roadsMetrics.note = 'Network error calling /api/roads/snap.';
      renderRoadsMetrics();
      drawVehicleTraces(rawPath, []);
    }
  }

  async function selectVehicle(vehicleId) {
    state.selectedVehicleId = vehicleId;
    renderVehicleList();
    const vehicle = getSelectedVehicle();
    if (state.gmaps.map) {
      state.gmaps.map.panTo(vehicle.position);
    }
    await inspectSelectedVehicleTrace();
  }

  async function loadLiveDallasHubs() {
    if (!state.config?.hasApiKey) {
      state.hubs = OFFLINE_CORRIDOR_ZONES;
      renderHubSequence();
      renderDispatchSummaryAndMatrix();
      return;
    }

    try {
      const resp = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery: 'distribution center logistics hub Dallas TX',
          locationBias: { center: DALLAS_CENTER, radiusMeters: 25000 },
          maxResultCount: 5,
        }),
      });
      const data = await resp.json();
      if (data.ok && Array.isArray(data.places) && data.places.length >= 2) {
        state.hubs = data.places
          .filter((p) => p.location && typeof p.location.latitude === 'number')
          .map((p, idx) => ({
            id: p.id || `place-${idx}`,
            name: p.displayName?.text || `Dallas Hub ${idx + 1}`,
            address: p.formattedAddress || 'Dallas, TX',
            location: {
              lat: p.location.latitude,
              lng: p.location.longitude,
            },
            isDepot: idx === 0,
          }));
      } else {
        setMapNotice(
          data.error ||
            'Places API returned no Dallas hubs for this key; showing coordinate dispatch zones.'
        );
        state.hubs = OFFLINE_CORRIDOR_ZONES;
      }
    } catch (_err) {
      state.hubs = OFFLINE_CORRIDOR_ZONES;
    }

    renderHubSequence();
    syncHubMarkers();
  }

  async function computeDispatchAndMatrix() {
    if (state.hubs.length < 2) {
      return;
    }

    if (!state.config?.hasApiKey) {
      setMapNotice(
        'Set GOOGLE_MAPS_API_KEY in .env to calculate live multi-stop Routes API corridors and matrices.'
      );
      renderDispatchSummaryAndMatrix();
      return;
    }

    dom.computeDispatchBtn.disabled = true;
    dom.computeDispatchBtn.textContent = 'Computing Corridor & Matrix…';

    try {
      const origin = state.hubs[0].location;
      const destination = state.hubs[state.hubs.length - 1].location;
      const intermediates = state.hubs.slice(1, -1).map((h) => h.location);

      const [routeResp, matrixResp] = await Promise.all([
        fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination,
            intermediates,
            optimizeWaypointOrder: state.optimizeWaypoints,
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
          }),
        }),
        fetch('/api/routes/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origins: [origin],
            destinations: state.hubs.slice(1).map((h) => h.location),
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
          }),
        }),
      ]);

      const routeData = await routeResp.json();
      const matrixData = await matrixResp.json();

      if (routeData.ok && Array.isArray(routeData.routes) && routeData.routes.length > 0) {
        const primary = routeData.routes[0];
        state.optimizedStopOrder = Array.isArray(primary.optimizedIntermediateWaypointIndex)
          ? primary.optimizedIntermediateWaypointIndex
          : null;

        const totalSec = parseDurationSeconds(primary.duration);
        state.routeSummary = {
          durationText: formatMinutes(totalSec),
          distanceText: formatMiles(primary.distanceMeters),
        };

        const encoded = primary.polyline?.encodedPolyline;
        if (encoded && state.gmaps.encoding && state.gmaps.Polyline && state.gmaps.map) {
          const decodedPath = state.gmaps.encoding.decodePath(encoded);
          if (state.gmaps.dispatchPolyline) {
            state.gmaps.dispatchPolyline.setMap(null);
          }
          state.gmaps.dispatchPolyline = new state.gmaps.Polyline({
            map: state.gmaps.map,
            path: decodedPath,
            strokeColor: '#2563eb',
            strokeOpacity: 0.85,
            strokeWeight: 5,
            zIndex: 10,
          });
        }
      } else if (routeData.error) {
        setMapNotice(routeData.error);
      }

      if (matrixData.ok && Array.isArray(matrixData.elements)) {
        const stopHubs = state.hubs.slice(1);
        state.matrixRows = matrixData.elements
          .slice()
          .sort((a, b) => (a.destinationIndex ?? 0) - (b.destinationIndex ?? 0))
          .map((el) => {
            const idx = el.destinationIndex ?? 0;
            const hub = stopHubs[idx];
            const sec = parseDurationSeconds(el.duration);
            return {
              stopBadge: `#${idx + 1}`,
              hubName: hub ? hub.name : `Stop ${idx + 1}`,
              durationText:
                el.condition === 'ROUTE_EXISTS' ? formatMinutes(sec) : 'Unreachable',
              distanceText:
                el.condition === 'ROUTE_EXISTS'
                  ? formatMiles(el.distanceMeters)
                  : '--',
            };
          });
      }
    } catch (_err) {
      setMapNotice('Unable to compute Routes API dispatch corridor right now.');
    } finally {
      dom.computeDispatchBtn.disabled = false;
      dom.computeDispatchBtn.textContent = 'Compute Dispatch Route & Matrix';
      renderHubSequence();
      syncHubMarkers();
      renderDispatchSummaryAndMatrix();
    }
  }

  function loadGoogleMapsBootstrap(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.importLibrary) {
        resolve(window.google.maps);
        return;
      }
      const g = {
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
      };
      const c = 'google';
      const l = 'importLibrary';
      const q = '__ib__';
      const m = document;
      const b = window;
      b[c] = b[c] || {};
      const d = (b[c].maps = b[c].maps || {});
      const r = new Set();
      const e = new URLSearchParams();
      let h;
      const u = () =>
        h ||
        (h = new Promise(async (res, rej) => {
          const a = m.createElement('script');
          e.set('libraries', [...r].join(','));
          for (const k of Object.keys(g)) {
            e.set(k.replace(/[A-Z]/g, (t) => `_${t[0].toLowerCase()}`), g[k]);
          }
          e.set('callback', `${c}.maps.${q}`);
          a.src = `https://maps.${c}apis.com/maps/api/js?${e.toString()}`;
          d[q] = res;
          a.onerror = () => rej(new Error('The Google Maps JavaScript API could not load.'));
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          m.head.append(a);
        }));
      if (!d[l]) {
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
      }
      u()
        .then(() => resolve(window.google.maps))
        .catch(reject);
    });
  }

  async function initMapAndServices() {
    if (!state.config?.hasApiKey) {
      const placeholder = document.createElement('div');
      placeholder.className = 'map-placeholder';

      const heading = document.createElement('h3');
      heading.textContent = 'Google Maps Platform API Key Required for Live Map Tiles';

      const desc = document.createElement('p');
      desc.textContent =
        'Copy .env.example to .env and set GOOGLE_MAPS_API_KEY (a free Maps Demo Key or Cloud Console key) to render the Dallas vector map, Places API hubs, Roads API snapToRoads traces, and Routes API dispatch corridors.';

      placeholder.append(heading, desc);
      dom.mapContainer.replaceChildren(placeholder);

      const fallbackInput = document.createElement('div');
      fallbackInput.className = 'autocomplete-fallback';
      fallbackInput.textContent = 'Hub Search (API key required)';
      dom.autocompleteContainer.replaceChildren(fallbackInput);

      await loadLiveDallasHubs();
      await inspectSelectedVehicleTrace();
      return;
    }

    try {
      await loadGoogleMapsBootstrap(state.config.mapsApiKey);

      await google.maps.importLibrary('core');
      const { Map, InfoWindow, Polyline, TrafficLayer } =
        await google.maps.importLibrary('maps');
      const { AdvancedMarkerElement, PinElement } =
        await google.maps.importLibrary('marker');
      const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
      await google.maps.importLibrary('routes');
      const { encoding, spherical } = await google.maps.importLibrary('geometry');

      const map = new Map(dom.mapContainer, {
        center: state.config.defaultCenter || DALLAS_CENTER,
        zoom: state.config.defaultZoom || 12,
        mapId: state.config.mapId || 'DEMO_MAP_ID',
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        internalUsageAttributionIds: [
          state.config.attributionId || 'gmp_git_agentsamples_v1.0.0',
        ],
      });

      state.gmaps.map = map;
      state.gmaps.infoWindow = new InfoWindow();
      state.gmaps.trafficLayer = new TrafficLayer();
      state.gmaps.AdvancedMarkerElement = AdvancedMarkerElement;
      state.gmaps.PinElement = PinElement;
      state.gmaps.Polyline = Polyline;
      state.gmaps.encoding = encoding;
      state.gmaps.spherical = spherical;

      const autocompleteEl = new PlaceAutocompleteElement({
        includedRegionCodes: ['us'],
        locationBias: {
          center: DALLAS_CENTER,
          radius: 40000,
        },
      });
      autocompleteEl.addEventListener('gmp-select', async (event) => {
        try {
          const prediction = event.placePrediction;
          if (!prediction) {
            return;
          }
          const place = prediction.toPlace();
          await place.fetchFields({
            fields: ['id', 'displayName', 'formattedAddress', 'location'],
          });
          if (!place.location) {
            return;
          }
          const newHub = {
            id: place.id || `custom-${Date.now()}`,
            name: place.displayName || 'Selected Hub',
            address: place.formattedAddress || 'Dallas Metro',
            location: {
              lat: place.location.lat(),
              lng: place.location.lng(),
            },
            isDepot: false,
          };
          state.hubs = [...state.hubs.slice(0, 6), newHub];
          state.optimizedStopOrder = null;
          map.panTo(newHub.location);
          renderHubSequence();
          syncHubMarkers();
          await computeDispatchAndMatrix();
        } catch (_err) {
          setMapNotice('Could not load details for the selected place.');
        }
      });
      autocompleteEl.addEventListener('gmp-error', () => {
        setMapNotice('Place Autocomplete request was rejected for this API key.');
      });
      dom.autocompleteContainer.replaceChildren(autocompleteEl);

      syncVehicleMarkers();
      await loadLiveDallasHubs();
      await inspectSelectedVehicleTrace();
      await computeDispatchAndMatrix();
    } catch (_err) {
      setMapNotice(
        'Google Maps JavaScript API could not initialize. Verify GOOGLE_MAPS_API_KEY and enabled APIs.'
      );
    }
  }

  function bindUiEvents() {
    for (const btn of dom.filterButtons) {
      btn.addEventListener('click', () => {
        state.activeFilter = btn.dataset.status || 'all';
        for (const other of dom.filterButtons) {
          other.classList.toggle('is-active', other === btn);
        }
        renderVehicleList();
        syncVehicleMarkers();
      });
    }

    dom.trafficToggleBtn.addEventListener('click', () => {
      state.trafficVisible = !state.trafficVisible;
      dom.trafficToggleBtn.classList.toggle('is-active', state.trafficVisible);
      dom.trafficToggleBtn.setAttribute('aria-pressed', String(state.trafficVisible));
      if (state.gmaps.trafficLayer && state.gmaps.map) {
        state.gmaps.trafficLayer.setMap(
          state.trafficVisible ? state.gmaps.map : null
        );
      }
    });

    dom.snapToggle.addEventListener('change', () => {
      state.showSnappedTrace = dom.snapToggle.checked;
      inspectSelectedVehicleTrace();
    });

    dom.optimizeToggle.addEventListener('change', () => {
      state.optimizeWaypoints = dom.optimizeToggle.checked;
      if (!state.optimizeWaypoints) {
        state.optimizedStopOrder = null;
      }
      computeDispatchAndMatrix();
    });

    dom.computeDispatchBtn.addEventListener('click', () => {
      computeDispatchAndMatrix();
    });
  }

  async function bootstrapApp() {
    renderFleetCounts();
    renderVehicleList();
    renderRoadsMetrics();
    bindUiEvents();

    try {
      const resp = await fetch('/api/config');
      state.config = await resp.json();
    } catch (_err) {
      state.config = { hasApiKey: false };
    }

    await initMapAndServices();
  }

  document.addEventListener('DOMContentLoaded', bootstrapApp);
})();
