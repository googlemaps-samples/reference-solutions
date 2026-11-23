export function createKitchenMarkerContent(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';
  wrapper.style.background = '#0f766e';
  wrapper.style.color = '#ffffff';
  wrapper.style.padding = '6px 10px';
  wrapper.style.borderRadius = '9999px';
  wrapper.style.fontSize = '12px';
  wrapper.style.fontWeight = '700';
  wrapper.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.28)';
  wrapper.style.border = '2px solid #ffffff';
  wrapper.style.whiteSpace = 'nowrap';

  const badge = document.createElement('span');
  badge.textContent = 'K';
  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.justifyContent = 'center';
  badge.style.width = '18px';
  badge.style.height = '18px';
  badge.style.borderRadius = '9999px';
  badge.style.background = '#14b8a6';
  badge.style.fontSize = '11px';

  const label = document.createElement('span');
  label.textContent = 'Fulton Kitchen';

  wrapper.append(badge, label);
  return wrapper;
}

export function createCustomerMarkerContent(eligible: boolean): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';
  wrapper.style.background = eligible ? '#e11d48' : '#b45309';
  wrapper.style.color = '#ffffff';
  wrapper.style.padding = '6px 10px';
  wrapper.style.borderRadius = '9999px';
  wrapper.style.fontSize = '12px';
  wrapper.style.fontWeight = '700';
  wrapper.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.28)';
  wrapper.style.border = '2px solid #ffffff';
  wrapper.style.whiteSpace = 'nowrap';

  const badge = document.createElement('span');
  badge.textContent = eligible ? 'D' : '!';
  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.justifyContent = 'center';
  badge.style.width = '18px';
  badge.style.height = '18px';
  badge.style.borderRadius = '9999px';
  badge.style.background = eligible ? '#fb7185' : '#f59e0b';
  badge.style.color = '#ffffff';
  badge.style.fontSize = '11px';

  const label = document.createElement('span');
  label.textContent = eligible ? 'Drop-off' : 'Out of Zone';

  wrapper.append(badge, label);
  return wrapper;
}

export function createCourierMarkerContent(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';
  wrapper.style.background = '#1d4ed8';
  wrapper.style.color = '#ffffff';
  wrapper.style.padding = '6px 11px';
  wrapper.style.borderRadius = '9999px';
  wrapper.style.fontSize = '12px';
  wrapper.style.fontWeight = '700';
  wrapper.style.boxShadow = '0 6px 16px rgba(29, 78, 216, 0.45)';
  wrapper.style.border = '2px solid #ffffff';
  wrapper.style.whiteSpace = 'nowrap';

  const dot = document.createElement('span');
  dot.style.display = 'inline-block';
  dot.style.width = '8px';
  dot.style.height = '8px';
  dot.style.borderRadius = '9999px';
  dot.style.background = '#38bdf8';

  const label = document.createElement('span');
  label.textContent = 'Courier';

  wrapper.append(dot, label);
  return wrapper;
}
