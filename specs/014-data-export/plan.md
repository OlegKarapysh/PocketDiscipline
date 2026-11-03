# Implementation Plan: Data Export (Backup)

**Branch**: `[014-data-export]` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-data-export/spec.md`

## Summary

A Backup card on Settings exports every table of the Dexie database to one file and hands it to the system
share sheet, or to a download. A secondary Download button is always there. The card also shows how old the
last backup is.

- **Snapshot**: `BackupExportService` reads all of `db.tables` in one read-only transaction and wraps the rows in a
  versioned envelope ([contracts/backup-file.md](./contracts/backup-file.md)). The result is a
  `pocket-discipline-YYYY-MM-DD-HHmm.txt` file of type `text/plain`. Chromium refuses to share `.json`
  ([research §1](./research.md#1-which-file-types-the-share-sheet-accepts)).
- **Delivery**: `FileSharingService` calls `navigator.share` and maps its result, or downloads through an
  object URL.
- **Short user activation**: browsers let `navigator.share` run only for a short time after the user's tap.
  If that time has passed, the share is refused with `NotAllowedError`. The card then keeps the prepared file
  and offers a **Share** button
  ([research §2](./research.md#2-the-share-sheet-needs-a-recent-tap)). A spike on real phones comes first.
- **Last backup**: after a share or a download, the time goes into a new optional, unindexed
  `users.lastExportedAt`, so the schema stays at version 11. The card reads it live and shows "Never", "today",
  "yesterday" or "N days ago".

## Technical Context

**Language/Version**: TypeScript 6.0, Angular 22.2 (zoneless, OnPush by default)

**Primary Dependencies**: Dexie 4.4, Angular Material 22.2, RxJS 7.8, and the browser's Web Share API
(`navigator.canShare`, `navigator.share`). No new packages.

**Storage**: Dexie `pocket-discipline-db` stays at schema version 11. The feature reads every table and writes
one new optional field, `users.lastExportedAt`.

**Testing**: Vitest (`npm test -- --watch=false`) on the real `DbService` with `fake-indexeddb`
(`openEmptyDb()`). Playwright (`npm run e2e`) runs the new `e2e/src/backup-export.spec.ts` and the layout audit.

**Target Platform**: Offline-first PWA:

- Android Chrome and iOS Safari, which share the file.
- Desktop Chrome and Edge, which share or download.
- Firefox, which downloads.
- Widths from 360px to 1920px, in light and dark mode.

**Project Type**: Single-page web application (vertical slices under `src/app/features/`).

**Performance Goals**:

- The fixed 29,533-row workload is ready within 3 s in each of five measured runs on the reference Samsung Galaxy A54 (SC-002; `quickstart.md` section 4.2).
- Direct and fallback shares meet the duration/tap limits in SC-001 (`quickstart.md` section 4.1); T028 owns both device checks.
- The page never freezes while the file is prepared. The read is async, and the stringify of a few MB takes
  well under the 3 s.

**Constraints**:

- No schema version change and no new packages.
- The share has to start soon after the user's tap. If it cannot, the app offers a second tap.
- The file must be a `.txt` file, because Chromium does not share `.json` files.
- The backup time is recorded only after the file was delivered.
- Works offline.

**Scale/Scope**:

- 1 new slice, `features/backup/`, containing:
  - 2 services: `BackupExportService` and `FileSharingService`.
  - 5 models.
  - 1 constant: `BACKUP_FORMAT`.
  - 1 component: `BackupCard`.
- Changes outside the slice:
  - 1 field on the `User` model.
  - `tsconfig.json` gets `resolveJsonModule`, which the app and spec configs inherit.
  - `settings.html` and `settings.ts` render the card.
  - `docs/schema.md`.
- Tests: 1 new e2e spec, plus new entries in the layout audit.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Does the implementation use a Vertical Slice Architecture?** Yes.
  - The services, models, constant and component all live in `src/app/features/backup/`.
  - Outside the slice, it reads `DbService` (the persistence root), `UserService.user$`, `ClockService`,
    `SnackBarService` and `app-section-card`.
  - Settings renders the card, as it already does with `PomodoroRewardSettings`.
  - Nothing in `core/` imports the slice. The one core change is a field on `User`.
- [x] **Have we minimized external dependencies?** Yes. No packages are added. Sharing, download and JSON all
  use platform APIs.
- [x] **Will the new code follow `docs/code_style.md` and pass ESLint, EditorConfig and Prettier?** Yes:
  - Services are generated with the Angular CLI as `@Service()` classes.
  - Component state is signals only (rule 2).
  - The last-backup line is `toSignal` over a live query with no `initialValue`, and it stays blank until the
    row is read (rule 3, "not loaded is not empty").
  - The export is driven by the clicks themselves. There are no stored subscriptions.
  - The only new constant is `BACKUP_FORMAT`, which is shared by the service and the specs (rule 5).
  - Templates bind only `computed()` values (rule 7). Nothing in `core/` imports `features/` (rule 8).
  - One interface per file, and no `Component` suffix.
  - Tests use the real database. The completeness test is broken on purpose once to prove it can fail.
- [x] **Does the design adhere to SOLID principles and best practices?** Yes.
  - Each piece does one job:
    - `BackupExportService` builds the file and records the backup time.
    - `FileSharingService` is the browser mechanism that shares or downloads.
    - `BackupCard` runs the state machine.
  - The browser APIs sit behind `FileSharingService`, so tests replace that service rather than mocking the
    browser.
  - Iterating `db.tables` keeps the export closed to change: a new table needs no edit.
- [x] **Does any UI follow `docs/design_system.md`, with `scripts/check-ui.mjs` passing and its baseline not
  grown?** Yes.
  - The card uses `app-section-card`, `mat-flat-button`, `mat-stroked-button`, `mat-icon` and
    `mat-progress-spinner`, with copy in sentence case.
  - Styling uses tokens only. Actions sit in a `flex-wrap` row with no viewport breakpoint, and keep 44px touch
    targets.
  - No amber, because nothing is earned.
  - Messages go through `SnackBarService`.
  - The card's states are registered in the layout audit.

**Post-design re-check**: every gate still passes, with no violations. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/014-data-export/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── backup-file.md   # The file format: envelope, data, reader rules, promise to spec 016
│   └── backup-card.md   # UI contract of the Settings card: copy, states, feedback
├── checklists/
│   └── requirements.md  # Specification quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/app/features/backup/
├── constants/
│   └── backup-format.const.ts             # BACKUP_FORMAT = 'pocket-discipline-backup'
├── models/
│   ├── backup-envelope.model.ts           # BackupEnvelope
│   ├── backup-data.type.ts                # BackupData: Record<string, unknown[]>
│   ├── backup-file.model.ts               # BackupFile: the prepared File
│   ├── backup-state.type.ts               # 'idle' | 'preparing' | 'ready'
│   └── share-outcome.type.ts              # 'shared' | 'cancelled' | 'needs-tap'
├── services/
│   ├── backup-export.service.ts           # createBackup(): one read-only snapshot → BackupFile; recordExport()
│   ├── backup-export.service.spec.ts      # Every table, values, envelope, name, snapshot
│   ├── file-sharing.service.ts            # canShare(file), share(file): ShareOutcome, download(file)
│   └── file-sharing.service.spec.ts
└── components/
    └── backup-card/
        └── backup-card.ts | .html | .scss | .spec.ts  # Section card, last-backup line, state machine

src/app/core/models/user.model.ts           # + lastExportedAt?: number
src/app/features/settings/settings.html|.ts # Render <app-backup-card> above the links
tsconfig.json                               # resolveJsonModule, for appVersion from package.json
docs/schema.md                              # users.lastExportedAt

e2e/src/backup-export.spec.ts               # Download end to end (@smoke); stubbed share paths; purge → Never
e2e/src/layout-audit.spec.ts                # 'settings: backup ready to share'; worst-case lastExportedAt seed
```

**Structure Decision**: The feature is a new vertical slice, `src/app/features/backup/`, as the brief asks.
Spec 015 (import) and spec 016 (encryption) will extend the same slice, and it will gain its own route once
import adds more UI ([research §10](./research.md#10-where-the-ui-lives)).

## Order of work

1. **Spike** ([quickstart §1](./quickstart.md#1-spike-share-after-reading-the-database-t028)). Measure the
   share after a database read on Android Chrome and on iOS Safari, then record the results in research §2.
   The fallback is in the design either way. The spike only tells us how often it will be needed.
   When hardware is unavailable, implementation may proceed; T028 is the sole owner of deferred real-device
   validation, including SC-001 and SC-002 (the original T002 is superseded).
2. **Model and export.** Add `lastExportedAt`, `BackupExportService` and its tests, including the completeness
   test and the check that it can fail.
3. **`FileSharingService`** and its tests.
4. **`BackupCard`** and its Settings placement.
5. **Tests and docs.** Add the e2e spec and the layout audit entries, then update `docs/schema.md`.
6. **Gates.** Run `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None.