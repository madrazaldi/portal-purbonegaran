<script lang="ts">
	import type { PostSummary } from '#lib/types.js';
	import { POST_CATEGORY_LABELS } from '#lib/types.js';
	import { formatTimestamp } from '#lib/dates.js';

	let { post, headingLevel = 3 }: { post: PostSummary; headingLevel?: 2 | 3 } = $props();
</script>

<article class="card post-card">
	<a class="cover" href="/berita/{post.slug}" tabindex="-1" aria-hidden="true">
		{#if post.cover}
			<img src={post.cover.thumbUrl} alt="" loading="lazy" width="480" height="320" />
		{:else}
			<div class="placeholder"></div>
		{/if}
	</a>
	<div class="body">
		<p class="meta">
			<span class="badge" class:announce={post.category === 'pengumuman'}
				>{POST_CATEGORY_LABELS[post.category]}</span
			>
			{#if post.publishedAt}<time datetime={post.publishedAt}>{formatTimestamp(post.publishedAt)}</time>{/if}
		</p>
		<svelte:element this={`h${headingLevel}`} class="title">
			<a href="/berita/{post.slug}">{post.title}</a>
		</svelte:element>
		<p class="excerpt">{post.excerpt}</p>
	</div>
</article>

<style>
	.post-card {
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: box-shadow 0.15s, transform 0.15s;
	}
	.post-card:hover {
		box-shadow: var(--shadow);
	}
	.cover {
		display: block;
		aspect-ratio: 3 / 2;
		background: var(--surface-2);
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.placeholder {
		width: 100%;
		height: 100%;
		background: var(--kawung), var(--primary);
		background-size: 32px, auto;
	}
	.body {
		padding: 1rem 1.1rem 1.2rem;
	}
	.meta {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		font-size: 0.85rem;
		color: var(--muted);
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}
	.badge.announce {
		background: var(--accent-50);
		color: var(--accent);
	}
	.title {
		font-size: 1.18rem;
		margin-bottom: 0.4rem;
	}
	.title a {
		color: var(--ink);
		text-decoration: none;
	}
	.title a:hover {
		color: var(--primary);
		text-decoration: underline;
	}
	.excerpt {
		color: var(--ink-2);
		font-size: 0.97rem;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
