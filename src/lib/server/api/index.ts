// JSON API at /api/*. Used by the admin panel today and by the Android app
// later (send `Authorization: Bearer <token>` from POST /api/auth/login with
// {"client":"app"}). Public pages render server-side from the same services.

import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { env } from 'cloudflare:workers';
import type { EventCategory, PostCategory, PostStatus, Role, SessionUser } from '#lib/types.js';
import { EVENT_CATEGORIES, PHOTO_RULES } from '#lib/types.js';
import { addDays, isDate, isTime, todayWib, diffDays } from '#lib/dates.js';
import { parseYoutubeId } from '#lib/youtube.js';
import {
	HttpError,
	Validator,
	badRequest,
	forbidden,
	notFound,
	unauthorized
} from '../http.js';
import {
	SESSION_COOKIE,
	SESSION_MAX_AGE,
	checkCredentials,
	clearRateLimit,
	createSession,
	deleteSession,
	hasRole,
	rateLimit,
	readToken,
	userFromToken
} from '../auth.js';
import { PASSWORD_MIN_LENGTH, sha256, verifyPassword } from '../crypto.js';
import * as posts from '../services/posts.js';
import * as events from '../services/events.js';
import * as media from '../services/media.js';
import * as site from '../services/site.js';
import * as users from '../services/users.js';
import * as messages from '../services/messages.js';

type Vars = {
	user: SessionUser | null;
	token: string | null;
};
type C = Context<{ Variables: Vars }>;

const db = () => env.DB;

const app = new Hono<{ Variables: Vars }>().basePath('/api');

// ------------------------------------------------------------ middleware

app.use('*', async (c, next) => {
	const found = readToken(c.req.raw, getCookie(c, SESSION_COOKIE));
	let user: SessionUser | null = null;
	if (found) {
		user = await userFromToken(db(), found.token);
		// Cookie-authenticated writes must come from our own pages (CSRF guard).
		// Bearer tokens are never sent automatically by browsers, so they are exempt.
		if (user && found.via === 'cookie' && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
			const origin = c.req.header('origin');
			if (!origin || origin !== new URL(c.req.url).origin) {
				throw forbidden('Permintaan ditolak (asal tidak dikenal). Muat ulang halaman.');
			}
		}
	}
	c.set('user', user);
	c.set('token', user && found ? found.token : null);
	await next();
	if (!c.res.headers.has('cache-control')) {
		c.res.headers.set('cache-control', 'no-store');
	}
});

app.onError((err, c) => {
	if (err instanceof HttpError) {
		return c.json({ error: err.message, fields: err.fields }, err.status as 400);
	}
	console.error(JSON.stringify({ msg: 'api error', path: c.req.path, error: String(err), stack: (err as Error).stack }));
	return c.json({ error: 'Terjadi kesalahan di server. Coba lagi sebentar.' }, 500);
});

app.notFound((c) => c.json({ error: 'Alamat API tidak ditemukan.' }, 404));

function requireUser(c: C, ...roles: Role[]): SessionUser {
	const user = c.get('user');
	if (!user) throw unauthorized();
	if (roles.length && !hasRole(user, ...roles)) throw forbidden();
	return user;
}

const ADMINS: Role[] = ['admin_utama', 'admin_konten'];

function idParam(c: C, name = 'id'): number {
	const n = Number(c.req.param(name));
	if (!Number.isInteger(n) || n <= 0) throw notFound();
	return n;
}

async function body(c: C) {
	try {
		return Validator.from(await c.req.json());
	} catch (e) {
		if (e instanceof HttpError) throw e;
		throw badRequest('Data yang dikirim tidak valid.');
	}
}

function clientIp(c: C) {
	return c.req.header('cf-connecting-ip') ?? 'local';
}

function publicCache(c: C, seconds = 60) {
	c.header('cache-control', `public, max-age=${seconds}`);
}

// ---------------------------------------------------------------- public

app.get('/site', async (c) => {
	publicCache(c);
	const [settings, rts, links] = await Promise.all([
		site.getPublicSettings(db()),
		site.listRts(db()),
		site.listLinks(db(), true)
	]);
	return c.json({ settings, rts, links });
});

app.get('/posts', async (c) => {
	publicCache(c);
	const category = c.req.query('category');
	return c.json(
		await posts.listPublished(db(), {
			page: Number(c.req.query('page')) || 1,
			perPage: Number(c.req.query('perPage')) || 9,
			category: category === 'berita' || category === 'pengumuman' ? category : null
		})
	);
});

