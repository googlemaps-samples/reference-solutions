<script lang="ts">
  import { onMount } from 'svelte';
  import { ensureMapsLoaderConfigured, importLibrary } from '$lib/maps/loader';
  import type {
    ActiveLocation,
    BaseMapType,
    SolarBuildingInsightsResponse
  } from '$lib/types/environmental';

  interface Props {
    activeLocation: ActiveLocation;
    showAqiLayer: boolean;
    mapType: BaseMapType;
    solarData: SolarBuildingInsightsResponse | null;
    onSelectLocation: (loc: ActiveLocation) => void;
  }

  let { activeLocation, showAqiLayer, mapType, solarData, onSelectLocation }: Props = $props();

  let mapElement: HTMLDivElement | undefined = $state();
  let mapReady = $state(false);
  let hasApiKey = $state(true);

  let mapInstance: google.maps.Map | null = null;
  let markerInstance: google.maps.marker.AdvancedMarkerElement | null = null;
  let pinElement: google.maps.marker.PinElement | null = null;
  let geocoderInstance: google.maps.Geocoder | null = null;
  let buildingBoxRect: google.maps.Rectangle | null = null;
  let aqiOverlay: google.maps.ImageMapType | null = null;
  let mapsLibRef: google.maps.MapsLibrary | null = null;

  onMount(() => {
    let clickListener: google.maps.MapsEventListener | null = null;

    (async () => {
      const configured = ensureMapsLoaderConfigured();
      if (!configured) {
        hasApiKey = false;
        return;
      }

      try {
        const [mapsLib, markerLib, geocodingLib] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('geocoding')
        ]);

        if (!mapElement) return;
        mapsLibRef = mapsLib;

        const map = new mapsLib.Map(mapElement, {
          center: { lat: activeLocation.lat, lng: activeLocation.lng },
          zoom: 16,
          mapId: 'DEMO_MAP_ID',
          mapTypeId: mapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
        });
        mapInstance = map;

        const pin = new markerLib.PinElement({
          background: '#059669',
          borderColor: '#064e3b',
          glyphColor: '#ffffff',
          glyphText: '★'
        });
        pinElement = pin;

        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat: activeLocation.lat, lng: activeLocation.lng },
          title: activeLocation.name
        });
        marker.append(pin);
        markerInstance = marker;

        geocoderInstance = new geocodingLib.Geocoder();

        const overlay = new mapsLib.ImageMapType({
          name: 'US AQI',
          alt: 'US Air Quality Index Heatmap',
          tileSize: new google.maps.Size(256, 256),
          minZoom: 0,
          maxZoom: 16,
          opacity: 0.62,
          getTileUrl: (coord: google.maps.Point | null, zoom: number): string => {
            if (!coord || zoom < 0 || zoom > 16) return '';
            const tileRange = 1 << zoom;
            if (coord.y < 0 || coord.y >= tileRange) return '';
            const x = ((coord.x % tileRange) + tileRange) % tileRange;
            return `/api/air-quality/tiles?mapType=US_AQI&zoom=${zoom}&x=${x}&y=${coord.y}`;
          }
        });
        aqiOverlay = overlay;

        if (showAqiLayer) {
          map.overlayMapTypes.push(overlay);
        }

        clickListener = map.addListener('click', async (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          let resolvedName = 'Selected Building / Point';
          let resolvedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          let placeId: string | undefined;

          if (geocoderInstance) {
            try {
              const response = await geocoderInstance.geocode({ location: { lat, lng } });
              const first = response.results?.[0];
              if (first) {
                resolvedAddress = first.formatted_address || resolvedAddress;
                resolvedName =
                  first.address_components?.[0]?.short_name &&
                  first.address_components?.[1]?.short_name
                    ? `${first.address_components[0].short_name} ${first.address_components[1].short_name}`
                    : first.formatted_address?.split(',')[0] || resolvedName;
                placeId = first.place_id;
              }
            } catch {
              // Fallback gracefully to raw coordinates if Geocoder rate-limits or fails
            }
          }

          onSelectLocation({
            name: resolvedName,
            address: resolvedAddress,
            lat,
            lng,
            placeId,
            source: 'map-click'
          });
        });

        mapReady = true;
      } catch {
        hasApiKey = false;
      }
    })();

    return () => {
      clickListener?.remove();
      buildingBoxRect?.setMap(null);
      if (markerInstance) {
        markerInstance.map = null;
      }
    };
  });

  // Sync activeLocation marker & camera
  $effect(() => {
    const loc = activeLocation;
    if (!mapReady || !mapInstance || !markerInstance) return;

    const pos = { lat: loc.lat, lng: loc.lng };
    markerInstance.position = pos;
    markerInstance.title = loc.name;
    mapInstance.panTo(pos);
  });

  // Sync base mapTypeId
  $effect(() => {
    const currentType = mapType;
    if (!mapReady || !mapInstance) return;
    mapInstance.setMapTypeId(currentType);
  });

  // Sync US_AQI ImageMapType overlay
  $effect(() => {
    const enabled = showAqiLayer;
    if (!mapReady || !mapInstance || !aqiOverlay) return;

    const overlays = mapInstance.overlayMapTypes;
    let existingIndex = -1;
    for (let i = 0; i < overlays.getLength(); i += 1) {
      if (overlays.getAt(i) === aqiOverlay) {
        existingIndex = i;
        break;
      }
    }

    if (enabled && existingIndex === -1) {
      overlays.push(aqiOverlay);
    } else if (!enabled && existingIndex !== -1) {
      overlays.removeAt(existingIndex);
    }
  });

  // Sync Solar building boundingBox rectangle
  $effect(() => {
    const solar = solarData;
    if (!mapReady || !mapInstance || !mapsLibRef) return;

    if (buildingBoxRect) {
      buildingBoxRect.setMap(null);
      buildingBoxRect = null;
    }

    if (solar?.boundingBox?.sw && solar?.boundingBox?.ne && !solar.nonCoverage) {
      buildingBoxRect = new google.maps.Rectangle({
        map: mapInstance,
        bounds: {
          south: solar.boundingBox.sw.latitude,
          west: solar.boundingBox.sw.longitude,
          north: solar.boundingBox.ne.latitude,
          east: solar.boundingBox.ne.longitude
        },
        strokeColor: '#f59e0b',
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
        fillColor: '#fbbf24',
        fillOpacity: 0.2,
        clickable: false
      });
    }
  });
