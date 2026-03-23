# Accessibility Rules — WCAG 2.1 AA

**Stack:** Plain HTML elements + Tailwind CSS v4. No component library (no Radix, shadcn/ui, MUI, etc.).
**i18n:** next-intl (`en` / `es`). All user-facing `aria-label` values must be i18n keys.
**Animations:** Tailwind `animate-pulse`, `transition-*`, and one SVG `stroke-dashoffset` transition.

---

## 1. Landmark Elements & Page Structure

Every protected page already uses `<main>` (each page.tsx) and the layout renders `<aside>` + `<nav>` via Sidebar. Keep this structure intact and complete it with a skip link.

### Required structure

```tsx
// app/[locale]/(app)/layout.tsx — add skip link before <Sidebar />
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#FDFCF8] text-[#2D3B35]">

      {/* Skip-to-content — visually hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
                   focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#7C9082] focus:text-white
                   focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56 pt-11 pb-14 lg:pt-0 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
```

```tsx
// Every page.tsx — add id to the <main> tag
// ✅ Correct
<main id="main-content" className="flex flex-col items-center px-4 py-12 flex-1">

// ❌ Wrong — no id, skip link has no target
<main className="flex flex-col items-center px-4 py-12 flex-1">
```

### Landmark rules

| Element | Used in | Rule |
|---|---|---|
| `<main id="main-content">` | Every `page.tsx` | One per page, skip link target |
| `<aside>` | `Sidebar` desktop | Already present — keep it |
| `<nav aria-label="...">` | `Sidebar` desktop + mobile tab bar | **Must have `aria-label`** — two `<nav>`s exist per page |
| `<header>` | `Sidebar` mobile header | Already present — keep it |

```tsx
// ✅ Correct — two <nav> elements must be distinguished
<aside className="hidden lg:flex ...">
  <nav aria-label={t("nav.desktopNav")} className="flex-1 px-2 py-3 ...">

<nav aria-label={t("nav.mobileTabBar")} className="flex lg:hidden fixed bottom-0 ...">

// ❌ Wrong — two unlabelled <nav>s are ambiguous to screen readers
<nav className="flex-1 ...">
<nav className="flex lg:hidden ...">
```

---

## 2. Interactive Elements

### Buttons

The codebase uses native `<button>` throughout. No wrappers or component library triggers exist — the patterns below apply directly.

```tsx
// ✅ Correct — icon-only button has aria-label (from i18n)
<button
  onClick={handleSignOut}
  aria-label={t("nav.signOut")}
  className="..."
>
  <svg aria-hidden="true" .../>
</button>

// ✅ Correct — button with visible text, icon is decorative
<button onClick={handleSignOut} className="...">
  <svg aria-hidden="true" focusable="false" .../>
  {t("nav.signOut")}
</button>

// ❌ Wrong — icon with no aria-label and no visible text
<button onClick={handleSignOut} className="...">
  <svg width="16" height="16" .../>   {/* no aria-hidden, no label */}
</button>
```

### Emotion picker buttons (checkin/page.tsx)

These are toggle buttons — they must announce their selected state.

```tsx
// ✅ Correct
<button
  key={id}
  onClick={() => setSelectedId(isSelected ? null : id)}
  aria-pressed={isSelected}
  aria-label={t(`emotions.${id}`)}   // emoji alone is not sufficient
  disabled={state === "loading"}
  className={`...`}
>
  <span aria-hidden="true" className="text-xl leading-none">{emoji}</span>
  <span className="text-[9px] font-medium leading-tight" aria-hidden="true">
    {t(`emotions.${id}`)}
  </span>
</button>

// ❌ Wrong — no aria-pressed, no aria-label; screen reader reads only emoji
<button
  key={id}
  onClick={() => setSelectedId(isSelected ? null : id)}
  className={`...`}
>
  <span className="text-xl leading-none">{emoji}</span>
  <span className="text-[9px] ...">{t(`emotions.${id}`)}</span>
</button>
```

### Expand/collapse buttons (thought-records, checkin history)

```tsx
// ✅ Correct
<button
  onClick={() => setExpanded((p) => !p)}
  aria-expanded={expanded}
  aria-controls="record-detail-{record.id}"
  className="w-full text-left ..."
>
  ...
  <svg aria-hidden="true" className={`... ${expanded ? "rotate-180" : ""}`} .../>
</button>
<div id={`record-detail-${record.id}`} hidden={!expanded}>
  ...
</div>

// ❌ Wrong — no aria-expanded; blind users can't know what the button does
<button onClick={() => setExpanded((p) => !p)} className="w-full text-left ...">
```

### Links (`<Link>`)

Next.js `<Link>` renders an `<a>` tag. Apply the same rules as native anchors.

