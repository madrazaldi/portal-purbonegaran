import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { Paginated } from '#lib/types.js';

export interface Message {
	id: number;
	name: string;
	contact: string;
	body: string;
	readAt: string | null;
	createdAt: string;
}

export const load: PageLoad = async ({ fetch, url }) => ({
	list: await api<Paginated<Message>>(`/admin/messages?page=${Number(url.searchParams.get('page')) || 1}`, { fetch })
});
