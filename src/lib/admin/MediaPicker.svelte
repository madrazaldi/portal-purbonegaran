<script lang="ts">
	import type { MediaItem, Paginated, PhotoRule } from '#lib/types.js';
	import Icon from '#lib/components/Icon.svelte';
	import { api, errorText } from './api.js';
	import { UploadQueue } from './uploads.svelte.js';
	import PhotoConsent from './PhotoConsent.svelte';

	let {
		selected = $bindable([]),
		coverId = $bindable(null),
		photoRule
	}: { selected: MediaItem[]; coverId: number | null; photoRule: PhotoRule } = $props();

	let consent = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	const queue = new UploadQueue();
	let message = $state('');

	const effectiveCover = $derived(coverId ?? selected.find((m) => m.kind === 'image')?.id ?? null);

	function add(m: MediaItem) {
		if (!selected.some((s) => s.id === m.id)) selected = [...selected, m];
	}
	function remove(id: number) {
		selected = selected.filter((m) => m.id !== id);
		if (coverId === id) coverId = null;
	}
	function move(i: number, d: number) {
		const j = i + d;
		if (j < 0 || j >= selected.length) return;
		const next = [...selected];
		[next[i], next[j]] = [next[j], next[i]];
		selected = next;
	}

	async function onFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (!files.length) return;
		await queue.run(files, { consent, inGallery: true }, add);
	}

	function pickFromPhone() {
		message = '';
		if (!consent) {
			message = 'Centang pernyataan aturan foto terlebih dahulu.';
			return;
		}
		fileInput?.click();
	}

	// ------------------------------------------------------------ library
	let dialog: HTMLDialogElement | undefined = $state();
	let library = $state<Paginated<MediaItem> | null>(null);
	let libraryError = $state('');

	async function openLibrary(page = 1) {
		libraryError = '';
		dialog?.showModal();
		try {
			library = await api<Paginated<MediaItem>>(`/admin/media?page=${page}`);
		} catch (e) {
			libraryError = errorText(e);
		}
	}
	function toggle(m: MediaItem) {
		if (selected.some((s) => s.id === m.id)) remove(m.id);
		else add(m);
	}

	// ------------------------------------------------------------ youtube
	let ytOpen = $state(false);
	let ytUrl = $state('');
	let ytBusy = $state(false);
	let ytError = $state('');
	async function addYoutube() {
		ytBusy = true;
		ytError = '';
		try {
			add(await api<MediaItem>('/admin/media/youtube', { body: { url: ytUrl, inGallery: true } }));
			ytUrl = '';
			ytOpen = false;
		} catch (e) {
			ytError = errorText(e);
		} finally {
			ytBusy = false;
		}
	}
</script>