```tsx
// ✅ Correct — visible text is the accessible name
<Link href={`/${locale}/checkin/history`} className="...">
  {t("checkin.historyLink")}
</Link>

// ✅ Correct — icon-only link needs aria-label
<Link href={`/${locale}/dashboard`} aria-label={t("nav.dashboard")} className="...">
  <IconHome aria-hidden="true" active={active} />
</Link>

// ❌ Wrong — mobile tab bar link has both icon and text, but icon SVGs lack aria-hidden
<Link href={href} className="...">
  <MobileIcon />               {/* SVG should have aria-hidden="true" */}
  <span>{label}</span>
</Link>
```

---

## 3. Form Labels

The codebase uses raw `<label>` + `<input>`/`<textarea>` without `htmlFor`/`id` pairing. Every label must be programmatically associated.

```tsx
// ✅ Correct — htmlFor links label to input
<div className="space-y-1.5">
  <label htmlFor="situation" className="text-sm font-medium text-[#2D3B35]">
    {t("thoughtRecords.situationLabel")}
  </label>
  <textarea
    id="situation"
    rows={3}
    value={situation}
    onChange={(e) => setSituation(e.target.value)}
    placeholder={t("thoughtRecords.situationPlaceholder")}
    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm
               placeholder:text-slate-300 focus:outline-none focus:ring-2
               focus:ring-[#7C9082] focus:border-transparent resize-none"
  />
</div>

// ❌ Wrong — <label> has no htmlFor; visually associated but not programmatically
<div className="space-y-1.5">
  <label className="text-sm font-medium text-[#2D3B35]">
    {t("thoughtRecords.situationLabel")}
  </label>
  <textarea rows={3} value={situation} onChange={...} className="..." />
</div>
```

### Intensity slider (IntensitySlider component)

```tsx
// ✅ Correct — slider has an accessible label via aria-labelledby or aria-label
function IntensitySlider({ id, value, onChange, lowLabel, highLabel, labelText }: ...) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#2D3B35]">
        {labelText}
      </label>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        value={value}
        aria-valuetext={`${value} out of 10`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#7C9082]"
      />
      ...
    </div>
  );
}

// ❌ Wrong — range input has no label; aria-valuetext absent
<input type="range" min={1} max={10} value={value} onChange={...} className="..." />
```

### Required fields

```tsx
// ✅ Correct
<label htmlFor="emotion" className="...">
  {t("thoughtRecords.emotionLabel")}
  <span aria-hidden="true" className="text-red-400 ml-0.5">*</span>
</label>
<input
  id="emotion"
  type="text"
  required
  aria-required="true"
  ...
/>
```

---

## 4. Semantic HTML

| Use | Element | Instead of |
|---|---|---|
| Page sections with headings | `<section aria-labelledby="...">` | `<div>` |
| Navigation groups | `<nav aria-label="...">` | `<div>` |
| Independent content (journal entry, thought record) | `<article>` | `<div>` |
| Tabular data (portal patient list, habit logs) | `<table>` with `<th scope="col/row">` | `<div>` rows |
| Step wizard progress | `<ol>` | `<div>` |
| Form field group | `<fieldset>` + `<legend>` | `<div>` + `<label>` |

```tsx
// ✅ Correct — step indicator in thought-records
<ol aria-label={t("thoughtRecords.stepsLabel")} className="flex items-center gap-2">
  {STEPS.map((label, i) => {
    const n = (i + 1) as Step;
    const isCurrent = step === n;
    const isDone = step > n;
    return (
      <li key={n} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2">
        ...
      </li>
    );
  })}
</ol>

// ❌ Wrong — step indicator is a <div> with no semantic meaning
<div className="flex items-center gap-2">
  {STEPS.map((label, i) => ( <div key={i} className="...">... </div> ))}
</div>
```

```tsx
// ✅ Correct — thought record history items as articles
{records.map((r) => (
  <article key={r.id} aria-label={`${r.situation} — ${dateStr}`}>
    <RecordItem record={r} onDelete={handleDelete} t={t} />
  </article>
))}
```

---

## 5. ARIA Live Regions

### Error messages

All `state === "error"` paragraphs and inline `{error && <p>}` patterns are currently silent to screen readers. Every error must have `role="alert"`.

```tsx
// ✅ Correct — role="alert" announces immediately on mount
{state === "error" && (
  <p role="alert" className="text-sm text-red-400 text-center">
    {t("checkin.errorMessage")}
  </p>
)}

// ❌ Wrong — plain <p> is not announced by screen readers
{state === "error" && (
  <p className="text-sm text-red-400 text-center">
    Something went wrong. Please try again.
  </p>
)}
```

### AI streaming response

The streaming area in checkin and journal populates character-by-character. It must use `aria-live="polite"` so screen readers announce the completed response without interrupting the user.

