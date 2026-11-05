<script lang="ts">
	import type { MediaItem } from '#lib/types.js';
	import Icon from './Icon.svelte';
	import YoutubeLite from './YoutubeLite.svelte';

	let { items }: { items: MediaItem[] } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let index = $state(0);
	const current = $derived(items[index]);

	function open(i: number) {
		index = i;
		dialog?.showModal();
	}
	function step(d: number) {
		index = (index + d + items.length) % items.length;
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}

	// Swipe left/right on phones.
	let touchX: number | null = null;
	function ontouchstart(e: TouchEvent) {
		touchX = e.touches[0].clientX;
	}
	function ontouchend(e: TouchEvent) {
		if (touchX === null) return;
		const dx = e.changedTouches[0].clientX - touchX;
		if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
		touchX = null;
	}
</script>

<ul class="gallery">
	{#each items as item, i (item.id)}
		<li>
			<button type="button" onclick={() => open(i)} aria-label={item.caption || (item.kind === 'youtube' ? 'Putar video' : 'Lihat foto')}>
				<img src={item.thumbUrl} alt={item.caption} loading="lazy" />
				{#if item.kind === 'youtube'}<span class="vid"><Icon name="play" size={18} /></span>{/if}
			</button>
		</li>
	{/each}
</ul>

<dialog bind:this={dialog} class="lightbox" {onkeydown} aria-label="Galeri">
	{#if current}
		<div class="stage" role="group" aria-label="Geser untuk foto lain" {ontouchstart} {ontouchend}>
			{#key current.id}
				{#if current.kind === 'youtube' && current.youtubeId}
					<div class="video"><YoutubeLite id={current.youtubeId} title={current.caption || 'Video kegiatan'} /></div>
				{:else}
					<img src={current.url} alt={current.caption} width={current.width} height={current.height} />
				{/if}
			{/key}
		</div>
		<div class="bar">
			<p class="caption">{current.caption}</p>
			<span class="count">{index + 1} / {items.length}</span>
		</div>
		{#if items.length > 1}
			<button class="nav prev" type="button" onclick={() => step(-1)} aria-label="Sebelumnya"><Icon name="left" size={28} /></button>
			<button class="nav next" type="button" onclick={() => step(1)} aria-label="Berikutnya"><Icon name="right" size={28} /></button>
		{/if}
		<form method="dialog">
			<button class="close" aria-label="Tutup"><Icon name="x" size={26} /></button>
		</form>
	{/if}
</dialog>

<style>
	.gallery {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(46%, 180px), 1fr));
		gap: 6px;
	}
	.gallery button {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--surface-2);
		cursor: zoom-in;
	}
	.gallery img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.25s;
	}
	.gallery button:hover img {
		transform: scale(1.04);
	}
	.vid {
		position: absolute;
		inset: auto auto 8px 8px;
		background: rgb(0 0 0 / 0.7);
		color: #fff;
		border-radius: 999px;
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		padding-left: 2px;
	}

	.lightbox {
		width: 100vw;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: rgb(10 14 12 / 0.96);
		color: #fff;
	}
	.lightbox::backdrop {
		background: rgb(0 0 0 / 0.6);
	}
	.stage {
		position: absolute;
		inset: 56px 0 72px;
		display: grid;
		place-items: center;
		padding: 0 8px;
	}
	.stage img {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
	}
	.video {
		width: min(100%, 960px);
	}
	.bar {
		position: absolute;
		inset: auto 0 0;
		min-height: 72px;
		padding: 12px var(--gutter);
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		align-items: center;
	}
	.caption {
		margin: 0;
		font-size: 0.95rem;
	}
	.count {
		font-size: 0.85rem;
		opacity: 0.75;
		flex: none;
	}
	.lightbox button {
		color: #fff;
		background: rgb(255 255 255 / 0.1);
		border: 0;
		border-radius: 999px;
		cursor: pointer;
		display: grid;
		place-items: center;
	}
	.lightbox button:hover {
		background: rgb(255 255 255 / 0.22);
	}
	.close {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 44px;
		height: 44px;
	}
	.nav {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		width: 48px;
		height: 48px;
	}
	.prev {
		left: 8px;
	}
	.next {
		right: 8px;
	}
</style>
