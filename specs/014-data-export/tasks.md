---

description: "Task list for Data Export (Backup)"
---

# Tasks: Data Export (Backup)

**Input**: Design documents from `/specs/014-data-export/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/backup-file.md, contracts/backup-card.md, quickstart.md

**Tests**: Unit and E2E test tasks are included because `AGENTS.md` makes `npm test` and `npm run e2e` (with the layout audit) part of done, and the spec requires a test that fails when a table is left out (FR-008, SC-004).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`)
- Exact repository-relative file paths and requirement IDs (`FR-###`, `AC-###`, `SC-###`) are included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Load the conventions, and settle the one technical unknown before any UI is built.

- [X] T001 Load the Angular v22 coding standards through the `angular-cli` MCP server (`list_projects`, then `get_best_practices` with the workspace path), and read `docs/code_style.md`, `docs/design_system.md`, `docs/schema.md` and `.agents/skills/pocketdiscipline-ui/SKILL.md` before writing code. If the MCP server is not running, ask the user to start it with `ng mcp` (`AC-003`, `AC-004`)
- **T002 — superseded by T028**: The real-phone spike and large-history validation were deferred because no phone was available. T028 is the sole pending task and owns the complete checklist in `quickstart.md` sections 1 and 4. Do not track or complete the same validation twice.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The slice's constant, models and build setting that both stories use.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `BACKUP_FORMAT = 'pocket-discipline-backup'` (as const) in `src/app/features/backup/constants/backup-format.const.ts` (`FR-009`)
- [X] T004 [P] Create the slice models in `src/app/features/backup/models/`, one per file, as specified in `specs/014-data-export/data-model.md`:
  - `BackupData` (`Record<string, unknown[]>`) in `src/app/features/backup/models/backup-data.type.ts`
  - `BackupEnvelope` in `src/app/features/backup/models/backup-envelope.model.ts`, with `format: typeof BACKUP_FORMAT`, `formatVersion`, `schemaVersion`, `appVersion`, `exportedAt` (ISO string), `encrypted: false` and `data: BackupData`
  - `BackupFile` (the prepared `File`) in `src/app/features/backup/models/backup-file.model.ts`
  - `BackupState` (`'idle' | 'preparing' | 'ready'`) in `src/app/features/backup/models/backup-state.type.ts`
  - `ShareOutcome` (`'shared' | 'cancelled' | 'needs-tap'`) in `src/app/features/backup/models/share-outcome.type.ts`
- [X] T005 [P] Add `"resolveJsonModule": true` to the shared `compilerOptions` in `tsconfig.json`, so the export can read `version` from `package.json` with a named JSON import (research §7). It belongs in the base file because `tsconfig.app.json` and `tsconfig.spec.json` both extend it and both compile the service (`npm run typecheck` runs each)

**Checkpoint**: Foundation ready. `npm run typecheck` passes.

---

## Phase 3: User Story 1 - Back Up Everything to a File (Priority: P1) 🎯 MVP

**Goal**: "Export data" on Settings produces one `.txt` file holding every table as a consistent snapshot, and hands it to the share sheet where files can be shared, or to a download otherwise. A secondary "Download" button always saves the same file.

**Independent Test**: Fill every table, tap Export, and inspect the file: every table is present with every row unchanged, and the envelope fields are set. On Chromium without file sharing, Export downloads. With a stubbed share, the sheet path works, including the prepare-then-Share fallback.

### Tests for User Story 1

> Write these first and see them fail before the implementation exists.

- [X] T006 [P] [US1] Write `src/app/features/backup/services/backup-export.service.spec.ts` on the real database (`openEmptyDb()` from `src/app/shared/testing/empty-db.ts`; no Dexie mocks). Each case asserts what is stored or produced, not which method was called:
  - **Completeness** (`FR-002`, `FR-008`, `SC-003`, `SC-004`): seed one row into **every** table in `db.tables`, from a fixture map keyed by table name. A table in `db.tables` with no fixture fails the test with its name, so a new table cannot pass with an empty array. Export, parse the file's text, and assert that `Object.keys(data)` has the same members as the names in `db.tables` (order is not part of the contract) and that each table's array deep-equals its stored rows.
  - **Fidelity** (`FR-003`): a row with an optional field absent (for example a goal without `completedAt`) has no such key in the file, not `null`. A `jar-…` id, a `dailyScores` date key and an `EngagementType` key come back unchanged.
  - **Empty database**: every table is present as `[]`.
  - **Envelope** (`FR-009`): it has `format === BACKUP_FORMAT`, `formatVersion === 1`, `schemaVersion === db.verno` (11), a non-empty `appVersion`, `exportedAt` equal to the fixed clock's ISO string, and `encrypted === false`.
  - **File** (`FR-005`): with `vi.setSystemTime` at a known local time, the name is `pocket-discipline-YYYY-MM-DD-HHmm.txt` for that local time and the type is `text/plain`. Pad single digits, for example 09:05 gives `0905`.
  - **Snapshot** (`FR-004`): start a read-write transaction that writes to two tables while the export runs. The file holds both writes or neither.
