import type { PageServerLoad } from './$types';
import { loadStaticPage } from '#lib/server/pages.js';

export const load: PageServerLoad = () => loadStaticPage('sejarah');
