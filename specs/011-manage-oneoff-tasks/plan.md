# Implementation Plan: Manage One-Off Tasks

**Branch**: `[011-manage-oneoff-tasks]` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-manage-oneoff-tasks/spec.md`

## Summary

Replace the placeholder one-off task list and its hardcoded `"Add initial tasks"` dummy seeding with full one-off task management inside the `features/tasks/` vertical slice. Users can create, edit, and delete pending one-off tasks with whole-hryvnia rewards, complete tasks to earn their reward and move them into a collapsible `"Completed"` section (matching the adjacent Daily tasks tab), and undo completed tasks to revert them to pending and deduct the reward back from their balance (matching Goals). `TaskService` moves from `core/services/` into `features/tasks/services/` and enforces title and whole-hryvnia validation and pending-only edit/delete invariants.

## Technical Context

**Language/Version**: TypeScript 6, Angular 22.2

**Primary Dependencies**: Dexie 4 (IndexedDB), Angular Material 22, `@angular/forms/signals`. No new packages.

**Storage**: Dexie, `pocket-discipline-db`, version 11 unchanged. Tables written: `tasks` (`DisciplineItem`), `users` (`User.balance` on complete/undo).

**Testing**: Vitest through `npm test -- --watch=false`; Playwright through `npm run e2e` (including `e2e/src/layout-audit.spec.ts` and `e2e/src/long-text.spec.ts`).

**Target Platform**: Offline-first PWA across mobile (`360px`+) and desktop (`1920px`) browsers.

**Project Type**: web-app (offline-first SPA)

**Performance Goals**: Instant local IndexedDB reads/writes via Dexie `liveQuery`; zero horizontal overflow at all 7 layout-audit reference widths (`360px` to `1920px`).

**Constraints**: Money in whole hryvnias (`1` to `10,000,000` ₴) validated via `moneyAmount()`. Titles trimmed (`1` to `120` chars via `TITLE_MAX_LENGTH`). No new Dexie schema version. UI built strictly with shared components, M3 tokens, and `_tokens.scss`.

**Scale/Scope**: One vertical slice (`src/app/features/tasks/`) with 1 routed page (`TasksPage`), 3 components (`TaskList`, `TaskForm`, `TaskItem`), 1 model (`TaskDraft`), and 1 service (`TaskService`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture? — Yes: `TaskService` moves from `core/services/` into `features/tasks/services/`, so `features/tasks/` encapsulates its page, components, models, and service while `DisciplineItem` remains in `core/models/` for `DbService`.
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)? — Yes: zero new packages added.
- [x] Will the new code follow `docs/code_style.md` and pass ESLint, EditorConfig, and Prettier? — Yes: Angular v22 defaults (implicit `OnPush` and `standalone`, `@Service()`), signals-only component state, Signal Forms (`@angular/forms/signals`), `toSignal` / `takeUntilDestroyed` teardown, one construct per file, and no method calls in template bindings.
- [x] Does the design adhere to SOLID principles and established developer best practices? — Yes: `TaskService` owns persistence and balance transactions, `TaskForm` owns form state/validation, `TaskItem` is a presentational row card, and `TaskList` coordinates the view state and user feedback.
- [x] Does any UI follow `docs/design_system.md` (shared components first, theme and token layer only), with `scripts/check-ui.mjs` passing and its baseline not grown? — Yes: reuses `Amount`, `EmptyState`, `ConfirmService`, and `SnackBarService`; styles use only `--mat-sys-*` / `--pd-sys-*` and `src/styles/_tokens.scss`; new states are registered in `e2e/src/layout-audit.spec.ts`.

Post-design re-check: all gates pass with zero violations.

## Project Structure

### Documentation (this feature)

```text
specs/011-manage-oneoff-tasks/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory is needed because this offline-first SPA exposes no external API or CLI contract.

### Source Code (repository root)

```text
src/app/
├── core/
│   └── models/
│       ├── discipline-item.model.ts                # Unchanged row shape for db.tasks
│       └── discipline-item-type.enum.ts            # Unchanged enum
├── features/
│   └── tasks/
│       ├── components/
│       │   ├── task-form/
│       │   │   ├── task-form.ts                    # Signal form for creating/editing a one-off task
│       │   │   ├── task-form.html
│       │   │   ├── task-form.scss
│       │   │   └── task-form.spec.ts
│       │   ├── task-item/
│       │   │   ├── task-item.ts                    # Pending & completed one-off task card
│       │   │   ├── task-item.html
│       │   │   ├── task-item.scss
│       │   │   └── task-item.spec.ts
│       │   └── task-list/
│       │       ├── task-list.ts                    # Pending list, inline form host, collapsible Completed group
│       │       ├── task-list.html
│       │       ├── task-list.scss
│       │       └── task-list.spec.ts
│       ├── models/
│       │   └── task-draft.model.ts                 # { title: string; rewardValue: number }
│       ├── pages/
│       │   └── tasks-page/                         # Hosts Daily and One-off tabs
│       └── services/
│           ├── task.service.ts                     # Moved from core/services/; CRUD + complete/undo
│           └── task.service.spec.ts
docs/
└── schema.md                                       # Note TaskService whole-hryvnia validation alongside GoalService/DailyTasksService
e2e/src/
├── one-off-tasks.spec.ts                           # E2E tests for add, edit, delete, complete, undo
├── long-text.spec.ts                               # Paste max-length title into one-off task form at 360px
└── layout-audit.spec.ts                            # Register new/edit form, completed group, and delete dialog states
```

**Structure Decision**: Consolidate all one-off task UI, state, models, and persistence logic under `src/app/features/tasks/` (removing `src/app/core/services/task.service.ts` and `task.service.spec.ts`), matching the structure of `src/app/features/daily-tasks/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
