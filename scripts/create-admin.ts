#!/usr/bin/env bun
// Creates (or resets) an Admin Utama account directly in D1.
//
//   bun run create-admin -- --username razan --name "Razan"            # local dev DB
//   bun run create-admin -- --username sekretaris --name "Bu Sri" --remote  # production
//
// The password is read from the ADMIN_PASSWORD env var, or prompted for.

import { parseArgs } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashPassword, PASSWORD_MIN_LENGTH } from '../src/lib/server/crypto.ts';

const { values } = parseArgs({
	options: {
		username: { type: 'string' },
		name: { type: 'string' },
		remote: { type: 'boolean', default: false }
	}
});

const username = values.username?.trim().toLowerCase();
const name = values.name?.trim();
if (!username || !/^[a-z0-9._-]{3,32}$/.test(username) || !name) {
	console.error('Usage: bun run create-admin -- --username <3-32 chars a-z0-9._-> --name "<Full name>" [--remote]');
	process.exit(1);
}

const password = process.env.ADMIN_PASSWORD ?? prompt(`Kata sandi untuk ${username}:`) ?? '';
if (password.length < PASSWORD_MIN_LENGTH) {
	console.error(`Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`);
	process.exit(1);
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const hash = await hashPassword(password);
const sql = `
INSERT INTO users (username, name, password_hash) VALUES (${q(username)}, ${q(name)}, ${q(hash)})
  ON CONFLICT(username) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, active = 1;
INSERT OR IGNORE INTO user_roles (user_id, role) SELECT id, 'admin_utama' FROM users WHERE username = ${q(username)};
`;

const dir = mkdtempSync(join(tmpdir(), 'kp-admin-'));
const file = join(dir, 'admin.sql');
writeFileSync(file, sql, { mode: 0o600 });
try {
	const proc = Bun.spawnSync(
		[
			'bunx',
			'wrangler',
			'd1',
			'execute',
			'portal-purbonegaran',
			values.remote ? '--remote' : '--local',
			`--file=${file}`,
			'--yes'
		],
		{ stdout: 'inherit', stderr: 'inherit' }
	);
	if (proc.exitCode !== 0) process.exit(proc.exitCode ?? 1);
	console.log(`\nAkun Admin Utama "${username}" siap (${values.remote ? 'produksi' : 'lokal'}).`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
