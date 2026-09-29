---
name: 'pocketdiscipline-ui'
description: 'Build or change any PocketDiscipline UI (components, pages, templates, SCSS, dialogs, charts, navigation) so it follows the project design system: Material 3 theme tokens, shared core components, spacing/radius/breakpoint tokens, reward colour rules and the 1a Cards layout. Use for every task that touches .html or .scss under src/app, or that adds a screen or feature with UI.'
---

# PocketDiscipline UI

## Goal

Every screen should look like it came from one designer. That happens when you reuse the shared components and tokens. Do not restyle Material per feature and do not invent one-off styles.

## Read first (every time)

1. `docs/design_system.md`: colour roles, type roles, tokens, the component catalogue and the rules. It is the source of truth; this skill only tells you how to apply it.
2. `docs/code_style.md` rule 6 (SCSS) and rule 7 (template bindings).
3. `src/app/features/design-system/design-system-page.html`: a live example of every core component in use.

If this skill and `docs/design_system.md` disagree, the doc wins. Fix the skill in the same change.

## Hard rules

- **No raw colours in `src/app/**`.** No hex, `rgb()` or named colours. Use `var(--mat-sys-*)` or `var(--pd-sys-*)` only, and never with a fallback value.
- **No raw scale values.** Spacing uses `t.space(n)`, corners use `t.radius(size)`, and breakpoints use `@include t.up(expanded)` / `t.down(...)`. Never write `@media` by hand.
- Every component stylesheet that needs tokens starts with `@use '<relative>/styles/tokens' as t;`.
- **Money is always `<app-amount>`.** Never write `{{ value }} ₴`.
- **Amber (tertiary / `--pd-sys-reward`) means "earned".** Use it only for rewards, balance gains and streaks. Never use it for buttons, errors, or anything that costs money.
- **Numbers use mono.** Timers, counts and totals use `.pd-num`, `t.numeric` or `<app-amount>`.
- **Icons** are `<mat-icon>` with Material Symbols Rounded ligature names. Add `.pd-icon-filled` for active or selected states. No emoji, no inline SVG icons.
- **No `color="primary|warn|accent"`.** Material 3 ignores it. Primary is already the default. For destructive actions, use a local `mat.button-overrides` with `--mat-sys-error` (see `confirm-dialog.scss`).
- **No `::ng-deep`, no inline `style=""`.** To restyle one Material instance, `@include mat.<component>-overrides((...))` inside the host selector.
- **Touch targets are at least 44px.** Material buttons already meet this through the theme. Check anything custom.
- **No new colours, fonts or radii.** If a design needs one, stop and ask the user. If it's approved, add it to `src/styles.scss`, `_tokens.scss` or (for a font) `_fonts.scss`, and to `docs/design_system.md`, in the same change.

## Which component? (check in this order)

1. **A core component** in `src/app/shared/components`:
   | Need                       | Use                                           |
   | -------------------------- | --------------------------------------------- |
   | Page title and top actions | `app-page-header` (one per routed page)       |
   | Titled card block          | `app-section-card`                            |
   | KPI tile                   | `app-stat-card` with `app-amount` inside      |
   | Money                      | `app-amount`                                  |
   | Status or reward pill      | `app-badge`                                   |
   | Streak                     | `app-streak-badge`                            |
   | 2–4 option filter          | `app-segmented-control`                       |
   | Ring progress              | `app-progress-ring`                           |
   | Empty list                 | `app-empty-state`                             |
   | Earning moment             | `CelebrationService.show()`                   |
   | Destructive confirm        | `ConfirmService.ask({ isDestructive: true })` |
   | Transient feedback         | `SnackBarService`                             |
2. **A plain Angular Material component** styled by the global theme: `mat-flat-button`, `matButton="tonal"`, `mat-stroked-button`, `mat-card appearance="outlined"`, `mat-form-field appearance="outline"`, `mat-slide-toggle`, `mat-progress-bar`, `mat-menu`, `MatDialog`.
3. **A global utility class:** `.pd-difficulty` for two-line reward buttons, `.pd-num`, `.pd-icon-filled`.
4. **Only if none of these fit:** build a new component. If it could appear on two or more screens, put it in `shared/components`, add it to the gallery page and to the catalogue in `docs/design_system.md`. Otherwise keep it inside the feature slice.

## Layout patterns

- **Page:** `app-page-header`, then a CSS grid of cards with `gap: t.space(4)`. The layout shell already handles page padding, the max width, the bottom nav and the side rail. Never add your own nav or toolbar.
- **Responsive:** design mobile first (390px wide). From `t.up(expanded)` (840px), move to multi-column with `grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr))` or explicit tracks. Nothing may overflow at 360px.
- **Cards:** 20px corners and outlined style come from the theme. Pad them with `t.card-padding` or `app-section-card`. Don't put a card inside a card.
- **Hierarchy on a card:** title (`title-medium`, weight 600), then meta (`label-large`, `on-surface-variant`), then actions last and full width on mobile.
- **Hero:** only the balance card uses the primary-filled treatment. Don't add a second hero on the same screen.
- **Lists of completed items:** compact rows with a success icon tile (`--pd-sys-success-container`), placed after the pending items.
- **Charts:** bars use `--mat-sys-primary` (tasks and focus) and `--pd-sys-reward` (goals). Axes and labels use `.pd-num` in `on-surface-variant`. No gridline colours outside the tokens.
- **Mascot** (`icons/icon-192x192.png`): only in `app-empty-state` and the celebration dialog.

## Copy

Sentence case ("Quick spend", not "Quick Spend"). Keep it short and specific ("Morning run done · +200 ₴"). No exclamation marks, except inside the celebration dialog.

## Dark mode

Everything must work in both schemes without extra code. If you think you need a `prefers-color-scheme` query, you are using a raw colour. Check both by setting `document.documentElement.dataset.theme = 'dark'` in dev tools.

## Before you finish

- [ ] `npm run lint` passes. It includes `scripts/check-ui.mjs`; the Enforcement section of `docs/design_system.md` lists what it checks. To check only the files you touched, run `node scripts/check-ui.mjs <file...>`.
- [ ] Never "fix" the UI check by editing `scripts/ui-baseline.json` by hand. The baseline may only shrink. Run `node scripts/check-ui.mjs --update-baseline` only after _removing_ violations.
- [ ] The screen was checked at 390px and at 1280px, in light and dark.
- [ ] Any new shared component is in the gallery page and in `docs/design_system.md`.
