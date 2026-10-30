# Research: Pomodoro Stats

## 1. Which Sessions Count, and How They Are Read

- **Decision**: Read `db.pomodoroSessions.where('status').equals(PomodoroSessionStatus.COMPLETED)` and keep the sessions whose credited time (`endTime ?? startTime`) falls between the local start of the first day and the local end of the last day of the requested range. Each kept session is bucketed into the local calendar day (`DATE_LOCALE_CA`) of its credited time.
- **Rationale**: This is exactly how `DashboardEarningsService.getCompletedPomodoroSessionsInRange` credits a session, so the reward shown on the Pomodoro page always equals the pomodoro share of the Today page's earnings (SC-003). The feature description proposed querying by the indexed `startTime`, but a bounded `startTime` window can miss a session: `PomodoroTimerService.restoreActiveSession` completes a session whose time ran out while the app was closed, and `PomodoroStorageService.completeSession` stamps `endTime` with the time it is recorded, which can be days after `startTime`. The `status` index has no such gap. Neither query needs a schema change.
- **Alternatives considered**:
  - A `startTime` window that reaches back by the 120-minute maximum duration. Rejected: it misses a session completed on reopen more than 120 minutes after it started, so today's count and the Today page's earnings would disagree.
  - A compound `[status+endTime]` index. Rejected: it needs a new schema version for no measurable gain. Two years of daily use is about 3,000 rows, which the dashboard already reads this way.

## 2. Live Updates and the Day Rolling Over

- **Decision**: `PomodoroStatsService.getPeriodSummary(startDate, endDate)` wraps the read in Dexie's `liveQuery`, converted with `from()` and guarded by `catchError`, as `DashboardEarningsService.getDailyEarnings` does. `PomodoroContainer` drives two streams with `toObservable(...).pipe(switchMap(...))` and exposes them with `toSignal` (code style rule 3):
  - Today: `ClockService.today` → `getPeriodSummary(today, today)`.
  - History: a `currentFilter` computed from the selected `PeriodFilterValue` and `ClockService.today`, as in `Dashboard.currentFilter` → `getPeriodSummary(startDate, endDate)`.
- **Rationale**: `liveQuery` re-runs whenever `pomodoroSessions` changes, so a session that completes, or is written by the jar import, shows up without a reload (FR-006, SC-004). `ClockService` already re-reads the date at local midnight and when the page becomes visible again, and `switchMap` drops the previous day's query (FR-007). Preset ranges recompute from `ClockService.today`, so they move forward with the day.
- **Alternatives considered**:
  - One `liveQuery` of all completed sessions shared by both cards, with the tallies derived in `computed()`. Rejected: it moves the counting rule out of the service and into the container. Two queries over a few thousand rows cost nothing noticeable.
  - Re-reading on a `RewardEarnedEvent` from `EventBusService`. Rejected: it misses rows written by the jar import and by a purge, which `liveQuery` sees.

## 3. Service and Model Shape

- **Decision**: One feature service, `PomodoroStatsService`, generated with the Angular CLI through the `angular-cli` MCP server, as a concrete `@Service()` class with no interface, like every service in the repository. Its single method, `getPeriodSummary(startDate, endDate): Observable<PomodoroPeriodSummary>`, returns the period's total tally plus one zero-filled `DailyPomodoroTally` for every date from `datesInRange()` (see [data-model.md](./data-model.md)). The Today card uses the summary's `total` for the range `today..today`.
- **Rationale**: Both cards need the same counting rule (FR-002, FR-003, FR-010), so the rule lives in one method. Returning every date, including zero days, lets the chart keep each day's position (FR-011) without knowing the counting rule. `byType` is keyed by `EngagementType` and filled from `Object.values(EngagementType)`, so every type is listed even at zero, and a type added later appears without further change.
- **Alternatives considered**:
  - Separate `getTodayTally()` and `getDailyTallies()` methods. Rejected: two methods for one rule, where the Today card is just a one-day period.
  - Moving the crediting rule into a shared owner that `DashboardEarningsService` also uses. Deferred: correct in the long run, but it changes `DashboardEarningsService`, which this feature otherwise leaves alone. The rule is one line (`endTime ?? startTime`), and both specs cover the cases where it matters. Offered as a follow-up.

## 4. History Chart

