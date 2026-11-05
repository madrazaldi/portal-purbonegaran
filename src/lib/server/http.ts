// Small validation + error helpers shared by the API and page loads.

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public fields?: Record<string, string>
	) {
		super(message);
	}
}

export const badRequest = (msg: string, fields?: Record<string, string>) =>
	new HttpError(400, msg, fields);
export const notFound = (msg = 'Data tidak ditemukan.') => new HttpError(404, msg);
export const forbidden = (msg = 'Anda tidak punya akses untuk tindakan ini.') =>
	new HttpError(403, msg);
export const unauthorized = (msg = 'Silakan masuk terlebih dahulu.') => new HttpError(401, msg);
export const tooMany = (msg = 'Terlalu banyak percobaan. Coba lagi nanti.') =>
	new HttpError(429, msg);

type Obj = Record<string, unknown>;

/**
 * Collects field errors so a form can show all problems at once.
 * Call `done()` after reading every field; it throws a 400 if anything failed.
 */
export class Validator {
	errors: Record<string, string> = {};
	constructor(private data: Obj) {}

	static from(data: unknown) {
		if (!data || typeof data !== 'object' || Array.isArray(data)) {
			throw badRequest('Data yang dikirim tidak valid.');
		}
		return new Validator(data as Obj);
	}

	has(key: string) {
		return this.data[key] !== undefined;
	}

	string(
		key: string,
		label: string,
		opts: { required?: boolean; max?: number; min?: number; trim?: boolean } = {}
	): string {
		const raw = this.data[key];
		if (raw !== undefined && raw !== null && typeof raw !== 'string') {
			this.errors[key] = `${label} harus berupa teks.`;
			return '';
		}
		const v = opts.trim === false ? ((raw as string) ?? '') : ((raw as string) ?? '').trim();
		if (opts.required && !v) this.errors[key] = `${label} wajib diisi.`;
		else if (opts.min && v.length < opts.min)
			this.errors[key] = `${label} minimal ${opts.min} karakter.`;
		else if (opts.max && v.length > opts.max)
			this.errors[key] = `${label} maksimal ${opts.max} karakter.`;
		return v;
	}

	optionalString(key: string, label: string, max: number): string | null {
		const v = this.string(key, label, { max });
		return v ? v : null;
	}

	oneOf<T extends string>(key: string, label: string, allowed: readonly T[], fallback?: T): T {
		const v = this.data[key];
		if (v === undefined && fallback !== undefined) return fallback;
		if (typeof v !== 'string' || !allowed.includes(v as T)) {
			this.errors[key] = `${label} tidak valid.`;
			return allowed[0];
		}
		return v as T;
	}

	int(key: string, label: string, opts: { min?: number; max?: number; required?: boolean } = {}) {
		const raw = this.data[key];
		if (raw === undefined || raw === null || raw === '') {
			if (opts.required) this.errors[key] = `${label} wajib diisi.`;
			return null;
		}
		const n = typeof raw === 'number' ? raw : Number(raw);
		if (!Number.isInteger(n)) {
			this.errors[key] = `${label} harus berupa angka bulat.`;
			return null;
		}
		if (opts.min !== undefined && n < opts.min) this.errors[key] = `${label} minimal ${opts.min}.`;
		if (opts.max !== undefined && n > opts.max) this.errors[key] = `${label} maksimal ${opts.max}.`;
		return n;
	}

	number(key: string, label: string, opts: { min?: number; max?: number } = {}) {
		const raw = this.data[key];
		const n = typeof raw === 'number' ? raw : Number(raw);
		if (raw === '' || raw === null || raw === undefined || !Number.isFinite(n)) {
			this.errors[key] = `${label} harus berupa angka.`;
			return 0;
		}
		if (opts.min !== undefined && n < opts.min) this.errors[key] = `${label} minimal ${opts.min}.`;
		if (opts.max !== undefined && n > opts.max) this.errors[key] = `${label} maksimal ${opts.max}.`;
		return n;
	}

	bool(key: string, fallback = false): boolean {
		const v = this.data[key];
		if (v === undefined) return fallback;
		return v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
	}

	intArray(key: string, label: string, max = 50): number[] {
		const v = this.data[key];
		if (v === undefined || v === null) return [];
		if (!Array.isArray(v) || v.length > max || !v.every((x) => Number.isInteger(x))) {
			this.errors[key] = `${label} tidak valid.`;
			return [];
		}
		return v as number[];
	}

	fail(key: string, message: string) {
		this.errors[key] = message;
	}

	done() {
		if (Object.keys(this.errors).length) {
			throw badRequest('Periksa kembali isian yang ditandai.', this.errors);
		}
	}
}

export function nowIso(): string {
	return new Date().toISOString();
}
