<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import { api, errorText } from '#lib/admin/api.js';
	import { toast } from '#lib/admin/Toast.svelte';
	import { formatTimestamp } from '#lib/dates.js';
	import { whatsappLink } from '#lib/contact.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const isPhone = (s: string) => /^(\+?62|0)8[\d\s-]{7,}$/.test(s.trim());
	const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

	async function mark(id: number, read: boolean) {
		try {
			await api(`/admin/messages/${id}`, { method: 'PUT', body: { read } });
			await invalidateAll();
		} catch (e) {
			toast(errorText(e), 'error');
		}
	}
	async function remove(id: number) {
		if (!confirm('Hapus pesan ini?')) return;
		await api(`/admin/messages/${id}`, { method: 'DELETE' });
		toast('Pesan dihapus.');
		await invalidateAll();
	}
</script>

<AdminHeader title="Pesan masuk" intro="Pesan dari formulir Kontak. Berisi data pribadi warga: jangan diteruskan ke pihak lain tanpa izin." />

{#if data.list.items.length}
	<ul class="list">
		{#each data.list.items as m (m.id)}
			<li class="card msg" class:unread={!m.readAt}>
				<header>
					<strong>{m.name}</strong>
					<time class="muted" datetime={m.createdAt}>{formatTimestamp(m.createdAt, true)}</time>
				</header>
				{#if m.contact}
					<p class="contact">
						{#if isPhone(m.contact)}<a href={whatsappLink(m.contact)} rel="noopener"><Icon name="whatsapp" size={16} /> {m.contact}</a>
						{:else if isEmail(m.contact)}<a href="mailto:{m.contact}"><Icon name="mail" size={16} /> {m.contact}</a>
						{:else}{m.contact}{/if}
					</p>
				{/if}
				<p class="body">{m.body}</p>
				<div class="actions">
					{#if m.readAt}
						<button class="btn btn-ghost btn-sm" onclick={() => mark(m.id, false)}>Tandai belum dibaca</button>
					{:else}
						<button class="btn btn-secondary btn-sm" onclick={() => mark(m.id, true)}><Icon name="check" size={16} /> Tandai sudah dibaca</button>
					{/if}
					<button class="btn btn-danger-ghost btn-sm" onclick={() => remove(m.id)}><Icon name="trash" size={16} /> Hapus</button>
				</div>
			</li>
		{/each}
	</ul>
	<Pagination page={data.list.page} totalPages={data.list.totalPages} href={(p) => `/admin/pesan?page=${p}`} />
{:else}
	<p class="muted">Belum ada pesan.</p>
{/if}

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.75rem;
	}
	.msg {
		padding: 1rem 1.1rem;
	}
	.msg.unread {
		border-left: 4px solid var(--primary);
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	header time {
		font-size: 0.85rem;
	}
	.contact {
		margin: 0.2rem 0 0.5rem;
		font-size: 0.92rem;
	}
	.contact a {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.body {
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
</style>
