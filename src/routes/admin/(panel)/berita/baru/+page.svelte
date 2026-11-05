<script lang="ts">
	import AdminHeader from '#lib/admin/AdminHeader.svelte';
	import PostEditor from '#lib/admin/PostEditor.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AdminHeader title="Tulis berita" />
<PostEditor user={data.user} photoRule={data.photoRule} requireApproval={data.requireApproval} />
