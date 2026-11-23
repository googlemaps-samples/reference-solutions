import type { OpenNowResult } from '$lib/types/storefront';

/**
 * Computes whether a venue is currently open using `regularOpeningHours.periods`
 * and `utcOffsetMinutes` so the app remains 100% compatible with the Maps JS API
 * `weekly` channel (without invoking beta-only `Place.prototype.isOpen()`).
 */
export function computeOpenNowStatus(
	regularOpeningHours: google.maps.places.OpeningHours | null | undefined,
	utcOffsetMinutes: number | null | undefined,
	now: Date = new Date()
): OpenNowResult {
	const periods = regularOpeningHours?.periods;
	if (!periods || periods.length === 0) {
		return {
			isOpen: null,
			label: 'Hours unavailable',
			detail: 'Check clinic hours'
		};
	}

	// Open 24/7 convention: single period with day 0, hour 0, minute 0 and no close point.
	if (periods.length === 1 && periods[0].open && !periods[0].close) {
		return {
			isOpen: true,
			label: 'Open 24 Hours',
			detail: 'Open daily'
		};
	}

	// Default to San Francisco Pacific offset if utcOffsetMinutes is absent (-480 or -420)
	const offsetMinutes =
		typeof utcOffsetMinutes === 'number' && Number.isFinite(utcOffsetMinutes)
			? utcOffsetMinutes
			: -480;

	const shiftedMs = now.getTime() + offsetMinutes * 60_000;
	const localNow = new Date(shiftedMs);
	const currentDay = localNow.getUTCDay();
	const currentMinutesOfWeek =
		currentDay * 1440 + localNow.getUTCHours() * 60 + localNow.getUTCMinutes();

	const WEEK_MINUTES = 7 * 1440;

	for (const period of periods) {
		if (!period.open) continue;
		const openMin =
			period.open.day * 1440 + period.open.hour * 60 + period.open.minute;

		if (!period.close) {
			return {
				isOpen: true,
				label: 'Open Now',
				detail: 'Currently accepting visits'
			};
		}

		let closeMin =
			period.close.day * 1440 + period.close.hour * 60 + period.close.minute;
		if (closeMin <= openMin) {
			closeMin += WEEK_MINUTES;
		}

		const candidateNow =
			currentMinutesOfWeek < openMin
				? currentMinutesOfWeek + WEEK_MINUTES
				: currentMinutesOfWeek;

		if (candidateNow >= openMin && candidateNow < closeMin) {
			const closeHour = period.close.hour;
			const closeMinute = period.close.minute;
			return {
				isOpen: true,
				label: 'Open Now',
				detail: `Closes at ${formatTime12h(closeHour, closeMinute)}`
			};
		}
	}

	// Find next opening time
	let nextDelta = Number.POSITIVE_INFINITY;
	let nextOpenText = '';
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	for (const period of periods) {
		if (!period.open) continue;
		const openMin =
			period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
		let delta = openMin - currentMinutesOfWeek;
		if (delta <= 0) delta += WEEK_MINUTES;
		if (delta < nextDelta) {
			nextDelta = delta;
			const dayLabel =
				period.open.day === currentDay ? 'today' : dayNames[period.open.day];
			nextOpenText = `Opens ${dayLabel} at ${formatTime12h(period.open.hour, period.open.minute)}`;
		}
	}

	return {
		isOpen: false,
		label: 'Closed Now',
		detail: nextOpenText || 'See weekly hours'
	};
}

function formatTime12h(hour24: number, minute: number): string {
	const suffix = hour24 >= 12 ? 'PM' : 'AM';
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	const minStr = minute.toString().padStart(2, '0');
	return `${hour12}:${minStr} ${suffix}`;
}

export function formatDurationFallback(durationMillis: number | null | undefined): string {
	if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis)) {
		return '—';
	}
	const totalMinutes = Math.max(1, Math.round(durationMillis / 60_000));
	if (totalMinutes < 60) {
		return `${totalMinutes} min`;
	}
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistanceFallback(distanceMeters: number | null | undefined): string {
	if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
		return '—';
	}
	const miles = distanceMeters / 1609.344;
	if (miles < 0.2) {
		const feet = Math.round(distanceMeters * 3.28084);
		return `${feet} ft`;
	}
	return `${miles.toFixed(1)} mi`;
}
