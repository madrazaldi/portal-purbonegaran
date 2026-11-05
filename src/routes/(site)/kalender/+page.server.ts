import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import type { EventCategory } from '#lib/types.js';
import { EVENT_CATEGORIES } from '#lib/types.js';
import { daysInMonth, todayWib } from '#lib/dates.js';
import { listOccurrences } from '#lib/server/services/events.js';

export const load: PageServerLoad = async ({ url }) => {
	const today = todayWib();
	const param = url.searchParams.get('bulan');
	const month = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : today.slice(0, 7);
	const [y, m] = month.split('-').map(Number);
	const from = `${month}-01`;
	const to = `${month}-${String(daysInMonth(y, m - 1)).padStart(2, '0')}`;
	const jenis = url.searchParams.get('jenis');
	const category = EVENT_CATEGORIES.some((c) => c.value === jenis) ? (jenis as EventCategory) : null;

	return {
		month,
		today,
		category,
		occurrences: await listOccurrences(env.DB, from, to, category)
	};
};
