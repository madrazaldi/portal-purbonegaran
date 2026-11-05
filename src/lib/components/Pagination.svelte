<script lang="ts">
	import Icon from './Icon.svelte';

	let { page, totalPages, href }: { page: number; totalPages: number; href: (p: number) => string } =
		$props();
</script>

{#if totalPages > 1}
	<nav class="pagination" aria-label="Halaman">
		{#if page > 1}
			<a class="btn btn-secondary btn-sm" href={href(page - 1)} rel="prev"
				><Icon name="left" size={16} /> Sebelumnya</a
			>
		{:else}<span></span>{/if}
		<span class="muted">Halaman {page} dari {totalPages}</span>
		{#if page < totalPages}
			<a class="btn btn-secondary btn-sm" href={href(page + 1)} rel="next"
				>Berikutnya <Icon name="right" size={16} /></a
			>
		{:else}<span></span>{/if}
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 2rem;
		font-size: 0.92rem;
	}
</style>
