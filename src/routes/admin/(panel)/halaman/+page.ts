import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { PageContent } from '#lib/types.js';

export const load: PageLoad = async ({ fetch }) => ({ pages: await api<PageContent[]>('/admin/pages', { fetch }) });
