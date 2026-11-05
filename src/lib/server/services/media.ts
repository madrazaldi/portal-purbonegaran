import type { Album, MediaItem, Paginated } from '#lib/types.js';
import { youtubeThumb } from '#lib/youtube.js';
import { slugify } from '#lib/richtext.js';
import { badRequest, notFound } from '../http.js';
import { rateLimit } from '../auth.js';

export interface MediaRow {
	id: number;
	kind: 'image' | 'youtube';
	r2_key: string | null;
	thumb_key: string | null;
	youtube_id: string | null;
	width: number | null;
	height: number | null;
	size_bytes: number | null;
	caption: string;
	album_id: number | null;
	in_gallery: number;
	uploaded_by: number | null;
	created_at: string;
}

export const mediaUrl = (key: string) => `/media/${key}`;

export function toMedia(r: MediaRow): MediaItem {
	const isImage = r.kind === 'image';
	return {
		id: r.id,
		kind: r.kind,
		url: isImage && r.r2_key ? mediaUrl(r.r2_key) : null,
		thumbUrl: isImage
			? mediaUrl(r.thumb_key ?? r.r2_key ?? '')
			: youtubeThumb(r.youtube_id ?? ''),
		youtubeId: r.youtube_id,
		width: r.width,
		height: r.height,
		caption: r.caption,
		albumId: r.album_id,
		inGallery: r.in_gallery === 1,
		createdAt: r.created_at
	};
}

export async function getMediaRow(db: D1Database, id: number) {
	return db.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<MediaRow>();
}

export async function getMedia(db: D1Database, id: number | null): Promise<MediaItem | null> {
	if (!id) return null;
	const row = await getMediaRow(db, id);
	return row ? toMedia(row) : null;
}

export async function getMediaMany(db: D1Database, ids: number[]): Promise<Map<number, MediaItem>> {
	const map = new Map<number, MediaItem>();
	const unique = [...new Set(ids.filter(Boolean))];
	if (!unique.length) return map;
	const { results } = await db
		.prepare(`SELECT * FROM media WHERE id IN (${unique.map(() => '?').join(',')})`)
		.bind(...unique)
		.all<MediaRow>();
	for (const r of results) map.set(r.id, toMedia(r));
	return map;
}

