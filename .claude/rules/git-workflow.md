# Git Workflow Rules

---

## 1. Pre-commit

**No pre-commit hook is configured.**

There is no `.husky/` directory, no `lint-staged` config, and no pre-commit entry in `.githooks/`. Nothing runs automatically when you `git commit`.

This means lint and type errors are not caught at commit time. Run manual checks before committing (see §4).

---

## 2. Pre-push

**One hook runs on push:** `.githooks/pre-push`

| What it checks | Details |
|---|---|
| Branch name format | Must match `^[^/]+/(feat\|update\|fix\|issue)/[^/]+$` |
| Exempt branches | `main` and `master` pass without restriction |
| Detached HEAD | Passes without restriction |

**Approximate time cost:** < 1 second (pure shell regex, no compilation).

The hook is activated by `npm run prepare` (which runs `git config core.hooksPath .githooks`). If the hook is not firing, the prepare script has not been run — see §7.

**Full hook source** (`.githooks/pre-push`):
```sh
branch=$(git symbolic-ref HEAD 2>/dev/null | sed 's|refs/heads/||')
case "$branch" in
  main|master) exit 0 ;;
esac
if ! echo "$branch" | grep -qE '^[^/]+/(feat|update|fix|issue)/[^/]+$'; then
  echo "ERROR: Branch name '$branch' does not follow the required format"
  exit 1
fi
```

---

## 3. Branch Naming Convention

**Format enforced at push time:**

```
<git-user>/<type>/<description>
```

| Segment | Rules |
|---|---|
| `<git-user>` | Your Git username (no slashes) |
| `<type>` | One of: `feat`, `update`, `fix`, `issue` |
| `<description>` | Kebab-case description (no slashes) |

**Type meanings:**

| Type | Use for |
|---|---|
| `feat` | New features |
| `update` | Changes to existing functionality |
| `fix` | Bug fixes |
| `issue` | Addressing a tracked issue |

**Confirmed real branch examples from this repo:**
```
iakor/feat/enforce-branch-naming
iakor/feat/security-bounty-check-agent
```

**Creating a compliant branch:**
```bash
git checkout -b iakor/feat/my-new-feature
git checkout -b iakor/fix/broken-auth
git checkout -b iakor/update/refactor-habits-api
```

> **Warning:** The current branch `iakor-update-agent-and-add-tests` does **not** conform to the naming convention (uses `-` as separator instead of `/`). A push from this branch will be blocked by the pre-push hook.

---

## 4. Manual Commands

These are the only scripts in `package.json`. None run automatically.

```bash
# Start development server
npm run dev

# Production build (also catches TypeScript errors via Next.js compiler)
npm run build

# Run ESLint across all files
npm run lint

# Run production server (requires npm run build first)
npm start

# Activate .githooks (run once after clone, or if hooks stop firing)
npm run prepare
```

**No type-check script exists.** Use the build as a type-check proxy:
```bash
npm run build   # fails on TypeScript errors
```

Or run `tsc` directly (uses `tsconfig.json` with `"noEmit": true`):
```bash
npx tsc --noEmit
```

**No lint-fix script exists.** Pass `--fix` manually:
```bash
npx eslint --fix .
```

**Recommended pre-push checklist** (not automated):
```bash
npm run lint && npm run build
```

---

## 5. Formatter Config

**No formatter is configured.** There is no:
- `.prettierrc` / `prettier.config.*`
- `.editorconfig`
- `lint-staged` config

ESLint is the only code quality tool. It uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` with no custom rule overrides.

**TypeScript compiler settings** (from `tsconfig.json`) that affect code style enforcement:

| Setting | Value | Effect |
|---|---|---|
| `strict` | `true` | Enables `strictNullChecks`, `noImplicitAny`, etc. |
| `target` | `ES2017` | Allows async/await natively |
| `noEmit` | `true` | Build is type-check only; Next.js handles emit |
| `moduleResolution` | `bundler` | Enables `@/*` path alias |

Since there is no formatter, there are no enforced rules for indent size, quotes, semicolons, or line width. The codebase currently uses **2-space indent, double quotes, and semicolons** by convention — match the surrounding code when editing.

---

## 6. Bypassing Hooks

> **WARNING:** Only bypass hooks in genuine emergencies (e.g., reverting a broken commit on main, fixing a CI outage). Never bypass to skip a failing lint or branch-name check — fix the root cause instead.

```bash
# Skip the pre-push hook for a single push
git push --no-verify

# Skip all hooks for a single commit (no pre-commit hook exists, but future-proof)
git commit --no-verify -m "your message"
```

**When `--no-verify` is acceptable:**
- Reverting a bad commit on `main` under incident conditions
- Pushing to a personal throwaway branch that will never be merged

**When `--no-verify` is NOT acceptable:**
- Bypassing the branch naming check on a branch destined for PR review
- Skipping lint to "fix it later" (it will not get fixed)

---

## 7. Troubleshooting

### Problem 1: Pre-push hook not running

**Symptom:** You can push branches with any name without an error.

**Cause:** `npm run prepare` was never run, so `core.hooksPath` is still pointing at `.git/hooks/` (the default), not `.githooks/`.

**Fix:**
```bash
npm run prepare
# Verify it worked:
git config core.hooksPath
# Expected output: .githooks
```

### Problem 2: Push blocked — branch name rejected

**Symptom:**
```
ERROR: Branch name 'my-feature' does not follow the required format: <git-user>/<type>/<description>
```

**Cause:** The current branch does not match `^[^/]+/(feat|update|fix|issue)/[^/]+$`.

**Fix:** Rename the branch before pushing:
```bash
git branch -m iakor/feat/my-feature
git push -u origin iakor/feat/my-feature
```

If the old branch name was already pushed to remote, delete the remote branch after renaming:
```bash
git push origin --delete old-branch-name
```

### Problem 3: `npm run build` fails with TypeScript errors after editing

**Symptom:** Build fails with `Type error: ...` — lint passed but tsc did not.

**Cause:** ESLint and TypeScript have separate rule sets. ESLint can pass while `tsc --noEmit` still finds type errors. This project has no pre-commit hook to catch this.

**Fix:** Run type-check before pushing:
```bash
npx tsc --noEmit
```

Common causes in this codebase:
- Using `supabase.auth.getSession()` instead of `supabase.auth.getUser()` — the return type differs
- Forgetting `await` on `createClient()` (it is async in `lib/supabase/server.ts`)
- Adding a new i18n key to `messages/en.json` but not `messages/es.json` — `next-intl` types will drift

---

## CI

**No CI pipeline is configured.** There is no `.github/workflows/` directory and no external CI integration (CircleCI, GitLab CI, etc.).

All quality checks are manual. There is no automated gate before merge.
