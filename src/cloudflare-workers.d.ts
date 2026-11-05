// Ambient declaration (no imports in this file) for the Workers runtime module.
// The SvelteKit Cloudflare adapter provides it at runtime and in `vite dev`.
declare module 'cloudflare:workers' {
	export const env: Cloudflare.Env;
}
