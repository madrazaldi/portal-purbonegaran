<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isExternal = (url: string) => /^https?:/.test(url);
</script>

<Seo title="Aplikasi Kampung" description="Layanan digital Kampung Purbonegaran RW 11 dalam satu tempat." />
<PageHeader
	eyebrow="Layanan digital"
	title="Aplikasi Kampung"
	intro="Semua layanan digital kampung bisa dibuka dari sini, jadi Bapak/Ibu tidak perlu mengingat banyak alamat."
/>

<div class="container section">
	<ul class="apps grid grid-3">
		{#each data.links as link (link.id)}
			<li class="card app">
				<span class="icon"><Icon name="apps" size={24} /></span>
				<h2>{link.title}</h2>
				<p>{link.description}</p>
				{#if link.url}
					<a class="btn btn-sm" href={link.url} rel={isExternal(link.url) ? 'noopener' : undefined}>
						Buka {#if isExternal(link.url)}<Icon name="external" size={16} />{:else}<Icon name="arrow" size={16} />{/if}
					</a>
				{:else}
					<span class="badge">Segera hadir</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.apps {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.app {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.icon {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: grid;
		place-items: center;
		background: var(--accent-50);
		color: var(--accent);
		margin-bottom: 0.8rem;
	}
	h2 {
		font-size: 1.2rem;
	}
	p {
		color: var(--ink-2);
		flex: 1;
	}
</style>
