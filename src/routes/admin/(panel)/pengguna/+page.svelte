<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { api, errorText, fieldErrors } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import { ROLE_LABELS, type Role } from '#lib/types.js';
	import type { AdminUser } from './+page.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let editing = $state<AdminUser | null>(null);
	let form = $state({ username: '', name: '', password: '', role: 'admin_konten' as Role, active: true });
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);

	function open(u: AdminUser | null) {
		editing = u;
		form = u
			? { username: u.username, name: u.name, password: '', role: u.roles.includes('admin_utama') ? 'admin_utama' : 'admin_konten', active: u.active }
			: { username: '', name: '', password: '', role: 'admin_konten', active: true };
		errors = {};
		dialog?.showModal();
	}

	function suggestPassword() {
		const words = ['kali', 'belik', 'merti', 'kawung', 'terban', 'sanggar', 'gamelan', 'jathilan', 'wayang', 'tumpeng'];
		const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
		const n = crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10;
		form.password = `${pick()}-${pick()}-${pick()}-${n}`;
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			if (editing) {
				await api(`/admin/users/${editing.id}`, {
					method: 'PUT',
					body: { name: form.name, role: form.role, active: form.active, password: form.password }
				});
			} else {
				await api('/admin/users', { body: form });
			}
			dialog?.close();
			toast(form.password ? 'Tersimpan. Berikan kata sandi kepada pemilik akun secara langsung.' : 'Tersimpan.');
			await invalidateAll();
		} catch (err) {
			errors = fieldErrors(err);
			if (!Object.keys(errors).length) toast(errorText(err), 'error');
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!editing || !confirm(`Hapus akun "${editing.name}"? Tulisan dan foto dari akun ini tetap ada.`)) return;
		try {
			await api(`/admin/users/${editing.id}`, { method: 'DELETE' });
			dialog?.close();
			toast('Akun dihapus.');
			await invalidateAll();
		} catch (err) {
			toast(errorText(err), 'error');
		}
	}
</script>

<AdminHeader title="Akun admin" intro="Admin Konten bisa menulis berita, mengunggah foto, dan mengisi kalender. Admin Utama juga mengatur akun, data RT, dan pengaturan.">
	{#snippet actions()}
		<button class="btn" onclick={() => open(null)}><Icon name="plus" size={18} /> Akun baru</button>
	{/snippet}
</AdminHeader>

<ul class="list">
	{#each data.users as u (u.id)}
		<li>
			<button class="card item" onclick={() => open(u)}>
				<span class="avatar">{u.name.slice(0, 1).toUpperCase()}</span>
				<span class="text">
					<strong>{u.name}{#if u.id === data.user.id} (Anda){/if}</strong>
					<small>@{u.username} · {u.roles.map((r) => ROLE_LABELS[r]).join(', ')}{#if !u.active} · <em>nonaktif</em>{/if}</small>
				</span>
				<Icon name="edit" size={18} />
			</button>
		</li>
	{/each}
</ul>

<dialog bind:this={dialog} class="dlg">
	<form onsubmit={save}>
		<h2>{editing ? 'Ubah akun' : 'Akun baru'}</h2>
		<div class="field">
			<label for="un">Nama pengguna (untuk masuk)</label>
			<input id="un" class="input" bind:value={form.username} disabled={!!editing} autocapitalize="none" spellcheck="false" placeholder="contoh: sekretaris" aria-invalid={!!errors.username} />
			{#if errors.username}<p class="error">{errors.username}</p>{/if}
		</div>
		<div class="field">
			<label for="nm">Nama lengkap</label>
			<input id="nm" class="input" bind:value={form.name} maxlength="100" aria-invalid={!!errors.name} />
			{#if errors.name}<p class="error">{errors.name}</p>{/if}
		</div>
		<div class="field">
			<label for="rl">Peran</label>
			<select id="rl" class="select" bind:value={form.role}>
				<option value="admin_konten">{ROLE_LABELS.admin_konten}</option>
				<option value="admin_utama">{ROLE_LABELS.admin_utama}</option>
			</select>
		</div>
		<div class="field">
			<label for="pw">{editing ? 'Atur ulang kata sandi' : 'Kata sandi awal'} {#if editing}<span class="muted">(kosongkan jika tidak diubah)</span>{/if}</label>
			<div class="pw-row">
				<input id="pw" class="input" bind:value={form.password} autocomplete="new-password" aria-invalid={!!errors.password} />
				<button type="button" class="btn btn-secondary btn-sm" onclick={suggestPassword}>Buatkan</button>
			</div>
			<p class="hint">Minimal 8 karakter. Sampaikan langsung ke pemilik akun, lalu minta ia menggantinya.</p>
			{#if errors.password}<p class="error">{errors.password}</p>{/if}
		</div>
		{#if editing}
			<label class="check"><input type="checkbox" bind:checked={form.active} /> Akun aktif (bisa masuk)</label>
		{/if}
		<div class="dlg-actions">
			{#if editing && editing.id !== data.user.id}<button type="button" class="btn btn-danger-ghost" onclick={remove}><Icon name="trash" size={18} /> Hapus</button>{/if}
			<span class="spacer"></span>
			<button type="button" class="btn btn-secondary" onclick={() => dialog?.close()}>Batal</button>
			<button class="btn" disabled={busy}>Simpan</button>
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
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--primary-50);
		color: var(--primary);
		font-weight: 700;
		display: grid;
		place-items: center;
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
	}
	.pw-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
</style>
