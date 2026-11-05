import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import { listPublished } from '#lib/server/services/posts.js';

export const load: PageServerLoad = async ({ url }) => {
	const k = url.searchParams.get('kategori');
	const category = k === 'berita' || k === 'pengumuman' ? k : null;
	const page = Math.max(1, Number(url.searchParams.get('halaman')) || 1);
	return { category, list: await listPublished(env.DB, { page, perPage: 9, category }) };
};
