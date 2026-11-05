<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo title={page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'} noindex />

<div class="container section err">
	<p class="eyebrow">Galat {page.status}</p>
	<h1>{page.status === 404 ? 'Halaman tidak ditemukan' : 'Maaf, terjadi kesalahan'}</h1>
	<p class="muted">{page.error?.message}</p>
	<a class="btn" href="/">Kembali ke beranda</a>
</div>

<style>
	.err {
		max-width: 640px;
		min-height: 50vh;
	}
</style>
