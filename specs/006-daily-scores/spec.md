# Feature Specification: daily-scores

**Feature Branch**: `[###-daily-scores]`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "new feature: daily scores. User should be able to set a daily score from 1 to 10 each day. The daily scores information must be displayed on a separate tab. Every day only one daily score can be set. High daily score gives a reward: 9 gives 100₴, 10 gives 500₴. The reward increases by +10%  up to 100% for each high daily score in a row (the same incremental reward as daily tasks have). The new tab also should also display the average score for the days in the current month, a chart with scores for the current week and the current streak"

## Clarifications

### Session 2026-08-28
- Q: Should the 21:30 reminder rely entirely on the local device or use a backend push server? → A: Local device scheduling (simpler, no backend needed, aligns with local Dexie DB architecture)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set Daily Score (Priority: P1)

As a user, I want to set a daily score from 1 to 10 once per day, so that I can track my daily performance.

**Why this priority**: Core functionality of the feature. Without setting a score, other features like statistics and rewards cannot function.

**Independent Test**: Can open the daily scores tab and submit a score for today.

**Acceptance Scenarios**:

1. **Given** a new day with no score set, **When** the user opens the daily scores tab, **Then** they see an option to set a score from 1 to 10.
2. **Given** a score has already been set today, **When** the user opens the daily scores tab, **Then** they see today's score and cannot change it or set another one.

---

### User Story 2 - Earn Rewards for High Scores (Priority: P1)

As a user, I want to earn rewards for high daily scores (9 or 10) and get a streak multiplier, so that I am motivated to perform well consistently.

**Why this priority**: Core motivation loop described in the requirements. Integrating with the existing reward system is crucial for user engagement.

**Independent Test**: Can submit a high score and see the correct reward applied to the balance.

**Acceptance Scenarios**:

1. **Given** a new day with no streak, **When** the user sets a score of 9, **Then** they receive a base reward of 100₴.
2. **Given** a new day with no streak, **When** the user sets a score of 10, **Then** they receive a base reward of 500₴.
3. **Given** the user has a streak of high scores, **When** they set another high score, **Then** the reward is increased by 10% per consecutive day (up to a maximum of 100% increase).
4. **Given** the user sets a score of 8 or below, **Then** they receive no reward and their streak of high scores is reset.

---

### User Story 3 - View Daily Score Statistics (Priority: P2)

As a user, I want to see my average score for the month, a chart of the last 7 days' scores, and my current streak, so that I can monitor my progress.

**Why this priority**: Important for long-term motivation, but secondary to the core action of setting a score and getting immediate rewards.

**Independent Test**: Can open the daily scores tab and see accurate statistics based on historical data.

**Acceptance Scenarios**:

1. **Given** past daily scores, **When** the user opens the daily scores tab, **Then** they see the correct average score for the current month.
2. **Given** past daily scores, **When** the user opens the daily scores tab, **Then** they see a chart displaying the scores for the last 7 days.
3. **Given** a continuous sequence of days with high scores, **When** the user opens the daily scores tab, **Then** they see their current streak count.

---

### User Story 4 - Daily Reminder (Priority: P2)

As a user, I want to receive a notification at 21:30 if I haven't set my daily score, so that I don't forget to track my performance.

**Why this priority**: Helps with retention and habit building, but is an enhancement on top of the core tracking.

**Independent Test**: Can receive a notification at the scheduled time only if the score hasn't been set.

**Acceptance Scenarios**:

1. **Given** the user has not set a daily score today, **When** the time reaches 21:30, **Then** the app sends a reminder notification.
2. **Given** the user has already set a daily score today, **When** the time reaches 21:30, **Then** no notification is sent.

### Edge Cases

- What happens if the user misses a day? Does it reset the streak of high scores?
- What happens at midnight when the day changes while the app is open?
- How is the start of the week defined for the chart?
- If the device is completely powered off or the browser/app is forcefully killed by the OS, the local notification may not fire. This is an accepted tradeoff of using a local-only architecture.

## Requirements *(mandatory)*

### Architectural Constraints
- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Daily Scores" tab in the application.
- **FR-002**: System MUST allow the user to input a single integer score between 1 and 10 (inclusive) for the current day.
- **FR-003**: System MUST prevent the user from setting more than one score per day or modifying a score once set.
- **FR-004**: System MUST calculate and display the average score for all days in the current calendar month.
- **FR-005**: System MUST display a chart visualizing the daily scores for the last 7 days.
- **FR-006**: System MUST track and display the "current streak" of consecutive days with high scores (9 or 10).
- **FR-007**: System MUST award 100₴ when a score of 9 is set.
- **FR-008**: System MUST award 500₴ when a score of 10 is set.
- **FR-009**: System MUST apply a compounding +10% bonus to the reward for each consecutive day a high score (9 or 10) is achieved, capped at +100%.
- **FR-010**: System MUST reset the current streak to 0 if a day is missed or if a score of 8 or lower is set.
- **FR-011**: System MUST send a notification every day at 21:30 to remind the user to set their daily score if it has not been set for the current day.
- **FR-012**: The notification system MUST use local device scheduling (e.g., Service Worker or local OS alarms) rather than a backend push server.

### Key Entities

- **Daily Score**: Date, Score Value (1-10)
- **Streak**: Current count of consecutive high score days

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully navigate to the new tab and submit a daily score in under 3 clicks.
- **SC-002**: The average score correctly includes all scores from the 1st of the month to the current day.
- **SC-003**: High score rewards and streak bonuses correctly update the user's balance immediately upon submission.
- **SC-004**: The weekly chart accurately plots scores for the past 7 days or current week boundaries.
- **SC-005**: The daily reminder notification is delivered at 21:30 (with >95% reliability) if the score is unset, and reliably suppressed if already set.

## Assumptions

- "High score" for the streak is strictly defined as 9 or 10.
- Missing a day (not setting a score) breaks the high score streak.
- The chart visualization displays a rolling window of the last 7 days.
- The currency symbol ₴ corresponds to the existing reward balance system in the app.
