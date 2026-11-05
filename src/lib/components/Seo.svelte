<script lang="ts">
	import { page } from '$app/state';

	let {
		title,
		description = '',
		image = null,
		type = 'website',
		jsonLd = null,
		noindex = false
	}: {
		title: string;
		description?: string;
		image?: string | null;
		type?: 'website' | 'article';
		jsonLd?: Record<string, unknown> | null;
		noindex?: boolean;
	} = $props();

	const siteName = $derived((page.data as { site?: { siteName?: string } }).site?.siteName ?? 'Kampung Purbonegaran');
	const fullTitle = $derived(title === siteName ? title : `${title} · ${siteName}`);
	// Canonical host comes from SITE_URL (layout data), so the workers.dev copy points to the domain.
	const origin = $derived((page.data as { origin?: string }).origin ?? page.url.origin);
	const canonical = $derived(`${origin}${page.url.pathname}`);
	const imageUrl = $derived(image ? new URL(image, origin).href : null);
	// Escape "<" so the JSON can never close the script tag.
	const ld = $derived(jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	{#if description}<meta name="description" content={description} />{/if}
	<link rel="canonical" href={canonical} />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:title" content={title} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={canonical} />
	<meta property="og:locale" content="id_ID" />
	{#if description}<meta property="og:description" content={description} />{/if}
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		<meta name="twitter:card" content="summary_large_image" />
	{/if}
	{#if noindex}<meta name="robots" content="noindex" />{/if}
	{#if ld}
		{@html `<script type="application/ld+json">${ld}</script>`}
	{/if}
</svelte:head>
