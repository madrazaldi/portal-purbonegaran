import { env } from 'cloudflare:workers';

/** Canonical site origin: SITE_URL in production, the request origin otherwise. */
export function siteOrigin(url: URL): string {
	const configured = env.SITE_URL?.replace(/\/$/, '');
	if (configured && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return configured;
	return url.origin;
}
