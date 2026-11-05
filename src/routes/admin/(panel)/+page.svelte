<script lang="ts">
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import OccurrenceItem from '#lib/components/OccurrenceItem.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isUtama = $derived(data.user.roles.includes('admin_utama'));
	const firstName = $derived(data.user.name.split(' ')[0]);

	const ACTIONS: { href: string; label: string; hint: string; icon: IconName }[] = [
		{ href: '/admin/berita/baru', label: 'Tulis berita', hint: 'Kabar atau pengumuman baru', icon: 'edit' },
		{ href: '/admin/galeri', label: 'Unggah foto', hint: 'Tambah ke galeri kegiatan', icon: 'upload' },
		{ href: '/admin/kalender/baru', label: 'Tambah kegiatan', hint: 'Masukkan ke kalender', icon: 'calendar' }
	];
</script>

<AdminHeader title="Sugeng rawuh, {firstName}" intro="Apa yang ingin Anda lakukan hari ini?" />

{#if isUtama && data.dash.pendingPosts > 0}
	<a class="notice notice-warn alert" href="/admin/berita?status=pending">
		<Icon name="news" />
		<span><strong>{data.dash.pendingPosts} berita</strong> menunggu persetujuan Anda.</span>
		<Icon name="right" />
	</a>
{/if}
{#if isUtama && data.dash.unreadMessages > 0}
	<a class="notice notice-info alert" href="/admin/pesan">
		<Icon name="mail" />
		<span><strong>{data.dash.unreadMessages} pesan</strong> dari warga belum dibaca.</span>
		<Icon name="right" />
	</a>
{/if}

<div class="actions">
	{#each ACTIONS as a (a.href)}
		<a class="card action" href={a.href}>
			<span class="ic"><Icon name={a.icon} size={24} /></span>
			<span><strong>{a.label}</strong><small>{a.hint}</small></span>
		</a>
	{/each}
</div>

<section class="card upcoming">
	<div class="head">
		<h2>Kegiatan 30 hari ke depan</h2>
		<a href="/admin/kalender">Kelola</a>
	</div>
	{#if data.dash.upcoming.length}
		<ul>
			{#each data.dash.upcoming as item (`${item.eventId}-${item.date}`)}<OccurrenceItem {item} />{/each}
		</ul>
	{:else}
		<p class="muted">Belum ada kegiatan terjadwal. <a href="/admin/kalender/baru">Tambahkan sekarang</a>.</p>
	{/if}
</section>

<style>
	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
	}
	.alert span {
		flex: 1;
	}
	.actions {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	@media (min-width: 700px) {
		.actions {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.action {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem;
		text-decoration: none;
		color: var(--ink);
	}
	.action:hover {
		border-color: var(--primary);
	}
	.action strong,
	.action small {
		display: block;
	}
	.action small {
		color: var(--muted);
		font-size: 0.86rem;
	}
	.ic {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		background: var(--primary);
		color: #fff;
		display: grid;
		place-items: center;
		flex: none;
	}
	.upcoming {
		padding: 1.1rem 1.25rem 0.4rem;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.head h2 {
		font-size: 1.2rem;
	}
	ul {
		margin: 0;
		padding: 0;
	}
</style>
