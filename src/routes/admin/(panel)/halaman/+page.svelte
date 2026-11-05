<script lang="ts">
	import { untrack } from 'svelte';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import { api, errorText } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import { formatTimestamp } from '#lib/dates.js';
	import type { PageContent } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initial = untrack(() => data.pages);
	let drafts = $state(Object.fromEntries(initial.map((p) => [p.slug, { title: p.title, body: p.body }])));
	let updated = $state(Object.fromEntries(initial.map((p) => [p.slug, p.updatedAt])));
	let tab = $state(initial[0]?.slug ?? 'profil');
	let preview = $state(false);
	let busy = $state(false);
	const LABELS: Record<string, string> = { profil: 'Profil kampung', sejarah: 'Sejarah kampung' };

	async function save() {
		busy = true;
		try {
			const saved = await api<PageContent>(`/admin/pages/${tab}`, { method: 'PUT', body: drafts[tab] });
			updated[tab] = saved.updatedAt;
			toast('Halaman tersimpan dan sudah tampil di website.');
		} catch (e) {
			toast(errorText(e), 'error');
		} finally {
			busy = false;
		}
	}
</script>

<AdminHeader title="Profil & Sejarah" intro="Cerita lisan dari sesepuh boleh ditulis apa adanya; rapikan belakangan." />

<nav class="tabs">
	{#each initial as p (p.slug)}
		<button class:on={tab === p.slug} onclick={() => { tab = p.slug; preview = false; }}>{LABELS[p.slug] ?? p.slug}</button>
	{/each}
</nav>

{#if drafts[tab]}
	<div class="card pane">
		<div class="field">
			<label for="pt">Judul halaman</label>
			<input id="pt" class="input" bind:value={drafts[tab].title} maxlength="120" />
		</div>
		<div class="field">
			<div class="body-head">
				<label for="pb">Isi</label>
				<button class="btn btn-ghost btn-sm" onclick={() => (preview = !preview)}><Icon name={preview ? 'edit' : 'eye'} size={16} /> {preview ? 'Ubah' : 'Pratinjau'}</button>
			</div>
			{#if preview}
				<div class="preview"><RichText text={drafts[tab].body} /></div>
			{:else}
				<textarea id="pb" class="textarea body" bind:value={drafts[tab].body} maxlength="30000"></textarea>
				<p class="hint">Baris kosong = paragraf baru · <code>## </code> = sub-judul · <code>- </code> = daftar · <code>**tebal**</code></p>
			{/if}
		</div>
		<div class="actions">
			<span class="muted small">Terakhir diubah {formatTimestamp(updated[tab], true)}</span>
			<span class="spacer"></span>
			<a class="btn btn-ghost" href="/{tab}" target="_blank" rel="noopener"><Icon name="eye" size={18} /> Lihat</a>
			<button class="btn" onclick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
		</div>
	</div>
{/if}

<style>
	.tabs {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 1rem;
	}
	.tabs button {
		padding: 0.5rem 1rem;
		border-radius: 999px;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.tabs button.on {
		background: var(--ink);
		color: #fff;
		border-color: var(--ink);
	}
	.pane {
		padding: 1.1rem;
	}
	.body-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.body-head label {
		font-weight: 650;
		font-size: 0.95rem;
	}
	.body {
		min-height: 420px;
	}
	.preview {
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		min-height: 420px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.spacer {
		flex: 1;
	}
	.small {
		font-size: 0.85rem;
	}
</style>