- [X] T007 [P] [US1] Write `src/app/features/backup/services/file-sharing.service.spec.ts`, stubbing `navigator.share` and `navigator.canShare` on the jsdom `navigator`:
  - `canShare` is false when `navigator.canShare` is missing, and otherwise reflects `navigator.canShare({ files: [file] })`.
  - `share` maps the results: it resolves to `'shared'`; a `DOMException` named `AbortError` gives `'cancelled'`; one named `NotAllowedError` gives `'needs-tap'`; any other rejection is rethrown.
  - `download` creates an object URL, clicks an anchor whose `download` attribute is the file name, and revokes the URL. Stub `URL.createObjectURL` and `URL.revokeObjectURL`.

### Implementation for User Story 1

- [X] T008 [US1] Generate `BackupExportService` with the Angular CLI (`ng generate service features/backup/services/backup-export`, via the `angular-cli` MCP server where it can) as an `@Service()` in `src/app/features/backup/services/backup-export.service.ts`. Implement `createBackup(): Promise<BackupFile>`:
  - Read every table in one read-only transaction: `db.transaction('r', db.tables, () => Promise.all(db.tables.map((table) => table.toArray())))`.
  - Key the results by `table.name` into `BackupData`.
  - Build the `BackupEnvelope`: `schemaVersion: db.verno`, `appVersion` from `import { version } from '../../../../../package.json'` (five levels up from `services/` to the repository root), and `exportedAt: new Date().toISOString()`.
  - `JSON.stringify(envelope, null, 2)` into a `File` named from the same `Date`'s local parts, with `{ type: 'text/plain' }`.

  This makes T006 pass (`FR-002`–`FR-005`, `FR-009`–`FR-011`).
- [X] T009 [US1] Prove the completeness test can fail. Temporarily make `createBackup` skip one table (for example `.slice(1)` on the table list) and run `npm test -- --watch=false`. The completeness case in T006 must fail. Then revert (`FR-008`, `SC-004`).
- [X] T010 [P] [US1] Generate `FileSharingService` with the Angular CLI as an `@Service()` in `src/app/features/backup/services/file-sharing.service.ts`. It holds the browser mechanism only, with no backup policy:
  - `canShare(file: File): boolean` is synchronous, so a caller can check before any `await`.
  - `share(file: File): Promise<ShareOutcome>` maps the results as in research §2.
  - `download(file: File): void` uses an object URL and a detached `<a download>`, revoking the URL after the click.

  This makes T007 pass (`FR-012`–`FR-016`).
- [X] T011 [US1] Write `src/app/features/backup/components/backup-card/backup-card.spec.ts` with `FileSharingService` replaced by a test double; `BackupExportService` stays real on `openEmptyDb()`. Cover the state machine in `specs/014-data-export/contracts/backup-card.md`:
  - **Share available, resolves**: the "Backup shared." toast appears and the card returns to idle.
  - **`AbortError`**: no toast, nothing downloaded, idle (`FR-015`, `SC-005`).
  - **`NotAllowedError`**: the card is `ready` with a "Share" button; tapping it shares the **same** file. A `NotAllowedError` on that second tap shows the failure toast, so the card never loops (`FR-014`).
  - **Other share error**: the toast "Couldn't share the backup. Use Download instead." appears and the card returns to idle (`FR-016`).
  - **Share not supported**: Export calls `download` and toasts "Backup saved." (`FR-013`).
  - **Download button**: downloads in idle, and in `ready` downloads the prepared file and returns to idle (`FR-012`).
  - **While preparing**: both buttons are disabled, and a second click starts no second export (`FR-006`).
  - **Database read fails**: the toast "Couldn't prepare the backup." appears.
