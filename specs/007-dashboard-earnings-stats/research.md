# Research: Dashboard Earnings Chart and Statistics

## Technology Stack & Zero External Dependencies

- **Decision**: Implement the stacked bar chart using native SVG within an Angular standalone component (`EarningsChartComponent`), styled with SCSS and integrated with Angular Material for filters (`MatButtonToggleModule`, `MatDatepickerModule`, `MatNativeDateModule`) and cards (`MatCardModule`, `MatIconModule`).
- **Rationale**: 
  - Adheres strictly to Principle II (Minimal Dependencies) and user rules.
  - Adding charting libraries like Chart.js or D3 increases bundle size significantly, introduces third-party lifecycle quirks, and is unnecessary for clean 2D stacked bar charts.
  - Native SVG with dynamic `viewBox` is lightweight, sharp at any DPI, natively reactive to Angular signals/RxJS, and easy to unit test without DOM canvas mock hacks.
- **Alternatives considered**:
  - `chart.js` / `ng2-charts`: Heavyweight (~150KB+), requires canvas context which complicates headless Vitest testing.
  - `d3`: Steep dependency graph, imperative API that fights against Angular's declarative change detection.
  - Pure CSS flexbox bars: Difficult to align with precise Cartesian coordinate axes and SVG gridlines.

## Historical Earnings Data Sourcing & Aggregation

- **Decision**: 
  - PocketDiscipline tracks earnings across four distinct disciplines:
    1. **Goals**: Table `goals` already records `completedAt` timestamp and `rewardValue`.
    2. **Daily Scores**: Table `dailyScores` already records `date` (`YYYY-MM-DD`) and `rewardEarned`.
    3. **Pomodoro Sessions**: Table `pomodoroSessions` already records `startTime` timestamp and `rewardEarned`.
    4. **Daily Tasks**: Currently, `dailyTasks` only stores `lastCompletedAt`, which overwrites previous completion times on repeat completions. To maintain an accurate historical log for the daily chart, bump `DbService` schema to `version(6)` adding a `dailyTaskCompletions` table (`id, date, taskId, rewardEarned, completedAt`), and record each completion in `DailyTasksService.completeTask`.
  - Provide a dedicated `DashboardEarningsService` in the dashboard vertical slice that queries the active date interval across these four tables and aggregates them into `DailyEarningsRecord` objects with source breakdown.
- **Rationale**:
  - Leverages existing Dexie tables for Goals, Scores, and Pomodoro without duplicating data.
  - Solves the historical tracking gap for Daily Tasks cleanly via a lightweight Dexie table.
  - Consolidating aggregation logic in `DashboardEarningsService` keeps components purely presentation-focused (SRP).
- **Alternatives considered**:
  - Full unified transaction ledger for all rewards: Would require migrating existing historical data from all four tables into a single ledger and updating all existing services.
  - Only charting Pomodoro and Daily Scores: Incomplete and violates user requirement SC-002 that 100% of user reward earnings are tallied.

## Date Range, Calendar Calculations & Timezone Handling

- **Decision**: 
  - Standardize on ISO date strings (`YYYY-MM-DD`) using local timezone (`en-CA` locale, matching `DailyScoresService`).
  - For preset ranges (`last7`, `last14`, `last30`): calculate start date by subtracting $(N - 1)$ days from the current local date, ensuring $N$ total consecutive days including today.
  - Every day in the range is explicitly generated in chronological sequence; days with no activities receive 0 earnings.
  - For monthly average daily earnings:
    - Current in-progress month: Denominator is elapsed days to date (e.g. if today is September 2nd, denominator is 2).
    - Completed past months: Denominator is the total number of calendar days in that month (e.g., 30 for April, 31 for January, 28/29 for February).
    - Future months: Earnings are 0, average is 0.
- **Rationale**:
  - Consistent date formatting prevents off-by-one errors across daylight saving time transitions and month boundaries.
  - Dividing by elapsed days in the current month provides an actionable and motivating daily velocity metric.
- **Alternatives considered**:
  - Dividing by total days in the month for current month: Artificial depression of daily average at the start of every month.
  - UTC dates: Causes day shifts for users in non-UTC time zones.

## Component Architecture & State Management

- **Decision**: 
  - Structure the dashboard slice under `src/app/features/dashboard/`:
    - `Dashboard` (Container): orchestrates layout and connects services.
    - `BalanceWidgetComponent`: existing balance card.
    - `EarningsChartComponent`: SVG stacked bar chart with tooltips and source legends.
    - `EarningsFilterComponent`: period preset toggle and date range picker.
    - `EarningsStatsComponent`: monthly average daily earnings card with month navigation buttons.
    - `DashboardEarningsService`: reactive data service using RxJS/Dexie live queries or observable streams.
- **Rationale**:
  - Adheres to Vertical Slice Architecture (Principle I).
  - Component separation satisfies Single Responsibility Principle (Principle IV and `docs/code_style.md`).
  - Separates presentation from data fetching and calculation.
