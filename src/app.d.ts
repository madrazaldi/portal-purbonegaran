// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionUser } from '#lib/types.js';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
