// Shared shapes returned by the JSON API (also used by the Svelte pages and,
// later, the Android app). Keep these in sync with src/lib/server/services.

export type Role = 'admin_utama' | 'admin_konten';

export const ROLE_LABELS: Record<Role, string> = {
	admin_utama: 'Admin Utama',
	admin_konten: 'Admin Konten'
};

export interface SessionUser {
	id: number;
	username: string;
	name: string;
	roles: Role[];
}

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type PostCategory = 'berita' | 'pengumuman';

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
	draft: 'Draf',
	pending: 'Menunggu persetujuan',
	published: 'Tayang',
	rejected: 'Dikembalikan'
};

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
	berita: 'Berita',
	pengumuman: 'Pengumuman'
};

export interface MediaItem {
	id: number;
	kind: 'image' | 'youtube';
	url: string | null;
	thumbUrl: string;
	youtubeId: string | null;
	width: number | null;
	height: number | null;
	caption: string;
	albumId: number | null;
	inGallery: boolean;
	createdAt: string;
}

export interface PostSummary {
	id: number;
	slug: string;
	title: string;
	category: PostCategory;
	excerpt: string;
	cover: MediaItem | null;
	publishedAt: string | null;
}

export interface Post extends PostSummary {
	body: string;
	media: MediaItem[];
	authorName: string | null;
}

export interface AdminPost extends Post {
	status: PostStatus;
	reviewNote: string;
	authorId: number | null;
	updatedAt: string;
}

export type EventCategory = 'posyandu' | 'sampah' | 'kerja_bakti' | 'adat' | 'rapat' | 'lainnya';

export const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
	{ value: 'posyandu', label: 'Posyandu' },
	{ value: 'sampah', label: 'Angkut sampah (Masjos)' },
	{ value: 'kerja_bakti', label: 'Kerja bakti' },
	{ value: 'adat', label: 'Acara adat & budaya' },
	{ value: 'rapat', label: 'Rapat / pertemuan' },
	{ value: 'lainnya', label: 'Lainnya' }
];

export type Recurrence = 'none' | 'weekly' | 'monthly_date' | 'monthly_nth_weekday';

export interface KampungEvent {
	id: number;
	title: string;
	description: string;
	category: EventCategory;
	location: string;
	rtNumber: number | null;
	startDate: string; // YYYY-MM-DD (WIB)
	endDate: string | null;
	startTime: string | null; // HH:MM
	endTime: string | null;
	recurrence: Recurrence;
	recurrenceInterval: number;
	recurrenceUntil: string | null;
}

export interface Occurrence {
	eventId: number;
	date: string; // YYYY-MM-DD
	endDate: string | null;
	title: string;
	description: string;
	category: EventCategory;
	location: string;
	rtNumber: number | null;
	startTime: string | null;
	endTime: string | null;
	recurring: boolean;
}

export interface Rt {
	id: number;
	number: number;
	ketuaName: string;
	area: string;
	notes: string;
}

export interface Album {
	id: number;
	slug: string;
	title: string;
	description: string;
	eventDate: string | null;
	cover: MediaItem | null;
	count: number;
}

export interface LinkItem {
	id: number;
	title: string;
	description: string;
	url: string;
	sortOrder: number;
	active: boolean;
}

export interface PageContent {
	slug: string;
	title: string;
	body: string;
	updatedAt: string;
}

/** Settings that are safe to show to the public. */
export interface PublicSettings {
	siteName: string;
	tagline: string;
	welcomeTitle: string;
	welcomeText: string;
	welcomeBy: string;
	hero: MediaItem | null;
	address: string;
	contactWhatsapp: string;
	contactEmail: string;
	contactNote: string;
	mapLat: number;
	mapLng: number;
}

export interface AdminSettings {
	siteName: string;
	tagline: string;
	welcomeTitle: string;
	welcomeText: string;
	welcomeBy: string;
	heroMediaId: number | null;
	address: string;
	contactWhatsapp: string;
	contactEmail: string;
	contactNote: string;
	mapLat: number;
	mapLng: number;
	requireApproval: boolean;
	photoRule: PhotoRule;
}

export type PhotoRule = 'all' | 'no_children' | 'consent';

export const PHOTO_RULES: { value: PhotoRule; label: string; reminder: string }[] = [
	{
		value: 'all',
		label: 'Semua foto kegiatan boleh diunggah',
		reminder: 'Pastikan foto pantas ditampilkan untuk umum.'
	},
	{
		value: 'no_children',
		label: 'Boleh, kecuali foto anak-anak dengan wajah jelas',
		reminder: 'Jangan unggah foto anak-anak yang wajahnya terlihat jelas.'
	},
	{
		value: 'consent',
		label: 'Hanya foto yang orangnya sudah memberi izin',
		reminder: 'Hanya unggah foto yang orang di dalamnya sudah memberi izin.'
	}
];

export interface Paginated<T> {
	items: T[];
	page: number;
	totalPages: number;
	total: number;
}

export interface ApiError {
	error: string;
	fields?: Record<string, string>;
}
