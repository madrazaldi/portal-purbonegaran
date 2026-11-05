import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { Paginated, PostStatus, PostSummary } from '#lib/types.js';

export type AdminPostRow = PostSummary & {
	status: PostStatus;
	authorId: number | null;
	authorName: string | null;
	updatedAt: string;
};

export const load: PageLoad = async ({ fetch, url }) => {
	const status = url.searchParams.get('status') ?? '';
	const page = Number(url.searchParams.get('page')) || 1;
	const q = new URLSearchParams({ page: String(page) });
	if (status) q.set('status', status);
	return { status, list: await api<Paginated<AdminPostRow>>(`/admin/posts?${q}`, { fetch }) };
};
