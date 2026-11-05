<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { api, errorText, fieldErrors } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import { PHOTO_RULES, type AdminSettings, type MediaItem, type Paginated } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let s = $state<AdminSettings>(untrack(() => structuredClone(data.settings)));
	let hero = $state<MediaItem | null>(untrack(() => data.hero));
	let errors = $state<Record<string, string>>({});
	let busy = $state(false);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		errors = {};
		try {
			s = await api<AdminSettings>('/admin/settings', { method: 'PUT', body: { ...s, heroMediaId: hero?.id ?? null } });
			toast('Pengaturan tersimpan.');
			await invalidateAll();
		} catch (err) {
			errors = fieldErrors(err);
			toast(errorText(err), 'error');
		} finally {
			busy = false;
		}
	}

	// Hero photo picker
	let dialog: HTMLDialogElement | undefined = $state();
	let library = $state<Paginated<MediaItem> | null>(null);
	async function openPicker(page = 1) {
		dialog?.showModal();
		library = await api<Paginated<MediaItem>>(`/admin/media?page=${page}`);
	}
	function pick(m: MediaItem) {
		hero = m;
		dialog?.close();
	}
	const mapCheck = $derived(`https://www.google.com/maps/search/?api=1&query=${s.mapLat},${s.mapLng}`);
</script>

<AdminHeader title="Pengaturan" />

