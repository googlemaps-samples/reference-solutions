import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Bus,
  Car,
  Compass,
  GraduationCap,
  Landmark,
  Loader2,
  MapPin,
  Navigation,
  ShoppingCart,
  Star,
  TrainFront,
} from 'lucide-react';
import {
  WORKPLACE_PRESETS,
  formatCurrencyFull,
  formatDistance,
  formatDurationMillis,
} from '../data/properties';
import type {
  AmenityCategory,
  CommuteEstimate,
  LatLngPoint,
  ModeCommuteResult,
  NearbyAmenity,
  PropertyListing,
  WorkplaceLocation,
} from '../types';

interface ListingDetailPanelProps {
  property: PropertyListing | null;
  activeAmenityTab: AmenityCategory;
  onAmenityTabChange: (tab: AmenityCategory) => void;
  onAmenitiesLoaded: (amenities: NearbyAmenity[]) => void;
  onAmenitySelect: (amenity: NearbyAmenity) => void;
  onFocusParcel: (property: PropertyListing) => void;
  commuteEstimate: CommuteEstimate | null;
  onCommuteComputed: (estimate: CommuteEstimate | null) => void;
}

const CATEGORY_CONFIG: Array<{
  key: Exclude<AmenityCategory, 'all'>;
  label: string;
  types: string[];
}> = [
  {
    key: 'schools',
    label: 'School',
    types: ['school', 'primary_school', 'secondary_school', 'university'],
  },
  {
    key: 'groceries',
    label: 'Grocery',
    types: ['supermarket', 'grocery_store'],
  },
  {
    key: 'transit',
    label: 'Transit',
    types: [
      'subway_station',
      'train_station',
      'light_rail_station',
      'transit_station',
      'bus_station',
    ],
  },
];

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const ListingDetailPanel: React.FC<ListingDetailPanelProps> = ({
  property,
  activeAmenityTab,
  onAmenityTabChange,
  onAmenitiesLoaded,
  onAmenitySelect,
  onFocusParcel,
  commuteEstimate,
  onCommuteComputed,
}) => {
  const streetViewLib = useMapsLibrary('streetView');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const geometryLib = useMapsLibrary('geometry');
  const geocodingLib = useMapsLibrary('geocoding');

  // Street View state
  const streetViewHostRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [streetViewStatus, setStreetViewStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    'loading'
  );

  // Nearby Amenities state
  const amenityCacheRef = useRef<Record<string, NearbyAmenity[]>>({});
  const [amenities, setAmenities] = useState<NearbyAmenity[]>([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesError, setAmenitiesError] = useState<string | null>(null);

  // Commute Calculator state
  const [workplaceQuery, setWorkplaceQuery] = useState('Salesforce Tower, San Francisco, CA');
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);

  // Reset panorama instance when host container unmounts
  useEffect(() => {
    return () => {
      panoramaRef.current = null;
    };
  }, []);

  // Load Street View panorama whenever selected property changes
  useEffect(() => {
    if (!property || !streetViewLib || !streetViewHostRef.current) return;

    let cancelled = false;
    setStreetViewStatus('loading');

    const service = new streetViewLib.StreetViewService();
    const target = { lat: property.lat, lng: property.lng };

    const applyPanorama = (panoId: string) => {
      if (!streetViewHostRef.current || cancelled) return;
      if (!panoramaRef.current) {
        panoramaRef.current = new streetViewLib.StreetViewPanorama(streetViewHostRef.current, {
          pano: panoId,
          pov: { heading: 165, pitch: 4 },
          visible: true,
          addressControl: false,
          fullscreenControl: true,
          linksControl: true,
          panControl: true,
          zoomControl: true,
          motionTracking: false,
        });
      } else {
        panoramaRef.current.setPano(panoId);
        panoramaRef.current.setPov({ heading: 165, pitch: 4 });
        panoramaRef.current.setVisible(true);
      }
      setStreetViewStatus('ready');
    };

    service
      .getPanorama({
        location: target,
        radius: 100,
        source: streetViewLib.StreetViewSource.OUTDOOR,
      })
      .then(({ data }) => {
        if (cancelled) return;
        const panoId = data.location?.pano;
        if (panoId) {
          applyPanorama(panoId);
        } else {
          setStreetViewStatus('unavailable');
        }
      })
      .catch(() => {
        // Fallback to wider radius + default source
        service
          .getPanorama({
            location: target,
            radius: 300,
            source: streetViewLib.StreetViewSource.DEFAULT,
          })
          .then(({ data }) => {
            if (cancelled) return;
            const panoId = data.location?.pano;
            if (panoId) {
              applyPanorama(panoId);
            } else {
              setStreetViewStatus('unavailable');
            }
          })
          .catch(() => {
            if (!cancelled) {
              setStreetViewStatus('unavailable');
            }
          });
      });

    return () => {
      cancelled = true;
    };
  }, [property, streetViewLib]);

  // Load live 5km nearby schools, groceries, and transit via Places API (New) Place.searchNearby
  useEffect(() => {
    if (!property || !placesLib) return;

    const cached = amenityCacheRef.current[property.id];
    if (cached) {
      setAmenities(cached);
      setAmenitiesError(null);
      setAmenitiesLoading(false);
      onAmenitiesLoaded(cached);
      return;
    }

    let cancelled = false;
    setAmenitiesLoading(true);
    setAmenitiesError(null);

    const originPoint: LatLngPoint = { lat: property.lat, lng: property.lng };

    const fetchCategory = async (
      category: Exclude<AmenityCategory, 'all'>,
      includedPrimaryTypes: string[]
    ): Promise<NearbyAmenity[]> => {
      const { places } = await placesLib.Place.searchNearby({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'primaryType',
          'rating',
          'userRatingCount',
        ],
        locationRestriction: {
          center: originPoint,
          radius: 5000,
        },
        includedPrimaryTypes,
        maxResultCount: 6,
        rankPreference: placesLib.SearchNearbyRankPreference.DISTANCE,
      });

      return places
        .filter((p) => Boolean(p.location))
        .map((p) => {
          const loc: LatLngPoint = {
            lat: p.location!.lat(),
            lng: p.location!.lng(),
          };
          const distanceMeters = geometryLib
            ? geometryLib.spherical.computeDistanceBetween(
                new google.maps.LatLng(originPoint.lat, originPoint.lng),
                p.location!
              )
            : haversineMeters(originPoint, loc);

          return {
            id: p.id || `${category}-${loc.lat}-${loc.lng}`,
            name: p.displayName || 'Unnamed Place',
            address: p.formattedAddress || 'San Francisco, CA',
            category,
            primaryType: p.primaryType || category,
            location: loc,
            distanceMeters,
            rating: typeof p.rating === 'number' ? p.rating : null,
            userRatingCount:
              typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
          };
        });
    };

    Promise.allSettled(
      CATEGORY_CONFIG.map((cfg) => fetchCategory(cfg.key, cfg.types))
    ).then((results) => {
      if (cancelled) return;

      const merged: NearbyAmenity[] = [];
      const seenIds: Record<string, boolean> = {};
      let successCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount += 1;
          for (const item of result.value) {
            if (!seenIds[item.id]) {
              seenIds[item.id] = true;
              merged.push(item);
            }
          }
        }
      }

      merged.sort((a, b) => a.distanceMeters - b.distanceMeters);

      if (successCount === 0) {
        setAmenitiesError(
          'Unable to load nearby amenities. Verify Places API (New) is enabled for your API key.'
        );
        setAmenities([]);
        onAmenitiesLoaded([]);
      } else {
        amenityCacheRef.current[property.id] = merged;
        setAmenities(merged);
        onAmenitiesLoaded(merged);
      }
      setAmenitiesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [property, placesLib, geometryLib, onAmenitiesLoaded]);

  const filteredAmenities = useMemo(() => {
    if (activeAmenityTab === 'all') return amenities;
    return amenities.filter((item) => item.category === activeAmenityTab);
  }, [amenities, activeAmenityTab]);

  // Helper to resolve workplace text into coordinates via Places API (New) or Geocoder fallback
  const resolveWorkplace = useCallback(
    async (queryText: string): Promise<WorkplaceLocation> => {
      const trimmed = queryText.trim();
      if (!trimmed) {
        throw new Error('Please enter a workplace address or landmark.');
      }

      if (placesLib) {
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: trimmed,
            fields: ['id', 'displayName', 'formattedAddress', 'location'],
            locationBias: {
              north: 37.9,
              south: 37.65,
              east: -122.25,
              west: -122.55,
            },
            maxResultCount: 1,
          });

          const match = places[0];
          if (match?.location) {
            return {
              label: match.displayName || trimmed,
              address: match.formattedAddress || trimmed,
              location: {
                lat: match.location.lat(),
                lng: match.location.lng(),
              },
            };
          }
        } catch {
          // Fall through to Geocoder fallback
        }
      }

      if (geocodingLib) {
        const geocoder = new geocodingLib.Geocoder();
        const response = await geocoder.geocode({
          address: trimmed,
          region: 'US',
        });
        const first = response.results[0];
        if (first?.geometry?.location) {
          return {
            label: trimmed,
            address: first.formatted_address || trimmed,
            location: {
              lat: first.geometry.location.lat(),
              lng: first.geometry.location.lng(),
            },
          };
        }
      }

      throw new Error('Could not locate that workplace address. Try a San Francisco landmark or street.');
    },
    [placesLib, geocodingLib]
  );

  // Helper to run RouteMatrix.computeRouteMatrix for one travel mode with Route.computeRoutes fallback
  const computeMatrixMode = useCallback(
    async (
      origin: LatLngPoint,
      destination: LatLngPoint,
      travelMode: 'DRIVING' | 'TRANSIT'
    ): Promise<ModeCommuteResult> => {
      if (!routesLib) {
        return {
          durationText: 'Unavailable',
          durationSeconds: null,
          distanceText: '',
          distanceMeters: null,
          status: 'unavailable',
        };
      }

      const request: google.maps.routes.ComputeRouteMatrixRequest = {
        origins: [origin],
        destinations: [destination],
        travelMode,
        fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'condition'],
        ...(travelMode === 'DRIVING' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      };

      try {
        const { matrix } = await routesLib.RouteMatrix.computeRouteMatrix(request);
        const item = matrix.rows[0]?.items[0];

        if (item && item.condition === 'ROUTE_EXISTS') {
          const durationMillis = item.durationMillis ?? null;
          const distanceMeters = item.distanceMeters ?? null;
          return {
            durationText:
              item.localizedValues?.duration || formatDurationMillis(durationMillis),
            durationSeconds:
              durationMillis != null ? Math.round(durationMillis / 1000) : null,
            distanceText:
              item.localizedValues?.distance ||
              (distanceMeters != null ? formatDistance(distanceMeters) : ''),
            distanceMeters,
            status: 'ok',
          };
        }
      } catch {
        // Fallback to Route.computeRoutes for single O-D pair if matrix fails
      }

      try {
        const { routes } = await routesLib.Route.computeRoutes({
          origin,
          destination,
          travelMode,
          ...(travelMode === 'DRIVING' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
          fields: ['durationMillis', 'distanceMeters', 'localizedValues'],
        });
        const firstRoute = routes?.[0];
        if (firstRoute) {
          const durationMillis = firstRoute.durationMillis ?? null;
          const distanceMeters = firstRoute.distanceMeters ?? null;
          return {
            durationText:
              firstRoute.localizedValues?.duration ||
              formatDurationMillis(durationMillis),
            durationSeconds:
              durationMillis != null ? Math.round(durationMillis / 1000) : null,
            distanceText:
              firstRoute.localizedValues?.distance ||
              (distanceMeters != null ? formatDistance(distanceMeters) : ''),
            distanceMeters,
            status: 'ok',
          };
        }
      } catch {
        // Mode unavailable
      }

      return {
        durationText: 'No route',
        durationSeconds: null,
        distanceText: '',
        distanceMeters: null,
        status: 'unavailable',
      };
    },
    [routesLib]
  );

  const calculateCommute = useCallback(
    async (targetProperty: PropertyListing, customQuery?: string) => {
      if (!routesLib) {
        setCommuteError('Routes library is still loading. Please try again in a moment.');
        return;
      }

      const queryToUse = customQuery ?? workplaceQuery;
      setCommuteLoading(true);
      setCommuteError(null);

      try {
        const workplace = await resolveWorkplace(queryToUse);
        const origin: LatLngPoint = {
          lat: targetProperty.lat,
          lng: targetProperty.lng,
        };

        const [drivingResult, transitResult, routePathResult] = await Promise.all([
          computeMatrixMode(origin, workplace.location, 'DRIVING'),
          computeMatrixMode(origin, workplace.location, 'TRANSIT'),
          routesLib.Route.computeRoutes({
            origin,
            destination: workplace.location,
            travelMode: 'DRIVING',
            routingPreference: 'TRAFFIC_AWARE',
            fields: ['path'],
          }).catch(() => ({ routes: [] })),
        ]);

        const routePath: LatLngPoint[] =
          routePathResult.routes?.[0]?.path?.map((pt) => ({
            lat: typeof pt.lat === 'function' ? (pt as unknown as google.maps.LatLng).lat() : pt.lat,
            lng: typeof pt.lng === 'function' ? (pt as unknown as google.maps.LatLng).lng() : pt.lng,
          })) ?? [];

        onCommuteComputed({
          propertyId: targetProperty.id,
          workplace,
          driving: drivingResult,
          transit: transitResult,
          routePath,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to calculate commute times right now.';
        setCommuteError(message);
      } finally {
        setCommuteLoading(false);
      }
    },
    [routesLib, workplaceQuery, resolveWorkplace, computeMatrixMode, onCommuteComputed]
  );

  // Automatically refresh commute estimate when switching properties if one was already active
  const lastCalculatedWorkplaceRef = useRef<string | null>(null);
  useEffect(() => {
    if (commuteEstimate?.workplace.address) {
      lastCalculatedWorkplaceRef.current = commuteEstimate.workplace.address;
    }
  }, [commuteEstimate]);

  useEffect(() => {
    if (!property || !routesLib) return;
    if (
      lastCalculatedWorkplaceRef.current &&
      commuteEstimate &&
      commuteEstimate.propertyId !== property.id
    ) {
      void calculateCommute(property, workplaceQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  if (!property) {
    return (
      <section
        id="listing-detail-panel"
        data-testid="listing-detail-panel"
        className="listing-detail-panel empty-detail"
      >
        <p>Select a property to inspect its parcel boundary, Street View, nearby amenities, and commute times.</p>
      </section>
    );
  }

  const pricePerSqFt = Math.round(property.price / property.sqft);
  const activeCommute =
    commuteEstimate && commuteEstimate.propertyId === property.id
      ? commuteEstimate
      : null;

  return (
    <section
      id="listing-detail-panel"
      data-testid="listing-detail-panel"
      className="listing-detail-panel"
      aria-label={`Selected listing details for ${property.address}`}
    >
      {/* Property Header & Cadastral Parcel Metadata */}
      <div className="detail-header-card">
        <div className="detail-header-top">
          <div>
            <span className="detail-eyebrow">
              {property.neighborhood} · {property.propertyType}
            </span>
            <h2 className="detail-price">{formatCurrencyFull(property.price)}</h2>
            <p className="detail-title">{property.title}</p>
            <p className="detail-address">
              <MapPin size={13} /> {property.address}
            </p>
          </div>
          <button
            type="button"
            className="focus-parcel-btn"
            onClick={() => onFocusParcel(property)}
            title="Center map on property parcel polygon"
          >
            <Compass size={14} />
            <span>Focus Lot</span>
          </button>
        </div>

        <p className="detail-summary">{property.summary}</p>

        <div className="parcel-metadata-grid">
          <div className="parcel-stat">
            <span className="parcel-stat-label">Assessor APN</span>
            <strong className="parcel-stat-value">{property.apn}</strong>
          </div>
          <div className="parcel-stat">
            <span className="parcel-stat-label">Zoning</span>
            <strong className="parcel-stat-value">{property.zoning}</strong>
          </div>
          <div className="parcel-stat">
            <span className="parcel-stat-label">Lot Size</span>
            <strong className="parcel-stat-value">
              {property.lotSizeSqFt.toLocaleString()} sqft
            </strong>
          </div>
          <div className="parcel-stat">
            <span className="parcel-stat-label">Price / SqFt</span>
            <strong className="parcel-stat-value">${pricePerSqFt.toLocaleString()}</strong>
          </div>
          <div className="parcel-stat">
            <span className="parcel-stat-label">Year Built</span>
            <strong className="parcel-stat-value">{property.yearBuilt}</strong>
          </div>
          <div className="parcel-stat">
            <span className="parcel-stat-label">Layout</span>
            <strong className="parcel-stat-value">
              {property.beds} bd · {property.baths} ba
            </strong>
          </div>
        </div>
      </div>

      {/* Embedded Street View Neighborhood Preview */}
      <div className="detail-subpanel">
        <div className="subpanel-header">
          <h3 className="subpanel-title">Street View Neighborhood Preview</h3>
          <span className="subpanel-badge">Interactive 360°</span>
        </div>
        <div className="street-view-wrapper">
          <div
            ref={streetViewHostRef}
            id="street-view-container"
            data-testid="street-view-container"
            className="street-view-container"
          />
          {streetViewStatus !== 'ready' && (
            <div className="street-view-overlay">
              {streetViewStatus === 'loading' ? (
                <span>Loading Street View panorama…</span>
              ) : (
                <span>Street View imagery is unavailable for this exact parcel coordinate.</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nearby Schools / Groceries / Transit (5km) via Places API (New) */}
      <div
        id="nearby-amenities-panel"
        data-testid="nearby-amenities-panel"
        className="detail-subpanel"
      >
        <div className="subpanel-header">
          <h3 className="subpanel-title">Nearby Amenities (5 km)</h3>
          <span className="subpanel-badge">Places API (New)</span>
        </div>

        <div className="amenity-tabs" role="tablist" aria-label="Amenity Categories">
          <button
            type="button"
            role="tab"
            id="amenity-tab-all"
            data-testid="amenity-tab-all"
            aria-selected={activeAmenityTab === 'all'}
            className={`amenity-tab ${activeAmenityTab === 'all' ? 'active' : ''}`}
            onClick={() => onAmenityTabChange('all')}
          >
            All ({amenities.length})
          </button>
          <button
            type="button"
            role="tab"
            id="amenity-tab-schools"
            data-testid="amenity-tab-schools"
            aria-selected={activeAmenityTab === 'schools'}
            className={`amenity-tab ${activeAmenityTab === 'schools' ? 'active' : ''}`}
            onClick={() => onAmenityTabChange('schools')}
          >
            <GraduationCap size={13} /> Schools
          </button>
          <button
            type="button"
            role="tab"
            id="amenity-tab-groceries"
            data-testid="amenity-tab-groceries"
            aria-selected={activeAmenityTab === 'groceries'}
            className={`amenity-tab ${activeAmenityTab === 'groceries' ? 'active' : ''}`}
            onClick={() => onAmenityTabChange('groceries')}
          >
            <ShoppingCart size={13} /> Groceries
          </button>
          <button
            type="button"
            role="tab"
            id="amenity-tab-transit"
            data-testid="amenity-tab-transit"
            aria-selected={activeAmenityTab === 'transit'}
            className={`amenity-tab ${activeAmenityTab === 'transit' ? 'active' : ''}`}
            onClick={() => onAmenityTabChange('transit')}
          >
            <TrainFront size={13} /> Transit
          </button>
        </div>

        <div
          id="nearby-amenities-list"
          data-testid="nearby-amenities-list"
          className="nearby-amenities-list"
        >
          {amenitiesLoading ? (
            <div className="panel-loading-row">
              <Loader2 size={15} className="spin" />
              <span>Searching schools, groceries &amp; transit within 5 km…</span>
            </div>
          ) : amenitiesError ? (
            <p className="panel-error-note">{amenitiesError}</p>
          ) : filteredAmenities.length === 0 ? (
            <p className="panel-empty-note">
              No places found in this category within 5 km.
            </p>
          ) : (
            filteredAmenities.slice(0, 10).map((amenity) => (
              <button
                key={amenity.id}
                type="button"
                className="amenity-row"
                onClick={() => onAmenitySelect(amenity)}
              >
                <div className={`amenity-icon-pill ${amenity.category}`}>
                  {amenity.category === 'schools' ? (
                    <GraduationCap size={14} />
                  ) : amenity.category === 'groceries' ? (
                    <ShoppingCart size={14} />
                  ) : (
                    <Bus size={14} />
                  )}
                </div>
                <div className="amenity-row-main">
                  <div className="amenity-name-line">
                    <span className="amenity-name">{amenity.name}</span>
                    <span className="amenity-distance">
                      {formatDistance(amenity.distanceMeters)}
                    </span>
                  </div>
                  <div className="amenity-meta-line">
                    <span className="amenity-address">{amenity.address}</span>
                    {amenity.rating != null && (
                      <span className="amenity-rating">
                        <Star size={11} /> {amenity.rating.toFixed(1)}
                        {amenity.userRatingCount != null
                          ? ` (${amenity.userRatingCount})`
                          : ''}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Workplace Commute Time Calculator via Routes API RouteMatrix */}
      <div
        id="commute-calculator-panel"
        data-testid="commute-calculator-panel"
        className="detail-subpanel"
      >
        <div className="subpanel-header">
          <h3 className="subpanel-title">Workplace Commute Calculator</h3>
          <span className="subpanel-badge">Routes API Matrix</span>
        </div>

        <form
          className="commute-form"
          onSubmit={(e) => {
            e.preventDefault();
            void calculateCommute(property);
          }}
        >
          <div className="commute-input-row">
            <input
              id="workplace-input"
              data-testid="workplace-input"
              type="text"
              className="workplace-input"
              value={workplaceQuery}
              onChange={(e) => setWorkplaceQuery(e.target.value)}
              placeholder="Enter workplace address or hub..."
              aria-label="Workplace destination"
            />
            <button
              id="calculate-commute-btn"
              data-testid="calculate-commute-btn"
              type="submit"
              className="primary-btn"
              disabled={commuteLoading}
            >
              {commuteLoading ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Calculating…</span>
                </>
              ) : (
                <>
                  <Navigation size={14} />
                  <span>Calculate</span>
                </>
              )}
            </button>
          </div>

          <div className="workplace-presets-row">
            {WORKPLACE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setWorkplaceQuery(preset.address);
                  void calculateCommute(property, preset.address);
                }}
              >
                <Landmark size={11} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </form>

        {commuteError && <p className="panel-error-note">{commuteError}</p>}

        <div className="commute-results-grid">
          <div
            id="commute-drive-eta"
            data-testid="commute-drive-eta"
            className="commute-eta-card driving"
          >
            <div className="commute-mode-label">
              <Car size={15} />
              <span>Driving (Traffic-Aware)</span>
            </div>
            <strong className="commute-eta-value">
              {activeCommute ? activeCommute.driving.durationText : 'Click Calculate'}
            </strong>
            <span className="commute-distance-sub">
              {activeCommute?.driving.distanceText || 'Live Routes API ETA'}
            </span>
          </div>

          <div
            id="commute-transit-eta"
            data-testid="commute-transit-eta"
            className="commute-eta-card transit"
          >
            <div className="commute-mode-label">
              <TrainFront size={15} />
              <span>Public Transit</span>
            </div>
            <strong className="commute-eta-value">
              {activeCommute ? activeCommute.transit.durationText : 'Click Calculate'}
            </strong>
            <span className="commute-distance-sub">
              {activeCommute?.transit.distanceText || 'BART / Muni ETA'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
