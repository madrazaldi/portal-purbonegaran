<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import OccurrenceItem from '#lib/components/OccurrenceItem.svelte';
	import { EVENT_CATEGORIES, type Occurrence } from '#lib/types.js';
	import { BULAN, HARI, addDays, daysInMonth, formatDateLong } from '#lib/dates.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const year = $derived(Number(data.month.slice(0, 4)));
	const month0 = $derived(Number(data.month.slice(5, 7)) - 1);
	const title = $derived(`${BULAN[month0]} ${year}`);

	function shift(delta: number) {
		const d = new Date(Date.UTC(year, month0 + delta, 1));
		return d.toISOString().slice(0, 7);
	}
	function href(month: string, cat: string | null) {
		const p = new URLSearchParams({ bulan: month });
		if (cat) p.set('jenis', cat);
		return `/kalender?${p}`;
	}

	// Map each day to the occurrences on it (multi-day events appear on each day).
	const byDay = $derived.by(() => {
		const map = new Map<string, Occurrence[]>();
		for (const o of data.occurrences) {
			let d = o.date;
			const last = o.endDate ?? o.date;
			while (d <= last) {
				if (d.startsWith(data.month)) map.set(d, [...(map.get(d) ?? []), o]);
				d = addDays(d, 1);
			}
		}
		return map;
	});

	// Monday-first grid.
	const cells = $derived.by(() => {
		const first = new Date(Date.UTC(year, month0, 1)).getUTCDay();
		const lead = (first + 6) % 7;
		const n = daysInMonth(year, month0);
		const out: (string | null)[] = Array(lead).fill(null);
		for (let d = 1; d <= n; d++) out.push(`${data.month}-${String(d).padStart(2, '0')}`);
		while (out.length % 7) out.push(null);
		return out;
	});
	const WEEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

	const grouped = $derived.by(() => {
		const groups: { date: string; items: Occurrence[] }[] = [];
		for (const o of data.occurrences) {
			const g = groups.at(-1);
			if (g && g.date === o.date) g.items.push(o);
			else groups.push({ date: o.date, items: [o] });
		}
		return groups;
	});
</script>

<Seo
	title="Kalender Kegiatan"
	description="Jadwal Posyandu, angkut sampah Masjos, kerja bakti, acara adat, dan kegiatan lain di Kampung Purbonegaran RW 11."
/>
<PageHeader
	eyebrow="Agenda kampung"
	title="Kalender Kegiatan"
	intro="Jadwal Posyandu, angkut sampah, kerja bakti, acara adat, dan kegiatan warga lainnya."
>
	<a class="subscribe" href="/kalender.ics"><Icon name="download" size={18} /> Tambahkan ke kalender HP</a>
</PageHeader>

