(() => {
  'use strict';

  const ITEMS_SUBTOTAL = 38.0;
  const TAX_RATE = 0.1025;
  const ANIMATION_DURATION_MS = 24000;

  // Chicago delivery zone centered around Fulton Market Kitchen Hub (~5-6 km polygon)
  const DELIVERY_ZONE_COORDS = [
    { lat: 41.9335, lng: -87.6880 },
    { lat: 41.9330, lng: -87.6305 },
    { lat: 41.9045, lng: -87.6140 },
    { lat: 41.8880, lng: -87.6115 },
    { lat: 41.8620, lng: -87.6175 },
    { lat: 41.8520, lng: -87.6475 },
    { lat: 41.8565, lng: -87.6865 },
    { lat: 41.8950, lng: -87.6980 },
  ];

  const dom = {
    topTrackingPill: document.getElementById('top-tracking-pill'),
    apiKeyBanner: document.getElementById('api-key-banner'),
    apiKeyBannerText: document.getElementById('api-key-banner-text'),
    autocompleteHost: document.getElementById('checkout-address-autocomplete'),
    presetInZoneBtn: document.getElementById('preset-address-in-zone-btn'),
    presetOutOfZoneBtn: document.getElementById('preset-address-out-of-zone-btn'),
    validateBtn: document.getElementById('validate-address-btn'),
    zoneEligibilityBadge: document.getElementById('zone-eligibility-badge'),
    validationPanel: document.getElementById('validation-status-panel'),
    routeTierPill: document.getElementById('route-tier-pill'),
    metricDistance: document.getElementById('metric-distance'),
    metricEta: document.getElementById('metric-eta'),
    metricFee: document.getElementById('metric-fee'),
    placeOrderBtn: document.getElementById('place-order-btn'),
    courierToggleBtn: document.getElementById('courier-simulation-toggle-btn'),
    courierStatusLabel: document.getElementById('courier-status-label'),
    courierPercentLabel: document.getElementById('courier-percent-label'),
    courierProgressTrack: document.getElementById('courier-progress-bar-track'),
    courierProgressFill: document.getElementById('courier-progress-fill'),
    courierInstructionText: document.getElementById('courier-instruction-text'),
    receiptOrderId: document.getElementById('receipt-order-id'),
    receiptDropoffAddress: document.getElementById('receipt-dropoff-address'),
    staticReceiptMapImg: document.getElementById('static-receipt-map-img'),
    receiptSubtotal: document.getElementById('receipt-subtotal'),
    receiptTax: document.getElementById('receipt-tax'),
    receiptDeliveryFee: document.getElementById('receipt-delivery-fee'),
    receiptGrandTotal: document.getElementById('receipt-grand-total'),
    mapCanvas: document.getElementById('live-tracking-map'),
    mapOverlayEta: document.getElementById('map-overlay-eta'),
    mapOverlayZone: document.getElementById('map-overlay-zone'),
  };

  const state = {
    config: null,
    map: null,
    mapsLibs: null,
    deliveryPolygon: null,
    routePolyline: null,
    kitchenMarker: null,
    customerMarker: null,
    courierMarker: null,
    autocompleteEl: null,
    currentAddressText: '',
    currentDropoff: null,
    currentRouteSummary: null,
    currentEncodedPolyline: '',
    currentSteps: [],
    isDeliverable: false,
    orderCounter: 401,
    anim: {
      rafId: null,
      running: false,
      progress: 0,
      lastTimestamp: null,
      pathPoints: [],
      cumulativeDistances: [],
      totalMeters: 0,
    },
  };

  function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
  }

  function setStatusBadge(el, text, variant) {
    el.textContent = text;
    el.className = el.className
      .split(' ')
      .filter((c) => !c.startsWith('badge-') && !c.startsWith('status-'))
      .join(' ');
    const prefix = el.id === 'top-tracking-pill' ? 'status-' : 'badge-';
    el.classList.add(`${prefix}${variant}`);
  }

  function createEl(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  function buildMarkerBadge(label, variantClass, svgPathD) {
    const wrapper = createEl('div', `gmp-marker-badge ${variantClass}`);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.3');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', svgPathD);
    svg.appendChild(path);

    const span = createEl('span', '', label);
    wrapper.appendChild(svg);
    wrapper.appendChild(span);
    return wrapper;
  }

  function loadGoogleMapsBootstrap(apiKey, attributionId) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.importLibrary) {
        resolve();
        return;
      }

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
              a.onerror = () => (h = n(new Error(p + ' could not load.')));
              a.nonce = m.querySelector('script[nonce]')?.nonce || '';
              m.head.append(a);
            }));
        if (d[l]) {
          resolve();
        } else {
          d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
          resolve();
        }
      })({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
        internalUsageAttributionIds: attributionId,
      });
    });
  }

  function renderValidationPanel(validationData, inPolygon, routeSummary) {
    const result = validationData?.result || {};
    const verdict = result.verdict || {};
    const address = result.address || {};
    const geocode = result.geocode || {};
    const metadata = result.metadata || {};
    const uspsData = result.uspsData || {};

    const container = document.createDocumentFragment();

    const titleRow = createEl('div', 'validation-summary-title');
    titleRow.appendChild(createEl('span', '', 'Address Validation Verdict'));
    const isPremiseValidated =
      (verdict.validationGranularity === 'PREMISE' ||
        verdict.validationGranularity === 'SUB_PREMISE') &&
      !verdict.hasUnconfirmedComponents;
    const badgeLabel = verdict.addressComplete
      ? 'Complete Address'
      : isPremiseValidated
        ? 'Premise Validated'
        : 'Review Recommended';
    const deliverableTag = createEl(
      'span',
      `badge ${verdict.addressComplete || isPremiseValidated ? 'badge-success' : 'badge-warning'}`,
      badgeLabel
    );
    titleRow.appendChild(deliverableTag);
    container.appendChild(titleRow);

    const formatted =
      address.formattedAddress ||
      (address.postalAddress?.addressLines || []).join(', ') ||
      state.currentAddressText;
    container.appendChild(createEl('div', 'validation-address-lines', formatted));

    const grid = createEl('div', 'verdict-grid');
    const items = [
      ['Validation', verdict.validationGranularity || 'UNKNOWN'],
      ['Geocode', verdict.geocodeGranularity || 'UNKNOWN'],
      ['Unconfirmed', verdict.hasUnconfirmedComponents ? 'Yes' : 'No'],
      ['Inferred / Replaced', `${verdict.hasInferredComponents ? 'Inf' : 'No'} / ${verdict.hasReplacedComponents ? 'Rep' : 'No'}`],
      ['Zone Polygon', inPolygon ? 'Inside Zone' : 'Outside Zone'],
      [
        '8 km Limit',
        routeSummary
          ? routeSummary.withinDistanceLimit
            ? `${routeSummary.distanceKm} km (OK)`
            : `${routeSummary.distanceKm} km (Over)`
          : 'Pending',
      ],
    ];

    for (const [key, val] of items) {
      const box = createEl('div', 'verdict-item');
      box.appendChild(createEl('span', 'verdict-key', key));
      box.appendChild(createEl('span', 'verdict-val', String(val)));
      grid.appendChild(box);
    }
    container.appendChild(grid);

    const propertyType = metadata.poBox
      ? 'PO Box'
      : metadata.business
        ? 'Commercial / Business'
        : metadata.residential
          ? 'Residential'
          : 'Standard Address';

    const dpv = uspsData.dpvConfirmation || 'N/A';
    const carrier = uspsData.carrierRoute ? ` · Route ${uspsData.carrierRoute}` : '';
    const plusCode = geocode.plusCode?.compoundCode || geocode.plusCode?.globalCode || 'N/A';

    container.appendChild(
      createEl(
        'p',
        'validation-meta-line',
        `Type: ${propertyType} · USPS DPV: ${dpv}${carrier} · Plus Code: ${plusCode}`
      )
    );

    if (geocode.placeId) {
      container.appendChild(
        createEl('p', 'validation-meta-line', `Place ID: ${geocode.placeId}`)
      );
    }

    dom.validationPanel.replaceChildren(container);
  }

  function renderValidationError(message) {
    const errBox = createEl('div', 'panel-placeholder', message);
    dom.validationPanel.replaceChildren(errBox);
  }

  function updateReceiptCard(dropoffAddress, summary, encodedPolyline, destCoord) {
    const tax = Number((ITEMS_SUBTOTAL * TAX_RATE).toFixed(2));
    dom.receiptSubtotal.textContent = formatCurrency(ITEMS_SUBTOTAL);
    dom.receiptTax.textContent = formatCurrency(tax);
    dom.receiptDropoffAddress.textContent = dropoffAddress;

    if (summary && summary.feeDollars !== null && state.isDeliverable) {
      const total = ITEMS_SUBTOTAL + tax + summary.feeDollars;
      dom.receiptDeliveryFee.textContent = formatCurrency(summary.feeDollars);
      dom.receiptGrandTotal.textContent = formatCurrency(total);
    } else {
      dom.receiptDeliveryFee.textContent = 'Ineligible';
      dom.receiptGrandTotal.textContent = '—';
    }

    if (destCoord && state.config?.kitchenHub) {
      const params = new URLSearchParams({
        originLat: String(state.config.kitchenHub.lat),
        originLng: String(state.config.kitchenHub.lng),
        destLat: String(destCoord.lat),
        destLng: String(destCoord.lng),
        size: '600x300',
      });
      if (encodedPolyline) {
        params.set('polyline', encodedPolyline);
      }
      dom.staticReceiptMapImg.src = `/api/maps/static-receipt?${params.toString()}`;
    }
  }

  function stopCourierAnimation() {
    if (state.anim.rafId !== null) {
      cancelAnimationFrame(state.anim.rafId);
      state.anim.rafId = null;
    }
    state.anim.running = false;
    state.anim.lastTimestamp = null;
  }

  function prepareCourierPath(points) {
    const { spherical } = state.mapsLibs;
    const cumulative = [0];
    let total = 0;

    for (let i = 1; i < points.length; i += 1) {
      const segMeters = spherical.computeDistanceBetween(points[i - 1], points[i]);
      total += segMeters;
      cumulative.push(total);
    }

    state.anim.pathPoints = points;
    state.anim.cumulativeDistances = cumulative;
    state.anim.totalMeters = total;
    state.anim.progress = 0;
  }

  function interpolateAlongPath(progress) {
    const { pathPoints, cumulativeDistances, totalMeters } = state.anim;
    if (pathPoints.length === 0) return null;
    if (pathPoints.length === 1 || totalMeters <= 0) return pathPoints[0];

    const clamped = Math.max(0, Math.min(1, progress));
    const targetDist = clamped * totalMeters;

    let segIndex = 0;
    while (
      segIndex < cumulativeDistances.length - 2 &&
      cumulativeDistances[segIndex + 1] < targetDist
    ) {
      segIndex += 1;
    }

    const startDist = cumulativeDistances[segIndex];
    const endDist = cumulativeDistances[segIndex + 1];
    const segLen = endDist - startDist;
    const ratio = segLen > 0 ? (targetDist - startDist) / segLen : 0;

    const p1 = pathPoints[segIndex];
    const p2 = pathPoints[segIndex + 1];
    const lat = p1.lat() + (p2.lat() - p1.lat()) * ratio;
    const lng = p1.lng() + (p2.lng() - p1.lng()) * ratio;
    return { lat, lng };
  }

  function updateCourierProgressUI(progress) {
    const pct = Math.round(progress * 100);
    dom.courierPercentLabel.textContent = `${pct}%`;
    dom.courierProgressFill.style.width = `${pct}%`;
    dom.courierProgressTrack.setAttribute('aria-valuenow', String(pct));

    const summary = state.currentRouteSummary;
    const totalEta = summary?.etaMinutes || 10;
    const remainingMin = Math.max(0, Math.ceil(totalEta * (1 - progress)));

    if (progress >= 1) {
      dom.courierStatusLabel.textContent = 'Delivered at Customer Door';
      dom.courierInstructionText.textContent =
        'Courier arrived at destination. Click Place Order or Replay to run again.';
      dom.courierToggleBtn.textContent = 'Replay Route';
      dom.mapOverlayEta.textContent = 'Order Delivered • Arrived';
      setStatusBadge(dom.topTrackingPill, 'Delivered', 'success');
    } else {
      dom.courierStatusLabel.textContent = state.anim.running
        ? `Courier En Route · ~${remainingMin} min left`
        : `Courier Paused · ~${remainingMin} min left`;
      dom.mapOverlayEta.textContent = `${totalEta} min ETA · ${summary?.distanceKm ?? '—'} km · ${pct}% complete`;

      const steps = state.currentSteps;
      if (steps.length > 0) {
        const stepIdx = Math.min(steps.length - 1, Math.floor(progress * steps.length));
        const instr = steps[stepIdx]?.navigationInstruction?.instructions;
        dom.courierInstructionText.textContent = instr
          ? `Next turn: ${instr}`
          : 'Following optimal Chicago delivery corridor.';
      }
    }
  }

  function animationTick(timestamp) {
    if (!state.anim.running) return;
    if (state.anim.lastTimestamp === null) {
      state.anim.lastTimestamp = timestamp;
    }

    const deltaMs = timestamp - state.anim.lastTimestamp;
    state.anim.lastTimestamp = timestamp;

    state.anim.progress = Math.min(1, state.anim.progress + deltaMs / ANIMATION_DURATION_MS);
    const pos = interpolateAlongPath(state.anim.progress);

    if (pos && state.courierMarker) {
      state.courierMarker.position = pos;
    }
    updateCourierProgressUI(state.anim.progress);

    if (state.anim.progress < 1) {
      state.anim.rafId = requestAnimationFrame(animationTick);
    } else {
      state.anim.running = false;
      state.anim.rafId = null;
      state.anim.lastTimestamp = null;
    }
  }

  function startCourierAnimation(resetProgress = true) {
    if (!state.isDeliverable || state.anim.pathPoints.length === 0) return;

    stopCourierAnimation();
    if (resetProgress || state.anim.progress >= 1) {
      state.anim.progress = 0;
    }

    const startPos = interpolateAlongPath(state.anim.progress);
    if (startPos && state.courierMarker) {
      state.courierMarker.position = startPos;
      state.courierMarker.map = state.map;
    }

    state.anim.running = true;
    dom.courierToggleBtn.disabled = false;
    dom.courierToggleBtn.textContent = 'Pause Courier';
    setStatusBadge(dom.topTrackingPill, 'Live Tracking Active', 'success');
    updateCourierProgressUI(state.anim.progress);
    state.anim.rafId = requestAnimationFrame(animationTick);
  }

  async function runValidationAndRouting(addressInput, fallbackLocation = null) {
    const trimmed = (addressInput || '').trim();
    if (!trimmed) {
      renderValidationError('Please enter or select a Chicago delivery address.');
      return;
    }

    state.currentAddressText = trimmed;
    setStatusBadge(dom.zoneEligibilityBadge, 'Validating…', 'neutral');
    setStatusBadge(dom.topTrackingPill, 'Validating Address…', 'neutral');

    try {
      const validateRes = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: trimmed,
          regionCode: 'US',
          enableUspsCass: true,
        }),
      });

      const validatePayload = await validateRes.json();
      if (!validateRes.ok) {
        throw new Error(validatePayload.error || 'Address validation failed.');
      }

      const geocodeLoc = validatePayload.result?.geocode?.location;
      const destCoord = geocodeLoc
        ? { lat: Number(geocodeLoc.latitude), lng: Number(geocodeLoc.longitude) }
        : fallbackLocation;

      if (!destCoord || !Number.isFinite(destCoord.lat) || !Number.isFinite(destCoord.lng)) {
        throw new Error('Could not resolve coordinates for this address.');
      }

      const formattedAddress =
        validatePayload.result?.address?.formattedAddress || trimmed;
      state.currentDropoff = destCoord;

      const { LatLng, LatLngBounds } = state.mapsLibs.core;
      const { poly, encoding } = state.mapsLibs;
      const destLatLng = new LatLng(destCoord.lat, destCoord.lng);
      const inPolygon = poly.containsLocation(destLatLng, state.deliveryPolygon);

      // Update customer AdvancedMarkerElement
      if (!state.customerMarker) {
        const { AdvancedMarkerElement } = state.mapsLibs.marker;
        const customerBadge = buildMarkerBadge(
          'Drop-Off',
          'gmp-marker-customer',
          'M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10zm0-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
        );
        state.customerMarker = new AdvancedMarkerElement({
          map: state.map,
          position: destCoord,
          title: formattedAddress,
        });
        state.customerMarker.append(customerBadge);
      } else {
        state.customerMarker.position = destCoord;
        state.customerMarker.title = formattedAddress;
        state.customerMarker.map = state.map;
      }

      // Compute Routes API v2 route via BFF
      const routeRes = await fetch('/api/routes/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: {
            lat: state.config.kitchenHub.lat,
            lng: state.config.kitchenHub.lng,
          },
          destination: destCoord,
          travelMode: 'DRIVE',
        }),
      });

      const routePayload = await routeRes.json();
      if (!routeRes.ok) {
        throw new Error(routePayload.error || 'Routes calculation failed.');
      }

      const summary = routePayload.summary;
      const encodedPolyline = routePayload.route?.polyline?.encodedPolyline || '';
      const steps = routePayload.route?.legs?.[0]?.steps || [];

      state.currentRouteSummary = summary;
      state.currentEncodedPolyline = encodedPolyline;
      state.currentSteps = steps;

      const decodedPath = encodedPolyline
        ? encoding.decodePath(encodedPolyline)
        : [
            new LatLng(state.config.kitchenHub.lat, state.config.kitchenHub.lng),
            destLatLng,
          ];

      if (state.routePolyline) {
        state.routePolyline.setPath(decodedPath);
        state.routePolyline.setMap(state.map);
      }

      // Fit map bounds around kitchen, drop-off, and route
      const bounds = new LatLngBounds();
      bounds.extend({ lat: state.config.kitchenHub.lat, lng: state.config.kitchenHub.lng });
      bounds.extend(destCoord);
      for (const pt of decodedPath) {
        bounds.extend(pt);
      }
      state.map.fitBounds(bounds, 70);

      const isDeliverable = Boolean(inPolygon && summary.withinDistanceLimit);
      state.isDeliverable = isDeliverable;

      renderValidationPanel(validatePayload, inPolygon, summary);

      // Update metrics
      dom.metricDistance.textContent = `${summary.distanceKm} km`;
      dom.metricEta.textContent = `${summary.etaMinutes} min`;
      dom.metricFee.textContent =
        isDeliverable && summary.feeDollars !== null
          ? formatCurrency(summary.feeDollars)
          : 'Ineligible';

      if (isDeliverable) {
        setStatusBadge(dom.zoneEligibilityBadge, 'Deliverable', 'success');
        setStatusBadge(dom.routeTierPill, summary.tierLabel, 'success');
        dom.placeOrderBtn.disabled = false;
        dom.mapOverlayZone.textContent = `Inside Chicago Zone · ${summary.distanceKm} km / 8.0 km max`;
        prepareCourierPath(decodedPath);
        updateReceiptCard(formattedAddress, summary, encodedPolyline, destCoord);
        startCourierAnimation(true);
      } else {
        stopCourierAnimation();
        if (state.courierMarker) {
          state.courierMarker.map = null;
        }
        const reason = !inPolygon
          ? 'Outside Delivery Polygon'
          : `Over 8.0 km Limit (${summary.distanceKm} km)`;
        setStatusBadge(dom.zoneEligibilityBadge, 'Out of Zone', 'danger');
        setStatusBadge(dom.routeTierPill, reason, 'danger');
        setStatusBadge(dom.topTrackingPill, 'Outside Delivery Zone', 'danger');
        dom.placeOrderBtn.disabled = true;
        dom.courierToggleBtn.disabled = true;
        dom.courierStatusLabel.textContent = `Cannot dispatch: ${reason}`;
        dom.courierPercentLabel.textContent = '0%';
        dom.courierProgressFill.style.width = '0%';
        dom.courierInstructionText.textContent =
          'Select an address inside the Fulton Market / Downtown Chicago polygon within 8.0 km road distance.';
        dom.mapOverlayEta.textContent = `Ineligible • ${summary.distanceKm} km`;
        dom.mapOverlayZone.textContent = reason;
        updateReceiptCard(formattedAddress, summary, encodedPolyline, destCoord);
      }
    } catch (error) {
      stopCourierAnimation();
      const message = error instanceof Error ? error.message : 'Unexpected validation error.';
      renderValidationError(message);
      setStatusBadge(dom.zoneEligibilityBadge, 'Error', 'danger');
      setStatusBadge(dom.topTrackingPill, 'Check Error', 'danger');
      dom.placeOrderBtn.disabled = true;
    }
  }

  async function initApp() {
    try {
      const configRes = await fetch('/api/config');
      const config = await configRes.json();
      state.config = config;

      if (!config.hasApiKey) {
        dom.apiKeyBanner.classList.remove('hidden');
        setStatusBadge(dom.topTrackingPill, 'API Key Missing', 'warning');
        setStatusBadge(dom.zoneEligibilityBadge, 'Setup Required', 'warning');
        renderValidationError(
          'Add GOOGLE_MAPS_API_KEY to .env and restart the server to run Address Validation and live routing.'
        );
        return;
      }

      await loadGoogleMapsBootstrap(config.apiKey, config.attributionId);

      const [mapsLib, markerLib, placesLib, geometryLib, coreLib] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('geometry'),
        google.maps.importLibrary('core'),
      ]);

      state.mapsLibs = {
        maps: mapsLib,
        marker: markerLib,
        places: placesLib,
        geometry: geometryLib,
        poly: geometryLib.poly,
        encoding: geometryLib.encoding,
        spherical: geometryLib.spherical,
        core: coreLib,
      };

      const { Map, Polygon, Polyline } = mapsLib;
      const { AdvancedMarkerElement } = markerLib;
      const { PlaceAutocompleteElement } = placesLib;

      state.map = new Map(dom.mapCanvas, {
        center: { lat: config.kitchenHub.lat, lng: config.kitchenHub.lng },
        zoom: 13,
        mapId: config.mapId,
        internalUsageAttributionIds: [config.attributionId],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      state.deliveryPolygon = new Polygon({
        paths: DELIVERY_ZONE_COORDS,
        strokeColor: '#0f766e',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: '#14b8a6',
        fillOpacity: 0.14,
        map: state.map,
      });

      state.routePolyline = new Polyline({
        path: [],
        strokeColor: '#2563eb',
        strokeOpacity: 0.92,
        strokeWeight: 5,
        map: state.map,
      });

      // Kitchen Hub AdvancedMarkerElement
      const kitchenBadge = buildMarkerBadge(
        'Kitchen Hub',
        'gmp-marker-kitchen',
        'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'
      );
      state.kitchenMarker = new AdvancedMarkerElement({
        map: state.map,
        position: { lat: config.kitchenHub.lat, lng: config.kitchenHub.lng },
        title: `${config.kitchenHub.name} (${config.kitchenHub.address})`,
      });
      state.kitchenMarker.append(kitchenBadge);

      // Courier AdvancedMarkerElement
      const courierBadge = buildMarkerBadge(
        'Courier',
        'gmp-marker-courier',
        'M5 17h14M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM1 9h11l4 4h5v4H1V9z'
      );
      state.courierMarker = new AdvancedMarkerElement({
        map: null,
        position: { lat: config.kitchenHub.lat, lng: config.kitchenHub.lng },
        title: 'Live Delivery Courier',
        zIndex: 99,
      });
      state.courierMarker.append(courierBadge);

      // Places API (New) PlaceAutocompleteElement
      const autocompleteEl = new PlaceAutocompleteElement({
        includedRegionCodes: ['us'],
        locationBias: {
          center: { lat: config.kitchenHub.lat, lng: config.kitchenHub.lng },
          radius: 25000,
        },
      });
      autocompleteEl.id = 'place-autocomplete-element';
      autocompleteEl.setAttribute('aria-label', 'Delivery address search');
      try {
        autocompleteEl.placeholder = 'Search Chicago delivery address...';
        autocompleteEl.value = config.seedAddress;
      } catch {
        // Ignore if optional properties are read-only in a future browser release
      }
      dom.autocompleteHost.replaceChildren(autocompleteEl);
      state.autocompleteEl = autocompleteEl;
      state.currentAddressText = config.seedAddress;

      autocompleteEl.addEventListener('gmp-select', async (event) => {
        const prediction = event.placePrediction;
        if (!prediction) return;
        const place = prediction.toPlace();
        try {
          await place.fetchFields({
            fields: ['formattedAddress', 'location', 'id', 'displayName'],
          });
          const selected = place.formattedAddress || autocompleteEl.value || state.currentAddressText;
          const fallbackLoc = place.location
            ? { lat: place.location.lat(), lng: place.location.lng() }
            : null;
          await runValidationAndRouting(selected, fallbackLoc);
        } catch (err) {
          renderValidationError(
            err instanceof Error ? err.message : 'Unable to fetch selected place details.'
          );
        }
      });

      autocompleteEl.addEventListener('gmp-error', () => {
        renderValidationError(
          'Places Autocomplete encountered an API error. Check API key permissions for Places API (New).'
        );
      });

      // UI Button Listeners
      dom.validateBtn.addEventListener('click', () => {
        const rawValue =
          (state.autocompleteEl && typeof state.autocompleteEl.value === 'string'
            ? state.autocompleteEl.value.trim()
            : '') || state.currentAddressText;
        runValidationAndRouting(rawValue);
      });

      dom.presetInZoneBtn.addEventListener('click', () => {
        const addr = config.presets.inZone;
        if (state.autocompleteEl) {
          try {
            state.autocompleteEl.value = addr;
          } catch {
            // noop
          }
        }
        runValidationAndRouting(addr);
      });

      dom.presetOutOfZoneBtn.addEventListener('click', () => {
        const addr = config.presets.outOfZone;
        if (state.autocompleteEl) {
          try {
            state.autocompleteEl.value = addr;
          } catch {
            // noop
          }
        }
        runValidationAndRouting(addr);
      });

      dom.placeOrderBtn.addEventListener('click', () => {
        if (!state.isDeliverable) return;
        state.orderCounter += 1;
        dom.receiptOrderId.textContent = `ORD-CHI-${state.orderCounter}`;
        startCourierAnimation(true);
      });

      dom.courierToggleBtn.addEventListener('click', () => {
        if (!state.isDeliverable) return;
        if (state.anim.running) {
          stopCourierAnimation();
          dom.courierToggleBtn.textContent = 'Resume Courier';
          setStatusBadge(dom.topTrackingPill, 'Tracking Paused', 'warning');
          updateCourierProgressUI(state.anim.progress);
        } else {
          startCourierAnimation(state.anim.progress >= 1);
        }
      });

      // Automatically seed initial Chicago address on startup
      await runValidationAndRouting(config.seedAddress);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to initialize tracking application.';
      setStatusBadge(dom.topTrackingPill, 'Initialization Error', 'danger');
      renderValidationError(msg);
    }
  }

  initApp();
})();
