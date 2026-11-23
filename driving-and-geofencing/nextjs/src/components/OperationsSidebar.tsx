'use client';

import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  MousePointer,
  Navigation,
  Pentagon,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AUSTIN_CENTER, WORKER_GPS_PRESETS } from '@/data/austinSeed';
import { formatDistance, formatDuration, getPolygonCentroid } from '@/lib/geofence';
import type {
  AuditSite,
  ClockInLogEntry,
  DrawMode,
  GeofenceZone,
  LatLngLiteral,
  OptimizedRouteResult,
} from '@/types/geofencing';

interface OperationsSidebarProps {
  hasApiKey: boolean;
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
  workerCoords: LatLngLiteral;
  workerAddress: string;
  isGeocoding: boolean;
  geocodeError: string | null;
  matchingZones: GeofenceZone[];
  onClockIn: () => void;
  clockInLogs: ClockInLogEntry[];
  allZones: GeofenceZone[];
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  onClearDrawn: () => void;
  onFocusLocation: (coords: LatLngLiteral) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  isSearchingPlaces: boolean;
  placesError: string | null;
  onAddAutocompleteSite: (site: AuditSite) => void;
  orderedStops: AuditSite[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  routeData: OptimizedRouteResult | null;
  isComputingRoute: boolean;
  routeError: string | null;
  onOptimizeRoute: () => void;
}

export function OperationsSidebar({
  hasApiKey,
  selectedPresetId,
  onPresetChange,
  workerCoords,
  workerAddress,
  isGeocoding,
  geocodeError,
  matchingZones,
  onClockIn,
  clockInLogs,
  allZones,
  drawMode,
  onDrawModeChange,
  onClearDrawn,
  onFocusLocation,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  isSearchingPlaces,
  placesError,
  onAddAutocompleteSite,
  orderedStops,
  selectedStopId,
  onSelectStop,
  routeData,
  isComputingRoute,
  routeError,
  onOptimizeRoute,
}: OperationsSidebarProps) {
  const placesLib = useMapsLibrary('places');
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
  const onAddSiteRef = useRef(onAddAutocompleteSite);

  useEffect(() => {
    onAddSiteRef.current = onAddAutocompleteSite;
  }, [onAddAutocompleteSite]);

  useEffect(() => {
    if (!hasApiKey || !placesLib || !autocompleteContainerRef.current) return;

    const host = autocompleteContainerRef.current;
    host.replaceChildren();

    const autocompleteElement = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      locationBias: {
        center: AUSTIN_CENTER,
        radius: 22000,
      },
    });
    autocompleteElement.setAttribute('aria-label', 'Quick-add Austin audit site');

    const handlePlaceSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'primaryTypeDisplayName',
          ],
        });

        if (!place.location) return;
        const newSite: AuditSite = {
          id: place.id || `autocomplete-${Date.now()}`,
          displayName: place.displayName || 'Austin Audit Site',
          formattedAddress: place.formattedAddress || 'Austin, TX',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
          primaryType: place.primaryTypeDisplayName || 'Retail Store',
          source: 'places-autocomplete',
        };
        onAddSiteRef.current(newSite);
      } catch {
        // Ignore transient autocomplete selection cancellation
      }
    };

    autocompleteElement.addEventListener('gmp-select', handlePlaceSelect);
    host.appendChild(autocompleteElement);

    return () => {
      autocompleteElement.removeEventListener('gmp-select', handlePlaceSelect);
      host.replaceChildren();
    };
  }, [hasApiKey, placesLib]);

  const isInsideGeofence = matchingZones.length > 0;
  const activeZone = matchingZones[0] ?? null;
  const latestClockIn = clockInLogs[0] ?? null;

  return (
    <aside className="operations-sidebar" aria-label="Operations Sidebar">
      {/* Card 1: Worker GPS & Geofenced Attendance */}
      <section className="ops-card" aria-labelledby="card-attendance-title">
        <div className="card-header">
          <div className="card-title-row">
            <ShieldCheck size={16} color="#0284c7" />
            <h2 id="card-attendance-title" className="card-title">
              Worker GPS &amp; Geofenced Attendance
            </h2>
          </div>
          <span className="card-subtitle">Geocoding v4</span>
        </div>

        <div>
          <label htmlFor="worker-preset-select" className="field-label">
            Simulated Field Worker GPS Position
          </label>
          <select
            id="worker-preset-select"
            data-testid="worker-preset-select"
            className="select-input"
            value={selectedPresetId}
            onChange={(e) => onPresetChange(e.target.value)}
          >
            {WORKER_GPS_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="status-row">
          <span
            id="geofence-status-badge"
            data-testid="geofence-status-badge"
            className={`status-badge ${isInsideGeofence ? 'inside' : 'outside'}`}
          >
            {isInsideGeofence ? <CheckCircle2 size={13} /> : <Lock size={13} />}
            <span>
              {isInsideGeofence && activeZone
                ? `Inside Geofence: ${activeZone.name}`
                : 'Outside All Geofences'}
            </span>
          </span>

          <span
            id="verified-clockin-badge"
            data-testid="verified-clockin-badge"
            className={`status-badge ${isInsideGeofence ? 'inside' : 'locked'}`}
          >
            {isInsideGeofence ? <ShieldCheck size={13} /> : <Lock size={13} />}
            <span>
              {isInsideGeofence ? 'Verified Clock-In Ready' : 'Clock-In Locked'}
            </span>
          </span>
        </div>

        <div className="address-box">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 2 }}>
            Reverse-Geocoded Street Address
          </div>
          <div id="worker-address" data-testid="worker-address">
            {isGeocoding ? 'Resolving Austin street address...' : workerAddress}
          </div>
          <div className="address-meta">
            GPS: {workerCoords.lat.toFixed(5)}, {workerCoords.lng.toFixed(5)}
          </div>
        </div>

        {geocodeError && <div className="error-banner">{geocodeError}</div>}

        <button
          id="clockin-action-btn"
          data-testid="clockin-action-btn"
          type="button"
          className="btn btn-emerald"
          disabled={!isInsideGeofence}
          onClick={onClockIn}
        >
          {isInsideGeofence ? <CheckCircle2 size={15} /> : <Lock size={15} />}
          <span>
            {isInsideGeofence
              ? `Verified Clock-In (${activeZone?.siteCode ?? 'ZONE'})`
              : 'Move Worker Inside Geofence to Clock In'}
          </span>
        </button>

        {latestClockIn && (
          <div
            style={{
              fontSize: 11.5,
              color: '#065f46',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 7,
              padding: '7px 9px',
            }}
          >
            <strong>Last Verified Check-In:</strong> {latestClockIn.timestamp} at{' '}
            {latestClockIn.zoneName} ({latestClockIn.address})
          </div>
        )}
      </section>

      {/* Card 2: Geofence Zones & Terra Draw Controls */}
      <section className="ops-card" aria-labelledby="card-geofences-title">
        <div className="card-header">
          <div className="card-title-row">
            <Pentagon size={16} color="#7c3aed" />
            <h2 id="card-geofences-title" className="card-title">
              Geofence Zones &amp; Terra Draw
            </h2>
          </div>
          <span className="card-subtitle">{allZones.length} active</span>
        </div>

        <div className="btn-row">
          <button
            type="button"
            className={`btn btn-secondary ${drawMode === 'polygon' ? 'active' : ''}`}
            onClick={() => onDrawModeChange(drawMode === 'polygon' ? 'static' : 'polygon')}
            style={{ flex: 1 }}
          >
            <Pentagon size={13} />
            <span>Draw Polygon</span>
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${drawMode === 'select' ? 'active' : ''}`}
            onClick={() => onDrawModeChange(drawMode === 'select' ? 'static' : 'select')}
            style={{ flex: 1 }}
          >
            <MousePointer size={13} />
            <span>Select / Edit</span>
          </button>
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={onClearDrawn}
            title="Clear supervisor-drawn geofences"
          >
            <Trash2 size={13} />
            <span>Clear Drawn</span>
          </button>
        </div>

        <ul id="geofence-list" data-testid="geofence-list" className="zone-list">
          {allZones.map((zone) => {
            const occupied = matchingZones.some((m) => m.id === zone.id);
            return (
              <li
                key={zone.id}
                className={`zone-item ${occupied ? 'occupied' : ''}`}
                onClick={() => onFocusLocation(getPolygonCentroid(zone.path))}
              >
                <span className="zone-swatch" style={{ backgroundColor: zone.color }} />
                <div className="item-main">
                  <div className="item-title">{zone.name}</div>
                  <div className="item-sub">
                    {zone.siteCode} • {zone.path.length} vertices
                  </div>
                </div>
                <span
                  className={`item-tag ${
                    occupied ? 'occupied' : zone.source === 'supervisor-drawn' ? 'custom' : ''
                  }`}
                >
                  {occupied
                    ? 'Occupied'
                    : zone.source === 'supervisor-drawn'
                      ? 'Drawn'
                      : 'Seeded'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Card 3: Multi-Stop Audit Router */}
      <section className="ops-card" aria-labelledby="card-router-title">
        <div className="card-header">
          <div className="card-title-row">
            <RouteIcon size={16} color="#2563eb" />
            <h2 id="card-router-title" className="card-title">
              Multi-Stop Audit Router
            </h2>
          </div>
          <span className="card-subtitle">Places &amp; Routes v2</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <label htmlFor="site-search-input" className="field-label">
            Discover Austin Audit Sites (Places Text Search)
          </label>
          <div className="search-row">
            <input
              id="site-search-input"
              data-testid="site-search-input"
              type="text"
              className="text-input"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="retail stores in Austin, TX"
            />
            <button
              id="site-search-btn"
              data-testid="site-search-btn"
              type="submit"
              className="btn btn-secondary"
              disabled={isSearchingPlaces || !hasApiKey}
            >
              <Search size={14} />
              <span>{isSearchingPlaces ? '...' : 'Search'}</span>
            </button>
          </div>
        </form>

        <div>
          <span className="field-label">Quick-Add Site (PlaceAutocompleteElement)</span>
          <div ref={autocompleteContainerRef} className="autocomplete-host" />
        </div>

        {placesError && <div className="error-banner">{placesError}</div>}

        <button
          id="optimize-route-btn"
          data-testid="optimize-route-btn"
          type="button"
          className="btn btn-primary"
          disabled={isComputingRoute || orderedStops.length === 0 || !hasApiKey}
          onClick={onOptimizeRoute}
        >
          <Navigation size={14} />
          <span>
            {isComputingRoute
              ? 'Optimizing Audit Route...'
              : 'Optimize Multi-Stop Driving Route'}
          </span>
        </button>

        {routeError && <div className="error-banner">{routeError}</div>}

        <div id="route-summary" data-testid="route-summary" className="route-summary-box">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={14} />
            {orderedStops.length} audit stops
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} />
            {routeData
              ? `${formatDuration(routeData.totalDurationSeconds)} • ${formatDistance(
                  routeData.totalDistanceMeters
                )}`
              : 'Ready to optimize'}
          </span>
        </div>

        <ol id="audit-stops-list" data-testid="audit-stops-list" className="stops-list">
          {orderedStops.map((stop, idx) => {
            const isSelected = stop.id === selectedStopId;
            const leg = routeData?.legs?.[idx];
            return (
              <li
                key={stop.id}
                className={`stop-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectStop(stop.id);
                  onFocusLocation(stop.location);
                }}
              >
                <span className="stop-number">{idx + 1}</span>
                <div className="item-main">
                  <div className="item-title">{stop.displayName}</div>
                  <div className="item-sub">{stop.formattedAddress}</div>
                  {leg && (
                    <div className="item-sub" style={{ color: '#1d4ed8', fontWeight: 600 }}>
                      Leg {idx + 1}: {formatDistance(leg.distanceMeters)} •{' '}
                      {formatDuration(leg.durationSeconds)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </aside>
  );
}
