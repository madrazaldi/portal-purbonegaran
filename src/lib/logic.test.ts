import { describe, expect, test } from 'bun:test';
import { describeRecurrence, expandEvents, nthWeekdayOf } from './recurrence';
import { parseInline, parseRichText, plainText, slugify } from './richtext';
import { addDays, formatDateLong, isDate, isTime, todayWib } from './dates';
import { parseYoutubeId } from './youtube';
import { buildIcs } from './ics';
import { whatsappLink, formatPhone } from './contact';
import { hashPassword, verifyPassword, randomToken, sha256 } from './server/crypto';
import type { KampungEvent } from './types';

const ev = (over: Partial<KampungEvent>): KampungEvent => ({
	id: 1,
	title: 'Kegiatan',
	description: '',
	category: 'lainnya',
	location: '',
	rtNumber: null,
	startDate: '2026-11-02',
	endDate: null,
	startTime: null,
	endTime: null,
	recurrence: 'none',
	recurrenceInterval: 1,
	recurrenceUntil: null,
	...over
});

describe('dates', () => {
	test('validates dates and times', () => {
		expect(isDate('2026-02-29')).toBe(false);
		expect(isDate('2028-02-29')).toBe(true);
		expect(isDate('2026-13-01')).toBe(false);
		expect(isTime('07:30')).toBe(true);
		expect(isTime('24:00')).toBe(false);
	});
	test('formats in Indonesian', () => {
		expect(formatDateLong('2026-11-14')).toBe('Sabtu, 14 November 2026');
	});
	test('today is computed in WIB', () => {
		// 2026-11-05 18:30 UTC is already 6 Nov in Yogyakarta.
		expect(todayWib(new Date('2026-11-05T18:30:00Z'))).toBe('2026-11-06');
		expect(todayWib(new Date('2026-11-05T16:59:00Z'))).toBe('2026-11-05');
	});
	test('addDays crosses months and years', () => {
		expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
	});
});

describe('recurrence', () => {
	test('single event inside and outside range', () => {
		expect(expandEvents([ev({})], '2026-11-01', '2026-11-30')).toHaveLength(1);
		expect(expandEvents([ev({})], '2026-12-01', '2026-12-31')).toHaveLength(0);
	});

	test('multi-day event overlapping range start is included', () => {
		const e = ev({ startDate: '2026-10-30', endDate: '2026-11-02' });
		const out = expandEvents([e], '2026-11-01', '2026-11-30');
		expect(out).toHaveLength(1);
		expect(out[0].endDate).toBe('2026-11-02');
	});

	test('weekly every Monday (Masjos pickup)', () => {
		const e = ev({ startDate: '2026-11-02', recurrence: 'weekly' });
		const dates = expandEvents([e], '2026-11-01', '2026-11-30').map((o) => o.date);
		expect(dates).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
	});

	test('every two weeks with an end date', () => {
		const e = ev({
			startDate: '2026-11-02',
			recurrence: 'weekly',
			recurrenceInterval: 2,
			recurrenceUntil: '2026-11-20'
		});
		expect(expandEvents([e], '2026-11-01', '2026-12-31').map((o) => o.date)).toEqual([
			'2026-11-02',
			'2026-11-16'
		]);
	});

	test('monthly on the 31st skips short months', () => {
		const e = ev({ startDate: '2026-01-31', recurrence: 'monthly_date' });
		const dates = expandEvents([e], '2026-01-01', '2026-05-31').map((o) => o.date);
		expect(dates).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
	});

	test('monthly second Sunday (Posyandu)', () => {
		// 2026-11-08 is the second Sunday of November 2026.
		const e = ev({ startDate: '2026-11-08', recurrence: 'monthly_nth_weekday' });
		expect(nthWeekdayOf('2026-11-08')).toBe(2);
		const dates = expandEvents([e], '2026-11-01', '2027-01-31').map((o) => o.date);
		expect(dates).toEqual(['2026-11-08', '2026-12-13', '2027-01-10']);
		expect(describeRecurrence(e)).toBe('Setiap Minggu kedua tiap bulan');
	});

	test('monthly last weekday', () => {
		// 2026-11-29 is the last (5th) Sunday of November.
		const e = ev({ startDate: '2026-11-29', recurrence: 'monthly_nth_weekday' });
		expect(nthWeekdayOf('2026-11-29')).toBe(-1);
		const dates = expandEvents([e], '2026-11-01', '2027-02-28').map((o) => o.date);
		expect(dates).toEqual(['2026-11-29', '2026-12-27', '2027-01-31', '2027-02-28']);
	});

	test('results are sorted by date then time', () => {
		const a = ev({ id: 1, title: 'B', startDate: '2026-11-03', startTime: '19:00' });
		const b = ev({ id: 2, title: 'A', startDate: '2026-11-03', startTime: '07:00' });
		const c = ev({ id: 3, title: 'C', startDate: '2026-11-02' });
		expect(expandEvents([a, b, c], '2026-11-01', '2026-11-30').map((o) => o.eventId)).toEqual([3, 2, 1]);
	});
});

