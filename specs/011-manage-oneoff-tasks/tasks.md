---

description: "Task list for Manage One-Off Tasks feature implementation"
---

# Tasks: Manage One-Off Tasks

**Input**: Design documents from `/specs/011-manage-oneoff-tasks/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Unit and E2E test tasks are included to satisfy the project's mandatory verification gates (`npm test` and `npm run e2e`) and replace obsolete specs for removed dummy task seeding.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the slice folder structure and shared feature model under `src/app/features/tasks/`

- [X] T001 Create `models`, `services`, `components/task-form`, and `components/task-item` directories under `src/app/features/tasks/`
- [X] T002 [P] Create `TaskDraft` interface (`{ title: string; rewardValue: number }`) in `src/app/features/tasks/models/task-draft.model.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Relocate `TaskService` into the `features/tasks/` vertical slice and remove legacy habit-reset logic before building story features

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Move `TaskService` from `src/app/core/services/task.service.ts` to `src/app/features/tasks/services/task.service.ts`, remove `performDailyReset()`, and remove the `ClockService` reset `effect()` and update the `TaskService` import in `src/app/features/tasks/components/task-list/task-list.ts`
- [X] T004 Move `src/app/core/services/task.service.spec.ts` to `src/app/features/tasks/services/task.service.spec.ts`, update the `TaskService` import in `src/app/features/tasks/components/task-list/task-list.spec.ts`, and remove obsolete `performDailyReset()` test cases and mocks from both spec files

**Checkpoint**: `TaskService` lives in `src/app/features/tasks/services/` and user story implementation can begin

---

## Phase 3: User Story 1 - Add and Complete a One-Off Task (Priority: P1) 🎯 MVP

**Goal**: Remove the useless `"Add initial tasks"` dummy seeding and `HABIT`/`ONEOFF` badge, allow users to add custom one-off tasks with validated title and whole-hryvnia reward, complete pending tasks to earn their reward and move them into a collapsible `"Completed"` section, and undo completed tasks to revert them to pending and deduct the reward back.

**Independent Test**: Open `/tasks` and switch to the `One-off` tab when empty; verify `"Add initial tasks"` is gone, create a one-off task with title `"Pay internet bill"` and reward `50`, mark it complete to verify balance increases by `50 ₴` and the task moves into `Completed (1)`, then click `Undo` to verify it returns to pending and `50 ₴` is deducted.

### Implementation for User Story 1

