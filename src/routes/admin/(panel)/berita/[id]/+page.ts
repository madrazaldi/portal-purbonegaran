import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { AdminPost } from '#lib/types.js';

export const load: PageLoad = async ({ fetch, params }) => ({
	post: await api<AdminPost>(`/admin/posts/${params.id}`, { fetch })
});
