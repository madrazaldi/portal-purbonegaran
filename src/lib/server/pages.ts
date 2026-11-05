import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getPage } from './services/site.js';

export async function loadStaticPage(slug: string) {
	const page = await getPage(env.DB, slug);
	if (!page) error(404, 'Halaman tidak ditemukan.');
	return { page };
}
