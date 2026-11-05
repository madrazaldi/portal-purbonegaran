<script lang="ts">
	import type { PageContent } from '#lib/types.js';
	import { formatTimestamp } from '#lib/dates.js';
	import { plainText } from '#lib/richtext.js';
	import PageHeader from './PageHeader.svelte';
	import RichText from './RichText.svelte';
	import Seo from './Seo.svelte';
	import type { Snippet } from 'svelte';

	let { page, eyebrow, aside }: { page: PageContent; eyebrow: string; aside?: Snippet } = $props();
</script>

<Seo title={page.title} description={plainText(page.body, 160)} />
<PageHeader {eyebrow} title={page.title} />

<div class="container section layout">
	<article>
		<RichText text={page.body} />
		<p class="updated muted">Diperbarui {formatTimestamp(page.updatedAt)}</p>
	</article>
	{#if aside}<aside>{@render aside()}</aside>{/if}
</div>

<style>
	.layout {
		display: grid;
		gap: 2rem;
	}
	@media (min-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 320px;
			gap: 3rem;
		}
	}
	.updated {
		font-size: 0.85rem;
		margin-top: 2rem;
	}
</style>
