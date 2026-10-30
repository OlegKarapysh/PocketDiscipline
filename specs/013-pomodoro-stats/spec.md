# Feature Specification: Pomodoro Stats

**Feature Branch**: `[013-pomodoro-stats]`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "pomodoro-stats: show today's pomodoro state and statistics on the Pomodoro page. A "Today" card shows how many pomodoros were completed today, split by engagement type (work / study), total focused minutes and the reward earned today. A completed session counts on the local day its endTime falls on (same crediting rule as the Today earnings chart); stopped/cancelled sessions do not count. The card updates live when a session completes. A "History" card shows the same totals for a selectable period (7/14/30 days or custom range via the existing period filter) plus a per-day bar chart of completed pomodoros in a single primary colour, with the work/study split shown in the totals. No schema change: query by the indexed startTime. Layout changes to the timer itself are out of scope here (they amend spec 005-pomodoro-timer)."

## Clarifications

### Session 2026-10-30

- Q: What counts as one pomodoro: one completed session whatever its length, or 25-minute units like the reward tiers? → A: One completed session is one pomodoro, whatever its length; focus time shows how long they were
- Q: How is a custom range longer than 90 days charted? → A: Like the app's other charts: one bar per week, month or year (found while planning; FR-011)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See Today's Pomodoros at a Glance (Priority: P1)

A user opens the Pomodoro page and, next to the timer, sees a Today card: how many pomodoros they have completed today, how many of those were work and how many were study, how long they have focused today, and the reward those pomodoros have earned today. When a session they are running completes, the card counts it straight away.

**Why this priority**: This is the question the user asked: how many pomodoros have I collected today, and of which type. Seeing the day's tally beside the timer is what makes starting the next one worthwhile.

**Independent Test**: With completed work and study sessions earlier today, a session completed yesterday, a session stopped today and a session running now, open the Pomodoro page and check the Today card's counts, focus time and reward. Then let the running session complete and check that the card counts it without a reload.

**Acceptance Scenarios**:

1. **Given** three work sessions of 25 minutes and one study session of 50 minutes completed today, **When** the user opens the Pomodoro page, **Then** the Today card shows 4 pomodoros, split into 3 work and 1 study, a focus time of 2 h 5 min and the sum of the four sessions' rewards.
2. **Given** no session has completed today, **When** the user opens the Pomodoro page, **Then** the Today card shows zero for the total, for each engagement type, for focus time and for the reward, with a short line inviting the user to start their first pomodoro of the day.
3. **Given** the Pomodoro page is open and a session is running, **When** the session completes, **Then** the Today card includes it without the user reloading or leaving the page.
4. **Given** a session was stopped before it finished today, and another session is still running, **When** the user looks at the Today card, **Then** neither of them is counted.
5. **Given** a session started at 23:45 yesterday and completed at 00:10 today, **When** the user looks at the Today card, **Then** the session counts towards today.

---

### User Story 2 - Review Pomodoro History over a Period (Priority: P2)

Below the Today card, a History card lets the user pick a period: the last 7, 14 or 30 days, or a custom date range, with the same period control the Today and Daily scores pages use. For that period it shows the same totals as the Today card (pomodoros, the work and study split, focus time, reward earned) and a bar chart with one bar per day, so the user can see which days were productive and spot gaps.

**Why this priority**: Today's tally answers the immediate question. The history turns it into a habit the user can watch over weeks, but the feature is already useful without it.

**Independent Test**: With completed sessions spread over the last 30 days, including days with none, open the Pomodoro page and switch the History period between 7, 14 and 30 days and a custom range. Check the totals and each day's bar against the recorded sessions.

**Acceptance Scenarios**:

1. **Given** completed sessions on several of the last 7 days, **When** the user opens the Pomodoro page, **Then** the History card shows the last 7 days including today, its totals equal the sums over those 7 days, and the chart has one position per day in date order with each bar's height matching that day's pomodoros.
2. **Given** the History card is showing 7 days, **When** the user selects 30 days, **Then** the totals and the chart cover the last 30 days including today.
3. **Given** the user selects a custom range, **When** the range is applied, **Then** the totals and the chart cover exactly that range, its first and last days included.
4. **Given** a day in the period with no completed session, **When** the chart is shown, **Then** that day has no bar but keeps its position on the axis.
5. **Given** the chart is shown, **When** the user taps a day (or points at it with a mouse), **Then** the app shows that day's date, its pomodoros and their work and study split.
6. **Given** no session completed in the selected period, **When** the History card is shown, **Then** its totals are zero and the chart area says that no pomodoros were completed in this period.
7. **Given** the selected period includes today and the page is open, **When** a session completes, **Then** the History totals and today's bar include it without a reload.

---

### Edge Cases

- **Crossing midnight**: A session counts on the day it was recorded as completed, not the day it started.
- **Completed while the app was closed**: A session whose time ran out while the app was closed is completed when the app is next opened, and counts on that day. This is also the day its reward appears in the Today page's earnings, so the two pages never disagree.
- **No recorded completion time**: A completed session without a recorded completion time (possible in older or imported history) counts on the day it started.
- **Page left open across midnight**: At local midnight, and when the app returns to the foreground on a later day, the Today card switches to the new day (zero until a session completes) and the History presets move forward to end on the new day.
- **Imported history**: Sessions written by the jar import count like any other completed session.
- **Long custom range**: A custom range of more than 90 days shows one bar per week, month or year (FR-011), and the totals still cover every day of the range.
- **Large figures**: Twenty or more pomodoros in a day, several hundred in a 30-day period, a focus time above 100 hours and a seven-digit reward all stay readable on a 360px-wide phone.
- **Engagement type with no sessions**: Every engagement type appears in the split, even with zero, so the split always reads as a complete breakdown.
- **Reward rate changed later**: Each session contributes the reward it actually earned when it completed, not what the current rate would pay.

