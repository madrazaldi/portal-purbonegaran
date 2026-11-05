import type { Occurrence } from './types';
import { addDays } from './dates';

const escape = (s: string) =>
	s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Folds lines longer than 75 octets as required by RFC 5545. */
function fold(line: string): string {
	const bytes = new TextEncoder().encode(line);
	if (bytes.length <= 75) return line;
	const out: string[] = [];
	let cur = '';
	let curLen = 0;
	for (const ch of line) {
		const len = new TextEncoder().encode(ch).length;
		if (curLen + len > (out.length ? 74 : 75)) {
			out.push(cur);
			cur = '';
			curLen = 0;
		}
		cur += ch;
		curLen += len;
	}
	out.push(cur);
	return out.join('\r\n ');
}

const compactDate = (d: string) => d.replace(/-/g, '');
const compactTime = (t: string) => `${t.replace(':', '')}00`;

/** Builds an iCalendar feed from expanded occurrences (times in Asia/Jakarta). */
export function buildIcs(occurrences: Occurrence[], opts: { name: string; host: string; stamp: string }) {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Kampung Purbonegaran//Portal Kampung//ID',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escape(opts.name)}`,
		'X-WR-TIMEZONE:Asia/Jakarta',
		'BEGIN:VTIMEZONE',
		'TZID:Asia/Jakarta',
		'BEGIN:STANDARD',
		'DTSTART:19700101T000000',
		'TZOFFSETFROM:+0700',
		'TZOFFSETTO:+0700',
		'TZNAME:WIB',
		'END:STANDARD',
		'END:VTIMEZONE'
	];
	for (const o of occurrences) {
		lines.push('BEGIN:VEVENT', `UID:event-${o.eventId}-${o.date}@${opts.host}`, `DTSTAMP:${opts.stamp}`);
		const lastDay = o.endDate ?? o.date;
		if (o.startTime) {
			lines.push(`DTSTART;TZID=Asia/Jakarta:${compactDate(o.date)}T${compactTime(o.startTime)}`);
			const endTime = o.endTime ?? o.startTime;
			lines.push(`DTEND;TZID=Asia/Jakarta:${compactDate(lastDay)}T${compactTime(endTime)}`);
		} else {
			lines.push(`DTSTART;VALUE=DATE:${compactDate(o.date)}`);
			lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(lastDay, 1))}`);
		}
		lines.push(`SUMMARY:${escape(o.title)}`);
		if (o.description) lines.push(`DESCRIPTION:${escape(o.description)}`);
		if (o.location) lines.push(`LOCATION:${escape(o.location)}`);
		lines.push(`CATEGORIES:${o.category.toUpperCase()}`, 'END:VEVENT');
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}
