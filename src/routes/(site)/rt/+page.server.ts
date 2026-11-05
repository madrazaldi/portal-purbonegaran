import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';
import { listRts } from '#lib/server/services/site.js';

export const load: PageServerLoad = async () => ({ rts: await listRts(env.DB) });
