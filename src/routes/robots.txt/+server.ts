import type { RequestHandler } from './$types';
import { siteOrigin } from '#lib/server/seo.js';

export const GET: RequestHandler = ({ url }) =>
	new Response(
		`User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteOrigin(url)}/sitemap.xml\n`,
		{ headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
	);
