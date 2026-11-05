# Tasks: Data Import (Restore)

**Input**: Design artifacts in `specs/015-data-import/`.
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts](./contracts/), [quickstart.md](./quickstart.md).
**Tests**: Required by the feature. Unit tests use real DbService/fake-indexeddb; e2e uses real browser IndexedDB. No Dexie mocks.
**Organization**: Setup → foundation → US3 (P1 safety/validation) → US1 (P1 restore) → US2 (P2 safety export) → final verification.

## Format and execution rules

Every task has a sequential ID, checkbox, exact file path and a story label when story-specific. [P] means eligible for parallel work only after its listed prerequisites; it does not authorize overlapping edits to the same file.

Write behaviour tests before the corresponding implementation and confirm they detect failure. For working code being refactored, deliberately break the relevant behaviour, observe a failing test, then revert the break. Keep synthetic fixtures in testing/ or e2e, and scratch work outside the repository. Do not commit automatically.

## Phase 1: Setup

**Goal**: Verify the existing slice and toolchain without changing application behaviour.

- [X] T001 Install locked dependencies from package-lock.json with npm ci in this worktree; reconnect Angular CLI MCP using ng mcp, discover angular.json and obtain v22 best practices before service generation.
- [X] T002 Audit exported persisted row shapes against src/app/core/models/ and existing producers, especially optional reward.updatedAt, documented legacy description/icon, zero amounts produced by v9 rounding, and cat-general; record final supported fields in specs/015-data-import/data-model.md.
- [X] T003 [P] Verify the reconciled reader guidance in specs/014-data-export/contracts/backup-file.md remains consistent with newer-app refusal and historical-reference policy in specs/015-data-import/contracts/restore-file.md, preserving format 1 and all exported bytes.

**Checkpoint**: Actual fields and tooling are verified; no new packages or schema version.

## Phase 2: Foundational prerequisites

**Goal**: Establish shared representations and synthetic data before story services.

- [X] T004 Define ValidatedBackup, DeviceSnapshot, BackupComparison, BackupImportState and BackupImportError in separate files under src/app/features/backup/models/ as listed in plan.md; keep parsed input unknown until validated.
- [X] T005 Add the shared 50 MiB size limit in src/app/features/backup/constants/backup-import.const.ts and explicit source/current table/field descriptor data in src/app/features/backup/validation/backup-schema.const.ts after T002/T004; preserve allowed optional-field absence.
- [X] T006 [P] Create synthetic all-table, older-schema, malformed and historical-missing-parent fixture builders in src/app/features/backup/testing/backup.fixture.ts after T004; never copy real backup data.
- [X] T007 [P] Add table/primary-key canonical snapshot and comparison fixtures in e2e/src/backup-import.fixture.ts after T004; reuse e2e/src/indexed-db.ts and correct its obsolete comment about unit tests mocking Dexie.
- [X] T008 Verify the existing transformation rule and document known persisted shape/fallback-category corrections in docs/schema.md after T002; do not modify existing version blocks in src/app/database/db.service.ts.

**Checkpoint**: Models/descriptors/fixtures are available. Phase 3 is the safety prerequisite for the restore UI.

## Phase 3: User Story 3 — Reject Unsafe Files and Recover from Failure (P1)

**Goal**: A checked, transformed file is the only data that can reach restore; rejection never writes.

**Independent Test**: Prepare valid/invalid/old/new/encrypted files through the service and picker, compare every store on rejection, and prove each adjacent schema transform. The mid-write rollback part is integrated with US1 at T034.

### Tests first

