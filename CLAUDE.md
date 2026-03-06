# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
npm start         # Run production server
```

No test framework is configured.

## Architecture

**Next.js App Router** with locale-prefixed routes (`/en/...`, `/es/...`).

### Route Structure

```
app/
  [locale]/
    page.tsx              # Redirects to dashboard (auth) or login
    login/                # Public login page
    auth/callback/        # Supabase OAuth callback
    (app)/                # Protected routes (wrapped with Sidebar)
      dashboard/          # Mood trends + habit overview
      checkin/            # Daily emotional check-in with AI streaming
      checkin/history/
      journal/            # Free-form journaling with AI reflection
      journal/history/
      habits/             # Habit creation + calendar completion tracking
      dev/seed/           # Dev-only database seeding
  api/
    checkin/              # POST streams Claude response; GET returns today's check-in
    checkin/history/
    journal/entries/      # CRUD for journal entries
    journal/reflect/      # POST streams Claude reflection
    habits/               # GET list, POST create
    habits/[id]/          # GET/PUT/DELETE individual habit
    habits/[id]/logs/     # Habit completion logs
    habits/[id]/streak/   # Streak calculation
```

### Key Patterns

- **Authentication**: Supabase SSR auth enforced in `middleware.ts`. All `(app)/` routes are protected; `/login` and `/auth/*` are public.
- **AI streaming**: API routes use `@anthropic-ai/sdk` with `claude-sonnet-4-6`. Responses are streamed using `ReadableStream` / `TransformStream`. The AI persona is "Phantom Prophet".
- **i18n**: `next-intl` handles routing and translations. Messages live in `messages/en.json` and `messages/es.json`. API routes accept a `locale` param to adjust AI prompts bilingually.
- **Database**: Supabase tables: `daily_checkins`, `journal_entries`, `habits`, `habit_logs`. Server client in `lib/supabase/server.ts`; browser client in `lib/supabase/client.ts`.
- **Styling**: Tailwind CSS v4 via PostCSS. Primary palette: `#FDFCF8` (off-white), `#3E4A3D` (dark sage), `#7C9082` (muted green).

### Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

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
