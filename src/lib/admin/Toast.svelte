<script lang="ts" module>
	let message = $state('');
	let kind = $state<'success' | 'error'>('success');
	let timer: ReturnType<typeof setTimeout> | undefined;

	/** Shows a short confirmation at the bottom of the screen. */
	export function toast(text: string, type: 'success' | 'error' = 'success') {
		message = text;
		kind = type;
		clearTimeout(timer);
		timer = setTimeout(() => (message = ''), 3500);
	}
</script>

<div class="toast-region" aria-live="polite">
	{#if message}
		<div class="toast {kind}" role="status">{message}</div>
	{/if}
</div>

<style>
	.toast-region {
		position: fixed;
		left: 50%;
		bottom: calc(84px + env(safe-area-inset-bottom));
		translate: -50% 0;
		z-index: 50;
		width: max-content;
		max-width: calc(100vw - 32px);
	}
	@media (min-width: 900px) {
		.toast-region {
			bottom: 24px;
		}
	}
	.toast {
		padding: 0.75rem 1.1rem;
		border-radius: 12px;
		font-weight: 600;
		box-shadow: var(--shadow);
		background: var(--ink);
		color: #fff;
	}
	.toast.error {
		background: var(--danger);
	}
</style>
