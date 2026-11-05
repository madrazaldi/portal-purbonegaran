import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { Role } from '#lib/types.js';

export interface AdminUser {
	id: number;
	username: string;
	name: string;
	roles: Role[];
	active: boolean;
	createdAt: string;
}

export const load: PageLoad = async ({ fetch }) => ({ users: await api<AdminUser[]>('/admin/users', { fetch }) });
