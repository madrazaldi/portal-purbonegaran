// Wrangler cannot generate runtime types under Bun, and pulling the full
// @cloudflare/workers-types globals in would clash with SvelteKit's DOM types.
// So we import only the binding types we use from the module build and expose
// them globally for worker-configuration.d.ts (`wrangler types --include-runtime=false`).
import type {
	D1Database as CfD1Database,
	ExecutionContext as CfExecutionContext,
	Fetcher as CfFetcher,
	R2Bucket as CfR2Bucket
} from '@cloudflare/workers-types';

declare global {
	type D1Database = CfD1Database;
	type R2Bucket = CfR2Bucket;
	type Fetcher = CfFetcher;
	type ExecutionContext = CfExecutionContext;
}

export {};
