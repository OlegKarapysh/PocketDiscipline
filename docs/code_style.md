# Code Style Guidelines

This file is the **single source of truth** for code conventions in this project. `GEMINI.md` and
`CLAUDE.md` link here and must not restate or paraphrase these rules — if a rule changes, it changes
here only.

Every Angular claim below was verified on 2026-09-20 against the installed packages
(`@angular/core`, `@angular/forms`, `@angular/material` all at 22.1.3) and the `angular-cli` MCP
server's `get_best_practices`. **Do not change a version-dependent rule from memory** — re-verify
against `node_modules/@angular/` or the MCP server first.

Each rule below carries a real anti-example from this repository. Those anti-examples are the
backlog: the convention is settled, the sweeps that make the code match it mostly are not.
**Rules 1 (naming), 2 (component state), 3 (teardown) and 8 (layering) have been swept**; rule 8
is additionally enforced as an error. A swept rule carries a "Status: swept" block recording what
was wrong instead of a live anti-example. Rules 4 (forms), 5 (constants), 6 (SCSS) and 7 (template
bindings) are still open.

---

## Baseline rules

- **Avoid Obscure Magic Values**: Extract strings and numbers into constants or enums ONLY when they
  are shared across multiple files, or when their meaning is not immediately obvious (e.g.
  `86_400_000` -> `ONE_DAY_MS`). Do NOT extract literal values if they are used locally only once and
  are self-documenting in context, or if they are arbitrary mock values in unit tests. See
  [5. Constants](#5-constants) for how far this has drifted.
- **SOLID Principles**: Code must satisfy the Single Responsibility Principle (SRP) and Dependency
  Inversion Principle (DIP).
- **Angular Components**: All Angular components must have HTML templates and CSS styles in separate
  files. Do not use inline templates or styles. *(This deliberately overrides Angular's own "prefer
  inline templates for small components" guidance. The project rule wins — do not "fix" it.)*
- **Angular Services**: Always create Angular services using the Angular CLI (accessed via the
  `angular-cli` MCP server).
- **One Class/Enum/Interface per File**: All TypeScript files should contain no more than one
  `class` or `enum` or `interface`. Enforced by `max-classes-per-file`.
- **Simplicity**: Code must be simple, readable, and understandable.
- **Self-Describing Code**: Avoid writing comments. Code must be self-describing. Use comments only
  for explaining non-obvious things (e.g., complex business logic or workarounds).

### Angular v22 defaults — do not write these out

These are defaults in the installed version. Writing them explicitly is noise, and a reviewer or
agent that "restores" them is working from a pre-v22 memory:

| Do not write | Why |
| --- | --- |
| `changeDetection: ChangeDetectionStrategy.OnPush` | `OnPush` is the default in v22. `@angular-eslint/prefer-on-push-component-change-detection` is obsolete here and is deliberately **not** enabled. |
| `standalone: true` | Default since v20. |
| `provideZonelessChangeDetection()` | Zoneless is the default; `zone.js` is not installed. |
| `@Injectable({ providedIn: 'root' })` | Use `@Service()` for singleton services (v22+). All 20 services do; there are no holdouts left. |

Also standing Angular rules: `inject()` over constructor injection, `input()` / `output()` /
`model()` over decorators, native control flow (`@if` / `@for` / `@switch`), the `host` object over
`@HostBinding` / `@HostListener`, and `class` / `style` bindings over `ngClass` / `ngStyle`.

---

## 1. Naming

**Rule.** Follow the Angular v20+ file and class naming style.

- Components: file `goal-list.ts`, class `GoalList`. **No `Component` suffix, no `.component.ts`
  extension.** Sibling files are `goal-list.html` and `goal-list.scss`.
- Services keep both: file `goal.service.ts`, class `GoalService`.
- Models keep both: file `goal.model.ts`. Also `.enum.ts`, `.type.ts`, `.dto.ts`, `.const.ts` and
  `.routes.ts`, as already used.
- Never invent a suffix that names mechanics. Find the precedent in the repo first.

**Status: swept.** The tree is uniform; what follows is the record of what was wrong, so the shape
is recognisable if it recurs.

**What it looked like.** Ten component file-quadruples still used the old extension, and 25 of the
38 component classes still carried the suffix:

```
src/app/features/daily-tasks/components/daily-task-form/daily-task-form.component.ts
  -> export class DailyTaskFormComponent
```

The repo was split. `features/goals/`, `features/pomodoro/`, `features/settings/` and
`features/tasks/pages/` already followed the convention; `features/daily-scores/`,
`features/daily-tasks/`, `features/dashboard/`, `features/rewards/` and `shared/` did not. Some
directories were mixed: `features/dashboard/components/balance-widget/balance-widget.ts` had the new
filename but still declared `BalanceWidgetComponent`.

**How it was fixed.** 40 files renamed (`.component.ts` / `.html` / `.scss` / `.spec.ts` -> the bare
name) and all 25 classes stripped of the suffix, 264 references rewritten across 58 files.
Selectors were **not** touched — they stay `app-*`, which is what
`@angular-eslint/component-selector` enforces. Watch the `MatDialog` generics when renaming a dialog:
`dialog.open<ConfirmDialog, Data, Result>(...)` names the class in a type position at several call
sites, where a missed rename is a type error rather than a runtime one.

**Do this instead.** `src/app/features/goals/components/goal-list/goal-list.ts` is the exemplar for
the whole convention.

**Why.** The split was the actual cost. Neither name is wrong on its own, but you could not guess a
file's name from a class name or the reverse, so every import was a lookup.

**Not lint-enforced.** `@angular-eslint` has no rule for the file-name half of this, so it is a
review item. Keep it uniform.

---

## 2. Component state is signals only

**Rule.** All mutable component state is a `signal()`, `computed()`, `linkedSignal()`, `input()`,
`model()` or `toSignal()`. **No plain mutable field may be bound in a template.** Derived values are
`computed()`, never a field kept in sync by hand. Never mutate a signal's value in place — use
`set()` / `update()` with a new value.

**Status: swept.** No `[(ngModel)]` two-way binding to a plain field remains anywhere in the app.

**What it looked like.** `withdrawal-ledger.ts` held four plain fields next to three properly
declared signals, and bound all four with `[(ngModel)]`:

```ts
readonly withdrawals = signal<WithdrawalRecord[]>([]);   // correct
searchQuery = '';                                        // not signals
selectedCategoryId = '';
startDate = '';
endDate = '';
```

`daily-task-form.ts` was the worse case, because the array was mutated in place by
`addDifficulty()` (`.push`) and `removeDifficulty()` (`.splice`), and the template additionally
bound `[(ngModel)]="diff.name"` straight onto array *elements*:

```ts
title = '';
difficulties: DailyTaskDifficulty[] = DEFAULT_DIFFICULTIES.map((d) => ({ ...d }));
```

**How it was fixed.** Six fields became signals across the two components. Where a template needs to
write back, the binding is one-way plus an explicit set — `[ngModel]="title()"` with
`(ngModelChange)="title.set($event)"` — which is the pattern `reward-store.ts` and
`session-config.ts` already used. Element-level writes became index-addressed update methods
(`updateDifficultyName(i, name)`) so the array is replaced rather than mutated, and derived template
state (`canSubmit`, `canRemoveDifficulty`, `hasActiveFilters`) became `computed()`.

**Do this instead.**

```ts
readonly title = signal('');
readonly difficulties = signal<DailyTaskDifficulty[]>(DEFAULT_DIFFICULTIES.map((d) => ({ ...d })));

addDifficulty(): void {
  this.difficulties.update((list) => [...list, { id: crypto.randomUUID(), /* ... */ }]);
}
```

**Why.** This is the rule with the sharpest teeth, because the current code is only *accidentally*
correct. With `OnPush` and zoneless both defaults in v22, a component re-renders when something
marks it dirty — a signal read in the template changing, or a template event handler firing. Every
mutation of these fields today happens to originate in a template event handler (`(click)`,
`(ngModelChange)`), which marks the component dirty as a side effect, so the view updates. Move one
of those mutations into a subscription callback, a `setTimeout`, a promise continuation or a dialog
`afterClosed()` and the field changes with no re-render and no error. Signals remove the dependency
on where the write came from.

**Scope note.** `session-config.ts` and `reward-store.ts` were already binding one-way to signals
(`[ngModel]="duration()"` plus `(ngModelChange)="..."`), which is fine under this rule, and they set
the pattern the sweep then applied to the other two. Importing `FormsModule` is not itself a rule-2
violation — binding `[(ngModel)]` to a plain field is. Those four components remain the
[rule 4](#4-forms) backlog for a separate reason: they are template-driven and the target is signal
forms.

---

## 3. One teardown rule

**Rule.** There are exactly two ways to consume an observable in a component or service:

- **Display streams** (a value the template reads) → `toSignal(stream$, { initialValue })`.
- **Side-effecting streams** (subscribed for their effect) → `.pipe(takeUntilDestroyed())`, passing
  a `DestroyRef` only when outside an injection context.

**Never store a `Subscription` in a field. Never write an `ngOnDestroy` whose only job is teardown.**
An `ngOnDestroy` is legitimate only when it releases something Angular does not own — an interval, a
`Notification` handle, an `AbortController`.

**Status: swept.** No `Subscription` is stored in a field anywhere, and there is not a single
`.unsubscribe()` call left in `src/`. One `ngOnDestroy` remains, in
`pomodoro/services/pomodoro-timer.service.ts`, and it is the legitimate kind: it clears an interval
and removes a `document` listener, neither of which Angular owns.

**What it looked like.** `withdrawal-ledger.ts` stacked all three styles in one file:

- `private withdrawalsSub?: Subscription;`
- `takeUntilDestroyed(this.destroyRef)` on the same and neighbouring streams
- manual `unsubscribe()` in `loadWithdrawals()`, and again in a teardown-only `ngOnDestroy()`

The `Subscription` field and the `ngOnDestroy` were both dead weight: `takeUntilDestroyed` already
tore the stream down on destroy. The only thing the manual `unsubscribe()` actually did was cancel
the *previous* filter query when filters changed — which is `switchMap`, not teardown.

Three other files stored a `Subscription`: `daily-scores-page.ts`, `spending-analytics.ts` and
`quick-spend-event.service.ts`.

**How it was fixed.** Every stored `Subscription` turned out to be one of two things, and each has a
proper operator:

- *Cancel the previous query when an input changes* — `withdrawal-ledger` (filters),
  `spending-analytics` (period) and `daily-scores-page` (reload) all became a source driving
  `switchMap`, which is what cancellation actually means. `spending-analytics` lost `ngOnInit`,
  `loadAnalytics` and `ngOnDestroy` outright and is now one `toSignal` over
  `toObservable(selectedPeriod)`.
- *Guard against double-subscribing* — `quick-spend-event.service` used
  `subscription && !subscription.closed` as an idempotence flag. That is a boolean, not a
  subscription, so it is one now.

Watch for one trap when moving a repeated load onto a single long-lived `switchMap`: an error in the
inner stream kills the outer one permanently, where the old subscribe-per-call shape happened to
survive it. The `catchError` belongs *inside* the `switchMap`, on the inner observable.

**Do this instead.** Drive the query from the filter signals and let one operator own cancellation:

```ts
private readonly filters = signal<WithdrawalFilter>({});

readonly withdrawals = toSignal(
  toObservable(this.filters).pipe(switchMap((f) => this.withdrawalService.getWithdrawals(f))),
  { initialValue: [] as WithdrawalRecord[] }
);
```

**Why.** Three mechanisms for one concern means every reader has to prove to themselves that the
stream is torn down once — not zero times, not twice. Repo-wide now: 9 files use `toSignal`, 8 use
`takeUntilDestroyed`, none store a `Subscription`, and one `ngOnDestroy` remains for the
non-Angular-owned resources described above.

---

## 4. Forms

**Rule.** **Signal forms (`@angular/forms/signals`) are the target for every form in this project.**

- New forms: signal forms, no exceptions.
- The four template-driven components are the migration backlog and move to signal forms.
- The five reactive-forms components migrate opportunistically — when you are already editing one
  for another reason. Do not open a file just to convert it.
- `ReactiveFormsModule` and `FormsModule` are not to be added to any new component.

`[(ngModel)]` on a plain field is banned outright by [rule 2](#2-component-state-is-signals-only),
independent of this rule.

**Resolution of the open question.** This was undecided; it is decided now, on three verified facts:

1. `get_best_practices` for this workspace states: *"Prefer Signal Forms (`@angular/forms/signals`)
   for new forms. They are stable in Angular v22+ [...] When not using Signal Forms, prefer Reactive
   forms instead of Template-driven ones."*
2. `node_modules/@angular/forms/types/signals.d.ts` marks the entire surface `@publicApi` — `form`,
   `schema`, `submit`, `apply`, the `[formField]` directive and every validator. The single
   `@experimental` tag in that file is on `provideExperimentalWebMcpForms`, an unrelated WebMCP
   integration. *(The angular.dev signal-forms **tutorial** still carries a stale "Signal Forms is
   experimental" banner. The typings and the version-specific best-practices guide are
   authoritative; that banner is out of date.)*
3. Angular Material 22.1.3 supports signal forms first-class, so `mat-form-field` error state works
   without a compat layer: `_ErrorStateTracker` accepts `NgControl | FormField<unknown>`
   (`node_modules/@angular/material/types/core.d.ts:62`) and `ErrorStateMatcher` gained
   `isSignalErrorState(field)` (`_error-options-chunk.d.ts:8`). `@angular/forms/signals/compat`
   exists for CVA-only controls, but this project should not need it.

**Do this instead.**

```ts
import { form, required, minLength, submit } from '@angular/forms/signals';

readonly model = signal({ title: '', cost: 0 });
readonly rewardForm = form(this.model, (path) => {
  required(path.title, { message: 'Title is required' });
  minLength(path.title, 3);
});
```

```html
<input matInput [formField]="rewardForm.title" />
```

**Why.** The split is 5 reactive (`earnings-filter.ts`, `goal-form-dialog.ts`,
`category-form-dialog.ts`, `quick-spend-dialog.ts`, `reward-form-dialog.ts`) against 4
template-driven (`daily-task-form.ts`, `session-config.ts`, `reward-store.ts`,
`withdrawal-ledger.ts`) — no form in the app is a model for any other. Picking reactive forms as the
target would mean converting four components to an API the framework has already superseded, then
converting all nine again later. Signal forms also collapse two other rules at once: form state
becomes signals ([rule 2](#2-component-state-is-signals-only)), and field errors become signal reads
instead of `form.get('x')?.hasError(...)` calls in templates
([rule 7](#7-no-method-calls-in-template-bindings)).

---

## 5. Constants

**Rule.** A constant earns its name by being **shared across files** or by being **unreadable
inline**. A name that only restates the literal is worse than the literal, because it adds a lookup
without adding meaning.

Extract when: the value is used in more than one file; the value is opaque (`86_400_000`, a magic
index, a colour); or the value is a genuine domain rule (`MIN_WITHDRAWAL_AMOUNT`).

Do not extract when: the literal is self-evident at the call site (`0`, `2`, `''`, `'granted'`); it
is used once in one file; or it is mock data in a spec.

**Anti-examples.** All four of these are live:

```ts
const ZERO_VALUE = 0;     // earnings-chart.ts:19
const DIVISOR_TWO = 2;    // earnings-chart.ts:24
```

`if (recs.length === ZERO_VALUE)` is strictly harder to read than `if (recs.length === 0)`, and
`(slotWidth - barWidth) / DIVISOR_TWO` hides the fact that it is centring.

```ts
const STATUS_FIELD = 'status';   // goal.service.ts:12
```

Names a Dexie index by restating it. `where('status')` was already the clearer form.

```ts
const PERMISSION_GRANTED = 'granted';   // notification.service.ts:11
const PERMISSION_GRANTED = 'granted';   // pomodoro-timer.service.ts:38
```

This one is the real failure. It *is* shared, so it qualified for extraction — and was then
copy-pasted into two files instead of being shared. `TRANSACTION_READ_WRITE` appears in 7 files,
`DATE_LOCALE_CA` in 5, `SNACKBAR_DURATION_MS` in 4, `ONE_DAY_MS` in 4.

`SNACKBAR_DURATION_MS` is the one now part-way fixed: `shared/services/snack-bar.service.ts` owns the
canonical copy, and `SnackBarService.show()` / `.error(e, fallback?)` replace the
`snackBar.open(msg, 'Close', { duration })` triple plus the
`e instanceof Error ? e.message : fallback` dance. `goals-page.ts` is converted; the three remaining
declarations are call sites that have not been swept yet.

A fourth shape to watch for: `withdrawal-ledger.ts` declares `SNACKBAR_DURATION_MS = 3000` on line 21
and then writes `{ duration: 3000 }` inline on line 77 anyway.

**Scale.** 262 module-level `SCREAMING_CASE` constants outside specs; about 150 are referenced once
or never inside their own file. The sweep deletes names, it does not add them.

---

## 6. SCSS

**Rule.**

- **No raw hex in component styles.** Colour comes from the Material system tokens that
  `mat.theme()` generates (`var(--mat-sys-primary)`, `var(--mat-sys-on-surface)`, and so on).
- **No fallback value inside `var()`.** Write `var(--mat-sys-primary)`, never
  `var(--mat-sys-primary, #673ab7)`.
- **Spacing, radius and breakpoints come from a shared layer**, consumed with `@use`. Component
  styles must not invent their own scale or their own breakpoint.

**Anti-example.** 97 hex literals across the 38 component stylesheets (35 distinct), 72 `var()` calls
carrying a fallback, and exactly one `@use` in the whole project — `src/styles.scss:1`, for Material
itself.

The fallbacks are actively wrong, not merely redundant:

```scss
/* category-form-dialog.scss:79 */
border-color: var(--mat-sys-primary, #673ab7);
```

`#673ab7` is Material Design 2 deep purple. This app's theme is `primary: mat.$azure-palette`
(`src/styles.scss:8`), whose tone-40 primary is `#005cbb` — blue. The fallback was copied from a
generic template, never matched this theme, and would paint a purple border the moment the token
failed to resolve. It also silently defeats any future re-theme.

Breakpoints are in the same state — three media queries, two values, and an overlap:

```
score-input.component.scss:238   @media (max-width: 560px)
dashboard.scss:9                 @media (max-width: 600px)
session-config.scss:20           @media (min-width: 600px)
```

Both 600px rules match at exactly 600px. Spacing tells the same story from the other direction: the
literals already cluster on a 4px scale (16px used 38 times, 8px 37, 12px 19, 6px 15, 4px 15) — the
scale exists, it is just not named. `border-radius` has not converged at all: 12px, 8px, 6px, 16px,
20px, 10px, 4px, 2px.

**Do this instead.** Add `src/styles/_tokens.scss` holding the spacing scale, the radius scale and
the breakpoint map, and `@use` it from component styles. Colour needs no new layer — the
`--mat-sys-*` tokens are already there and already correct.

**Out of scope.** Dark mode is explicitly not part of this work (`src/styles.scss:18` pins
`color-scheme: light`), and neither is the accessibility pass. The responsive pass **is** in scope.

---

## 7. No method calls in template bindings

**Rule.** A template binding reads a signal or a plain property. It does not call a component method.
Precompute with `computed()` — and for per-item values in an `@for`, precompute the shaped rows in a
`computed()` and iterate those. Event handlers (`(click)="save()"`) are of course unaffected.

**Anti-example.** `withdrawal-ledger.html` calls `getCategory(withdrawal.categoryId)` three times per
row — lines 73, 74 and 79 — for the colour, the icon and the name:

```html
<div class="category-indicator" [style.backgroundColor]="getCategory(withdrawal.categoryId)?.color || '#9e9e9e'">
  <mat-icon>{{ getCategory(withdrawal.categoryId)?.icon || 'category' }}</mat-icon>
  ...
  <span class="item-category">{{ getCategory(withdrawal.categoryId)?.name || 'Uncategorized' }}</span>
```

(That first line also carries a raw hex, against [rule 6](#6-scss).)

**Do this instead.** Shape the rows once:

```ts
readonly rows = computed(() =>
  this.withdrawals().map((w) => ({ ...w, category: this.categoryMap().get(w.categoryId) }))
);
```

**Scale.** 28 argument-taking calls in bindings across 6 templates. 24 of them are `form.get('x')`
and `hasError('x', 'required')` in the four reactive dialogs — those disappear as a side effect of
the [rule 4](#4-forms) migration, so do not hand-fix them. The remaining 4 are `getCategory` in
`withdrawal-ledger.html` and `reward-store.html`.

**Not lint-enforced.** No rule in the current config catches this; it is a review item.

---

## 8. Layering

**Rule.** `src/app/core/**` must not import from `src/app/features/**`. Core is the lowest layer.
Dependencies point `features → shared → core`, never back up.

If core needs a shape that today lives in a feature, the shape belongs in `core/models/`. If core
needs behaviour from a feature, the dependency is inverted — core defines the interface or emits the
event, and the feature subscribes. `EventBusService` already exists for exactly this.

**Status: swept.** `no-restricted-imports` is `error` and the tree is clean. What follows is the
record of what was wrong and how it was fixed, so the shape is recognisable if it recurs.

**What it looked like.** 11 violations, and they were not all the same severity.

Ten were type-only model imports — structural coupling, mechanical to fix by moving the model into
`core/models/`:

```ts
// core/services/db.service.ts:7-15  (models from 7 different features)
import type { Goal } from '../../features/goals/models/goal.model';
import type { DailyScore } from '../../features/daily-scores/models/daily-score.model';
// ...
// core/constants/initial-reward-categories.const.ts:1
import type { RewardCategory } from '../../features/rewards/models/reward-category.model';
```

One was a runtime dependency on a feature service, and it was the one that actually inverted the
architecture:

```ts
// core/services/notification.service.ts:2
import { DailyScoresService } from '../../features/daily-scores/services/daily-scores.service';
```

**How it was fixed.** Two separate moves:

1. **The models.** The 8 Dexie table row types moved into `core/models/` — the Dexie schema is core
   infrastructure, and `docs/schema.md` already documents it as one thing. Moving them dragged 6
   more files that the row shapes depend on (`goal-status.type`, `daily-task-difficulty.model`,
   `engagement-type.enum`, `pomodoro-session-status.enum`, `reward-type.type`,
   `reward-status.type`), because a model left behind in a feature would have re-created the
   violation from inside `core/models/`. 14 files moved, 116 import specifiers rewritten across 68
   files.
2. **`NotificationService`.** *Not* via `EventBusService`, which was the obvious-looking answer and
   the wrong one: the bus is a plain `Subject` with no replay, and the 21:30 check needs to **pull**
   ("is there a score for today?"), which a fire-and-forget event stream cannot answer across an app
   restart. The first pass made core pull the row itself — core injected `DbService` and read
   `dailyScores` directly. That removed the *import* violation but left the real problem in place:
   core still owned a daily-scores **policy**.

   The second pass split the service along the seam between mechanism and policy:

   - `core/services/browser-notification.service.ts` — `BrowserNotificationService`, the generic
     mechanism: permission handling plus `show(title, options)`. Nothing about scores. Core is the
     right home because pomodoro needs the same mechanism.
   - `features/daily-scores/services/daily-score-reminder.service.ts` —
     `DailyScoreReminderService`, the policy: *remind me at 21:30 if today has no score*. It lives
     in the slice that owns the concept, injects `BrowserNotificationService` for the mechanism and
     `DailyScoresService` for the data, and is what `App.ngOnInit` now calls.

   Core no longer computes a `dailyScores` key at all, so the shared-`DATE_LOCALE_CA` coupling the
   first pass introduced is gone: the reminder calls `DailyScoresService.getTodayScore()` and the
   slice keeps its own date format to itself.

   Splitting it also surfaced a latent bug the old shape hid. The re-arm guard was
   `now > reminderTime`; when the timer fires exactly on its deadline those are equal, so instead of
   rolling to tomorrow it re-armed with a 0ms delay and fired a duplicate reminder. Real browsers
   fire timers late so it rarely bit, but fake timers hit it every run. It is `>=` now.

3. **`DbService`.** Moved out of core entirely, to `src/app/database/db.service.ts`, and documented
   there as the **persistence composition root** — the one file allowed to know every slice at once.
   The Dexie schema is version-ordered, so the `version(N).stores({...})` blocks cannot be split
   across feature folders without inviting migration bugs; the answer is to name the exception
   rather than pretend core owns it. The database name and every existing version block are
   load-bearing — changing either discards existing users' IndexedDB data, so the file moved and the
   schema did not.

   The row types stay in `core/models/` (move 1). That is not a cycle: `core/models/` imports only
   its own siblings, so the file-level graph is `core/models ← database ← core/services ← features`.

**Generalisation.** Before reaching for an event or a token to invert a core→feature dependency, ask
what core actually wants. If it wants *data*, it may already own the table — that is a misplaced
call, not a dependency to invert. If it wants a *decision* ("should I remind the user?"), the
dependency is real, and the fix is to split mechanism from policy and let the slice own the policy.
And if a file genuinely must know every slice, move it out of core and say so in writing, rather
than leaving it in core with an exemption nobody can see.

**Lint-enforced as an error.** `no-restricted-imports` in `eslint.config.js` is `error` and reports
zero violations. Keep it that way: it is no longer a budget to spend.

---

## Lint config notes

Two entries in `eslint.config.js` exist to serve rules in this document, and should not be removed
without changing the rule here first.

- **`no-restricted-imports`** (see [rule 8](#8-layering)) — bans `features/**` from
  `src/app/core/**`, including `import type`, at `error`. Currently zero violations.
- **`@typescript-eslint/unbound-method: ['error', { ignoreStatic: true }]`**, scoped to
  `src/app/**/*.ts`. `Validators.required` is a *static* method
  (`@angular/forms/types/forms.d.ts:5246`), so the default rule fires when it is passed by
  reference — which is exactly how Angular's validator API is designed to be used. Without this, the
  only way to stay lint-clean is to wrap every validator in an arrow:

  ```ts
  // reward-form-dialog.ts:52 — what the rule forced
  validators: [(control) => Validators.required(control), (control) => Validators.maxLength(100)(control)]
  ```

  That is 13 wrappers across three dialogs, and the `maxLength` one wraps a function that was already
  bound. With `ignoreStatic`, `validators: [Validators.required, Validators.maxLength(100)]` passes.
  Instance methods are still checked, which is what the rule is actually for.

  This is a stopgap for the reactive forms that remain. Signal forms ([rule 4](#4-forms)) use free
  functions and never trip `unbound-method` at all.

`@angular-eslint/prefer-on-push-component-change-detection` is **deliberately not enabled** — see the
v22 defaults table above.
