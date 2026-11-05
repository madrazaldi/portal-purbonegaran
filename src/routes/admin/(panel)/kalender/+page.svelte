<script lang="ts">
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { EVENT_CATEGORIES } from '#lib/types.js';
	import { describeRecurrence } from '#lib/recurrence.js';
	import { formatDateLong, formatTimeRange, todayWib } from '#lib/dates.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const today = todayWib();
	const label = (c: string) => EVENT_CATEGORIES.find((x) => x.value === c)?.label ?? c;

	const routine = $derived(data.events.filter((e) => e.recurrence !== 'none'));
	const upcoming = $derived(
		data.events
			.filter((e) => e.recurrence === 'none' && (e.endDate ?? e.startDate) >= today)
			.sort((a, b) => a.startDate.localeCompare(b.startDate))
	);
	const past = $derived(data.events.filter((e) => e.recurrence === 'none' && (e.endDate ?? e.startDate) < today));
</script>

<AdminHeader title="Kalender kegiatan" intro="Jadwal di sini tampil di website dan menjadi sumber jadwal bersama untuk chatbot dan Posyandu.">
	{#snippet actions()}
		<a class="btn" href="/admin/kalender/baru"><Icon name="plus" size={18} /> Tambah kegiatan</a>
	{/snippet}
</AdminHeader>

{#snippet list(items: typeof data.events, empty: string)}
	{#if items.length}
		<ul class="list">
			{#each items as e (e.id)}
				<li>
					<a class="card item" href="/admin/kalender/{e.id}">
						<span class="cat-dot cat-{e.category}"></span>
						<span class="text">
							<strong>{e.title}</strong>
							<small>
								{#if e.recurrence !== 'none'}{describeRecurrence(e)}{#if e.recurrenceUntil}, sampai {formatDateLong(e.recurrenceUntil)}{/if}{:else}{formatDateLong(e.startDate)}{/if}
								{#if e.startTime} · {formatTimeRange(e.startTime, e.endTime)}{/if}
								· {label(e.category)}{#if e.rtNumber} · RT {e.rtNumber}{/if}
							</small>
						</span>
						<Icon name="right" size={18} />
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">{empty}</p>
	{/if}
{/snippet}

<section>
	<h2>Kegiatan rutin</h2>
	{@render list(routine, 'Belum ada kegiatan rutin. Contoh: Posyandu bulanan, angkut sampah Masjos mingguan.')}
</section>
<section>
	<h2>Akan datang</h2>
	{@render list(upcoming, 'Tidak ada kegiatan sekali-jalan yang akan datang.')}
</section>
{#if past.length}
	<details>
		<summary>Sudah lewat ({past.length})</summary>
		{@render list(past, '')}
	</details>
{/if}

<style>
	section {
		margin-bottom: 1.75rem;
	}
	h2 {
		font-size: 1.15rem;
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.5rem;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.8rem 1rem;
		text-decoration: none;
		color: var(--ink);
	}
	.item:hover {
		border-color: var(--primary);
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	.text strong,
	.text small {
		display: block;
	}
	.text small {
		color: var(--muted);
		font-size: 0.86rem;
	}
	details summary {
		cursor: pointer;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}
</style>