- **Decision** (the user's choice, 2026-10-30): First extract a shared `BarChart` (`app-bar-chart`, `shared/components/bar-chart/`) from `EarningsChart` and `ScoresChart`, and migrate both charts onto it without changing their behaviour. Then build `PomodoroHistoryChart` on it. [contracts/bar-chart.md](./contracts/bar-chart.md) defines the component's inputs, models, behaviour and the three consumers.

  `PomodoroHistoryChart`:
  - groups its days with `groupByCalendarPeriod` and sums each period's tallies;
  - passes one `primary` segment per bar;
  - uses a scale whose top is the next multiple of 4 (at least 4), with 4 divisions, so every grid label is a whole number;
  - builds a tooltip with the period, the pomodoro count and one row per engagement type.
- **Rationale**:
  - The two charts already share nearly everything that is not about their data: width tracking, the y grid, slot and bar width, label thinning and clamping, the zero bar, the tooltip interaction that splits mouse, keyboard and tap since PR #30, and about 140 lines of SCSS. A third copy would triple that.
  - Extracting first means the pomodoro chart is about 60 lines of aggregation and labels, instead of another 250-line component that would have to be migrated later anyway.
  - Grouping through `groupByCalendarPeriod` gives every chart the same 90-bar limit and the week, month and year fallback (FR-011, as amended while planning).
- **How the migration stays safe**:
  - The shared component keeps the DOM hooks the e2e suites select on (`.chart-bar-group`, `.bar-hitbox`, `.zero-bar`, `.chart-tooltip`, `.legend-item`, `.axis-label`), so `e2e/src/chart-tooltip.spec.ts`, `dashboard.spec.ts`, `daily-scores.spec.ts` and the layout audit run unchanged against both migrated charts.
  - The two charts' unit tests are split by what they check:
    - geometry, label thinning and tooltip interaction move to `bar-chart.spec.ts`, de-duplicated;
    - aggregation, scale, tones and tooltip content stay in each consumer's spec, asserted through the rendered chart (bar labels, tooltip text after a tap), so they survive a later refactor;
    - each moved test is checked to fail when the behaviour it covers is broken on purpose.
  - The migration lands as its own commit before any pomodoro code.
- **Accepted visual change**: all three charts share one geometry, the earnings chart's 260-unit viewBox shown 220–300px high. The daily scores chart grows by 20px.
- **Alternatives considered**:
  - A third copy in the slice, following `ScoresChart`. Rejected by the user: it adds about 250 lines of duplicated chart code, and the shared component would then have three charts to migrate instead of two.
  - Tooltip content as a consumer-supplied `ng-template`. Rejected: data rows (`BarChartTooltipRow`) keep every tooltip looking the same, keep the tooltip styles in one stylesheet, and let the tests check tooltip content as data. The three tooltips need only labels, mono text, amounts, swatches and a note.
  - Reusing `EarningsChart` directly. Rejected: it belongs to the dashboard slice, and its money axis and stacked sources do not fit counts.

## 5. Figures and Copy

- **Decision**: A presentational `PomodoroStats` component takes a `PomodoroTally` and is used by both cards, after the `ScoresStats` and `EarningsStats` precedent. It shows:
  - the pomodoro count in mono (`t.numeric`), with "pomodoro" or "pomodoros";
  - the split as one `app-badge` per engagement type ("Work 3", "Study 1"), labelled from a shared `ENGAGEMENT_TYPE_LABELS` constant;
  - the focus time, formatted in a `computed()`: under 60 minutes "45 min", from 60 "2 h 5 min", or "3 h" when the minutes are zero;
  - the reward as `<app-amount tone="reward" [showSign]="true">`, because amber means earned.

  The figures sit on one `flex-wrap` row inside the card, not as `app-stat-card` tiles.
- **Rationale**: Three stat tiles stack into about 300px of height at 360px wide, which would push the Today card below the fold (SC-001). A wrapping row keeps the card to about 120px. `ENGAGEMENT_TYPE_LABELS` is used by `PomodoroStats` and by the chart tooltip, so it qualifies for extraction under code style rule 5. The spec 005 layout work can switch `SessionConfig` and `PomodoroRewardSettings` to it too.
- **Alternatives considered**:
  - A focus-time pipe. Rejected: only `PomodoroStats` formats focus time, so a `computed()` is enough. A pipe would add a file and a public API for one caller.
  - `app-stat-card` tiles. Rejected for the height reason above.

## 6. Page Layout

- **Decision**: `PomodoroContainer` lays out two columns with `flex-wrap` on the container's own width, as the design system's "Responsive layout" requires (no `t.up()` for a component's own layout). The first column holds the timer card (spec 005) and the Today card; the second holds the History block (period filter, totals, chart). Each column has `flex: 1 1 min(100%, 360px)`, so they stack on a phone in the order timer, Today, History, and sit side by side once the content area is wider than about 740px, which includes every desktop width from 1280px (FR-015).
- **Rationale**: The order on a phone puts today's count right under the timer (SC-001). Wide screens use the second column for the history chart instead of stretching the timer.
- **Dependency**: Removing the container's `min-height: 80vh` centring and keeping the quick-actions button off the cards are spec 005 FR-009 and FR-014. SC-001 holds only once the spec 005 layout amendment is implemented, so that work should land first, or in the same change.

## 7. Testing Approach

- **Decision**:
  - **Shared chart**: `bar-chart.spec.ts` covers the geometry and interaction moved out of both charts, and the consumer specs keep their data rules (section 4).
  - **Unit tests**: `PomodoroStatsService` is tested with the `dexie` mock and the index-agnostic `pomodoroTable` fake used in `dashboard-earnings.service.spec.ts`, so the tests check the counting rule, not the index the service queries. Component specs cover `PomodoroStats`, the Today card's empty state, the History block and the chart.
  - **End-to-end tests**: `e2e/src/pomodoro-stats.spec.ts` seeds rows with `putRows`, installs a fixed clock and fast-forwards a real session, as `e2e/src/pomodoro.spec.ts` does. It also checks the dashboard cross-check (SC-003).
  - **Layout and tooltips**: the layout audit seeds worst-case sessions into `worstCaseRows()` and registers the new states. `e2e/src/chart-tooltip.spec.ts` gains the pomodoro chart's outermost bars.
- **Rationale**: A mocked table answers whatever it is asked, so a unit test cannot catch a query that misses rows (the `startTime` window of section 1 would pass it). The end-to-end tests therefore run on a real IndexedDB for the rules that depend on the query: completion on reopen and crossing midnight.
