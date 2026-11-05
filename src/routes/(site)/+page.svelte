<script lang="ts">
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import PostCard from '#lib/components/PostCard.svelte';
	import OccurrenceItem from '#lib/components/OccurrenceItem.svelte';
	import GalleryGrid from '#lib/components/GalleryGrid.svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const site = $derived(data.site);

	const QUICK: { href: string; label: string; icon: IconName }[] = [
		{ href: '/kalender', label: 'Kalender kegiatan', icon: 'calendar' },
		{ href: '/berita', label: 'Berita & pengumuman', icon: 'news' },
		{ href: '/galeri', label: 'Galeri foto & video', icon: 'image' },
		{ href: '/kontak', label: 'Kontak & lokasi', icon: 'pin' }
	];

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Place',
		name: `${site.siteName} RW 11`,
		description: site.welcomeText,
		url: page.data.origin,
		address: {
			'@type': 'PostalAddress',
			streetAddress: site.address,
			addressLocality: 'Yogyakarta',
			addressRegion: 'Daerah Istimewa Yogyakarta',
			addressCountry: 'ID'
		},
		geo: { '@type': 'GeoCoordinates', latitude: site.mapLat, longitude: site.mapLng }
	});
</script>

<Seo
	title={site.siteName}
	description="{site.tagline}. Berita, kalender kegiatan, galeri, dan informasi kampung."
	image={site.hero?.url}
	{jsonLd}
/>

