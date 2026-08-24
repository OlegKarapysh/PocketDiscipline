# Tasks: App Skeleton

**Input**: Design documents from `/specs/001-app-skeleton/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Angular workspace via Angular CLI in repo root
- [x] T002 Add Angular Material to the project (`ng add @angular/material`)
- [x] T003 Install Dexie.js for IndexedDB storage (`npm install dexie`)
- [x] T004 Create core feature directories (`src/app/core`, `src/app/shared`, `src/app/features`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Setup Dexie Database service in `src/app/core/services/db.service.ts`
- [x] T006 Configure base application routing in `src/app/app.routes.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Responsive Core Navigation (Priority: P1) 🎯 MVP

**Goal**: Access the application on both mobile and laptop devices seamlessly.

**Independent Test**: Resize the browser window or use device emulators to ensure the layout adapts correctly (hamburger menu on mobile, sidebar/topbar on desktop).

### Implementation for User Story 1

- [x] T007 [P] [US1] Create Layout Component in `src/app/shared/components/layout/layout.component.ts` using Angular Material Sidenav
- [x] T008 [US1] Integrate Layout Component into `src/app/app.component.html`
- [x] T009 [P] [US1] Generate dummy Dashboard and Settings components to enable routing (`src/app/features/dashboard/dashboard.component.ts`, `src/app/features/settings/settings.component.ts`)
- [x] T010 [US1] Hook up Dashboard and Settings routes to the Layout Component's navigation links

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. The app should have a responsive shell.

---

## Phase 4: User Story 2 - Basic Discipline Tracking Dashboard (Priority: P2)

**Goal**: See a main dashboard where I can view and interact with my daily discipline targets.

**Independent Test**: Load the main dashboard route and verify discipline tracking elements (tasks and virtual money balance) are present and interactive.

### Implementation for User Story 2

- [x] T011 [P] [US2] Create data model interfaces (`User`, `DisciplineItem`) in `src/app/core/models/data-models.ts`
- [x] T012 [P] [US2] Implement UserService to manage virtual money balance in `src/app/core/services/user.service.ts`
- [x] T013 [P] [US2] Implement TaskService to manage habits and one-off tasks in `src/app/core/services/task.service.ts`
- [x] T014 [US2] Build TaskListComponent UI in `src/app/features/dashboard/components/task-list/task-list.component.ts` (including empty state call-to-action for zero items)
- [x] T015 [US2] Build BalanceWidget UI in `src/app/features/dashboard/components/balance-widget/balance-widget.component.ts`
- [x] T016 [US2] Integrate TaskList and BalanceWidget into `src/app/features/dashboard/dashboard.component.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. The dashboard should be functional and data should persist locally.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T017 [P] Polish Material component styles across the application in `src/styles.scss`
- [x] T018 Run `quickstart.md` validation scenarios to ensure responsiveness and data persistence
- [x] T019 [P] Audit and optimize Lighthouse performance (SC-001, SC-003) to ensure 90+ score and <2s load time

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2).
- **User Story 2 (P2)**: Can start after Foundational (Phase 2).

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Models within a story marked [P] can run in parallel (e.g. UserService and TaskService).

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
