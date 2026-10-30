# Feature Specification: Pomodoro Timer

**Feature Branch**: `[005-pomodoro-timer]`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "new feature: pomodorro timer. I want to have an ability to start a pomodorro timer with a specified time (default is 25 minutes) and a specified engagement (work, study). when the timer fires, a user sees a pop-up dialog which informs about the completed pomodorro and the reward. Reward is added to the current balance. Reward is determined by the time spent and the type of engagement. The pomodorro timer feature should have a separate tab in the menu"

## Clarifications

### Session 2026-08-26

- Q: Session History Persistence → A: Persist completed sessions to a history log (database)
- Q: Background Behavior → A: Use OS local notifications to alert the user when the timer fires if the app is backgrounded/closed, calculating elapsed time upon reopen
- Q: Timer Limits → A: Minimum 15 minutes, Maximum 120 minutes, Step 5 minutes

### Session 2026-10-30

- Q: Page layout → A: The timer fills a phone screen on its own, so the page is made compact (User Story 3) to leave room for the statistics of spec 013-pomodoro-stats below it
- Q: Duration control → A: Decrease and increase buttons in 5-minute steps instead of a typed number; the 15–120 minute range of FR-002 is unchanged
- Q: Engagement type control → A: Both types visible side by side and chosen with one tap, instead of a dropdown
- Q: Quick actions button over a page that scrolls (found implementing spec 013, whose History card makes the page scroll) → A: The standard floating-button rule: nothing covered on the first screen or at the bottom of the page; content may pass beneath the button while scrolling, as on the Today and Daily scores pages
- Q: Base rewards → A: FR-005 names the default rates the app ships with, 100 ₴ for work and 125 ₴ for study, which Settings can change; the 25 and 20 points it stated before predate those rates

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start and Complete a Pomodoro (Priority: P1)

As a user, I want to start a Pomodoro timer for a specific duration and engagement type, so that I can focus on my task and earn a reward upon completion.

**Why this priority**: This is the core functionality of the feature, providing the primary user value of focused time management and gamified rewards.

**Independent Test**: Can be fully tested by navigating to the Pomodoro tab, starting a timer, waiting for it to finish, and verifying the completion dialog and reward addition.

**Acceptance Scenarios**:

1. **Given** the user is on the Pomodoro tab, **When** they start a timer with the default 25 minutes for "work", **Then** the timer counts down.
2. **Given** an active timer finishes, **When** the time reaches zero, **Then** a pop-up dialog appears showing the completed Pomodoro and the calculated reward.
3. **Given** the completion dialog is dismissed, **When** the user checks their balance, **Then** the reward has been added to their current balance.

---

### User Story 2 - Configure Timer Settings (Priority: P2)

As a user, I want to select different durations and engagement types before starting the timer, so that I can tailor the session to my specific needs and tasks.

**Why this priority**: Users need flexibility for different tasks (e.g., short study sessions vs. long deep work).

**Independent Test**: Can be fully tested by changing the duration and engagement inputs before starting the timer.

**Acceptance Scenarios**:

1. **Given** the user is on the Pomodoro tab, **When** they adjust the duration and select "study" as the engagement, **Then** the timer starts with the newly selected configuration.

---

### User Story 3 - Compact Pomodoro Page (Priority: P2)

As a user on a phone, I want the timer, its settings and the start button grouped together at the top of the Pomodoro page, so that I can set up and start a session in a few taps and still see my pomodoro statistics on the same screen.

**Why this priority**: The original layout centres the timer, the start button and two stacked form fields in the middle of the screen, which fills a phone on its own. Typing the duration also opens the keyboard. The statistics of spec 013-pomodoro-stats need the space this frees.

**Independent Test**: On a 360 × 640 px phone screen, open the Pomodoro page, change the engagement type and the duration with taps only, check the reward shown on the start button, start a session, check the running state, then stop it.

**Acceptance Scenarios**:

1. **Given** the user opens the Pomodoro page, **When** it loads, **Then** the timer, the engagement type, the duration and the start button are grouped in one card directly below the page title, with no empty band above them.
2. **Given** no session is running, **When** the user taps "study", **Then** study is selected in one tap, with "work" visible beside it, and no list opens.
3. **Given** the duration is 25 minutes, **When** the user taps the increase button, **Then** the duration becomes 30 minutes and the timer shows 30:00, without the keyboard opening.
4. **Given** the duration is 120 minutes, **When** the user looks at the increase button, **Then** it is disabled; likewise the decrease button at 15 minutes.
5. **Given** a work session of 50 minutes is configured, **When** the user looks at the start button, **Then** it shows the reward that session will pay at the current rates, and the reward changes as soon as the duration or engagement type changes.
6. **Given** a session is running, **When** the user looks at the card, **Then** the settings are replaced by a single line naming the running session's engagement type and duration, and the stop button is in the start button's place, styled as a destructive action.

