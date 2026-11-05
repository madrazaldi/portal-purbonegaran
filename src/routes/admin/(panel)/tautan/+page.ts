import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { LinkItem } from '#lib/types.js';

export const load: PageLoad = async ({ fetch }) => ({ links: await api<LinkItem[]>('/admin/links', { fetch }) });
