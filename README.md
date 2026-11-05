# Portal Kampung Purbonegaran (RW 11)

Website resmi Kampung Purbonegaran RW 11 (RT 49–53), Kelurahan Terban, Gondokusuman, Yogyakarta.
Program KKN-PPM UGM. Pengurus mengisi berita, kalender, dan galeri lewat halaman admin; warga dan
wisatawan membaca di website.

Production: https://purbonegaran.my.id (fallback: https://portal-purbonegaran.purbonegaran.workers.dev —
some ISPs such as XL/Axis block `*.workers.dev`, so always share the custom domain)

## Stack

| Bagian | Teknologi |
| --- | --- |
| Frontend | SvelteKit 3 + Svelte 5 (SSR for public pages, SPA for `/admin`) |
| Backend API | [Hono](https://hono.dev) at `/api/*`, mounted inside SvelteKit (`src/routes/api/[...path]`) |
| Database | Cloudflare D1 (SQLite) — `migrations/` |
| Photos | Cloudflare R2 (compressed to WebP in the browser before upload) |
| Hosting | Cloudflare Workers + static assets, Workers Caching enabled |
| Tooling | Bun (install, tests, scripts) |

```
src/
  lib/
    types.ts, dates.ts, recurrence.ts, richtext.ts, ics.ts …   shared, framework-free logic
    server/
      api/index.ts        Hono JSON API (admin panel today, Android app later)
      services/*.ts       D1/R2 data access, used by both the API and page loads
      auth.ts, crypto.ts  sessions (hashed tokens), PBKDF2 passwords, rate limits
    components/           public UI
    admin/                admin UI (API client, editors, media picker)
  routes/
    (site)/               public pages: beranda, profil, sejarah, rt, kalender, berita, galeri, kontak, aplikasi
    admin/                login + (panel)/ admin pages
    media/[...key]        serves R2 photos
    kalender.ics, sitemap.xml, robots.txt
migrations/               D1 schema
scripts/create-admin.ts   create/reset an Admin Utama account
```

## Develop

```sh
bun install
bun run db:migrate:local
bun run create-admin -- --username razan --name "Razan"   # local account
bun run dev                                                # http://localhost:5173
bun test src                                               # unit tests
bun run check                                              # types
```

**Bun caveat:** Wrangler's local runtime can't fully run under Bun
([oven-sh/bun#39247](https://github.com/oven-sh/bun/issues/39247)). `bun run dev` works for pages,
API, D1, and uploads, but **uploaded photos won't display locally** (R2 reads fail through the
proxy), and `bun run preview` (`wrangler dev`) returns 503. To test photos end-to-end, either install
Node.js LTS and use `npx wrangler dev`, or deploy and check the live site.

## Deploy

Pushing to `main` deploys automatically via GitHub Actions (`.github/workflows/ci.yml`):
tests + type check + build on every push and pull request, then on `main` the remote D1
migrations are applied and the Worker is deployed. Repository secrets used:
`CLOUDFLARE_API_TOKEN` (scoped to this account: Workers Scripts, D1, Workers Routes / DNS on
`purbonegaran.my.id`) and `CLOUDFLARE_ACCOUNT_ID`.

Manual deploy from a laptop still works:

```sh
bunx wrangler login          # once per machine
bun run deploy               # build + remote D1 migrations + wrangler deploy
```

Domain: `purbonegaran.my.id` is registered at Hostinger with its nameservers pointed to
Cloudflare; the Worker is attached as a Custom Domain (`routes` in `wrangler.jsonc`), and
`www.` redirects to the bare domain.

First production admin:

```sh
bun run create-admin -- --username <name> --name "<Full name>" --remote
```

## Roles

| Peran | Bisa |
| --- | --- |
| Admin Konten | write news (own posts), upload photos/videos, manage calendar & albums |
| Admin Utama | everything above + approve news, profile/history pages, RT data, app links, messages, accounts, settings |

`user_roles` has a `scope` column ready for later modules (e.g. `ketua_rt` scoped to `49`).

## API (for the Android app)

All JSON. Public: `GET /api/site`, `/api/posts?page&category`, `/api/posts/:slug`,
`/api/events?from=YYYY-MM-DD&to=…&category`, `/api/albums`, `/api/gallery?album&page`,
`/api/pages/:slug`, `POST /api/messages`.

Auth: `POST /api/auth/login` with `{"username","password","client":"app"}` returns `{ user, token }`;
send `Authorization: Bearer <token>` afterwards (30-day sessions). Admin endpoints live under
`/api/admin/*` — see `src/lib/server/api/index.ts`.

The calendar is also published as iCalendar at `/kalender.ics` (shared schedule for the WhatsApp
chatbot and Posyandu reminders).

## Free-tier guard rails

- Photos: hard cap of **8 GB** total (R2 free tier is 10 GB) and **20,000 uploads/month**
  (R2 free tier is 1M write ops; each upload = 2 writes). Usage is shown in Admin → Galeri.
- Photos are served with `cdn-cache-control: max-age=86400` and Workers Caching (cache key = path,
  not host; each deploy starts a fresh cache), so R2 reads stay
  far below the 10M/month free tier, and a deleted photo leaves the edge cache within a day.
- D1 free tier: 5M row reads / 100k row writes per day — far above expected use.

## Privacy (UU No. 27/2022 PDP)

- No NIK/KK collected. Ketua RT phone numbers are not published.
- Contact-form messages are visible to Admin Utama only.
- Upload consent reminder follows the photo rule chosen in Settings.
- At handover: transfer the Cloudflare account (or add pengurus as members), hand over Admin Utama,
  and delete local copies (`.wrangler/state`).
