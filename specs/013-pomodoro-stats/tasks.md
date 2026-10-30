---

description: "Task list for Pomodoro Stats"
---

# Tasks: Pomodoro Stats

**Input**: Design documents from `/specs/013-pomodoro-stats/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/bar-chart.md, quickstart.md

**Tests**: Unit and E2E test tasks are included to satisfy the project's mandatory verification gates (`npm test` and `npm run e2e`, including `e2e/src/layout-audit.spec.ts`) per `AGENTS.md`, and `SC-001`–`SC-006`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. The shared bar chart refactor (Phase 2) is a prerequisite only for User Story 2, but the plan lands it first, as its own commit.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`)
- Exact repository-relative file paths and requirement IDs (`FR-###`, `AC-###`, `SC-###`) are included in descriptions

## External Dependency

- **Spec 005, User Story 3 (compact Pomodoro page)** must be implemented before T022, or in the same change. Both change `src/app/features/pomodoro/pomodoro-container/pomodoro-container.html` and `.scss`. `SC-001` is only reachable with the compact timer card. Track that work in `specs/005-pomodoro-timer/tasks.md` (via `/speckit-converge`); it does not depend on Phase 2 and can run alongside it.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Load the conventions every later task must follow (`AC-003`, `AC-004`).

- [X] T001 Load the Angular v22 coding standards through the `angular-cli` MCP server (`list_projects`, then `get_best_practices` with the workspace path), and read `docs/code_style.md`, `docs/design_system.md` and `.agents/skills/pocketdiscipline-ui/SKILL.md` before writing code. If the MCP server is not running, ask the user to start it with `ng mcp` (`AC-003`, `AC-004`)

---

## Phase 2: Foundational A — Shared Bar Chart (Refactor, No Behaviour Change)

**Purpose**: Move the bar chart duplicated in `EarningsChart` and `ScoresChart` into `app-bar-chart` per `specs/013-pomodoro-stats/contracts/bar-chart.md`, and migrate both charts onto it. The Today and Daily scores pages must behave exactly as before, apart from the Daily scores chart becoming 20px taller (research §4).

**⚠️ CRITICAL**: Blocks User Story 2 (from T025). Lands as its own commit before any pomodoro code. Hand it to the user to review and commit; never commit automatically (`AGENTS.md`).

- [X] T002 Create the bar chart models in `src/app/shared/components/bar-chart/`, one per file, as specified in the contract's Models table:
  - `ChartTone` in `src/app/shared/components/bar-chart/chart-tone.type.ts`
  - `BarChartSegment` in `src/app/shared/components/bar-chart/bar-chart-segment.model.ts`
  - `BarChartScale` in `src/app/shared/components/bar-chart/bar-chart-scale.model.ts`
  - `BarChartTooltipRow` in `src/app/shared/components/bar-chart/bar-chart-tooltip-row.model.ts`
  - `BarChartTooltip` in `src/app/shared/components/bar-chart/bar-chart-tooltip.model.ts`
  - `BarChartLegendItem` in `src/app/shared/components/bar-chart/bar-chart-legend-item.model.ts`
  - `BarChartBar` in `src/app/shared/components/bar-chart/bar-chart-bar.model.ts`

  (`AC-003`)
- [X] T003 Implement the `BarChart` component (selector `app-bar-chart`) in `src/app/shared/components/bar-chart/bar-chart.ts`, `bar-chart.html` and `bar-chart.scss`, following the contract's Behaviour section:
  - **Inputs**: `bars`, `scale`, `ariaLabel` and `legend` (default `[]`).
  - **Size**: width measured with `(appObserveWidth)`; a 260-unit viewBox shown 220–300px high.
  - **Plot area**: left edge from the widest tick label (`AXIS_CHAR_WIDTH`) plus 5px. Bars take 65% of their slot, at least 4px. Segments stack from the baseline at `value / scale.max` of the plot height. Draw the zero bar when there are no segments or every segment is 0.
  - **X-axis labels**: thin out at every 2nd, 5th or about 7 in all, keeping a 9px gap. Always label the first and last bars, and clamp labels inside the edges.
  - **Tooltip interaction**: mouse hover opens it and moves with the pointer; tap or click toggles it; `:focus-visible` focus opens it at the bar top; blur closes it. Position it with `[appFloatAt]`.
  - **Tooltip content**: the title, then `rows`, using `<app-amount size="sm" tone="inherit" [showSign]>` for amounts, a swatch dot for `swatch` and bold for `emphasis`, then `note`.
  - **Legend**: hidden when empty.
  - **Colours**: map each `ChartTone` to its token in SCSS (`primary` → `--mat-sys-primary`, `secondary` → `--mat-sys-secondary`, `inverse-primary` → `--mat-sys-inverse-primary`, `reward` → `--pd-sys-reward`).
  - **Keep the DOM hooks** `.chart-bar-group`, `.bar-hitbox`, `.zero-bar`, `.chart-tooltip`, `.legend-item` and `.axis-label`.

  Template bindings read `computed()` values only (code style rule 7). (`AC-002`, `AC-003`, `AC-004`)
