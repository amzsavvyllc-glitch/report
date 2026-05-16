# Keeta Rider Ops

A unified web app for a Keeta 3rd-party last-mile delivery operation. Managers and
bike riders use the same app: managers triage incidents and review documents from a
dashboard, riders submit incident reports + upload documents from a mobile-friendly
PWA. AI does the busywork — drafting multilingual WhatsApp messages, reading Iqama
expiry dates, extracting incident structure from text+photos.

## Stack at a glance

- **Next.js 15** (App Router) on **Cloudflare Pages** via `@opennextjs/cloudflare`
- **Cloudflare Workers + Hono** for the API
- **Cloudflare D1 + Drizzle ORM** for the database
- **Cloudflare R2** for photos, voice notes, document scans, raw CSVs
- **Cloudflare KV** for rate limits + daily AI spend cap
- **Lucia v3** for sessions; manager = email+password, rider = phone + Twilio Verify OTP
- **next-intl** for English / Urdu / Hindi / Bengali
- **Serwist** for the PWA service worker
- **Anthropic SDK** with prompt caching — Sonnet (default), Haiku (cheap triage), Opus (fallback for low-confidence OCR)

## Modules (MVP)

| Module | What it does | AI |
|---|---|---|
| **Rider Roster** | List, search, edit riders. Source of truth. | — |
| **Daily Performance Reports** | Upload Keeta CSV → per-rider stats → AI-generated WhatsApp messages in EN/UR/HI/BN. | Sonnet 4.6 |
| **Incident Reports** | Rider submits text+photos+voice. AI extracts structure, drafts insurance + manager alert. | Haiku 4.5 (triage) → Sonnet 4.6 (extract) |
| **Document Tracker** | Rider uploads Iqama/license/registration. Vision OCR reads expiry. Daily cron generates reminders. | Sonnet 4.6 (+ Opus 4.7 fallback) |

See [`/root/.claude/plans/is-it-connected-with-snazzy-crayon.md`](#) for the full plan.

## Local development

```bash
# 1. Install
pnpm install

# 2. Provision Cloudflare resources (one-time)
pnpm wrangler login
pnpm wrangler d1 create keeta-rider-ops             # copy ID into wrangler.toml
pnpm wrangler kv namespace create keeta-kv          # copy ID into wrangler.toml
pnpm wrangler r2 bucket create keeta-rider-ops-files

# 3. Apply DB schema locally
pnpm db:migrate:local

# 4. Bootstrap first manager
pnpm create-manager -- --email you@example.com --password 'Strong-Pass-1'

# 5. (optional) Seed test riders
pnpm seed

# 6. Set secrets (local dev uses .dev.vars; create from .env.example)
cp .env.example .dev.vars
# fill in ANTHROPIC_API_KEY, TWILIO_*, SESSION_SECRET

# 7. Run
pnpm dev
# open http://localhost:3000
```

## Deploy to Cloudflare

```bash
# Set secrets on the deployed Worker
pnpm wrangler secret put ANTHROPIC_API_KEY
pnpm wrangler secret put TWILIO_ACCOUNT_SID
pnpm wrangler secret put TWILIO_AUTH_TOKEN
pnpm wrangler secret put TWILIO_VERIFY_SERVICE_SID
pnpm wrangler secret put SESSION_SECRET

# Apply migrations to remote D1
pnpm db:migrate:remote

# Bootstrap first manager on remote
pnpm create-manager -- --email you@example.com --password 'Strong-Pass-1' --remote

# Build + deploy
pnpm cf:deploy
```

## Repository map

```
drizzle/
  schema.ts                       Drizzle schema (source of truth)
  migrations/0000_init.sql        Initial migration
messages/
  {en,ur,hi,bn}.json              i18n strings
src/
  app/
    [locale]/
      layout.tsx                  Root layout (next-intl provider)
      page.tsx                    Landing
      (manager)/
        login/                    Email+password
        dashboard/                KPI cards
        riders/                   List + new
        performance/              CSV upload (Phase 3)
        incidents/                Triage queue
        documents/                Expiry dashboard
      r/                          Rider PWA
        login/                    Phone + OTP
        home/
        incident/new/             (Phase 5)
        documents/                (Phase 4)
    api/[[...route]]/route.ts     Mounts Hono
  server/
    app.ts                        Hono root
    routes/                       auth, riders, performance, incidents, documents, uploads, files
    ai/
      client.ts                   Anthropic SDK + cached system + daily cost guard
      messages.ts | ocr.ts | incident.ts | classify.ts
      prompts/                    Long stable system prompts (prompt-cached)
  lib/
    auth.ts                       Lucia config
    db.ts                         Drizzle client bound to env.DB
    r2.ts                         R2 helpers
    csv.ts                        Keeta CSV parser
    schemas.ts                    Shared Zod schemas
    rbac.ts                       requireManager / requireRider
    password.ts                   argon2id hash + verify
    env.ts                        Cloudflare env accessor
  i18n/
    routing.ts | request.ts
  middleware.ts                   next-intl locale routing
  sw/index.ts                     Serwist service worker
scripts/
  create-manager.ts               CLI to create the first manager
  seed.ts                         Seed 5 test riders
public/
  manifest.webmanifest
  icons/                          PWA icons (add before deploy)
wrangler.toml                     Worker / D1 / R2 / KV / Cron bindings
open-next.config.ts               Cloudflare adapter config
```

## Phase status

| Phase | Status |
|---|---|
| 0 — Skeleton | Done |
| 1 — Rider Roster | Done (list, create; edit page TBD) |
| 2 — Rider auth + PWA | Done (login, home; PWA install card TBD) |
| 3 — Performance CSV → AI messages | API done; manager UI TBD |
| 4 — Documents OCR | API done; rider upload UI + cron TBD |
| 5 — Incidents | API done; rider submission UI TBD |
| 6 — Polish | Pending |

## Open questions

See the plan file for details:
1. Need one real Keeta CSV export sample to tighten the parser.
2. Confirm SMS provider — Twilio is the default, Unifonic is cheaper if rider phones are mostly KSA.
3. Need an Anthropic API key, Twilio Verify service, Cloudflare account.
