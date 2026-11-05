<script lang="ts">
	import type { Occurrence } from '#lib/types.js';
	import { EVENT_CATEGORIES } from '#lib/types.js';
	import { BULAN, HARI, formatDateShort, formatTimeRange, parseDate } from '#lib/dates.js';
	import Icon from './Icon.svelte';

	let { item, showDescription = false }: { item: Occurrence; showDescription?: boolean } = $props();
	const d = $derived(parseDate(item.date));
	const label = $derived(EVENT_CATEGORIES.find((c) => c.value === item.category)?.label ?? '');
	const time = $derived(formatTimeRange(item.startTime, item.endTime));
</script>

<li class="occ cat-{item.category}">
	<div class="date" aria-hidden="true">
		<span class="dow">{HARI[d.getUTCDay()].slice(0, 3)}</span>
		<span class="day">{d.getUTCDate()}</span>
		<span class="mon">{BULAN[d.getUTCMonth()].slice(0, 3)}</span>
	</div>
	<div class="info">
		<p class="kind"><span class="cat-dot cat-{item.category}"></span>{label}{#if item.rtNumber} · RT {item.rtNumber}{/if}</p>
		<h3>{item.title}</h3>
		<p class="details">
			<span class="visually-hidden">{HARI[d.getUTCDay()]}, {d.getUTCDate()} {BULAN[d.getUTCMonth()]}{#if item.endDate} sampai {formatDateShort(item.endDate)}{/if}.</span>
			{#if item.endDate}<span aria-hidden="true">s.d. {formatDateShort(item.endDate)}</span>{/if}
			{#if time}<span><Icon name="clock" size={15} /> {time}</span>{/if}
			{#if item.location}<span><Icon name="pin" size={15} /> {item.location}</span>{/if}
		</p>
		{#if showDescription && item.description}<p class="desc">{item.description}</p>{/if}
	</div>
</li>

<style>
	.occ {
		display: flex;
		gap: 0.9rem;
		align-items: flex-start;
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--line);
		list-style: none;
	}
	.occ:last-child {
		border-bottom: 0;
	}
	.date {
		flex: none;
		width: 3.6rem;
		text-align: center;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		border-top: 4px solid var(--cat);
		padding: 0.3rem 0 0.35rem;
		line-height: 1.1;
	}
	.dow,
	.mon {
		display: block;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.day {
		display: block;
		font-family: var(--font-serif);
		font-size: 1.55rem;
		font-weight: 700;
	}
	.info {
		min-width: 0;
	}
	.kind {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--muted);
		margin: 0 0 0.15rem;
	}
	h3 {
		font-family: var(--font-sans);
		font-size: 1.05rem;
		margin: 0 0 0.25rem;
	}
	.details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.9rem;
		font-size: 0.9rem;
		color: var(--ink-2);
		margin: 0;
	}
	.details span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.desc {
		font-size: 0.92rem;
		color: var(--muted);
		margin: 0.35rem 0 0;
		white-space: pre-line;
	}
</style>
