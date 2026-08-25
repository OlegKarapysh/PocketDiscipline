# Feature Specification: Daily Tasks

**Feature Branch**: `[daily-tasks]`

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "new feature: add daily tasks. Daily tasks - recurring everyday tasks with incrementing reward. Their purpose is to build habits, therefore they should be completed every day. The reward is scaled by 10% from the base reward each day in a row. The maximum bonus is 100% for a daily task completed 11 days in a row. Daily tasks also have different difficulty levels, because the skill is growing. For example: easy daily training, medium training, difficult training. the more difficult the daily task is - the more base reward it provides. User can choose which difficulty level they completed"

## Clarifications

### Session 2026-08-25
- Q: A strict reset to 0 after missing one day can be demotivating for long streaks. Should we include a "streak freeze" (grace day) mechanism in this MVP? → A: (Recommended) Strict reset: Keep the MVP simple; reset to 0 immediately upon missing a day.
- Q: The reward bonus caps at 100% (11 days). Should the visible streak counter keep growing indefinitely (e.g., "Day 45") to motivate the user, or should it cap at 11? → A: (Recommended) Grow indefinitely: The counter keeps tracking total consecutive days for motivation, even though the reward is capped.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete a daily task with difficulty selection (Priority: P1)

As a user, I want to complete a daily task and select the difficulty level I achieved, so that I can earn the appropriate base reward for my effort.

**Why this priority**: This is the core functionality that allows users to interact with daily tasks and get rewarded.

**Independent Test**: Can be fully tested by presenting a daily task, allowing the user to mark it complete with a chosen difficulty, and verifying the reward granted matches the difficulty's base reward (assuming streak is 0).

**Acceptance Scenarios**:

1. **Given** an uncompleted daily task, **When** the user completes it and selects "Easy" difficulty, **Then** the task is marked as completed for the day and the user receives the base reward for "Easy".
2. **Given** an uncompleted daily task, **When** the user completes it and selects "Hard" difficulty, **Then** the task is marked as completed for the day and the user receives the higher base reward for "Hard".

---

### User Story 2 - Streak tracking and reward bonus (Priority: P1)

As a user, I want my consecutive daily completions to increase my reward bonus by 10% each day up to a maximum of 100%, so that I am incentivized to build a daily habit.

**Why this priority**: The streak and scaling reward system is the primary mechanism for encouraging daily habit building.

**Independent Test**: Can be tested by completing a task on consecutive days and verifying the calculated reward includes the correct percentage bonus based on the streak, and ensuring it caps at 100%.

**Acceptance Scenarios**:

1. **Given** a daily task with a 5-day streak, **When** the user completes it on the 6th day, **Then** the reward is calculated as `Base Reward + (Base Reward * 50%)`.
2. **Given** a daily task with a 15-day streak, **When** the user completes it, **Then** the reward includes a maximum bonus of 100% (`Base Reward + (Base Reward * 100%)`).
3. **Given** a daily task was missed yesterday, **When** the user completes it today, **Then** the streak is reset to 0 and no bonus is applied to the base reward.

---

### User Story 3 - Manage recurring daily tasks (Priority: P2)

As a user, I want to create and configure my own recurring daily tasks, setting their base rewards for different difficulty levels, so that I can tailor my habits to my personal goals.

**Why this priority**: Users need a way to define what their daily habits are, though a system could theoretically function with hardcoded tasks for P1 testing.

**Independent Test**: Can be tested by creating a new daily task with custom names and base rewards, and verifying it appears in the daily task list.

**Acceptance Scenarios**:

1. **Given** the task management interface, **When** the user creates a "Daily Workout" task and assigns base rewards for Easy, Medium, and Hard, **Then** the task is saved and becomes available to complete each day.

### Edge Cases

- What happens when a user crosses a timezone boundary? (Tasks should ideally reset based on the user's local timezone).
- How does the system handle if a user tries to complete a task twice in one day? (It should only allow one completion per day, or allow editing the difficulty of an already completed task).

## Requirements *(mandatory)*

### Architectural Constraints
- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.

### Functional Requirements

- **FR-001**: System MUST allow users to create recurring daily tasks.
- **FR-002**: System MUST allow configuring multiple difficulty levels (e.g., Easy, Medium, Hard) for a daily task, each with its own base reward value.
- **FR-003**: System MUST display pending daily tasks to the user every day.
- **FR-004**: System MUST allow users to mark a daily task as completed and explicitly choose the difficulty level achieved that day.
- **FR-005**: System MUST track the streak (number of consecutive days completed) for each daily task.
- **FR-006**: System MUST calculate the final reward upon completion as: `Final Reward = Difficulty Base Reward * (1 + (Streak * 0.10))`.
- **FR-007**: System MUST cap the streak bonus at 100% (which is reached after 10 consecutive previous days of completion, i.e., completing it on the 11th day in a row). The streak counter itself MUST continue to grow indefinitely for user motivation.
- **FR-008**: System MUST reset the streak to 0 if the user fails to complete the task on any given calendar day.

### Key Entities

- **DailyTask**: Represents the habit definition. Contains name, and configuration for difficulty levels and their corresponding base rewards.
- **DailyTaskCompletion**: Records a specific completion event. Contains the date, reference to the DailyTask, the difficulty level chosen, the streak at the time of completion, and the final reward granted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully complete a daily task and receive the correct base reward within 3 clicks.
- **SC-002**: The system mathematically verifies that a 5-day streak yields a 50% bonus and an 11+ day streak yields exactly a 100% bonus.
- **SC-003**: Streak correctly resets to 0 upon missing a day, verified by the system.

## Assumptions

- Daily tasks reset at midnight according to the user's local timezone.
- The user has an existing account/profile and a currency/reward balance where the earned rewards will be deposited.
- Completing a task multiple times a day is not allowed; users complete a task once per day at a chosen difficulty.
