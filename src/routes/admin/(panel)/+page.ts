import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { Occurrence } from '#lib/types.js';

export const load: PageLoad = async ({ fetch }) => ({
	dash: await api<{ pendingPosts: number; unreadMessages: number; upcoming: Occurrence[] }>('/admin/dashboard', { fetch })
});
