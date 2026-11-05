<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { api, errorText, fieldErrors } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import type { LinkItem } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let editing = $state<LinkItem | null>(null);
	let form = $state({ title: '', description: '', url: '', sortOrder: 0, active: true });
	let errors = $state<Record<string, string>>({});

	function open(l: LinkItem | null) {
		editing = l;
		form = l
			? { title: l.title, description: l.description, url: l.url, sortOrder: l.sortOrder, active: l.active }
			: { title: '', description: '', url: '', sortOrder: (data.links.at(-1)?.sortOrder ?? 0) + 1, active: true };
		errors = {};
		dialog?.showModal();
	}
	async function save(e: SubmitEvent) {
		e.preventDefault();
		try {
			if (editing) await api(`/admin/links/${editing.id}`, { method: 'PUT', body: form });
			else await api('/admin/links', { body: form });
			dialog?.close();
			toast('Tautan tersimpan.');
			await invalidateAll();
		} catch (err) {
			errors = fieldErrors(err);
			if (!Object.keys(errors).length) toast(errorText(err), 'error');
		}
	}
	async function remove() {
		if (!editing || !confirm(`Hapus "${editing.title}"?`)) return;
		await api(`/admin/links/${editing.id}`, { method: 'DELETE' });
		dialog?.close();
		toast('Tautan dihapus.');
		await invalidateAll();
	}
</script>

<AdminHeader title="Tautan aplikasi" intro="Daftar aplikasi kampung yang tampil di halaman Aplikasi dan beranda. Kosongkan alamat untuk menampilkan “Segera hadir”.">
	{#snippet actions()}
		<button class="btn" onclick={() => open(null)}><Icon name="plus" size={18} /> Tambah</button>
	{/snippet}
</AdminHeader>

<ul class="list">
	{#each data.links as l (l.id)}
		<li>
			<button class="card item" onclick={() => open(l)}>
				<span class="order">{l.sortOrder}</span>
				<span class="text">
					<strong>{l.title}</strong>
					<small>{l.url || 'Segera hadir'}{#if !l.active} · disembunyikan{/if}</small>
				</span>
				<Icon name="edit" size={18} />
			</button>
		</li>
	{/each}
</ul>

<dialog bind:this={dialog} class="dlg">
	<form onsubmit={save}>
		<h2>{editing ? 'Ubah tautan' : 'Tautan baru'}</h2>
		<div class="field">
			<label for="lt">Nama aplikasi</label>
			<input id="lt" class="input" bind:value={form.title} maxlength="80" aria-invalid={!!errors.title} />
			{#if errors.title}<p class="error">{errors.title}</p>{/if}
		</div>
		<div class="field">
			<label for="ld">Keterangan singkat</label>
			<textarea id="ld" class="textarea short" bind:value={form.description} maxlength="300"></textarea>
		</div>
		<div class="field">
			<label for="lu">Alamat (URL)</label>
			<input id="lu" class="input" bind:value={form.url} maxlength="500" placeholder="https://…" aria-invalid={!!errors.url} />
			{#if errors.url}<p class="error">{errors.url}</p>{/if}
		</div>
		<div class="row row-2">
			<div class="field">
				<label for="lo">Urutan</label>
				<input id="lo" class="input" type="number" min="0" max="999" bind:value={form.sortOrder} />
			</div>
			<div class="field">
				<span class="label">Tampil</span>
				<label class="check"><input type="checkbox" bind:checked={form.active} /> Tampilkan di website</label>
			</div>
		</div>
		<div class="dlg-actions">
			{#if editing}<button type="button" class="btn btn-danger-ghost" onclick={remove}><Icon name="trash" size={18} /> Hapus</button>{/if}
			<span class="spacer"></span>
			<button type="button" class="btn btn-secondary" onclick={() => dialog?.close()}>Batal</button>
			<button class="btn">Simpan</button>
		</div>
	</form>
</dialog>

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.5rem;
	}
	.item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.8rem 1rem;
		font: inherit;
		text-align: left;
		cursor: pointer;
		color: var(--ink);
	}
	.order {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--surface-2);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 0.85rem;
		flex: none;
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	.text strong,
	.text small {
		display: block;
	}
	.text small {
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.short {
		min-height: 80px;
	}
	.spacer {
		flex: 1;
	}
</style>