app.get('/posts/:slug', async (c) => {
	publicCache(c);
	const post = await posts.getPublishedBySlug(db(), c.req.param('slug'));
	if (!post) throw notFound('Berita tidak ditemukan.');
	return c.json(post);
});

app.get('/events', async (c) => {
	publicCache(c);
	const from = c.req.query('from') ?? todayWib();
	const to = c.req.query('to') ?? addDays(from, 31);
	if (!isDate(from) || !isDate(to) || to < from) throw badRequest('Rentang tanggal tidak valid.');
	if (diffDays(from, to) > 400) throw badRequest('Rentang tanggal maksimal 400 hari.');
	const cat = c.req.query('category');
	const category = EVENT_CATEGORIES.some((x) => x.value === cat) ? (cat as EventCategory) : null;
	return c.json({ from, to, items: await events.listOccurrences(db(), from, to, category) });
});

app.get('/albums', async (c) => {
	publicCache(c);
	return c.json(await media.listAlbums(db()));
});

app.get('/gallery', async (c) => {
	publicCache(c);
	const albumId = Number(c.req.query('album')) || null;
	return c.json(
		await media.listMedia(db(), { page: Number(c.req.query('page')) || 1, albumId, galleryOnly: true })
	);
});

app.get('/pages/:slug', async (c) => {
	publicCache(c);
	const page = await site.getPage(db(), c.req.param('slug'));
	if (!page) throw notFound('Halaman tidak ditemukan.');
	return c.json(page);
});

app.post('/messages', async (c) => {
	const v = await body(c);
	// Honeypot: real people never see or fill this field.
	if (v.string('website', 'website')) return c.json({ ok: true });
	const name = v.string('name', 'Nama', { required: true, max: 100 });
	const contact = v.string('contact', 'Kontak', { max: 120 });
	const text = v.string('body', 'Pesan', { required: true, min: 5, max: 3000 });
	v.done();
	await rateLimit(db(), `msg:${await sha256(clientIp(c))}`, 5, 3600);
	await messages.createMessage(db(), { name, contact, body: text });
	return c.json({ ok: true }, 201);
});

// ------------------------------------------------------------------ auth

app.post('/auth/login', async (c) => {
	const v = await body(c);
	const username = v.string('username', 'Nama pengguna', { required: true, max: 64 });
	const password = v.string('password', 'Kata sandi', { required: true, max: 200, trim: false });
	const client = v.oneOf('client', 'Klien', ['web', 'app'] as const, 'web');
	v.done();

	const ipKey = `login-ip:${await sha256(clientIp(c))}`;
	const userKey = `login-user:${username.toLowerCase()}`;
	await rateLimit(db(), ipKey, 30, 15 * 60);
	await rateLimit(db(), userKey, 8, 15 * 60);

	const userId = await checkCredentials(db(), username, password);
	if (!userId) throw unauthorized('Nama pengguna atau kata sandi salah.');
	await clearRateLimit(db(), userKey);

	const { token, expires } = await createSession(db(), userId, client);
	const user = await users.getUser(db(), userId);
	if (client === 'app') return c.json({ user, token, expiresAt: expires });

	setCookie(c, SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: new URL(c.req.url).protocol === 'https:',
		sameSite: 'Lax',
		maxAge: SESSION_MAX_AGE
	});
	return c.json({ user });
});

app.post('/auth/logout', async (c) => {
	const token = c.get('token');
	if (token) await deleteSession(db(), token);
	deleteCookie(c, SESSION_COOKIE, { path: '/' });
	return c.json({ ok: true });
});

app.get('/auth/me', (c) => c.json({ user: requireUser(c) }));

app.post('/auth/password', async (c) => {
	const user = requireUser(c);
	const v = await body(c);
	const current = v.string('currentPassword', 'Kata sandi lama', { required: true, trim: false, max: 200 });
	const next = v.string('newPassword', 'Kata sandi baru', {
		required: true,
		trim: false,
		min: PASSWORD_MIN_LENGTH,
		max: 200
	});
	v.done();
	const row = await db()
		.prepare('SELECT password_hash FROM users WHERE id = ?')
		.bind(user.id)
		.first<string>('password_hash');
	if (!row || !(await verifyPassword(current, row))) {
		throw badRequest('Kata sandi lama salah.', { currentPassword: 'Kata sandi lama salah.' });
	}
	await users.changeOwnPassword(db(), user.id, next, c.get('token')!);
	return c.json({ ok: true });
});

