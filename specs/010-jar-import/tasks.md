---

description: "Task list for the jar-import feature"
---

# Tasks: Import Daily-Task History from a monobank Jar Statement

**Input**: Design documents from `/specs/010-jar-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Requested by the brief (§6): parser specs, import specs (each broken on purpose once to prove it can fail), an e2e flow and layout-audit entries.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The slice and its reference data

- [x] T001 Create the slice folders under `src/app/features/jar-import/` (constants, models, services, components, pages, testing)
- [x] T002 [P] Add the comment grammar from the brief verbatim in `src/app/features/jar-import/constants/jar-comment-patterns.const.ts`
- [x] T003 [P] Add the alias reference data and canonical task titles in `src/app/features/jar-import/constants/jar-label-aliases.const.ts`
- [x] T004 [P] Add the header, category names and id prefix in `src/app/features/jar-import/constants/jar-statement-format.const.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The models and the synthetic statement every story is tested with

- [x] T005 [P] Add `JarRowCategory`, `JarRewardKind`, `JarReward`, `JarStatementRow` in `src/app/features/jar-import/models/` (one per file)
- [x] T006 [P] Add `JarImportAction`, `JarReviewRow`, `JarImportSuggestion`, `JarImportResult` in `src/app/features/jar-import/models/` (one per file)
- [x] T007 Write the synthetic statement with every variant from the brief (each shift form, `(100%)`, `(+100%`, `душ(+100%)`, double spaces, `(COMPLETED!)`, ё/case, `Помилор`, scores, pomodoro, timed, counted, top-up, one-offs, aliases, a same-day duplicate, a 21.40 withdrawal) in `src/app/features/jar-import/testing/jar-statement.fixture.ts`

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Read a statement and see what is in it (Priority: P1) 🎯 MVP

**Goal**: Pick a file, see a correct summary, or a clear rejection.

**Independent Test**: Pick the fixture and compare the summary with its known counts; pick a CSV with another header.

### Tests for User Story 1

- [x] T008 [US1] Parser specs: header rejection, malformed rows, local-time dates, ids, every comment variant, the recurring/one-off rule and the aliases, in `src/app/features/jar-import/services/jar-statement-parser.service.spec.ts`

### Implementation for User Story 1

- [x] T009 [US1] Generate `JarStatementParserService` with the Angular CLI (the angular-cli MCP server here has no generate tool) and implement `parse(text)` and `fold(text)` in `src/app/features/jar-import/services/jar-statement-parser.service.ts`
- [x] T010 [US1] Validate the parser against the real statement from a scratchpad probe (never in the repository): 0 failures and the brief's counts
- [x] T011 [P] [US1] Build the summary component in `src/app/features/jar-import/components/jar-statement-summary/`
- [x] T012 [US1] Build the page (picker, rejection, summary) in `src/app/features/jar-import/pages/jar-import-page/`
- [x] T013 [US1] Route it as `settings/jar-import` in `src/app/app.routes.ts` and link it from `src/app/features/settings/settings.html`

**Checkpoint**: The statement can be read and checked

---

## Phase 4: User Story 2 - Review the suggested grouping and import (Priority: P1)

**Goal**: Editable review, then one transaction that writes tasks, difficulties, completions and streaks.

**Independent Test**: Import the fixture; check Tasks (titles, difficulties, streaks) and the dashboard.

### Tests for User Story 2

- [x] T014 [US2] Import specs: suggestions, difficulties and tiers, re-import adds nothing, balance untouched, an existing task is reused, streaks, a shifted row on the previous day, same-day duplicates, skip, one transaction, in `src/app/features/jar-import/services/jar-import.service.spec.ts`

### Implementation for User Story 2

- [x] T015 [US2] Generate `JarImportService` with the Angular CLI and implement `suggest(rows)` in `src/app/features/jar-import/services/jar-import.service.ts`
- [x] T016 [US2] Implement `import(rows, review)` for daily tasks: difficulties, completions, streaks, in one transaction, in `src/app/features/jar-import/services/jar-import.service.ts`
- [x] T017 [P] [US2] Build the review list (signal form over the rows) and its spec in `src/app/features/jar-import/components/jar-review-list/`
- [x] T018 [US2] Wire review and import into the page, with the result snackbar and navigation to Tasks, in `src/app/features/jar-import/pages/jar-import-page/`
- [x] T019 [US2] Break each import behaviour on purpose once, confirm its spec fails, revert

**Checkpoint**: Daily-task history imports end to end

---

## Phase 5: User Story 3 - Scores, focus sessions, one-offs and withdrawals (Priority: P2)

**Goal**: The rest of the jar's history lands in its tables.

**Independent Test**: Import the fixture; check daily scores, focus earnings, completed goals and the ledger.

### Tests for User Story 3

- [x] T020 [US3] Extend `jar-import.service.spec.ts` for scores (streak, an existing app score kept), pomodoro sessions (count, split, kind), goals and withdrawals (rounded, no balance change)

### Implementation for User Story 3

- [x] T021 [US3] Implement the score, pomodoro, goal and withdrawal writes in `src/app/features/jar-import/services/jar-import.service.ts`

**Checkpoint**: The whole statement imports

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T022 [P] Document that imported ids are not UUIDs in `docs/schema.md`
- [x] T023 E2E: import the fixture, check the task list, streaks and dashboard earnings, in `e2e/src/jar-import.spec.ts`
- [x] T024 Register the page in the layout audit's `SCREENS` (empty, rejected, worst-case 60-row statement with a 100-character label) in `e2e/src/layout-audit.spec.ts`
- [x] T025 Run `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e` and look at the screenshots at 360px and 1280px, light and dark

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks all stories
- **US1 (Phase 3)**: After Foundational
- **US2 (Phase 4)**: After US1 (needs the parser and the page)
- **US3 (Phase 5)**: After US2 (extends the same service and transaction)
- **Polish (Phase 6)**: After all stories

### Within Each User Story

- Specs are written with the code they cover, and broken on purpose once before the story is done.
- Models before services, services before the components that call them.

### Parallel Opportunities

- T002–T004, T005–T006, T011 with T009, T017 with T015–T016, T022 with anything.

---

## Implementation Strategy

### MVP First

1. Phases 1–2, then US1: the statement can be read and checked against the bank.
2. US2: the history is in the app.
3. US3: the dashboard's past earnings are complete.
4. Polish: docs, e2e, layout audit, the four gates.

---

## Phase 7: Convergence

- [x] T026 After writing imported scores, recompute `streakAtThisDay` of the app's existing scores on the following days until the run of 9+ scores breaks (leave their `rewardEarned` alone), inside the same transaction, with a spec in `src/app/features/jar-import/services/jar-import.service.spec.ts`, in `src/app/features/jar-import/services/jar-import.service.ts` per US3/AC1 (partial)
- [x] T027 Keep every session of an imported pomodoro row ending on the row's effective day (a multi-session row paid shortly after midnight currently ends its earlier sessions the day before, so the dashboard credits them there), with a spec, in `src/app/features/jar-import/services/jar-import.service.ts` per US3/AC2 (partial)
- [x] T028 Look up the rows of skipped groups in the id-keyed tables too, and count the ones already present as already imported rather than skipped, with a spec, in `src/app/features/jar-import/services/jar-import.service.ts` per FR-016 (partial)
