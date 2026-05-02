# Coding Conventions — depression-journey

Reference for code generation and review. Every pattern shown is extracted from the actual codebase.

---

## 1. File & Directory Conventions

```
app/
  layout.tsx                          # Root layout — <html> / <body> only
  [locale]/
    layout.tsx                        # Sets lang, fonts, NextIntlClientProvider
    page.tsx                          # Auth-gate redirect only — no UI
    login/page.tsx                    # Public page
    (app)/
      layout.tsx                      # Wraps Sidebar + content offset
      dashboard/page.tsx              # Feature page
      habits/[id]/page.tsx            # Dynamic segment in page route
  api/
    checkin/route.ts                  # Flat route file
    habits/[id]/route.ts              # Dynamic segment in API route
    habits/[id]/logs/route.ts         # Nested sub-resource
    dev/seed/route.ts                 # Dev-only; must NODE_ENV guard

lib/
  encryption.ts                       # Pure utility — no Next.js imports
  supabase/
    server.ts                         # Server/API use only
    client.ts                         # Client component use only
    admin.ts                          # Dev/seed routes only

components/
  Sidebar.tsx                         # "use client"; complex stateful component
  LanguageSwitcher.tsx                # "use client"; single-purpose component

i18n/
  routing.ts                          # next-intl locale config
  request.ts                          # next-intl server config
```

**Rules:**
- API handlers go in `route.ts`; page UI goes in `page.tsx` — never mix
- One route file per HTTP boundary; sub-resources get their own subdirectory
- Shared utilities go in `lib/`; they must not import from `app/` or `components/`
- Dev-only routes live under `app/api/dev/` and must guard with `NODE_ENV !== "production"`

---

## 2. Import Conventions

**Ordering** (top to bottom):

```ts
// 1. External packages
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

// 2. Internal lib (path alias)
import { createClient } from "@/lib/supabase/server";
import { encrypt, safeDecrypt } from "@/lib/encryption";

// 3. Internal components (path alias)
import Sidebar from "@/components/Sidebar";

// 4. Local / relative (rare — only i18n config files use this)
import { routing } from "./routing";
```

**The `@/` alias** maps to the project root. Always use it for cross-directory imports; never use `../../`.

**What is never imported where:**

| Import | Forbidden in |
|---|---|
| `@/lib/supabase/server` | Client components (`"use client"`) |
| `@/lib/supabase/admin` | Anywhere outside `app/api/dev/` |
| `next/headers` | Client components — it will throw |
| `@anthropic-ai/sdk` | Client components — leaks API key |

**`"use client"` directive** goes on the first line, before all imports:

```ts
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";  // ← client, not server
```

---

## 3. Type System

**Use `type`, not `interface`.** Every type in the codebase is declared with `type`:

```ts
// ✅ Used throughout
type Checkin = { emotion: string; intensity: number; created_at: string };
type Habit   = { id: string; completed: boolean; week_count: number; target_per_week: number };
type Mode    = "signin" | "forgot";
type Step    = 1 | 2 | 3;
```

**Route params** always use this exact shape (params is a Promise in Next.js 15+):

```ts
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
```

**State machine unions** instead of multiple booleans:

```ts
// ✅ Used in checkin/page.tsx and thought-records/page.tsx
type CheckinState = "idle" | "loading" | "streaming" | "done" | "finished" | "error";
type PageState    = "form" | "saving" | "saved";
```

**Passing `t` (translations) as a prop:**

```ts
// ✅ Used in thought-records/page.tsx
function RecordItem({ t }: { t: ReturnType<typeof useTranslations> }) {
```

**Naming:**
- PascalCase for all type aliases: `ThoughtRecord`, `EmotionCategory`, `CheckinState`
- No `I` prefix on interfaces; no `T` prefix on generics
- Local types are declared at the top of the file, not in a separate `types.ts`

---

## 4. Naming Conventions

**Constants** — `SCREAMING_SNAKE_CASE` for module-level lookup maps and arrays:

```ts
const CATEGORY_COLOR: Record<string, string> = {
  positive: "#F59E0B",
  low:      "#94A3B8",
};

const EMOTIONS: { id: string; emoji: string; category: EmotionCategory }[] = [
  { id: "happy", emoji: "😊", category: "positive" },
];
```

**Event handlers** — `handle` prefix, verb-noun:

```ts
async function handleSignIn(e: { preventDefault(): void }) { ... }
async function handleSendReply() { ... }
async function handleDelete(id: string) { ... }
function handleNew() { ... }
```

**Boolean state** — no `is` prefix on `useState` variables; `is` prefix on derived values:

```ts
const [loading, setLoading]       = useState(false);
const [expanded, setExpanded]     = useState(false);
const [confirming, setConfirming] = useState(false);
const [isTherapist, setIsTherapist] = useState(false);  // derived via fetch

// Derived booleans computed inline — also no is-prefix rule varies ⚠️
const canSubmit     = !!selectedId && state === "idle";
const isFollowUp    = Array.isArray(conversationMessages) && conversationMessages.length > 0;
const hasCheckinToday = checkins.some(...);
```

