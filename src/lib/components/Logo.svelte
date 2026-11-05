<script lang="ts">
	let { size = 40 }: { size?: number } = $props();
</script>

<!-- Kawung-inspired mark: four petals around a centre, a common Javanese batik motif. -->
<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style="flex:none">
	<rect width="48" height="48" rx="12" fill="var(--primary)" />
	<g fill="var(--gold)">
		<ellipse cx="24" cy="13.5" rx="5.6" ry="8.2" />
		<ellipse cx="24" cy="34.5" rx="5.6" ry="8.2" />
		<ellipse cx="13.5" cy="24" rx="8.2" ry="5.6" />
		<ellipse cx="34.5" cy="24" rx="8.2" ry="5.6" />
	</g>
	<circle cx="24" cy="24" r="3" fill="var(--primary)" />
	<circle cx="24" cy="24" r="1.3" fill="#fff" />
</svg>
