import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	return {};
};

function safeNext(next: string | null) {
	return next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}
