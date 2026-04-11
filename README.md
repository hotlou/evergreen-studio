# Evergreen Studio

A content workspace that remembers what it said yesterday, what's working, and what you
banned. Daily on-brand content packs that don't repeat themselves, pulled from a library
mined from your real post history.

## Status

**M1 — Multi-brand workspace + intake.** Auth, schema, sidebar shell, brand switcher,
and a five-step intake wizard. Generation, ingest, and publishing land in M2–M7.

See `/root/.claude/plans/linear-baking-tome.md` for the full plan.

## Stack

- Next.js 15 App Router + TypeScript
- Tailwind + shadcn-style primitives
- Prisma + Postgres (pgvector lands in M4 via raw SQL)
- NextAuth v5 (dev Credentials provider — swap for Google/Email before launch)
- Anthropic Claude via `@anthropic-ai/sdk` (wiring starts in M2)
- Ayrshare for publishing + historical ingest (M2 and M7)

## Getting started

```bash
# 1. Copy env and point DATABASE_URL at a Postgres instance
cp .env.example .env.local
#    — fill in DATABASE_URL, AUTH_SECRET (openssl rand -base64 32)

# 2. Install
npm install

# 3. Schema + seed (creates Combat Candy / Unbenchable / Lucy as demo brands)
npm run db:push
npm run db:seed

# 4. Run
npm run dev
```

Sign in at `http://localhost:3000/login` with any email — dev mode upserts a user and a
workspace on first sign-in.

## Branding

Evergreen's real logo and favicon live in `public/` and `public/brand/`. Tailwind tokens
track the EverGreen palette:

| Token              | Hex       | Role           |
|--------------------|-----------|----------------|
| `evergreen-500`    | `#4EB35E` | Primary        |
| `evergreen-600`    | `#4C9C54` | Primary-dark   |
| `slate-ink`        | `#44546C` | Body text      |
| `slate-line`       | `#D6D8DD` | Borders        |
| `sage`             | `#9CC4AC` | Accent         |

## Milestones

- [x] **M1** — Auth + multi-brand workspace + intake wizard
- [ ] **M2** — Ingest-and-mine (Ayrshare history + CSV fallback)
- [ ] **M3** — Strategy editor (pillars / angles / voice / taboos)
- [ ] **M4** — Daily Content Pack w/ anti-repetition pipeline (Instagram)
- [ ] **M5** — BrandLearning capture + injection loop
- [ ] **M6** — Media library (upload + auto-tag + embed)
- [ ] **M7** — Ayrshare publish

## Rules

- Legacy code is reference only; this repo is the source of truth.
- Rebuild from first principles against the plan file.