- [X] T009 [P] [US3] Add header, exact size boundary, malformed JSON, marker, SemVer (numeric/prerelease/build), newer-version and encrypted-without-data tests in src/app/features/backup/services/backup-validation.service.spec.ts after Phase 2.
- [X] T010 [US3] Extend src/app/features/backup/services/backup-validation.service.spec.ts after T009 with all-table field/type/date/key/money/nested difficulty tests, required category references, permitted missing historical parents, category colors (three/six hex digits with either case and existing empty-string values accepted unchanged; CSS names/functions/declarations rejected), absent/null distinction and unchanged real database assertions.
- [X] T011 [P] [US3] Add adjacent schema 1→11 and full-chain tests in src/app/features/backup/services/backup-schema.service.spec.ts, including v2/v8 seed-once, v7 identity, v9 rounding/zero, v10 primary-key ordering, v11 empty rates and missing-transform refusal.
- [X] T012 [P] [US3] Add real-DbService preparation tests in src/app/features/backup/services/backup-import.service.spec.ts for no writes before consent, descriptor coverage equal to db.tables, transformation-chain coverage reaching db.verno and stable prepared data on retry.

### Implementation

- [X] T013 [US3] Generate BackupSchemaService using Angular CLI and implement explicit detached source-version transforms in src/app/features/backup/services/backup-schema.service.ts; reuse migration rules without opening a temporary persistent DB or invoking ready hooks.
- [X] T014 [US3] Generate BackupValidationService using Angular CLI and implement bounded parsing, strict header/SemVer/refusal precedence and structured safe errors in src/app/features/backup/services/backup-validation.service.ts.
- [X] T015 [US3] Complete src/app/features/backup/services/backup-validation.service.ts with every source/current row validator, duplicate keys, nested money and reference exceptions; use audited stored domains instead of current form maxima and never strip accepted values.
- [X] T016 [US3] Generate BackupImportService using Angular CLI and implement prepare(file) orchestration in src/app/features/backup/services/backup-import.service.ts after T013–T015; validate source, transform once, validate result and return checked metadata/data without writes.
- [X] T017 [US3] Create the initial picker/checking/error state and selection-generation guard in src/app/features/backup/pages/data-import-page/data-import-page.ts with separate data-import-page.html and data-import-page.scss; clear previous eligibility immediately and reset the native picker for reselection.
- [X] T018 [US3] Add component rejection tests in src/app/features/backup/pages/data-import-page/data-import-page.spec.ts for stale read results, destruction, unreadable file, encrypted/newer messages, same-file reselection and no restore eligibility.
- [X] T019 [US3] Register only the import picker/error route in src/app/app.routes.ts and rejection tests in e2e/src/backup-import-failure.spec.ts after T017; test wrong content and required-reference failures leave all native stores unchanged, without exposing unvalidated restore.

**Checkpoint**: Preparation/rejection works offline, every schema transition is explicit and the page cannot write yet.

## Phase 4: User Story 1 — Review and Restore a Backup (P1)

**Goal**: Review both snapshots, explicitly confirm, replace atomically, stop local timer safely and reach dashboard.

**Independent Test**: Seed → real export download → purge → select that file → review → confirm → compare all stores and balance, allowing only lastExportedAt. Force a native mid-write abort and prove rollback immediately and after reload.

### Tests first

- [X] T020 [P] [US1] Extend src/app/features/backup/services/backup-import.service.spec.ts with full-snapshot stale-consent checks (same counts/balance but edited title), all-table replacement/removal, timestamp-only override, no reseeding and rollback on an actual write failure.
- [X] T021 [P] [US1] Add replacement-hold, rollback deadline, matching imported id, delayed completion/recovery/start, generation and notification tests in src/app/features/pomodoro/services/pomodoro-timer.service.spec.ts; mutation-check the working stop/recovery behaviour before refactoring.
- [X] T022 [P] [US1] Add queued timer mutation guard tests in src/app/features/pomodoro/services/pomodoro-storage.service.spec.ts and authoritative-main-data/legacy-ready-copy tests in src/app/database/legacy-pomodoro-migration.service.spec.ts.

### Implementation and integration

