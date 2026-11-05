const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extracts a YouTube video id from a URL (watch, youtu.be, shorts, embed, live) or a bare id. */
export function parseYoutubeId(input: string): string | null {
	const s = input.trim();
	if (ID_RE.test(s)) return s;
	let url: URL;
	try {
		url = new URL(s.startsWith('http') ? s : `https://${s}`);
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
	let id: string | null = null;
	if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
	else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
		if (url.pathname === '/watch') id = url.searchParams.get('v');
		else {
			const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
			id = m?.[2] ?? null;
		}
	}
	return id && ID_RE.test(id) ? id : null;
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeEmbed = (id: string) =>
	`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
export const youtubeWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