<div class="container section">
	<div class="toolbar">
		<div class="month-nav">
			<a class="btn btn-secondary btn-sm icon-btn" href={href(shift(-1), data.category)} aria-label="Bulan sebelumnya"
				><Icon name="left" size={18} /></a
			>
			<h2 aria-live="polite">{title}</h2>
			<a class="btn btn-secondary btn-sm icon-btn" href={href(shift(1), data.category)} aria-label="Bulan berikutnya"
				><Icon name="right" size={18} /></a
			>
			{#if data.month !== data.today.slice(0, 7)}
				<a class="btn btn-ghost btn-sm" href={href(data.today.slice(0, 7), data.category)}>Bulan ini</a>
			{/if}
		</div>
		<nav class="filters" aria-label="Saring jenis kegiatan">
			<a class="chip" href={href(data.month, null)} aria-current={!data.category ? 'true' : undefined}>Semua</a>
			{#each EVENT_CATEGORIES as c (c.value)}
				<a class="chip" href={href(data.month, c.value)} aria-current={data.category === c.value ? 'true' : undefined}
					><span class="cat-dot cat-{c.value}"></span>{c.label}</a
				>
			{/each}
		</nav>
	</div>

	<div class="layout">
		<div class="card cal" aria-hidden="true">
			<div class="week">
				{#each WEEK as w (w)}<div class="wd">{w}</div>{/each}
			</div>
			<div class="days">
				{#each cells as day, i (day ?? `empty-${i}`)}
					{#if day}
						{@const items = byDay.get(day) ?? []}
						<div class="day" class:today={day === data.today} class:has={items.length > 0}>
							<span class="n">{Number(day.slice(8))}</span>
							<ul class="dots">
								{#each items.slice(0, 3) as o (`${o.eventId}-${o.date}`)}
									<li class="pill cat-{o.category}" title={o.title}><span>{o.title}</span></li>
								{/each}
								{#if items.length > 3}<li class="more">+{items.length - 3}</li>{/if}
							</ul>
						</div>
					{:else}
						<div class="day empty"></div>
					{/if}
				{/each}
			</div>
		</div>

		<div class="list">
			<h2 class="visually-hidden">Daftar kegiatan {title}</h2>
			{#if grouped.length}
				{#each grouped as g (g.date)}
					<section class="group" class:past={g.date < data.today}>
						<h3 class="group-date">{formatDateLong(g.date)}{#if g.date === data.today} · <strong>Hari ini</strong>{/if}</h3>
						<ul>
							{#each g.items as item (`${item.eventId}-${item.date}`)}
								<OccurrenceItem {item} showDescription />
							{/each}
						</ul>
					</section>
				{/each}
			{:else}
				<div class="card empty-state">
					<Icon name="calendar" size={28} />
					<p>Belum ada kegiatan{data.category ? ' jenis ini' : ''} pada {title}.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.subscribe {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.9rem;
		font-weight: 600;
	}
	.toolbar {
		display: grid;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.month-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.month-nav h2 {
		margin: 0 0.4rem;
		min-width: 9ch;
		text-align: center;
		font-size: 1.5rem;
	}
	.icon-btn {
		width: 40px;
		padding: 0;
	}
	.filters {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding-bottom: 4px;
		margin-inline: calc(var(--gutter) * -1);
		padding-inline: var(--gutter);
		scrollbar-width: thin;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		color: var(--ink-2);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.chip[aria-current='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: #fff;
	}

	.layout {
		display: grid;
		gap: 1.5rem;
		align-items: start;
	}
	@media (min-width: 980px) {
		.layout {
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		}
	}

	.cal {
		padding: 0.5rem;
		overflow: hidden;
	}
	.week,
	.days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}
	.wd {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--muted);
		padding: 0.4rem 0;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.day {
		min-height: 64px;
		border-top: 1px solid var(--line);
		padding: 0.25rem;
		min-width: 0;
	}
	@media (min-width: 640px) {
		.day {
			min-height: 92px;
			padding: 0.35rem;
		}
	}
	.n {
		display: inline-grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		font-size: 0.88rem;
		font-weight: 600;
		border-radius: 50%;
	}
	.today .n {
		background: var(--primary);
		color: #fff;
	}
	.dots {
		list-style: none;
		margin: 0.1rem 0 0;
		padding: 0;
		display: grid;
		gap: 2px;
	}
	.pill {
		background: var(--cat);
		color: #fff;
		border-radius: 4px;
		height: 6px;
		overflow: hidden;
	}
	.pill span {
		display: none;
	}
	@media (min-width: 640px) {
		.pill {
			height: auto;
			font-size: 0.7rem;
			font-weight: 600;
			padding: 1px 4px;
			line-height: 1.35;
		}
		.pill span {
			display: block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
	.more {
		font-size: 0.7rem;
		color: var(--muted);
		font-weight: 700;
	}

	.list ul {
		margin: 0;
		padding: 0;
	}
	.group {
		margin-bottom: 1.25rem;
	}
	.group.past {
		opacity: 0.6;
	}
	.group-date {
		font-family: var(--font-sans);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0 0 0.25rem;
		padding-bottom: 0.4rem;
		border-bottom: 2px solid var(--line);
	}
	.group-date strong {
		color: var(--primary);
	}
	.empty-state {
		padding: 2rem 1.25rem;
		display: grid;
		justify-items: center;
		text-align: center;
		color: var(--muted);
	}
	.empty-state p {
		margin: 0.6rem 0 0;
	}
</style>
