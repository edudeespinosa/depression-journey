# Testing Rules

> **Status: No test framework is configured.**
> No test files, no `jest.config.*`, no `vitest.config.*`, and no test scripts exist.
> This file documents the recommended setup for this stack and the conventions to follow when tests are added.

---

## 1. Commands

No test commands exist yet. After setup (see §6 Rule 1), the commands will be:

```bash
# Run all tests
npx vitest run

# Watch mode (default during development)
npx vitest

# Coverage report
npx vitest run --coverage
```

`package.json` scripts to add:

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

---

## 2. When Tests Are Required

| Change type | Required test file |
|---|---|
| New API route (`app/api/**`) | `app/api/<route>/__tests__/route.test.ts` |
| New utility (`lib/**`) | `lib/__tests__/<filename>.test.ts` |
| New middleware (`middleware.ts`) | `__tests__/middleware.test.ts` |
| New habit schedule logic | Co-located in `app/api/habits/__tests__/route.test.ts` |
| New encryption function (`lib/encryption.ts`) | `lib/__tests__/encryption.test.ts` |
| New React component (`components/**`) | `components/__tests__/<Component>.test.tsx` |
| Changes to `isPublicPath` in middleware | `__tests__/middleware.test.ts` — covers all path variants |

Streaming AI routes (`/api/checkin`, `/api/journal/reflect`) require at minimum:
- Auth guard returns 401 when unauthenticated
- Input validation returns 400 for bad input
- Stream response returns 200 with `text/plain` content-type

---

## 3. File Location Convention

Tests live co-located with source files inside `__tests__/` subdirectories.

```
app/
  api/
    checkin/
      route.ts
      __tests__/
        route.test.ts          ← API route tests
    habits/
      route.ts
      __tests__/
        route.test.ts
      [id]/
        route.ts
        __tests__/
          route.test.ts
lib/
  encryption.ts
  __tests__/
    encryption.test.ts         ← utility tests
  supabase/
    server.ts
    __tests__/
      server.test.ts
components/
  Sidebar.tsx
  __tests__/
    Sidebar.test.tsx           ← component tests
__tests__/
  middleware.test.ts           ← root-level for middleware
```

---

## 4. Test Categories

### Pure Unit (no I/O)

Target: `lib/encryption.ts`, `weekStart()` helper, `isPublicPath()` helper, habit schedule computation logic.

**What to mock:** Nothing — these are pure functions.

```ts
// lib/__tests__/encryption.test.ts
import { encrypt, decrypt, safeDecrypt } from "@/lib/encryption";

// Must set env var before import or in beforeAll
process.env.DATA_ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars = 32 bytes
```

### Integration (API route handlers)

Target: all `app/api/**/route.ts` files.

**What to mock:**
- `@/lib/supabase/server` → fake Supabase client with chainable query builder
- `@anthropic-ai/sdk` → fake `messages.stream()` that yields text chunks
- `next/headers` → `cookies()` (needed by Supabase server client)

**What NOT to mock:** `@/lib/encryption` — use real encryption with the test key set in env.

### Component (React UI)

Target: `components/**/*.tsx`, page-level client components.

**What to mock:**
- `@/lib/supabase/client` → fake client
- `next-intl` → `useTranslations` via `next-intl/jest` or a stub

---

## 5. Mocking Patterns

No existing test files exist, so the following templates are derived from the actual module signatures in the codebase.

### Pattern A — Mock Supabase server client (most API routes)

```ts
// ─── top of every API route test ───────────────────────────────────────────

import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Step 1: declare the mock BEFORE importing the module under test.
// vi.mock is hoisted, so the factory runs before any imports.
const mockGetUser = vi.fn();
const mockFrom    = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from:  mockFrom,
  }),
}));

// Step 2: import the route handler after mocks are declared.
import { GET, POST } from "../route";

// Step 3: reset call counts between tests to prevent cross-test pollution.
beforeEach(() => {
  vi.clearAllMocks();
});

// Step 4: configure per-test return values.
describe("GET /api/habits", () => {
  it("returns 401 when unauthenticated", async () => {
    // Return no user
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns habit list for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

    // Chain: supabase.from("habits").select(...).eq(...).order(...) → { data: [...] }
    // Each .from() call must return an object whose methods also return that same
    // chain-terminating promise. Use a reusable builder helper:
    const chainResult = (data: unknown) => {
      const chain: Record<string, unknown> = {};
      const methods = ["select","eq","gte","lte","order","limit","maybeSingle","single","insert","update","delete","upsert"];
      methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain); });
      (chain as { data: unknown }).data = data;
      // Make the chain itself thenable so await works
      (chain as { then: unknown }).then = (resolve: (v: { data: unknown }) => void) =>
        Promise.resolve({ data }).then(resolve);
      return chain;
    };

    mockFrom.mockReturnValue(chainResult([]));

    const res = await GET();
    expect(res.status).toBe(200);
  });
});
```

