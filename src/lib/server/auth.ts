import type { Role, SessionUser } from '#lib/types.js';
import { randomToken, sha256, verifyPassword, hashPassword } from './crypto.js';
import { tooMany } from './http.js';

export const SESSION_COOKIE = 'kp_session';
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export function hasRole(user: SessionUser | null | undefined, ...roles: Role[]) {
	return !!user && user.roles.some((r) => roles.includes(r));
}

export const isAdminUtama = (u: SessionUser | null | undefined) => hasRole(u, 'admin_utama');

/** Session token from the cookie (web) or an `Authorization: Bearer` header (mobile app). */
export function readToken(request: Request, cookieValue: string | undefined) {
	const header = request.headers.get('authorization');
	if (header?.startsWith('Bearer ')) return { token: header.slice(7).trim(), via: 'bearer' as const };
	if (cookieValue) return { token: cookieValue, via: 'cookie' as const };
	return null;
}

export async function loadUser(db: D1Database, userId: number): Promise<SessionUser | null> {
	const user = await db
		.prepare('SELECT id, username, name FROM users WHERE id = ? AND active = 1')
		.bind(userId)
		.first<{ id: number; username: string; name: string }>();
	if (!user) return null;
	const { results } = await db
		.prepare('SELECT role FROM user_roles WHERE user_id = ?')
		.bind(userId)
		.all<{ role: Role }>();
	return { ...user, roles: results.map((r) => r.role) };
}

export async function userFromToken(db: D1Database, token: string): Promise<SessionUser | null> {
	if (!token || token.length > 100) return null;
	const hash = await sha256(token);
	const session = await db
		.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
		.bind(hash)
		.first<{ user_id: number; expires_at: string }>();
	if (!session) return null;
	if (session.expires_at < new Date().toISOString()) {
		await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
		return null;
	}
	return loadUser(db, session.user_id);
}

export async function createSession(db: D1Database, userId: number, client: 'web' | 'app') {
	const token = randomToken();
	const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
	await db.batch([
		db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()),
		db
			.prepare('INSERT INTO sessions (token_hash, user_id, client, expires_at) VALUES (?, ?, ?, ?)')
			.bind(await sha256(token), userId, client, expires)
	]);
	return { token, expires };
}

export async function deleteSession(db: D1Database, token: string) {
	await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

// A fixed hash so unknown usernames cost the same time as wrong passwords.
let dummyHash: Promise<string> | null = null;

export async function checkCredentials(
	db: D1Database,
	username: string,
	password: string
): Promise<number | null> {
	const row = await db
		.prepare('SELECT id, password_hash FROM users WHERE username = ? AND active = 1')
		.bind(username)
		.first<{ id: number; password_hash: string }>();
	if (!row) {
		dummyHash ??= hashPassword('dummy-password');
		await verifyPassword(password, await dummyHash);
		return null;
	}
	return (await verifyPassword(password, row.password_hash)) ? row.id : null;
}

/**
 * Fixed-window rate limit stored in D1. Throws 429 when `key` exceeds `limit`
 * hits within `windowSec`.
 */
export async function rateLimit(
	db: D1Database,
	key: string,
	limit: number,
	windowSec: number,
	message?: string
) {
	const now = Math.floor(Date.now() / 1000);
	const row = await db
		.prepare(
			`INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2 + ?3)
			 ON CONFLICT(key) DO UPDATE SET
			   count = CASE WHEN reset_at <= ?2 THEN 1 ELSE count + 1 END,
			   reset_at = CASE WHEN reset_at <= ?2 THEN ?2 + ?3 ELSE reset_at END
			 RETURNING count`
		)
		.bind(key, now, windowSec)
		.first<number>('count');
	if ((row ?? 0) > limit) throw tooMany(message);
	if (Math.random() < 0.02) {
		// Opportunistic cleanup of expired windows (not security sensitive).
		await db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').bind(now).run();
	}
}

export async function clearRateLimit(db: D1Database, key: string) {
	await db.prepare('DELETE FROM rate_limits WHERE key = ?').bind(key).run();
}
