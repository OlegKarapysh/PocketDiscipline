# Implementation Plan: Pomodoro Stats

**Branch**: `[013-pomodoro-stats]` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-pomodoro-stats/spec.md`

## Summary

Show the user's pomodoro tally on the Pomodoro page:

- **Today card**: today's completed pomodoros, their work/study split, focus time and reward earned.
- **History block**: the same totals for a 7, 14 or 30-day or custom period, plus a single-colour bar chart of pomodoros per day.

A new `PomodoroStatsService` in the `features/pomodoro/` slice reads completed sessions through the existing `status` index. It credits each session to the local day of `endTime ?? startTime`, the rule the Today page's earnings use, and returns a live, zero-filled `PomodoroPeriodSummary` through Dexie's `liveQuery`. `PomodoroContainer` drives the Today summary from `ClockService.today` and the History summary from the period filter, and lays out the timer, Today and History in two wrapping columns. Nothing new is stored, and the schema version is unchanged.

Before the history chart is built, the bar chart duplicated in `EarningsChart` and `ScoresChart` moves into a shared `app-bar-chart` component ([contracts/bar-chart.md](./contracts/bar-chart.md)). Both charts migrate onto it with no change in behaviour, and `PomodoroHistoryChart` becomes its third consumer.

## Technical Context

**Language/Version**: TypeScript 6.0, Angular 22.2 (zoneless, OnPush by default)

**Primary Dependencies**: Dexie 4.4 (IndexedDB, `liveQuery`), Angular Material 22.2, RxJS 7.8. No new packages.

**Storage**: Dexie `pocket-discipline-db` at schema version 11, unchanged. Read-only use of `pomodoroSessions` through its existing `status` index.

**Testing**: Vitest (`npm test -- --watch=false`) with the repository's `dexie` mock; Playwright (`npm run e2e`) for `e2e/src/pomodoro-stats.spec.ts`, the layout audit (`e2e/src/layout-audit.spec.ts`) and the chart tooltip check (`e2e/src/chart-tooltip.spec.ts`).

**Target Platform**: Offline-first PWA, from 360px phones to 1920px desktops, light and dark themes.

**Project Type**: Single-page web application (vertical slices under `src/app/features/`).

**Performance Goals**: A completion shows in the Today card within 1 second (SC-004). Switching the History period renders within 1 second with about 3,000 sessions (SC-005).

**Constraints**:

- No stored data, settings or schema changes (FR-016).
- The counting rule matches `DashboardEarningsService` (SC-003).
- Charts use `--mat-sys-primary` only; amber is used only for the earned amount.
- No `t.up()` or `t.down()` for the page's own layout.

**Scale/Scope**:

- Shared chart refactor:
  - 1 shared component (`BarChart`) with 7 models.
  - 2 charts migrated: `EarningsChart`, `ScoresChart`.
  - 5 obsolete chart models removed.
- Feature:
  - 1 service.
  - 3 models.
  - 1 constant: `ENGAGEMENT_TYPE_LABELS`.
  - 4 components: `PomodoroStats`, `PomodoroToday`, `PomodoroHistory`, `PomodoroHistoryChart`.
  - 1 changed container: `PomodoroContainer`.
  - 1 new e2e spec and 2 extended e2e specs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture? — Yes: the service, models, constant and components all live in `src/app/features/pomodoro/`. Outside the slice, it only reads `DbService` and uses `core/` (`ClockService`, `PomodoroSession`, `EngagementType`) and `shared/` (period filter, `chart-periods`, `BarChart`, `SectionCard`, `Amount`, `Badge`). Nothing is imported from another feature. The refactor moves code out of the dashboard and daily-scores slices into `shared/`; it adds no import between slices.
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)? — Yes: no new packages. `liveQuery` comes from the existing Dexie dependency.
- [x] Will the new code follow `docs/code_style.md` and pass ESLint, EditorConfig, and Prettier? — Yes:
  - the service is generated with the Angular CLI as an `@Service()` class;
  - component state is signals only (rule 2), and streams are consumed with `toSignal` (rule 3);
  - constants are extracted only when shared or opaque (rule 5);
  - templates bind `computed()` values, not method calls (rule 7);
  - nothing is imported from `core/` to `features/` (rule 8);
  - one interface per file, and no `Component` suffix.
- [x] Does the design adhere to SOLID principles and established developer best practices? — Yes: the counting rule lives in one service method, the container only wires streams, and the four components are presentational with signal inputs. `PomodoroStats` is reused by both cards instead of duplicating the figures.
- [x] Does any UI follow `docs/design_system.md` (shared components first, theme and token layer only), with `scripts/check-ui.mjs` passing and its baseline not grown? — Yes:
  - built from `SectionCard`, `Amount` (`tone="reward"`), `Badge`, `PeriodFilter` and the shared chart pieces;
  - figures in mono (`.pd-num` / `t.numeric`);
  - spacing, radius and colours from tokens only;
  - layout from the container's width with `flex-wrap`;
  - every new state is registered in the layout audit;
  - the new shared `BarChart` is added to the gallery page and the catalogue in `docs/design_system.md`, as the UI skill requires for a shared component;
  - its tones map only to existing tokens, with amber kept for earned amounts.

Post-design re-check: all gates pass with zero violations. The shared chart removes the duplication between `EarningsChart` and `ScoresChart` instead of adding a third copy (research §4).

## Project Structure

### Documentation (this feature)

```text
specs/013-pomodoro-stats/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── bar-chart.md     # UI contract of the shared app-bar-chart and its three consumers
├── checklists/
│   └── requirements.md  # Specification quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

The feature exposes no API or CLI. Its one contract is a UI contract, for the shared chart component that three features will depend on.

### Source Code (repository root)

