import type {
	AdminPost,
	Paginated,
	Post,
	PostCategory,
	PostStatus,
	PostSummary,
	SessionUser
} from '#lib/types.js';
import { plainText, slugify } from '#lib/richtext.js';
import { badRequest, forbidden, notFound, nowIso } from '../http.js';
import { hasRole } from '../auth.js';
import { getMediaMany, toMedia, type MediaRow } from './media.js';
import { requiresApproval } from './site.js';

interface PostRow {
	id: number;
	slug: string;
	title: string;
	category: PostCategory;
	body: string;
	cover_media_id: number | null;
	status: PostStatus;
	review_note: string;
	author_id: number | null;
	author_name: string | null;
	published_at: string | null;
	updated_at: string;
}

const SELECT = `SELECT p.*, u.name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.author_id`;

async function toSummaries(db: D1Database, rows: PostRow[]): Promise<PostSummary[]> {
	const covers = await getMediaMany(
		db,
		rows.map((r) => r.cover_media_id ?? 0)
	);
	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.title,
		category: r.category,
		excerpt: plainText(r.body, 200),
		cover: covers.get(r.cover_media_id ?? 0) ?? null,
		publishedAt: r.published_at
	}));
}

async function postMedia(db: D1Database, postId: number) {
	const { results } = await db
		.prepare(
			`SELECT m.* FROM post_media pm JOIN media m ON m.id = pm.media_id
			 WHERE pm.post_id = ? ORDER BY pm.sort_order, m.id`
		)
		.bind(postId)
		.all<MediaRow>();
	return results.map(toMedia);
}

async function toPost(db: D1Database, row: PostRow): Promise<Post> {
	const [summary] = await toSummaries(db, [row]);
	return { ...summary, body: row.body, media: await postMedia(db, row.id), authorName: row.author_name };
}

async function toAdminPost(db: D1Database, row: PostRow): Promise<AdminPost> {
	return {
		...(await toPost(db, row)),
		status: row.status,
		reviewNote: row.review_note,
		authorId: row.author_id,
		updatedAt: row.updated_at
	};
}

// ------------------------------------------------------------------ public

