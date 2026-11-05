import type { EventCategory, KampungEvent, Occurrence, Recurrence } from '#lib/types.js';
import { expandEvents } from '#lib/recurrence.js';
import { addDays, todayWib } from '#lib/dates.js';
import { notFound, nowIso } from '../http.js';

interface EventRow {
	id: number;
	title: string;
	description: string;
	category: EventCategory;
	location: string;
	rt_number: number | null;
	start_date: string;
	end_date: string | null;
	start_time: string | null;
	end_time: string | null;
	recurrence: Recurrence;
	recurrence_interval: number;
	recurrence_until: string | null;
}

const toEvent = (r: EventRow): KampungEvent => ({
	id: r.id,
	title: r.title,
	description: r.description,
	category: r.category,
	location: r.location,
	rtNumber: r.rt_number,
	startDate: r.start_date,
	endDate: r.end_date,
	startTime: r.start_time,
	endTime: r.end_time,
	recurrence: r.recurrence,
	recurrenceInterval: r.recurrence_interval,
	recurrenceUntil: r.recurrence_until
});

/** Every event that could have an occurrence in [from, to]. */
async function candidates(db: D1Database, from: string, to: string) {
	const { results } = await db
		.prepare(
			`SELECT * FROM events
			 WHERE start_date <= ?2
			   AND (
			     (recurrence = 'none' AND COALESCE(end_date, start_date) >= ?1)
			     OR (recurrence != 'none' AND (recurrence_until IS NULL OR recurrence_until >= ?1))
			   )`
		)
		.bind(from, to)
		.all<EventRow>();
	return results.map(toEvent);
}

export async function listOccurrences(
	db: D1Database,
	from: string,
	to: string,
	category?: EventCategory | null
): Promise<Occurrence[]> {
	const occ = expandEvents(await candidates(db, from, to), from, to);
	return category ? occ.filter((o) => o.category === category) : occ;
}

export async function upcoming(db: D1Database, limit = 5, days = 60): Promise<Occurrence[]> {
	const today = todayWib();
	return (await listOccurrences(db, today, addDays(today, days))).slice(0, limit);
}

export async function listEvents(db: D1Database): Promise<KampungEvent[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM events ORDER BY
			   CASE WHEN recurrence != 'none' THEN 0 ELSE 1 END, start_date DESC, id DESC`
		)
		.all<EventRow>();
	return results.map(toEvent);
}

export async function getEvent(db: D1Database, id: number): Promise<KampungEvent> {
	const row = await db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<EventRow>();
	if (!row) throw notFound('Kegiatan tidak ditemukan.');
	return toEvent(row);
}

export type EventInput = Omit<KampungEvent, 'id'>;

export async function createEvent(db: D1Database, e: EventInput, userId: number) {
	const row = await db
		.prepare(
			`INSERT INTO events (title, description, category, location, rt_number, start_date, end_date,
			   start_time, end_time, recurrence, recurrence_interval, recurrence_until, created_by)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
		)
		.bind(
			e.title,
			e.description,
			e.category,
			e.location,
			e.rtNumber,
			e.startDate,
			e.endDate,
			e.startTime,
			e.endTime,
			e.recurrence,
			e.recurrenceInterval,
			e.recurrenceUntil,
			userId
		)
		.first<EventRow>();
	return toEvent(row!);
}

export async function updateEvent(db: D1Database, id: number, e: EventInput) {
	const row = await db
		.prepare(
			`UPDATE events SET title = ?, description = ?, category = ?, location = ?, rt_number = ?,
			   start_date = ?, end_date = ?, start_time = ?, end_time = ?, recurrence = ?,
			   recurrence_interval = ?, recurrence_until = ?, updated_at = ?
			 WHERE id = ? RETURNING *`
		)
		.bind(
			e.title,
			e.description,
			e.category,
			e.location,
			e.rtNumber,
			e.startDate,
			e.endDate,
			e.startTime,
			e.endTime,
			e.recurrence,
			e.recurrenceInterval,
			e.recurrenceUntil,
			nowIso(),
			id
		)
		.first<EventRow>();
	if (!row) throw notFound('Kegiatan tidak ditemukan.');
	return toEvent(row);
}

export async function deleteEvent(db: D1Database, id: number) {
	await db.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
}
