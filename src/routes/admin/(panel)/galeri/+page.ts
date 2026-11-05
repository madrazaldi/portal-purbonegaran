import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { Album, MediaItem, Paginated } from '#lib/types.js';

export const load: PageLoad = async ({ fetch, url }) => {
	const album = Number(url.searchParams.get('album')) || null;
	const page = Number(url.searchParams.get('page')) || 1;
	const q = new URLSearchParams({ page: String(page) });
	if (album) q.set('album', String(album));
	const [media, albums, storage] = await Promise.all([
		api<Paginated<MediaItem>>(`/admin/media?${q}`, { fetch }),
		api<Album[]>('/admin/albums', { fetch }),
		api<{ usedBytes: number; limitBytes: number }>('/admin/storage', { fetch })
	]);
	return { media, albums, storage, albumFilter: album };
};
