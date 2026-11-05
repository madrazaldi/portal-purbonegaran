import type { KampungEvent, Occurrence } from './types';
import { addDays, daysInMonth, diffDays, HARI, parseDate, toDateString } from './dates';

const MAX_OCCURRENCES = 2000;
const URUTAN = ['pertama', 'kedua', 'ketiga', 'keempat'];

/** nth weekday-of-month of a date: 1..4, or -1 when it is the last one (5th or the final week). */
export function nthWeekdayOf(date: string): number {
	const day = parseDate(date).getUTCDate();
	const n = Math.ceil(day / 7);
	return n >= 5 ? -1 : n;
}

function nthWeekdayInMonth(year: number, month0: number, wd: number, nth: number): string | null {
	if (nth === -1) {
		const last = daysInMonth(year, month0);
		const lastWd = new Date(Date.UTC(year, month0, last)).getUTCDay();
		const day = last - ((lastWd - wd + 7) % 7);
		return toDateString(new Date(Date.UTC(year, month0, day)));
	}
	const firstWd = new Date(Date.UTC(year, month0, 1)).getUTCDay();
	const day = 1 + ((wd - firstWd + 7) % 7) + (nth - 1) * 7;
	if (day > daysInMonth(year, month0)) return null;
	return toDateString(new Date(Date.UTC(year, month0, day)));
}

/** Start dates of an event, in order, from its start up to `limit` (inclusive). */
function* startDates(e: KampungEvent, limit: string): Generator<string> {
	const until = e.recurrenceUntil && e.recurrenceUntil < limit ? e.recurrenceUntil : limit;
	const interval = Math.max(1, e.recurrenceInterval || 1);
	if (e.recurrence === 'none') {
		if (e.startDate <= until) yield e.startDate;
		return;
	}
	if (e.recurrence === 'weekly') {
		for (let d = e.startDate; d <= until; d = addDays(d, 7 * interval)) yield d;
		return;
	}
	const start = parseDate(e.startDate);
	const y0 = start.getUTCFullYear();
	const m0 = start.getUTCMonth();
	const day = start.getUTCDate();
	const wd = start.getUTCDay();
	const nth = nthWeekdayOf(e.startDate);
	for (let k = 0; ; k += interval) {
		const y = y0 + Math.floor((m0 + k) / 12);
		const m = (m0 + k) % 12;
		const firstOfMonth = toDateString(new Date(Date.UTC(y, m, 1)));
		if (firstOfMonth > until) return;
		let d: string | null;
		if (e.recurrence === 'monthly_date') {
			d = day <= daysInMonth(y, m) ? toDateString(new Date(Date.UTC(y, m, day))) : null;
		} else {
			d = nthWeekdayInMonth(y, m, wd, nth);
		}
		if (d && d >= e.startDate && d <= until) yield d;
	}
}

/**
 * Expands events into dated occurrences overlapping [from, to] (inclusive),
 * sorted by date and start time.
 */
export function expandEvents(events: KampungEvent[], from: string, to: string): Occurrence[] {
	const out: Occurrence[] = [];
	for (const e of events) {
		const span = e.endDate && e.endDate > e.startDate ? diffDays(e.startDate, e.endDate) : 0;
		for (const date of startDates(e, to)) {
			const end = span ? addDays(date, span) : date;
			if (end < from) continue;
			out.push({
				eventId: e.id,
				date,
				endDate: span ? end : null,
				title: e.title,
				description: e.description,
				category: e.category,
				location: e.location,
				rtNumber: e.rtNumber,
				startTime: e.startTime,
				endTime: e.endTime,
				recurring: e.recurrence !== 'none'
			});
			if (out.length >= MAX_OCCURRENCES) break;
		}
	}
	return out.sort(
		(a, b) =>
			a.date.localeCompare(b.date) ||
			(a.startTime ?? '').localeCompare(b.startTime ?? '') ||
			a.title.localeCompare(b.title)
	);
}

/** Human description of a repeat rule, e.g. "Setiap Senin" or "Setiap Minggu kedua". */
export function describeRecurrence(
	e: Pick<KampungEvent, 'recurrence' | 'recurrenceInterval' | 'startDate' | 'recurrenceUntil'>
): string {
	const interval = Math.max(1, e.recurrenceInterval || 1);
	const d = parseDate(e.startDate);
	const hari = HARI[d.getUTCDay()];
	let text: string;
	switch (e.recurrence) {
		case 'none':
			return '';
		case 'weekly':
			text = interval === 1 ? `Setiap ${hari}` : `Setiap ${interval} minggu, hari ${hari}`;
			break;
		case 'monthly_date':
			text =
				interval === 1
					? `Setiap tanggal ${d.getUTCDate()}`
					: `Setiap ${interval} bulan, tanggal ${d.getUTCDate()}`;
			break;
		case 'monthly_nth_weekday': {
			const nth = nthWeekdayOf(e.startDate);
			const urutan = nth === -1 ? 'terakhir' : URUTAN[nth - 1];
			text =
				interval === 1
					? `Setiap ${hari} ${urutan} tiap bulan`
					: `Setiap ${hari} ${urutan}, tiap ${interval} bulan`;
			break;
		}
	}
	return text;
}