**Error variables:**

```ts
// Supabase destructure → always named `error`
const { data, error } = await supabase.from(...).select(...);
if (error) return NextResponse.json({ error: error.message }, { status: 500 });

// Catch clause → always named `err`
} catch (err) {
  console.error("[checkin] Stream error:", err);
  controller.error(err);
}

// Empty catch (ignored error) → no binding at all
} catch {
  // Called from a Server Component — middleware handles refresh
}
```

**Unused parameters** — prefix with `_`:

```ts
export async function DELETE(_req: NextRequest, { params }: Params) {
```

---

## 5. Function Patterns

**API route handlers** — named exports, always `async`, auth guard is always the first thing:

```ts
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ... rest of handler
}
```

**Helper/builder functions in route files** — not exported, defined above the handlers:

```ts
function buildCheckinPrompt(emotion: string, intensity: number, locale: string): string {
  return `You are Phantom Prophet ...`;
}

function weekStart(): string {
  const now = new Date();
  // ...
}
```

**Optional request body** — `.catch(() => ({}))` to avoid throwing on empty body:

```ts
const body = await req.json().catch(() => ({}));
const full_name = (body.name as string | undefined)?.trim() || user.email?.split("@")[0] || "Therapist";
```

**Early return / guard clauses** — used consistently to keep the happy path unindented:

```ts
// Reject future dates
if (date > today) {
  return NextResponse.json({ error: "Cannot log future dates" }, { status: 400 });
}

// Nothing to return
if (!data) return NextResponse.json(null);
```

**Pure utility functions** — top-level in the same file, no class wrappers:

```ts
function filterByDays(checkins: Checkin[], days: number): Checkin[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  return checkins.filter((c) => new Date(c.created_at) >= cutoff);
}
```

---

## 6. Component Patterns

**Server components** (no directive) — used for layouts and redirect-only pages:

```ts
// app/[locale]/page.tsx — auth gate, no interactivity
export default async function LocaleRootPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(`/${locale}/dashboard`);
  else redirect(`/${locale}/login`);
}
```

**Client components** — `"use client"` first line; all interactive pages:

```ts
"use client";

export default function CheckinPage() {
  const t = useTranslations("checkin");
  const locale = useLocale();
  const [state, setState] = useState<CheckinState>("idle");
  // ...
}
```

**Sub-components defined in the same file** — used when the sub-component is only ever used by that page:

```ts
// dashboard/page.tsx — MoodDots, FrequencyBars, Card, SectionHeader all in same file
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) { ... }
```

**Data fetching in client components** — `useEffect` + `fetch`, never SWR or React Query:

```ts
useEffect(() => {
  Promise.all([
    fetch("/api/checkin/history").then((r) => r.json()),
    fetch("/api/habits").then((r) => r.json()),
  ]).then(([c, h]) => {
    setCheckins(Array.isArray(c) ? c : []);
    setHabits(Array.isArray(h) ? h : []);
    setLoading(false);
  }).catch(() => setLoading(false));
}, []);
```

**Loading state UI** — always `animate-pulse` skeleton, never a spinner:

```ts
{loading ? (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
    ))}
  </div>
) : ( ... )}
```

**i18n in components** — always `useTranslations("namespace")` at the top of the component; never hardcode user-visible strings ⚠️ (see §10):

```ts
const t = useTranslations("checkin");
// ...
<h1>{t("title")}</h1>
<p>{t("subtitle")}</p>
```

---

## 7. Data Access Patterns

**Every query is user-scoped** — `.eq("user_id", user.id)` appears on every Supabase query that reads or writes user data:

```ts
const { data } = await supabase
  .from("daily_checkins")
  .select("*")
  .eq("user_id", user.id)          // ← always present
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

**No-row responses:**
- Use `.maybeSingle()` when 0 rows is valid → returns `null`, not an error
- Use `.single()` when exactly 1 row is expected → returns an error if 0 rows

**Null-safe array results:**

```ts
return NextResponse.json(data ?? []);

// Client-side guard
setCheckins(Array.isArray(c) ? c : []);
```

**Encrypted fields** — always decrypt on read, always encrypt on write:

```ts
// Reading from DB → safeDecrypt (handles null and legacy plaintext)
return NextResponse.json((data ?? []).map((c) => ({
  ...c,
  ai_response: safeDecrypt(c.ai_response),
})));

// Writing to DB → encrypt
await supabase.from("daily_checkins").insert({
  user_id: user.id,
  emotion,
  intensity,
  ai_response: encrypt(fullResponse),   // ← always encrypt before insert
});
```

**Streaming DB insert timing** — the `supabase.insert` call happens inside `ReadableStream.start()` after the full response is assembled, not before streaming starts:

```ts
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
      // DB write happens here — after full response is assembled
      await supabase.from("daily_checkins").insert({ ..., ai_response: encrypt(fullResponse) });
    } finally {
      controller.close();
    }
  },
});
```

---

## 8. Error Handling

**API routes** — three tiers, all use `NextResponse.json` with explicit status codes:

```ts
// Tier 1: Auth failure → 401
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Tier 2: Validation failure → 400
if (!["gentle", "steady", "focused"].includes(commitment_level)) {
  return NextResponse.json({ error: "Invalid commitment level" }, { status: 400 });
}