// ------------------------------------------------------------ admin: posts

const admin = new Hono<{ Variables: Vars }>();

admin.use('*', async (c, next) => {
	requireUser(c, ...ADMINS);
	await next();
});

admin.get('/dashboard', async (c) => {
	const user = requireUser(c);
	const [pending, unread, next] = await Promise.all([
		posts.countPending(db()),
		hasRole(user, 'admin_utama') ? messages.countUnread(db()) : Promise.resolve(0),
		events.upcoming(db(), 5, 30)
	]);
	return c.json({ pendingPosts: pending, unreadMessages: unread, upcoming: next });
});

function readPost(v: Validator): posts.PostInput & { intent: posts.PostIntent } {
	const input = {
		title: v.string('title', 'Judul', { required: true, max: 160 }),
		category: v.oneOf<PostCategory>('category', 'Kategori', ['berita', 'pengumuman'], 'berita'),
		body: v.string('body', 'Isi', { max: 20_000 }),
		mediaIds: v.intArray('mediaIds', 'Foto', 30),
		coverMediaId: v.int('coverMediaId', 'Foto sampul', { min: 1 }),
		intent: v.oneOf<posts.PostIntent>('intent', 'Aksi', ['draft', 'publish'], 'draft')
	};
	if (input.intent === 'publish' && !input.body) v.fail('body', 'Isi berita wajib diisi.');
	v.done();
	return input;
}

admin.get('/posts', async (c) => {
	const status = c.req.query('status') as PostStatus | undefined;
	return c.json(
		await posts.listAdmin(db(), {
			page: Number(c.req.query('page')) || 1,
			status: status && ['draft', 'pending', 'published', 'rejected'].includes(status) ? status : null
		})
	);
});

admin.post('/posts', async (c) => {
	const user = requireUser(c);
	const { intent, ...input } = readPost(await body(c));
	return c.json(await posts.createPost(db(), user, input, intent), 201);
});

admin.get('/posts/:id', async (c) => c.json(await posts.getAdmin(db(), idParam(c))));

admin.put('/posts/:id', async (c) => {
	const user = requireUser(c);
	const { intent, ...input } = readPost(await body(c));
	return c.json(await posts.updatePost(db(), user, idParam(c), input, intent));
});

admin.post('/posts/:id/review', async (c) => {
	requireUser(c, 'admin_utama');
	const v = await body(c);
	const decision = v.oneOf('decision', 'Keputusan', ['approve', 'reject'] as const);
	const note = v.string('note', 'Catatan', { max: 500 });
	if (decision === 'reject' && !note) v.fail('note', 'Tuliskan alasan agar penulis bisa memperbaiki.');
	v.done();
	return c.json(await posts.reviewPost(db(), idParam(c), decision, note));
});

admin.delete('/posts/:id', async (c) => {
	await posts.deletePost(db(), requireUser(c), idParam(c));
	return c.json({ ok: true });
});

// ------------------------------------------------------------ admin: media

admin.get('/media', async (c) => {
	const albumId = Number(c.req.query('album')) || null;
	return c.json(
		await media.listMedia(db(), { page: Number(c.req.query('page')) || 1, perPage: 30, albumId })
	);
});

admin.get('/storage', async (c) =>
	c.json({ usedBytes: await media.storageUsed(db()), limitBytes: media.STORAGE_LIMIT_BYTES })
);

admin.get('/media/:id', async (c) => {
	const item = await media.getMedia(db(), idParam(c));
	if (!item) throw notFound('Foto tidak ditemukan.');
	return c.json(item);
});

admin.post('/media', async (c) => {
	const user = requireUser(c);
	const form = await c.req.parseBody();
	const file = form.file;
	const thumb = form.thumb;
	if (!(file instanceof File)) throw badRequest('Pilih foto terlebih dahulu.');
	const v = new Validator(form as Record<string, unknown>);
	const width = v.int('width', 'Lebar', { min: 1, max: 10_000 });
	const height = v.int('height', 'Tinggi', { min: 1, max: 10_000 });
	const caption = v.string('caption', 'Keterangan', { max: 300 });
	const albumId = v.int('albumId', 'Album', { min: 1 });
	const inGallery = v.bool('inGallery', true);
	if (!v.bool('consent')) v.fail('consent', 'Centang pernyataan aturan foto terlebih dahulu.');
	v.done();
	return c.json(
		await media.createImage(db(), env.MEDIA, {
			file,
			thumb: thumb instanceof File ? thumb : null,
			width,
			height,
			caption,
			albumId,
			inGallery,
			userId: user.id
		}),
		201
	);
});