- [X] T004 Write `src/app/shared/components/bar-chart/bar-chart.spec.ts` by moving the geometry and interaction tests out of `src/app/features/dashboard/components/earnings-chart/earnings-chart.spec.ts` and `src/app/features/daily-scores/components/scores-chart/scores-chart.spec.ts`, de-duplicated. Cover:
  - the plot starting after the widest tick label;
  - stacked segment heights from the baseline;
  - the zero bar;
  - label thinning above 10, 16 and 31 bars;
  - no overlapping labels on a phone-width chart;
  - the last label kept inside a phone-width chart;
  - hover open and close, and the tooltip following the pointer;
  - one tap opening it and the next closing it;
  - keyboard focus and blur;
  - tooltip rows (text, amount, signed amount, swatch, emphasis, note);
  - the legend hidden when empty.

  Break each behaviour on purpose once to confirm its test fails, then revert. (`AC-003`)
- [X] T005 Migrate `EarningsChart` onto `app-bar-chart` in `src/app/features/dashboard/components/earnings-chart/earnings-chart.ts`, `earnings-chart.html` and `earnings-chart.scss`, keeping:
  - the `app-section-card` wrapper with its granularity heading;
  - grouping with `groupByCalendarPeriod` and summing each source per period;
  - a scale topping out at the next multiple of 500 (at least 500), with 4 divisions labelled with `MONEY_FORMAT`;
  - source tones: goals `reward`, daily tasks `primary`, pomodoro `inverse-primary`, daily scores `secondary`;
  - a legend of all four sources;
  - tooltip rows: **Total** (emphasis, amount) and one swatch row per earning source, with the note "No earnings recorded" at 0;
  - bar aria labels of the form `period: money`.

  Delete the geometry, interaction and frame code and styles it no longer needs. (`AC-003`)
- [X] T006 Delete `src/app/features/dashboard/models/chart-bar.model.ts`, `chart-bar-segment.model.ts`, `chart-grid-line.model.ts` and `tooltip-position.model.ts` once nothing imports them (the last two duplicate `src/app/shared/models/`) (`AC-003`)
- [X] T007 Rewrite `src/app/features/dashboard/components/earnings-chart/earnings-chart.spec.ts` to assert the dashboard's own rules through the rendered chart: stacking and tone per source, the 500-step scale, the Total and per-source tooltip rows after a tap, "No earnings recorded", screen-reader labels, and week/month/year bars past 90 days. Do not assert the shared chart's geometry again (`AC-003`)
- [X] T008 [P] Migrate `ScoresChart` onto `app-bar-chart` in `src/app/features/daily-scores/components/scores-chart/scores-chart.ts`, `scores-chart.html` and `scores-chart.scss`, keeping:
  - the `app-section-card` wrapper and its heading;
  - the default 7-day range from `ClockService.today` when no dates are given;
  - grouping with `groupByCalendarPeriod`;
  - averages floored to one decimal place;
  - a scale of `max` 10 with 5 divisions;
  - tones: below 9 `primary`, 9–10 `reward`;
  - the legend that switches between daily and average wording;
  - tooltip rows: **Score** or **Average score** as `x / 10`, **Days scored** for a week or longer, and **Reward** as a signed amount when above 0, with the note "No score recorded" and a weekday in the title for a single day.

  Delete `src/app/features/daily-scores/models/score-bar.model.ts`, and the geometry, interaction and frame code it no longer needs. (`AC-003`)