<section class="hero" class:has-photo={!!site.hero}>
	{#if site.hero?.url}
		<img class="hero-img" src={site.hero.url} alt={site.hero.caption} fetchpriority="high" />
	{/if}
	<div class="container hero-inner">
		<p class="eyebrow hero-eyebrow">Kampung Wisata · RW 11 Terban</p>
		<h1>{site.siteName}</h1>
		<p class="lead">{site.tagline}</p>
		<div class="hero-actions">
			<a class="btn btn-gold" href="/kalender"><Icon name="calendar" size={18} /> Lihat kegiatan</a>
			<a class="btn btn-light" href="/profil">Kenali kampung kami</a>
		</div>
	</div>
</section>

<nav class="container quick" aria-label="Pintasan">
	{#each QUICK as q (q.href)}
		<a class="card quick-item" href={q.href}>
			<span class="quick-icon"><Icon name={q.icon} size={22} /></span>
			<span>{q.label}</span>
		</a>
	{/each}
</nav>

<section class="container section welcome-wrap">
	<div class="welcome">
		<p class="eyebrow">Sambutan</p>
		<h2>{site.welcomeTitle}</h2>
		<p class="welcome-text">{site.welcomeText}</p>
		{#if site.welcomeBy}<p class="signature">— {site.welcomeBy}</p>{/if}
	</div>

	<div class="card upcoming">
		<div class="section-head">
			<h2>Kegiatan terdekat</h2>
			<a href="/kalender">Kalender <Icon name="arrow" size={16} /></a>
		</div>
		{#if data.events.length}
			<ul class="occ-list">
				{#each data.events as item (`${item.eventId}-${item.date}`)}
					<OccurrenceItem {item} />
				{/each}
			</ul>
		{:else}
			<p class="muted">Belum ada kegiatan terjadwal dalam 60 hari ke depan.</p>
		{/if}
	</div>
</section>

<section class="section news-band">
	<div class="container">
		<div class="section-head">
			<div>
				<p class="eyebrow">Kabar kampung</p>
				<h2>Berita terbaru</h2>
			</div>
			<a class="btn btn-secondary btn-sm" href="/berita">Semua berita <Icon name="arrow" size={16} /></a>
		</div>
		{#if data.posts.length}
			<div class="grid grid-3">
				{#each data.posts as post (post.id)}<PostCard {post} />{/each}
			</div>
		{:else}
			<p class="muted">Belum ada berita. Nantikan kabar dari pengurus kampung.</p>
		{/if}
	</div>
</section>

{#if data.gallery.length}
	<section class="container section">
		<div class="section-head">
			<div>
				<p class="eyebrow">Galeri</p>
				<h2>Suasana kampung</h2>
			</div>
			<a class="btn btn-secondary btn-sm" href="/galeri">Buka galeri <Icon name="arrow" size={16} /></a>
		</div>
		<GalleryGrid items={data.gallery} />
	</section>
{/if}

<section class="container section split">
	<div>
		<p class="eyebrow">Wilayah</p>
		<h2>Lima RT di RW 11</h2>
		<p class="muted">
			Kampung Purbonegaran RW 11 terdiri dari RT 49 sampai RT 53 di Kelurahan Terban, Kecamatan
			Gondokusuman.
		</p>
		<ul class="rt-chips">
			{#each data.rts as rt (rt.id)}
				<li><a href="/rt#rt-{rt.number}">RT {rt.number}</a></li>
			{/each}
		</ul>
	</div>
	{#if data.links.length}
		<div>
			<p class="eyebrow">Layanan</p>
			<h2>Aplikasi kampung</h2>
			<ul class="apps">
				{#each data.links.slice(0, 4) as link (link.id)}
					<li>
						<Icon name="apps" size={18} />
						{#if link.url}
							<a href={link.url}>{link.title}</a>
						{:else}
							<span>{link.title}</span> <span class="badge">Segera hadir</span>
						{/if}
					</li>
				{/each}
			</ul>
			<a href="/aplikasi">Lihat semua layanan <Icon name="arrow" size={16} /></a>
		</div>
	{/if}
</section>

<style>
	.hero {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		color: #fff;
		background: var(--kawung), linear-gradient(160deg, var(--primary) 0%, var(--primary-600) 100%);
		background-size: 44px, auto;
		padding-block: clamp(3.5rem, 2rem + 8vw, 7.5rem) clamp(4.5rem, 3rem + 6vw, 7rem);
	}
	.hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -2;
	}
	.hero.has-photo::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(180deg, rgb(8 30 24 / 0.25) 0%, rgb(8 30 24 / 0.78) 100%);
	}
	.hero-inner {
		max-width: var(--max);
	}
	.hero-eyebrow {
		color: var(--gold);
	}
	.hero h1 {
		color: #fff;
		font-size: clamp(2.3rem, 1.5rem + 4vw, 4rem);
		max-width: 14ch;
		margin-bottom: 0.4rem;
	}
	.lead {
		font-size: clamp(1.05rem, 1rem + 0.4vw, 1.25rem);
		max-width: 46ch;
		opacity: 0.95;
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 1.5rem;
	}
	.btn-gold {
		--btn-bg: var(--gold);
		--btn-ink: #2b1e05;
	}
	.btn-light {
		--btn-bg: rgb(255 255 255 / 0.12);
		--btn-ink: #fff;
		--btn-line: rgb(255 255 255 / 0.6);
	}

	.quick {
		position: relative;
		margin-top: -2.5rem;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem;
	}
	@media (min-width: 760px) {
		.quick {
			grid-template-columns: repeat(4, 1fr);
			gap: 1rem;
		}
	}
	.quick-item {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.9rem;
		text-decoration: none;
		color: var(--ink);
		font-weight: 650;
		font-size: 0.95rem;
		line-height: 1.25;
		box-shadow: var(--shadow);
	}
	.quick-item:hover {
		color: var(--primary);
		border-color: var(--primary);
	}
	.quick-icon {
		flex: none;
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		background: var(--primary-50);
		color: var(--primary);
	}

	.welcome-wrap {
		display: grid;
		gap: 2rem;
	}
	@media (min-width: 900px) {
		.welcome-wrap {
			grid-template-columns: 1fr 1fr;
			align-items: start;
			gap: 3rem;
		}
	}
	.welcome-text {
		font-size: 1.12rem;
		line-height: 1.75;
		white-space: pre-line;
	}
	.signature {
		font-family: var(--font-serif);
		font-style: italic;
		color: var(--accent);
		font-size: 1.1rem;
	}
	.upcoming {
		padding: 1.25rem 1.25rem 0.5rem;
	}
	.upcoming .section-head {
		margin-bottom: 0.25rem;
	}
	.upcoming h2 {
		font-size: 1.35rem;
	}
	.upcoming .section-head a,
	.apps + a {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-weight: 600;
	}
	.occ-list {
		margin: 0;
		padding: 0;
	}

	.news-band {
		background: var(--surface-2);
	}

	.split {
		display: grid;
		gap: 2.5rem;
	}
	@media (min-width: 860px) {
		.split {
			grid-template-columns: 1fr 1fr;
			gap: 3rem;
		}
	}
	.rt-chips {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.rt-chips a {
		display: inline-block;
		padding: 0.55rem 1rem;
		border-radius: 999px;
		background: var(--surface);
		border: 1.5px solid var(--line-strong);
		font-weight: 700;
		text-decoration: none;
	}
	.rt-chips a:hover {
		border-color: var(--primary);
	}
	.apps {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
	}
	.apps li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
		color: var(--primary);
	}
	.apps li span:not(.badge) {
		color: var(--ink);
		font-weight: 600;
	}
	.apps a {
		font-weight: 600;
	}
</style>