<form class="stack" onsubmit={save}>
	<section class="card pane">
		<h2>Beranda</h2>
		<div class="field">
			<span class="label">Foto utama</span>
			<div class="hero-row">
				<div class="hero-thumb">{#if hero}<img src={hero.thumbUrl} alt="" />{:else}<span>Belum ada</span>{/if}</div>
				<div class="hero-btns">
					<button type="button" class="btn btn-secondary btn-sm" onclick={() => openPicker()}><Icon name="image" size={16} /> Pilih dari galeri</button>
					{#if hero}<button type="button" class="btn btn-ghost btn-sm" onclick={() => (hero = null)}>Hapus foto</button>{/if}
				</div>
			</div>
			<p class="hint">Pilih foto mendatar yang terang, misalnya suasana Merti Kali Belik. Unggah dulu di menu Galeri.</p>
			{#if errors.heroMediaId}<p class="error">{errors.heroMediaId}</p>{/if}
		</div>
		<div class="row row-2">
			<div class="field">
				<label for="sn">Nama situs</label>
				<input id="sn" class="input" bind:value={s.siteName} maxlength="80" aria-invalid={!!errors.siteName} />
				{#if errors.siteName}<p class="error">{errors.siteName}</p>{/if}
			</div>
			<div class="field">
				<label for="tg">Keterangan singkat</label>
				<input id="tg" class="input" bind:value={s.tagline} maxlength="160" />
			</div>
		</div>
		<div class="field">
			<label for="wt">Judul sambutan</label>
			<input id="wt" class="input" bind:value={s.welcomeTitle} maxlength="120" />
		</div>
		<div class="field">
			<label for="wx">Isi sambutan</label>
			<textarea id="wx" class="textarea" bind:value={s.welcomeText} maxlength="2000"></textarea>
		</div>
		<div class="field">
			<label for="wb">Penyambut</label>
			<input id="wb" class="input" bind:value={s.welcomeBy} maxlength="120" placeholder="Contoh: Ketua RW 11" />
		</div>
	</section>

	<section class="card pane">
		<h2>Kontak & lokasi</h2>
		<div class="notice notice-warn">
			<p>Nomor yang ditampilkan di website bisa dilihat siapa saja, termasuk penipu. Sebaiknya gunakan satu nomor khusus kampung, bukan nomor pribadi.</p>
		</div>
		<div class="field">
			<label for="ad">Alamat</label>
			<textarea id="ad" class="textarea short" bind:value={s.address} maxlength="300"></textarea>
		</div>
		<div class="row row-2">
			<div class="field">
				<label for="wa">Nomor WhatsApp kampung <span class="muted">(opsional)</span></label>
				<input id="wa" class="input" inputmode="tel" bind:value={s.contactWhatsapp} placeholder="0812…" aria-invalid={!!errors.contactWhatsapp} />
				{#if errors.contactWhatsapp}<p class="error">{errors.contactWhatsapp}</p>{/if}
			</div>
			<div class="field">
				<label for="em">Email <span class="muted">(opsional)</span></label>
				<input id="em" class="input" type="email" bind:value={s.contactEmail} aria-invalid={!!errors.contactEmail} />
				{#if errors.contactEmail}<p class="error">{errors.contactEmail}</p>{/if}
			</div>
		</div>
		<div class="field">
			<label for="cn">Catatan di halaman Kontak</label>
			<textarea id="cn" class="textarea short" bind:value={s.contactNote} maxlength="500"></textarea>
		</div>
		<div class="row row-2">
			<div class="field">
				<label for="lat">Lintang (latitude)</label>
				<input id="lat" class="input" type="number" step="any" bind:value={s.mapLat} aria-invalid={!!errors.mapLat} />
			</div>
			<div class="field">
				<label for="lng">Bujur (longitude)</label>
				<input id="lng" class="input" type="number" step="any" bind:value={s.mapLng} aria-invalid={!!errors.mapLng} />
			</div>
		</div>
		<p class="hint">
			Cara mengisi: buka Google Maps, tekan lama titik kampung (mis. balai warga), lalu salin angka koordinatnya.
			<a href={mapCheck} target="_blank" rel="noopener">Cek titik saat ini di peta</a>.
		</p>
	</section>

	<section class="card pane">
		<h2>Aturan konten</h2>
		<label class="check">
			<input type="checkbox" bind:checked={s.requireApproval} />
			<span><strong>Berita dari Admin Konten perlu disetujui Admin Utama sebelum tayang.</strong><br />
				<span class="muted">Disarankan jika admin konten lebih dari dua orang.</span></span>
		</label>
		<fieldset class="rules">
			<legend class="label">Aturan foto warga di galeri</legend>
			{#each PHOTO_RULES as r (r.value)}
				<label class="check"><input type="radio" bind:group={s.photoRule} value={r.value} /> {r.label}</label>
			{/each}
			<p class="hint">Aturan ini diingatkan setiap kali admin mengunggah foto.</p>
		</fieldset>
	</section>

	<div class="bar">
		<button class="btn" disabled={busy}><Icon name="check" size={18} /> {busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
	</div>
</form>

<dialog bind:this={dialog} class="dlg wide">
	<header class="dlg-head">
		<h2>Pilih foto utama</h2>
		<form method="dialog"><button class="btn btn-secondary btn-sm">Tutup</button></form>
	</header>
	{#if library}
		<ul class="pick">
			{#each library.items.filter((m) => m.kind === 'image') as m (m.id)}
				<li><button type="button" onclick={() => pick(m)}><img src={m.thumbUrl} alt={m.caption} loading="lazy" /></button></li>
			{:else}
				<li class="muted">Belum ada foto. Unggah dulu di menu Galeri.</li>
			{/each}
		</ul>
		{#if library.totalPages > 1}
			<div class="pages">
				<button class="btn btn-secondary btn-sm" disabled={library.page <= 1} onclick={() => openPicker(library!.page - 1)}>Sebelumnya</button>
				<button class="btn btn-secondary btn-sm" disabled={library.page >= library.totalPages} onclick={() => openPicker(library!.page + 1)}>Berikutnya</button>
			</div>
		{/if}
	{:else}
		<p class="muted">Memuat…</p>
	{/if}
</dialog>

<style>
	.stack {
		display: grid;
		gap: 1rem;
	}
	.pane {
		padding: 1.1rem;
	}
	.pane h2 {
		font-size: 1.15rem;
	}
	.short {
		min-height: 80px;
	}
	.hero-row {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.hero-thumb {
		width: 180px;
		aspect-ratio: 16 / 9;
		border-radius: 10px;
		overflow: hidden;
		background: var(--surface-2);
		display: grid;
		place-items: center;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.hero-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.hero-btns {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.rules {
		border: 0;
		padding: 0;
		margin: 1.25rem 0 0;
		display: grid;
		gap: 0.5rem;
	}
	.bar {
		position: sticky;
		bottom: calc(64px + env(safe-area-inset-bottom));
		padding: 0.75rem;
		background: rgb(255 255 255 / 0.95);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		display: flex;
		justify-content: flex-end;
	}
	@media (min-width: 900px) {
		.bar {
			bottom: 12px;
		}
	}
	.wide {
		width: min(760px, calc(100vw - 16px));
	}
	.dlg-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.dlg-head h2 {
		margin: 0;
	}
	.pick {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 6px;
	}
	.pick button {
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
	}
	.pick img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.pages {
		display: flex;
		justify-content: space-between;
		margin-top: 0.75rem;
	}
</style>