- [X] T012 [US1] Generate the `BackupCard` component (selector `app-backup-card`) with the Angular CLI in `src/app/features/backup/components/backup-card/backup-card.ts`, `backup-card.html` and `backup-card.scss`, following `specs/014-data-export/contracts/backup-card.md`. This makes T011 pass (`AC-004`, `FR-001`, `FR-006`, `FR-012`–`FR-016`).
  - **Layout**: an `app-section-card` with heading "Backup" and the note "Saves all your data to one file you can keep elsewhere. The file is not encrypted."
  - **Buttons**: the primary `mat-flat-button` is "Export data", or "Share" in `ready`, with icon `ios_share`. The secondary `mat-stroked-button` is "Download", with icon `download`.
  - **Preparing**: a `mat-progress-spinner` (diameter 20) replaces the primary icon, and `aria-busy` is set on the actions.
  - **Ready**: the line "Your backup is ready to share." is shown.
  - **State**: kept in signals: `state` is a `BackupState`, and `prepared` is a `BackupFile` or `undefined`. Templates bind `computed()` only, with no method calls in bindings (code_style rules 2 and 7).
  - **Export click**: build a probe `File` with the backup name pattern and `text/plain`. Call `canShare(probe)` **before** any `await`, then `createBackup()`, then `share` or `download`.
  - **Share click in `ready`**: call `share(prepared)` as the first awaited call.
  - **Messages**: all go through `SnackBarService`.
  - **Styles**: SCSS uses tokens only, starting with `@use '../../../../../styles/tokens' as t;`. The actions are a `flex-wrap` row with gap `t.space(3)`, and buttons may grow to full width on a narrow column. No `t.up()` or `t.down()`, no raw values, no amber.
- [X] T013 [US1] Render `<app-backup-card />` in `src/app/features/settings/settings.html`, above `.settings-list` and after `<app-pomodoro-reward-settings />`. Add `BackupCard` to the `imports` in `src/app/features/settings/settings.ts`. Run `node scripts/check-ui.mjs src/app/features/backup src/app/features/settings` and fix every report (`AC-004`)
- [X] T014 [US1] Write `e2e/src/backup-export.spec.ts` for the User Story 1 cases:
  - **Download path** (`@smoke`): seed rows into several stores with `putRows` from `e2e/src/indexed-db.ts`, open Settings, click "Export data", and wait for the `download` event. Assert that `suggestedFilename()` matches `^pocket-discipline-\d{4}-\d{2}-\d{2}-\d{4}\.txt$`. The parsed content has `format`, `formatVersion` 1, `schemaVersion` 11 and `encrypted` false. `data` holds exactly the object store names of the open database (read them in the page, not from a pinned list), with the seeded rows equal to `readStores`. Playwright's Chromium has no file sharing, so Export must download.
  - **Stubbed share paths**: using `page.addInitScript` to define `navigator.canShare` and `navigator.share`, assert that:
    - when the share resolves, the toast "Backup shared." appears;
    - when it rejects with `AbortError`, no toast appears;
    - when it first rejects with `NotAllowedError`, the "Share" button appears, and clicking it calls the stub again with a file of the same name;
    - the "Download" button downloads even when sharing is available.
  - **Offline**: with `context.setOffline(true)`, Export still downloads (`FR-007`).
- [X] T015 [US1] Register the card's ready state in `e2e/src/layout-audit.spec.ts` `SCREENS`. Add the entry `settings: backup ready to share` with `path: 'settings'` and `ready: '.settings-link'`. Its `open` step installs the share stub so the first share rejects with `NotAllowedError` (an init script plus a reload, or a stub defined before the click), clicks "Export data", and waits for the "Share" button. The existing `settings` entry already measures the idle card. `KNOWN_GAPS` must not grow (`AC-004`, `SC-006`).

**Checkpoint**: User Story 1 is fully functional and testable on its own: export, share, fallback and download all work.

---

## Phase 4: User Story 2 - See How Old the Last Backup Is (Priority: P2)

**Goal**: The Backup card shows "Last backup: Never", "today", "yesterday" or "N days ago". The time is recorded only after a share or download succeeds, and a purge resets the line to "Never".

**Independent Test**: A fresh install shows "Never". After a download the card shows "today". After a cancelled share the line is unchanged. A row seeded 3 days back shows "3 days ago". After a purge the line shows "Never".

### Tests for User Story 2