export async function listMedia(
	db: D1Database,
	opts: { page?: number; perPage?: number; albumId?: number | null; galleryOnly?: boolean }
): Promise<Paginated<MediaItem>> {
	const perPage = Math.min(opts.perPage ?? 24, 100);
	const page = Math.max(1, opts.page ?? 1);
	const where: string[] = [];
	const args: unknown[] = [];
	if (opts.galleryOnly) where.push('in_gallery = 1');
	if (opts.albumId) {
		where.push('album_id = ?');
		args.push(opts.albumId);
	}
	const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
	const total =
		(await db
			.prepare(`SELECT COUNT(*) AS n FROM media ${w}`)
			.bind(...args)
			.first<number>('n')) ?? 0;
	const { results } = await db
		.prepare(`SELECT * FROM media ${w} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
		.bind(...args, perPage, (page - 1) * perPage)
		.all<MediaRow>();
	return {
		items: results.map(toMedia),
		page,
		total,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

// Free-tier guard rails (R2 free: 10 GB storage, 1M writes/month). Each upload is
// two writes (photo + thumbnail); deletes are free.
export const STORAGE_LIMIT_BYTES = 8 * 1024 ** 3;
export const MONTHLY_UPLOAD_LIMIT = 20_000;

export async function storageUsed(db: D1Database): Promise<number> {
	return (
		(await db
			.prepare(`SELECT COALESCE(SUM(COALESCE(size_bytes, 0) + thumb_bytes), 0) AS n FROM media WHERE kind = 'image'`)
			.first<number>('n')) ?? 0
	);
}
const MAX_THUMB_BYTES = 1024 * 1024;

type ImageType = 'image/webp' | 'image/jpeg' | 'image/png';

/** Detects the real image type from the file's first bytes (never trust the declared type). */
export async function sniffImage(file: Blob): Promise<ImageType | null> {
	const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
	if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
	const ascii = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
	if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
	return null;
}

function extFor(type: ImageType) {
	return type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';
}

/**
 * Stores an image (already resized/compressed in the browser) and its thumbnail in R2.
 * The browser does the compression so uploads from phones stay small on mobile data.
 */
export async function createImage(
	db: D1Database,
	bucket: R2Bucket,
	input: {
		file: File;
		thumb: File | null;
		width: number | null;
		height: number | null;
		caption: string;
		albumId: number | null;
		inGallery: boolean;
		userId: number;
	}
): Promise<MediaItem> {
	const { file, thumb } = input;
	if (file.size > MAX_IMAGE_BYTES) throw badRequest('Ukuran foto terlalu besar (maks. 6 MB).');
	const type = await sniffImage(file);
	if (!type) throw badRequest('Format foto harus JPG, PNG, atau WebP.');
	const thumbType = thumb ? await sniffImage(thumb) : null;
	if (thumb && (!thumbType || thumb.size > MAX_THUMB_BYTES)) throw badRequest('Thumbnail tidak valid.');
	if (input.albumId) await assertAlbum(db, input.albumId);

	const incoming = file.size + (thumb?.size ?? 0);
	if ((await storageUsed(db)) + incoming > STORAGE_LIMIT_BYTES) {
		throw badRequest(
			'Penyimpanan foto sudah hampir penuh (batas 8 GB). Hapus foto lama yang tidak diperlukan, atau hubungi pengelola website.'
		);
	}
	const month = new Date().toISOString().slice(0, 7);
	await rateLimit(
		db,
		`r2-uploads:${month}`,
		MONTHLY_UPLOAD_LIMIT,
		32 * 86400,
		'Batas unggahan foto bulan ini sudah tercapai. Coba lagi bulan depan.'
	);

	const now = new Date();
	const base = `img/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}`;
	const key = `${base}.${extFor(type)}`;
	const thumbKey = thumb && thumbType ? `${base}-thumb.${extFor(thumbType)}` : null;
	const httpMetadata = (contentType: string) => ({
		contentType,
		cacheControl: 'public, max-age=31536000, immutable'
	});

	await bucket.put(key, await file.arrayBuffer(), { httpMetadata: httpMetadata(type) });
	if (thumb && thumbKey && thumbType) {
		await bucket.put(thumbKey, await thumb.arrayBuffer(), { httpMetadata: httpMetadata(thumbType) });
	}

	const row = await db
		.prepare(
			`INSERT INTO media (kind, r2_key, thumb_key, width, height, size_bytes, thumb_bytes, caption, album_id, in_gallery, uploaded_by)
			 VALUES ('image', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
		)
		.bind(
			key,
			thumbKey,
			input.width,
			input.height,
			file.size,
			thumbKey ? (thumb?.size ?? 0) : 0,
			input.caption,
			input.albumId,
			input.inGallery ? 1 : 0,
			input.userId
		)
		.first<MediaRow>();
	return toMedia(row!);
}

export async function createYoutube(
	db: D1Database,
	input: {
		youtubeId: string;
		caption: string;
		albumId: number | null;
		inGallery: boolean;
		userId: number;
	}
): Promise<MediaItem> {
	if (input.albumId) await assertAlbum(db, input.albumId);
	const row = await db
		.prepare(
			`INSERT INTO media (kind, youtube_id, caption, album_id, in_gallery, uploaded_by)
			 VALUES ('youtube', ?, ?, ?, ?, ?) RETURNING *`
		)
		.bind(input.youtubeId, input.caption, input.albumId, input.inGallery ? 1 : 0, input.userId)
		.first<MediaRow>();
	return toMedia(row!);
}

export async function updateMedia(
	db: D1Database,
	id: number,
	input: { caption: string; albumId: number | null; inGallery: boolean }
): Promise<MediaItem> {
	if (input.albumId) await assertAlbum(db, input.albumId);
	const row = await db
		.prepare(
			'UPDATE media SET caption = ?, album_id = ?, in_gallery = ? WHERE id = ? RETURNING *'
		)
		.bind(input.caption, input.albumId, input.inGallery ? 1 : 0, id)
		.first<MediaRow>();
	if (!row) throw notFound();
	return toMedia(row);
}

