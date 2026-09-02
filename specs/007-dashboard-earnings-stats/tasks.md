# Tasks: Dashboard Earnings Chart and Statistics

**Input**: Design documents from `specs/007-dashboard-earnings-stats/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/ui-and-service-contracts.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task includes exact file paths

---

## Phase 1: Setup (Shared Infrastructure & Models)

**Purpose**: Establish domain models and type definitions for the dashboard earnings vertical slice.

- [x] T001 [P] Create `EarningsSource` enum in `src/app/features/dashboard/models/earnings-source.enum.ts`
- [x] T002 [P] Create `DailyEarningsRecord` interface in `src/app/features/dashboard/models/daily-earnings-record.model.ts`
- [x] T003 [P] Create `MonthlyEarningsSummary` interface in `src/app/features/dashboard/models/monthly-earnings-summary.model.ts`
- [x] T004 [P] Create `EarningsPeriodFilter` interface and preset types in `src/app/features/dashboard/models/earnings-period-filter.model.ts`
- [x] T005 [P] Create `DailyTaskCompletion` interface in `src/app/features/daily-tasks/models/daily-task-completion.model.ts`

---

## Phase 2: Foundational (Database Upgrade & Aggregation Service)

**Purpose**: Core storage and calculation infrastructure that MUST be complete before UI user stories can be implemented.

**⚠️ CRITICAL**: Blocking prerequisite for all user stories.

- [x] T006 Bump Dexie schema to `version(6)` adding `dailyTaskCompletions` table in `src/app/core/services/db.service.ts`
- [x] T007 Record `DailyTaskCompletion` entry within `completeTask` in `src/app/features/daily-tasks/services/daily-tasks.service.ts`
- [x] T008 Update daily tasks unit tests for completion persistence in `src/app/features/daily-tasks/services/daily-tasks.service.spec.ts`
- [x] T009 [P] Create unit test suite for `DashboardEarningsService` in `src/app/features/dashboard/services/dashboard-earnings.service.spec.ts`
- [x] T010 Implement `DashboardEarningsService` for Dexie queries and daily/monthly aggregation in `src/app/features/dashboard/services/dashboard-earnings.service.ts`

**Checkpoint**: Foundation ready - data retrieval and monthly calculations are functional and testable.

---

## Phase 3: User Story 1 - View Daily Earnings Chart for Default Period (Priority: P1) 🎯 MVP

**Goal**: Display a 7-day chronological daily earnings chart on the Dashboard tab by default upon load.

**Independent Test**: Open the Dashboard with existing activity data and verify that a 7-day chart renders consecutive daily earnings accurately with zero errors.

- [x] T011 [P] [US1] Create unit test suite for `EarningsChartComponent` in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.spec.ts`
- [x] T012 [US1] Implement SVG bar rendering logic and signals in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.ts`
- [x] T013 [US1] Implement SVG template with viewBox, coordinate grid, and bars in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.html`
- [x] T014 [US1] Implement SCSS styles for chart grid and axis labels in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.scss`
- [x] T015 [US1] Integrate `EarningsChartComponent` and default 7-day data stream in `src/app/features/dashboard/dashboard.ts` and `src/app/features/dashboard/dashboard.html`
- [x] T016 [US1] Update dashboard tests for earnings chart integration in `src/app/features/dashboard/dashboard.spec.ts`

**Checkpoint**: User Story 1 is functional as an MVP delivering immediate daily earnings visualization on the Dashboard.

---

## Phase 4: User Story 2 - Filter Earnings Chart by Period or Date Range (Priority: P2)

**Goal**: Enable switching between presets (Last 7 Days, Last 14 Days, Last 30 Days) and picking custom start/end date ranges.

**Independent Test**: Toggle presets and select a custom range; verify the chart dynamically updates to show precisely the selected date window.

- [x] T017 [P] [US2] Create unit test suite for `EarningsFilterComponent` in `src/app/features/dashboard/components/earnings-filter/earnings-filter.component.spec.ts`
- [x] T018 [US2] Implement filter presets and date range picker logic in `src/app/features/dashboard/components/earnings-filter/earnings-filter.component.ts`
- [x] T019 [US2] Implement HTML template with button toggle group and date range inputs in `src/app/features/dashboard/components/earnings-filter/earnings-filter.component.html`
- [x] T020 [US2] Implement SCSS styles for filter controls in `src/app/features/dashboard/components/earnings-filter/earnings-filter.component.scss`
- [x] T021 [US2] Connect `EarningsFilterComponent` filter events to `DashboardEarningsService` query stream in `src/app/features/dashboard/dashboard.ts` and `src/app/features/dashboard/dashboard.html`

**Checkpoint**: User Stories 1 AND 2 work independently, allowing users to browse any historical date range.

---

## Phase 5: User Story 3 - View Average Daily Earnings for Current and Selected Months (Priority: P2)

**Goal**: Display monthly average daily earnings card (elapsed days for current month, full calendar days for past months) with month navigation.

**Independent Test**: Check the current month card showing elapsed-day daily average, and navigate to prior months verifying full-month daily average calculations.

- [x] T022 [P] [US3] Create unit test suite for `EarningsStatsComponent` in `src/app/features/dashboard/components/earnings-stats/earnings-stats.component.spec.ts`
- [x] T023 [US3] Implement monthly statistics display and navigation logic in `src/app/features/dashboard/components/earnings-stats/earnings-stats.component.ts`
- [x] T024 [US3] Implement HTML template with card layout, month navigation buttons, and average stats in `src/app/features/dashboard/components/earnings-stats/earnings-stats.component.html`
- [x] T025 [US3] Implement SCSS styles for monthly statistics card in `src/app/features/dashboard/components/earnings-stats/earnings-stats.component.scss`
- [x] T026 [US3] Integrate `EarningsStatsComponent` into `src/app/features/dashboard/dashboard.ts` and `src/app/features/dashboard/dashboard.html`

**Checkpoint**: User Story 3 operates independently, providing monthly velocity metrics and multi-month navigation.

---

## Phase 6: User Story 4 - Detailed Breakdown of Daily Earnings by Source (Priority: P2)

**Goal**: Render color-coded stacked bar segments and hover/tap tooltips detailing earnings from Goals, Tasks, Pomodoro, and Daily Scores.

**Independent Test**: Hover or focus on bars with multi-source earnings and verify distinct segments and accurate tooltip details.

- [x] T027 [US4] Implement hover position calculation and tooltip state signals in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.ts`
- [x] T028 [US4] Add interactive tooltip card and color-coded category legend in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.html`
- [x] T029 [US4] Style stacked segments, tooltips, and legend swatches in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.scss`
- [x] T030 [US4] Add unit tests verifying stacked segment coordinate calculation and tooltip values in `src/app/features/dashboard/components/earnings-chart/earnings-chart.component.spec.ts`

