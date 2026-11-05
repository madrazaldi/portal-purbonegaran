<script lang="ts">
	import { PHOTO_RULES, type PhotoRule } from '#lib/types.js';

	let { rule, checked = $bindable(false) }: { rule: PhotoRule; checked?: boolean } = $props();
	const info = $derived(PHOTO_RULES.find((r) => r.value === rule) ?? PHOTO_RULES[2]);
</script>

<label class="check consent">
	<input type="checkbox" bind:checked />
	<span><strong>Aturan foto kampung:</strong> {info.reminder} Saya sudah memastikan foto yang saya unggah sesuai aturan ini.</span>
</label>

<style>
	.consent {
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-sm);
		background: var(--warning-50);
		border: 1px solid #f0d68f;
		font-size: 0.92rem;
		margin-bottom: 0.75rem;
	}
</style>
