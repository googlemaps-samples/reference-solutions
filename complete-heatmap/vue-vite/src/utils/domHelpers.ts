import type { FloodZone, IncidentPoint, ShelterPlace } from '../types/hazard';

export function buildZoneInfoContent(zone: FloodZone): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText =
    'max-width:260px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;padding:2px;';

  const badge = document.createElement('span');
  badge.textContent = `${zone.severity.toUpperCase()} FLOOD ZONE`;
  badge.style.cssText = `display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.05em;padding:2px 6px;border-radius:4px;color:#fff;background:${zone.strokeColor};margin-bottom:6px;`;
  container.appendChild(badge);

  const title = document.createElement('div');
  title.textContent = zone.name;
  title.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:4px;';
  container.appendChild(title);

  const depth = document.createElement('div');
  depth.textContent = `Est. Standing Water: ~${zone.estimatedDepthCm} cm`;
  depth.style.cssText = 'font-size:12px;font-weight:600;color:#b91c1c;margin-bottom:4px;';
  container.appendChild(depth);

  const advisory = document.createElement('div');
  advisory.textContent = zone.advisory;
  advisory.style.cssText = 'font-size:12px;line-height:1.4;color:#334155;';
  container.appendChild(advisory);

  return container;
}

export function buildShelterInfoContent(
  shelter: ShelterPlace,
  onRouteClick: (shelter: ShelterPlace) => void,
): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText =
    'max-width:270px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;padding:2px;';

  const badge = document.createElement('span');
  badge.textContent = 'EMERGENCY SHELTER / CARE';
  badge.style.cssText =
    'display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.05em;padding:2px 6px;border-radius:4px;color:#fff;background:#047857;margin-bottom:6px;';
  container.appendChild(badge);

  const title = document.createElement('div');
  title.textContent = shelter.displayName;
  title.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:4px;';
  container.appendChild(title);

  const addr = document.createElement('div');
  addr.textContent = shelter.formattedAddress;
  addr.style.cssText = 'font-size:12px;line-height:1.35;color:#475569;margin-bottom:6px;';
  container.appendChild(addr);

  if (shelter.rating !== null) {
    const ratingRow = document.createElement('div');
    const countText =
      shelter.userRatingCount !== null ? ` (${shelter.userRatingCount} reviews)` : '';
    ratingRow.textContent = `Rating: ${shelter.rating.toFixed(1)} / 5${countText}`;
    ratingRow.style.cssText = 'font-size:12px;font-weight:600;color:#0f172a;margin-bottom:8px;';
    container.appendChild(ratingRow);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Route Safe Evacuation Here';
  btn.style.cssText =
    'width:100%;padding:7px 10px;border:none;border-radius:6px;background:#0284c7;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
  btn.addEventListener('click', () => onRouteClick(shelter));
  container.appendChild(btn);

  return container;
}

export function buildIncidentInfoContent(incident: IncidentPoint): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText =
    'max-width:240px;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;padding:2px;';

  const badge = document.createElement('span');
  badge.textContent = incident.isUserSubmitted ? 'RESIDENT REPORT' : 'CIVIC TELEMETRY';
  badge.style.cssText =
    'display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.05em;padding:2px 6px;border-radius:4px;color:#fff;background:#b91c1c;margin-bottom:6px;';
  container.appendChild(badge);

  const title = document.createElement('div');
  title.textContent = incident.hazardType;
  title.style.cssText = 'font-size:14px;font-weight:700;margin-bottom:4px;';
  container.appendChild(title);

  if (incident.address) {
    const addr = document.createElement('div');
    addr.textContent = incident.address;
    addr.style.cssText = 'font-size:12px;color:#475569;margin-bottom:4px;';
    container.appendChild(addr);
  }

  const meta = document.createElement('div');
  const elevText =
    incident.elevationMeters !== null && incident.elevationMeters !== undefined
      ? ` • Elev: ${incident.elevationMeters.toFixed(1)}m`
      : '';
  meta.textContent = `Severity Weight: ${incident.weight}/10${elevText}`;
  meta.style.cssText = 'font-size:12px;color:#334155;';
  container.appendChild(meta);

  return container;
}
