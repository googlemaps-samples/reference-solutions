import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/favicon.ico') {
		return new Response(null, {
			status: 204,
			headers: {
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'SAMEORIGIN'
			}
		});
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	return response;
};
