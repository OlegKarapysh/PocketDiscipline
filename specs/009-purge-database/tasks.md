---

description: "Task list for Purge Database feature implementation"
---

# Tasks: Purge Database

**Input**: Design documents from `/specs/009-purge-database/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify Angular environment and Dexie.js setup is ready for feature development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Implement `purgeDatabase` method (or similar) in the Dexie database service (`src/app/database/db.service.ts`) to programmatically clear all user data tables and re-seed the fresh-install defaults.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Purge Database from Settings (Priority: P1) 🎯 MVP

**Goal**: As a developer or tester, I want to be able to purge all data from the database from the Settings tab, so I can easily reset the application state for testing purposes.

**Independent Test**: Can be fully tested by clicking the button, confirming the prompt, and verifying that the application's data is completely cleared.

### Implementation for User Story 1

- [x] T003 [P] [US1] Confirmation via the shared `ConfirmService` (destructive `ConfirmDialog`); no bespoke dialog needed.
- [x] T004 [US1] Update `src/app/features/settings/settings.ts` (and its template) to add the "Purge Database" button.
- [x] T005 [US1] Connect the button in `src/app/features/settings/settings.ts` to open the confirmation dialog, and upon confirmation, invoke the `purgeDatabase` method.
- [x] T006 [US1] Implement programmatic state clearing and navigation to the home screen immediately after a successful database purge.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T007 Validation steps covered by `e2e/src/purge-database.spec.ts` to ensure feature completeness.
- [x] T008 Run UI audit script `npm run lint` to ensure no design system violations.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Components (Dialog) should be created before integrating them into the page component.
- The UI should be fully wired to the core service before final state navigation logic is appended.

### Parallel Opportunities

- T003 (Dialog component creation) can be worked on in parallel with T002 if handled by different developers, since they touch completely distinct files.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently using the quickstart guide.
