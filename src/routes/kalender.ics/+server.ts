import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';
import { addDays, todayWib } from '#lib/dates.js';
import { buildIcs } from '#lib/ics.js';
import { listOccurrences } from '#lib/server/services/events.js';
import { getAdminSettings } from '#lib/server/services/site.js';

// Subscribable calendar feed (Google Calendar, HP, chatbot reminders).
export const GET: RequestHandler = async ({ url }) => {
	const today = todayWib();
	const [occ, settings] = await Promise.all([
		listOccurrences(env.DB, addDays(today, -30), addDays(today, 365)),
		getAdminSettings(env.DB)
	]);
	const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
	const body = buildIcs(occ, { name: `Kegiatan ${settings.siteName}`, host: url.hostname, stamp });
	return new Response(body, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': 'inline; filename="kalender-purbonegaran.ics"',
			'cache-control': 'public, max-age=900'
		}
	});
};
