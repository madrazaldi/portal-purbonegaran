import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

// Serves uploaded photos from R2. Keys are random UUIDs, so responses are immutable.
export const GET: RequestHandler = async ({ params, request }) => {
	const key = params.key;
	if (!/^img\/\d{4}\/\d{2}\/[0-9a-f-]{36}(-thumb)?\.(webp|jpg|png)$/.test(key)) error(404);

	const object = await env.MEDIA.get(key, dev ? {} : { onlyIf: request.headers as never });
	if (!object) error(404);

	const headers = new Headers();
	object.writeHttpMetadata(headers as never);
	headers.set('etag', object.httpEtag);
	headers.set('cache-control', 'public, max-age=31536000, immutable');
	// Cloudflare's edge keeps it for a day, so a deleted photo disappears within 24 h
	// while R2 reads stay low (each photo is read about once per data centre per day).
	headers.set('cdn-cache-control', 'public, max-age=86400');
	headers.set('x-content-type-options', 'nosniff');
	if (!('body' in object)) return new Response(null, { status: 304, headers });

	// Workers stream the body straight from R2. In `vite dev` under Bun, Wrangler's
	// local proxy cannot stream R2 bodies, so buffer there (images are ≤ 6 MB).
	const body = dev ? await object.arrayBuffer() : (object.body as unknown as BodyInit);
	return new Response(body, { headers });
};
