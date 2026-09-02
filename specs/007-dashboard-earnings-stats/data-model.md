# Data Model: Dashboard Earnings Chart and Statistics

## Entities

### 1. `DailyEarningsRecord`
Represents the aggregated earnings for a single calendar date across all activity sources.

- **Properties**:
  - `date: string`: Calendar date in ISO format (`YYYY-MM-DD`).
  - `totalEarned: number`: Total sum of all rewards earned on this date.
  - `goalsEarned: number`: Amount earned from completed Goals.
  - `dailyTasksEarned: number`: Amount earned from completed Daily Tasks.
  - `pomodoroEarned: number`: Amount earned from completed Pomodoro focus sessions.
  - `dailyScoresEarned: number`: Amount earned from submitted Daily Scores.

```typescript
export interface DailyEarningsRecord {
  date: string;
  totalEarned: number;
  goalsEarned: number;
  dailyTasksEarned: number;
  pomodoroEarned: number;
  dailyScoresEarned: number;
}
```

---

### 2. `MonthlyEarningsSummary`
Represents the calculated statistics for a calendar month.

- **Properties**:
  - `year: number`: Calendar year (e.g., 2026).
  - `month: number`: Calendar month index (1-12).
  - `monthLabel: string`: Formatted display label (e.g., "September 2026").
  - `totalEarned: number`: Total earnings accumulated throughout the month.
  - `daysCount: number`: Number of days used in the daily average calculation (elapsed days for current month, full month days for past months).
  - `averageEarnedPerDay: number`: Computed average (`totalEarned / daysCount`), rounded to nearest integer (`Math.round`).
  - `isCurrentMonth: boolean`: Whether this summary represents the in-progress month.

```typescript
export interface MonthlyEarningsSummary {
  year: number;
  month: number;
  monthLabel: string;
  totalEarned: number;
  daysCount: number;
  averageEarnedPerDay: number;
  isCurrentMonth: boolean;
}
```

---

### 3. `EarningsPeriodFilter`
Represents the active filter state for the daily earnings chart.

- **Properties**:
  - `preset: 'last7' | 'last14' | 'last30' | 'custom'`: The selected filter mode.
  - `startDate: string`: Inclusive start date (`YYYY-MM-DD`).
  - `endDate: string`: Inclusive end date (`YYYY-MM-DD`).

```typescript
export type PeriodPreset = 'last7' | 'last14' | 'last30' | 'custom';

export interface EarningsPeriodFilter {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
}
```

---

### 4. `DailyTaskCompletion` (Dexie Entity)
Persists individual daily task completions to retain a historical record across dates.

- **Primary Key**: `id` (UUID)
- **Indexes**: `id, date, taskId`
- **Properties**:
  - `id: string`: Unique UUID.
  - `taskId: string`: ID of the completed `DailyTask`.
  - `date: string`: Local calendar date (`YYYY-MM-DD`).
  - `difficultyId: string`: ID of the completed difficulty level.
  - `rewardEarned: number`: Total reward credited for this completion (base + streak bonus).
  - `completedAt: number`: Timestamp of completion.

```typescript
export interface DailyTaskCompletion {
  id: string;
  taskId: string;
  date: string;
  difficultyId: string;
  rewardEarned: number;
  completedAt: number;
}
```

---

## Database Integration (`pocket-discipline-db`)

### Schema Upgrade (`version(6)`)
In `src/app/core/services/db.service.ts`:

```typescript
const SCHEMA_DAILY_TASK_COMPLETIONS = 'id, date, taskId';

this.version(6).stores({
  dailyTaskCompletions: SCHEMA_DAILY_TASK_COMPLETIONS
});
```

### Table Reference
```typescript
dailyTaskCompletions!: Table<DailyTaskCompletion, string>;
```

---

## State & Data Flow

```
+-------------------------------------------------------------+
|                     User Action                             |
|  - Load Dashboard                                           |
|  - Switch Filter (Last 7d / 14d / 30d / Custom)             |
|  - Switch Month (< / >)                                     |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                DashboardEarningsService                     |
|  - Computes date range bounds                               |
|  - Queries Dexie:                                           |
|      * goals (status = COMPLETED)                           |
|      * dailyScores (between startDate & endDate)            |
|      * pomodoroSessions (status = completed)                |
|      * dailyTaskCompletions (between startDate & endDate)   |
|  - Aggregates daily tallies into DailyEarningsRecord[]      |
|  - Computes MonthlyEarningsSummary (elapsed vs total days)  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Dashboard View                          |
|  - EarningsFilterComponent (updates filter observable)      |
|  - EarningsChartComponent (renders SVG stacked bars)        |
|  - EarningsStatsComponent (renders monthly average card)    |
+-------------------------------------------------------------+
```
