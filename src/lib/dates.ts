// Date helpers. Kampung dates are plain local dates in WIB (UTC+7, no DST),
// handled as 'YYYY-MM-DD' strings and manipulated through UTC Date objects so
// the host timezone never matters.

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = [
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
];

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDate(s: unknown): s is string {
	if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
	const d = parseDate(s);
	return toDateString(d) === s;
}

export function isTime(s: unknown): s is string {
	return typeof s === 'string' && TIME_RE.test(s);
}

export function parseDate(s: string): Date {
	const [y, m, d] = s.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

export function toDateString(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
	const d = parseDate(s);
	d.setUTCDate(d.getUTCDate() + n);
	return toDateString(d);
}

export function diffDays(a: string, b: string): number {
	return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

export function todayWib(now = new Date()): string {
	return toDateString(new Date(now.getTime() + WIB_OFFSET_MS));
}

export function daysInMonth(year: number, month0: number): number {
	return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

export function weekday(s: string): number {
	return parseDate(s).getUTCDay();
}

/** "Sabtu, 14 November 2026" */
export function formatDateLong(s: string): string {
	const d = parseDate(s);
	return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14 November 2026" */
export function formatDate(s: string): string {
	const d = parseDate(s);
	return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14 Nov" */
export function formatDateShort(s: string): string {
	const d = parseDate(s);
	return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)}`;
}

/** Formats an ISO timestamp (UTC) as a WIB date: "14 November 2026". */
export function formatTimestamp(iso: string, withTime = false): string {
	const wib = new Date(new Date(iso).getTime() + WIB_OFFSET_MS);
	const date = formatDate(toDateString(wib));
	if (!withTime) return date;
	const hh = String(wib.getUTCHours()).padStart(2, '0');
	const mm = String(wib.getUTCMinutes()).padStart(2, '0');
	return `${date}, ${hh}.${mm} WIB`;
}

/** "15.00–21.00 WIB" / "15.00 WIB" / "" */
export function formatTimeRange(start: string | null, end: string | null): string {
	if (!start) return '';
	const s = start.replace(':', '.');
	return end ? `${s}–${end.replace(':', '.')} WIB` : `${s} WIB`;
}
