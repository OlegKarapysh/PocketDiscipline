# PocketDiscipline design system

Visual reference: `PocketDiscipline Design System.dc.html` and direction **1a · Cards** in `PocketDiscipline Screens.dc.html`.

Everything is built on Angular Material 22 (M3). The theme lives in `src/styles.scss`; the shared scale lives in `src/styles/_tokens.scss`. This extends [code_style.md rule 6](./code_style.md#6-scss): component styles never contain hex, never use `var()` fallbacks, and `@use` the token layer for spacing, radius and breakpoints.

## Principles

- **Calm by default.** One accent (periwinkle) for structure and action. Amber appears only where ₴ is earned or a streak grows.
- **Numbers never jitter.** Balances, rewards, timers and chart axes use Geist Mono with tabular figures (`.pd-num` / `t.numeric`).
- **Soft, not bubbly.** 12px controls, 20px cards, 24px dialogs and hero cards. Pills only for badges and nav indicators.
- **44px minimum touch target** for anything tappable.
- **The mascot is a reward, not decoration.** Use the dumbbell icon in empty states and completion dialogs only.

## Colour roles

| Role         | Token                                                   | Use                                                                                                |
| ------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Background   | `--mat-sys-surface`                                     | Page background                                                                                    |
| Card         | `--mat-sys-surface-container-lowest`                    | Cards, sidenav, bottom nav, dialogs, menus                                                         |
| Subtle fill  | `--mat-sys-surface-container`                           | Segmented track, progress track, neutral badges                                                    |
| Line         | `--mat-sys-outline-variant`                             | Card borders, dividers                                                                             |
| Ink / muted  | `--mat-sys-on-surface` / `--mat-sys-on-surface-variant` | Text                                                                                               |
| Primary      | `--mat-sys-primary` / `on-primary`                      | Main actions, active state, progress, hero card                                                    |
| Primary soft | `--mat-sys-primary-container` / `on-primary-container`  | Tonal buttons, nav indicator, focus halo                                                           |
| Reward text  | `--mat-sys-tertiary`                                    | "+200 ₴", streak labels                                                                            |
| Reward soft  | `--mat-sys-tertiary-container`                          | Reward badges, "up for grabs" panels                                                               |
| Reward fill  | `--pd-sys-reward`                                       | Flame icon, goal segment in charts (not for text)                                                  |
| Success      | `--pd-sys-success` / `--pd-sys-success-container`       | Done today, completed goals                                                                        |
| On category  | `--pd-sys-on-category`                                  | Icons and marks on a user-chosen category colour (fixed white; category colours are mid-tone data) |
| Danger       | `--mat-sys-error`                                       | Destructive actions and validation                                                                 |

`--pd-sys-*` tokens are app extensions for roles M3 has no slot for. Treat them exactly like `--mat-sys-*`.

## Dark mode

The theme uses `color-scheme: light dark`, so it follows the OS. To force a mode, set `document.documentElement.dataset['theme'] = 'light' | 'dark'`; remove the attribute to follow the system again.

## Type

Hanken Grotesk via `mat.theme` typography; use the M3 roles (`var(--mat-sys-title-medium)` etc.). Weights: 400 regular, 600 medium, 700 bold.

| Design role     | Material role                | Notes                                             |
| --------------- | ---------------------------- | ------------------------------------------------- |
| Page title (28) | `headline-small`             | weight 700, letter-spacing -0.02em                |
| Card title (17) | `title-medium`               | `@include t.card-title` (17px, weight 600)        |
| Body            | `body-large` / `body-medium` |                                                   |
| Label           | `label-large`                |                                                   |
| Numbers         | `.pd-num`                    | Geist Mono, tabular; size with `t.numeric-size()` |

Components never set a font size in px or rem. Text takes a role: the whole role with `font: var(--mat-sys-body-small)`, or only its size with `font-size: var(--mat-sys-body-small-size)` where the element is `.pd-num`, because the `font` shorthand resets the mono family. Big numbers take `t.numeric-size()` and icons `t.icon-size()`. `em` stays allowed for sizes relative to the parent, such as the ₴ unit in `app-amount`.

### Font files

All three families (Hanken Grotesk, Geist Mono, Material Symbols Rounded) are self-hosted so the app renders offline. The woff2 files and their licences live in `src/styles/fonts/`, the `@font-face` rules in `src/styles/_fonts.scss`, and `ngsw-config.json` precaches them in the `app` group. Never link a font CDN from `index.html`.

To refresh or add a font, request its css2 URL from Google Fonts with a current Chrome user agent (other agents get other formats), download every woff2 it lists except the `vietnamese` subsets (the app has no Vietnamese text), and copy each `@font-face` block into `_fonts.scss` with its `unicode-range` unchanged and `url()` pointing at the local file. Keep the icon font whole: category icons are read from IndexedDB, so a subset could turn a stored icon name into literal text.

## Tokens (`_tokens.scss`)

- `t.space(1…12)`: 4, 8, 12, 16, 20, 24, 32, 48px
- `t.radius(xs|sm|md|lg|xl|pill)`: 6, 10, 12, 20, 24, 999px
- `t.numeric-size(sm|md|lg|xl|xxl|display)`: 13, 22, 30, 38, 44, 80px, for tabular numbers (`app-amount` sizes, the timer, chart values)
- `@include t.icon-size(xs|sm|md|lg)`: 16, 18, 20, 24px; sets a `mat-icon`'s font-size, width and height together
- `@include t.card-title`: the card title role
- Breakpoints: `medium` 600, `expanded` 840, `large` 1200. Use `@include t.up(expanded)` / `t.down(expanded)`.
- Elevation: `var(--pd-sys-elevation-1)` (raised), `var(--pd-sys-elevation-2)` (FAB, toasts, speed-dial actions).

## Navigation

- **Below 840px:** `app-bottom-nav` shows Today, Tasks, Goals, Rewards and More (a menu with Pomodoro, Daily Scores and Settings). `app-speed-dial` sits above it with Start focus and New task.
- **840px and up:** a persistent `mat-sidenav` rail with every section.

## Component mapping

| Design             | Build with                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Primary button     | `mat-flat-button`                                                                                                    |
| Tonal button       | `matButton="tonal"`                                                                                                  |
| Outline / text     | `mat-stroked-button` / `mat-button`                                                                                  |
| Card               | `mat-card appearance="outlined"` (default elevated is also restyled flat-white)                                      |
| Hero balance card  | `mat-card` + local `mat.card-overrides` (see `balance-widget.scss`)                                                  |
| Difficulty buttons | `mat-stroked-button.pd-difficulty` with an `app-amount size="sm" tone="reward" [showSign]="true"` as the second line |
| Period filter      | `app-segmented-control` (checkmark hidden globally in `app.config.ts`)                                               |
| Badges             | `app-badge`                                                                                                          |
| Progress bar       | `mat-progress-bar`                                                                                                   |
| Progress ring      | `app-progress-ring` (wraps `mat-progress-spinner` and adds a track)                                                  |
| Fields             | `mat-form-field appearance="outline"`                                                                                |
| Dialog / confirm   | `MatDialog`                                                                                                          |
| Toast              | `MatSnackBar` via `SnackBarService`                                                                                  |
| Switch             | `mat-slide-toggle`                                                                                                   |
| Icons              | `mat-icon` with Material Symbols Rounded (registered in `app.config.ts`); add `.pd-icon-filled` for active/filled    |
| Charts             | existing SVG components; bars `--mat-sys-primary` + `--pd-sys-reward`, axes `.pd-num` in `on-surface-variant`        |

An SVG chart draws at its container's measured width, one user unit per pixel, via `(appObserveWidth)` (`shared/directives/observe-width.ts`). A fixed `viewBox` shrinks axis text to about 5px on a phone.

## Local overrides

To restyle one instance, include the component's overrides mixin inside the component selector:

```scss
@use '@angular/material' as mat;

.hero {
  @include mat.card-overrides(
    (
      elevated-container-color: var(--mat-sys-primary),
    )
  );
}
```

If Sass reports an unknown token name, check the component's Styling tab on material.angular.dev for your installed version.

## Core components (`src/app/shared/components`)

Use these before reaching for raw Material in a feature. A live gallery is at `/design-system`, registered in dev builds only (`app.routes.ts`).

| Component             | Selector                            | Inputs / outputs                                                        | Use                                               |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| PageHeader            | `app-page-header`                   | `title`, `eyebrow?`; project `[pageActions]`                            | Top of every page. Replaces the old toolbar title |
| SectionCard           | `app-section-card`                  | `heading?`, `actionLabel?`, `(action)`; project `[sectionTools]` + body | Any titled card block (Earnings, Up next…)        |
| StatCard              | `app-stat-card`                     | `label`, `hint?`, `hintTone`; project the value                         | Small KPI tiles                                   |
| Amount                | `app-amount`                        | `value`, `size` sm/md/lg/xl, `tone`, `showSign`, `unit` = ₴             | Every money value. Formats with uk-UA grouping    |
| Badge                 | `app-badge`                         | `tone` neutral/primary/reward/success/danger, `icon?`                   | Status and reward pills                           |
| StreakBadge           | `app-streak-badge`                  | `days`, `compact`                                                       | Streaks; shows "Start a streak today" at 0        |
| SegmentedControl      | `app-segmented-control`             | `options`, `[(value)]`, `ariaLabel`, `fullWidth`                        | Period and view filters (2–4 options)             |
| ProgressRing          | `app-progress-ring`                 | `value` 0–100, `diameter`, `strokeWidth`; project the label             | Daily habit completion, focus progress            |
| EmptyState            | `app-empty-state`                   | `heading`, `message?`, `actionLabel?`, `actionIcon`, `(action)`         | Empty lists, with the mascot                      |
| CelebrationDialog     | via `CelebrationService.show(data)` | `title`, `subtitle?`, `amount?`, `canUndo?` → `'dismissed' \| 'undo'`   | Goal completed, streak milestones                 |
| ConfirmDialog         | via `ConfirmService.ask(data)`      | unchanged API; `isDestructive` now paints the error colour              | Destructive confirmation                          |
| BottomNav / SpeedDial | used by `Layout`                    | see Navigation                                                          | App shell only                                    |

Rules:

- Money is always `app-amount`. Never interpolate `{{ x }} ₴` by hand. Where a component cannot render (SVG `<text>`, attribute bindings, aria labels) use the `money` pipe (`MoneyPipe`, `shared/pipes/money.pipe.ts`); in TypeScript strings such as snackbar messages use `MONEY_FORMAT` from `shared/constants/money-format.const.ts`.
- Use `CelebrationService` for earning moments, and `SnackBarService` for everything else ("Morning run done · +200 ₴").
- One `app-page-header` per routed page.

## Enforcement

`scripts/check-ui.mjs` runs first in `npm run lint`. It records legacy violations per file and rule in `scripts/ui-baseline.json`, and fails any file that gains one. The baseline may only shrink.

| Rule                                    | Fails on                                                                       | Use instead                                               |
| --------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `raw-hex`, `raw-rgb`, `raw-named-color` | Literal colours in styles or templates                                         | `var(--mat-sys-*)`, `var(--pd-sys-*)`                     |
| `var-fallback`                          | `var(--token, fallback)`                                                       | The token alone                                           |
| `raw-media`                             | `@media`                                                                       | `t.up()`, `t.down()`                                      |
| `raw-radius`                            | `border-radius` in px                                                          | `t.radius()`                                              |
| `raw-spacing`                           | px, rem or em in `padding`, `margin`, `gap`                                    | `t.space()`                                               |
| `raw-shadow`                            | A `box-shadow` other than an elevation token or `none`                         | `var(--pd-sys-elevation-1)`, `var(--pd-sys-elevation-2)`  |
| `raw-font-family`                       | `font-family` in a component                                                   | Type roles, `t.numeric`                                   |
| `raw-font-size`                         | A px or rem size in `font-size` or `font`                                      | Type roles, `t.numeric-size()`, `t.icon-size()`           |
| `local-token`                           | A `$variable` or `--custom-property` defined in a component                    | Ask, then add it to `styles.scss` or `_tokens.scss`       |
| `ng-deep`                               | `::ng-deep`                                                                    | `mat.<component>-overrides`                               |
| `hand-formatted-money`                  | `{{ x }} ₴`, `₴ {{ x }}`, `\| currency`                                        | `app-amount`                                              |
| `m2-color-attr`, `m2-button`            | `color="primary"` and friends, `mat-raised-button`                             | Theme defaults, `mat-flat-button`, `matButton="tonal"`    |
| `inline-style`                          | `style="..."`                                                                  | The component `.scss`                                     |
| `emoji`                                 | Emoji in a template                                                            | `mat-icon`                                                |
| `feature-toolbar`                       | `mat-toolbar`                                                                  | `app-page-header`                                         |
| `raw-toggle-group`                      | `mat-button-toggle-group` outside `app-segmented-control`                      | `app-segmented-control`                                   |
| `mascot`                                | The mascot image outside `app-empty-state` and the celebration dialog          | Nothing: it is a reward                                   |
| `inline-template`                       | `template:` or `styles:` in a component, which the check cannot see            | `templateUrl`, `styleUrl`                                 |
| `raw-snackbar`, `raw-dialog`            | `inject(MatSnackBar)`; opening `ConfirmDialog` or `CelebrationDialog` directly | `SnackBarService`, `ConfirmService`, `CelebrationService` |
| `page-header`                           | A routed page without exactly one `app-page-header`                            | One `app-page-header`                                     |

- **Locally:** `node scripts/check-ui.mjs [file...]` checks everything, or reports only the given files. After _removing_ violations, `--update-baseline` locks the improvement in; it refuses while anything has regressed. Never edit the baseline by hand.
- **Adding a rule:** add it to `check-ui.mjs` and to this table, confirm that only the new rule regresses, then run `--update-baseline --accept-new-rule=<id>` to record its legacy hits.
- **CI:** `--baseline-against=<base commit>` fails a pull request whose baseline grew for any rule that already existed on the base branch.
- **Claude Code:** `.claude/settings.json` runs the check after every edit under `src/app` and again before Claude ends a turn, denies edits to the baseline, and asks before `check-ui.mjs` changes. `.claude/rules/design-system.md` points Claude at the UI skill when it reads a UI file.
- **Not checked:** layout at 390px and 1280px, dark mode, copy, touch targets, and colour roles such as amber meaning "earned". Those stay with the skill's checklist and review.
