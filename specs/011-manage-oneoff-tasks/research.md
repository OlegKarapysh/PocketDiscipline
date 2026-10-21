# Research: Manage One-Off Tasks

## 1. Slice Ownership & `TaskService` Placement

- **Decision**: Move `TaskService` from `src/app/core/services/task.service.ts` to `src/app/features/tasks/services/task.service.ts`. Keep `DisciplineItem` and `DisciplineItemType` in `src/app/core/models/`. Remove `performDailyReset()` from `TaskService` and remove the `ClockService` reset `effect()` from `TaskList`.
- **Rationale**: `TaskService` was placed in `core/services/` during `001-app-skeleton` before the `daily-tasks` and `goals` vertical slices existed. Nothing outside `features/tasks/` imports `TaskService`. Moving it into `features/tasks/services/` aligns the feature with Principle I (Vertical Slice Architecture). `DisciplineItem` remains in `core/models/` because `DbService` (`src/app/database/db.service.ts`) references all Dexie table row types (`core/models ← database ← features`). Removing `performDailyReset()` eliminates dead habit-reset logic that was superseded by `DailyTasksService` in `004-daily-tasks`.
- **Alternatives considered**:
  - Leaving `TaskService` in `core/services/`. Rejected: violates vertical slice cohesion since no other slice uses `TaskService`.
  - Dropping `type` from `DisciplineItem` in IndexedDB. Rejected: `db.service.ts` indexes `type` on `tasks` in existing Dexie versions, and changing existing `version(N)` definitions is forbidden by `docs/schema.md`. Setting `type: DisciplineItemType.ONEOFF` internally on creation keeps the schema at version 11 with zero migration risk.

## 2. Form Pattern: Inline Card Form vs. Modal Dialog

- **Decision**: Use an inline card component (`TaskForm`, `<app-task-form>`) rendered at the top of `TaskList` when adding a task and in-place when editing a pending task, built with Angular v22 Signal Forms (`form()`, `FormField`, `validate()`, `maxLength()`, `moneyAmount()`).
- **Rationale**: `TaskList` lives inside the second tab ("One-off") of `TasksPage` (`/tasks`), right next to the "Daily" tab (`DailyTaskList`), which uses an inline `DailyTaskForm` card for both creation and in-place editing. Using the same inline card pattern across both tabs of `/tasks` provides a unified user experience and avoids modal dialogs inside a tabbed task workspace.
- **Alternatives considered**:
  - `MatDialog` modal form (like `GoalFormDialog` on `/goals`). Rejected: creates an inconsistent interaction model between the "Daily" and "One-off" tabs on the same `/tasks` page.

## 3. Pending & Completed Layout and Item Actions

- **Decision**: Structure `TaskList` to mirror `DailyTaskList`:
  - **Header**: `"One-off tasks"` heading (`title-large`, weight 600), pending/completed count subtitle when tasks exist, and an `"Add one-off task"` tonal button (`matButton="tonal"`).
  - **Empty state**: When `tasks` is empty (no pending and no completed tasks), render `<app-empty-state heading="No one-off tasks yet" message="Add a task you want to get done once." />` with **no** action button (removing the legacy `"Add initial tasks"` dummy seeding).
  - **Pending list**: Shown at the top. Each pending item (`<app-task-item>`) renders inside an outlined `mat-card` with its title (`overflow-wrap: anywhere`, `min-width: 0`), reward (`<app-amount size="sm" tone="reward" [showSign]="true" />`), an `Edit` icon button, a `Delete` icon button, and a `Complete` button (`mat-flat-button`). When all tasks are completed (`pending().length === 0` and `completed().length > 0`), show the `"Everything is done."` status line with a green `check_circle` icon.
  - **Collapsible Completed section**: Shown below pending tasks whenever `completed().length > 0`, toggled by a `Completed (N)` button (`aria-expanded`, `aria-controls="oneoff-tasks-done"`). Each completed item renders with the `--pd-sys-success-container` check badge, title, reward `<app-amount>`, and an `Undo` button (`mat-stroked-button`) that reverts completion and deducts the reward from the user's balance. Edit and Delete actions are not rendered on completed items.
- **Rationale**: Directly implements the clarified specification (FR-001 through FR-009) and follows `docs/design_system.md` ("Lists of completed items: compact rows with a success icon tile (`--pd-sys-success-container`), placed after the pending items").

## 4. Transactional Balance & Task Persistence

- **Decision**:
  - `completeTask(id)` executes a Dexie `'rw'` transaction across `db.tasks` and `db.users`, verifying `!task.isCompleted` before updating `{ isCompleted: true, lastCompletedAt: Date.now() }` and calling `userService.addBalance(task.rewardValue)`. Returns the earned reward (`number | null`) so `TaskList` can display `"${task.title} done · +${MONEY_FORMAT.format(reward)} ₴"` via `SnackBarService`.
  - `undoCompleteTask(id)` executes a Dexie `'rw'` transaction across `db.tasks` and `db.users`, verifying `task.isCompleted` before updating `{ isCompleted: false, lastCompletedAt: null }` and calling `userService.addBalance(-task.rewardValue)`. Returns `boolean` so `TaskList` can display `"Completion undone"` via `SnackBarService`.
  - `updateTask(id, title, rewardValue)` and `deleteTask(id)` guard that the target task is pending (`!task.isCompleted`) before modifying or deleting it, enforcing FR-007 at the service layer as well as in the UI.
- **Rationale**: Prevents race conditions or double-crediting/double-deducting balance, and enforces domain invariants in `TaskService` (matching `GoalService` and `DailyTasksService`).
