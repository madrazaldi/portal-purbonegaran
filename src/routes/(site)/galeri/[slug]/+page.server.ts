import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import { getAlbumBySlug, listMedia } from '#lib/server/services/media.js';

export const load: PageServerLoad = async ({ params, url }) => {
	const album = await getAlbumBySlug(env.DB, params.slug);
	if (!album) error(404, 'Album tidak ditemukan.');
	const page = Math.max(1, Number(url.searchParams.get('halaman')) || 1);
	return { album, media: await listMedia(env.DB, { albumId: album.id, galleryOnly: true, page, perPage: 48 }) };
};
