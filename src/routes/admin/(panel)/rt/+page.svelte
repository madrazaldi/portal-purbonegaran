<script lang="ts">
	import { untrack } from 'svelte';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import { api, errorText } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import type { Rt } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let rts = $state<Rt[]>(untrack(() => structuredClone(data.rts)));
	let saving = $state<number | null>(null);

	async function save(rt: Rt) {
		saving = rt.id;
		try {
			await api(`/admin/rts/${rt.id}`, { method: 'PUT', body: rt });
			toast(`Data RT ${rt.number} tersimpan.`);
		} catch (e) {
			toast(errorText(e), 'error');
		} finally {
			saving = null;
		}
	}
</script>

<AdminHeader
	title="Data RT"
	intro="Tampil di halaman Informasi RT. Nomor HP ketua RT sengaja tidak ditampilkan untuk umum demi keamanan."
/>

<div class="list">
	{#each rts as rt (rt.id)}
		<form class="card rt" onsubmit={(e) => { e.preventDefault(); save(rt); }}>
			<h2>RT {rt.number}</h2>
			<div class="field">
				<label for="k{rt.id}">Nama ketua RT</label>
				<input id="k{rt.id}" class="input" bind:value={rt.ketuaName} maxlength="100" />
			</div>
			<div class="field">
				<label for="a{rt.id}">Wilayah</label>
				<textarea id="a{rt.id}" class="textarea short" bind:value={rt.area} maxlength="500" placeholder="Contoh: sisi barat Jl. …, dari … sampai …"></textarea>
			</div>
			<div class="field">
				<label for="n{rt.id}">Catatan <span class="muted">(opsional)</span></label>
				<input id="n{rt.id}" class="input" bind:value={rt.notes} maxlength="500" />
			</div>
			<button class="btn btn-sm" disabled={saving === rt.id}>{saving === rt.id ? 'Menyimpan…' : 'Simpan'}</button>
		</form>
	{/each}
</div>

<style>
	.list {
		display: grid;
		gap: 1rem;
	}
	@media (min-width: 760px) {
		.list {
			grid-template-columns: 1fr 1fr;
		}
	}
	.rt {
		padding: 1.1rem;
	}
	h2 {
		font-size: 1.2rem;
		color: var(--primary);
	}
	.short {
		min-height: 80px;
	}
</style>
