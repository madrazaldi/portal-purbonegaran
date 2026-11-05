<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AdminPost, MediaItem, PhotoRule, PostCategory, SessionUser } from '#lib/types.js';
	import { POST_STATUS_LABELS } from '#lib/types.js';
	import Icon from '#lib/components/Icon.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import { api, errorText, fieldErrors } from './api.js';
	import MediaPicker from './MediaPicker.svelte';
	import { toast } from './Toast.svelte';

	let {
		post = null,
		user,
		photoRule,
		requireApproval
	}: { post?: AdminPost | null; user: SessionUser; photoRule: PhotoRule; requireApproval: boolean } = $props();

	const isUtama = $derived(user.roles.includes('admin_utama'));
	const needsApproval = $derived(requireApproval && !isUtama);

	// Editor state starts from the post once; later prop changes don't reset typing.
	const initial = untrack(() => post);
	let title = $state(initial?.title ?? '');
	let category = $state<PostCategory>(initial?.category ?? 'berita');
	let body = $state(initial?.body ?? '');
	let media = $state<MediaItem[]>(initial?.media ?? []);
	let coverId = $state<number | null>(initial?.cover?.id ?? null);
	let preview = $state(false);

	let busy = $state(false);
	let error = $state('');
	let errors = $state<Record<string, string>>({});

	const publishLabel = $derived(
		needsApproval ? 'Kirim untuk disetujui' : initial?.status === 'published' ? 'Simpan & tayangkan' : 'Terbitkan'
	);

	async function save(intent: 'draft' | 'publish') {
		busy = true;
		error = '';
		errors = {};
		const payload = {
			title,
			category,
			body,
			mediaIds: media.map((m) => m.id),
			coverMediaId: coverId && media.some((m) => m.id === coverId) ? coverId : null,
			intent
		};
		try {
			const saved = initial
				? await api<AdminPost>(`/admin/posts/${initial.id}`, { method: 'PUT', body: payload })
				: await api<AdminPost>('/admin/posts', { body: payload });
			toast(
				saved.status === 'published'
					? 'Berita sudah tayang di website.'
					: saved.status === 'pending'
						? 'Terkirim. Menunggu persetujuan Admin Utama.'
						: 'Draf tersimpan.'
			);
			await goto(saved.status === 'published' ? '/admin/berita?status=published' : '/admin/berita', {
				invalidateAll: true
			});
		} catch (e) {
			error = errorText(e);
			errors = fieldErrors(e);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!initial || !confirm('Hapus berita ini? Tindakan ini tidak bisa dibatalkan.')) return;
		try {
			await api(`/admin/posts/${initial.id}`, { method: 'DELETE' });
			toast('Berita dihapus.');
			await goto('/admin/berita', { invalidateAll: true });
		} catch (e) {
			toast(errorText(e), 'error');
		}
	}
</script>

{#if error}<div class="notice notice-error" role="alert"><p>{error}</p></div>{/if}

{#if initial?.status === 'rejected' && initial.reviewNote}
	<div class="notice notice-warn">
		<p><strong>Dikembalikan oleh Admin Utama:</strong> {initial.reviewNote}</p>
	</div>
{/if}
{#if needsApproval && initial?.status === 'published'}
	<div class="notice notice-info">
		<p>Berita ini sedang tayang. Jika Anda menyimpan perubahan, berita akan disembunyikan sampai disetujui lagi oleh Admin Utama.</p>
	</div>
{/if}

<form class="editor" onsubmit={(e) => { e.preventDefault(); save('publish'); }}>
	<div class="card pane">
		<div class="field">
			<label for="title">Judul</label>
			<input id="title" class="input title" bind:value={title} maxlength="160" placeholder="Contoh: Kerja Bakti RT 51" aria-invalid={!!errors.title} />
			{#if errors.title}<p class="error">{errors.title}</p>{/if}
		</div>

		<fieldset class="field cat">
			<legend class="label">Jenis tulisan</legend>
			<label class="check"><input type="radio" bind:group={category} value="berita" /> Berita (kabar kegiatan)</label>
			<label class="check"><input type="radio" bind:group={category} value="pengumuman" /> Pengumuman</label>
		</fieldset>

		<div class="field">
			<div class="body-head">
				<label for="body">Isi</label>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => (preview = !preview)}>
					<Icon name={preview ? 'edit' : 'eye'} size={16} /> {preview ? 'Ubah' : 'Pratinjau'}
				</button>
			</div>
			{#if preview}
				<div class="preview">{#if body}<RichText text={body} />{:else}<p class="muted">Belum ada isi.</p>{/if}</div>
			{:else}
				<textarea id="body" class="textarea body" bind:value={body} maxlength="20000" aria-invalid={!!errors.body}
					placeholder="Tulis isi berita di sini. Pisahkan paragraf dengan baris kosong."></textarea>
			{/if}
			{#if errors.body}<p class="error">{errors.body}</p>{/if}
			<details class="hint">
				<summary>Tips format tulisan</summary>
				<ul>
					<li>Baris kosong = paragraf baru</li>
					<li><code>**teks**</code> = <strong>teks tebal</strong></li>
					<li><code>- </code> di awal baris = daftar berpoin</li>
					<li><code>## </code> di awal baris = sub-judul</li>
					<li>Tautan yang diawali https:// otomatis bisa diklik</li>
				</ul>
			</details>
		</div>
	</div>

	<div class="card pane">
		<h2>Foto & video</h2>
		<MediaPicker bind:selected={media} bind:coverId {photoRule} />
		{#if errors.mediaIds}<p class="error">{errors.mediaIds}</p>{/if}
	</div>

	<div class="bar">
		{#if initial}
			<span class="status badge">{POST_STATUS_LABELS[initial.status]}</span>
			<button type="button" class="btn btn-danger-ghost" onclick={remove}><Icon name="trash" size={18} /> Hapus</button>
		{/if}
		<span class="spacer"></span>
		<button type="button" class="btn btn-secondary" disabled={busy} onclick={() => save('draft')}>Simpan draf</button>
		<button type="submit" class="btn" disabled={busy}><Icon name="send" size={18} /> {busy ? 'Menyimpan…' : publishLabel}</button>
	</div>
</form>

<style>
	.editor {
		display: grid;
		gap: 1rem;
	}
	.pane {
		padding: 1.1rem;
	}
	.pane h2 {
		font-size: 1.15rem;
	}
	.title {
		font-size: 1.15rem;
		font-weight: 600;
	}
	.cat {
		border: 0;
		padding: 0;
		margin: 0 0 1rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
	}
	.cat legend {
		width: 100%;
		margin-bottom: 0.35rem;
	}
	.body-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.body-head label {
		font-weight: 650;
		font-size: 0.95rem;
		color: var(--ink-2);
	}
	.body {
		min-height: 280px;
	}
	.preview {
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		min-height: 280px;
	}
	.hint {
		font-size: 0.88rem;
		color: var(--muted);
	}
	.hint summary {
		cursor: pointer;
	}
	.hint ul {
		margin: 0.4rem 0 0;
		padding-left: 1.2rem;
	}
	.bar {
		position: sticky;
		bottom: calc(64px + env(safe-area-inset-bottom));
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgb(255 255 255 / 0.95);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
	}
	@media (min-width: 900px) {
		.bar {
			bottom: 12px;
		}
	}
	.spacer {
		flex: 1;
	}
</style>
