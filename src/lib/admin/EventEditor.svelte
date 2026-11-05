<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import type { EventCategory, KampungEvent, Recurrence } from '#lib/types.js';
	import { EVENT_CATEGORIES } from '#lib/types.js';
	import { describeRecurrence, expandEvents, nthWeekdayOf } from '#lib/recurrence.js';
	import { HARI, addDays, formatDateLong, isDate, parseDate, todayWib } from '#lib/dates.js';
	import Icon from '#lib/components/Icon.svelte';
	import { api, errorText, fieldErrors } from './api.js';
	import { toast } from './Toast.svelte';

	let { event = null }: { event?: KampungEvent | null } = $props();

	// The form edits a copy; it starts from the event once.
	const initial = untrack(() => event);
	let title = $state(initial?.title ?? '');
	let category = $state<EventCategory>(initial?.category ?? 'lainnya');
	let description = $state(initial?.description ?? '');
	let location = $state(initial?.location ?? '');
	let rtNumber = $state<string>(initial?.rtNumber ? String(initial.rtNumber) : '');
	let startDate = $state(initial?.startDate ?? todayWib());
	let multiDay = $state(!!initial?.endDate);
	let endDate = $state(initial?.endDate ?? '');
	let startTime = $state(initial?.startTime ?? '');
	let endTime = $state(initial?.endTime ?? '');
	let recurrence = $state<Recurrence>(initial?.recurrence ?? 'none');
	let interval = $state(initial?.recurrenceInterval ?? 1);
	let hasUntil = $state(!!initial?.recurrenceUntil);
	let until = $state(initial?.recurrenceUntil ?? '');

	let busy = $state(false);
	let error = $state('');
	let errors = $state<Record<string, string>>({});

	const RT = [49, 50, 51, 52, 53];
	const URUTAN = ['pertama', 'kedua', 'ketiga', 'keempat'];

	// Options read naturally from the chosen start date, e.g. "Setiap Minggu kedua".
	const recurrenceOptions = $derived.by(() => {
		if (!isDate(startDate)) return [];
		const d = parseDate(startDate);
		const hari = HARI[d.getUTCDay()];
		const nth = nthWeekdayOf(startDate);
		return [
			{ value: 'none', label: 'Tidak berulang (sekali saja)' },
			{ value: 'weekly', label: `Setiap minggu, hari ${hari}` },
			{ value: 'monthly_date', label: `Setiap bulan, tanggal ${d.getUTCDate()}` },
			{
				value: 'monthly_nth_weekday',
				label: `Setiap bulan, ${hari} ${nth === -1 ? 'terakhir' : URUTAN[nth - 1]}`
			}
		] as { value: Recurrence; label: string }[];
	});

	const preview = $derived.by(() => {
		if (!isDate(startDate) || recurrence === 'none') return [];
		const e: KampungEvent = {
			id: 0,
			title,
			description,
			category,
			location,
			rtNumber: null,
			startDate,
			endDate: null,
			startTime: null,
			endTime: null,
			recurrence,
			recurrenceInterval: interval,
			recurrenceUntil: hasUntil && isDate(until) ? until : null
		};
		const from = startDate > todayWib() ? startDate : todayWib();
		return expandEvents([e], from, addDays(from, 400)).slice(0, 4);
	});

	async function save(ev: SubmitEvent) {
		ev.preventDefault();
		busy = true;
		error = '';
		errors = {};
		const payload = {
			title,
			category,
			description,
			location,
			rtNumber: rtNumber ? Number(rtNumber) : null,
			startDate,
			endDate: multiDay && endDate ? endDate : null,
			startTime: startTime || null,
			endTime: endTime || null,
			recurrence,
			recurrenceInterval: interval,
			recurrenceUntil: recurrence !== 'none' && hasUntil && until ? until : null
		};
		try {
			if (initial) await api(`/admin/events/${initial.id}`, { method: 'PUT', body: payload });
			else await api('/admin/events', { body: payload });
			toast('Kegiatan tersimpan dan tampil di kalender.');
			await goto('/admin/kalender', { invalidateAll: true });
		} catch (e) {
			error = errorText(e);
			errors = fieldErrors(e);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!initial) return;
		const msg =
			initial.recurrence === 'none'
				? 'Hapus kegiatan ini dari kalender?'
				: 'Hapus kegiatan rutin ini? Semua jadwal berulangnya juga akan hilang dari kalender.';
		if (!confirm(msg)) return;
		try {
			await api(`/admin/events/${initial.id}`, { method: 'DELETE' });
			toast('Kegiatan dihapus.');
			await goto('/admin/kalender', { invalidateAll: true });
		} catch (e) {
			toast(errorText(e), 'error');
		}
	}
</script>

