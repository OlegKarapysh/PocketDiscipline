# Tasks: Goals

**Input**: Design documents from `/specs/003-goals/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Test tasks are included using Vitest for unit tests as requested by project setup.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure for the new goals feature (using Vertical Slice Architecture) in `src/app/features/goals/`
- [x] T002 [P] Create empty `src/app/features/goals/models/goal.model.ts`
- [x] T003 [P] Create empty `src/app/features/goals/services/goal.service.ts`
- [x] T004 Create Angular components skeleton for goals feature: `goal-list`, `goal-form-dialog`, `goal-item`, `goals-page`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement `Goal` entity interface in `src/app/features/goals/models/goal.model.ts`
- [x] T006 Update `src/app/core/services/db.service.ts` to add the `goals` table schema (`goals: 'id, status'`)
- [x] T007 Implement the initial database seeding (the 3 predefined goals) in `src/app/core/services/db.service.ts` or initialization block

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Goals List (Priority: P1) 🎯 MVP

**Goal**: Access a dedicated "Goals" tab to see all active and completed goals.

**Independent Test**: Can be fully tested by navigating to the "Goals" tab and observing the list of initial active goals at the top and the month-grouped completed goals below them on the same page.

### Implementation for User Story 1

- [x] T010 [US1] Implement `getGoals()` and `getActiveGoals()` / `getCompletedGoals()` queries in `src/app/features/goals/services/goal.service.ts`
- [x] T011 [US1] Implement `src/app/features/goals/components/goal-item/goal-item.component.ts` (UI for displaying a single goal)
- [x] T012 [US1] Implement `src/app/features/goals/components/goal-list/goal-list.component.ts` (UI for displaying active and completed lists, with month grouping logic)
- [x] T013 [US1] Assemble the `src/app/features/goals/pages/goals-page/goals-page.component.ts` using the `goal-list` component
- [x] T008 [US1] Add a new route for the "Goals" page in `src/app/app.routes.ts` (depends on T013)
- [x] T009 [US1] Add a new navigation tab/link for "Goals" in the main navigation menu component (e.g., in `src/app/app.ts` or similar root layout)
- [x] T014 [US1] Write unit tests for `GoalService` fetching logic in `src/app/features/goals/services/goal.service.spec.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Complete a Goal (Priority: P1)

**Goal**: Mark a goal as completed to receive its reward and record it in history, or undo completion.

**Independent Test**: Can be fully tested by marking an active goal as completed and verifying the total money balance increases and the goal moves to the completed section under the current month. Undo it and check if it reverts properly.

### Implementation for User Story 2

- [x] T015 [US2] Implement `completeGoal(goalId)` and `undoCompleteGoal(goalId)` methods in `src/app/features/goals/services/goal.service.ts`
- [x] T016 [US2] Add user's money balance update logic (integration with User data) inside the completion methods in `src/app/features/goals/services/goal.service.ts`
- [x] T017 [US2] Add "Complete" and "Undo" buttons/actions to `src/app/features/goals/components/goal-item/goal-item.component.ts` and connect them to the service
- [x] T018 [US2] Write unit tests for completion and undo logic in `src/app/features/goals/services/goal.service.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Add, Edit, or Delete a Custom Goal (Priority: P2)

**Goal**: Create, edit, or delete custom goals with specific rewards to set personal challenges.

**Independent Test**: Can be fully tested by creating a new goal, editing its title/reward, and deleting it, verifying it appears/updates/disappears in the active goals list. Check for duplicate title validation.

### Implementation for User Story 3

- [x] T019 [US3] Implement `addGoal()`, `updateGoal()`, and `deleteGoal()` methods in `src/app/features/goals/services/goal.service.ts`
- [x] T020 [US3] Implement duplicate title validation logic among active goals in `src/app/features/goals/services/goal.service.ts`
- [x] T021 [US3] Implement `src/app/features/goals/components/goal-form-dialog/goal-form-dialog.component.ts` (Form for add/edit with validations)
- [x] T022 [US3] Add "Add Goal" FAB/button to `src/app/features/goals/pages/goals-page/goals-page.component.ts`
- [x] T023 [US3] Add "Edit" and "Delete" actions to `src/app/features/goals/components/goal-item/goal-item.component.ts` (only for active goals)
- [x] T024 [US3] Write unit tests for add/edit/delete logic in `src/app/features/goals/services/goal.service.spec.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Add E2E tests for the Goals flow in `e2e/goals.spec.ts` (using Playwright)
- [x] T026 Code cleanup and refactoring (ensure adherence to SOLID principles and Prettier/ESLint rules)
- [x] T027 Run quickstart.md validation manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Depends on User Story 1 (needs the list UI to click the complete button)
- **User Story 3 (P2)**: Depends on User Story 1 (needs the list UI to see the added/edited goals)

### Parallel Opportunities

- Setup tasks and Foundational tasks marked `[P]` can run in parallel.
- User Story 2 and User Story 3 can be developed in parallel as long as the mock data can be displayed by US1.

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3 & 4: User Story 1 & 2 (Viewing and Completing predefined goals)
4. **STOP and VALIDATE**: Test MVP independently
5. Proceed to Phase 5 for Custom Goals support (User Story 3)
