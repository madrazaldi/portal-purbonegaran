<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import GalleryGrid from '#lib/components/GalleryGrid.svelte';
	import PostCard from '#lib/components/PostCard.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { POST_CATEGORY_LABELS } from '#lib/types.js';
	import { formatTimestamp } from '#lib/dates.js';
	import { whatsappLink } from '#lib/contact.js';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const post = $derived(data.post);
	const coverIsAlsoInGallery = $derived(post.media.length === 1 && post.media[0].id === post.cover?.id);
	const shareUrl = $derived(`${page.url.origin}/berita/${post.slug}`);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'NewsArticle',
		headline: post.title,
		datePublished: post.publishedAt,
		image: post.cover?.url ? [new URL(post.cover.url, page.url.origin).href] : undefined,
		author: { '@type': 'Organization', name: data.site.siteName },
		publisher: { '@type': 'Organization', name: data.site.siteName }
	});
</script>

<Seo title={post.title} description={post.excerpt} image={post.cover?.url} type="article" {jsonLd} />

<article class="container article">
	<a class="back" href="/berita"><Icon name="left" size={18} /> Semua berita</a>
	<header>
		<p class="meta">
			<span class="badge">{POST_CATEGORY_LABELS[post.category]}</span>
			{#if post.publishedAt}<time datetime={post.publishedAt}>{formatTimestamp(post.publishedAt)}</time>{/if}
		</p>
		<h1>{post.title}</h1>
	</header>

	{#if post.cover?.url}
		<figure class="cover">
			<img src={post.cover.url} alt={post.cover.caption} width={post.cover.width} height={post.cover.height} />
			{#if post.cover.caption}<figcaption>{post.cover.caption}</figcaption>{/if}
		</figure>
	{/if}

	<RichText text={post.body} />

	{#if post.media.length && !coverIsAlsoInGallery}
		<section class="media">
			<h2>Foto & video</h2>
			<GalleryGrid items={post.media} />
		</section>
	{/if}

	<p class="share">
		<a class="btn btn-secondary btn-sm" href={whatsappLink('', `${post.title} ${shareUrl}`)} rel="noopener">
			<Icon name="whatsapp" size={18} /> Bagikan ke WhatsApp
		</a>
	</p>
</article>

{#if data.more.length}
	<section class="section more">
		<div class="container">
			<h2>Berita lainnya</h2>
			<div class="grid grid-3">
				{#each data.more as p (p.id)}<PostCard post={p} />{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	.article {
		max-width: 780px;
		padding-block: 1.5rem 3rem;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
		text-decoration: none;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--muted);
		font-size: 0.92rem;
	}
	.cover {
		margin: 1.5rem 0 2rem;
	}
	.cover img {
		width: 100%;
		border-radius: var(--radius);
	}
	figcaption {
		font-size: 0.88rem;
		color: var(--muted);
		margin-top: 0.5rem;
	}
	.media {
		margin-top: 2.5rem;
	}
	.media h2 {
		font-size: 1.3rem;
	}
	.share {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--line);
	}
	.more {
		background: var(--surface-2);
	}
</style>
