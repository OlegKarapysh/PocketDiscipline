# Feature Specification: Dashboard Earnings Chart and Statistics

**Feature Branch**: `007-dashboard-earnings-stats`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "i want to see a chart showing how much money was earned each day (for the last 7 days by default, but the date range or period can be selected) and also statistics about average amount of money earned per day in the current month (or other month). This information should be should displayed on the Dashboard tab"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Daily Earnings Chart for Default Period (Priority: P1)

As a disciplined user opening my Dashboard, I want to immediately see a visual stacked bar chart showing how much money (reward points) I earned each day over the last 7 days, categorized by activity source, so that I can quickly assess my recent productivity and earning momentum.

**Why this priority**: Delivers the primary visual insight requested by the user directly on the Dashboard, providing immediate feedback on daily discipline and accomplishments.

**Independent Test**: Can be tested independently by logging in with existing activity data and verifying that the Dashboard tab displays a 7-day chronological stacked bar chart showing the correct earnings for each day (including 0 for days without earnings), categorized by source (Goals, Tasks, Pomodoro, Daily Scores).

**Acceptance Scenarios**:

1. **Given** the user navigates to the Dashboard tab, **When** the page loads, **Then** a stacked bar chart is displayed showing daily earnings for the last 7 days by default.
2. **Given** the user earned 1,500 on day 1 (from Goals), 0 on day 2, and 500 on day 3 (from Pomodoro), **When** viewing the chart, **Then** all 7 consecutive days are represented in chronological order with exact heights/values corresponding to their daily earnings and color-coded by source.
3. **Given** the user hovers or taps on a specific day in the chart, **When** inspected, **Then** a tooltip or details label displays the exact date, total daily earnings, and amount contributed by each activity source.

---

### User Story 2 - Filter Earnings Chart by Period or Date Range (Priority: P2)

As a user tracking my long-term discipline trends, I want to change the date range or time period displayed in the earnings chart using quick presets (Last 7 Days, Last 14 Days, Last 30 Days) or a custom date range picker, so that I can analyze my performance over different historical windows.

**Why this priority**: Enables flexibility beyond the 7-day default so users can evaluate trends across fortnights, months, or custom date spans.

**Independent Test**: Can be tested by selecting different preset periods or a custom date range and verifying that the chart updates to show precisely the selected date range.

**Acceptance Scenarios**:

1. **Given** the user is viewing the 7-day default chart on the Dashboard, **When** the user selects a different preset period (e.g., Last 14 Days or Last 30 Days), **Then** the chart immediately refreshes to display daily earnings across the newly selected period.
2. **Given** the user selects the custom date range option and specifies a start date and end date, **When** applied, **Then** the chart displays daily earnings for every date within that interval in chronological order.
3. **Given** a period selection with no earnings in the selected range, **When** rendered, **Then** the chart displays zero values for each day without crashing or showing error messages.

---

### User Story 3 - View Average Daily Earnings for Current and Selected Months (Priority: P2)

As a user monitoring my monthly consistency, I want to see a statistics summary showing my average amount of money earned per day in the current month (calculated using days elapsed to date), as well as toggle to view any past month (calculated using full calendar days), so that I can track whether my daily earning rate is improving month-over-month.

**Why this priority**: Provides high-level statistical synthesis that complements the day-by-day chart, fulfilling the user's specific request for monthly average statistics.

**Independent Test**: Can be tested by viewing the statistics card for the current month and toggling to previous months to verify that the daily average calculation is mathematically accurate for each month.

**Acceptance Scenarios**:

1. **Given** the user is on the Dashboard tab, **When** viewing the statistics section for the current month, **Then** the average amount of money earned per day is calculated using elapsed days (Day 1 through current day) as the denominator and displayed clearly.
2. **Given** the user selects or navigates to a previous calendar month, **When** the statistics update, **Then** the daily average is calculated using the total number of calendar days in that month (e.g., 28, 30, or 31) and displayed alongside the month's total earnings.
3. **Given** a selected month has zero earnings, **When** viewing the statistics for that month, **Then** the average daily earnings is displayed as 0 with a friendly empty indicator.

---

### User Story 4 - Detailed Breakdown of Daily Earnings by Source (Priority: P2)

As an analytical user, I want to see which discipline activities contributed to each day's earnings, so that I know whether my earnings came from goals, daily tasks, pomodoro sessions, or daily scores.

**Why this priority**: Directly tied to the stacked bar chart visualization, allowing users to understand the composition of their daily productivity.

**Independent Test**: Can be tested by completing different activity types on the same day and checking the stacked chart bars and tooltips.

**Acceptance Scenarios**:

