<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { formatPhone, whatsappLink } from '#lib/contact.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const NAV = [
		{ href: '/', label: 'Beranda' },
		{ href: '/profil', label: 'Profil' },
		{ href: '/kalender', label: 'Kalender' },
		{ href: '/berita', label: 'Berita' },
		{ href: '/galeri', label: 'Galeri' },
		{ href: '/kontak', label: 'Kontak' }
	];
	const MORE = [
		{ href: '/sejarah', label: 'Sejarah' },
		{ href: '/rt', label: 'Informasi RT' },
		{ href: '/aplikasi', label: 'Aplikasi Kampung' }
	];

	let menu: HTMLDetailsElement | undefined = $state();
	afterNavigate(() => {
		if (menu) menu.open = false;
	});

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	const year = new Date().getFullYear();
</script>

<a class="skip" href="#main">Langsung ke isi</a>

<header class="site-header">
	<div class="container bar">
		<a class="brand" href="/" aria-label="{data.site.siteName}, ke beranda">
			<Logo size={40} />
			<span class="brand-text">
				<span class="brand-name">{data.site.siteName}</span>
				<span class="brand-sub">RW 11 · Terban · Yogyakarta</span>
			</span>
		</a>

		<nav class="desktop-nav" aria-label="Menu utama">
			{#each NAV as item (item.href)}
				<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</a>
			{/each}
		</nav>

		<details class="mobile-nav" bind:this={menu}>
			<summary aria-label="Buka menu">
				<Icon name="menu" size={24} />
				<span>Menu</span>
			</summary>
			<nav class="panel" aria-label="Menu">
				{#each [...NAV, ...MORE] as item (item.href)}
					<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</a>
				{/each}
			</nav>
		</details>
	</div>
</header>

<main id="main">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="container cols">
		<div class="about">
			<div class="brand footer-brand">
				<Logo size={36} />
				<span class="brand-name">{data.site.siteName}</span>
			</div>
			<p>{data.site.address}</p>
			{#if data.site.contactWhatsapp}
				<p>
					<a class="foot-link" href={whatsappLink(data.site.contactWhatsapp)} rel="noopener"
						><Icon name="whatsapp" size={18} /> {formatPhone(data.site.contactWhatsapp)}</a
					>
				</p>
			{/if}
		</div>
		<nav aria-label="Jelajahi">
			<h2>Jelajahi</h2>
			<ul>
				{#each [...NAV.slice(1), ...MORE] as item (item.href)}
					<li><a href={item.href}>{item.label}</a></li>
				{/each}
			</ul>
		</nav>
		<div>
			<h2>Kalender di HP</h2>
			<p class="small">
				Tambahkan jadwal kegiatan kampung ke Google Calendar atau kalender HP Anda.
			</p>
			<a class="foot-link" href="/kalender.ics"><Icon name="download" size={18} /> Langganan kalender</a>
		</div>
	</div>
	<div class="container legal">
		<p>© {year} Kampung Purbonegaran RW 11, Kelurahan Terban.</p>
		<p>Dikembangkan bersama KKN-PPM UGM · <a href="/admin">Masuk pengurus</a></p>
	</div>
</footer>

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0;
		z-index: 100;
		background: var(--ink);
		color: #fff;
		padding: 0.6rem 1rem;
	}
	.skip:focus {
		left: 8px;
		top: 8px;
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: rgb(250 247 240 / 0.92);
		backdrop-filter: saturate(1.4) blur(10px);
		-webkit-backdrop-filter: saturate(1.4) blur(10px);
		border-bottom: 1px solid var(--line);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 64px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--ink);
		min-width: 0;
	}
	.brand-text {
		display: grid;
		line-height: 1.15;
		min-width: 0;
	}
	.brand-name {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 1.12rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.brand-sub {
		font-size: 0.74rem;
		color: var(--muted);
		letter-spacing: 0.02em;
	}

	.desktop-nav {
		display: none;
		gap: 0.25rem;
	}
	.desktop-nav a {
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		color: var(--ink-2);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.97rem;
	}
	.desktop-nav a:hover {
		background: var(--surface-2);
		color: var(--ink);
	}
	.desktop-nav a[aria-current='page'] {
		background: var(--primary-50);
		color: var(--primary);
	}

	.mobile-nav summary {
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 44px;
		padding: 0 0.8rem;
		border-radius: 999px;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		font-weight: 650;
		cursor: pointer;
		color: var(--ink);
	}
	.mobile-nav summary::-webkit-details-marker {
		display: none;
	}
	.mobile-nav[open] summary {
		background: var(--primary);
		border-color: var(--primary);
		color: #fff;
	}
	.panel {
		position: absolute;
		left: 0;
		right: 0;
		top: 100%;
		background: var(--surface);
		border-bottom: 1px solid var(--line);
		box-shadow: var(--shadow);
		padding: 0.5rem var(--gutter) 1rem;
		display: grid;
	}
	.panel a {
		padding: 0.85rem 0.25rem;
		border-bottom: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
		font-weight: 600;
		font-size: 1.05rem;
	}
	.panel a:last-child {
		border-bottom: 0;
	}
	.panel a[aria-current='page'] {
		color: var(--primary);
	}

	@media (min-width: 900px) {
		.desktop-nav {
			display: flex;
		}
		.mobile-nav {
			display: none;
		}
	}

	main {
		min-height: 60vh;
	}

	.site-footer {
		margin-top: 3rem;
		background: var(--kawung), var(--primary-600);
		background-size: 40px, auto;
		color: #e3efe9;
		padding-top: 2.5rem;
	}
	.site-footer a {
		color: #fff;
	}
	.cols {
		display: grid;
		gap: 2rem;
	}
	@media (min-width: 760px) {
		.cols {
			grid-template-columns: 1.4fr 1fr 1fr;
		}
	}
	.footer-brand {
		color: #fff;
		margin-bottom: 0.75rem;
	}
	.site-footer h2 {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--gold);
		margin-bottom: 0.75rem;
	}
	.site-footer ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem 1rem;
	}
	.site-footer ul a {
		text-decoration: none;
	}
	.site-footer ul a:hover {
		text-decoration: underline;
	}
	.small {
		font-size: 0.92rem;
	}
	.foot-link {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 600;
	}
	.legal {
		margin-top: 2rem;
		padding-block: 1.1rem 1.4rem;
		border-top: 1px solid rgb(255 255 255 / 0.15);
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1.5rem;
		font-size: 0.85rem;
		color: #bcd4ca;
	}
	.legal p {
		margin: 0;
	}
</style>