- [X] T016 [P] [US2] Extend `src/app/features/backup/services/backup-export.service.spec.ts` for `recordExport()` (`FR-017`, `FR-018`):
  - With a seeded user row, it sets `lastExportedAt` to the fixed clock's epoch milliseconds.
  - Every other field of the row is unchanged, `updatedAt` included.
  - No other table changes.
- [X] T017 [P] [US2] Extend `src/app/features/backup/components/backup-card/backup-card.spec.ts` (`FR-017`, `FR-019`):
  - **Wording**: an absent `lastExportedAt` gives "Last backup: Never". The same local day gives "today", the previous day "yesterday", and three calendar days back "3 days ago". A time in the future gives "today". With a fixed clock, a backup at 23:59 the day before counts as "yesterday".
  - **Not loaded**: the line is blank until the user stream emits. Hold it back with a `Subject` and assert that no "Never" renders first.
  - **Recording**: the time is recorded after a resolved share and after a download. It is not recorded after `AbortError`, after a share failure, or after a database read failure.
  - **Live update**: the line changes to "today" without a reload.
- [X] T018 [P] [US2] Extend `e2e/src/backup-export.spec.ts` (`FR-019`, `FR-020`, `SC-005`):
  - After the download in T014, the card reads "Last backup: today".
  - A stubbed `AbortError` share leaves "Never".
  - `users.lastExportedAt` seeded three days ago via `putRows` reads "3 days ago" after a reload.
  - After an export and then "Purge database", the line reads "Never".

### Implementation for User Story 2

- [X] T019 [US2] Add `lastExportedAt?: number` to `User` in `src/app/core/models/user.model.ts`, with a one-line comment like the one on `balanceSetUpAt`: absent until the first export, cleared by a purge. Do not add an index or a schema version (`FR-018`)
- [X] T020 [US2] Add `recordExport(): Promise<void>` to `BackupExportService` in `src/app/features/backup/services/backup-export.service.ts`. It calls `db.users.update(CURRENT_USER_ID, { lastExportedAt: Date.now() })` and changes nothing else. This makes T016 pass (`FR-017`, `FR-018`)
- [X] T021 [US2] Extend `BackupCard` in `src/app/features/backup/components/backup-card/`. This makes T017 pass (`FR-017`, `FR-019`, `FR-020`).
  - **Recording**: call `recordExport()` after the outcome `'shared'` and after `download`, never otherwise. The toast follows the recording.
  - **User row**: read it with `toSignal(from(userService.user$))` and no `initialValue`, with `catchError` as in `settings.ts`.
  - **Wording**: compute `lastBackup` from the row and `ClockService.today()`. Count calendar days between the local `YYYY-MM-DD` of `lastExportedAt` (`toLocaleDateString(DATE_LOCALE_CA)`) and today. A count of 0 or less gives "today", 1 gives "yesterday", n gives "n days ago", and an absent field gives "Never".
  - **Rendering**: render "Last backup: …" in `label-large`, `on-surface-variant`, and only once the row has loaded. The number takes `.pd-num`.
- [X] T022 [US2] Seed the worst case for the line in `e2e/src/layout-audit.spec.ts`: set `users.lastExportedAt` in the audit's seed far enough back to read "Last backup: 9999 days ago" or longer, so the `settings` and `settings: backup ready to share` entries measure it at 360px (`SC-006`)

**Checkpoint**: User Stories 1 and 2 both work. The card shows the backup's age, and only real backups move it.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, the bundle check, and the definition of done.