**Checkpoint**: All 4 user stories are fully implemented, providing rich breakdown and intuitive interaction.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, responsive UI adjustments, linting, and end-to-end verification.

- [x] T031 [P] Update database schema documentation in `docs/schema.md` to document `dailyTaskCompletions` table
- [x] T032 Polish dashboard responsive layout, spacing, and mobile cards in `src/app/features/dashboard/dashboard.scss`
- [x] T033 Run lint check with `npm run lint` and verify zero ESLint/Prettier errors
- [x] T034 Run unit test suite with `npm test` and verify all tests pass
- [x] T035 Execute manual validation following `specs/007-dashboard-earnings-stats/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories.
- **User Stories (Phases 3-6)**: Depend on Phase 2 completion.
  - US1 (Phase 3) provides the core MVP chart.
  - US2 (Phase 4), US3 (Phase 5), and US4 (Phase 6) extend the core chart and dashboard with filtering, statistics, and tooltips.
- **Polish (Phase 7)**: Depends on completion of all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational (Phase 2). No dependencies on other user stories.
- **User Story 2 (P2)**: Starts after US1 chart component exists.
- **User Story 3 (P2)**: Starts after Foundational (Phase 2). Can proceed in parallel with US1/US2.
- **User Story 4 (P2)**: Enhances US1 chart with stacked segments and tooltips.

---

## Parallel Opportunities

```bash
# Phase 1 parallel models:
Task: "T001 Create EarningsSource enum in src/app/features/dashboard/models/earnings-source.enum.ts"
Task: "T002 Create DailyEarningsRecord interface in src/app/features/dashboard/models/daily-earnings-record.model.ts"
Task: "T003 Create MonthlyEarningsSummary interface in src/app/features/dashboard/models/monthly-earnings-summary.model.ts"
Task: "T004 Create EarningsPeriodFilter interface in src/app/features/dashboard/models/earnings-period-filter.model.ts"
Task: "T005 Create DailyTaskCompletion interface in src/app/features/daily-tasks/models/daily-task-completion.model.ts"

# Phase 2 parallel test creation:
Task: "T009 Create unit test suite for DashboardEarningsService in src/app/features/dashboard/services/dashboard-earnings.service.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Models).
2. Complete Phase 2 (Database upgrade & `DashboardEarningsService`).
3. Complete Phase 3 (`EarningsChartComponent` with default 7-day view).
4. **Validate MVP**: Confirm 7-day daily earnings appear on Dashboard tab.

### Incremental Enhancements
1. Add Phase 4 (Period Presets & Custom Date Picker).
2. Add Phase 5 (Monthly Average Card & Month Navigation).
3. Add Phase 6 (Stacked Bar Attribution & Tooltips).
4. Complete Phase 7 (Documentation, Linting, Full Verification).

---

## Phase 8: Convergence

- [x] T036 Disable next-month navigation button when on current month and guard against future month navigation in `src/app/features/dashboard/components/earnings-stats/earnings-stats.component.ts` and `earnings-stats.component.html` per FR-008 (partial)
- [x] T037 Add friendly empty indicator when selected month has zero earnings in `src/app/features/dashboard/components/earnings-stats/earnings-stats.component.html` and `earnings-stats.component.scss` per US3/AC3 (partial)
