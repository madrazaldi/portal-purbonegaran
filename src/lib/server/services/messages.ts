import type { Paginated } from '#lib/types.js';
import { nowIso } from '../http.js';

export interface Message {
	id: number;
	name: string;
	contact: string;
	body: string;
	readAt: string | null;
	createdAt: string;
}

interface MessageRow {
	id: number;
	name: string;
	contact: string;
	body: string;
	read_at: string | null;
	created_at: string;
}

const toMessage = (r: MessageRow): Message => ({
	id: r.id,
	name: r.name,
	contact: r.contact,
	body: r.body,
	readAt: r.read_at,
	createdAt: r.created_at
});

export async function createMessage(
	db: D1Database,
	input: { name: string; contact: string; body: string }
) {
	await db
		.prepare('INSERT INTO messages (name, contact, body) VALUES (?, ?, ?)')
		.bind(input.name, input.contact, input.body)
		.run();
}

export async function listMessages(db: D1Database, page = 1): Promise<Paginated<Message>> {
	const perPage = 30;
	const total = (await db.prepare('SELECT COUNT(*) AS n FROM messages').first<number>('n')) ?? 0;
	const { results } = await db
		.prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?')
		.bind(perPage, (Math.max(1, page) - 1) * perPage)
		.all<MessageRow>();
	return {
		items: results.map(toMessage),
		page,
		total,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function countUnread(db: D1Database): Promise<number> {
	return (
		(await db.prepare('SELECT COUNT(*) AS n FROM messages WHERE read_at IS NULL').first<number>('n')) ?? 0
	);
}

export async function markMessage(db: D1Database, id: number, read: boolean) {
	await db
		.prepare('UPDATE messages SET read_at = ? WHERE id = ?')
		.bind(read ? nowIso() : null, id)
		.run();
}

export async function deleteMessage(db: D1Database, id: number) {
	await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
}