```tsx
// ✅ Correct — polite announces after streaming completes
<div
  aria-live="polite"
  aria-atomic="false"         // announce incremental chunks, not the whole block
  aria-busy={state === "streaming"}
  className="px-5 py-4 rounded-xl bg-white border border-[#c8d5c9] ..."
>
  {state === "streaming" ? response : msg.content}
  {state === "streaming" && (
    <span aria-hidden="true" className="inline-block w-1 h-4 ml-1 bg-[#7C9082] animate-pulse rounded-sm" />
  )}
</div>

// ❌ Wrong — plain div; screen readers never announce the streamed response
<div className="px-5 py-4 rounded-xl bg-white border ...">
  {response}
  <span className="inline-block w-1 h-4 ml-1 bg-[#7C9082] animate-pulse rounded-sm" />
</div>
```

### Success / saved state

```tsx
// ✅ Correct — polite: does not interrupt in-progress speech
{state === "finished" && (
  <p role="status" aria-live="polite" className="text-xs text-center text-slate-400">
    {t("checkin.savedMessage")}
  </p>
)}
```

### Loading states

```tsx
// ✅ Correct
<div
  role="status"
  aria-live="polite"
  aria-label={t("common.loading")}
  className="h-28 rounded-2xl bg-slate-100 animate-pulse"
/>
```

---

## 6. Decorative Icons

All SVGs in this project are inline decorative icons paired with visible text labels (sidebar nav links, buttons). They must be hidden from the accessibility tree.

```tsx
// ✅ Correct — icon is decorative; text label is the accessible name
function IconHome({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"          // IE/Edge: prevent SVG from receiving focus
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12l2-2m0 0l7-7 7 7..." />
    </svg>
  );
}

// ❌ Wrong — SVG without aria-hidden; screen reader reads the path data or announces "image"
function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ...>
      <path d="M3 12l2-2m0 0l7-7 7 7..." />
    </svg>
  );
}
```

**Rule:** `aria-hidden="true"` and `focusable="false"` go on every `<svg>` that has a sibling text label. The **only** exception is an icon that is the sole accessible name of its parent — in that case, put a `<title>` inside the `<svg>` instead.

```tsx
// ✅ Correct — standalone icon with <title>
<svg role="img" aria-labelledby="icon-save" ...>
  <title id="icon-save">{t("common.save")}</title>
  <path .../>
</svg>
```

---

## 7. Focus Management

### Expandable cards (RecordItem, checkin history)

```tsx
// ✅ Correct — focus stays on the toggle button; aria-expanded communicates state
<button
  ref={toggleRef}
  onClick={() => setExpanded((p) => !p)}
  aria-expanded={expanded}
  aria-controls={`detail-${record.id}`}
  className="w-full text-left ..."
>
```

### Multi-step wizard (thought-records)

When the step changes, focus must move to the new step's heading so screen readers announce the transition.

```tsx
// ✅ Correct
const stepHeadingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  stepHeadingRef.current?.focus();
}, [step]);

// Step heading
<h2
  ref={stepHeadingRef}
  tabIndex={-1}                  // programmatically focusable; not in tab order
  className="text-lg font-medium text-[#2D3B35] focus:outline-none"
>
  {STEPS[step - 1]}
</h2>
```

### Confirmation dialogs (delete confirm in thought-records)

```tsx
// ✅ Correct — focus moves to the confirm button when dialog opens
const confirmRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  if (confirming) confirmRef.current?.focus();
}, [confirming]);

{confirming ? (
  <div role="group" aria-label={t("thoughtRecords.deleteConfirm.label")}>
    <button ref={confirmRef} onClick={() => onDelete(record.id)} className="...">
      {t("thoughtRecords.deleteConfirm.yes")}
    </button>
    ...
  </div>
) : (
  <button onClick={() => setConfirming(true)} className="...">
    ✕ {t("thoughtRecords.delete")}
  </button>
)}
```

### Focus ring — never remove without replacement

The codebase uses `focus:outline-none` on every input and button. This removes the default focus indicator. **Always pair it with a visible replacement.**

```tsx
// ✅ Correct — custom ring replaces the removed outline
className="... focus:outline-none focus:ring-2 focus:ring-[#7C9082] focus:ring-offset-1"

// ❌ Wrong — no focus indicator at all; keyboard users are blind to focus position
className="... focus:outline-none"
```

---

## 8. Color Contrast

Design token file: `app/globals.css` (`@theme inline` block).

### Contrast audit of current palette