- [X] T009 [P] Rewrite `src/app/features/daily-scores/components/scores-chart/scores-chart.spec.ts` to assert the scores rules through the rendered chart:
  - the default and given ranges;
  - an empty chart for an inverted range;
  - zero bars for unscored days;
  - high-score tone at 9 and above;
  - floored averages and summed rewards for a week;
  - tooltip rows after a tap;
  - week, month and year bars past 90 days.

  (`AC-003`)
- [X] T010 [P] Add a live `app-bar-chart` example with a legend, a stacked bar, a zero bar and tooltip rows to `src/app/features/design-system/design-system-page.html` and `src/app/features/design-system/design-system-page.ts` (`AC-004`)
- [X] T011 [P] Document `BarChart` in `docs/design_system.md` (a catalogue row in "Core components", and the "Charts" row of "Component mapping" changed to `app-bar-chart` with its tones). Add a "Bar chart → `app-bar-chart`" row to the component table in `.agents/skills/pocketdiscipline-ui/SKILL.md`, so the skill and the doc agree (`AC-004`)
- [X] T012 Verify the refactor against `specs/013-pomodoro-stats/quickstart.md` scenario 0:
  1. Run `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e`.
  2. Confirm that `e2e/src/chart-tooltip.spec.ts`, `e2e/src/dashboard.spec.ts`, `e2e/src/daily-scores.spec.ts` and the layout audit's dashboard and daily scores entries pass unchanged.
  3. Run `LAYOUT_AUDIT_SCREENSHOTS=1 npx playwright test layout-audit` and compare `/` and `/daily-scores` at 360px and 1280px, in light and dark, against `quickstart.md` scenario 0.
  4. Stop for the user to commit.

  (`AC-003`, `AC-004`)

**Checkpoint**: `app-bar-chart` is in place, both existing charts run on it unchanged, and the refactor is ready to commit on its own.

---

## Phase 3: Foundational B — Pomodoro Stats Data

**Purpose**: The models, the shared label constant and the service that both cards read (`FR-001`–`FR-007`, `FR-010`, `FR-016`).

**⚠️ CRITICAL**: Blocks User Stories 1 and 2.

- [X] T013 [P] Create `PomodoroTally` (`pomodoros`, `byType: Record<EngagementType, number>`, `focusMinutes`, `rewardEarned`) in `src/app/features/pomodoro/models/pomodoro-tally.model.ts`, `DailyPomodoroTally extends PomodoroTally` (`date`) in `src/app/features/pomodoro/models/daily-pomodoro-tally.model.ts`, and `PomodoroPeriodSummary` (`startDate`, `endDate`, `days`, `total`) in `src/app/features/pomodoro/models/pomodoro-period-summary.model.ts`, per `data-model.md` (`AC-001`, `AC-003`)
- [X] T014 [P] Create `ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string>` (`work` → "Work", `study` → "Study") in `src/app/features/pomodoro/constants/engagement-type-labels.const.ts` (`AC-003`)
- [X] T015 Generate `PomodoroStatsService` with the Angular CLI through the `angular-cli` MCP server, as a concrete `@Service()` class with no interface. Implement `getPeriodSummary(startDate, endDate): Observable<PomodoroPeriodSummary>` in `src/app/features/pomodoro/services/pomodoro-stats.service.ts`:
  - wrap the read in `liveQuery` via `from()`, guarded by `catchError`, which logs the error and emits an empty, zero-filled summary;
  - read `db.pomodoroSessions.where('status').equals(PomodoroSessionStatus.COMPLETED)`;
  - keep the sessions whose credited time (`endTime ?? startTime`) lies between the local start of `startDate` and the local end of `endDate`;
  - zero-fill one `DailyPomodoroTally` per date of `datesInRange(startDate, endDate)`, with `byType` initialised from `Object.values(EngagementType)`;
  - add each session to the day of its credited time: `pomodoros + 1`, `byType + 1`, `focusMinutes + durationMinutes`, `rewardEarned + (rewardEarned ?? 0)`;
  - make `total` the sum of the days.

  Explain with a comment why the `status` index is used, not `startTime` (research §1). (`AC-001`, `AC-003`, `FR-001`–`FR-004`, `FR-006`, `FR-010`, `FR-016`)
