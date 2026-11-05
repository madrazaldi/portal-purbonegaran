import { redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';
import { getAdminSettings } from '#lib/server/services/site.js';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}
	const settings = await getAdminSettings(env.DB);
	return {
		user: locals.user,
		siteName: settings.siteName,
		photoRule: settings.photoRule,
		requireApproval: settings.requireApproval
	};
};
