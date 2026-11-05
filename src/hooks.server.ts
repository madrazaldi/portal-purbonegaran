import type { Handle } from '@sveltejs/kit/hooks';
import { env } from 'cloudflare:workers';
import { SESSION_COOKIE, userFromToken } from '#lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	// www.purbonegaran.my.id → purbonegaran.my.id. A zone Redirect Rule normally handles this
	// before the Worker runs; this is the fallback. It must never be cached: Workers Caching
	// keys by path, not host, so a cached redirect would also be served on the bare domain.
	if (event.url.hostname.startsWith('www.')) {
		const target = new URL(event.url);
		target.hostname = target.hostname.slice(4);
		return new Response(null, {
			status: 301,
			headers: { location: target.href, 'cache-control': 'no-store' }
		});
	}

	event.locals.user = null;
	// Only the admin area needs the session; public pages stay cacheable and DB-light.
	if (event.url.pathname.startsWith('/admin')) {
		const token = event.cookies.get(SESSION_COOKIE);
		if (token) event.locals.user = await userFromToken(env.DB, token);
	}

	const response = await resolve(event);
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	if (event.url.pathname.startsWith('/admin')) {
		response.headers.set('cache-control', 'no-store');
		response.headers.set('x-robots-tag', 'noindex');
	} else if (event.request.method === 'GET' && !response.headers.has('cache-control')) {
		// Public pages: browsers always revalidate; Cloudflare's edge may reuse a page for
		// 60 s, so new news shows up within about a minute while traffic spikes stay cheap.
		response.headers.set('cache-control', 'public, max-age=0, must-revalidate');
		response.headers.set('cdn-cache-control', 'public, max-age=60, stale-while-revalidate=300');
	}
	return response;
};
