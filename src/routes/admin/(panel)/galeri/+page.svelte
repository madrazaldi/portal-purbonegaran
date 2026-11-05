<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import PhotoConsent from '#lib/admin/PhotoConsent.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import { api, errorText, fieldErrors } from '#lib/admin/api.js';
	import { UploadQueue } from '#lib/admin/uploads.svelte.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import { formatDate } from '#lib/dates.js';
	import type { Album, MediaItem } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isUtama = $derived(data.user.roles.includes('admin_utama'));
	const gb = (n: number) =>
		n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : `${Math.max(0.1, n / 1024 ** 2).toFixed(1)} MB`;

	// ------------------------------------------------------------ upload
	let consent = $state(false);
	let uploadAlbum = $state<string>('');
	let fileInput: HTMLInputElement | undefined = $state();
	let uploadMsg = $state('');
	const queue = new UploadQueue();

	function choose() {
		uploadMsg = '';
		if (!consent) {
			uploadMsg = 'Centang pernyataan aturan foto terlebih dahulu.';
			return;
		}
		fileInput?.click();
	}
	async function onFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (!files.length) return;
		let ok = 0;
		await queue.run(files, { consent, albumId: uploadAlbum ? Number(uploadAlbum) : null }, () => ok++);
		if (ok) toast(`${ok} foto berhasil diunggah.`);
		await invalidateAll();
	}

	let ytUrl = $state('');
	let ytBusy = $state(false);
	async function addYoutube(e: SubmitEvent) {
		e.preventDefault();
		ytBusy = true;
		try {
			await api('/admin/media/youtube', {
				body: { url: ytUrl, albumId: uploadAlbum ? Number(uploadAlbum) : null }
			});
			ytUrl = '';
			toast('Video ditambahkan ke galeri.');
			await invalidateAll();
		} catch (err) {
			toast(errorText(err), 'error');
		} finally {
			ytBusy = false;
		}
	}

	// ------------------------------------------------------------ edit media
	let editDialog: HTMLDialogElement | undefined = $state();
	let editing = $state<MediaItem | null>(null);
	let editCaption = $state('');
	let editAlbum = $state('');
	let editInGallery = $state(true);

	function openEdit(m: MediaItem) {
		editing = m;
		editCaption = m.caption;
		editAlbum = m.albumId ? String(m.albumId) : '';
		editInGallery = m.inGallery;
		editDialog?.showModal();
	}
	async function saveEdit(e: SubmitEvent) {
		e.preventDefault();
		if (!editing) return;
		try {
			await api(`/admin/media/${editing.id}`, {
				method: 'PUT',
				body: { caption: editCaption, albumId: editAlbum ? Number(editAlbum) : null, inGallery: editInGallery }
			});
			editDialog?.close();
			toast('Tersimpan.');
			await invalidateAll();
		} catch (err) {
			toast(errorText(err), 'error');
		}
	}
	async function deleteMedia() {
		if (!editing || !confirm('Hapus foto/video ini dari website? Foto juga akan hilang dari berita yang memakainya.')) return;
		try {
			await api(`/admin/media/${editing.id}`, { method: 'DELETE' });
			editDialog?.close();
			toast('Dihapus.');
			await invalidateAll();
		} catch (err) {
			toast(errorText(err), 'error');
		}
	}

	// ------------------------------------------------------------ albums
	let albumDialog: HTMLDialogElement | undefined = $state();
	let albumEditing = $state<Album | null>(null);
	let albumForm = $state({ title: '', description: '', eventDate: '' });
	let albumErrors = $state<Record<string, string>>({});

	function openAlbum(a: Album | null) {
		albumEditing = a;
		albumForm = { title: a?.title ?? '', description: a?.description ?? '', eventDate: a?.eventDate ?? '' };
		albumErrors = {};
		albumDialog?.showModal();
	}
	async function saveAlbum(e: SubmitEvent) {
		e.preventDefault();
		const body = { ...albumForm, eventDate: albumForm.eventDate || null, coverMediaId: albumEditing?.cover?.id ?? null };
		try {
			if (albumEditing) await api(`/admin/albums/${albumEditing.id}`, { method: 'PUT', body });
			else await api('/admin/albums', { body });
			albumDialog?.close();
			toast('Album tersimpan.');
			await invalidateAll();
		} catch (err) {
			albumErrors = fieldErrors(err);
			if (!Object.keys(albumErrors).length) toast(errorText(err), 'error');
		}
	}
	async function deleteAlbum() {
		if (!albumEditing || !confirm(`Hapus album "${albumEditing.title}"? Foto di dalamnya tetap ada di galeri.`)) return;
		try {
			await api(`/admin/albums/${albumEditing.id}`, { method: 'DELETE' });
			albumDialog?.close();
			toast('Album dihapus.');
			await goto('/admin/galeri', { invalidateAll: true });
		} catch (err) {
			toast(errorText(err), 'error');
		}
	}

	const filterHref = (album: number | null, page = 1) => {
		const q = new URLSearchParams();
		if (album) q.set('album', String(album));
		if (page > 1) q.set('page', String(page));
		const s = q.toString();
		return s ? `/admin/galeri?${s}` : '/admin/galeri';
	};
