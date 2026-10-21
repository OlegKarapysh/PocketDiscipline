# Feature Specification: Manage One-Off Tasks

**Feature Branch**: `[011-manage-oneoff-tasks]`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "right now the app doesn't have functionality to manage (add, remove, edit) one-off tasks. there is a functionality to add initial tasks, but this functionality is useless and should be removed"

## Clarifications

### Session 2026-10-16

- Q: Once a one-off task is marked as completed, what actions should be allowed on it? → A: Only pending tasks can be edited or deleted; completed tasks can be undone (reverting completion and deducting the reward back from the user's balance), just like Goals.
- Q: How should completed one-off tasks be displayed relative to pending ones on the One-off tab? → A: Pending tasks at the top, with completed tasks in a collapsible "Completed" section below (matching the Daily tasks tab pattern).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add and Complete a One-Off Task (Priority: P1)

As a user, I want to create my own one-off tasks with a title and a reward amount, and no longer see the useless "Add initial tasks" dummy button, so that I can track real single-action tasks and earn rewards when I complete them.

**Why this priority**: Without the ability to add custom one-off tasks (and with only hardcoded dummy tasks available when empty), the One-off tab cannot be used for real personal tasks.

**Independent Test**: Can be fully tested by navigating to the One-off tab on the Tasks page when no tasks exist, verifying the "Add initial tasks" button is gone, adding a new one-off task with a title and reward, and confirming it appears in the pending list and moves to the collapsible "Completed" section when completed.

**Acceptance Scenarios**:

1. **Given** I have no one-off tasks and I am on the "One-off" tab of the Tasks page, **When** I view the empty state, **Then** I see a message indicating there are no one-off tasks yet and I do **not** see an "Add initial tasks" button that populates dummy tasks.
2. **Given** I am on the "One-off" tab, **When** I initiate adding a one-off task, enter a valid title (e.g., "Pay internet bill") and a whole-hryvnia reward amount (e.g., `50`), and save, **Then** the new one-off task is created and displayed in my pending one-off tasks list with its title and `+50 ₴` reward.
3. **Given** I am creating a one-off task, **When** I try to submit with an empty/whitespace-only title or an invalid reward amount (less than 1 ₴ or non-integer), **Then** the system prevents saving and displays a clear validation message.
4. **Given** I have a pending one-off task with reward `50`, **When** I mark it as completed, **Then** my balance increases by `50 ₴` and the task moves out of the pending list into the collapsible "Completed" section below.
5. **Given** I have a completed one-off task in the "Completed" section, **When** I undo its completion, **Then** the task returns to the pending list and its reward amount is deducted back from my balance.

---

### User Story 2 - Edit a Pending One-Off Task (Priority: P2)

As a user, I want to edit the title and reward amount of a pending one-off task so that I can fix typos or adjust the reward before completing it.

**Why this priority**: Users frequently need to refine task wording or adjust the reward value as task effort changes.

**Independent Test**: Can be fully tested by selecting the edit action on a pending one-off task, modifying its title and/or reward value, saving, and verifying the updated details are persisted and shown in the list.

**Acceptance Scenarios**:

1. **Given** a pending one-off task in the list, **When** I open its edit form, change its title to "File quarterly taxes" and reward to `200`, and save, **Then** the task displays the updated title and `+200 ₴` reward.
2. **Given** I am editing a pending one-off task, **When** I cancel the edit, **Then** the task retains its original title and reward without changes.
3. **Given** a completed one-off task in the "Completed" section, **When** I view it, **Then** edit and delete actions are not offered unless I first undo its completion.

---

### User Story 3 - Remove a Pending One-Off Task (Priority: P2)

As a user, I want to delete a pending one-off task I no longer need so that my task list stays clean and relevant.

**Why this priority**: Tasks can become obsolete or be added by mistake; users must be able to remove them.

**Independent Test**: Can be fully tested by triggering the delete action on a pending one-off task, confirming the deletion in the confirmation prompt, and verifying the task is permanently removed from the list without altering the user's balance.

**Acceptance Scenarios**:

1. **Given** a pending one-off task, **When** I choose to delete it and confirm the deletion, **Then** the task is removed from the list and my money balance remains unchanged.
2. **Given** I triggered the delete action on a pending one-off task, **When** I cancel the confirmation dialog, **Then** the task is not deleted and remains in the list.

---

### Edge Cases

- What happens when the user submits a title with leading or trailing whitespace? The title is trimmed before validation and storage; whitespace-only titles are rejected.
- What happens when the user enters a title exceeding the maximum allowed length (120 characters)? Validation prevents submission.
- What happens when all one-off tasks are deleted? The list transitions cleanly back to the empty state (without the legacy dummy task action).
- What happens when all existing one-off tasks are completed and none are pending? An `"Everything is done."` indicator is shown above the collapsible "Completed" section, matching the Daily tasks tab pattern.
- What happens if a user tries to complete an already completed one-off task, or undo an already pending task? The operation is a safe no-op so the user's balance cannot be double-credited or double-deducted.

## Requirements *(mandatory)*

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.
- **AC-004**: Any UI MUST follow `docs/design_system.md`: shared components first, theme and token layer only.

### Functional Requirements

- **FR-001**: System MUST remove the "Add initial tasks" dummy data seeding action and its hardcoded sample tasks ("Drink 2L Water", "Read 10 pages", "Pay internet bill") from the One-off tasks view.
- **FR-002**: System MUST display an informative empty state on the One-off tasks tab when no one-off tasks (neither pending nor completed) exist.
- **FR-003**: System MUST allow users to create a new one-off task by specifying a required title (trimmed, 1–120 characters) and a required reward amount in whole hryvnias (`1` to `10,000,000` ₴).
- **FR-004**: System MUST allow users to edit the title and reward amount of any pending (uncompleted) one-off task with the same validation rules as task creation.
- **FR-005**: System MUST allow users to delete any pending (uncompleted) one-off task after confirming the destructive action in a confirmation dialog, leaving the user's reward balance unchanged.
- **FR-006**: System MUST allow users to mark a pending one-off task as completed, recording the completion timestamp and crediting its reward amount to the user's balance.
- **FR-007**: System MUST restrict editing and deletion to pending one-off tasks, and MUST allow users to undo the completion of a completed one-off task, which reverts the task to pending (`isCompleted: false`, `lastCompletedAt: null`) and deducts its reward amount back from the user's balance.
- **FR-008**: System MUST display pending one-off tasks at the top of the One-off tab (ordered by `createdAt` descending, tie-broken by `title.localeCompare`) and place completed one-off tasks inside a collapsible "Completed" section below (ordered by `lastCompletedAt` descending, tie-broken by `createdAt` descending), matching the Daily tasks tab layout pattern.
- **FR-009**: System MUST treat all tasks managed on the One-off tab as one-off tasks without exposing legacy `HABIT` vs `ONEOFF` type badges or selectors.

### Key Entities *(include if feature involves data)*

- **One-Off Task (`DisciplineItem`)**: A single-completion task with a unique identifier, title, whole-hryvnia reward value, completion status (`isCompleted`), completion timestamp (`lastCompletedAt`), and creation timestamp (`createdAt`).
- **User Balance**: The user's accumulated whole-hryvnia balance credited when a one-off task is completed and debited when completion is undone.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add, edit, complete, undo, and delete a one-off task on the One-off tab in under 15 seconds per operation.
- **SC-002**: 100% of invalid task submissions (empty/whitespace title, title over 120 characters, non-integer or out-of-range reward amount) are blocked with clear user feedback before persistence.
- **SC-003**: The legacy "Add initial tasks" button and `HABIT`/`ONEOFF` badge are completely absent from the One-off tab across both mobile and desktop layouts.
- **SC-004**: Completing a one-off task increases the user's balance by the exact task reward amount, undoing completion deducts that exact amount, and deleting a pending task leaves the user's balance unchanged.

## Assumptions

- Existing database table `tasks` (`DisciplineItem`) will continue to store one-off tasks so existing IndexedDB schemas and stored tasks remain intact without requiring a destructive migration.
- Validation bounds for task title (1–120 characters) and reward amount (whole hryvnias from 1 to 10,000,000 ₴) follow the established application-wide conventions (`TITLE_MAX_LENGTH` and `moneyAmount()`).
- Dashboard earnings charts and monthly summaries remain scoped to their existing sources (Daily Tasks, Goals, Pomodoro, Daily Scores) unless specified otherwise.
