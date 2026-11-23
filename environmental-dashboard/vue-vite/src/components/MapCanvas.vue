<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PHOENIX_SEED } from '../services/environmentalApi'
import {
  loadGeocodingLibrary,
  loadMapsLibrary,
  loadMarkerLibrary,
  loadPlacesLibrary,
} from '../services/mapsLoader'
import type { BaseMapType, SelectedLocation, SolarLatLngBox } from '../types/environment'

const props = defineProps<{
  apiKey: string
  location: SelectedLocation
  mapType: BaseMapType
  aqiOverlayEnabled: boolean
  solarBoundingBox: SolarLatLngBox | null
  resetCounter: number
}>()

const emit = defineEmits<{
  (e: 'location-picked', location: SelectedLocation): void
  (e: 'maps-error', message: string): void
}>()

const mapElementRef = ref<HTMLDivElement | null>(null)
const mapReady = ref(false)

let mapInstance: google.maps.Map | null = null
let markerInstance: google.maps.marker.AdvancedMarkerElement | null = null
let solarRect: google.maps.Rectangle | null = null
let aqiImageMapType: google.maps.ImageMapType | null = null
let geocoderInstance: google.maps.Geocoder | null = null
let mapClickListener: google.maps.MapsEventListener | null = null

function updateMarkerAndCamera(lat: number, lng: number, zoom?: number) {
  if (!mapInstance || !markerInstance) return
  const target = { lat, lng }
  markerInstance.position = target
  mapInstance.panTo(target)
  if (zoom !== undefined) {
    mapInstance.setZoom(zoom)
  }
}

function updateSolarRectangle(box: SolarLatLngBox | null) {
  if (!mapInstance) return
  if (!box) {
    solarRect?.setMap(null)
    return
  }

  const bounds: google.maps.LatLngBoundsLiteral = {
    south: box.sw.latitude,
    west: box.sw.longitude,
    north: box.ne.latitude,
    east: box.ne.longitude,
  }

  if (!solarRect) {
    solarRect = new google.maps.Rectangle({
      map: mapInstance,
      bounds,
      strokeColor: '#d97706',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.18,
      clickable: false,
    })
  } else {
    solarRect.setBounds(bounds)
    solarRect.setMap(mapInstance)
  }
}

function syncAqiOverlay(enabled: boolean) {
  if (!mapInstance) return
  const overlays = mapInstance.overlayMapTypes
  overlays.clear()

  if (enabled && aqiImageMapType) {
    overlays.push(aqiImageMapType)
  }
}

