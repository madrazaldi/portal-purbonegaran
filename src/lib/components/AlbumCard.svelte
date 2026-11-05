<script lang="ts">
	import type { Album } from '#lib/types.js';
	import { formatDate } from '#lib/dates.js';

	let { album }: { album: Album } = $props();
</script>

<a class="album" href="/galeri/{album.slug}">
	<div class="thumb">
		{#if album.cover}<img src={album.cover.thumbUrl} alt="" loading="lazy" />{/if}
	</div>
	<div class="text">
		<h3>{album.title}</h3>
		<p>{album.count} item{#if album.eventDate} · {formatDate(album.eventDate)}{/if}</p>
	</div>
</a>

<style>
	.album {
		display: block;
		position: relative;
		border-radius: var(--radius);
		overflow: hidden;
		aspect-ratio: 4 / 3;
		color: #fff;
		text-decoration: none;
		background: var(--kawung), var(--primary);
		background-size: 36px, auto;
	}
	.thumb,
	.thumb img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.text {
		position: absolute;
		inset: auto 0 0;
		padding: 2.5rem 1rem 0.9rem;
		background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
	}
	h3 {
		color: #fff;
		margin: 0;
		font-size: 1.15rem;
	}
	p {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.9;
	}
	.album:hover img {
		transform: scale(1.03);
	}
	img {
		transition: transform 0.25s;
	}
</style>