- [X] T016 Add unit tests in `src/app/features/pomodoro/services/pomodoro-stats.service.spec.ts`, using the `dexie` mock (`liveQuery` calls its function) and an index-agnostic `pomodoroTable` fake like `dashboard-earnings.service.spec.ts`. Cover:
  - completed sessions only, with `active` and `cancelled` ignored;
  - crediting on `endTime`, falling back to `startTime` when it is missing;
  - a session crossing midnight counting on its end day;
  - a session completed on reopen two days after it started;
  - `byType` listing every engagement type, at zero too;
  - one pomodoro per session whatever its duration;
  - focus minutes and reward sums, with a missing `rewardEarned` adding 0;
  - zero-filled days across a DST change;
  - `total` equal to the sum of `days`;
  - an empty summary for an inverted range;
  - an empty summary when the read fails.

  Break the crediting rule on purpose once to confirm a test fails. (`FR-001`–`FR-004`, `FR-010`, `SC-002`)
- [X] T017 [P] Add one sentence to the `pomodoroSessions` description in `docs/schema.md`: a completed session is credited on the local day of its `endTime` (or `startTime` when it has none), which both `DashboardEarningsService` and `PomodoroStatsService` rely on (`FR-002`)

**Checkpoint**: `PomodoroStatsService` returns correct, live, zero-filled summaries. The user stories can begin.

---

## Phase 4: User Story 1 - See Today's Pomodoros at a Glance (Priority: P1) 🎯 MVP

**Goal**: A Today card next to the timer shows today's completed pomodoros, the work/study split, focus time and reward earned. It updates when a session completes and switches to the new day at midnight (`FR-001`–`FR-008`, `FR-014`, `FR-015`, `SC-001`–`SC-004`).

**Independent Test**:
1. Seed completed work and study sessions today, one completed yesterday, one cancelled today and one active.
2. Open `/pomodoro` and check the Today card's count, split, focus time and reward.
3. Let the active session complete, and check the card counts it without a reload.

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement `PomodoroStats` (selector `app-pomodoro-stats`, input `tally: PomodoroTally`) in `src/app/features/pomodoro/components/pomodoro-stats/pomodoro-stats.ts`, `pomodoro-stats.html` and `pomodoro-stats.scss`, laid out as one `flex-wrap` row with gaps from `t.space()`:
  - the count in mono (`t.numeric`) with "pomodoro" or "pomodoros";
  - one `app-badge` per engagement type, labelled from `ENGAGEMENT_TYPE_LABELS` ("Work 3");
  - focus time from a `computed()`: "45 min" below 60, "2 h 5 min" from 60, "3 h" at whole hours;
  - `<app-amount [value]="tally().rewardEarned" tone="reward" [showSign]="true">`.

  Precompute the badge rows in a `computed()` (rule 7). (`AC-004`, `FR-001`, `FR-004`, `FR-005`)
- [X] T019 [P] [US1] Add unit tests in `src/app/features/pomodoro/components/pomodoro-stats/pomodoro-stats.spec.ts`: singular and plural count; focus time at 0, 45, 60, 125 and 6,000 minutes; a badge for every engagement type including 0; the earned amount rendered as a signed reward (`FR-001`, `FR-004`, `FR-005`)
- [X] T020 [US1] Implement `PomodoroToday` (selector `app-pomodoro-today`, input `tally: PomodoroTally`) in `src/app/features/pomodoro/components/pomodoro-today/pomodoro-today.ts`, `pomodoro-today.html` and `pomodoro-today.scss`. It is an `app-section-card` with the heading "Today" containing `app-pomodoro-stats`; when `tally().pomodoros === 0` it also shows a short line inviting the user to start their first pomodoro of the day (`AC-004`, `FR-001`, `FR-008`)
- [X] T021 [P] [US1] Add unit tests in `src/app/features/pomodoro/components/pomodoro-today/pomodoro-today.spec.ts`: the figures for a non-empty tally, and zero figures plus the invitation for an empty one (`FR-001`, `FR-008`)
- [X] T022 [US1] Wire the Today card into `PomodoroContainer` in `src/app/features/pomodoro/pomodoro-container/pomodoro-container.ts`, `pomodoro-container.html` and `pomodoro-container.scss`:
  - inject `ClockService` and `PomodoroStatsService`;
  - add `todaySummary = toSignal(toObservable(clock.today).pipe(switchMap((today) => stats.getPeriodSummary(today, today))), { initialValue })`, where `initialValue` is a zero summary;
  - render `<app-pomodoro-today [tally]="todaySummary().total" />` under the timer card in the first column;
  - lay out the page as two columns: `display: flex; flex-wrap: wrap; gap: t.space(4)`, each column `flex: 1 1 min(100%, 360px)`, with no `t.up()` or `t.down()`. The second column is left for History;
  - keep the cards rendered while a session runs.

  Coordinate with the spec 005 container changes (External Dependency). (`AC-004`, `FR-006`, `FR-007`, `FR-014`, `FR-015`)