// Tier 3: DB/upstream failure → 500
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
```

**204 No Content** — used for successful DELETE (no body):

```ts
return new NextResponse(null, { status: 204 });
```

**Streaming route errors** — Anthropic errors caught before the stream starts (→ 502); stream errors caught inside `start()`:

```ts
let stream;
try {
  stream = await client.messages.stream({ ... });
} catch (err) {
  console.error("[checkin] Anthropic error:", err);
  return new Response(String(err), { status: 502 });
}

// Inside ReadableStream.start():
} catch (err) {
  console.error("[checkin] Stream error:", err);
  controller.error(err);
}
```

**Client component errors** — stored in state, rendered as a `<p>` below the form:

```ts
const [error, setError] = useState("");

// On failure:
setError(error.message);

// In JSX:
{error && <p className="text-sm text-red-400">{error}</p>}
```

**`console.error` tags** — prefixed with `[route-name]` for log filtering:

```ts
console.error("[checkin] Anthropic error:", err);
console.error("[checkin] Stream error:", err);
```

---

## 9. Code Hygiene

**No `any`** — the codebase uses no explicit `any`. Use `unknown` in catch clauses and narrow:

```ts
// ✅
} catch (err: unknown) {
  if (err instanceof Error && err.name === "AbortError") return;
  setState("error");
}
```

**Empty catch** — when an error is intentionally ignored, use an empty catch block with a comment:

```ts
} catch {
  // Called from a Server Component — middleware handles refresh
}
```

**No dead imports** — every import is used; unused params are prefixed with `_`.

**No `tailwind.config.js`** — Tailwind v4 is configured entirely in `app/globals.css` via `@theme inline`. Do not create a config file.

**Inline styles only for dynamic values** — static styles use Tailwind classes; `style={{}}` is reserved for values computed at runtime (colors from data, widths as percentages):

```ts
// ✅ Dynamic value — must be inline style
style={{ width: `${(count / max) * 100}%`, backgroundColor: CATEGORY_COLOR[cat] }}

// ❌ Static value — use Tailwind class instead
style={{ borderRadius: "16px" }}
```

**No `getSession()`** — always `getUser()` for auth checks:

```ts
// ✅
const { data: { user } } = await supabase.auth.getUser();

// ❌ — can return stale cached data
const { data: { session } } = await supabase.auth.getSession();
```

---

## 10. ⚠️ Inconsistencies & Project-Specific Patterns

### State Machine Pattern

Multi-step UI flows use string union state machines instead of multiple boolean flags. This is the established pattern and must be followed for any new interactive flow:

```ts
type CheckinState = "idle" | "loading" | "streaming" | "done" | "finished" | "error";
// Never: const [isLoading, isStreaming, isDone, isError] = ...
```

### Date Handling

Dates for DB comparisons are always formatted as `YYYY-MM-DD` using `.toISOString().split("T")[0]`:

```ts
const today = new Date().toISOString().split("T")[0];  // "2026-03-22"
```

Date-of-week math for `specific_days` habits appends `T12:00:00` to avoid DST/timezone boundary errors:

```ts
const dow = new Date(l.date + "T12:00:00").getDay();  // never new Date(l.date)
```

### Unauthorized Response Format ⚠️

Two different patterns exist for 401 responses — standardize to `NextResponse.json`:

```ts
// ✅ Used in most routes (correct pattern)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// ⚠️ Used in checkin POST and journal reflect (inconsistent)
return new Response("Unauthorized", { status: 401 });
```

### Hardcoded Strings ⚠️

A handful of user-visible strings are not in the i18n message files:

```ts
// ⚠️ dashboard/page.tsx — greeting() uses hardcoded English
function greeting(): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ⚠️ LABEL_TO_CAT maps both English and Spanish emotion labels directly
// This breaks if new translations are added
const LABEL_TO_CAT: Record<string, string> = {
  Happy: "positive", Alegre: "positive", ...
};
```

New user-visible strings must go in `messages/en.json` and `messages/es.json` together.

### AI Prompt Pattern

Every AI route builds its system prompt in a standalone `buildXxxPrompt()` function (not inline). The prompt must always include: acknowledge before reflecting, ask one open-ended question, crisis line directive (988), never diagnose. Max tokens: 120 for check-ins, 400 for journal/reflect.

```ts
function buildCheckinPrompt(emotion: string, intensity: number, locale: string): string {
  return `You are Phantom Prophet, a gentle Self-Reflection Guide. ...
${locale === "es" ? "\n- Respond entirely in Spanish (español)" : ""}`;
}
```
