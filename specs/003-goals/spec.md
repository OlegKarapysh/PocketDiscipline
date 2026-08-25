# Feature Specification: Goals

**Feature Branch**: `[003-goals]`

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "new feature: add goals. Goals are difficult non-recurring tasks which have fixed reward. When a goal is achieved, it is marked as completed and its reward is added to the total money balance. System must remember the date when goal was achieved. There should be a separate tab in the menu to show the list of goals. System should contain these goals upfront: - do 50 push-ups on fists: reward 2000 - do 100 squats: reward 1500 - do 12 pomodorro a day: reward 1500. System should provide a functionality of adding new goals. Completed goals should be grouped under a month they were completed"

## Clarifications

### Session 2026-08-25
- Q: Can users delete a custom goal if they made a mistake while creating it? → A: Yes, they can both edit and delete custom goals.
- Q: Can a user un-complete a goal if they marked it completed by accident? → A: Yes, they can undo completion, which deducts the reward back.
- Q: How should Active and Completed goals be displayed on the Goals tab? → A: On the same page, with Active goals at the top and Completed below.
- Q: Are duplicate goal titles allowed for active goals? → A: No, titles must be unique among active goals.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Goals List (Priority: P1)

As a user, I want to access a dedicated "Goals" tab so that I can see all my active and completed goals.

**Why this priority**: Discoverability is essential. Users must be able to view their goals before they can complete or add them.

**Independent Test**: Can be fully tested by navigating to the "Goals" tab and observing the list of initial active goals at the top and the month-grouped completed goals below them on the same page.

**Acceptance Scenarios**:

1. **Given** I am on the main menu, **When** I tap the "Goals" tab, **Then** I see the list of active goals at the top of the page.
2. **Given** I have completed goals, **When** I scroll down the goals list, **Then** I see the completed goals grouped by the month and year they were achieved.

---

### User Story 2 - Complete a Goal (Priority: P1)

As a user, I want to mark a goal as completed so that I receive its reward and it gets recorded in my history.

**Why this priority**: This is the core functionality that delivers value (rewards) to the user for their real-life achievements.

**Independent Test**: Can be fully tested by marking an active goal as completed and verifying the total money balance increases and the goal moves to the completed section under the current month.

**Acceptance Scenarios**:

1. **Given** I have an active goal, **When** I mark it as complete, **Then** the goal's status changes to completed and the current date is recorded.
2. **Given** I complete a goal with a reward of 1500, **When** the completion is processed, **Then** my total money balance increases by exactly 1500.

---

### User Story 3 - Add, Edit, or Delete a Custom Goal (Priority: P2)

As a user, I want to create, edit, or delete custom goals with specific rewards so that I can set and manage personal challenges beyond the predefined ones.

**Why this priority**: Customization increases user engagement, but the core system functions with the predefined goals initially.

**Independent Test**: Can be fully tested by creating a new goal, editing its title/reward, and deleting it, verifying it appears/updates/disappears in the active goals list.

**Acceptance Scenarios**:

1. **Given** I am on the Goals tab, **When** I create a new goal with title "Read a book" and reward 500, **Then** the new goal appears in the list of active goals.
2. **Given** I have a custom goal, **When** I edit it or delete it, **Then** the changes are saved or the goal is removed from the active list.

### Edge Cases

- What happens when a user tries to complete an already completed goal?
- How does the system handle viewing goals when none are completed yet?
- What happens if the money balance exceeds the maximum displayable/storable integer value?
- What happens if a user tries to add a custom goal with a title that already exists among active goals? (Validation error).

## Requirements *(mandatory)*

### Architectural Constraints
- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.

### Functional Requirements

- **FR-001**: System MUST display a dedicated "Goals" tab in the main navigation menu.
- **FR-002**: System MUST display all active goals at the top of the "Goals" page.
- **FR-003**: System MUST display completed goals on the same page below active goals, grouped by the month and year they were achieved (e.g., "August 2026").
- **FR-004**: System MUST allow users to create new custom goals specifying a title and a fixed reward amount.
- **FR-005**: System MUST enforce unique titles for all active goals (preventing duplicates).
- **FR-006**: System MUST allow users to edit the title and reward of their custom active goals.
- **FR-007**: System MUST allow users to delete their custom active goals.
- **FR-008**: System MUST allow users to mark an active goal as completed.
- **FR-009**: System MUST record the exact completion date when a goal is marked as completed.
- **FR-010**: System MUST add the goal's specified reward to the user's total money balance immediately upon completion.
- **FR-011**: System MUST prevent completed goals from being marked as completed again (non-recurring constraint).
- **FR-012**: System MUST allow users to undo a goal's completion, which will revert its status to active and deduct the reward amount from the total money balance.
- **FR-013**: System MUST populate the initial database with three default goals: "do 50 push-ups on fists" (reward 2000), "do 100 squats" (reward 1500), and "do 12 pomodorro a day" (reward 1500).

### Key Entities

- **Goal**: Represents a difficult non-recurring task. Attributes include title, reward amount, status (active/completed), and completion date.
- **Money Balance**: The user's total accumulated reward money (₴) across the application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully navigate to the Goals tab and view the 3 predefined initial goals.
- **SC-002**: Marking a goal as complete successfully updates its status, records the completion date, and correctly increments the total money balance.
- **SC-003**: Users can successfully add a new custom goal and see it appear in the active goals list.
- **SC-004**: Completed goals are visually grouped by the correct completion month.
- **SC-005**: Users can successfully undo a completed goal and see the reward accurately deducted.

## Assumptions

- Assuming "money balance" refers to an existing internal point/currency system in the app.
- Assuming predefined goals can also be edited or deleted by the user like custom goals.
