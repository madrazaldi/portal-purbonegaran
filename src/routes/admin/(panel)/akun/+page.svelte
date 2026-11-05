<script lang="ts">
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import { api, errorText, fieldErrors } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let currentPassword = $state('');
	let newPassword = $state('');
	let repeat = $state('');
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		errors = {};
		if (newPassword !== repeat) {
			errors = { repeat: 'Kata sandi baru tidak sama.' };
			return;
		}
		busy = true;
		try {
			await api('/auth/password', { body: { currentPassword, newPassword } });
			currentPassword = newPassword = repeat = '';
			toast('Kata sandi diganti. Perangkat lain otomatis keluar.');
		} catch (err) {
			errors = fieldErrors(err);
			if (!Object.keys(errors).length) toast(errorText(err), 'error');
		} finally {
			busy = false;
		}
	}
</script>

<AdminHeader title="Kata sandi saya" intro="Masuk sebagai {data.user.name} (@{data.user.username})." />

<form class="card pane" onsubmit={save}>
	<div class="field">
		<label for="cp">Kata sandi lama</label>
		<input id="cp" class="input" type="password" bind:value={currentPassword} autocomplete="current-password" aria-invalid={!!errors.currentPassword} />
		{#if errors.currentPassword}<p class="error">{errors.currentPassword}</p>{/if}
	</div>
	<div class="field">
		<label for="np">Kata sandi baru</label>
		<input id="np" class="input" type="password" bind:value={newPassword} autocomplete="new-password" aria-invalid={!!errors.newPassword} />
		<p class="hint">Minimal 8 karakter. Gabungan beberapa kata lebih mudah diingat, misalnya “kali-belik-sore-2026”.</p>
		{#if errors.newPassword}<p class="error">{errors.newPassword}</p>{/if}
	</div>
	<div class="field">
		<label for="rp">Ulangi kata sandi baru</label>
		<input id="rp" class="input" type="password" bind:value={repeat} autocomplete="new-password" aria-invalid={!!errors.repeat} />
		{#if errors.repeat}<p class="error">{errors.repeat}</p>{/if}
	</div>
	<button class="btn" disabled={busy}>{busy ? 'Menyimpan…' : 'Ganti kata sandi'}</button>
</form>

<style>
	.pane {
		padding: 1.1rem;
		max-width: 480px;
	}
</style>