### Pattern B — Mock Anthropic streaming (AI routes)

```ts
// Step 1: mock the SDK before importing the route.
const mockStream = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: mockStream },
  })),
}));

// Step 2: make the fake stream async-iterable.
function makeFakeStream(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        yield { type: "content_block_delta", delta: { type: "text_delta", text } };
      }
    },
  };
}

// Step 3: use in test.
it("streams a plain-text response", async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockStream.mockResolvedValue(makeFakeStream(["Hello ", "world"]));
  mockFrom.mockReturnValue(/* chain that resolves insert */ ...);

  const req = new NextRequest("http://localhost/api/checkin", {
    method: "POST",
    body: JSON.stringify({ emotion: "sad", intensity: 60, locale: "en" }),
    headers: { "Content-Type": "application/json" },
  });

  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);

  // Consume the stream
  const text = await res.text();
  expect(text).toBe("Hello world");
});
```

### Pattern C — Pure function (no mocks needed)

```ts
// lib/__tests__/encryption.test.ts
import { describe, it, expect, beforeAll } from "vitest";

// Must set before importing the module, because getKey() runs at call time.
beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY = "0".repeat(64);
});

import { encrypt, decrypt, safeDecrypt } from "@/lib/encryption";

describe("safeDecrypt", () => {
  it("returns null for null input", () => {
    expect(safeDecrypt(null)).toBeNull();
  });

  it("returns plaintext as-is when not in encrypted format", () => {
    expect(safeDecrypt("legacyvalue")).toBe("legacyvalue");
  });

  it("round-trips encrypted values", () => {
    const ciphertext = encrypt("hello");
    expect(safeDecrypt(ciphertext)).toBe("hello");
  });
});
```

---

## 6. Key Rules

1. **Install Vitest before writing any tests.** This project has no test runner.
   ```bash
   npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
   ```
   Add a `vitest.config.ts` at the project root:
   ```ts
   import { defineConfig } from "vitest/config";
   import react from "@vitejs/plugin-react";
   import tsconfigPaths from "vite-tsconfig-paths";
   export default defineConfig({
     plugins: [react(), tsconfigPaths()],
     test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"] },
   });
   ```

2. **Always call `vi.clearAllMocks()` in `beforeEach`.** Supabase mock call counts leak between tests and produce false positives (a passing test that accidentally matched the previous test's mock state).

3. **Set `DATA_ENCRYPTION_KEY` in `vitest.setup.ts`, not inline.** Every API route that touches an encrypted field calls `getKey()` at runtime; if the env var is missing the test throws before reaching any assertion.
   ```ts
   // vitest.setup.ts
   process.env.DATA_ENCRYPTION_KEY = "a".repeat(64);
   process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
   ```

4. **Never use `getSession()` in tests or prod code — only `getUser()`.** `getSession()` can return stale cached data. The mock must only expose `getUser`.

5. **Supabase query chains must be fully stubbed.** Every chained method (`.select()`, `.eq()`, `.order()`, `.limit()`, `.maybeSingle()`, `.single()`) must return an object with further chain methods, or `await` will hang. Missing a method in the chain causes `TypeError: supabase.from(...).select(...).eq is not a function`.

6. **Mock `@/lib/supabase/server`, not `@supabase/ssr`.** The route files import from the local wrapper `@/lib/supabase/server`, not the SDK directly. Mocking the SDK has no effect.

7. **Streaming route tests must consume the `ReadableStream` to trigger the DB insert.** The `supabase.from().insert()` call happens inside `ReadableStream.start()`, which only runs when the stream is consumed. Asserting `res.status === 200` without reading the body means the insert mock is never called.

8. **`specific_days` habit logic uses UTC-offset dates.** The date math in `app/api/habits/route.ts` appends `T12:00:00` to avoid timezone-edge-case misclassification. Tests that construct log dates must include `"T12:00:00"` or use full ISO strings, not bare `YYYY-MM-DD`.

9. **Dev routes must not run in `NODE_ENV=test`.** Routes under `app/api/dev/` check `NODE_ENV !== "production"` but tests run with `NODE_ENV=test`. Add a guard test that verifies these routes are unreachable in production (`NODE_ENV=production`).

10. **Do not mock `lib/encryption.ts`.** It is a pure Node crypto module with no I/O. Using real encryption in tests catches key-format errors and round-trip bugs that a stub would hide.