## Requirements _(mandatory)_

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.
- **AC-004**: Any UI MUST follow `docs/design_system.md`: shared components first, theme and token layer only.

### Functional Requirements

- **FR-001**: The Pomodoro page MUST show a Today card with, for the current local day: the number of pomodoros completed, the number for each engagement type, the total focus time and the total reward those sessions earned. Each completed session counts as one pomodoro, whatever its duration.
- **FR-002**: A completed session MUST count on the local calendar day on which it was recorded as completed, which is the day its reward is credited in the Today page's earnings. A completed session with no recorded completion time MUST count on the day it started.
- **FR-003**: Stopped sessions and the running session MUST NOT count towards any figure.
- **FR-004**: Focus time MUST be the sum of the durations of the counted sessions, shown in minutes below one hour ("45 min") and in hours and minutes from one hour ("2 h 5 min", or "3 h" when the minutes are zero).
- **FR-005**: Reward figures MUST be shown as earned money in whole hryvnias, the same way the app shows other earnings.
- **FR-006**: The Today and History cards MUST include a session that completes while the page is open, without a reload or navigation.
- **FR-007**: The Today card MUST always refer to the current local day, switching at local midnight and when the app returns to the foreground on a later day.
- **FR-008**: When no session has completed today, the Today card MUST show zero figures and a short invitation to start a pomodoro.
- **FR-009**: The Pomodoro page MUST show a History card with a period selection of the last 7, 14 or 30 days (each ending today, today included) or a custom date range, using the same period control as the Today and Daily scores pages. The default period is the last 7 days.
- **FR-010**: The History card MUST show, for the selected period, the number of pomodoros completed, the number for each engagement type, the focus time and the reward earned, following FR-002 to FR-005.
- **FR-011**: The History card MUST show a bar chart with one position for each day of the selected period in date order, where each bar's height is the number of pomodoros completed that day. All bars MUST use one colour; engagement types are not told apart by colour. A day with no pomodoros has no bar but keeps its position. A period longer than 90 days MUST be drawn with one bar per week, month or year instead, the same way the app's other charts group a long range.
- **FR-012**: Tapping a bar in the chart, or pointing at it with a mouse, MUST show the day or period it covers, its number of pomodoros and their split by engagement type. Touch alone MUST be enough; nothing depends on hover.
- **FR-013**: When no session completed in the selected period, the History card MUST show zero totals and a message that no pomodoros were completed in this period, instead of an empty chart.
- **FR-014**: The Today and History cards MUST stay visible while a timer is running and MUST NOT change how a session is configured, started or stopped.
- **FR-015**: On a phone the cards MUST sit below the timer in a single column; at desktop widths (1280px and wider) they MUST sit beside the timer. Every figure MUST stay readable without horizontal scrolling from 360px wide upwards, with the large figures listed under Edge Cases.
- **FR-016**: The statistics MUST be derived from the pomodoro sessions the app already records, including imported history. The feature MUST NOT add stored data or settings.

### Key Entities

- **Pomodoro Session** _(existing)_: One timed focus block, with its duration, engagement type (work or study), start time, completion time, status (running, completed or stopped) and the reward it earned. Only completed sessions feed the statistics.
- **Pomodoro Tally** _(derived, not stored)_: The figures for a set of days: pomodoros completed (one per completed session), pomodoros per engagement type, focus time and reward earned. The Today card shows the tally for today; the History card shows it for the selected period.
- **Daily Pomodoro Count** _(derived, not stored)_: One calendar day of the selected period with its pomodoros and their split by engagement type. The chart draws one per day.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a 360 × 640 px phone screen, today's pomodoro count and its work and study split are visible as soon as the Pomodoro page opens, without scrolling.
- **SC-002**: For every test history (sessions crossing midnight, stopped and running sessions, sessions without a completion time, imported sessions), the Today and History figures match a manual count of the recorded sessions exactly.
- **SC-003**: For any day, the reward the Pomodoro page shows as earned that day equals the pomodoro share of that day's earnings on the Today page.
- **SC-004**: A session that completes while the page is open appears in the Today card within 1 second of the completion being announced to the user.
- **SC-005**: With two years of daily use recorded (about 3,000 sessions), switching the History period shows the new totals and chart within 1 second.
- **SC-006**: The Pomodoro page passes the responsive layout audit at every reference width from 360px to 1920px, in light and dark themes, with the large figures listed under Edge Cases.

## Assumptions

- The compact timer layout (engagement type control, duration stepper and a start button that shows the reward) is specified as an amendment to spec 005-pomodoro-timer. SC-001 relies on it: the current timer layout fills a phone screen on its own.
- The statistics appear only on the Pomodoro page. The Today page and Daily scores page show no new figures.
- The history chart looks and behaves like the charts on the Today and Daily scores pages, because all three are drawn by one shared chart. Moving those two charts onto it is part of this work and leaves their behaviour unchanged, except that the Daily scores chart becomes 20px taller to match the others.
- The engagement types are work and study. The split lists every type, so a type added later appears in it without further change.
- The period control behaves as it does on the Today and Daily scores pages: presets end today, a custom range cannot end after today, and the chosen period is not remembered between visits.
- Out of scope: a list of today's individual sessions, pomodoro streaks or daily targets, comparison with a previous period, editing or deleting sessions, and figures about stopped sessions.
