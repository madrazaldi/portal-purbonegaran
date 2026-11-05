-- Portal Kampung Purbonegaran (RW 11) — skema awal.
-- Waktu disimpan sebagai teks ISO 8601 UTC. Tanggal kegiatan disimpan sebagai
-- tanggal lokal WIB (YYYY-MM-DD) karena kegiatan kampung selalu dalam WIB.

CREATE TABLE users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE COLLATE NOCASE,
	name TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	active INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Satu akun bisa punya beberapa peran. `scope` dipakai modul berikutnya
-- (mis. ketua RT hanya melihat RT-nya: role='ketua_rt', scope='49').
CREATE TABLE user_roles (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role TEXT NOT NULL,
	scope TEXT NOT NULL DEFAULT '',
	PRIMARY KEY (user_id, role, scope)
);

-- Hanya hash SHA-256 dari token sesi yang disimpan.
CREATE TABLE sessions (
	token_hash TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	client TEXT NOT NULL DEFAULT 'web',
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE rts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	number INTEGER NOT NULL UNIQUE,
	ketua_name TEXT NOT NULL DEFAULT '',
	area TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT '',
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE albums (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	event_date TEXT,
	cover_media_id INTEGER,
	created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- kind='image': berkas di R2 (key + thumb_key). kind='youtube': hanya youtube_id.
CREATE TABLE media (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	kind TEXT NOT NULL CHECK (kind IN ('image', 'youtube')),
	r2_key TEXT,
	thumb_key TEXT,
	youtube_id TEXT,
	width INTEGER,
	height INTEGER,
	size_bytes INTEGER,
	caption TEXT NOT NULL DEFAULT '',
	album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
	in_gallery INTEGER NOT NULL DEFAULT 1,
	uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX media_album ON media(album_id, created_at);
CREATE INDEX media_gallery ON media(in_gallery, created_at);

-- status: draft -> (pending) -> published; rejected bila ditolak admin utama.
CREATE TABLE posts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'berita' CHECK (category IN ('berita', 'pengumuman')),
	body TEXT NOT NULL DEFAULT '',
	cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
	review_note TEXT NOT NULL DEFAULT '',
	author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	published_at TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX posts_published ON posts(status, published_at DESC);

CREATE TABLE post_media (
	post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
	sort_order INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (post_id, media_id)
);

-- Kalender kegiatan: sumber jadwal bersama untuk portal, chatbot, dan Posyandu.
-- recurrence: none | weekly | monthly_date | monthly_nth_weekday
CREATE TABLE events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	category TEXT NOT NULL DEFAULT 'lainnya'
		CHECK (category IN ('posyandu', 'sampah', 'kerja_bakti', 'adat', 'rapat', 'lainnya')),
	location TEXT NOT NULL DEFAULT '',
	rt_number INTEGER,
	start_date TEXT NOT NULL,
	end_date TEXT,
	start_time TEXT,
	end_time TEXT,
	recurrence TEXT NOT NULL DEFAULT 'none'
		CHECK (recurrence IN ('none', 'weekly', 'monthly_date', 'monthly_nth_weekday')),
	recurrence_interval INTEGER NOT NULL DEFAULT 1,
	recurrence_until TEXT,
	created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX events_start ON events(start_date);

CREATE TABLE pages (
	slug TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

-- Tautan ke aplikasi kampung lain (Peminjaman, Posyandu, dll.).
CREATE TABLE links (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	url TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	contact TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL,
	read_at TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE rate_limits (
	key TEXT PRIMARY KEY,
	count INTEGER NOT NULL,
	reset_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------- data awal

INSERT INTO rts (number) VALUES (49), (50), (51), (52), (53);

INSERT INTO pages (slug, title, body) VALUES
('profil', 'Profil Kampung',
'Kampung Purbonegaran RW 11 berada di Kelurahan Terban, Kecamatan Gondokusuman, Kota Yogyakarta, dan meliputi lima RT: RT 49, RT 50, RT 51, RT 52, dan RT 53.

Teks profil lengkap sedang disiapkan bersama pengurus kampung.'),
('sejarah', 'Sejarah Kampung',
'Sejarah Kampung Purbonegaran sedang dihimpun dari cerita para sesepuh dan pengurus kampung, termasuk asal-usul upacara adat Merti Kali Belik.

Halaman ini akan segera diperbarui.');

INSERT INTO settings (key, value) VALUES
('site_name', 'Kampung Purbonegaran'),
('tagline', 'RW 11, Kelurahan Terban, Gondokusuman, Yogyakarta'),
('welcome_title', 'Sugeng rawuh di Kampung Purbonegaran'),
('welcome_text', 'Selamat datang di website resmi Kampung Purbonegaran RW 11. Di sini warga dan pengunjung dapat membaca kabar terbaru, melihat jadwal kegiatan, dan mengenal kampung kami lebih dekat.'),
('welcome_by', 'Pengurus RW 11'),
('hero_media_id', ''),
('address', 'Kampung Purbonegaran RW 11, Kelurahan Terban, Kecamatan Gondokusuman, Kota Yogyakarta, Daerah Istimewa Yogyakarta'),
('contact_whatsapp', ''),
('contact_email', ''),
('contact_note', 'Untuk pertanyaan, silakan kirim pesan melalui formulir di bawah. Pesan akan dibaca oleh pengurus kampung.'),
('map_lat', '-7.7768'),
('map_lng', '110.3745'),
('require_approval', '0'),
('photo_rule', 'consent');

INSERT INTO links (title, description, url, sort_order, active) VALUES
('Peminjaman Fasilitas', 'Cek jadwal dan pinjam balai warga, sanggar tari, tenda, kursi, dan sound system.', '', 1, 1),
('Asisten Sampah (WhatsApp)', 'Tanya jenis sampah lewat foto dan dapatkan pengingat jadwal angkut.', '', 2, 1),
('Posyandu Lansia', 'Pencatatan pemeriksaan lansia untuk kader Posyandu.', '', 3, 1),
('Administrasi & Iuran Masjos', 'Data warga dan iuran untuk ketua dan bendahara RT.', '', 4, 1),
('Lapor Lingkungan', 'Laporkan masalah lingkungan di sekitar kampung.', '', 5, 1);
