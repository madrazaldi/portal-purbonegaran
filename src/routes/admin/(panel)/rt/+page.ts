import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { Rt } from '#lib/types.js';

export const load: PageLoad = async ({ fetch }) => ({ rts: await api<Rt[]>('/admin/rts', { fetch }) });