export async function listPublished(
	db: D1Database,
	opts: { page?: number; perPage?: number; category?: PostCategory | null } = {}
): Promise<Paginated<PostSummary>> {
	const perPage = Math.min(opts.perPage ?? 9, 50);
	const page = Math.max(1, opts.page ?? 1);
	const where = `WHERE p.status = 'published'${opts.category ? ' AND p.category = ?' : ''}`;
	const args = opts.category ? [opts.category] : [];
	const total =
		(await db
			.prepare(`SELECT COUNT(*) AS n FROM posts p ${where}`)
			.bind(...args)
			.first<number>('n')) ?? 0;
	const { results } = await db
		.prepare(`${SELECT} ${where} ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`)
		.bind(...args, perPage, (page - 1) * perPage)
		.all<PostRow>();
	return {
		items: await toSummaries(db, results),
		page,
		total,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function getPublishedBySlug(db: D1Database, slug: string): Promise<Post | null> {
	const row = await db
		.prepare(`${SELECT} WHERE p.slug = ? AND p.status = 'published'`)
		.bind(slug)
		.first<PostRow>();
	return row ? toPost(db, row) : null;
}

export async function listPublishedSlugs(db: D1Database) {
	const { results } = await db
		.prepare(`SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC`)
		.all<{ slug: string; updated_at: string }>();
	return results;
}

// ------------------------------------------------------------------- admin

export interface AdminPostListItem extends PostSummary {
	status: PostStatus;
	authorId: number | null;
	authorName: string | null;
	updatedAt: string;
}

export async function listAdmin(
	db: D1Database,
	opts: { page?: number; status?: PostStatus | null }
): Promise<Paginated<AdminPostListItem>> {
	const perPage = 20;
	const page = Math.max(1, opts.page ?? 1);
	const where = opts.status ? 'WHERE p.status = ?' : '';
	const args = opts.status ? [opts.status] : [];
	const total =
		(await db
			.prepare(`SELECT COUNT(*) AS n FROM posts p ${where}`)
			.bind(...args)
			.first<number>('n')) ?? 0;
	const { results } = await db
		.prepare(`${SELECT} ${where} ORDER BY p.updated_at DESC, p.id DESC LIMIT ? OFFSET ?`)
		.bind(...args, perPage, (page - 1) * perPage)
		.all<PostRow>();
	const summaries = await toSummaries(db, results);
	return {
		items: summaries.map((s, i) => ({
			...s,
			status: results[i].status,
			authorId: results[i].author_id,
			authorName: results[i].author_name,
			updatedAt: results[i].updated_at
		})),
		page,
		total,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export async function countPending(db: D1Database): Promise<number> {
	return (
		(await db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE status = 'pending'`).first<number>('n')) ??
		0
	);
}

async function getRow(db: D1Database, id: number) {
	return db.prepare(`${SELECT} WHERE p.id = ?`).bind(id).first<PostRow>();
}

export async function getAdmin(db: D1Database, id: number): Promise<AdminPost> {
	const row = await getRow(db, id);
	if (!row) throw notFound('Berita tidak ditemukan.');
	return toAdminPost(db, row);
}

export interface PostInput {
	title: string;
	category: PostCategory;
	body: string;
	mediaIds: number[];
	coverMediaId: number | null;
}

/** 'draft' keeps it private; 'publish' publishes, or sends for approval when required. */
export type PostIntent = 'draft' | 'publish';

async function resolveStatus(db: D1Database, user: SessionUser, intent: PostIntent): Promise<PostStatus> {
	if (intent === 'draft') return 'draft';
	if (hasRole(user, 'admin_utama')) return 'published';
	return (await requiresApproval(db)) ? 'pending' : 'published';
}

async function uniqueSlug(db: D1Database, title: string, exceptId: number) {
	const base = slugify(title);
	for (let i = 1; ; i++) {
		const slug = i === 1 ? base : `${base}-${i}`;
		const hit = await db
			.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?')
			.bind(slug, exceptId)
			.first();
		if (!hit) return slug;
	}
}

async function validateMedia(db: D1Database, input: PostInput) {
	const ids = [...new Set(input.mediaIds)];
	if (input.coverMediaId && !ids.includes(input.coverMediaId)) ids.push(input.coverMediaId);
	if (!ids.length) return;
	const found = await getMediaMany(db, ids);
	if (found.size !== ids.length) throw badRequest('Sebagian foto tidak ditemukan. Muat ulang halaman.');
	const cover = input.coverMediaId ? found.get(input.coverMediaId) : null;
	if (cover && cover.kind !== 'image') throw badRequest('Foto sampul harus berupa foto, bukan video.');
}

function defaultCover(input: PostInput, media: Map<number, { kind: string }>) {
	if (input.coverMediaId) return input.coverMediaId;
	return input.mediaIds.find((id) => media.get(id)?.kind === 'image') ?? null;
}

async function writeMedia(db: D1Database, postId: number, mediaIds: number[]) {
	const unique = [...new Set(mediaIds)];
	await db.batch([
		db.prepare('DELETE FROM post_media WHERE post_id = ?').bind(postId),
		...unique.map((mid, i) =>
			db
				.prepare('INSERT INTO post_media (post_id, media_id, sort_order) VALUES (?, ?, ?)')
				.bind(postId, mid, i)
		)
	]);
}

export async function createPost(
	db: D1Database,
	user: SessionUser,
	input: PostInput,
	intent: PostIntent
): Promise<AdminPost> {
	await validateMedia(db, input);
	const media = await getMediaMany(db, input.mediaIds);
	const status = await resolveStatus(db, user, intent);
	const slug = await uniqueSlug(db, input.title, 0);
	const row = await db
		.prepare(
			`INSERT INTO posts (slug, title, category, body, cover_media_id, status, author_id, published_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
		)
		.bind(
			slug,
			input.title,
			input.category,
			input.body,
			defaultCover(input, media),
			status,
			user.id,
			status === 'published' ? nowIso() : null
		)
		.first<{ id: number }>();
	await writeMedia(db, row!.id, input.mediaIds);
	return getAdmin(db, row!.id);
}

export function canEditPost(user: SessionUser, authorId: number | null) {
	return hasRole(user, 'admin_utama') || authorId === user.id;
}

export async function updatePost(
	db: D1Database,
	user: SessionUser,
	id: number,
	input: PostInput,
	intent: PostIntent
): Promise<AdminPost> {
	const existing = await getRow(db, id);
	if (!existing) throw notFound('Berita tidak ditemukan.');
	if (!canEditPost(user, existing.author_id)) throw forbidden('Anda hanya bisa mengubah tulisan Anda sendiri.');
	await validateMedia(db, input);
	const media = await getMediaMany(db, input.mediaIds);
	const status = await resolveStatus(db, user, intent);
	// The URL stays the same once a post has been public, so shared links keep working.
	const slug = existing.published_at ? existing.slug : await uniqueSlug(db, input.title, id);
	const publishedAt = status === 'published' ? (existing.published_at ?? nowIso()) : existing.published_at;
	await db
		.prepare(
			`UPDATE posts SET slug = ?, title = ?, category = ?, body = ?, cover_media_id = ?, status = ?,
			   review_note = CASE WHEN ? = 'pending' THEN review_note ELSE '' END,
			   published_at = ?, updated_at = ? WHERE id = ?`
		)
		.bind(
			slug,
			input.title,
			input.category,
			input.body,
			defaultCover(input, media),
			status,
			status,
			publishedAt,
			nowIso(),
			id
		)
		.run();
	await writeMedia(db, id, input.mediaIds);
	return getAdmin(db, id);
}

/** Admin utama approves (publishes) or returns a pending post. */
export async function reviewPost(
	db: D1Database,
	id: number,
	decision: 'approve' | 'reject',
	note: string
): Promise<AdminPost> {
	const existing = await getRow(db, id);
	if (!existing) throw notFound('Berita tidak ditemukan.');
	if (decision === 'approve') {
		await db
			.prepare(
				`UPDATE posts SET status = 'published', review_note = '', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?`
			)
			.bind(nowIso(), nowIso(), id)
			.run();
	} else {
		await db
			.prepare(`UPDATE posts SET status = 'rejected', review_note = ?, updated_at = ? WHERE id = ?`)
			.bind(note, nowIso(), id)
			.run();
	}
	return getAdmin(db, id);
}

export async function deletePost(db: D1Database, user: SessionUser, id: number) {
	const existing = await getRow(db, id);
	if (!existing) throw notFound('Berita tidak ditemukan.');
	if (!canEditPost(user, existing.author_id)) throw forbidden('Anda hanya bisa menghapus tulisan Anda sendiri.');
	await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}
