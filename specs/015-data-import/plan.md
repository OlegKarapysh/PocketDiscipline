# Implementation Plan: Data Import (Restore)

**Branch**: `specs/015-data-import` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/015-data-import/spec.md`

## Summary

Add a local, replace-only restore journey at `/settings/data-import`. Validate the entire exported file, transform older schemas in memory, show incoming and device values, offer a reusable safety export, and require destructive confirmation. Commit all table replacement and the last-backup override in one Dexie transaction. A failed attempt changes no device rows.

The design uses a full device snapshot as the confirmation baseline. Inside the write transaction, compare current rows with that baseline before clearing anything. This catches edits that counts and balance cannot detect. Temporarily hold timer work during replacement, reset only memory after commit, and resume the unchanged timer on rollback. The user's clarified policy allows normal stored-session recovery after a subsequent reload.

## Technical Context

**Language/Version**: TypeScript ~6.0.2; Angular ^22.2.1. Use the verified defaults and component conventions in `docs/code_style.md`.

**Primary Dependencies**: Existing Dexie ^4.4.5, Angular Material ^22.2.1, RxJS ^7.8.0 and native File/IndexedDB/Web Share APIs. No new packages.

**Storage**: Existing `pocket-discipline-db`, schema 11, eleven tables. No new table, schema version, browser-storage marker or persisted revision. The only same-schema value override is `users.lastExportedAt`.

**Testing**: Vitest via Angular build unit-test, real DbService with fake-indexeddb and `openEmptyDb()`; Playwright with real browser IndexedDB, existing native database helpers, export/purge UI and layout audit.

**Target Platform**: Offline PWA on phone and desktop browsers; widths 360–1920px and both themes.

**Project Type**: Existing Angular SPA; extend the backup vertical slice.

**Performance Goals**: Report checking/replacing states before work; accept up to 50 MiB. A serialization-size probe for five years of 20 completions, 12 sessions, 10 withdrawals and one score per day produced 78,475 history rows / 15,658,843 bytes (14.93 MiB) before smaller catalog tables. This supports the cap for a typical history, not a phone runtime or memory claim. Measure validation and restore with valid multi-year fixtures during implementation.

**Constraints**: No merge, balance reconstruction, encryption, network transfer, destructive writes before confirmation, database reseeding on same-schema restore or production fault-injection switch.

**Scale/Scope**: One route, three new backup services, one reusable export-actions component, one import page, model types and schema descriptor data. Small integration changes in Settings, routing, pomodoro timer/storage, database legacy migration and documentation.

## Constitution Check

Gates checked before research and again after design:

- [x] Vertical slice: import, compatibility and validation policy stay in `features/backup/`; existing database/timer owners expose only their own mechanisms.
- [x] Minimal dependencies: no new runtime or development packages.
- [x] Code style: signals for view state, separate template/styles, Angular CLI-generated services, named production service responsibilities, real database unit tests.
- [x] SOLID: validation, schema transforms, transaction orchestration and export UI actions have distinct owners; no core-to-feature imports.
- [x] Design system: shared PageHeader, SectionCard, Amount, ConfirmService and SnackBarService; tokens only, responsive comparison, audit entries and no baseline growth.

Post-design result: all five gates pass. No complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/015-data-import/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    restore-file.md
    import-page.md
    restore-operation.md
  checklists/requirements.md
  tasks.md
```

### Source Code (repository root)

```text
src/app/features/backup/
  constants/backup-import.const.ts
  models/
    backup-import-state.type.ts
    validated-backup.model.ts
    device-snapshot.model.ts
    backup-comparison.model.ts
    backup-import-error.model.ts
  validation/backup-schema.const.ts
  services/
    backup-validation.service.ts             (+ adjacent spec)
    backup-schema.service.ts                 (+ adjacent spec)
    backup-import.service.ts                 (+ adjacent spec)
    backup-export.service.ts                 (reuse)
    file-sharing.service.ts                  (reuse)
  components/
    backup-card/                             (delegate export actions)
    backup-export-actions/                   (.ts/.html/.scss/.spec.ts)
  pages/data-import-page/                    (.ts/.html/.scss/.spec.ts)
  testing/backup.fixture.ts                  (synthetic only)
src/app/features/pomodoro/services/
  pomodoro-timer.service.ts                  (replacement hold/reset)
  pomodoro-storage.service.ts                (guard queued timer mutations)
src/app/app.routes.ts                        (Settings child)
src/app/features/settings/settings.html      (Import data link)
src/app/database/
  legacy-pomodoro-migration.service.ts       (guard stale ready-hook copy)
e2e/src/
  backup-import.spec.ts
  backup-import-failure.spec.ts
  backup-import-safety.spec.ts
  backup-import-concurrency.spec.ts
  backup-import.fixture.ts
  indexed-db.ts                             (reuse; correct stale mock comment)
  layout-audit.spec.ts                       (new route/states)
```

**Structure Decision**: Share export interaction within the existing backup slice. Keep timer mutation guards inside pomodoro and legacy-migration ordering inside the database owner. Model/descriptor files do not introduce repository layers or a generic validation framework.

## Phase 0: Research

See [research.md](./research.md). Decisions resolve compatibility, all schema transitions 1–11, historical-reference exceptions, stale confirmation, timer collisions, export action reuse and native rollback injection. Missing Angular MCP was reported to the user; no Angular source code or unverified v22 API is introduced by this planning task. Implementation must reconnect MCP before generating services.

## Phase 1: Design

- [data-model.md](./data-model.md): parsed input, validated snapshot, complete device baseline, comparison and operation states.
- [contracts/restore-file.md](./contracts/restore-file.md): compatibility order, row rules and source-version table sets.
- [contracts/restore-operation.md](./contracts/restore-operation.md): transaction boundary, timer coordination, errors and test seam.
- [contracts/import-page.md](./contracts/import-page.md): controls, messages, cancellation and responsive/audit states.
- [quickstart.md](./quickstart.md): setup and executable validation journeys.

Implement the schema-transform rule already added to `docs/schema.md`. Reconcile stale reward/fallback-category examples and verify spec 014's reader guidance remains aligned with this import policy. Do not change the format version or existing database version blocks.

## Delivery and Verification

Deliver the P1 validation/failure story before exposing the P1 restore story, then integrate the P2 safety export. Unit and browser tests accompany each. No usable restore increment may bypass validation, atomic replacement or the offered safety export required by FR-006. P1-only integration is an internal checkpoint; release requires all three stories and every final gate.

Completion gates: `npm run lint`, `npm run typecheck`, `npm test -- --watch=false`, full `npm run e2e`. Also run production smoke for the new smoke-tagged round trip and inspect 360/1280 light/dark layouts. These are future implementation gates, not claims of execution in this documentation task.