- [X] T023 [US1] Implement production-used replacement hold and memory-only final reset in src/app/features/pomodoro/services/pomodoro-timer.service.ts: drain tracked startup/start/completion work outside the DB transaction, block new mutations, preserve visible session/deadline, release unchanged on failure and invalidate old async work only on success.
- [X] T024 [US1] Guard queued timer mutations inside their storage transactions in src/app/features/pomodoro/services/pomodoro-storage.service.ts and pass captured generation/session guards from pomodoro-timer.service.ts; cover stale finally blocks and notification scheduling without changing normal stop/reload recovery.
- [X] T025 [US1] Guard stale legacy copying in src/app/database/legacy-pomodoro-migration.service.ts and its ready-hook integration in src/app/database/db.service.ts using authoritative profile lastExportedAt presence; await ready before review and do not delete the legacy source to repair an import error.
- [X] T026 [US1] Implement full consistent current snapshot and canonical equality in src/app/features/backup/services/backup-import.service.ts; compare all fields/keys, preserving meaningful nested array order and ignoring incidental table row/object property order.
- [X] T027 [US1] Implement confirmed atomic replacement in src/app/features/backup/services/backup-import.service.ts after T023–T026: acquire timer hold, compare baseline inside transaction over db.tables, clear/bulkAdd without reseeding, override lastExportedAt in that transaction, propagate every write failure and finalize timer only after commit.
- [X] T028 [US1] Complete src/app/features/backup/pages/data-import-page/data-import-page.ts, data-import-page.html and data-import-page.scss with source metadata, transformed notice, precomputed per-table comparison, Amount balances, progress, shared destructive confirmation, refreshed consent, guarded retries, toast and dashboard navigation.
- [X] T029 [US1] Extend src/app/features/backup/pages/data-import-page/data-import-page.spec.ts for exact warning text, cancellation completion without emission, current-data load failure, changed review, duplicate taps and committed outcome separated from feedback/navigation failure.
- [X] T030 [US1] Add Import data to src/app/features/settings/settings.html and verify the existing lazy Settings child route in src/app/app.routes.ts opens the completed backup page.
- [X] T031 [US1] Add the smoke-tagged real UI export → purge → import round trip in e2e/src/backup-import.spec.ts using the downloaded file and all-store keyed comparisons; include destination-only rows, balance, streaks, optional fields and jar/date ids.
- [X] T032 [US1] Extend e2e/src/backup-import.spec.ts with isolated device-B context, offline restore and same-id active session preservation; verify stopped local timer after import and normal stored-session recovery only on later reload.
- [X] T033 [US1] Add changed-title consent and delayed timer mutation races in e2e/src/backup-import-concurrency.spec.ts, including a second page sharing the browser context for edits that keep counts/balance unchanged; timer holds guard the importing page's old work, while other-tab transactions serialized after commit are subsequent activity; avoid Angular debug globals.
- [X] T034 [US1] Complete e2e/src/backup-import-failure.spec.ts with scoped native IDBObjectStore clear/add/put instrumentation that aborts after a successful clear and designated insert, asserts injection fired, restores prototypes in finally and compares all eleven stores immediately and after reload; also check failed replacement leaves local timer/session intact before reload.

**Checkpoint**: Safe P1 restore is complete; no invalid input bypass, partial commit or post-commit timer database cancellation. US3's rollback acceptance is now fully proved.

## Phase 5: User Story 2 — Keep a Safety Backup Before Replacing (P2)

**Goal**: Export the destination before replacement using existing share/download semantics, then restore that file to undo a mistake.

**Independent Test**: Export device A as safety file → restore B → restore A's safety file; compare A's rows/balance/streaks subject only to the backup timestamp rule.

### Tests first

- [X] T035 [P] [US2] Add action component tests in src/app/features/backup/components/backup-export-actions/backup-export-actions.spec.ts for default/custom label, external disabled/busy, fresh-tap retry, cancellation, sharing failure, download and metadata recording.
- [X] T036 [P] [US2] Add safety-flow component tests in src/app/features/backup/pages/data-import-page/data-import-page.spec.ts for retained incoming file, no auto-import, optional safety export, refreshed baseline and failed-restore preservation of successful safety-export time.

### Implementation and integration