{#if error}<div class="notice notice-error" role="alert"><p>{error}</p></div>{/if}

<form class="card form" onsubmit={save}>
	<div class="field">
		<label for="t">Nama kegiatan</label>
		<input id="t" class="input" bind:value={title} maxlength="140" placeholder="Contoh: Posyandu Lansia" aria-invalid={!!errors.title} />
		{#if errors.title}<p class="error">{errors.title}</p>{/if}
	</div>

	<div class="row row-2">
		<div class="field">
			<label for="c">Jenis</label>
			<select id="c" class="select" bind:value={category}>
				{#each EVENT_CATEGORIES as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
			</select>
		</div>
		<div class="field">
			<label for="rt">Untuk</label>
			<select id="rt" class="select" bind:value={rtNumber}>
				<option value="">Seluruh RW 11</option>
				{#each RT as n (n)}<option value={String(n)}>RT {n}</option>{/each}
			</select>
		</div>
	</div>

	<fieldset class="group">
		<legend>Waktu</legend>
		<div class="row row-2">
			<div class="field">
				<label for="sd">{multiDay ? 'Tanggal mulai' : 'Tanggal'}</label>
				<input id="sd" class="input" type="date" bind:value={startDate} aria-invalid={!!errors.startDate} />
				{#if isDate(startDate)}<p class="hint">{formatDateLong(startDate)}</p>{/if}
				{#if errors.startDate}<p class="error">{errors.startDate}</p>{/if}
			</div>
			{#if multiDay}
				<div class="field">
					<label for="ed">Tanggal selesai</label>
					<input id="ed" class="input" type="date" min={startDate} bind:value={endDate} aria-invalid={!!errors.endDate} />
					{#if errors.endDate}<p class="error">{errors.endDate}</p>{/if}
				</div>
			{/if}
		</div>
		<label class="check small"><input type="checkbox" bind:checked={multiDay} /> Berlangsung lebih dari satu hari</label>

		<div class="row row-2 times">
			<div class="field">
				<label for="st">Jam mulai <span class="muted">(opsional)</span></label>
				<input id="st" class="input" type="time" bind:value={startTime} aria-invalid={!!errors.startTime} />
				{#if errors.startTime}<p class="error">{errors.startTime}</p>{/if}
			</div>
			<div class="field">
				<label for="et">Jam selesai <span class="muted">(opsional)</span></label>
				<input id="et" class="input" type="time" bind:value={endTime} aria-invalid={!!errors.endTime} />
				{#if errors.endTime}<p class="error">{errors.endTime}</p>{/if}
			</div>
		</div>
	</fieldset>

	<fieldset class="group">
		<legend>Pengulangan</legend>
		<div class="field">
			<label for="r" class="visually-hidden">Pengulangan</label>
			<select id="r" class="select" bind:value={recurrence}>
				{#each recurrenceOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
			</select>
		</div>
		{#if recurrence !== 'none'}
			<div class="row row-2">
				<div class="field">
					<label for="iv">Setiap berapa {recurrence === 'weekly' ? 'minggu' : 'bulan'} sekali?</label>
					<input id="iv" class="input" type="number" min="1" max="12" bind:value={interval} />
				</div>
				<div class="field">
					<span class="label">Sampai kapan?</span>
					<label class="check"><input type="checkbox" bind:checked={hasUntil} /> Ada tanggal berakhir</label>
					{#if hasUntil}
						<input class="input" type="date" min={startDate} bind:value={until} aria-label="Tanggal berakhir" aria-invalid={!!errors.recurrenceUntil} />
					{/if}
					{#if errors.recurrenceUntil}<p class="error">{errors.recurrenceUntil}</p>{/if}
				</div>
			</div>
			<div class="notice notice-info">
				<p><strong>{describeRecurrence({ recurrence, recurrenceInterval: interval, startDate, recurrenceUntil: null })}.</strong>
					Jadwal berikutnya:
					{preview.map((o) => formatDateLong(o.date)).join('; ') || '–'}</p>
			</div>
		{/if}
	</fieldset>

	<div class="field">
		<label for="l">Tempat</label>
		<input id="l" class="input" bind:value={location} maxlength="140" placeholder="Contoh: Balai warga RW 11" />
	</div>
	<div class="field">
		<label for="d">Keterangan <span class="muted">(opsional)</span></label>
		<textarea id="d" class="textarea" bind:value={description} maxlength="3000" placeholder="Misalnya: bawa KMS, sampah dipilah sebelum diangkut, dll."></textarea>
	</div>

	<div class="actions">
		{#if initial}<button type="button" class="btn btn-danger-ghost" onclick={remove}><Icon name="trash" size={18} /> Hapus</button>{/if}
		<span class="spacer"></span>
		<a class="btn btn-secondary" href="/admin/kalender">Batal</a>
		<button class="btn" disabled={busy}><Icon name="check" size={18} /> {busy ? 'Menyimpan…' : 'Simpan kegiatan'}</button>
	</div>
</form>

<style>
	.form {
		padding: 1.1rem;
	}
	.group {
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		padding: 0.9rem 0.9rem 0.25rem;
		margin: 0 0 1rem;
	}
	legend {
		font-weight: 700;
		padding: 0 0.35rem;
		color: var(--primary);
	}
	.small {
		font-size: 0.92rem;
		margin-bottom: 1rem;
	}
	.times {
		margin-top: 0.25rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.spacer {
		flex: 1;
	}
</style>
