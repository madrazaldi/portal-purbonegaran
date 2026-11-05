import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';
import { siteOrigin } from '#lib/server/seo.js';
import { listPublishedSlugs } from '#lib/server/services/posts.js';
import { listAlbums } from '#lib/server/services/media.js';

const STATIC_PATHS = ['/', '/profil', '/sejarah', '/rt', '/kalender', '/berita', '/galeri', '/kontak', '/aplikasi'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: RequestHandler = async ({ url }) => {
	const origin = siteOrigin(url);
	const [posts, albums] = await Promise.all([listPublishedSlugs(env.DB), listAlbums(env.DB)]);
	const entries = [
		...STATIC_PATHS.map((p) => ({ loc: origin + p, lastmod: null as string | null })),
		...posts.map((p) => ({ loc: `${origin}/berita/${p.slug}`, lastmod: p.updated_at.slice(0, 10) })),
		...albums.map((a) => ({ loc: `${origin}/galeri/${a.slug}`, lastmod: null }))
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map((e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`)
	.join('\n')}
</urlset>`;
	return new Response(xml, {
		headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	});
};
