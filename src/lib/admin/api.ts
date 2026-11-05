import { goto } from '$app/navigation';
import type { MediaItem } from '#lib/types.js';

export class ApiFailure extends Error {
	constructor(
		public status: number,
		message: string,
		public fields: Record<string, string> = {}
	) {
		super(message);
	}
}

type Opts = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: unknown;
	form?: FormData;
	fetch?: typeof fetch;
};

/** Calls the JSON API. Throws ApiFailure with Indonesian messages from the server. */
export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
	const f = opts.fetch ?? fetch;
	let res: Response;
	try {
		res = await f(`/api${path}`, {
			method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
			headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
			body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined)
		});
	} catch {
		throw new ApiFailure(0, 'Tidak ada koneksi internet. Periksa sinyal lalu coba lagi.');
	}
	const json = await res.json().catch(() => ({}));
	if (!res.ok) {
		if (res.status === 401 && typeof window !== 'undefined') {
			const next = encodeURIComponent(location.pathname + location.search);
			await goto(`/admin/login?next=${next}`);
		}
		throw new ApiFailure(res.status, json.error ?? `Gagal (${res.status}).`, json.fields ?? {});
	}
	return json as T;
}

export function errorText(e: unknown): string {
	return e instanceof ApiFailure ? e.message : 'Terjadi kesalahan. Coba lagi.';
}

export function fieldErrors(e: unknown): Record<string, string> {
	return e instanceof ApiFailure ? e.fields : {};
}

// ------------------------------------------------------------- photo upload

interface Compressed {
	blob: Blob;
	width: number;
	height: number;
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
	if (webp && webp.type === 'image/webp') return webp;
	// Older Safari cannot encode WebP; fall back to JPEG.
	const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
	if (!jpeg) throw new Error('encode');
	return jpeg;
}

async function resize(source: ImageBitmap, maxSide: number, quality: number): Promise<Compressed> {
	const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
	const width = Math.round(source.width * scale);
	const height = Math.round(source.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas');
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(source, 0, 0, width, height);
	return { blob: await encode(canvas, quality), width, height };
}

/**
 * Shrinks a phone photo (often 4–12 MB) to ~200–500 KB before upload, plus a
 * small thumbnail, so uploads are fast and the website stays light.
 */
export async function prepareImage(file: File) {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		throw new ApiFailure(400, `"${file.name}" bukan foto yang bisa dibaca. Gunakan JPG atau PNG.`);
	}
	try {
		const full = await resize(bitmap, 1920, 0.82);
		const thumb = await resize(bitmap, 560, 0.75);
		return { full, thumb };
	} finally {
		bitmap.close();
	}
}

export async function uploadImage(
	file: File,
	meta: { caption?: string; albumId?: number | null; inGallery?: boolean; consent: boolean }
): Promise<MediaItem> {
	const { full, thumb } = await prepareImage(file);
	const ext = (b: Blob) => (b.type === 'image/webp' ? 'webp' : 'jpg');
	const form = new FormData();
	form.set('file', full.blob, `foto.${ext(full.blob)}`);
	form.set('thumb', thumb.blob, `thumb.${ext(thumb.blob)}`);
	form.set('width', String(full.width));
	form.set('height', String(full.height));
	form.set('caption', meta.caption ?? '');
	if (meta.albumId) form.set('albumId', String(meta.albumId));
	form.set('inGallery', meta.inGallery === false ? '0' : '1');
	form.set('consent', meta.consent ? '1' : '0');
	return api<MediaItem>('/admin/media', { form });
}
