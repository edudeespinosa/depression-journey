# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
npm start         # Run production server
npm run prepare   # Activate .githooks (branch naming enforcement — run once after clone)
```

No test framework is configured.

## Quick Reference

```typescript
// Supabase server — API routes and server components
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Supabase browser — client components only
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Supabase admin — dev/seed routes only, never production-facing
import { createAdminClient } from "@/lib/supabase/admin";
const supabase = createAdminClient();

// Encryption — wrap sensitive fields before DB insert
import { encrypt, safeDecrypt } from "@/lib/encryption";
encrypt("plaintext")        // → "iv_hex:tag_hex:ciphertext_hex"
safeDecrypt(row.field)      // handles null, legacy plaintext, and encrypted values

// i18n — server components
import { getTranslations } from "next-intl/server";
const t = await getTranslations("namespace");

// AI streaming
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const stream = await client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 400,
  system: buildSystemPrompt(locale ?? "en"),
  messages: [{ role: "user", content: userInput }],
});
```

## Architecture

**Next.js App Router** with locale-prefixed routes (`/en/...`, `/es/...`).

### Route Structure

```
app/
  [locale]/
    page.tsx                    # Redirects to dashboard (auth) or login
    login/                      # Public login page
    auth/callback/              # Supabase OAuth callback
    (app)/                      # Protected routes (wrapped with Sidebar)
      dashboard/                # Mood trends + habit overview
      checkin/                  # Daily emotional check-in with AI streaming
      checkin/history/
      journal/                  # Free-form journaling with AI reflection
      journal/history/
      habits/                   # Habit creation + calendar completion tracking
      thought-records/          # CBT thought record forms
      portal/                   # Therapist portal home
      portal/[patientId]/       # Individual patient view
    dev/
      seed/                     # Dev-only database seeding
      seed-portal/              # Dev-only therapist portal seeding
  api/
    checkin/                    # POST streams Claude response; GET returns today's check-in
    checkin/history/
    journal/entries/            # CRUD for journal entries
    journal/reflect/            # POST streams Claude reflection
    habits/                     # GET list, POST create
    habits/[id]/                # GET/PUT/DELETE individual habit
    habits/[id]/logs/           # Habit completion logs
    habits/[id]/streak/         # Streak calculation
    thought-records/            # GET list, POST create
    thought-records/[id]/       # GET/PUT/DELETE individual record
    therapist/me/               # Therapist profile
    therapist/patients/         # List patients
    therapist/patients/[patientId]/  # Individual patient data
    dev/seed/                   # Dev seeding endpoint
    dev/seed-portal/            # Dev therapist portal seeding endpoint
