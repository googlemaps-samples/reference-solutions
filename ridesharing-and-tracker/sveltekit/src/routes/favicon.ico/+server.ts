import type { RequestHandler } from './$types';

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1a73e8"/><path d="M16 5L8 25l8-4 8 4z" fill="#ffffff"/></svg>`;

export const GET: RequestHandler = () => {
	return new Response(FAVICON_SVG, {
		status: 200,
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=86400',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'SAMEORIGIN'
		}
	});
};