admin.post('/media/youtube', async (c) => {
	const user = requireUser(c);
	const v = await body(c);
	const url = v.string('url', 'Tautan YouTube', { required: true, max: 300 });
	const caption = v.string('caption', 'Keterangan', { max: 300 });
	const albumId = v.int('albumId', 'Album', { min: 1 });
	const inGallery = v.bool('inGallery', true);
	const youtubeId = url ? parseYoutubeId(url) : null;
	if (url && !youtubeId) v.fail('url', 'Tautan YouTube tidak dikenali.');
	v.done();
	return c.json(
		await media.createYoutube(db(), { youtubeId: youtubeId!, caption, albumId, inGallery, userId: user.id }),
		201
	);
});

async function assertCanManageMedia(c: C, id: number) {
	const user = requireUser(c);
	const row = await media.getMediaRow(db(), id);
	if (!row) throw notFound('Foto tidak ditemukan.');
	if (!hasRole(user, 'admin_utama') && row.uploaded_by !== user.id) {
		throw forbidden('Anda hanya bisa mengubah foto yang Anda unggah.');
	}
}

admin.put('/media/:id', async (c) => {
	const id = idParam(c);
	await assertCanManageMedia(c, id);
	const v = await body(c);
	const input = {
		caption: v.string('caption', 'Keterangan', { max: 300 }),
		albumId: v.int('albumId', 'Album', { min: 1 }),
		inGallery: v.bool('inGallery', true)
	};
	v.done();
	return c.json(await media.updateMedia(db(), id, input));
});

admin.delete('/media/:id', async (c) => {
	const id = idParam(c);
	await assertCanManageMedia(c, id);
	await media.deleteMedia(db(), env.MEDIA, id);
	return c.json({ ok: true });
});

function readAlbum(v: Validator): media.AlbumInput {
	const input = {
		title: v.string('title', 'Judul album', { required: true, max: 120 }),
		description: v.string('description', 'Keterangan', { max: 1000 }),
		eventDate: v.optionalString('eventDate', 'Tanggal', 10),
		coverMediaId: v.int('coverMediaId', 'Sampul', { min: 1 })
	};
	if (input.eventDate && !isDate(input.eventDate)) v.fail('eventDate', 'Tanggal tidak valid.');
	v.done();
	return input;
}

admin.get('/albums', async (c) => c.json(await media.listAlbums(db())));
admin.post('/albums', async (c) =>
	c.json(await media.createAlbum(db(), readAlbum(await body(c)), requireUser(c).id), 201)
);
admin.put('/albums/:id', async (c) =>
	c.json(await media.updateAlbum(db(), idParam(c), readAlbum(await body(c))))
);
admin.delete('/albums/:id', async (c) => {
	requireUser(c, 'admin_utama');
	await media.deleteAlbum(db(), idParam(c));
	return c.json({ ok: true });
});

// ----------------------------------------------------------- admin: events

function readEvent(v: Validator): events.EventInput {
	const recurrence = v.oneOf('recurrence', 'Pengulangan', [
		'none',
		'weekly',
		'monthly_date',
		'monthly_nth_weekday'
	] as const, 'none');
	const e: events.EventInput = {
		title: v.string('title', 'Nama kegiatan', { required: true, max: 140 }),
		description: v.string('description', 'Keterangan', { max: 3000 }),
		category: v.oneOf<EventCategory>(
			'category',
			'Jenis kegiatan',
			EVENT_CATEGORIES.map((x) => x.value),
			'lainnya'
		),
		location: v.string('location', 'Tempat', { max: 140 }),
		rtNumber: v.int('rtNumber', 'RT', { min: 1, max: 999 }),
		startDate: v.string('startDate', 'Tanggal', { required: true, max: 10 }),
		endDate: v.optionalString('endDate', 'Tanggal selesai', 10),
		startTime: v.optionalString('startTime', 'Jam mulai', 5),
		endTime: v.optionalString('endTime', 'Jam selesai', 5),
		recurrence,
		recurrenceInterval: v.int('recurrenceInterval', 'Interval', { min: 1, max: 12 }) ?? 1,
		recurrenceUntil: v.optionalString('recurrenceUntil', 'Berulang sampai', 10)
	};
	if (e.startDate && !isDate(e.startDate)) v.fail('startDate', 'Tanggal tidak valid.');
	if (e.endDate && (!isDate(e.endDate) || e.endDate < e.startDate)) {
		v.fail('endDate', 'Tanggal selesai harus sama atau setelah tanggal mulai.');
	}
	if (e.endDate && isDate(e.endDate) && isDate(e.startDate) && diffDays(e.startDate, e.endDate) > 31) {
		v.fail('endDate', 'Kegiatan maksimal 31 hari.');
	}
	if (e.startTime && !isTime(e.startTime)) v.fail('startTime', 'Jam tidak valid (contoh 07:30).');
	if (e.endTime && !isTime(e.endTime)) v.fail('endTime', 'Jam tidak valid (contoh 09:00).');
	if (e.endTime && !e.startTime) v.fail('startTime', 'Isi jam mulai terlebih dahulu.');
	if (e.startTime && e.endTime && isTime(e.endTime) && e.endTime <= e.startTime && !e.endDate) {
		v.fail('endTime', 'Jam selesai harus setelah jam mulai.');
	}
	if (e.recurrenceUntil && (!isDate(e.recurrenceUntil) || e.recurrenceUntil < e.startDate)) {
		v.fail('recurrenceUntil', 'Tanggal akhir pengulangan tidak valid.');
	}
	if (recurrence === 'none') {
		e.recurrenceInterval = 1;
		e.recurrenceUntil = null;
	}
	v.done();
	return e;
}