- [X] T037 [US2] Extract the working BackupCard interaction into src/app/features/backup/components/backup-export-actions/backup-export-actions.ts, backup-export-actions.html and backup-export-actions.scss with primaryLabel/disabled inputs, busy output and per-instance prepared file; reuse existing export/sharing services.
- [X] T038 [US2] Delegate export actions from src/app/features/backup/components/backup-card/backup-card.ts, backup-card.html and backup-card.scss; preserve its last-backup display and port retained behaviour assertions in backup-card.spec.ts without duplicate private-handler tests.
- [X] T039 [US2] Place the reusable actions on src/app/features/backup/pages/data-import-page/data-import-page.html with Export current data/Download labels, undo guidance and busy coordination in data-import-page.ts; refresh current baseline after the action and require separate restore confirmation.
- [X] T040 [US2] Add native-download A → B → A safety recovery in e2e/src/backup-import-safety.spec.ts, comparing every row, balance and streak subject only to lastExportedAt.
- [X] T041 [US2] Extend e2e/src/backup-import-safety.spec.ts with share cancellation, needs-tap/failure then Download, optional proceed-without-backup and failed restore after successful safety export; assert incoming selection survives and import never begins automatically.

**Checkpoint**: All three user stories work together and the original Settings export behaviour remains unchanged.

## Phase 6: Polish and cross-cutting verification

- [X] T042 Register idle/checking/review/replacing/error/safety-preparing/ready-share/confirmation layouts in e2e/src/layout-audit.spec.ts using browser delays and synthetic long filenames/errors/all counts/large balances; reuse e2e/src/dialog.ts and do not add application test-state flags or KNOWN_GAPS.
- [ ] T043 [P] Add valid multi-year large-history fixture generation and cap/boundary coverage in src/app/features/backup/testing/backup.fixture.ts and relevant validation specs; measure file bytes and representative phone validation/restore responsiveness, recording results in specs/015-data-import/quickstart.md.
- [X] T044 [P] Complete source-schema compatibility/field documentation and user-facing restore limitations in docs/schema.md and specs/015-data-import/contracts/restore-file.md; confirm spec 014 guidance and user reload clarification remain consistent.
- [X] T045 Run npm run lint, npm run typecheck and npm test -- --watch=false from this worktree using package.json; fix failures structurally without suppressions, new packages or UI baseline growth.
- [X] T046 Run full npm run e2e and npm run e2e:smoke with playwright.config.ts and e2e/playwright.smoke.config.ts; verify port 4200 serves this worktree and all new failure tests actually exercised their injection.
- [X] T047 Generate layout-audit screenshots through e2e/src/layout-audit.spec.ts, inspect 360px/1280px in light and dark for all new states and correct any overflow, clipping, touch-target or desktop-layout issues.
- [ ] T048 Execute remaining manual/offline/share checks in specs/015-data-import/quickstart.md, record gate results and limits there, and verify git diff --check plus a clean intended-file scope; leave changes uncommitted for review.

**Checkpoint**: All implementation gates and required manual inspections pass. Planning checkboxes stay unchecked until the work is done.

## Dependencies and execution order

```text
Setup T001–T003
  -> Foundation T004–T008
    -> US3 T009–T019 (validated preparation and rejection)
      -> US1 T020–T034 (atomic restore; completes US3 mid-write proof)
        -> US2 T035–T041 (safety export and recovery)
          -> Polish T042–T048
```

US3 and US1 are both P1. US3's validation capability is implemented first because US1 must never accept unchecked input. US3's mid-write acceptance depends on the real replacement path and is explicitly completed at T034. US2 depends on the review/restore UI but its export-actions component can be built after foundation in a separate workstream; integrate only after T028. Do not present the unsafe portion of a story as a shippable MVP.

Within each phase, models/descriptors precede service implementations, tests precede covered behaviour, services precede page integration, and no tasks editing the same file run concurrently. T023→T024→T027 is sequential. T026 is independent of timer implementation once its tests/fixtures exist. Final gates follow all edits.

## Parallel execution examples