- [X] T005 [US1] Update `TaskService` in `src/app/features/tasks/services/task.service.ts` to sort `tasks$` (pending items first ordered by `createdAt` descending then `title.localeCompare`, followed by completed items ordered by `lastCompletedAt` descending then `createdAt` descending), implement `addTask(rawTitle, rewardValue)` (always setting `DisciplineItemType.ONEOFF` and validating trimmed non-empty title `<= TITLE_MAX_LENGTH` and whole-hryvnia integer reward `>= 1`), return earned reward (`number | null`) from `completeTask(id)`, and implement `undoCompleteTask(id)` in a `'rw'` transaction across `db.tasks` and `db.users`
- [X] T006 [US1] Update unit tests for `addTask`, `completeTask`, and `undoCompleteTask` in `src/app/features/tasks/services/task.service.spec.ts`
- [X] T007 [P] [US1] Create `TaskForm` component using Angular Signal Forms (`form()`, `FormField`, trimmed required title, `maxLength(TITLE_MAX_LENGTH)`, `moneyAmount()`) in `src/app/features/tasks/components/task-form/task-form.ts`, `src/app/features/tasks/components/task-form/task-form.html`, and `src/app/features/tasks/components/task-form/task-form.scss`
- [X] T008 [P] [US1] Create `TaskItem` component for pending rows (title, `<app-amount>`, `Complete` button) and completed rows (`--pd-sys-success-container` check icon, title, `<app-amount>`, `Undo` button) without any `HABIT`/`ONEOFF` badge in `src/app/features/tasks/components/task-item/task-item.ts`, `src/app/features/tasks/components/task-item/task-item.html`, and `src/app/features/tasks/components/task-item/task-item.scss`
- [X] T009 [US1] Refactor `TaskList` to remove `addDummyTask()` and `"Add initial tasks"`, and render the header (`"One-off tasks"` + `"Add one-off task"` button), inline `TaskForm`, pending `TaskItem` list, `"Everything is done."` message, collapsible `"Completed"` group (`#oneoff-tasks-done`), and `<app-empty-state>` in `src/app/features/tasks/components/task-list/task-list.ts`, `src/app/features/tasks/components/task-list/task-list.html`, and `src/app/features/tasks/components/task-list/task-list.scss`
- [X] T010 [P] [US1] Create unit tests for `TaskForm` creation and validation in `src/app/features/tasks/components/task-form/task-form.spec.ts`
- [X] T011 [P] [US1] Create unit tests for `TaskItem` pending and completed states in `src/app/features/tasks/components/task-item/task-item.spec.ts`
- [X] T012 [US1] Update `TaskList` unit tests for empty state, task creation, completion, undo, and collapsible `"Completed"` section in `src/app/features/tasks/components/task-list/task-list.spec.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Edit a Pending One-Off Task (Priority: P2)

**Goal**: Allow users to edit the title and reward amount of any pending one-off task in place, while restricting edit actions from completed tasks.

**Independent Test**: Click `Edit` on a pending one-off task, modify its title and reward amount, save (or cancel), and verify the updated details in the pending list and that completed tasks in the `"Completed"` section do not show an `Edit` button.

### Implementation for User Story 2

- [X] T013 [US2] Implement `updateTask(id, rawTitle, rewardValue)` (enforcing pending-only guard, trimmed title validation, and whole-hryvnia reward validation) in `src/app/features/tasks/services/task.service.ts` and add unit tests in `src/app/features/tasks/services/task.service.spec.ts`
- [X] T014 [P] [US2] Add edit mode support (`task` input initializing the form draft and switching heading to `'Edit one-off task'`) in `src/app/features/tasks/components/task-form/task-form.ts` and `src/app/features/tasks/components/task-form/task-form.html`, and add unit tests in `src/app/features/tasks/components/task-form/task-form.spec.ts`
- [X] T015 [P] [US2] Add `Edit` icon button (`edit` output) for pending tasks only in `src/app/features/tasks/components/task-item/task-item.ts` and `src/app/features/tasks/components/task-item/task-item.html`, and add unit tests in `src/app/features/tasks/components/task-item/task-item.spec.ts`
- [X] T016 [US2] Wire in-place task editing (`editingTaskId` signal, `openEdit`, `closeEdit`, `onTaskEdited`) for pending tasks in `src/app/features/tasks/components/task-list/task-list.ts`, `src/app/features/tasks/components/task-list/task-list.html`, and `src/app/features/tasks/components/task-list/task-list.spec.ts`

**Checkpoint**: User Stories 1 and 2 work independently and together

---

## Phase 5: User Story 3 - Remove a Pending One-Off Task (Priority: P2)

**Goal**: Allow users to delete a pending one-off task after confirming in a destructive confirmation dialog without altering their balance.

**Independent Test**: Trigger `Delete` on a pending one-off task (from the item card or edit form), confirm in the dialog, and verify the task is removed and the user's balance does not change.

### Implementation for User Story 3

- [X] T017 [US3] Implement `deleteTask(id)` (enforcing pending-only guard and leaving user balance untouched) in `src/app/features/tasks/services/task.service.ts` and add unit tests in `src/app/features/tasks/services/task.service.spec.ts`
- [X] T018 [P] [US3] Add `Delete` action button (`delete` output) on pending `TaskItem` cards and in `TaskForm` edit mode in `src/app/features/tasks/components/task-item/task-item.ts`, `src/app/features/tasks/components/task-item/task-item.html`, `src/app/features/tasks/components/task-item/task-item.scss`, `src/app/features/tasks/components/task-form/task-form.ts`, `src/app/features/tasks/components/task-form/task-form.html`, and `src/app/features/tasks/components/task-form/task-form.scss`
- [X] T019 [P] [US3] Add unit tests for `delete` output in `src/app/features/tasks/components/task-item/task-item.spec.ts` and `src/app/features/tasks/components/task-form/task-form.spec.ts`
- [X] T020 [US3] Wire `ConfirmService.ask()` destructive confirmation and `deleteTask(id)` in `src/app/features/tasks/components/task-list/task-list.ts`, `src/app/features/tasks/components/task-list/task-list.html`, and `src/app/features/tasks/components/task-list/task-list.spec.ts`

**Checkpoint**: All user stories (add, complete, undo, edit, delete) are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, E2E coverage, responsive layout audit registration, and full verification

- [X] T021 [P] Update `docs/schema.md` to list `TaskService` alongside `GoalService` and `DailyTasksService` for whole-hryvnia validation and describe `tasks` as the one-off tasks table
- [X] T022 [P] Create E2E test suite for one-off task creation, validation, editing, completion, undo, deletion, and absence of `"Add initial tasks"` in `e2e/src/one-off-tasks.spec.ts`
- [X] T023 [P] Add a 360px long-text paste test for one-off task creation and card wrapping in `e2e/src/long-text.spec.ts`
- [X] T024 Update `tasks: one-off tab` ready selector, update `worstCaseRows().tasks` (using `ONEOFF` type, 7-digit max whole-hryvnia rewards, and `word`/`url`/`prose` worst-case titles), and register `tasks: new one-off task form`, `tasks: edit one-off task form`, `tasks: completed one-off tasks opened`, and `tasks: delete one-off task confirmation` in `e2e/src/layout-audit.spec.ts`
- [X] T025 Run `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e` to verify all quality and layout gates pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on User Story 1 (extends `TaskService`, `TaskForm`, `TaskItem`, `TaskList`)
- **User Story 3 (Phase 5)**: Depends on User Story 1 (and integrates cleanly with `TaskForm` edit mode from US2)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent after Phase 2; delivers the MVP (add, complete, undo, collapsible completed list, and removal of dummy tasks)
- **User Story 2 (P2)**: Builds on US1's `TaskForm` and `TaskItem` components to add in-place editing for pending tasks
- **User Story 3 (P2)**: Builds on US1/US2 components to add confirmed deletion for pending tasks

### Parallel Opportunities

- **Phase 3 (US1)**: `T007` (`TaskForm`) and `T008` (`TaskItem`) can be built in parallel; `T010` (`task-form.spec.ts`) and `T011` (`task-item.spec.ts`) can run in parallel
- **Phase 4 (US2)**: `T014` (`TaskForm` edit mode) and `T015` (`TaskItem` edit button) can run in parallel
- **Phase 5 (US3)**: `T018` and `T019` can run in parallel after `T017`
- **Phase 6 (Polish)**: `T021` (`docs/schema.md`), `T022` (`e2e/src/one-off-tasks.spec.ts`), and `T023` (`e2e/src/long-text.spec.ts`) can be written in parallel

---

## Parallel Example: User Story 1

```bash
# Build the two child components for User Story 1 in parallel:
Task: "T007 [P] [US1] Create TaskForm component in src/app/features/tasks/components/task-form/"
Task: "T008 [P] [US1] Create TaskItem component in src/app/features/tasks/components/task-item/"

# Write their unit test suites in parallel:
Task: "T010 [P] [US1] Create unit tests for TaskForm in src/app/features/tasks/components/task-form/task-form.spec.ts"
Task: "T011 [P] [US1] Create unit tests for TaskItem in src/app/features/tasks/components/task-item/task-item.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`–`T002`)
2. Complete Phase 2: Foundational (`T003`–`T004`)
3. Complete Phase 3: User Story 1 (`T005`–`T012`)
4. **STOP and VALIDATE**: Verify creating, completing, and undoing one-off tasks and absence of `"Add initial tasks"`

### Incremental Delivery

1. Setup + Foundational → `TaskService` relocated into `features/tasks/`
2. User Story 1 (P1) → Add, complete, and undo one-off tasks; dummy tasks removed (MVP)
3. User Story 2 (P2) → Edit pending one-off tasks in place
4. User Story 3 (P2) → Delete pending one-off tasks with confirmation
5. Polish → Schema docs, E2E suite, long-text & layout audit verification
