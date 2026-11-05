import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';
import { getPublicSettings, listLinks } from '#lib/server/services/site.js';

export const load: LayoutServerLoad = async () => {
	const [site, links] = await Promise.all([getPublicSettings(env.DB), listLinks(env.DB, true)]);
	return { site, links };
};
