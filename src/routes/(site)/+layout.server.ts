import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';
import { getPublicSettings, listLinks } from '#lib/server/services/site.js';
import { siteOrigin } from '#lib/server/seo.js';

export const load: LayoutServerLoad = async ({ url, untrack }) => {
	const [site, links] = await Promise.all([getPublicSettings(env.DB), listLinks(env.DB, true)]);
	// untrack: the origin never changes between client-side navigations, so don't rerun this load.
	return { site, links, origin: untrack(() => siteOrigin(url)) };
};