- [X] T023 [US1] Add unit tests in `src/app/features/pomodoro/pomodoro-container/pomodoro-container.spec.ts`, with a stubbed `PomodoroStatsService` and `ClockService`:
  - the Today card shows the service's tally;
  - a new emission (a completion) updates it;
  - a change of `ClockService.today` re-queries for the new day;
  - the card stays visible while the timer is active.

  (`FR-006`, `FR-007`, `FR-014`)
- [X] T024 [US1] Create `e2e/src/pomodoro-stats.spec.ts` (real IndexedDB through `putRows` from `e2e/src/indexed-db.ts`, with `page.clock.install` as in `e2e/src/pomodoro.spec.ts`). Cover:
  - the Today figures for US1 scenario 1: 4 pomodoros, Work 3, Study 1, 2 h 5 min, summed reward;
  - the empty day (scenario 2);
  - cancelled and active sessions excluded (scenario 4);
  - a session from 23:45 to 00:10 counting today (scenario 5);
  - a session completed on reopen two days after it started;
  - a running session completing with the page open and appearing within 1 second of the completion dialog (`SC-004`);
  - the reward on the Today card equal to today's **Pomodoro** amount in the earnings tooltip on `/` (`SC-003`).

  (`FR-001`–`FR-008`, `SC-002`, `SC-003`, `SC-004`)

**Checkpoint**: User Story 1 is complete. `/pomodoro` shows today's tally, updated live. This is the MVP.

---

## Phase 5: User Story 2 - Review Pomodoro History over a Period (Priority: P2)

**Goal**: A History card with the period filter, the period's totals and a bar chart of pomodoros per day, grouped into weeks, months or years past 90 days, with a tap tooltip showing the count and split (`FR-009`–`FR-015`, `SC-005`, `SC-006`).

**Independent Test**:
1. Seed completed sessions over the last 30 days, leaving some days empty.
2. On `/pomodoro`, switch between 7, 14 and 30 days and a custom range.
3. Check the totals, each day's bar, the tooltip on tap and the empty-period message.

### Implementation for User Story 2

- [X] T025 [P] [US2] Implement `PomodoroHistoryChart` (selector `app-pomodoro-history-chart`, input `days: DailyPomodoroTally[]`) as an `app-bar-chart` consumer, without its own card, in `src/app/features/pomodoro/components/pomodoro-history-chart/pomodoro-history-chart.ts`, `pomodoro-history-chart.html` and `pomodoro-history-chart.scss`:
  - group the days with `groupByCalendarPeriod` and sum each period's tallies;
  - give each bar one `primary` segment of the period's pomodoros;
  - use a scale whose `max` is the next multiple of 4 (at least 4), with 4 whole-number tick labels;
  - use `formatPeriodAxisLabel` for axis labels and `formatPeriodRange` for tooltip titles;
  - tooltip rows: **Pomodoros** (emphasis, text), then one text row per engagement type from `ENGAGEMENT_TYPE_LABELS`, with the note "No pomodoros" at 0;
  - bar aria labels: `period: N pomodoros`;
  - SVG aria label by granularity ("Daily pomodoros chart", "Weekly…", "Monthly…", "Yearly…");
  - no legend.

  (`AC-004`, `FR-011`, `FR-012`)
