# Data Model: Pomodoro Stats

No table, index or schema version changes (`pocket-discipline-db` stays at version 11). The feature only reads the existing `pomodoroSessions` table and derives three in-memory models in `src/app/features/pomodoro/models/`, one interface per file per `docs/code_style.md`.

## Stored Data Read (`pomodoroSessions`, unchanged)

See [docs/schema.md](../../docs/schema.md#pomodorosessions). Fields the feature reads:

| Field | Use |
|---|---|
| `status` | Only `completed` sessions count. `active` (running) and `cancelled` (stopped) are ignored (FR-003). |
| `endTime` | When the completion was recorded. Its local calendar day is the day the session counts on (FR-002). |
| `startTime` | Fallback day when a completed row has no `endTime` (older or imported history). |
| `engagementType` | Which `byType` counter the session adds to. |
| `durationMinutes` | Added to `focusMinutes`. |
| `rewardEarned` | Added to `rewardEarned`. A completed row without it adds 0. |

**Credited time** = `endTime ?? startTime`. This is the same rule `DashboardEarningsService` uses for the Today page's earnings (research §1).

## In-Memory Models (`src/app/features/pomodoro/models/`)

### 1. `PomodoroTally` (`pomodoro-tally.model.ts`)

The figures for any set of days.

| Field | Type | Rules |
|---|---|---|
| `pomodoros` | `number` | Completed sessions counted. One per session, whatever its duration (FR-001). |
| `byType` | `Record<EngagementType, number>` | One entry for every `EngagementType`, zero included. The values sum to `pomodoros`. |
| `focusMinutes` | `number` | Sum of `durationMinutes` of the counted sessions. |
| `rewardEarned` | `number` | Sum of `rewardEarned` of the counted sessions, in whole hryvnias. |

### 2. `DailyPomodoroTally` (`daily-pomodoro-tally.model.ts`)

`PomodoroTally` for one calendar day: `interface DailyPomodoroTally extends PomodoroTally`.

| Field | Type | Rules |
|---|---|---|
| `date` | `string` | Local calendar date, `YYYY-MM-DD` (`DATE_LOCALE_CA`). |

### 3. `PomodoroPeriodSummary` (`pomodoro-period-summary.model.ts`)

Output of `PomodoroStatsService.getPeriodSummary(startDate, endDate)`.

| Field | Type | Rules |
|---|---|---|
| `startDate` | `string` | First day of the range, `YYYY-MM-DD`, as requested. |
| `endDate` | `string` | Last day of the range, `YYYY-MM-DD`, as requested. |
| `days` | `DailyPomodoroTally[]` | One entry per date of `datesInRange(startDate, endDate)`, oldest first, zero-filled for days without sessions. Empty for an invalid range. |
| `total` | `PomodoroTally` | Field-by-field sum of `days`. |

## Derivation

1. Read the completed sessions (research §1) and keep those whose credited time lies within `[local start of startDate, local end of endDate]`.
2. Start with a zero tally for every date of the range.
3. For each kept session, add it to the tally of its credited time's local date: `pomodoros += 1`, `byType[engagementType] += 1`, `focusMinutes += durationMinutes`, `rewardEarned += rewardEarned ?? 0`.
4. `total` is the sum of the day tallies.

## Invariants (asserted by `pomodoro-stats.service.spec.ts`)

- `days.length` equals the number of dates in the range, including across a DST change.
- For every tally, the sum of `byType` equals `pomodoros`.
- `total` equals the field-by-field sum of `days`.
- A session counts in exactly one day, the day of its credited time, and never when its status is `active` or `cancelled`.

Checked end to end in `e2e/src/pomodoro-stats.spec.ts`: for a given day, `rewardEarned` equals the pomodoro earnings the Today page shows for that day (SC-003).

The chart's view models (`BarChartBar`, `BarChartScale`, `BarChartTooltip` and the rest) belong to the shared chart component and are defined in [contracts/bar-chart.md](./contracts/bar-chart.md). `PomodoroHistoryChart` maps grouped `DailyPomodoroTally` periods onto them.

## UI State (`PomodoroContainer`)

| Signal | Source | Notes |
|---|---|---|
| `today` | `ClockService.today` | Changes at local midnight and when the page becomes visible on a later day. |
| `selectedFilter` | `signal<PeriodFilterValue>` | Starts at `{ preset: 'last7' }`. Not remembered between visits. |
| `currentFilter` | `computed` | A preset range is recomputed from `today`; a custom range is used as chosen. |
| `todaySummary` | `toSignal` | `getPeriodSummary(today, today)`. The Today card shows `total`. |
| `historySummary` | `toSignal` | `getPeriodSummary(currentFilter.startDate, currentFilter.endDate)`. The History block shows `total` and charts `days`. |
