<script lang="ts">
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import EventEditor from '#lib/admin/EventEditor.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AdminHeader title="Ubah kegiatan" />
{#key data.event.id}<EventEditor event={data.event} />{/key}