- [X] T023 [P] Document `lastExportedAt` in `docs/schema.md`, under `users`: add the field to the interface block and one sentence in the description, like `balanceSetUpAt`. Mention that the backup slice (`features/backup/`, spec 014) writes it and that it has no index, so it needed no schema version.
- [X] T024 [P] Run `npm run build` and confirm that the JSON import adds only `version`, not the rest of `package.json`, to the bundle: search the output in `dist/` for a field such as `"devDependencies"`. If the whole file is bundled, switch to the build's `define` option (research §7) and update the research note. Also confirm that the initial bundle budget in `angular.json` still passes.
- [X] T025 Run the definition of done and fix every failure: `npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e`. Never use `eslint-disable` or edit `scripts/ui-baseline.json` by hand.
- [X] T026 Look at the layout audit screenshots of the settings entries at 360px and 1280px, light and dark. Follow the PowerShell commands in `specs/014-data-export/quickstart.md` section 3: set `LAYOUT_AUDIT_SCREENSHOTS=1`, then run `npx playwright test layout-audit -g "at (360|1280)px"`. The audit groups all screens by width; a settings-name filter selects no tests. Check the 44px touch targets and that the buttons wrap cleanly (`SC-006`).
- [X] T027 Run the manual checks in `specs/014-data-export/quickstart.md` §4 on a phone (including the large-history timing for `SC-002`) and §5 on a desktop, or list them for the user if no device is at hand. Then hand the change to the user to review and commit. Never commit automatically (`AGENTS.md`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 first. The spike originally tracked as T002 is now owned solely by T028. It may run alongside implementation when a phone is available; lack of a phone does not block T012 because the fallback is required either way.
- **Foundational (Phase 2)**: depends on T001 and blocks both stories.
- **User Story 1 (Phase 3)**: depends on Phase 2. The spike in T028 may precede T012 when a phone is available.
- **User Story 2 (Phase 4)**: depends on Phase 2 for its service work (T016, T019, T020). Its card and e2e tasks (T017, T018, T021, T022) extend files created in US1, so they come after T012, T014 and T015.
- **Polish (Phase 5)**: depends on both stories.

### Within Each User Story

- Tests are written first and fail, then the implementation makes them pass.
- Models and constants come before services, services before the card, and the card before Settings, e2e and the audit.

### Parallel Opportunities

- Phase 2: T003, T004 and T005 touch different files.
- US1: T006 and T007 (tests) in parallel. T010 (`FileSharingService`) in parallel with T008 (`BackupExportService`).
- US2: T016, T017 and T018 extend three different files. T019 and T020 can start as soon as Phase 2 is done.
- Polish: T023 and T024.

---

## Parallel Example: User Story 1

```bash
# Tests first, in parallel:
Task: "Write backup-export.service.spec.ts (completeness, fidelity, envelope, file name, snapshot)"
Task: "Write file-sharing.service.spec.ts (canShare, share outcome mapping, download)"

# Then the two services, in parallel:
Task: "Implement BackupExportService.createBackup in src/app/features/backup/services/backup-export.service.ts"
Task: "Implement FileSharingService in src/app/features/backup/services/file-sharing.service.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Extend backup-export.service.spec.ts for recordExport"
Task: "Extend backup-card.spec.ts for last-backup wording and recording"
Task: "Extend e2e/src/backup-export.spec.ts for today / cancel / 3 days ago / purge"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: load the standards and run the spike.
2. Phase 2: the constant, the models and `resolveJsonModule`.
3. Phase 3: export, share, the fallback and download.
4. **Stop and validate**: the backup file can already be made and carried to another device.

### Incremental Delivery

1. Setup and Foundational give a ready foundation.
2. User Story 1 gives backups that work (MVP).
3. User Story 2 makes stale backups visible.
4. Polish adds the docs, the bundle check, the full gates and the manual phone check.

---

## Notes

- [P] tasks touch different files and have no unfinished dependencies.
- Keep scratch files, such as the spike page, in the session scratchpad. Nothing scratch goes into the repo.
- Spec 015 (import) will read the file defined in `contracts/backup-file.md`. Do not change the envelope here without updating that contract.
- Do not commit. The user reviews and commits.
## Phase 6: Convergence

- [ ] T028 Complete all deferred real-device validation (sole owner; supersedes T002). Use the authoritative checklist in `specs/014-data-export/quickstart.md` sections 1 and 4:
  - Run the real share-after-database-read spike on Android Chrome and, if available, iOS Safari. Verify direct sharing, the fresh-tap fallback with the same file, and silent cancellation with an unchanged last-backup time (`FR-014`, `FR-015`).
  - Measure both direct and fallback shares against the under-15-second and three-/four-tap limits using section 4.1 (`SC-001`).
  - Seed the fixed 29,533-row workload and run the five measured exports on the reference phone using section 4.2. Record all preparation times against the 3-second limit, payload bytes, device/RAM, OS/browser/build versions, and responsiveness/progress observations (`SC-002`).
  - Complete the remaining phone checks in section 4. Record all results in `specs/014-data-export/research.md` section 2 and address demonstrated failures before marking this task complete. Keep it pending while required hardware or evidence is unavailable; desktop stubs and supplemental-device timings do not complete reference-device validation.
