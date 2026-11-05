<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title="Informasi RT" description="Ketua dan wilayah RT 49, 50, 51, 52, dan 53 di Kampung Purbonegaran RW 11." />
<PageHeader
	eyebrow="Wilayah"
	title="Informasi RT"
	intro="RW 11 Kampung Purbonegaran meliputi lima RT. Untuk keperluan administrasi, silakan hubungi ketua RT masing-masing."
/>

<div class="container section">
	<ul class="rts">
		{#each data.rts as rt (rt.id)}
			<li class="card rt" id="rt-{rt.number}">
				<div class="num"><span>RT</span>{rt.number}</div>
				<div class="info">
					<p class="label">Ketua RT</p>
					<p class="ketua">{rt.ketuaName || 'Belum diisi'}</p>
					{#if rt.area}
						<p class="label">Wilayah</p>
						<p class="area">{rt.area}</p>
					{/if}
					{#if rt.notes}<p class="notes muted">{rt.notes}</p>{/if}
				</div>
			</li>
		{/each}
	</ul>
</div>

<style>
	.rts {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 1rem;
	}
	@media (min-width: 720px) {
		.rts {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1040px) {
		.rts {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.rt {
		display: flex;
		gap: 1rem;
		padding: 1.1rem;
		scroll-margin-top: 90px;
	}
	.rt:target {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary-50);
	}
	.num {
		flex: none;
		width: 72px;
		height: 72px;
		border-radius: 16px;
		background: var(--kawung), var(--primary);
		background-size: 30px, auto;
		color: #fff;
		display: grid;
		place-content: center;
		text-align: center;
		font-family: var(--font-serif);
		font-size: 1.8rem;
		font-weight: 700;
		line-height: 1;
	}
	.num span {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		letter-spacing: 0.15em;
		color: var(--gold);
		margin-bottom: 0.2rem;
	}
	.label {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 0;
	}
	.ketua {
		font-weight: 700;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}
	.area {
		margin-bottom: 0.4rem;
		white-space: pre-line;
	}
	.notes {
		font-size: 0.92rem;
		margin: 0;
	}
</style>
