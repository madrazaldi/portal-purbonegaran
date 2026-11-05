import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import { upcoming } from '#lib/server/services/events.js';
import { listPublished } from '#lib/server/services/posts.js';
import { listMedia } from '#lib/server/services/media.js';
import { listRts } from '#lib/server/services/site.js';

export const load: PageServerLoad = async () => {
	const [events, posts, gallery, rts] = await Promise.all([
		upcoming(env.DB, 5, 60),
		listPublished(env.DB, { perPage: 3 }),
		listMedia(env.DB, { perPage: 8, galleryOnly: true }),
		listRts(env.DB)
	]);
	return { events, posts: posts.items, gallery: gallery.items, rts };
};
