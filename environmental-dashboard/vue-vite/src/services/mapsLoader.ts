import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let configured = false

export function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
}

export function ensureMapsOptions(apiKey: string): void {
  if (configured || !apiKey) return
  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
    mapIds: ['DEMO_MAP_ID'],
  })
  configured = true
}

export async function loadMapsLibrary(apiKey: string) {
  ensureMapsOptions(apiKey)
  return importLibrary('maps')
}

export async function loadMarkerLibrary(apiKey: string) {
  ensureMapsOptions(apiKey)
  return importLibrary('marker')
}

export async function loadPlacesLibrary(apiKey: string) {
  ensureMapsOptions(apiKey)
  return importLibrary('places')
}

export async function loadGeocodingLibrary(apiKey: string) {
  ensureMapsOptions(apiKey)
  return importLibrary('geocoding')
}
