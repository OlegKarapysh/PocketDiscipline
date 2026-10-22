---

description: "Task list for Import Historical Daily Scores from Telegram Chat Export"
---

# Tasks: Import Historical Daily Scores from Telegram Chat Export

**Input**: Design documents from `/specs/012-telegram-scores-import/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Unit and E2E test tasks are included to satisfy the project's mandatory verification gates (`npm test` and `npm run e2e`, including `e2e/src/layout-audit.spec.ts`) per `AGENTS.md` and `SC-001`–`SC-005`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Exact repository-relative file paths and requirement IDs (`FR-###`, `AC-###`, `SC-###`) are included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure vertical slice directories exist for the Telegram daily scores import feature (`AC-001`, `AC-002`).

- [X] T001 Create `pages/telegram-import-page` directory under `src/app/features/daily-scores/` (`AC-001`, `AC-002`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the four in-memory data models (one interface per file per `docs/code_style.md`) required by the parser, import service, and page component (`AC-001`, `AC-003`).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Create `TelegramScoreRow` interface (`date`, `score`, `createdAt`) in `src/app/features/daily-scores/models/telegram-score-row.model.ts` (`AC-001`, `AC-003`, `FR-006`, `FR-007`)
- [X] T003 [P] Create `TelegramExportParseResult` interface (`scores`, `duplicateDates`, `skippedMessages`) in `src/app/features/daily-scores/models/telegram-export-parse-result.model.ts` (`AC-001`, `AC-003`, `FR-008`, `FR-009`)
- [X] T004 [P] Create `TelegramImportPreview` interface (`totalScores`, `newScores`, `replacedScores`, `highScores`, `averageScore`, `resultingStreak`, `startDate`, `endDate`, `duplicateDates`, `skippedMessages`) in `src/app/features/daily-scores/models/telegram-import-preview.model.ts` (`AC-001`, `AC-003`, `FR-011`)
- [X] T005 [P] Create `TelegramImportResult` interface (`imported`, `replaced`, `skipped` combining `skippedMessages.length + duplicateDates`, and `resultingStreak`) in `src/app/features/daily-scores/models/telegram-import-result.model.ts` (`AC-001`, `AC-003`, `FR-012`, `FR-016`)

**Checkpoint**: All feature models are in place — user story implementation can begin.

---

## Phase 3: User Story 1 - Preview a Telegram Chat Export Before Importing (Priority: P1) 🎯 MVP

**Goal**: Parse a selected Telegram Desktop `result.json` file locally on the device, validate its structure and dates, match `1/10`–`10/10` scores, deduplicate same-day messages (keeping the latest), collect skipped non-matching text messages, and render the Preview card on `/settings/telegram-import` before writing any data (`FR-001`–`FR-011`, `SC-001`, `SC-003`).

**Independent Test**: Open `/settings/telegram-import`, pick a sample `result.json` containing valid `1/10`–`10/10` messages, service/empty messages, same-day duplicates, and non-matching text messages, and verify the preview stat cards, duplicate/skipped notes, skipped messages list, and rejection error alert for invalid files without modifying `dailyScores`.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement `TelegramScoresParserService` (`parse(text)` with UTF-8 BOM stripping, JSON and `messages` array validation, filtering out non-`"message"` and empty entries, string and segment-array text extraction, local `YYYY-MM-DD[THH:mm[:ss]]` date parsing and calendar validation, `^(10|[1-9])/10$` matching, 40-character truncated skipped message formatting, same-day deduplication keeping latest timestamp, and empty-scores rejection) in `src/app/features/daily-scores/services/telegram-scores-parser.service.ts` (`AC-002`, `AC-003`, `FR-002`–`FR-010`, `SC-001`, `SC-003`)
- [X] T007 [P] [US1] Add unit tests for `TelegramScoresParserService` (covering valid `1/10`–`10/10` parsing, 400+ message batch parsing with `< 1000ms` duration assertion, segmented text arrays, BOM/whitespace, service and empty message filtering, same-day duplicate resolution, skipped message formatting and 40-char truncation, invalid JSON/structure rejection, invalid calendar date rejection, and zero-score rejection) in `src/app/features/daily-scores/services/telegram-scores-parser.service.spec.ts` (`FR-003`–`FR-010`, `SC-001`, `SC-003`)
- [X] T008 [US1] Implement `preview(parsed)` and chronological `planImport(parsed, existing)` in `TelegramScoresImportService` (calculating `totalScores`, `newScores`, `replacedScores`, `highScores`, `averageScore` rounded to 1 decimal place, `resultingStreak`, `startDate`, `endDate`, `duplicateDates`, and `skippedMessages` against `db.dailyScores`) in `src/app/features/daily-scores/services/telegram-scores-import.service.ts` (`AC-003`, `FR-011`, `FR-013`, `SC-001`)
- [X] T009 [US1] Build `TelegramImportPage` file picker (`readFile`, resetting `picker.value = ''` to support re-picking the same file), error alert banner, and Preview section card (`StatCard` grid for Scores to import, Current streak, Average score, and Period, duplicate/skipped notes, and Skipped messages list) in `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.ts`, `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.html`, and `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.scss`, and register the lazy-loaded child route `telegram-import` under `settings` in `src/app/app.routes.ts` (`AC-001`, `AC-004`, `FR-001`, `FR-002`, `FR-011`, `SC-003`, `SC-005`)

**Checkpoint**: User Story 1 is functional — users can pick a `result.json` file on `/settings/telegram-import` and inspect the complete preview or rejection error locally.

---

## Phase 4: User Story 2 - Import Scores and Recalculate Chronological Streaks and Rewards (Priority: P1)

**Goal**: Write all imported and streak-affected `dailyScores` rows in a single atomic Dexie transaction when the user clicks "Import", replacing overlapping dates, recalculating `streakAtThisDay` and `rewardEarned` chronologically across all dates using `daily-score-reward.const.ts`, leaving `users.balance` untouched, showing a summary snackbar, and navigating to `/daily-scores` (`FR-012`–`FR-016`, `SC-002`, `SC-004`).

**Independent Test**: With existing scores in `db.dailyScores` and a known user balance in `db.users`, preview and import a Telegram export on `/settings/telegram-import`; verify that overlapping dates are replaced, non-overlapping dates are preserved with recalculated streaks, imported rewards match the `+10%` per consecutive `9`–`10` day rule (capped at `+100%`), `users.balance` is unchanged, the snackbar summary is shown, and the router navigates to `/daily-scores`.

### Implementation for User Story 2

- [X] T010 [US2] Implement `import(parsed)` in `TelegramScoresImportService` using a single `db.transaction('rw', [db.dailyScores], ...)` and `bulkPut` to write imported rows (with whole-hryvnia `rewardEarned` from `REWARD_GOOD`/`REWARD_PERFECT`/`STREAK_BONUS_STEP`/`MAX_STREAK_BONUS` in `src/app/features/daily-scores/constants/daily-score-reward.const.ts` and chronological `streakAtThisDay`), update `streakAtThisDay` on any subsequent existing dates whose streak changed while preserving their `rewardEarned`, return `{ imported, replaced, skipped: parsed.skippedMessages.length + parsed.duplicateDates, resultingStreak }`, and leave `db.users` untouched, in `src/app/features/daily-scores/services/telegram-scores-import.service.ts` (`AC-003`, `FR-012`–`FR-016`, `SC-002`, `SC-004`)
- [X] T011 [P] [US2] Add unit tests for `TelegramScoresImportService` (`preview` and `import`: chronological streak and reward bonus calculation, calendar gap streak reset, replacing overlapping dates, cascading streak updates to later existing dates while keeping their `rewardEarned`, leaving `users.balance` untouched, and atomic rollback on failure) in `src/app/features/daily-scores/services/telegram-scores-import.service.spec.ts` (`FR-011`–`FR-015`, `SC-002`, `SC-004`)
- [X] T012 [US2] Wire `runImport()` and `describe(result)` in `TelegramImportPage` to invoke `TelegramScoresImportService.import(parsed)`, display the summary or error notification via `SnackBarService`, and navigate to `/daily-scores`, in `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.ts` and `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.html` (`AC-004`, `FR-012`, `FR-016`)
- [X] T013 [P] [US2] Add unit tests for `TelegramImportPage` (file selection, preview rendering, error alert display, `runImport()` snackbar summary and navigation to `/daily-scores`, and import failure handling) in `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.spec.ts` (`FR-001`, `FR-011`, `FR-012`, `FR-016`)

**Checkpoint**: User Stories 1 and 2 are complete — users can preview and atomically import Telegram daily scores end-to-end.

---

## Phase 5: User Story 3 - Navigate to Telegram Import from Settings (Priority: P2)

**Goal**: Provide a discoverable "Import Telegram scores" link on the Settings page (`/settings`) that navigates to `/settings/telegram-import` (`FR-001`).

**Independent Test**: Open `/settings`, click the "Import Telegram scores" link, and verify navigation to `/settings/telegram-import`.

### Implementation for User Story 3

- [X] T014 [US3] Add the `"Import Telegram scores"` navigation link (`routerLink="/settings/telegram-import"`) to the Settings page template in `src/app/features/settings/settings.html` and verify it in `src/app/features/settings/settings.spec.ts` (`AC-004`, `FR-001`)

**Checkpoint**: All user stories (`US1`, `US2`, `US3`) are independently functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end Playwright verification, responsive layout audit registration across mobile and desktop viewports, and full quality gate execution (`AC-004`, `SC-001`–`SC-005`).

- [X] T015 [P] Add end-to-end Playwright tests for navigating from `/settings` to `/settings/telegram-import`, rejecting a non-Telegram JSON file, and previewing and importing scores (verifying overlapping date replacement, snackbar summary, navigation to `/daily-scores`, updated streak, and unchanged user balance) in `e2e/src/telegram-import.spec.ts` (`FR-001`–`FR-016`, `SC-002`–`SC-004`)
- [X] T016 [P] Register `telegram import`, `telegram import: rejected file`, and `telegram import: worst-case export` screens in `e2e/src/layout-audit.spec.ts` (`AC-004`, `SC-005`)
- [X] T017 Run `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e` to verify all linting, UI baseline, typecheck, unit test, E2E, and responsive layout audit gates pass (`AC-001`–`AC-004`, `SC-001`–`SC-005`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (`T001`).
- **Foundational (Phase 2)**: Depends on Setup (`T001`) — blocks all user stories (`T002`–`T005`).
- **User Story 1 (Phase 3)**: Depends on Foundational (`T002`–`T005`).
- **User Story 2 (Phase 4)**: Depends on User Story 1 (`T006`, `T008`, `T009`).
- **User Story 3 (Phase 5)**: Depends on `T009` (which registers `/settings/telegram-import`); can run in parallel with Phase 4.
- **Polish (Phase 6)**: Depends on User Stories 1, 2, and 3 being complete (`T015`–`T017`).

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; delivers local parsing, validation, and the Preview card on `/settings/telegram-import`.
- **User Story 2 (P1)**: Extends `TelegramScoresImportService` and `TelegramImportPage` from US1 to execute the atomic `dailyScores` import, streak/reward recalculation, snackbar notification, and navigation to `/daily-scores`.
- **User Story 3 (P2)**: Adds the entry link in `src/app/features/settings/settings.html` to reach `/settings/telegram-import`.

### Parallel Opportunities

- **Phase 2 (Foundational)**: `T002`, `T003`, `T004`, and `T005` create separate model files and can run in parallel.
- **Phase 3 (US1)**: `T006` (`telegram-scores-parser.service.ts`) and `T007` (`telegram-scores-parser.service.spec.ts`) can run in parallel with `T008` (`telegram-scores-import.service.ts` preview logic).
- **Phase 4 (US2)**: `T011` (`telegram-scores-import.service.spec.ts`) and `T013` (`telegram-import-page.spec.ts`) can run in parallel once `T010` and `T012` are complete.
- **Phase 6 (Polish)**: `T015` (`e2e/src/telegram-import.spec.ts`) and `T016` (`e2e/src/layout-audit.spec.ts`) touch separate E2E files and can run in parallel before `T017`.

---

## Parallel Example: Foundational & User Story 1

```bash
# Launch all Foundational model tasks in parallel:
Task: "T002 [P] Create TelegramScoreRow interface in src/app/features/daily-scores/models/telegram-score-row.model.ts"
Task: "T003 [P] Create TelegramExportParseResult interface in src/app/features/daily-scores/models/telegram-export-parse-result.model.ts"
Task: "T004 [P] Create TelegramImportPreview interface in src/app/features/daily-scores/models/telegram-import-preview.model.ts"
Task: "T005 [P] Create TelegramImportResult interface in src/app/features/daily-scores/models/telegram-import-result.model.ts"

# Launch parser implementation and unit tests in parallel with import preview logic:
Task: "T006 [P] [US1] Implement TelegramScoresParserService in src/app/features/daily-scores/services/telegram-scores-parser.service.ts"
Task: "T007 [P] [US1] Add unit tests for TelegramScoresParserService in src/app/features/daily-scores/services/telegram-scores-parser.service.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup (`T001`)
2. Complete Phase 2: Foundational (`T002`–`T005`)
3. Complete Phase 3: User Story 1 (`T006`–`T009`) — validate local export parsing and Preview card independently
4. Complete Phase 4: User Story 2 (`T010`–`T013`) — validate atomic `dailyScores` import, streak/reward recalculation, and balance preservation

### Incremental Delivery

1. Setup + Foundational → Route and models ready
2. User Story 1 (P1) → Parse and preview `result.json` with duplicate and skipped message visibility
3. User Story 2 (P1) → Atomic import, chronological streak/reward recalculation, snackbar summary, and `/daily-scores` navigation
4. User Story 3 (P2) → Discoverable link from `/settings`
5. Polish → Full E2E flow, layout audit across all widths, and verification gates