- **Foundation**: after T004, T006 unit fixtures and T007 browser fixtures touch different files; T005 descriptors follow the audited shape decision.
- **US3**: T009 header tests, T011 transform tests and T012 preparation tests are separate files. T010 waits for T009 because they share a test file. T013 schema service and T014 header validator may proceed separately, then integrate at T016.
- **US1**: T020 import-service tests, T021 timer tests and T022 storage/legacy tests are separate files. T025 legacy guard and T026 snapshot comparison can proceed independently while timer changes are completed. E2E T031, T033 and T034 use different spec files after the page is integrated; T032 follows T031.
- **US2**: T035 export-actions tests and T036 page tests are independent. T037 extraction precedes T038 delegation and T039 page integration; T040 precedes T041 because they share one browser file.
- **Polish**: T043 size profiling/fixtures and T044 documentation can proceed independently of T042 audit registration; all precede final gates.

## Implementation strategy and scope

Foundation + both P1 stories (US3 and US1), including rollback and timer races, form an internal integration checkpoint. The first releasable MVP requires US2 as well: offering a safety export is mandatory under FR-006, although taking it is optional for the user. Complete all three stories and every final gate before releasing the restore journey.

Deliver in these increments: checked preparation/rejection; atomic reviewed restore; reusable safety backup/recovery; responsive and verification completion. Reuse the existing export services, database, shared UI and fixtures before inventing abstractions. No commit or push is authorized by this checklist.

## Requirement coverage

| Specification requirements | Tasks |
| --- | --- |
| FR-001–005: entry, review, progress, no pre-write change, stale selections | T017–T019, T026, T028–T032 |
| FR-006–008: safety export, destructive consent, refreshed current state | T020, T027–T029, T033, T035–T041 |
| FR-009–012: envelope, versions, encryption, old transforms | T003, T009–T016, T019 |
| FR-013–018: transformation rule, rows/money/references, useful errors, bounded local input | T002, T005–T016, T018–T019, T032, T043–T044 |
| FR-019–023: atomic replace, exact values, backup time, timer, outcome | T020–T034, T040–T041 |
| FR-024 and AC-001–005: slice, code style, security and responsive shared UI | T001–T008, T017, T028, T037–T039, T042–T048 |
| SC-001–007 | Review/round-trip T028–T032; rejection/rollback T009–T019/T034; recovery T040–T041; layout T042/T047; all final gates T045–T048 |

**Task totals**: 48. Setup 3; foundation 5; US3 11; US1 15; US2 7; polish 7. Story labels refer to the original spec numbering, regardless of phase order.


## Implementation handoff (2026-11-05)

49 of 51 tasks are complete, including the Phase 7 convergence tasks T049–T051 (re-verified 2026-11-05: 1,200 unit tests, 108 full E2E tests, lint and typecheck passed). Only T043 (representative physical-phone profiling) and T048 (physical-device/native share checks) remain open. Their automated portions and desktop evidence are recorded in quickstart.md. The mandatory speckit.test hook passed: 1,197 unit tests and 108 full E2E tests. Production smoke passed all 23 tests; lint, typecheck, layout inspection and diff whitespace checks passed. No commit or push was made.

## Phase 7: Convergence

- [X] T049 Replace the bare native file input in src/app/features/backup/pages/data-import-page/data-import-page.html (and its .scss) with the jar/Telegram import picker pattern: a visually hidden input, a `mat-flat-button` "Choose backup" that opens it, and a wrapping file-name row; keep the reset-for-reselection and busy-disabled behaviour, update data-import-page.spec.ts and the e2e/layout-audit selectors that use the "Backup file" label per US1/AC1, AC-004 (partial)
- [X] T050 Remove the duplicated version-9 money-field map and rounding rule from src/app/features/backup/services/backup-schema.service.ts by sharing them with src/app/database/money-rounding-migration.service.ts (and the version-10 primary-key ordering with daily-task-order-migration.service.ts), so the backup transforms cannot drift from the database upgrades; keep the existing backup-schema.service.spec.ts assertions passing and mutation-check them per plan: transformations match existing database upgrades (partial)
- [X] T051 Replace the hard-coded `formatVersion > 1` and `schema > 11` limits in src/app/features/backup/services/backup-validation.service.ts with a shared BACKUP_FORMAT_VERSION constant in constants/backup-format.const.ts (also used by backup-export.service.ts in place of its literal 1) and the caller-supplied current schema (db.verno), so a future schema version fails only on its missing transform per FR-010, FR-013 (partial)
