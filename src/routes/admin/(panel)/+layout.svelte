<script lang="ts">
	import { page } from '$app/state';
	import { goto, afterNavigate } from '$app/navigation';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { api } from '#lib/admin/api.js';
	import Toast from '#lib/admin/Toast.svelte';
	import { ROLE_LABELS } from '#lib/types.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const isUtama = $derived(data.user.roles.includes('admin_utama'));

	type Item = { href: string; label: string; icon: IconName; utama?: boolean };
	const MAIN: Item[] = [
		{ href: '/admin', label: 'Beranda', icon: 'home' },
		{ href: '/admin/berita', label: 'Berita', icon: 'news' },
		{ href: '/admin/kalender', label: 'Kalender', icon: 'calendar' },
		{ href: '/admin/galeri', label: 'Galeri', icon: 'image' }
	];
	const MORE: Item[] = [
		{ href: '/admin/halaman', label: 'Profil & Sejarah', icon: 'file', utama: true },
		{ href: '/admin/rt', label: 'Data RT', icon: 'users', utama: true },
		{ href: '/admin/tautan', label: 'Tautan aplikasi', icon: 'apps', utama: true },
		{ href: '/admin/pesan', label: 'Pesan masuk', icon: 'mail', utama: true },
		{ href: '/admin/pengguna', label: 'Akun admin', icon: 'key', utama: true },
		{ href: '/admin/pengaturan', label: 'Pengaturan', icon: 'settings', utama: true },
		{ href: '/admin/akun', label: 'Kata sandi saya', icon: 'key' }
	];
	const more = $derived(MORE.filter((i) => !i.utama || isUtama));

	const active = (href: string) =>
		href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);
	const moreActive = $derived(more.some((i) => active(i.href)));

	let sheetOpen = $state(false);
	afterNavigate(() => (sheetOpen = false));

	async function logout() {
		await api('/auth/logout', { method: 'POST' }).catch(() => {});
		await goto('/admin/login', { invalidateAll: true });
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="shell">
	<aside class="sidebar">
		<a class="brand" href="/admin"><Logo size={34} /><span>Pengurus<br /><small>{data.siteName}</small></span></a>
		<nav aria-label="Menu admin">
			{#each MAIN as item (item.href)}
				<a href={item.href} aria-current={active(item.href) ? 'page' : undefined}><Icon name={item.icon} />{item.label}</a>
			{/each}
			<hr />
			{#each more as item (item.href)}
				<a href={item.href} aria-current={active(item.href) ? 'page' : undefined}><Icon name={item.icon} />{item.label}</a>
			{/each}
		</nav>
		<div class="me">
			<p><strong>{data.user.name}</strong><br /><small>{data.user.roles.map((r) => ROLE_LABELS[r]).join(', ')}</small></p>
			<a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener"><Icon name="eye" size={16} /> Lihat website</a>
			<button class="btn btn-ghost btn-sm" onclick={logout}><Icon name="logout" size={16} /> Keluar</button>
		</div>
	</aside>

	<header class="topbar">
		<a class="brand" href="/admin"><Logo size={30} /><span>Pengurus</span></a>
		<a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener" aria-label="Lihat website"><Icon name="eye" size={18} /></a>
	</header>

	<main class="content">
		{@render children()}
	</main>
	<Toast />

	<nav class="tabbar" aria-label="Menu admin">
		{#each MAIN as item (item.href)}
			<a href={item.href} aria-current={active(item.href) ? 'page' : undefined}>
				<Icon name={item.icon} size={22} /><span>{item.label}</span>
			</a>
		{/each}
		<button type="button" class:current={moreActive} onclick={() => (sheetOpen = !sheetOpen)} aria-expanded={sheetOpen}>
			<Icon name="menu" size={22} /><span>Lainnya</span>
		</button>
	</nav>

	{#if sheetOpen}
		<button class="scrim" aria-label="Tutup menu" onclick={() => (sheetOpen = false)}></button>
		<div class="sheet" role="dialog" aria-label="Menu lainnya">
			<p class="who"><strong>{data.user.name}</strong> · {data.user.roles.map((r) => ROLE_LABELS[r]).join(', ')}</p>
			{#each more as item (item.href)}
				<a href={item.href} aria-current={active(item.href) ? 'page' : undefined}><Icon name={item.icon} />{item.label}</a>
			{/each}
			<button class="logout" onclick={logout}><Icon name="logout" />Keluar</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background: #f4f2ec;
	}
	.shell {
		min-height: 100dvh;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: var(--ink);
		font-family: var(--font-serif);
		font-weight: 700;
		line-height: 1.15;
	}
	.brand small {
		font-family: var(--font-sans);
		font-weight: 500;
		color: var(--muted);
		font-size: 0.75rem;
	}

	.sidebar {
		display: none;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem var(--gutter);
		background: var(--surface);
		border-bottom: 1px solid var(--line);
	}
	.content {
		padding: 1.25rem var(--gutter) calc(88px + env(safe-area-inset-bottom));
		max-width: 1000px;
	}

	.tabbar {
		position: fixed;
		inset: auto 0 0;
		z-index: 20;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		background: var(--surface);
		border-top: 1px solid var(--line);
		padding-bottom: env(safe-area-inset-bottom);
	}
	.tabbar a,
	.tabbar button {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 0.5rem 0 0.45rem;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--muted);
		text-decoration: none;
		background: none;
		border: 0;
		cursor: pointer;
	}
	.tabbar a[aria-current='page'],
	.tabbar button.current {
		color: var(--primary);
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 25;
		background: rgb(0 0 0 / 0.35);
		border: 0;
	}
	.sheet {
		position: fixed;
		inset: auto 0 0;
		z-index: 30;
		background: var(--surface);
		border-radius: 20px 20px 0 0;
		padding: 1rem var(--gutter) calc(1rem + env(safe-area-inset-bottom));
		display: grid;
		box-shadow: var(--shadow);
	}
	.who {
		font-size: 0.9rem;
		color: var(--muted);
		margin: 0 0 0.5rem;
	}
	.sheet a,
	.sheet .logout {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.85rem 0.25rem;
		border: 0;
		border-top: 1px solid var(--line);
		background: none;
		font: inherit;
		font-weight: 600;
		color: var(--ink);
		text-decoration: none;
		text-align: left;
		cursor: pointer;
	}
	.sheet a[aria-current='page'] {
		color: var(--primary);
	}
	.sheet .logout {
		color: var(--danger);
	}

	@media (min-width: 900px) {
		.shell {
			display: grid;
			grid-template-columns: 250px 1fr;
		}
		.topbar,
		.tabbar,
		.sheet,
		.scrim {
			display: none;
		}
		.sidebar {
			position: sticky;
			top: 0;
			height: 100dvh;
			display: flex;
			flex-direction: column;
			gap: 1rem;
			padding: 1.25rem 0.9rem;
			background: var(--surface);
			border-right: 1px solid var(--line);
			overflow-y: auto;
		}
		.sidebar nav {
			display: grid;
			gap: 2px;
			flex: 1;
		}
		.sidebar nav a {
			display: flex;
			align-items: center;
			gap: 0.7rem;
			padding: 0.6rem 0.75rem;
			border-radius: 10px;
			color: var(--ink-2);
			text-decoration: none;
			font-weight: 600;
			font-size: 0.96rem;
		}
		.sidebar nav a:hover {
			background: var(--surface-2);
		}
		.sidebar nav a[aria-current='page'] {
			background: var(--primary-50);
			color: var(--primary);
		}
		hr {
			border: 0;
			border-top: 1px solid var(--line);
			margin: 0.5rem 0;
			width: 100%;
		}
		.me {
			border-top: 1px solid var(--line);
			padding-top: 0.9rem;
			display: grid;
			justify-items: start;
		}
		.me p {
			margin: 0 0 0.4rem;
			font-size: 0.92rem;
			line-height: 1.35;
		}
		.me small {
			color: var(--muted);
		}
		.content {
			padding: 2rem 2.5rem 3rem;
		}
	}
</style>
