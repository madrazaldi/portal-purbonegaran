// A deliberately tiny text format for pengurus who write on their phones.
//
//   Blank line         -> new paragraph
//   "## Judul"         -> sub-heading
//   "- item" / "* item"-> bullet list
//   "**tebal**"        -> bold
//   https://...        -> link
//
// It is parsed into a block tree that Svelte renders with normal elements, so
// user text is never injected as HTML.

export type Inline =
	| { t: 'text'; v: string }
	| { t: 'b'; v: string }
	| { t: 'a'; v: string; href: string };

export type Block =
	| { t: 'p'; lines: Inline[][] }
	| { t: 'h'; v: Inline[] }
	| { t: 'ul'; items: Inline[][] };

const INLINE_RE = /\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]])/g;

export function parseInline(s: string): Inline[] {
	const out: Inline[] = [];
	let last = 0;
	for (const m of s.matchAll(INLINE_RE)) {
		const i = m.index ?? 0;
		if (i > last) out.push({ t: 'text', v: s.slice(last, i) });
		if (m[1] !== undefined) out.push({ t: 'b', v: m[1] });
		else out.push({ t: 'a', v: m[2], href: m[2] });
		last = i + m[0].length;
	}
	if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
	return out;
}

export function parseRichText(src: string): Block[] {
	const blocks: Block[] = [];
	const lines = src.replace(/\r\n?/g, '\n').split('\n');
	let para: string[] = [];
	let list: string[] = [];

	const flush = () => {
		if (para.length) blocks.push({ t: 'p', lines: para.map(parseInline) });
		if (list.length) blocks.push({ t: 'ul', items: list.map(parseInline) });
		para = [];
		list = [];
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		const trimmed = line.trim();
		if (!trimmed) {
			flush();
		} else if (/^#{1,3}\s+/.test(trimmed)) {
			flush();
			blocks.push({ t: 'h', v: parseInline(trimmed.replace(/^#{1,3}\s+/, '')) });
		} else if (/^[-*•]\s+/.test(trimmed)) {
			if (para.length) flush();
			list.push(trimmed.replace(/^[-*•]\s+/, ''));
		} else {
			if (list.length) flush();
			para.push(trimmed);
		}
	}
	flush();
	return blocks;
}

/** Plain-text summary for previews and meta descriptions. */
export function plainText(src: string, max = 180): string {
	const text = src
		.replace(/^#{1,3}\s+/gm, '')
		.replace(/^[-*•]\s+/gm, '')
		.replace(/\*\*([^*\n]+)\*\*/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const space = cut.lastIndexOf(' ');
	return `${cut.slice(0, space > max * 0.6 ? space : max).trimEnd()}…`;
}

export function slugify(s: string): string {
	return (
		s
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80)
			.replace(/-+$/, '') || 'tulisan'
	);
}