<div class="picker">
	{#if selected.length}
		<ul class="selected">
			{#each selected as m, i (m.id)}
				<li class:cover={m.id === effectiveCover}>
					<img src={m.thumbUrl} alt={m.caption} />
					{#if m.kind === 'youtube'}<span class="tag">Video</span>{/if}
					{#if m.id === effectiveCover}<span class="tag cover-tag">Sampul</span>{/if}
					<div class="tools">
						{#if m.kind === 'image' && m.id !== effectiveCover}
							<button type="button" onclick={() => (coverId = m.id)} title="Jadikan sampul"><Icon name="star" size={16} /></button>
						{/if}
						<button type="button" onclick={() => move(i, -1)} disabled={i === 0} title="Geser ke kiri"><Icon name="left" size={16} /></button>
						<button type="button" onclick={() => move(i, 1)} disabled={i === selected.length - 1} title="Geser ke kanan"><Icon name="right" size={16} /></button>
						<button type="button" onclick={() => remove(m.id)} title="Lepas dari berita"><Icon name="x" size={16} /></button>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted empty">Belum ada foto. Foto pertama akan menjadi sampul berita.</p>
	{/if}

	<PhotoConsent rule={photoRule} bind:checked={consent} />
	{#if message}<p class="error-text">{message}</p>{/if}

	<div class="buttons">
		<button type="button" class="btn btn-secondary" onclick={pickFromPhone} disabled={queue.busy}>
			<Icon name="upload" size={18} /> {queue.busy ? `Mengunggah ${queue.done + 1} dari ${queue.total}…` : 'Tambah foto dari HP'}
		</button>
		<button type="button" class="btn btn-ghost" onclick={() => openLibrary()}><Icon name="grid" size={18} /> Pilih dari galeri</button>
		<button type="button" class="btn btn-ghost" onclick={() => (ytOpen = !ytOpen)}><Icon name="play" size={18} /> Video YouTube</button>
	</div>
	<input bind:this={fileInput} type="file" accept="image/*" multiple hidden onchange={onFiles} />

	{#each queue.errors as err (err)}<p class="error-text">{err}</p>{/each}

	{#if ytOpen}
		<div class="yt">
			<label for="yt-url" class="visually-hidden">Tautan YouTube</label>
			<input id="yt-url" class="input" placeholder="Tempel tautan YouTube, mis. https://youtu.be/…" bind:value={ytUrl} />
			<button type="button" class="btn" onclick={addYoutube} disabled={ytBusy || !ytUrl}>Tambah</button>
		</div>
		{#if ytError}<p class="error-text">{ytError}</p>{/if}
	{/if}
</div>

<dialog bind:this={dialog} class="library">
	<header>
		<h2>Pilih dari galeri</h2>
		<form method="dialog"><button class="btn btn-sm">Selesai ({selected.length})</button></form>
	</header>
	{#if libraryError}<p class="error-text">{libraryError}</p>{/if}
	{#if library}
		{#if library.items.length}
			<ul class="lib-grid">
				{#each library.items as m (m.id)}
					{@const on = selected.some((s) => s.id === m.id)}
					<li>
						<button type="button" class:on onclick={() => toggle(m)} aria-pressed={on}>
							<img src={m.thumbUrl} alt={m.caption} loading="lazy" />
							{#if on}<span class="checkmark"><Icon name="check" size={18} /></span>{/if}
						</button>
					</li>
				{/each}
			</ul>
			{#if library.totalPages > 1}
				<div class="lib-pages">
					<button class="btn btn-secondary btn-sm" disabled={library.page <= 1} onclick={() => openLibrary(library!.page - 1)}>Sebelumnya</button>
					<span>{library.page} / {library.totalPages}</span>
					<button class="btn btn-secondary btn-sm" disabled={library.page >= library.totalPages} onclick={() => openLibrary(library!.page + 1)}>Berikutnya</button>
				</div>
			{/if}
		{:else}
			<p class="muted">Galeri masih kosong.</p>
		{/if}
	{:else if !libraryError}
		<p class="muted">Memuat…</p>
	{/if}
</dialog>

<style>
	.selected {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 8px;
	}
	.selected li {
		position: relative;
		aspect-ratio: 1;
		border-radius: 10px;
		overflow: hidden;
		background: var(--surface-2);
		outline: 2px solid transparent;
	}
	.selected li.cover {
		outline: 3px solid var(--gold);
		outline-offset: -3px;
	}
	.selected img {
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
	.cover-tag {
		background: var(--gold);
		color: #2b1e05;
		left: auto;
		right: 6px;
	}
	.tools {
		position: absolute;
		inset: auto 0 0;
		display: flex;
		justify-content: center;
		gap: 4px;
		padding: 6px;
		background: linear-gradient(transparent, rgb(0 0 0 / 0.65));
	}
	.tools button {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 0;
		background: rgb(255 255 255 / 0.92);
		color: var(--ink);
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.tools button:disabled {
		opacity: 0.4;
	}
	.empty {
		font-size: 0.92rem;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.yt {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.error-text {
		color: var(--danger);
		font-size: 0.88rem;
		font-weight: 600;
		margin: 0.5rem 0 0;
	}

	.library {
		width: min(860px, calc(100vw - 16px));
		max-height: calc(100dvh - 32px);
		border: 0;
		border-radius: var(--radius);
		padding: 0 1rem 1rem;
		box-shadow: var(--shadow);
	}
	.library::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	.library header {
		position: sticky;
		top: 0;
		background: var(--surface);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.9rem 0;
		z-index: 1;
	}
	.library h2 {
		font-size: 1.2rem;
		margin: 0;
	}
	.lib-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: 6px;
	}
	.lib-grid button {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 3px solid transparent;
		border-radius: 10px;
		overflow: hidden;
		cursor: pointer;
		background: var(--surface-2);
	}
	.lib-grid button.on {
		border-color: var(--primary);
	}
	.lib-grid img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.checkmark {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--primary);
		color: #fff;
		display: grid;
		place-items: center;
	}
	.lib-pages {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1rem;
	}
</style>
