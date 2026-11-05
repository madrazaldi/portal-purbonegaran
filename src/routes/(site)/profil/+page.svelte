<script lang="ts">
	import StaticPage from '#lib/components/StaticPage.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<StaticPage page={data.page} eyebrow="Tentang kami">
	{#snippet aside()}
		<div class="card facts">
			<h2>Sekilas</h2>
			<dl>
				<dt>Wilayah</dt>
				<dd>RW 11, Kampung Purbonegaran</dd>
				<dt>Kelurahan</dt>
				<dd>Terban, Gondokusuman</dd>
				<dt>Kota</dt>
				<dd>Yogyakarta</dd>
				<dt>Jumlah RT</dt>
				<dd>5 RT (RT 49–53)</dd>
			</dl>
			<a href="/sejarah"><Icon name="history" size={18} /> Sejarah kampung</a>
			<a href="/rt"><Icon name="users" size={18} /> Informasi RT</a>
		</div>
	{/snippet}
</StaticPage>

<style>
	.facts {
		padding: 1.25rem;
		position: sticky;
		top: 84px;
	}
	.facts h2 {
		font-size: 1.15rem;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.4rem 1rem;
		margin: 0 0 1rem;
		font-size: 0.95rem;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.facts a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0;
		border-top: 1px solid var(--line);
		font-weight: 600;
	}
</style>
