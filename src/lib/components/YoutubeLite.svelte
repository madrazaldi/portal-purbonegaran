<script lang="ts">
	import { youtubeEmbed, youtubeThumb } from '#lib/youtube.js';
	import Icon from './Icon.svelte';

	// Shows only a thumbnail until tapped, so YouTube's player (≈1 MB) loads on demand.
	let { id, title }: { id: string; title: string } = $props();
	let playing = $state(false);
</script>

<div class="yt">
	{#if playing}
		<iframe
			src={youtubeEmbed(id)}
			{title}
			allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
		></iframe>
	{:else}
		<button type="button" onclick={() => (playing = true)} aria-label="Putar video: {title}">
			<img src={youtubeThumb(id)} alt="" loading="lazy" />
			<span class="play"><Icon name="play" size={26} /></span>
		</button>
	{/if}
</div>

<style>
	.yt {
		position: relative;
		aspect-ratio: 16 / 9;
		background: #000;
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	iframe,
	button {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}
	button {
		padding: 0;
		cursor: pointer;
		background: #000;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.88;
	}
	.play {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: rgb(180 20 20 / 0.92);
		color: #fff;
		display: grid;
		place-items: center;
		padding-left: 4px;
	}
	button:hover .play {
		background: #d11;
	}
</style>
