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

## User Scenarios & Testing *(mandatory)*

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

### Edge Cases

- What happens when the user navigates to another tab while the timer is running?
- **App Backgrounding/Closure**: If the app is closed or backgrounded while a timer is active, the system MUST schedule an OS local notification to alert the user when the timer fires. Upon reopening, the app calculates elapsed time to resume the timer state accurately.
- What happens if a user stops or cancels the timer before it finishes?

## Requirements *(mandatory)*

### Architectural Constraints
- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated "Pomodoro" tab in the main navigation menu.
- **FR-002**: The system MUST allow users to start a timer with a configurable duration (minimum 15 minutes, maximum 120 minutes, in 5-minute increments), defaulting to 25 minutes.
- **FR-003**: The system MUST allow users to select an engagement type (e.g., "work", "study") before starting the timer.
- **FR-004**: The system MUST visually display the remaining time while the timer is active.
- **FR-005**: The system MUST calculate a reward for fully completed timer sessions based on duration. The base reward is 25 points for work and 20 points for study. The final reward scales as follows (rounding drops any decimal part):
  - 15 to 24 minutes: 0.5x base reward
  - 25 to 45 minutes: 1x base reward
  - 50 to 75 minutes: 2x base reward
  - 80 to 120 minutes: 3x base reward
- **FR-006**: The system MUST display a pop-up dialog when the timer completes, informing the user of the successful Pomodoro and the earned reward.
- **FR-007**: The system MUST add the earned reward to the user's current balance upon completion.
- **FR-008**: The system MUST NOT grant any reward if the user cancels a running timer before completion; the timer state resets entirely.

### Key Entities

- **PomodoroSession**: Represents a focused time block, attributes include duration, engagement type, status (active, completed, cancelled), and calculated reward. Completed sessions are persisted to a history log in the database.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully start, run, and complete a Pomodoro timer without errors.
- **SC-002**: Reward balance correctly increases by the exact calculated amount upon timer completion.
- **SC-003**: The timer runs accurately in relation to real-world time.

## Assumptions

- Users have an existing "current balance" as part of the app's gamification or tracking system.
- The engagement types "work" and "study" are a predefined list, though the UI should allow for future expansion.