</script>

<AdminHeader title="Galeri" intro="Foto dikecilkan otomatis sebelum diunggah agar hemat kuota." />

<p class="usage" class:warn={data.storage.usedBytes / data.storage.limitBytes > 0.8}>
	Penyimpanan terpakai: <strong>{gb(data.storage.usedBytes)}</strong> dari {gb(data.storage.limitBytes)}
	<progress max={data.storage.limitBytes} value={data.storage.usedBytes}></progress>
</p>

<section class="card upload">
	<h2>Unggah foto</h2>
	<div class="field">
		<label for="ua">Masukkan ke album <span class="muted">(opsional)</span></label>
		<select id="ua" class="select" bind:value={uploadAlbum}>
			<option value="">Tanpa album</option>
			{#each data.albums as a (a.id)}<option value={String(a.id)}>{a.title}</option>{/each}
		</select>
	</div>
	<PhotoConsent rule={data.photoRule} bind:checked={consent} />
	{#if uploadMsg}<p class="err">{uploadMsg}</p>{/if}
	<button class="btn" onclick={choose} disabled={queue.busy}>
		<Icon name="upload" size={18} />
		{queue.busy ? `Mengunggah ${queue.done + 1} dari ${queue.total}…` : 'Pilih foto dari HP / komputer'}
	</button>
	<input bind:this={fileInput} type="file" accept="image/*" multiple hidden onchange={onFiles} />
	{#if queue.busy}<progress max={queue.total} value={queue.done}></progress>{/if}
	{#each queue.errors as err (err)}<p class="err">{err}</p>{/each}

	<form class="yt" onsubmit={addYoutube}>
		<label for="yt" class="label">Atau tambahkan video YouTube</label>
		<div class="yt-row">
			<input id="yt" class="input" placeholder="https://youtu.be/…" bind:value={ytUrl} />
			<button class="btn btn-secondary" disabled={ytBusy || !ytUrl}>Tambah</button>
		</div>
	</form>
</section>

<section class="albums">
	<div class="albums-head">
		<h2>Album</h2>
		<button class="btn btn-secondary btn-sm" onclick={() => openAlbum(null)}><Icon name="plus" size={16} /> Album baru</button>
	</div>
	<div class="chips">
		<a class="chip" href={filterHref(null)} aria-current={!data.albumFilter ? 'true' : undefined}>Semua foto</a>
		{#each data.albums as a (a.id)}
			<span class="chip-wrap">
				<a class="chip" href={filterHref(a.id)} aria-current={data.albumFilter === a.id ? 'true' : undefined}>{a.title} ({a.count})</a>
				<button class="chip-edit" aria-label="Ubah album {a.title}" onclick={() => openAlbum(a)}><Icon name="edit" size={14} /></button>
			</span>
		{/each}
	</div>
</section>

{#if data.media.items.length}
	<ul class="grid-media">
		{#each data.media.items as m (m.id)}
			<li>
				<button onclick={() => openEdit(m)} aria-label="Ubah {m.caption || 'foto'}">
					<img src={m.thumbUrl} alt={m.caption} loading="lazy" />
					{#if m.kind === 'youtube'}<span class="tag">Video</span>{/if}
					{#if !m.inGallery}<span class="tag hidden-tag">Tidak di galeri</span>{/if}
				</button>
			</li>
		{/each}
	</ul>
	<Pagination page={data.media.page} totalPages={data.media.totalPages} href={(p) => filterHref(data.albumFilter, p)} />
{:else}
	<p class="muted">Belum ada foto{data.albumFilter ? ' di album ini' : ''}.</p>
{/if}

<dialog bind:this={editDialog} class="dlg">
	{#if editing}
		<form onsubmit={saveEdit}>
			<img class="dlg-img" src={editing.thumbUrl} alt="" />
			<div class="field">
				<label for="cap">Keterangan</label>
				<input id="cap" class="input" bind:value={editCaption} maxlength="300" placeholder="Contoh: Kirab Merti Kali Belik 2026" />
			</div>
			<div class="field">
				<label for="alb">Album</label>
				<select id="alb" class="select" bind:value={editAlbum}>
					<option value="">Tanpa album</option>
					{#each data.albums as a (a.id)}<option value={String(a.id)}>{a.title}</option>{/each}
				</select>
			</div>
			<label class="check"><input type="checkbox" bind:checked={editInGallery} /> Tampilkan di halaman Galeri</label>
			<div class="dlg-actions">
				<!-- Admin konten can only delete their own uploads; the API enforces this. -->
				<button type="button" class="btn btn-danger-ghost" onclick={deleteMedia}><Icon name="trash" size={18} /> Hapus</button>
				<span class="spacer"></span>
				<button type="button" class="btn btn-secondary" onclick={() => editDialog?.close()}>Batal</button>
				<button class="btn">Simpan</button>
			</div>
		</form>
	{/if}
</dialog>

<dialog bind:this={albumDialog} class="dlg">
	<form onsubmit={saveAlbum}>
		<h2>{albumEditing ? 'Ubah album' : 'Album baru'}</h2>
		<div class="field">
			<label for="at">Judul album</label>
			<input id="at" class="input" bind:value={albumForm.title} maxlength="120" placeholder="Contoh: Merti Kali Belik 2026" aria-invalid={!!albumErrors.title} />
			{#if albumErrors.title}<p class="error">{albumErrors.title}</p>{/if}
		</div>
		<div class="field">
			<label for="ad">Tanggal kegiatan <span class="muted">(opsional)</span></label>
			<input id="ad" class="input" type="date" bind:value={albumForm.eventDate} />
			{#if albumForm.eventDate}<p class="hint">{formatDate(albumForm.eventDate)}</p>{/if}
		</div>
		<div class="field">
			<label for="ads">Keterangan <span class="muted">(opsional)</span></label>
			<textarea id="ads" class="textarea" bind:value={albumForm.description} maxlength="1000"></textarea>
		</div>
		<div class="dlg-actions">
			{#if albumEditing && isUtama}
				<button type="button" class="btn btn-danger-ghost" onclick={deleteAlbum}><Icon name="trash" size={18} /> Hapus</button>
			{/if}
			<span class="spacer"></span>
			<button type="button" class="btn btn-secondary" onclick={() => albumDialog?.close()}>Batal</button>
			<button class="btn">Simpan</button>
		</div>
	</form>
</dialog>

<style>
	.usage {
		font-size: 0.9rem;
		color: var(--muted);
		margin: -0.5rem 0 1rem;
	}
	.usage progress {
		display: block;
		width: min(320px, 100%);
		margin-top: 0.25rem;
		accent-color: var(--primary);
	}
	.usage.warn {
		color: var(--warning);
	}
	.upload {
		padding: 1.1rem;
		margin-bottom: 1.5rem;
	}
	.upload h2,
	.albums h2 {
		font-size: 1.15rem;
	}
	progress {
		width: 100%;
		margin-top: 0.75rem;
		accent-color: var(--primary);
	}
	.err {
		color: var(--danger);
		font-weight: 600;
		font-size: 0.88rem;
		margin: 0.5rem 0 0;
	}
	.yt {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
	.yt .label {
		display: block;
		font-weight: 650;
		font-size: 0.95rem;
		margin-bottom: 0.35rem;
	}
	.yt-row {
		display: flex;
		gap: 0.5rem;
	}
	.albums-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.chip-wrap {
		display: inline-flex;
		align-items: center;
		border: 1.5px solid var(--line-strong);
		border-radius: 999px;
		background: var(--surface);
		overflow: hidden;
	}
	.chip {
		display: inline-block;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		color: var(--ink-2);
		text-decoration: none;
		font-size: 0.88rem;
		font-weight: 600;
	}
	.chip-wrap .chip {
		border: 0;
		border-radius: 0;
	}
	.chip[aria-current='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: #fff;
	}
	.chip-edit {
		border: 0;
		border-left: 1px solid var(--line);
		background: none;
		padding: 0.35rem 0.55rem;
		cursor: pointer;
		color: var(--muted);
		display: grid;
		place-items: center;
	}
	.grid-media {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(30%, 150px), 1fr));
		gap: 6px;
	}
	.grid-media button {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: 10px;
		overflow: hidden;
		background: var(--surface-2);
		cursor: pointer;
	}
	.grid-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.tag {
		position: absolute;
		top: 6px;
		left: 6px;
		background: rgb(0 0 0 / 0.7);
		color: #fff;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 6px;
	}
	.hidden-tag {
		top: auto;
		bottom: 6px;
	}
	.dlg-img {
		width: 100%;
		max-height: 240px;
		object-fit: contain;
		background: var(--surface-2);
		border-radius: 10px;
		margin-bottom: 1rem;
	}
	.spacer {
		flex: 1;
	}
</style>