```

### Key Patterns

- **Authentication**: Supabase SSR auth enforced in `middleware.ts`. All `(app)/` routes are protected; `/login` and `/auth/*` are public. API routes are skipped by middleware and must self-authenticate.
- **AI streaming**: API routes use `@anthropic-ai/sdk` with `claude-sonnet-4-6`. Responses are streamed using `ReadableStream`. DB insert happens *inside* the stream `start()` callback after the full response is assembled — not before streaming starts. The AI persona is "Phantom Prophet".
- **i18n**: `next-intl` handles routing and translations. Messages live in `messages/en.json` and `messages/es.json`. API routes accept a `locale` param to adjust AI prompts bilingually.
- **Database**: Supabase tables with RLS. Server client in `lib/supabase/server.ts`; browser client in `lib/supabase/client.ts`; admin client in `lib/supabase/admin.ts`.
- **Styling**: Tailwind CSS v4 via PostCSS. Primary palette: `#FDFCF8` (off-white), `#3E4A3D` (dark sage), `#7C9082` (muted green). No `tailwind.config.js` — configured through `globals.css`.

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key
ANTHROPIC_API_KEY               # Claude API key (server-only)
DATA_ENCRYPTION_KEY             # 64-char hex string (32 bytes) for AES-256-GCM
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role (dev/seed routes only)
```

## Database

### Tables

| Table | Purpose | Encrypted Fields |
|---|---|---|
| `daily_checkins` | Mood check-ins | `ai_response` |
| `journal_entries` | User journal entries | `content`, `ai_response` |
| `habits` | Habit definitions | — |
| `habit_logs` | Habit completion records | — |
| `thought_records` | CBT thought record forms | `situation`, `automatic_thought`, `evidence_for`, `evidence_against`, `balanced_thought`, `outcome_emotion` |
| `patient_therapist_links` | Therapist-patient relationships | — |

### Habit Schedule Types

Three `schedule_type` values with different completion logic:
- `flexible` — user picks how many days/week; `week_count` = distinct logged days
- `specific_days` — fixed ISO weekdays (1=Mon..7=Sun); only logs on those days count
- `daily_count` — must complete N times per day (`times_per_day`); `completed` when `today_count >= times_per_day`

## Encryption

AES-256-GCM via Node's built-in `crypto` module (`lib/encryption.ts`).

- `DATA_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes)
- Ciphertext format: `"iv_hex:tag_hex:ciphertext_hex"` (colon-separated)
- `safeDecrypt(value)` — use when reading from DB; handles null, legacy plaintext (no colon), and encrypted strings. Use this for backward compatibility.
- `encrypt(plaintext)` — use before every DB insert of a sensitive field
- `decrypt(ciphertext)` — use only when you know the value is encrypted

```typescript
// Writing to DB
await supabase.from("journal_entries").insert({
  user_id: user.id,
  content: encrypt(entry),
  ai_response: encrypt(fullResponse),
});

// Reading from DB
const content = safeDecrypt(row.content);
```

## Authentication

- Supabase SSR auth; session stored in cookies via `@supabase/ssr`
- `middleware.ts` enforces auth on all routes except:
  - `/(en|es)?/?` (root)
  - `/(en|es)?/login`
  - `/auth/` paths
- **API routes are NOT covered by middleware** — each API route must call `supabase.auth.getUser()` and return 401 if unauthenticated
- All DB queries must be scoped: `.eq("user_id", user.id)`

## AI Streaming

Persona: **Phantom Prophet** — gentle, non-judgmental mental health companion.

Standard streaming pattern:

```typescript
const stream = await client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: 400, ... });
const readable = new ReadableStream({
  async start(controller) {
    let fullResponse = "";
    try {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          fullResponse += chunk.delta.text;
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      // DB insert happens here — after stream completes
      await supabase.from("...").insert({ ..., ai_response: encrypt(fullResponse) });
    } catch (err) {
      controller.error(err);
    } finally {
      controller.close();
    }
  },
});
return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
```

System prompt must always include: acknowledge before reflecting, ask one open-ended question, crisis line directive (988), never diagnose.

## Internationalization

- Locales: `en` (default), `es`
- All user-facing strings live in `messages/en.json` and `messages/es.json` — **both files must be updated together** when adding keys
- Routes automatically prefixed: `app/[locale]/...`
- AI routes read `locale` from request body and adjust system prompt language accordingly

## Branch Naming

All branches must follow `<git-user>/<type>/<description>` where `<git-user>` is your Git username. Pushes from non-conforming branches are blocked by `.githooks/pre-push`.

| Type     | Use for                              |
|----------|--------------------------------------|
| `feat`   | New features                         |
| `update` | Changes to existing functionality    |
| `fix`    | Bug fixes                            |
| `issue`  | Addressing a tracked issue           |

Examples: `iakor/feat/add-login-page`, `iakor/fix/broken-auth`

To activate the hook (runs automatically on `npm install`):
```bash
npm run prepare
```

## Common Gotchas

1. **`getUser()` not `getSession()`** — `getSession()` can return stale cached data. Always use `await supabase.auth.getUser()` for auth checks in API routes.

2. **No `tailwind.config.js`** — Tailwind v4 is configured entirely through `@import "tailwindcss"` in `app/globals.css`. Don't create a config file.

3. **New app pages need locale prefix** — Pages inside the protected layout must live at `app/[locale]/(app)/your-route/page.tsx`, not `app/your-route/`.

4. **Middleware skips `/api/`** — API routes are not auth-guarded by middleware. Each route handler is responsible for its own auth check.

5. **Encryption key length is exact** — `DATA_ENCRYPTION_KEY` must be exactly 64 hex chars. A wrong-length key throws at runtime; test locally before deploying.

6. **Dev routes need `NODE_ENV` guard** — Routes under `app/api/dev/` should check `process.env.NODE_ENV !== "production"` before executing.

## TODO

- [ ] Add `supabase/migrations/` with SQL schema for all tables (currently not in repo)
- [ ] Document Supabase RLS policies for each table
- [ ] Add `.env.local.example` with placeholder values
- [ ] Document how to run therapist portal seed (`/dev/seed-portal`)
- [ ] Document `patient_therapist_links` schema and permission model