| Token / class | Hex | Background | Ratio | AA Normal | AA Large / UI |
|---|---|---|---|---|---|
| `text-[#2D3B35]` (body) | `#2D3B35` | `#FDFCF8` | **12.5:1** | ✅ Pass | ✅ Pass |
| `text-[#7C9082]` (sage, links) | `#7C9082` | `#ffffff` | **3.4:1** | ❌ **Fail** | ✅ Pass ≥18px |
| `text-[#7C9082]` on cream | `#7C9082` | `#FDFCF8` | **3.5:1** | ❌ **Fail** | ✅ Pass ≥18px |
| `text-slate-400` | `#94a3b8` | `#ffffff` | **2.5:1** | ❌ **Fail** | ❌ Fail |
| `text-slate-300` | `#cbd5e1` | `#ffffff` | **1.6:1** | ❌ **Fail** | ❌ Fail |
| `text-red-400` (errors) | `#f87171` | `#ffffff` | **2.2:1** | ❌ **Fail** | ❌ Fail |
| `text-white` on `bg-[#7C9082]` | `#ffffff` | `#7C9082` | **3.4:1** | ❌ **Fail** small | ✅ Pass ≥18px |

### Required fixes

```tsx
// ✅ Correct — use darker sage for small text and interactive labels
// Replace text-[#7C9082] with text-[#5A6B60] for body-size text links
// #5A6B60 on white = 5.2:1 — passes AA normal text

// ✅ Correct — error messages: use text-red-600 (#dc2626) instead of text-red-400
// #dc2626 on white = 5.9:1 — passes AA
<p role="alert" className="text-sm text-red-600 text-center">

// ✅ Correct — placeholder text must also meet 4.5:1 (treat as normal text)
// Replace placeholder:text-slate-300 with placeholder:text-slate-400
className="... placeholder:text-slate-400"
```

### Dark mode

`globals.css` defines a dark mode via `prefers-color-scheme`:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

The inline Tailwind hex colors (`bg-[#7C9082]`, `text-[#2D3B35]`, etc.) are **not** dark-mode aware. Until dark mode is fully designed, add `@media (prefers-color-scheme: dark)` overrides in `globals.css` for any page that uses those hardcoded values, or switch to CSS custom properties.

---

## 9. Reduced Motion

Tailwind v4 provides `motion-safe:` and `motion-reduce:` variants natively. Use them for every animation in this project.

### Current animations that need guarding

```tsx
// ✅ Correct — animate-pulse (AI cursor, loading skeletons)
<span
  aria-hidden="true"
  className="inline-block w-1 h-4 ml-1 bg-[#7C9082] rounded-sm
             motion-safe:animate-pulse"
/>

// ✅ Correct — loading skeleton
<div className="h-28 rounded-2xl bg-slate-100 motion-safe:animate-pulse" />

// ✅ Correct — transition on interactive elements (fine for reduced-motion at low duration)
<button className="... motion-safe:transition motion-safe:hover:scale-[1.01]">

// ✅ Correct — progress bar width animation
<div
  className="h-full rounded-full bg-[#7C9082] motion-safe:transition-all motion-safe:duration-700"
  style={{ width: `${pct}%` }}
/>
```

### SVG stroke-dashoffset (habits progress ring)

```css
/* In globals.css — add reduced-motion guard */
.progress-ring-circle {
  transition: stroke-dashoffset 0.6s ease;
}

@media (prefers-reduced-motion: reduce) {
  .progress-ring-circle {
    transition: none;
  }
}
```

Or inline in JSX:

```tsx
<circle
  className="progress-ring-circle"
  style={{
    strokeDashoffset: offset,
    transition: prefersReducedMotion ? "none" : "stroke-dashoffset 0.6s ease",
  }}
/>
```

### Hook for reduced motion preference

```ts
// lib/useReducedMotion.ts
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
```

---

## 10. Quick Checklist

Use this table during code review for every PR that touches UI.

| # | Check | How to verify |
|---|---|---|
| 1 | Every `<svg>` icon has `aria-hidden="true" focusable="false"` | Search for `<svg` without `aria-hidden` |
| 2 | Every `<label>` has `htmlFor` matching its input's `id` | Inspect in browser DevTools > Accessibility panel |
| 3 | Every error `<p>` has `role="alert"` | Grep for `text-red` without `role="alert"` nearby |
| 4 | AI streaming `<div>` has `aria-live="polite"` and `aria-busy` | Check checkin and journal page streaming containers |
| 5 | `focus:outline-none` always paired with `focus:ring-*` | Search `focus:outline-none` without `focus:ring` |
| 6 | Toggle/expand buttons have `aria-expanded` + `aria-controls` | Check RecordItem, history cards, any collapsible |
| 7 | Emotion picker buttons have `aria-pressed` | Check checkin/page.tsx emotion grid |
| 8 | Both `<nav>` elements in Sidebar have distinct `aria-label` | Check Sidebar.tsx desktop nav + mobile tab nav |
| 9 | `animate-pulse` and transitions use `motion-safe:` prefix | Search `animate-pulse` without `motion-safe:` |
| 10 | New `aria-label` values use `t("namespace.key")`, not hardcoded English strings | Grep `aria-label="` (with opening quote) for literal strings |
