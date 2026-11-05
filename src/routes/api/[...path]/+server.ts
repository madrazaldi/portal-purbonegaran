import type { RequestHandler } from './$types';
import api from '#lib/server/api/index.js';

// Every /api/* request is handled by the Hono app.
export const fallback: RequestHandler = ({ request }) => api.fetch(request);
