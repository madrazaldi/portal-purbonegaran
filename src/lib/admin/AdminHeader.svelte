<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, intro = '', actions }: { title: string; intro?: string; actions?: Snippet } = $props();
</script>

<svelte:head><title>{title} · Pengurus</title></svelte:head>

<header class="ah">
	<div>
		<h1>{title}</h1>
		{#if intro}<p class="muted">{intro}</p>{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
	.ah {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-bottom: 1.25rem;
	}
	h1 {
		font-size: clamp(1.5rem, 1.3rem + 1vw, 2rem);
		margin: 0;
	}
	p {
		margin: 0.3rem 0 0;
		max-width: 60ch;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
</style>
