<script lang="ts">
	import { parseRichText, type Inline } from '#lib/richtext.js';

	let { text }: { text: string } = $props();
	const blocks = $derived(parseRichText(text));
</script>

{#snippet inline(parts: Inline[])}
	{#each parts as part, i (i)}
		{#if part.t === 'b'}<strong>{part.v}</strong>{:else if part.t === 'a'}<a
				href={part.href}
				rel="noopener nofollow ugc"
				target="_blank">{part.v}</a
			>{:else}{part.v}{/if}
	{/each}
{/snippet}

<div class="prose">
	{#each blocks as block, i (i)}
		{#if block.t === 'h'}
			<h2>{@render inline(block.v)}</h2>
		{:else if block.t === 'ul'}
			<ul>
				{#each block.items as item, j (j)}<li>{@render inline(item)}</li>{/each}
			</ul>
		{:else}
			<p>
				{#each block.lines as line, j (j)}{#if j > 0}<br />{/if}{@render inline(line)}{/each}
			</p>
		{/if}
	{/each}
</div>

<style>
	.prose {
		font-size: 1.08rem;
		line-height: 1.75;
		max-width: 68ch;
		overflow-wrap: anywhere;
	}
	.prose :global(h2) {
		font-size: 1.35rem;
		margin: 1.6em 0 0.5em;
	}
	.prose :global(ul) {
		padding-left: 1.3rem;
		margin: 0 0 1em;
	}
	.prose :global(li) {
		margin-bottom: 0.3em;
	}
</style>
