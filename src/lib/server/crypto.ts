// Web Crypto only, so this runs identically on Workers and in Bun scripts/tests.

// Workers caps PBKDF2 at 100k iterations.
const PBKDF2_ITERATIONS = 100_000;
const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function toB64Url(bytes: Uint8Array): string {
	return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		key,
		256
	);
	return new Uint8Array(bits);
}

/** Constant-time comparison of two byte arrays. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

/** Returns "pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>". */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
	return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [algo, iter, salt, hash] = stored.split('$');
	if (algo !== 'pbkdf2_sha256' || !iter || !salt || !hash) return false;
	const actual = await pbkdf2(password, fromB64(salt), Number(iter));
	return equalBytes(actual, fromB64(hash));
}

/** 256-bit random token, URL-safe. */
export function randomToken(): string {
	return toB64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256(s: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', enc.encode(s));
	return toB64Url(new Uint8Array(digest));
}

export const PASSWORD_MIN_LENGTH = 8;