describe('rich text', () => {
	test('paragraphs, headings, lists', () => {
		const blocks = parseRichText('Halo warga\nbaris dua\n\n## Agenda\n- satu\n- dua\n\nPenutup');
		expect(blocks.map((b) => b.t)).toEqual(['p', 'h', 'ul', 'p']);
		expect(blocks[0].t === 'p' && blocks[0].lines.length).toBe(2);
	});
	test('bold and links are parsed, HTML is just text', () => {
		const parts = parseInline('**Penting**: lihat https://example.com/a. <script>x</script>');
		expect(parts[0]).toEqual({ t: 'b', v: 'Penting' });
		expect(parts.find((p) => p.t === 'a')).toEqual({ t: 'a', v: 'https://example.com/a', href: 'https://example.com/a' });
		expect(parts.at(-1)).toEqual({ t: 'text', v: '. <script>x</script>' });
	});
	test('javascript: URLs are never links', () => {
		expect(parseInline('javascript:alert(1)').every((p) => p.t === 'text')).toBe(true);
	});
	test('plain text summary', () => {
		expect(plainText('## Judul\n**Kerja bakti** besok', 100)).toBe('Judul Kerja bakti besok');
		expect(plainText('a '.repeat(200), 20).endsWith('…')).toBe(true);
	});
	test('slugify', () => {
		expect(slugify('Kerja Bakti RT 51!')).toBe('kerja-bakti-rt-51');
		expect(slugify('Merti Kali Bélik')).toBe('merti-kali-belik');
		expect(slugify('!!!')).toBe('tulisan');
	});
});

describe('youtube', () => {
	test.each([
		['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
		['https://youtu.be/dQw4w9WgXcQ?t=10', 'dQw4w9WgXcQ'],
		['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
		['m.youtube.com/watch?v=dQw4w9WgXcQ&list=x', 'dQw4w9WgXcQ'],
		['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
		['https://vimeo.com/123', null],
		['https://youtube.com/watch?v=short', null]
	])('%s', (input, expected) => {
		expect(parseYoutubeId(input)).toBe(expected);
	});
});

describe('contact helpers', () => {
	test('whatsapp link converts local numbers', () => {
		expect(whatsappLink('0812-3456-7890')).toBe('https://wa.me/6281234567890');
		expect(formatPhone('6281234567890')).toBe('0812-3456-7890');
	});
});

describe('ics', () => {
	test('builds timed and all-day events with escaping', () => {
		const out = buildIcs(
			expandEvents(
				[
					ev({ id: 7, title: 'Rapat; RW, 11', startDate: '2026-11-14', startTime: '19:30', endTime: '21:00' }),
					ev({ id: 8, title: 'Merti Kali Belik', startDate: '2026-11-20', endDate: '2026-11-21' })
				],
				'2026-11-01',
				'2026-11-30'
			),
			{ name: 'Kegiatan', host: 'example.org', stamp: '20261105T000000Z' }
		);
		expect(out).toContain('SUMMARY:Rapat\\; RW\\, 11');
		expect(out).toContain('DTSTART;TZID=Asia/Jakarta:20261114T193000');
		expect(out).toContain('DTEND;VALUE=DATE:20261122');
		expect(out.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
	});
});

describe('crypto', () => {
	test('password hash round trip', async () => {
		const h = await hashPassword('kali-belik-2026');
		expect(h.startsWith('pbkdf2_sha256$100000$')).toBe(true);
		expect(await verifyPassword('kali-belik-2026', h)).toBe(true);
		expect(await verifyPassword('salah', h)).toBe(false);
		expect(await verifyPassword('x', 'garbage')).toBe(false);
	});
	test('tokens are unique and hashed deterministically', async () => {
		expect(randomToken()).not.toBe(randomToken());
		expect(await sha256('a')).toBe(await sha256('a'));
	});
});