export async function deleteMedia(db: D1Database, bucket: R2Bucket, id: number) {
	const row = await getMediaRow(db, id);
	if (!row) throw notFound();
	await db.batch([
		db.prepare('UPDATE albums SET cover_media_id = NULL WHERE cover_media_id = ?').bind(id),
		db
			.prepare(`UPDATE settings SET value = '' WHERE key = 'hero_media_id' AND value = ?`)
			.bind(String(id)),
		db.prepare('DELETE FROM media WHERE id = ?').bind(id)
	]);
	const keys = [row.r2_key, row.thumb_key].filter((k): k is string => !!k);
	if (keys.length) await bucket.delete(keys);
}

// ------------------------------------------------------------------- albums

interface AlbumRow {
	id: number;
	slug: string;
	title: string;
	description: string;
	event_date: string | null;
	cover_media_id: number | null;
	count: number;
	first_media_id: number | null;
}

const ALBUM_SELECT = `
	SELECT a.*,
		(SELECT COUNT(*) FROM media m WHERE m.album_id = a.id AND m.in_gallery = 1) AS count,
		(SELECT m.id FROM media m WHERE m.album_id = a.id AND m.in_gallery = 1 ORDER BY m.created_at DESC LIMIT 1) AS first_media_id
	FROM albums a`;

async function toAlbums(db: D1Database, rows: AlbumRow[]): Promise<Album[]> {
	const covers = await getMediaMany(
		db,
		rows.map((r) => r.cover_media_id ?? r.first_media_id ?? 0)
	);
	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.title,
		description: r.description,
		eventDate: r.event_date,
		cover: covers.get(r.cover_media_id ?? r.first_media_id ?? 0) ?? null,
		count: r.count
	}));
}

export async function listAlbums(db: D1Database): Promise<Album[]> {
	const { results } = await db
		.prepare(`${ALBUM_SELECT} ORDER BY COALESCE(a.event_date, a.created_at) DESC, a.id DESC`)
		.all<AlbumRow>();
	return toAlbums(db, results);
}

export async function getAlbumBySlug(db: D1Database, slug: string): Promise<Album | null> {
	const row = await db.prepare(`${ALBUM_SELECT} WHERE a.slug = ?`).bind(slug).first<AlbumRow>();
	return row ? (await toAlbums(db, [row]))[0] : null;
}

async function assertAlbum(db: D1Database, id: number) {
	const found = await db.prepare('SELECT id FROM albums WHERE id = ?').bind(id).first();
	if (!found) throw badRequest('Album tidak ditemukan.', { albumId: 'Album tidak ditemukan.' });
}

async function uniqueAlbumSlug(db: D1Database, title: string, exceptId?: number) {
	const base = slugify(title);
	for (let i = 1; ; i++) {
		const slug = i === 1 ? base : `${base}-${i}`;
		const hit = await db
			.prepare('SELECT id FROM albums WHERE slug = ? AND id != ?')
			.bind(slug, exceptId ?? 0)
			.first();
		if (!hit) return slug;
	}
}

export interface AlbumInput {
	title: string;
	description: string;
	eventDate: string | null;
	coverMediaId: number | null;
}

export async function createAlbum(db: D1Database, input: AlbumInput, userId: number) {
	const slug = await uniqueAlbumSlug(db, input.title);
	await db
		.prepare(
			`INSERT INTO albums (slug, title, description, event_date, cover_media_id, created_by)
			 VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(slug, input.title, input.description, input.eventDate, input.coverMediaId, userId)
		.run();
	return (await getAlbumBySlug(db, slug))!;
}

export async function updateAlbum(db: D1Database, id: number, input: AlbumInput) {
	const slug = await uniqueAlbumSlug(db, input.title, id);
	const res = await db
		.prepare(
			`UPDATE albums SET slug = ?, title = ?, description = ?, event_date = ?, cover_media_id = ? WHERE id = ?`
		)
		.bind(slug, input.title, input.description, input.eventDate, input.coverMediaId, id)
		.run();
	if (!res.meta.changes) throw notFound();
	return (await getAlbumBySlug(db, slug))!;
}

/** Deletes the album only; its photos stay in the gallery without an album. */
export async function deleteAlbum(db: D1Database, id: number) {
	await db.batch([
		db.prepare('UPDATE media SET album_id = NULL WHERE album_id = ?').bind(id),
		db.prepare('DELETE FROM albums WHERE id = ?').bind(id)
	]);
}
