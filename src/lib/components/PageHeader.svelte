<script lang="ts">
	import type { Snippet } from 'svelte';

	let { eyebrow = '', title, intro = '', children }: { eyebrow?: string; title: string; intro?: string; children?: Snippet } =
		$props();
</script>

<header class="page-header">
	<div class="container">
		{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
		<h1>{title}</h1>
		{#if intro}<p class="intro">{intro}</p>{/if}
		{@render children?.()}
	</div>
</header>

<style>
	.page-header {
		padding-block: clamp(2rem, 1.5rem + 3vw, 3.5rem) clamp(1.25rem, 1rem + 1vw, 2rem);
		border-bottom: 1px solid var(--line);
		background:
			radial-gradient(circle at 100% 0%, var(--accent-50) 0, transparent 40%),
			var(--bg);
	}
	h1 {
		margin-bottom: 0.3rem;
	}
	.intro {
		color: var(--ink-2);
		font-size: 1.08rem;
		max-width: 60ch;
		margin: 0;
	}
</style>