1. **Given** the user earned money from multiple sources on a single day (e.g. Goals, Daily Tasks, Pomodoro, and Daily Scores), **When** viewing that day on the chart, **Then** each source is represented as a distinct segment in the stacked bar with dedicated color coding and accessible labels in the tooltip.

---

### Edge Cases

- **Zero-earning days**: If no activity occurred on a given day within the active range, the chart must render a 0-value bar rather than omitting the date, maintaining accurate temporal scale.
- **In-progress (current) month daily average calculation**: On Day 1 of the month, the denominator is 1. As days advance, the denominator increments by 1 each day (Day N = N days elapsed), preventing artificial depression of early-month daily averages.
- **Leap years and varying month lengths**: Month transitions (February with 28/29 days, 30-day vs 31-day months) must accurately adjust the number of days for completed month averages.
- **Future dates & months**: If a custom date range extends into the future, future days must display 0 earnings without skewing historical data. Month navigation controls must disable navigating beyond the current calendar month.
- **First-time / new user with zero records**: Dashboard must render zero states cleanly without NaN, undefined, or broken layout.

## Requirements *(mandatory)*

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.

### Functional Requirements

- **FR-001**: Dashboard MUST display a visual chart representing total money/rewards earned per day.
- **FR-002**: Daily earnings chart MUST display the last 7 days by default upon loading the Dashboard.
- **FR-003**: Dashboard MUST provide controls allowing the user to select the chart period, including quick presets (Last 7 Days, Last 14 Days, Last 30 Days) and a custom date range picker (start and end date).
- **FR-004**: Each day within the selected period MUST be displayed chronologically, showing zero if no rewards were earned on that day.
- **FR-005**: Interacting with or hovering over a chart point or bar MUST display the exact date, total earnings, and breakdown per activity source.
- **FR-006**: Dashboard MUST display a statistics card showing the average money earned per day for the current calendar month.
- **FR-007**: Monthly average daily earnings for the current (in-progress) month MUST be calculated using days elapsed so far in the month (Day 1 through current day) as the denominator. For completed past months, the denominator MUST be the total number of calendar days in that month.
- **FR-008**: Users MUST be able to navigate to prior calendar months using month navigation controls (with navigation into future months disabled when on the current month) to view average daily earnings and total earnings for that chosen month.
- **FR-009**: Daily earnings chart MUST present a stacked bar chart displaying each day's earnings broken down by activity source (Goals, Daily Tasks, Pomodoro Sessions, and Daily Scores) with distinct color coding, alongside the daily aggregate total.
- **FR-010**: When a month or period with no earnings is selected, the statistics and chart MUST gracefully display zero earnings without errors or NaN values.

### Key Entities *(include if feature involves data)*

- **DailyEarningsRecord**: Represents aggregated earnings for a single calendar date. Attributes include: `date` (calendar date YYYY-MM-DD), `totalEarned` (number), and breakdown by source:
  - `goalsEarned`: number
  - `dailyTasksEarned`: number
  - `pomodoroEarned`: number
  - `dailyScoresEarned`: number
- **MonthlyEarningsSummary**: Represents aggregate metrics for a calendar month. Attributes include: `year` (number), `month` (number 1-12), `monthLabel` (string e.g. "September 2026"), `totalEarned` (number), `daysCount` (number of days evaluated: elapsed days for current month, full month days for past months), `averageEarnedPerDay` (number, rounded to nearest integer), and `isCurrentMonth` (boolean).
- **EarningsPeriodFilter**: Represents the active time window for chart display. Attributes include: `preset` (`'last7'` | `'last14'` | `'last30'` | `'custom'`), `startDate` (string YYYY-MM-DD), and `endDate` (string YYYY-MM-DD).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their last 7 days of earnings within 1 second of loading the Dashboard tab.
- **SC-002**: 100% of user reward earnings (from all completed tasks, goals, scores, and sessions) are accurately tallied and reflected in the daily chart and monthly statistics without discrepancy.
- **SC-003**: Switching between preset periods or selecting a custom date range updates the chart presentation immediately (under 200 milliseconds).
- **SC-004**: Users can switch to any prior or current month and view the corresponding average daily earnings with 100% mathematical accuracy.
- **SC-005**: Days with zero earnings are visually identifiable on the chart to clearly convey non-earning days without skipping calendar dates.

## Assumptions

- "Money earned" corresponds directly to the virtual reward points/balance gained through discipline actions across all app modules (Goals, Daily Tasks, Pomodoro Sessions, Daily Scores).
- Calendar days and months are computed using the user's local timezone.
- For past months, average daily earnings is computed as the total earnings of that month divided by the total number of calendar days in that month.
- For the current month, average daily earnings is computed as total earnings divided by elapsed days to date (minimum 1 day).
- Initial dashboard load defaults to the last 7 calendar days up to and including the current day.