admin.get('/events', async (c) => c.json(await events.listEvents(db())));
admin.get('/events/:id', async (c) => c.json(await events.getEvent(db(), idParam(c))));
admin.post('/events', async (c) =>
	c.json(await events.createEvent(db(), readEvent(await body(c)), requireUser(c).id), 201)
);
admin.put('/events/:id', async (c) =>
	c.json(await events.updateEvent(db(), idParam(c), readEvent(await body(c))))
);
admin.delete('/events/:id', async (c) => {
	await events.deleteEvent(db(), idParam(c));
	return c.json({ ok: true });
});

// ---------------------------------------------- admin utama: site & people

// These sections are for the Admin Utama only.
for (const prefix of ['/settings', '/rts', '/pages', '/links', '/messages', '/users']) {
	const guard = async (c: C, next: () => Promise<void>) => {
		requireUser(c, 'admin_utama');
		await next();
	};
	admin.use(prefix, guard);
	admin.use(`${prefix}/*`, guard);
}
const utama = admin;

utama.get('/settings', async (c) => c.json(await site.getAdminSettings(db())));

utama.put('/settings', async (c) => {
	const v = await body(c);
	const s = {
		siteName: v.string('siteName', 'Nama situs', { required: true, max: 80 }),
		tagline: v.string('tagline', 'Keterangan singkat', { max: 160 }),
		welcomeTitle: v.string('welcomeTitle', 'Judul sambutan', { max: 120 }),
		welcomeText: v.string('welcomeText', 'Sambutan', { max: 2000 }),
		welcomeBy: v.string('welcomeBy', 'Nama penyambut', { max: 120 }),
		heroMediaId: v.int('heroMediaId', 'Foto utama', { min: 1 }),
		address: v.string('address', 'Alamat', { max: 300 }),
		contactWhatsapp: v.string('contactWhatsapp', 'Nomor WhatsApp', { max: 20 }),
		contactEmail: v.string('contactEmail', 'Email', { max: 120 }),
		contactNote: v.string('contactNote', 'Catatan kontak', { max: 500 }),
		mapLat: v.number('mapLat', 'Lintang', { min: -90, max: 90 }),
		mapLng: v.number('mapLng', 'Bujur', { min: -180, max: 180 }),
		requireApproval: v.bool('requireApproval'),
		photoRule: v.oneOf('photoRule', 'Aturan foto', PHOTO_RULES.map((r) => r.value), 'consent')
	};
	if (s.contactWhatsapp && !/^(\+?62|0)8\d{7,12}$/.test(s.contactWhatsapp.replace(/[\s-]/g, ''))) {
		v.fail('contactWhatsapp', 'Nomor WhatsApp tidak valid (contoh 0812xxxxxxx).');
	}
	if (s.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contactEmail)) {
		v.fail('contactEmail', 'Alamat email tidak valid.');
	}
	if (s.heroMediaId) {
		const hero = await media.getMedia(db(), s.heroMediaId);
		if (!hero || hero.kind !== 'image') v.fail('heroMediaId', 'Foto utama tidak ditemukan.');
	}
	v.done();
	s.contactWhatsapp = s.contactWhatsapp.replace(/[\s-]/g, '');
	await site.saveSettings(db(), s);
	return c.json(await site.getAdminSettings(db()));
});

