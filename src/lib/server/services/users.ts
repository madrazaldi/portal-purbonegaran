import type { Role, SessionUser } from '#lib/types.js';
import { hashPassword, sha256 } from '../crypto.js';
import { badRequest, notFound, nowIso } from '../http.js';

export interface AdminUser {
	id: number;
	username: string;
	name: string;
	roles: Role[];
	active: boolean;
	createdAt: string;
}

interface UserRow {
	id: number;
	username: string;
	name: string;
	active: number;
	created_at: string;
	roles: string | null;
}

const SELECT = `SELECT u.id, u.username, u.name, u.active, u.created_at,
	(SELECT GROUP_CONCAT(role) FROM user_roles r WHERE r.user_id = u.id) AS roles
	FROM users u`;

const toUser = (r: UserRow): AdminUser => ({
	id: r.id,
	username: r.username,
	name: r.name,
	roles: (r.roles ? r.roles.split(',') : []) as Role[],
	active: r.active === 1,
	createdAt: r.created_at
});

export async function listUsers(db: D1Database): Promise<AdminUser[]> {
	const { results } = await db.prepare(`${SELECT} ORDER BY u.name COLLATE NOCASE`).all<UserRow>();
	return results.map(toUser);
}

export async function getUser(db: D1Database, id: number): Promise<AdminUser> {
	const row = await db.prepare(`${SELECT} WHERE u.id = ?`).bind(id).first<UserRow>();
	if (!row) throw notFound('Akun tidak ditemukan.');
	return toUser(row);
}

async function countActiveAdminUtama(db: D1Database, exceptId: number) {
	return (
		(await db
			.prepare(
				`SELECT COUNT(*) AS n FROM users u JOIN user_roles r ON r.user_id = u.id
				 WHERE r.role = 'admin_utama' AND u.active = 1 AND u.id != ?`
			)
			.bind(exceptId)
			.first<number>('n')) ?? 0
	);
}

export async function createUser(
	db: D1Database,
	input: { username: string; name: string; password: string; role: Role }
): Promise<AdminUser> {
	const exists = await db
		.prepare('SELECT id FROM users WHERE username = ?')
		.bind(input.username)
		.first();
	if (exists) throw badRequest('Nama pengguna sudah dipakai.', { username: 'Nama pengguna sudah dipakai.' });
	const row = await db
		.prepare('INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?) RETURNING id')
		.bind(input.username, input.name, await hashPassword(input.password))
		.first<{ id: number }>();
	await db
		.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)')
		.bind(row!.id, input.role)
		.run();
	return getUser(db, row!.id);
}

export async function updateUser(
	db: D1Database,
	actor: SessionUser,
	id: number,
	input: { name: string; role: Role; active: boolean; password: string | null }
): Promise<AdminUser> {
	const current = await getUser(db, id);
	const losingAdmin =
		current.roles.includes('admin_utama') && (input.role !== 'admin_utama' || !input.active);
	if (losingAdmin && (await countActiveAdminUtama(db, id)) === 0) {
		throw badRequest('Harus ada minimal satu Admin Utama yang aktif.');
	}
	if (id === actor.id && !input.active) throw badRequest('Anda tidak bisa menonaktifkan akun sendiri.');

	const stmts = [
		db
			.prepare('UPDATE users SET name = ?, active = ?, updated_at = ? WHERE id = ?')
			.bind(input.name, input.active ? 1 : 0, nowIso(), id),
		db.prepare(`DELETE FROM user_roles WHERE user_id = ? AND role IN ('admin_utama', 'admin_konten')`).bind(id),
		db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').bind(id, input.role)
	];
	if (input.password) {
		stmts.push(
			db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(input.password), id)
		);
	}
	// Changing password or deactivating signs the account out everywhere.
	if (input.password || !input.active) {
		stmts.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
	}
	await db.batch(stmts);
	return getUser(db, id);
}

export async function deleteUser(db: D1Database, actor: SessionUser, id: number) {
	if (id === actor.id) throw badRequest('Anda tidak bisa menghapus akun sendiri.');
	const current = await getUser(db, id);
	if (current.roles.includes('admin_utama') && (await countActiveAdminUtama(db, id)) === 0) {
		throw badRequest('Harus ada minimal satu Admin Utama yang aktif.');
	}
	await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

export async function changeOwnPassword(db: D1Database, userId: number, password: string, keepToken: string) {
	await db.batch([
		db
			.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
			.bind(await hashPassword(password), nowIso(), userId),
		db
			.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
			.bind(userId, await sha256(keepToken))
	]);
}
