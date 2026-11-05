import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { KampungEvent } from '#lib/types.js';

export const load: PageLoad = async ({ fetch }) => ({
	events: await api<KampungEvent[]>('/admin/events', { fetch })
});
