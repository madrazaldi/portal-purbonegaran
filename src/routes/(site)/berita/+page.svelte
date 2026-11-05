<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PostCard from '#lib/components/PostCard.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const TABS = [
		{ value: null, label: 'Semua' },
		{ value: 'berita', label: 'Berita' },
		{ value: 'pengumuman', label: 'Pengumuman' }
	] as const;

	function href(category: string | null, page = 1) {
		const p = new URLSearchParams();
		if (category) p.set('kategori', category);
		if (page > 1) p.set('halaman', String(page));
		const q = p.toString();
		return q ? `/berita?${q}` : '/berita';
	}
</script>

<Seo title="Berita & Pengumuman" description="Kabar terbaru dan pengumuman dari Kampung Purbonegaran RW 11." />
<PageHeader eyebrow="Kabar kampung" title="Berita & Pengumuman" />

<div class="container section">
	<nav class="tabs" aria-label="Kategori">
		{#each TABS as t (t.label)}
			<a href={href(t.value)} aria-current={data.category === t.value ? 'page' : undefined}>{t.label}</a>
		{/each}
	</nav>

	{#if data.list.items.length}
		<div class="grid grid-3">
			{#each data.list.items as post (post.id)}<PostCard {post} headingLevel={2} />{/each}
		</div>
		<Pagination page={data.list.page} totalPages={data.list.totalPages} href={(p) => href(data.category, p)} />
	{:else}
		<p class="muted">Belum ada tulisan di sini.</p>
	{/if}
</div>

<style>
	.tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1.5px solid var(--line);
		margin-bottom: 1.5rem;
	}
	.tabs a {
		padding: 0.6rem 0.9rem;
		text-decoration: none;
		color: var(--muted);
		font-weight: 650;
		border-bottom: 3px solid transparent;
		margin-bottom: -1.5px;
	}
	.tabs a[aria-current='page'] {
		color: var(--primary);
		border-color: var(--primary);
	}
</style>