- [X] T026 [P] [US2] Add unit tests in `src/app/features/pomodoro/components/pomodoro-history-chart/pomodoro-history-chart.spec.ts`:
  - one bar per day for 7 days, with zero days drawn as zero bars in their positions;
  - whole-number tick labels for maxima of 0, 3, 5 and 17;
  - the tooltip after a tap showing the count and the Work/Study rows;
  - week bars past 90 days, with the tooltip covering the whole week;
  - month bars once weeks exceed 90.

  (`FR-011`, `FR-012`)
- [X] T027 [US2] Implement `PomodoroHistory` (selector `app-pomodoro-history`; inputs `summary: PomodoroPeriodSummary` and `filter: PeriodFilterValue`; output `filterChange`) in `src/app/features/pomodoro/components/pomodoro-history/pomodoro-history.ts`, `pomodoro-history.html` and `pomodoro-history.scss`. It is an `app-section-card` with the heading "History", containing:
  - `<app-period-filter ariaLabel="Pomodoro history period" [filter]="filter()" (filterChange)="filterChange.emit($event)" />`;
  - `app-pomodoro-stats` with `summary().total`;
  - `app-pomodoro-history-chart` with `summary().days`, or, when `summary().total.pomodoros === 0`, a message that no pomodoros were completed in this period in place of the chart.

  (`AC-004`, `FR-009`, `FR-010`, `FR-013`)
- [X] T028 [P] [US2] Add unit tests in `src/app/features/pomodoro/components/pomodoro-history/pomodoro-history.spec.ts`: the totals from `summary.total`; the chart receives `summary.days`; the empty-period message replaces the chart; a period filter change is re-emitted as `filterChange` (`FR-009`, `FR-010`, `FR-013`)
- [X] T029 [US2] Wire History into `PomodoroContainer` in `src/app/features/pomodoro/pomodoro-container/pomodoro-container.ts` and `pomodoro-container.html`:
  - `selectedFilter = signal<PeriodFilterValue>({ preset: 'last7', startDate: '', endDate: '' })`;
  - `currentFilter = computed(...)`, which recomputes a preset with `getPresetDateRange(preset, clock.today())` and keeps a custom range as chosen, as in `src/app/features/daily-scores/pages/daily-scores-page.ts`;
  - `historySummary = toSignal(toObservable(currentFilter).pipe(switchMap(...)), { initialValue })`;
  - render `<app-pomodoro-history [summary]="historySummary()" [filter]="currentFilter()" (filterChange)="onFilterChange($event)" />` as the second column.

  (`FR-006`, `FR-009`, `FR-010`, `FR-015`)
- [X] T030 [US2] Extend `src/app/features/pomodoro/pomodoro-container/pomodoro-container.spec.ts`: the default 7-day query ending today; a 30-day preset and a custom range re-query; a preset range moves forward when `ClockService.today` changes; a custom range stays fixed (`FR-007`, `FR-009`)
- [X] T031 [US2] Extend `e2e/src/pomodoro-stats.spec.ts` (needs Phase 2 complete). Cover US2 scenarios 1–7:
  - default 7-day totals and bars, with zero days keeping their positions;
  - 30 days, and a custom range including both ends;
  - the tooltip on tap showing the count and split;
  - the empty-period message;
  - today's bar growing when a session completes with the page open;
  - a custom range of more than 90 days drawn as week bars.

  Also check `SC-005`: with about 3,000 seeded sessions, switching from 7 to 30 days shows the new totals within 1 second. (`FR-009`–`FR-013`, `SC-005`)

**Checkpoint**: User Stories 1 and 2 both work. `/pomodoro` shows today's tally and the history.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Layout audit, tooltip placement and the end-to-end gates (`FR-015`, `SC-001`, `SC-006`).

- [X] T032 [P] Extend `e2e/src/layout-audit.spec.ts`:
  1. Add worst-case pomodoro sessions to `worstCaseRows()`: 20 completed sessions of 120 minutes today, and 600 over the last 30 days, with rewards summing to seven digits.
  2. Point the `pomodoro` entry's `ready` selector at `app-pomodoro-today`.
  3. Register `pomodoro: custom range`, `pomodoro: long range` (more than 90 days, week bars) and `pomodoro: empty period`.
  4. Keep `KNOWN_GAPS` from growing.

  (`FR-015`, `SC-006`)
