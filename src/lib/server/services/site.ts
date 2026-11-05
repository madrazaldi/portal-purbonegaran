import type {
	AdminSettings,
	LinkItem,
	PageContent,
	PhotoRule,
	PublicSettings,
	Rt
} from '#lib/types.js';
import { notFound } from '../http.js';
import { getMedia } from './media.js';

// ----------------------------------------------------------------- settings

async function readSettings(db: D1Database): Promise<Record<string, string>> {
	const { results } = await db
		.prepare('SELECT key, value FROM settings')
		.all<{ key: string; value: string }>();
	return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

export async function getAdminSettings(db: D1Database): Promise<AdminSettings> {
	const s = await readSettings(db);
	return {
		siteName: s.site_name ?? 'Kampung Purbonegaran',
		tagline: s.tagline ?? '',
		welcomeTitle: s.welcome_title ?? '',
		welcomeText: s.welcome_text ?? '',
		welcomeBy: s.welcome_by ?? '',
		heroMediaId: s.hero_media_id ? Number(s.hero_media_id) : null,
		address: s.address ?? '',
		contactWhatsapp: s.contact_whatsapp ?? '',
		contactEmail: s.contact_email ?? '',
		contactNote: s.contact_note ?? '',
		mapLat: Number(s.map_lat ?? -7.7768),
		mapLng: Number(s.map_lng ?? 110.3745),
		requireApproval: s.require_approval === '1',
		photoRule: (s.photo_rule as PhotoRule) ?? 'consent'
	};
}

export async function getPublicSettings(db: D1Database): Promise<PublicSettings> {
	const s = await getAdminSettings(db);
	return {
		siteName: s.siteName,
		tagline: s.tagline,
		welcomeTitle: s.welcomeTitle,
		welcomeText: s.welcomeText,
		welcomeBy: s.welcomeBy,
		hero: await getMedia(db, s.heroMediaId),
		address: s.address,
		contactWhatsapp: s.contactWhatsapp,
		contactEmail: s.contactEmail,
		contactNote: s.contactNote,
		mapLat: s.mapLat,
		mapLng: s.mapLng
	};
}

export async function saveSettings(db: D1Database, s: AdminSettings) {
	const pairs: [string, string][] = [
		['site_name', s.siteName],
		['tagline', s.tagline],
		['welcome_title', s.welcomeTitle],
		['welcome_text', s.welcomeText],
		['welcome_by', s.welcomeBy],
		['hero_media_id', s.heroMediaId ? String(s.heroMediaId) : ''],
		['address', s.address],
		['contact_whatsapp', s.contactWhatsapp],
		['contact_email', s.contactEmail],
		['contact_note', s.contactNote],
		['map_lat', String(s.mapLat)],
		['map_lng', String(s.mapLng)],
		['require_approval', s.requireApproval ? '1' : '0'],
		['photo_rule', s.photoRule]
	];
	const stmt = db.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	);
	await db.batch(pairs.map(([k, v]) => stmt.bind(k, v)));
}

export async function requiresApproval(db: D1Database): Promise<boolean> {
	const v = await db
		.prepare(`SELECT value FROM settings WHERE key = 'require_approval'`)
		.first<string>('value');
	return v === '1';
}

// ---------------------------------------------------------------------- RTs

interface RtRow {
	id: number;
	number: number;
	ketua_name: string;
	area: string;
	notes: string;
}

const toRt = (r: RtRow): Rt => ({
	id: r.id,
	number: r.number,
	ketuaName: r.ketua_name,
	area: r.area,
	notes: r.notes
});

export async function listRts(db: D1Database): Promise<Rt[]> {
	const { results } = await db.prepare('SELECT * FROM rts ORDER BY number').all<RtRow>();
	return results.map(toRt);
}

export async function updateRt(
	db: D1Database,
	id: number,
	input: { ketuaName: string; area: string; notes: string }
): Promise<Rt> {
	const row = await db
		.prepare(
			`UPDATE rts SET ketua_name = ?, area = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE id = ? RETURNING *`
		)
		.bind(input.ketuaName, input.area, input.notes, id)
		.first<RtRow>();
	if (!row) throw notFound();
	return toRt(row);
}

// -------------------------------------------------------------------- links

interface LinkRow {
	id: number;
	title: string;
	description: string;
	url: string;
	sort_order: number;
	active: number;
}

const toLink = (r: LinkRow): LinkItem => ({
	id: r.id,
	title: r.title,
	description: r.description,
	url: r.url,
	sortOrder: r.sort_order,
	active: r.active === 1
});

export async function listLinks(db: D1Database, activeOnly: boolean): Promise<LinkItem[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM links ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort_order, id`
		)
		.all<LinkRow>();
	return results.map(toLink);
}

export interface LinkInput {
	title: string;
	description: string;
	url: string;
	sortOrder: number;
	active: boolean;
}

export async function createLink(db: D1Database, l: LinkInput): Promise<LinkItem> {
	const row = await db
		.prepare(
			'INSERT INTO links (title, description, url, sort_order, active) VALUES (?, ?, ?, ?, ?) RETURNING *'
		)
		.bind(l.title, l.description, l.url, l.sortOrder, l.active ? 1 : 0)
		.first<LinkRow>();
	return toLink(row!);
}

export async function updateLink(db: D1Database, id: number, l: LinkInput): Promise<LinkItem> {
	const row = await db
		.prepare(
			'UPDATE links SET title = ?, description = ?, url = ?, sort_order = ?, active = ? WHERE id = ? RETURNING *'
		)
		.bind(l.title, l.description, l.url, l.sortOrder, l.active ? 1 : 0, id)
		.first<LinkRow>();
	if (!row) throw notFound();
	return toLink(row);
}

export async function deleteLink(db: D1Database, id: number) {
	await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
}

// -------------------------------------------------------------------- pages

export const PAGE_SLUGS = ['profil', 'sejarah'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export async function getPage(db: D1Database, slug: string): Promise<PageContent | null> {
	const row = await db
		.prepare('SELECT slug, title, body, updated_at FROM pages WHERE slug = ?')
		.bind(slug)
		.first<{ slug: string; title: string; body: string; updated_at: string }>();
	return row ? { slug: row.slug, title: row.title, body: row.body, updatedAt: row.updated_at } : null;
}

export async function listPages(db: D1Database): Promise<PageContent[]> {
	const { results } = await db
		.prepare('SELECT slug, title, body, updated_at FROM pages ORDER BY slug')
		.all<{ slug: string; title: string; body: string; updated_at: string }>();
	return results.map((r) => ({ slug: r.slug, title: r.title, body: r.body, updatedAt: r.updated_at }));
}

export async function savePage(
	db: D1Database,
	slug: PageSlug,
	input: { title: string; body: string },
	userId: number
): Promise<PageContent> {
	await db
		.prepare(
			`INSERT INTO pages (slug, title, body, updated_by) VALUES (?, ?, ?, ?)
			 ON CONFLICT(slug) DO UPDATE SET title = excluded.title, body = excluded.body,
			   updated_by = excluded.updated_by, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
		)
		.bind(slug, input.title, input.body, userId)
		.run();
	return (await getPage(db, slug))!;
}