```text
src/app/shared/components/bar-chart/                # New shared component (contracts/bar-chart.md)
├── bar-chart.ts | .html | .scss | .spec.ts         # Geometry, axes, labels, zero bar, tooltip interaction and frame
├── chart-tone.type.ts
├── bar-chart-bar.model.ts
├── bar-chart-segment.model.ts
├── bar-chart-scale.model.ts
├── bar-chart-tooltip.model.ts
├── bar-chart-tooltip-row.model.ts
└── bar-chart-legend-item.model.ts

src/app/features/dashboard/
├── components/earnings-chart/
│   └── earnings-chart.ts | .html | .scss | .spec.ts  # Migrated: aggregation, money scale, source tones and tooltip rows only
└── models/
    ├── chart-bar.model.ts                          # Removed
    ├── chart-bar-segment.model.ts                  # Removed
    ├── chart-grid-line.model.ts                    # Removed (duplicate of shared/models)
    └── tooltip-position.model.ts                   # Removed (duplicate of shared/models)

src/app/features/daily-scores/
├── components/scores-chart/
│   └── scores-chart.ts | .html | .scss | .spec.ts    # Migrated: range, averaging, 0–10 scale, high-score tone and tooltip rows only
└── models/
    └── score-bar.model.ts                          # Removed

src/app/features/design-system/
└── design-system-page.html | .ts                   # Live app-bar-chart example

src/app/features/pomodoro/
├── constants/
│   └── engagement-type-labels.const.ts            # ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string>
├── models/
│   ├── pomodoro-tally.model.ts                    # PomodoroTally
│   ├── daily-pomodoro-tally.model.ts              # DailyPomodoroTally extends PomodoroTally
│   └── pomodoro-period-summary.model.ts           # PomodoroPeriodSummary
├── services/
│   ├── pomodoro-stats.service.ts                  # getPeriodSummary(startDate, endDate): live, zero-filled
│   └── pomodoro-stats.service.spec.ts
├── components/
│   ├── pomodoro-stats/                            # Figures for one PomodoroTally: count, split badges, focus time, earned
│   │   ├── pomodoro-stats.ts | .html | .scss | .spec.ts
│   ├── pomodoro-today/                            # SectionCard "Today": PomodoroStats or the invitation
│   │   ├── pomodoro-today.ts | .html | .scss | .spec.ts
│   ├── pomodoro-history/                          # Period filter + PomodoroStats + chart, or the empty-period message
│   │   ├── pomodoro-history.ts | .html | .scss | .spec.ts
│   └── pomodoro-history-chart/                    # app-bar-chart consumer: pomodoros per day/week/month/year, primary only
│       ├── pomodoro-history-chart.ts | .html | .scss | .spec.ts
└── pomodoro-container/
    ├── pomodoro-container.ts                      # Today and History streams (toObservable → switchMap → toSignal)
    ├── pomodoro-container.html                    # Two columns: [timer card, Today] and [History]
    ├── pomodoro-container.scss                    # flex-wrap columns, gap t.space(4)
    └── pomodoro-container.spec.ts

e2e/src/
├── pomodoro-stats.spec.ts                         # New: figures, live completion, midnight, dashboard cross-check
├── layout-audit.spec.ts                           # Worst-case sessions in worstCaseRows(); new pomodoro entries
└── chart-tooltip.spec.ts                          # Pomodoro chart's outermost bars stay on screen

docs/
├── schema.md                                      # pomodoroSessions: document the crediting day (endTime ?? startTime)
└── design_system.md                               # Catalogue entry for app-bar-chart; "Charts" mapping row
```

**Structure Decision**: The feature stays in the existing `features/pomodoro/` slice, because it only reads that slice's own table and shows its figures on its own route. The bar chart goes to `shared/components/`, because three slices draw it. Following the rule for shared components, it knows nothing about earnings, scores or pomodoros, only bars, a scale and tooltip rows. The container keeps owning data loading, as `Dashboard` and `DailyScoresPage` do, and the four new components are presentational. `docs/schema.md` gains one sentence on which day a completed session is credited, since this feature makes the rule visible to the user and two services now apply it.

### Implementation Order

1. **Shared bar chart refactor** (its own commit; no pomodoro code). Build `BarChart` from the contract, migrate `EarningsChart`, then `ScoresChart`, then remove the obsolete models and update the gallery and the design system doc. The unchanged e2e suites (`chart-tooltip`, `dashboard`, `daily-scores`, layout audit) must pass before moving on.
2. **Spec 005 layout amendment** (User Story 3): compact timer card, no vertical centring, quick-actions button kept off the content. This is a prerequisite for SC-001 and is tracked in spec 005's `tasks.md` via `/speckit-converge`. It does not depend on step 1, so it can run in parallel.
3. **Models, constant and `PomodoroStatsService`** with its spec. The counting rule is the riskiest part, so it is tested first.
4. **`PomodoroStats` and `PomodoroToday`**, wired into the container: delivers User Story 1 (P1).
5. **`PomodoroHistoryChart` (on `app-bar-chart`) and `PomodoroHistory`**, wired into the container: delivers User Story 2 (P2).
6. **Verification**: `e2e/src/pomodoro-stats.spec.ts`, the layout audit and the chart tooltip entries; screenshots at 360px and 1280px in light and dark.

### Worst-Case Content for the Layout Audit

Seeded in `worstCaseRows()`:

- 20 completed sessions of 120 minutes today: 40 h.
- 600 completed sessions over the last 30 days: 1,200 h.
- Rewards summing to seven digits.

Registered states:

- `pomodoro` (the Today and History figures);
- `pomodoro: custom range`;
- `pomodoro: long range` (more than 90 days, week bars);
- `pomodoro: empty period`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
