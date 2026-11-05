import type { PageLoad } from './$types';
import { api } from '#lib/admin/api.js';
import type { AdminSettings, MediaItem } from '#lib/types.js';

export const load: PageLoad = async ({ fetch }) => {
	const settings = await api<AdminSettings>('/admin/settings', { fetch });
	const hero = settings.heroMediaId
		? await api<MediaItem>(`/admin/media/${settings.heroMediaId}`, { fetch }).catch(() => null)
		: null;
	return { settings, hero };
};