</script>

<div class="map-stage">
  <div class="map-canvas" bind:this={mapElement} data-testid="map-container"></div>

  {#if mapReady}
    <div class="map-hint-pill">
      Click any building roof to inspect weather, air quality, pollen &amp; solar potential
    </div>
  {/if}

  {#if showAqiLayer && mapReady}
    <div class="map-legend">
      <div class="map-legend-title">US Air Quality Index (AQI) Heatmap</div>
      <div class="aqi-scale">
        <span class="aqi-swatch" style="background: #00e400;">Good</span>
        <span class="aqi-swatch" style="background: #ffff00;">Moderate</span>
        <span class="aqi-swatch" style="background: #ff7e00;">USG</span>
        <span class="aqi-swatch" style="background: #ff0000; color: #fff;">Unhealthy</span>
        <span class="aqi-swatch" style="background: #8f3f97; color: #fff;">Very Unhealthy</span>
      </div>
    </div>
  {/if}

  {#if !hasApiKey}
    <div class="map-missing-key">
      <div class="map-missing-key-card">
        <h2 style="margin: 0 0 8px; font-size: 1.1rem;">Google Maps API Key Required</h2>
        <p style="margin: 0 0 12px; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.45;">
          Add <code class="mono">PUBLIC_GOOGLE_MAPS_API_KEY</code> to a <code class="mono">.env</code>
          file in this workspace and restart the server to render the interactive Google Map and
          live environmental layers.
        </p>
        <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
          Need a free prototyping key? Visit
          <a
            href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps Demo Key
          </a>
        </p>
      </div>
    </div>
  {/if}
</div>
