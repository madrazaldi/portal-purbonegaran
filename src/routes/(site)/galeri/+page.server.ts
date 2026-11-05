import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import { listAlbums, listMedia } from '#lib/server/services/media.js';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('halaman')) || 1);
	const [albums, media] = await Promise.all([
		listAlbums(env.DB),
		listMedia(env.DB, { page, perPage: 24, galleryOnly: true })
	]);
	return { albums: albums.filter((a) => a.count > 0), media };
};
