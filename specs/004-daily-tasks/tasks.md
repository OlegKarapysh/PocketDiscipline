# Tasks: Daily Tasks

**Input**: Design documents from `/specs/004-daily-tasks/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create daily-tasks feature folder structure in `src/app/features/daily-tasks/` (models, services, components)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Update `src/app/core/services/db.service.ts` to increment Dexie database version to 3 and add `dailyTasks` table.
- [x] T003 Create `DailyTask` and `DailyTaskDifficulty` interfaces in `src/app/features/daily-tasks/models/daily-task.model.ts` based on data-model.md.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Complete a daily task with difficulty selection (Priority: P1) 🎯 MVP

**Goal**: As a user, I want to complete a daily task and select the difficulty level I achieved, so that I can earn the appropriate base reward for my effort.

**Independent Test**: Can be fully tested by presenting a daily task, allowing the user to mark it complete with a chosen difficulty, and verifying the reward granted matches the difficulty's base reward (assuming streak is 0).

### Implementation for User Story 1

- [x] T004 [US1] Implement `DailyTasksService` in `src/app/features/daily-tasks/services/daily-tasks.service.ts` with methods to fetch tasks and mark them as completed (without streak logic).
- [x] T005 [P] [US1] Create `DailyTaskListComponent` in `src/app/features/daily-tasks/components/daily-task-list/daily-task-list.component.ts|html|scss` to display available daily tasks.
- [x] T006 [P] [US1] Create `DailyTaskItemComponent` in `src/app/features/daily-tasks/components/daily-task-item/daily-task-item.component.ts|html|scss` to render an individual task and difficulty selection buttons.
- [x] T007 [US1] Integrate `DailyTaskListComponent` into the main application layout/routing (e.g., in `src/app/features/tasks/pages/tasks-page/tasks-page.component.ts`).
- [x] T008 [US1] Connect `DailyTasksService` to the `UserService` (or equivalent) to update user balance upon task completion.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Streak tracking and reward bonus (Priority: P1)

**Goal**: As a user, I want my consecutive daily completions to increase my reward bonus by 10% each day up to a maximum of 100%, so that I am incentivized to build a daily habit.

**Independent Test**: Can be tested by completing a task on consecutive days and verifying the calculated reward includes the correct percentage bonus based on the streak, and ensuring it caps at 100%.

### Implementation for User Story 2

- [x] T009 [US2] Update `DailyTasksService` in `src/app/features/daily-tasks/services/daily-tasks.service.ts` to compute streak logic on fetch (reset streak if missed day) based on `lastCompletedAt`.
- [x] T010 [US2] Update completion logic in `DailyTasksService` to apply the `+10%` bonus per streak day (up to 100% max) to the final reward.
- [x] T011 [US2] Update `DailyTaskItemComponent` UI in `src/app/features/daily-tasks/components/daily-task-item/daily-task-item.component.html` to visually display the current streak counter.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Manage recurring daily tasks (Priority: P2)

**Goal**: As a user, I want to create and configure my own recurring daily tasks, setting their base rewards for different difficulty levels, so that I can tailor my habits to my personal goals.

**Independent Test**: Can be tested by creating a new daily task with custom names and base rewards, and verifying it appears in the daily task list.

### Implementation for User Story 3

- [x] T012 [P] [US3] Create `DailyTaskFormComponent` in `src/app/features/daily-tasks/components/daily-task-form/daily-task-form.component.ts|html|scss` with form inputs for title and multiple difficulties.
- [x] T013 [US3] Add `createTask` method to `DailyTasksService` in `src/app/features/daily-tasks/services/daily-tasks.service.ts` to save new tasks to IndexedDB.
- [x] T014 [US3] Integrate `DailyTaskFormComponent` with `DailyTaskListComponent` (e.g., via a dialog or inline form) to allow adding new tasks.

**Checkpoint**: All user stories should now be independently functional.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T015 [P] Run `quickstart.md` validation scenarios.
- [x] T016 Code cleanup and refactoring in `src/app/features/daily-tasks/` (ensure adherence to SOLID principles).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2).
- **User Story 2 (P1)**: Depends on US1 (needs the service and components to exist to modify them).
- **User Story 3 (P2)**: Can be started in parallel with US2, but depends on US1.

### Within Each User Story

- Models before services
- Services before components
- Story complete before moving to next priority

### Parallel Opportunities

- Component generation for list and item can be done in parallel for US1.
- Component generation for the form can be done in parallel for US3.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
