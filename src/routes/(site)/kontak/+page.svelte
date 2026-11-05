<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { formatPhone, whatsappLink } from '#lib/contact.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);

	const d = 0.004;
	const mapSrc = $derived(
		`https://www.openstreetmap.org/export/embed.html?bbox=${site.mapLng - d},${site.mapLat - d},${site.mapLng + d},${site.mapLat + d}&layer=mapnik&marker=${site.mapLat},${site.mapLng}`
	);
	const gmaps = $derived(`https://www.google.com/maps/search/?api=1&query=${site.mapLat},${site.mapLng}`);

	let form = $state({ name: '', contact: '', body: '', website: '' });
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		status = 'sending';
		errorMsg = '';
		fieldErrors = {};
		try {
			const res = await fetch('/api/messages', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(form)
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				errorMsg = json.error ?? 'Pesan gagal dikirim.';
				fieldErrors = json.fields ?? {};
				status = 'error';
				return;
			}
			status = 'sent';
			form = { name: '', contact: '', body: '', website: '' };
		} catch {
			errorMsg = 'Tidak ada koneksi internet. Coba lagi.';
			status = 'error';
		}
	}
</script>

<Seo title="Kontak & Lokasi" description="Alamat, peta, dan cara menghubungi pengurus Kampung Purbonegaran RW 11." />
<PageHeader eyebrow="Hubungi kami" title="Kontak & Lokasi" intro={site.contactNote} />

<div class="container section layout">
	<div class="info">
		<div class="card block">
			<h2><Icon name="pin" size={20} /> Alamat</h2>
			<p>{site.address}</p>
			<a class="btn btn-secondary btn-sm" href={gmaps} rel="noopener" target="_blank"
				><Icon name="map" size={16} /> Buka di Google Maps</a
			>
		</div>
		{#if site.contactWhatsapp || site.contactEmail}
			<div class="card block">
				<h2><Icon name="phone" size={20} /> Kontak kampung</h2>
				{#if site.contactWhatsapp}
					<p>
						<a class="btn btn-sm wa" href={whatsappLink(site.contactWhatsapp)} rel="noopener"
							><Icon name="whatsapp" size={18} /> WhatsApp {formatPhone(site.contactWhatsapp)}</a
						>
					</p>
				{/if}
				{#if site.contactEmail}
					<p><a href="mailto:{site.contactEmail}"><Icon name="mail" size={16} /> {site.contactEmail}</a></p>
				{/if}
			</div>
		{/if}
		<div class="map card">
			<iframe title="Peta lokasi {site.siteName}" src={mapSrc} loading="lazy"></iframe>
		</div>
	</div>

	<div class="card block form-card">
		<h2><Icon name="send" size={20} /> Kirim pesan ke pengurus</h2>
		{#if status === 'sent'}
			<div class="notice notice-success" role="status">
				<p><strong>Terima kasih, pesan sudah terkirim.</strong> Pengurus akan membacanya secepatnya.</p>
			</div>
			<button class="btn btn-secondary" type="button" onclick={() => (status = 'idle')}>Kirim pesan lain</button>
		{:else}
			<form onsubmit={submit} novalidate>
				{#if status === 'error' && errorMsg}
					<div class="notice notice-error" role="alert"><p>{errorMsg}</p></div>
				{/if}
				<div class="field">
					<label for="name">Nama</label>
					<input id="name" class="input" bind:value={form.name} required maxlength="100" autocomplete="name" aria-invalid={!!fieldErrors.name} />
					{#if fieldErrors.name}<p class="error">{fieldErrors.name}</p>{/if}
				</div>
				<div class="field">
					<label for="contact">Nomor HP atau email <span class="muted">(opsional)</span></label>
					<input id="contact" class="input" bind:value={form.contact} maxlength="120" autocomplete="tel" />
					<p class="hint">Isi jika ingin dibalas. Hanya pengurus yang dapat melihatnya.</p>
				</div>
				<div class="field">
					<label for="body">Pesan</label>
					<textarea id="body" class="textarea" bind:value={form.body} required maxlength="3000" aria-invalid={!!fieldErrors.body}></textarea>
					{#if fieldErrors.body}<p class="error">{fieldErrors.body}</p>{/if}
				</div>
				<div class="hp" aria-hidden="true">
					<label for="website">Website</label>
					<input id="website" tabindex="-1" autocomplete="off" bind:value={form.website} />
				</div>
				<button class="btn btn-block" type="submit" disabled={status === 'sending'}>
					{status === 'sending' ? 'Mengirim…' : 'Kirim pesan'}
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.layout {
		display: grid;
		gap: 1.25rem;
		align-items: start;
	}
	@media (min-width: 900px) {
		.layout {
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
		}
	}
	.info {
		display: grid;
		gap: 1rem;
	}
	.block {
		padding: 1.25rem;
	}
	.block h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-sans);
		font-size: 1.1rem;
		color: var(--primary);
	}
	.block p a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.wa {
		--btn-bg: #1f8f4e;
	}
	.map {
		overflow: hidden;
		aspect-ratio: 4 / 3;
	}
	.map iframe {
		width: 100%;
		height: 100%;
		border: 0;
	}
	.hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
</style>
