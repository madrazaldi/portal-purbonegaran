<script lang="ts">
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import { POST_CATEGORY_LABELS, POST_STATUS_LABELS } from '#lib/types.js';
	import { formatTimestamp } from '#lib/dates.js';
	import { api, errorText } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isUtama = $derived(data.user.roles.includes('admin_utama'));

	const TABS = [
		{ value: '', label: 'Semua' },
		{ value: 'pending', label: 'Menunggu' },
		{ value: 'published', label: 'Tayang' },
		{ value: 'draft', label: 'Draf' },
		{ value: 'rejected', label: 'Dikembalikan' }
	];
	const href = (status: string, page = 1) => {
		const q = new URLSearchParams();
		if (status) q.set('status', status);
		if (page > 1) q.set('page', String(page));
		const s = q.toString();
		return s ? `/admin/berita?${s}` : '/admin/berita';
	};

	async function review(id: number, decision: 'approve' | 'reject') {
		let note = '';
		if (decision === 'reject') {
			note = prompt('Alasan dikembalikan (akan dibaca penulis):')?.trim() ?? '';
			if (!note) return;
		}
		try {
			await api(`/admin/posts/${id}/review`, { body: { decision, note } });
			toast(decision === 'approve' ? 'Berita disetujui dan tayang.' : 'Berita dikembalikan ke penulis.');
			await invalidateAll();
		} catch (e) {
			toast(errorText(e), 'error');
		}
	}
</script>

<AdminHeader title="Berita & pengumuman">
	{#snippet actions()}
		<a class="btn" href="/admin/berita/baru"><Icon name="plus" size={18} /> Tulis berita</a>
	{/snippet}
</AdminHeader>

<nav class="tabs" aria-label="Saring status">
	{#each TABS as t (t.value)}
		<a href={href(t.value)} aria-current={data.status === t.value ? 'page' : undefined}>{t.label}</a>
	{/each}
</nav>

{#if data.list.items.length}
	<ul class="list">
		{#each data.list.items as p (p.id)}
			{@const mine = p.authorId === data.user.id}
			<li class="card row">
				<a class="thumb" href="/admin/berita/{p.id}">
					{#if p.cover}<img src={p.cover.thumbUrl} alt="" loading="lazy" />{/if}
				</a>
				<div class="info">
					<p class="meta">
						<span class="badge st-{p.status}">{POST_STATUS_LABELS[p.status]}</span>
						<span>{POST_CATEGORY_LABELS[p.category]}</span>
					</p>
					<h2><a href="/admin/berita/{p.id}">{p.title}</a></h2>
					<p class="sub muted">{p.authorName ?? 'Tanpa nama'} · diubah {formatTimestamp(p.updatedAt, true)}</p>
					<div class="row-actions">
						{#if isUtama || mine}<a class="btn btn-secondary btn-sm" href="/admin/berita/{p.id}"><Icon name="edit" size={16} /> Ubah</a>{/if}
						{#if p.status === 'published'}<a class="btn btn-ghost btn-sm" href="/berita/{p.slug}" target="_blank" rel="noopener"><Icon name="eye" size={16} /> Lihat</a>{/if}
						{#if isUtama && p.status === 'pending'}
							<button class="btn btn-sm" onclick={() => review(p.id, 'approve')}><Icon name="check" size={16} /> Setujui</button>
							<button class="btn btn-danger-ghost btn-sm" onclick={() => review(p.id, 'reject')}>Kembalikan</button>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>
	<Pagination page={data.list.page} totalPages={data.list.totalPages} href={(n) => href(data.status, n)} />
{:else}
	<div class="card empty">
		<p>Belum ada tulisan di sini.</p>
		<a class="btn" href="/admin/berita/baru"><Icon name="plus" size={18} /> Tulis berita pertama</a>
	</div>
{/if}

<style>
	.tabs {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
		margin-bottom: 1rem;
		padding-bottom: 2px;
	}
	.tabs a {
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		color: var(--ink-2);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		white-space: nowrap;
	}
	.tabs a[aria-current='page'] {
		background: var(--ink);
		border-color: var(--ink);
		color: #fff;
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.75rem;
	}
	.row {
		display: flex;
		gap: 0.9rem;
		padding: 0.8rem;
	}
	.thumb {
		flex: none;
		width: 88px;
		height: 88px;
		border-radius: 10px;
		overflow: hidden;
		background: var(--kawung), var(--primary);
		background-size: 24px, auto;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.info {
		min-width: 0;
		flex: 1;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.82rem;
		color: var(--muted);
		margin: 0 0 0.2rem;
	}
	h2 {
		font-family: var(--font-sans);
		font-size: 1.05rem;
		margin: 0 0 0.15rem;
	}
	h2 a {
		color: var(--ink);
		text-decoration: none;
	}
	.sub {
		font-size: 0.84rem;
		margin: 0 0 0.5rem;
	}
	.row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.st-published {
		background: var(--success-50);
		color: var(--success);
	}
	.st-pending {
		background: var(--warning-50);
		color: var(--warning);
	}
	.st-rejected {
		background: var(--danger-50);
		color: var(--danger);
	}
	.empty {
		padding: 2rem;
		text-align: center;
	}
</style>
