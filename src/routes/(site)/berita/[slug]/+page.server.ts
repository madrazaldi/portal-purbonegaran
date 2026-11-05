import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import { getPublishedBySlug, listPublished } from '#lib/server/services/posts.js';

export const load: PageServerLoad = async ({ params }) => {
	const post = await getPublishedBySlug(env.DB, params.slug);
	if (!post) error(404, 'Berita tidak ditemukan atau sudah tidak tayang.');
	const latest = await listPublished(env.DB, { perPage: 4 });
	return { post, more: latest.items.filter((p) => p.id !== post.id).slice(0, 3) };
};