onMounted(async () => {
  if (!props.apiKey || !mapElementRef.value) return

  try {
    const [{ Map, ImageMapType }, { AdvancedMarkerElement, PinElement }, { Place }, { Geocoder }] =
      await Promise.all([
        loadMapsLibrary(props.apiKey),
        loadMarkerLibrary(props.apiKey),
        loadPlacesLibrary(props.apiKey),
        loadGeocodingLibrary(props.apiKey),
      ])

    geocoderInstance = new Geocoder()

    mapInstance = new Map(mapElementRef.value, {
      center: { lat: props.location.lat, lng: props.location.lng },
      zoom: PHOENIX_SEED.zoom,
      mapId: 'DEMO_MAP_ID',
      mapTypeId: props.mapType,
      clickableIcons: false,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: false,
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    })

    const pin = new PinElement({
      background: '#0f766e',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: '★',
    })

    markerInstance = new AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: props.location.lat, lng: props.location.lng },
      title: props.location.name,
      content: pin,
    })

    aqiImageMapType = new ImageMapType({
      getTileUrl: (coord, zoom) => {
        if (!coord || zoom < 0 || zoom > 16) return ''
        return `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${zoom}/${coord.x}/${coord.y}?key=${encodeURIComponent(props.apiKey)}`
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 16,
      minZoom: 0,
      opacity: 0.65,
      name: 'US AQI Heatmap',
    })

    syncAqiOverlay(props.aqiOverlayEnabled)
    updateSolarRectangle(props.solarBoundingBox)

    mapClickListener = mapInstance.addListener(
      'click',
      async (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()

        let resolvedName = 'Selected Building / Point'
        let resolvedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        let placeId: string | undefined

        if (geocoderInstance) {
          try {
            const geocodeResponse = await geocoderInstance.geocode({
              location: { lat, lng },
            })
            const first = geocodeResponse.results?.[0]
            if (first) {
              resolvedAddress = first.formatted_address
              resolvedName =
                first.address_components?.[0]?.short_name &&
                first.address_components?.[1]?.short_name
                  ? `${first.address_components[0].short_name} ${first.address_components[1].short_name}`
                  : first.formatted_address.split(',')[0] || resolvedName
              placeId = first.place_id
            }
          } catch {
            // Fall back cleanly to clicked coordinates
          }
        }

        emit('location-picked', {
          name: resolvedName,
          formattedAddress: resolvedAddress,
          lat,
          lng,
          placeId,
          source: 'map-click',
        })
      },
    )

    mapReady.value = true

    // Resolve initial Phoenix City Hall seed dynamically via Places API (New)
    let resolvedSeed: SelectedLocation = {
      name: PHOENIX_SEED.query,
      formattedAddress: `${PHOENIX_SEED.lat.toFixed(4)}, ${PHOENIX_SEED.lng.toFixed(4)}`,
      lat: PHOENIX_SEED.lat,
      lng: PHOENIX_SEED.lng,
      source: 'seed',
    }

    try {
      const { places } = await Place.searchByText({
        textQuery: PHOENIX_SEED.query,
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        maxResultCount: 1,
      })

      const seedPlace = places?.[0]
      if (seedPlace?.location) {
        resolvedSeed = {
          name: seedPlace.displayName ?? PHOENIX_SEED.query,
          formattedAddress:
            seedPlace.formattedAddress ??
            `${seedPlace.location.lat().toFixed(5)}, ${seedPlace.location.lng().toFixed(5)}`,
          lat: seedPlace.location.lat(),
          lng: seedPlace.location.lng(),
          placeId: seedPlace.id,
          source: 'seed',
        }
      }
    } catch {
      // Keep default Phoenix coordinates if Places Text Search is unavailable
    }

    emit('location-picked', resolvedSeed)
  } catch (err) {
    emit(
      'maps-error',
      err instanceof Error ? err.message : 'Unable to initialize Google Maps JavaScript API.',
    )
    emit('location-picked', {
      name: PHOENIX_SEED.query,
      formattedAddress: `${PHOENIX_SEED.lat.toFixed(4)}, ${PHOENIX_SEED.lng.toFixed(4)}`,
      lat: PHOENIX_SEED.lat,
      lng: PHOENIX_SEED.lng,
      source: 'seed',
    })
  }
})

watch(
  () => [props.location.lat, props.location.lng] as const,
  ([lat, lng]) => {
    updateMarkerAndCamera(lat, lng)
  },
)

watch(
  () => props.resetCounter,
  () => {
    updateMarkerAndCamera(PHOENIX_SEED.lat, PHOENIX_SEED.lng, PHOENIX_SEED.zoom)
  },
)

watch(
  () => props.mapType,
  (nextType) => {
    mapInstance?.setMapTypeId(nextType)
  },
)

watch(
  () => props.aqiOverlayEnabled,
  (enabled) => {
    syncAqiOverlay(enabled)
  },
)

watch(
  () => props.solarBoundingBox,
  (box) => {
    updateSolarRectangle(box)
  },
)

onBeforeUnmount(() => {
  mapClickListener?.remove()
  solarRect?.setMap(null)
  mapInstance?.overlayMapTypes.clear()
})
</script>

<template>
  <div class="map-stage">
    <div ref="mapElementRef" data-testid="map-container" class="map-container"></div>

    <div v-if="!apiKey" class="map-no-key-overlay">
      <div class="map-no-key-card">
        <h2>Google Maps API Key Required</h2>
        <p>
          Create <code>.env.local</code> in this project folder and set
          <code>VITE_GOOGLE_MAPS_API_KEY</code> to unlock the interactive 2D map, Places
          Autocomplete, and live Weather, Air Quality, Pollen, and Solar telemetry.
        </p>
        <a
          href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
          target="_blank"
          rel="noopener noreferrer"
          class="demo-key-link"
        >
          Get a Free Maps Demo Key
        </a>
      </div>
    </div>

    <div v-if="mapReady" class="map-legend-pill">
      <span>Click any building rooftop to inspect solar &amp; hyperlocal conditions</span>
      <span v-if="aqiOverlayEnabled" class="legend-aqi-tag">US AQI Overlay Active</span>
    </div>
  </div>
</template>
