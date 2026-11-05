<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import GalleryGrid from '#lib/components/GalleryGrid.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { formatDate } from '#lib/dates.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const album = $derived(data.album);
</script>

<Seo title={album.title} description={album.description || `Album foto ${album.title}`} image={album.cover?.url} />
<PageHeader eyebrow={album.eventDate ? formatDate(album.eventDate) : 'Album'} title={album.title} intro={album.description}>
	<a class="back" href="/galeri"><Icon name="left" size={18} /> Semua album</a>
</PageHeader>

<div class="container section">
	{#if data.media.items.length}
		<GalleryGrid items={data.media.items} />
		<Pagination
			page={data.media.page}
			totalPages={data.media.totalPages}
			href={(p) => (p > 1 ? `/galeri/${album.slug}?halaman=${p}` : `/galeri/${album.slug}`)}
		/>
	{:else}
		<p class="muted">Album ini belum berisi foto.</p>
	{/if}
</div>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.8rem;
		font-weight: 600;
	}
</style>
