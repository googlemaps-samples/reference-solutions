import type { LatLngLiteral } from '../types/dispatch';

export async function reverseGeocodeLocation(
  geocodingLib: google.maps.GeocodingLibrary,
  location: LatLngLiteral,
): Promise<string> {
  const geocoder = new geocodingLib.Geocoder();

  try {
    const response = await geocoder.geocode({ location });
    const results = response.results ?? [];
    if (results.length === 0) {
      return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }

    const preferred =
      results.find((r) =>
        r.types.some((t) =>
          ['street_address', 'premise', 'subpremise', 'route'].includes(t),
        ),
      ) ?? results[0];

    return preferred.formatted_address;
  } catch {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
}