- [X] T033 [P] Extend `e2e/src/chart-tooltip.spec.ts`, reusing the `pomodoroSessions` rows it already seeds on the first and last days of the default range, and check that the pomodoro chart's outermost bars keep their tooltip on screen at 360px, as for the other two charts (`FR-012`, `SC-006`)
- [X] T034 Check `SC-001` once the spec 005 compact layout is in: at 360 × 640, today's pomodoro count and split are visible on opening `/pomodoro` without scrolling. Add this check to `e2e/src/pomodoro-stats.spec.ts`, comparing the Today card's bounding box with the viewport (`SC-001`)
- [X] T035 Run `LAYOUT_AUDIT_SCREENSHOTS=1 npx playwright test layout-audit` and review `/pomodoro` in `test-results/layout-audit/` at 360px and 1280px, in light and dark, with worst-case content. Check that the History column sits beside the timer at 1280px and that the quick-actions button covers no figure (`FR-015`, `SC-006`)
- [X] T036 Run the `quickstart.md` manual scenarios 0–5 and all four gates: `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e`. Fix anything they report without `eslint-disable` and without editing `scripts/ui-baseline.json` by hand (`AGENTS.md`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational A, shared bar chart (Phase 2)**: Depends on Setup. Blocks User Story 2 only, but lands first as its own commit (plan step 1).
- **Foundational B, stats data (Phase 3)**: Depends on Setup. Independent of Phase 2. Blocks both user stories.
- **User Story 1 (Phase 4)**: Depends on Phase 3. T022 also depends on the spec 005 container changes (External Dependency).
- **User Story 2 (Phase 5)**: Depends on Phases 2 and 3, and on T022 for the two-column container.
- **Polish (Phase 6)**: Depends on both user stories. T034 also needs spec 005 User Story 3.

### User Story Dependencies

- **User Story 1 (P1)**: Needs no chart, so it can ship without Phase 2.
- **User Story 2 (P2)**: Needs `app-bar-chart` (Phase 2) and the container layout from T022. Testable on its own through the History card.

### Within Each Phase

- Models before the service; the service and its spec before the components.
- Presentational components before the container wiring.
- `EarningsChart` migration (T005–T007) and `ScoresChart` migration (T008–T009) touch different files and can run in parallel once T003 is done.

### Parallel Opportunities

- T008 and T009 alongside T005–T007; T010 and T011 alongside both migrations.
- Phase 3 (T013–T017) alongside Phase 2.
- T018/T019 alongside T020/T021 (different components).
- T025/T026 alongside T027/T028.
- T032 alongside T033.

---

## Parallel Example: Phase 2 (after T003)

```text
Task: "Migrate EarningsChart onto app-bar-chart (T005), then delete its models (T006) and rewrite its spec (T007)"
Task: "Migrate ScoresChart onto app-bar-chart (T008) and rewrite its spec (T009)"
Task: "Add the app-bar-chart gallery example (T010)"
Task: "Document BarChart in docs/design_system.md and the UI skill (T011)"
```

## Parallel Example: User Story 2

```text
Task: "Implement PomodoroHistoryChart (T025) and its spec (T026)"
Task: "Implement PomodoroHistory (T027) and its spec (T028)"
```

---

## Implementation Strategy

### Refactor First

1. Complete Phase 1 and Phase 2.
2. **STOP and VALIDATE** (T012): the existing charts behave as before, and the e2e suites pass unchanged.
3. Hand the refactor to the user to commit on its own.

### MVP (User Story 1)

1. Complete Phase 3, then Phase 4 (with spec 005's container changes in place).
2. **STOP and VALIDATE**: today's tally is correct and live (T024).

### Incremental Delivery

1. Refactor → commit.
2. Stats data + User Story 1 → validate → commit.
3. User Story 2 → validate → commit.
4. Polish → layout audit, tooltips, screenshots and all four gates.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- Never commit automatically; the user reviews and commits each increment (`AGENTS.md`).
- `SessionConfig` and `PomodoroRewardSettings` can switch to `ENGAGEMENT_TYPE_LABELS` as part of the spec 005 layout work, not here.
- Keep scratch probes out of the repository tree.