utama.get('/rts', async (c) => c.json(await site.listRts(db())));
utama.put('/rts/:id', async (c) => {
	const v = await body(c);
	const input = {
		ketuaName: v.string('ketuaName', 'Nama ketua RT', { max: 100 }),
		area: v.string('area', 'Wilayah', { max: 500 }),
		notes: v.string('notes', 'Catatan', { max: 500 })
	};
	v.done();
	return c.json(await site.updateRt(db(), idParam(c), input));
});

utama.get('/pages', async (c) => c.json(await site.listPages(db())));
utama.put('/pages/:slug', async (c) => {
	const slug = c.req.param('slug');
	if (!(site.PAGE_SLUGS as readonly string[]).includes(slug)) throw notFound('Halaman tidak ditemukan.');
	const v = await body(c);
	const input = {
		title: v.string('title', 'Judul', { required: true, max: 120 }),
		body: v.string('body', 'Isi', { max: 30_000 })
	};
	v.done();
	return c.json(await site.savePage(db(), slug as site.PageSlug, input, requireUser(c).id));
});

function readLink(v: Validator): site.LinkInput {
	const l = {
		title: v.string('title', 'Nama aplikasi', { required: true, max: 80 }),
		description: v.string('description', 'Keterangan', { max: 300 }),
		url: v.string('url', 'Alamat', { max: 500 }),
		sortOrder: v.int('sortOrder', 'Urutan', { min: 0, max: 999 }) ?? 0,
		active: v.bool('active', true)
	};
	if (l.url && !/^https:\/\/[^\s]+$/.test(l.url) && !/^\/[^\s]*$/.test(l.url)) {
		v.fail('url', 'Alamat harus diawali https:// (atau / untuk halaman di situs ini).');
	}
	v.done();
	return l;
}

utama.get('/links', async (c) => c.json(await site.listLinks(db(), false)));
utama.post('/links', async (c) => c.json(await site.createLink(db(), readLink(await body(c))), 201));
utama.put('/links/:id', async (c) => c.json(await site.updateLink(db(), idParam(c), readLink(await body(c)))));
utama.delete('/links/:id', async (c) => {
	await site.deleteLink(db(), idParam(c));
	return c.json({ ok: true });
});

utama.get('/messages', async (c) => c.json(await messages.listMessages(db(), Number(c.req.query('page')) || 1)));
utama.put('/messages/:id', async (c) => {
	const v = await body(c);
	const read = v.bool('read', true);
	await messages.markMessage(db(), idParam(c), read);
	return c.json({ ok: true });
});
utama.delete('/messages/:id', async (c) => {
	await messages.deleteMessage(db(), idParam(c));
	return c.json({ ok: true });
});

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

utama.get('/users', async (c) => c.json(await users.listUsers(db())));
utama.post('/users', async (c) => {
	const v = await body(c);
	const input = {
		username: v.string('username', 'Nama pengguna', { required: true, max: 32 }).toLowerCase(),
		name: v.string('name', 'Nama lengkap', { required: true, max: 100 }),
		password: v.string('password', 'Kata sandi', {
			required: true,
			trim: false,
			min: PASSWORD_MIN_LENGTH,
			max: 200
		}),
		role: v.oneOf<Role>('role', 'Peran', ['admin_konten', 'admin_utama'], 'admin_konten')
	};
	if (input.username && !USERNAME_RE.test(input.username)) {
		v.fail('username', 'Gunakan 3–32 huruf kecil, angka, titik, atau garis bawah.');
	}
	v.done();
	return c.json(await users.createUser(db(), input), 201);
});
utama.put('/users/:id', async (c) => {
	const v = await body(c);
	const password = v.string('password', 'Kata sandi baru', { trim: false, max: 200 });
	if (password && password.length < PASSWORD_MIN_LENGTH) {
		v.fail('password', `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`);
	}
	const input = {
		name: v.string('name', 'Nama lengkap', { required: true, max: 100 }),
		role: v.oneOf<Role>('role', 'Peran', ['admin_konten', 'admin_utama']),
		active: v.bool('active', true),
		password: password || null
	};
	v.done();
	return c.json(await users.updateUser(db(), requireUser(c), idParam(c), input));
});
utama.delete('/users/:id', async (c) => {
	await users.deleteUser(db(), requireUser(c), idParam(c));
	return c.json({ ok: true });
});

app.route('/admin', admin);

export default app;