---

### Edge Cases

- What happens when the user navigates to another tab while the timer is running?
- **App Backgrounding/Closure**: If the app is closed or backgrounded while a timer is active, the system MUST schedule an OS local notification to alert the user when the timer fires. Upon reopening, the app calculates elapsed time to resume the timer state accurately.
- What happens if a user stops or cancels the timer before it finishes?
- **Quick actions button**: On a phone, the floating quick actions button must not cover any control or figure on the Pomodoro page's first screen, and scrolling to the bottom of the page must bring everything clear of it.
- **Restoring after a reload**: While a session left running before a reload is being restored, the start button stays disabled, as it does today.

## Requirements _(mandatory)_

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.
- **AC-004**: Any UI MUST follow `docs/design_system.md`: shared components first, theme and token layer only.

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated "Pomodoro" tab in the main navigation menu.
- **FR-002**: The system MUST allow users to start a timer with a configurable duration (minimum 15 minutes, maximum 120 minutes, in 5-minute increments), defaulting to 25 minutes.
- **FR-003**: The system MUST allow users to select an engagement type (e.g., "work", "study") before starting the timer.
- **FR-004**: The system MUST visually display the remaining time while the timer is active.
- **FR-005**: The system MUST calculate a reward for fully completed timer sessions based on duration. The base reward is the rate set in Settings for the session's engagement type, by default 100 ₴ for work and 125 ₴ for study. The final reward scales as follows (rounding drops any decimal part):
  - 15 to 24 minutes: 0.5x base reward
  - 25 to 45 minutes: 1x base reward
  - 50 to 75 minutes: 2x base reward
  - 80 to 120 minutes: 3x base reward
- **FR-006**: The system MUST display a pop-up dialog when the timer completes, informing the user of the successful Pomodoro and the earned reward.
- **FR-007**: The system MUST add the earned reward to the user's current balance upon completion.
- **FR-008**: The system MUST NOT grant any reward if the user cancels a running timer before completion; the timer state resets entirely.
- **FR-009**: The Pomodoro page MUST group the timer, the engagement type, the duration and the start or stop button in one card that starts directly below the page title.
- **FR-010**: The engagement type MUST be chosen with one tap from options that are all visible at once.
- **FR-011**: The duration MUST be changed with decrease and increase buttons in 5-minute steps within the range of FR-002, without typing. Each button MUST be disabled at its end of the range.
- **FR-012**: The start button MUST show the reward the configured session will pay at the current rates (FR-005 and the rates set in Settings), updated whenever the duration or engagement type changes.
- **FR-013**: While a session is running, the engagement type and duration controls MUST be replaced by one line naming the running session's engagement type and duration, and the stop button MUST take the start button's place, styled as a destructive action. When no session is running, the card MUST NOT show a separate status line.
- **FR-014**: The floating quick actions button MUST NOT cover any control or figure on the Pomodoro page's first screen, before it is scrolled. Content may scroll beneath the button, as on every other page, but scrolled to the bottom nothing is left under it, so every control and figure can be brought clear of it.
- **FR-015**: On a phone, the start button MUST span the card's full width. At desktop widths (1280px and wider), the card MUST leave room beside it for the statistics of spec 013-pomodoro-stats.

### Key Entities

- **PomodoroSession**: Represents a focused time block, attributes include duration, engagement type, status (active, completed, cancelled), and calculated reward. Completed sessions are persisted to a history log in the database.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can successfully start, run, and complete a Pomodoro timer without errors.
- **SC-002**: Reward balance correctly increases by the exact calculated amount upon timer completion.
- **SC-003**: The timer runs accurately in relation to real-world time.
- **SC-004**: On a 360 × 640 px phone screen, the timer card fits on the first screen of the Pomodoro page with room left below it for the Today card of spec 013-pomodoro-stats.
- **SC-005**: Any duration in the range can be configured with taps only, and the keyboard never opens on the Pomodoro page.
- **SC-006**: The Pomodoro page passes the responsive layout audit at every reference width from 360px to 1920px, in light and dark themes.

## Assumptions

- Users have an existing "current balance" as part of the app's gamification or tracking system.
- The engagement types "work" and "study" are a predefined list, though the UI should allow for future expansion.
