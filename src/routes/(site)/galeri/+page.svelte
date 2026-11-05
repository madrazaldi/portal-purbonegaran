<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import GalleryGrid from '#lib/components/GalleryGrid.svelte';
	import AlbumCard from '#lib/components/AlbumCard.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo
	title="Galeri"
	description="Foto dan video kegiatan Kampung Purbonegaran RW 11, termasuk upacara adat Merti Kali Belik."
	image={data.media.items.find((m) => m.kind === 'image')?.url}
/>
<PageHeader
	eyebrow="Dokumentasi"
	title="Galeri Foto & Video"
	intro="Rekaman kegiatan warga, kerja bakti, dan upacara adat Merti Kali Belik."
/>

<div class="container section">
	{#if data.albums.length}
		<h2>Album</h2>
		<div class="albums">
			{#each data.albums as album (album.id)}<AlbumCard {album} />{/each}
		</div>
	{/if}

	<h2 class="latest">Terbaru</h2>
	{#if data.media.items.length}
		<GalleryGrid items={data.media.items} />
		<Pagination
			page={data.media.page}
			totalPages={data.media.totalPages}
			href={(p) => (p > 1 ? `/galeri?halaman=${p}` : '/galeri')}
		/>
	{:else}
		<p class="muted">Belum ada foto atau video.</p>
	{/if}
</div>

<style>
	.albums {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
		margin-bottom: 2.5rem;
	}
	h2 {
		font-size: 1.4rem;
	}
</style>
