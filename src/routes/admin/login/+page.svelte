<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import { api, errorText } from '#lib/admin/api.js';

	let username = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let busy = $state(false);
	let error = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		try {
			await api('/auth/login', { body: { username, password } });
			const next = page.url.searchParams.get('next');
			await invalidateAll();
			await goto(next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
		} catch (err) {
			error = errorText(err);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Masuk · Pengurus Kampung Purbonegaran</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="wrap">
	<div class="card box">
		<div class="head">
			<Logo size={48} />
			<div>
				<h1>Masuk pengurus</h1>
				<p class="muted">Portal Kampung Purbonegaran</p>
			</div>
		</div>
		<form onsubmit={submit}>
			{#if error}<div class="notice notice-error" role="alert"><p>{error}</p></div>{/if}
			<div class="field">
				<label for="u">Nama pengguna</label>
				<input id="u" class="input" bind:value={username} autocomplete="username" autocapitalize="none" spellcheck="false" required />
			</div>
			<div class="field">
				<label for="p">Kata sandi</label>
				<input id="p" class="input" type={showPassword ? 'text' : 'password'} bind:value={password} autocomplete="current-password" required />
				<label class="check show"><input type="checkbox" bind:checked={showPassword} /> Tampilkan kata sandi</label>
			</div>
			<button class="btn btn-block" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
		</form>
		<p class="help muted">Lupa kata sandi? Minta Admin Utama untuk mengatur ulang.</p>
	</div>
	<a class="back" href="/">← Kembali ke website</a>
</main>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--kawung), var(--primary-600);
		background-size: 44px, auto;
	}
	.box {
		width: min(420px, calc(100vw - 32px));
		padding: 1.5rem;
	}
	.head {
		display: flex;
		gap: 0.9rem;
		align-items: center;
		margin-bottom: 1.25rem;
	}
	h1 {
		font-size: 1.45rem;
		margin: 0;
	}
	.head p {
		margin: 0;
		font-size: 0.92rem;
	}
	.show {
		font-size: 0.9rem;
		margin-top: 0.25rem;
	}
	.help {
		font-size: 0.86rem;
		margin: 1rem 0 0;
		text-align: center;
	}
	.back {
		color: #fff;
		font-weight: 600;
	}
</style>
