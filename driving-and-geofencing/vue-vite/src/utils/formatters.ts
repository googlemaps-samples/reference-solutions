export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0.0 km';
  }
  const km = meters / 1000;
  const miles = meters / 1609.344;
  return `${km.toFixed(1)} km (${miles.toFixed(1)} mi)`;
}

export function formatDuration(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) {
    return '0 min';
  }
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
