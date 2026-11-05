# Feature Specification: Data Import (Restore)

**Feature Branch**: `specs/015-data-import`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Data import (restore), spec 015; second of the three Phase 0 backup specs: 014 export, 015 replace-only restore, 016 passphrase encryption. Restore an exported backup to recover lost data or move to another device. Review the file beside this device's values, offer a safety export, confirm replacement, and restore atomically."

## Clarifications

### Session 2026-11-03

- Q: Existing app actions can delete daily tasks or rewards while retaining their history. Should restore reject those missing references? → A: Allow historical references to deleted rows. This also covers a completion's removed difficulty level after a task is edited. Required category relationships remain checked.
- Q: Should an imported active pomodoro stay stopped across reloads? → A: Stop for this import; normal stored-session recovery on a later reload remains unchanged. No durable suppression marker is required.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Review and Restore a Backup (Priority: P1)

The user exports on device A, opens Settings on device B, chooses "Import data", and selects the backup file. Before replacement, they see when it was exported, the exporting app version, counts for each kind of data, and its balance beside this device's current counts and balance. They explicitly confirm replacement. The app restores the file, shows a success toast, and opens the dashboard so they can keep using device B.

**Why this priority**: Recovery and moving devices are the purpose of the feature; the stored balance and streaks cannot be reconstructed by merging histories.

**Independent Test**: Populate every kind of data, export it, purge the device, import through Settings, and compare all restored rows with the file. The balance and streaks match exactly, with only the documented last-backup metadata override.

**Acceptance Scenarios**:

1. **Given** Settings is open, **When** the user chooses "Import data", **Then** a dedicated import page opens with a file picker, following the existing jar and Telegram import journeys.
2. **Given** a supported valid backup, **When** the user selects it, **Then** the page shows its export date/time and app version, and each table's row count and the stored balance alongside this device's current values; selection and validation alone change nothing.
3. **Given** the reviewed file, **When** the user requests restore, **Then** a destructive confirmation says: "All data on this device will be replaced by this backup, including anything changed here since the file was exported." Confirmation offers a clear cancel action and an explicit replacement action.
4. **Given** a confirmed restore, **When** it succeeds, **Then** every table matches the validated file, including ids, balance, task order, streaks, optional fields and history; rows previously on this device but absent from the file are removed.
5. **Given** a successful restore, **When** Settings is next opened, **Then** "Last backup" uses the file's `exportedAt` time, rather than the import time or the older value stored inside the file's profile.
6. **Given** a timer is running on this device, **When** restore succeeds, **Then** the local timer stops and cannot credit its previous session; a success toast appears and the app navigates to the dashboard.
7. **Given** confirmation is cancelled or the user leaves before starting replacement, **When** they return to the app, **Then** the selected file has caused no stored changes.
8. **Given** the device is offline, **When** a local supported file is imported, **Then** the full review and restore flow works without network access.

---

### User Story 2 - Keep a Safety Backup Before Replacing (Priority: P2)

After reviewing the incoming file, the user can export the current device's data before replacing it. This uses the existing export flow, so the file can be shared or downloaded and later restored if they chose the wrong incoming backup. Users recovering a fresh device can proceed without taking a safety backup.

**Why this priority**: It gives the user a practical way to undo a mistaken replacement while leaving recovery possible when there is nothing valuable on the destination.

**Independent Test**: Start with different data on the device and in the incoming file. Take a safety export from the import page, restore the incoming file, then restore the safety file. The original rows, balance and streaks return, subject to the last-backup override.

**Acceptance Scenarios**:

1. **Given** a valid selected file, **When** the review is shown, **Then** the page offers "Export current data" and a separate "Download" option before replacement and explains that the resulting file can undo the replacement.
2. **Given** file sharing is supported, **When** the user takes the safety export, **Then** the existing export behaviour applies, including preparation followed by "Share" when necessary; Download is always available and unsupported sharing falls back to download.
3. **Given** the share sheet is cancelled or the safety export fails, **When** control returns to the import page, **Then** no replacement starts automatically; cancellation is not an error, other failures are explained, and retry, download or proceeding without a safety backup remains possible.
4. **Given** a safety export completes, **When** the import page is shown again, **Then** the selected incoming file is retained and restore still requires its own destructive confirmation.
5. **Given** a safety export updated the current last-backup time, **When** the subsequent restore fails, **Then** device data remains as it was immediately before replacement, including that successful safety-export timestamp.

---

### User Story 3 - Reject Unsafe Files and Recover from Failure (Priority: P1)

The user receives a clear explanation for an invalid, incompatible or encrypted file. A read, validation, transformation or replacement failure never leaves a partially restored device.

**Why this priority**: A restore must protect the user's remaining copy of their data even when a file is damaged or storage fails.

**Independent Test**: Try malformed and incompatible files, then force a failure after replacement writes have begun. Compare every table with the state immediately before the attempt and verify it also after reopening the app.

**Acceptance Scenarios**:

1. **Given** an unreadable file, malformed content, wrong format marker, missing table, invalid row, duplicate key, invalid money value or disallowed missing reference, **When** it is checked, **Then** import is blocked, a useful reason identifies the affected table/row/field where relevant, and no stored value changes.
2. **Given** a supported same-version file, **When** it is checked, **Then** it reaches review without a compatibility warning.
3. **Given** a newer app version, backup format version or database schema version, **When** the file is checked, **Then** import is refused with "Update the app first" before replacement is possible.
4. **Given** an older supported schema, **When** the file is checked, **Then** its data is transformed to the current schema and fully validated before review and before any device write.
5. **Given** a recognised header with `encrypted: true`, **When** the file is selected, **Then** the page clearly says encrypted backups are not supported until passphrase encryption (spec 016); it does not report a missing plaintext data block as the cause.
6. **Given** a storage failure after tables have begun changing, **When** replacement fails, **Then** all changes roll back, a clear error is shown, the app stays on the import page, and the previous local timer remains unaffected.
7. **Given** history referring to a deleted daily task, a removed difficulty or a deleted reward, **When** the backup is validated and restored, **Then** those historical rows and their stored values are preserved without inventing replacement parent rows.

---

### Edge Cases

- **New file after a preview**: Selecting another file immediately clears the old preview and confirmation eligibility; a slower result from the previous selection must not replace the new result.
- **Duplicate actions**: While validating, exporting or replacing, conflicting actions cannot start another operation or change the selected file behind an in-progress restore.
- **Changes after review**: If current device values change before replacement begins, refresh the comparison and require a new confirmation. Serialize replacement against other writes so no concurrent change is partially retained.
- **Fresh or purged device**: Replace its seeded defaults too; do not add fresh goals or categories on top of the restored rows.
- **Empty tables**: Empty arrays for ordinary tables are valid. The current single-user schema requires exactly the profile with id 1; a missing or duplicate profile is invalid.
- **Ids and optional values**: Keep UUIDs, jar-import ids, date keys, absent fields and explicitly nullable fields as the exporting schema defines them. Do not demand UUIDs or turn missing values into null.
- **History is not a ledger**: Do not recalculate balance or streaks, replay rewards, or infer that a balance is wrong because retained history does not add up.
- **Historical reference exceptions**: Missing completion tasks/difficulties and missing optional withdrawal rewards are allowed. Missing reward/withdrawal categories are invalid because category deletion reassigns those references in the current app.
- **Older money representation**: Validate the source schema, apply its upgrade rules (including historical money rounding), then require whole hryvnias in the result; do not silently round invalid money in a current-schema file.
- **File name and type**: Accept the exported `.txt` file; do not trust its extension or MIME type as proof of validity. A valid backup renamed `.json` remains usable.
- **Oversized file**: Reject a file exceeding the documented size limit before reading its contents, with an explanation and no writes.
- **Wrong device clock**: Preserve a valid future export timestamp; show dates using the existing backup display rules.
- **Imported active session**: Preserve its stored row but do not resume it during this import. Timer coordination covers the importing browser context; writes from other tabs before replacement participate in the baseline check, while writes serialized after commit are subsequent activity. Normal stored-session recovery on a later reload remains unchanged. Stopping the destination timer must not mutate a restored session with a coincidentally matching id.
- **After commit**: A toast or navigation problem must not be presented as a rolled-back restore. The atomic data result is distinct from finishing the page transition.
- **Narrow and wide screens**: Long filenames, validation messages, version strings, all eleven counts and large balances fit from 360px to wide desktop, in light and dark themes.

## Requirements _(mandatory)_

### Architectural Constraints

- **AC-001**: Keep this feature in the existing backup vertical slice and preserve the project's dependency direction.
- **AC-002**: Do not introduce unnecessary external dependencies.
- **AC-003**: Follow SOLID principles and `docs/code_style.md`.
- **AC-004**: Follow `docs/design_system.md` and the `pocketdiscipline-ui` skill; reuse shared components before plain Material and use the shared theme and tokens.
- **AC-005**: Follow `docs/schema.md` and `docs/security.md` for stored data invariants and untrusted input.

### Functional Requirements

**Entry and review**

- **FR-001**: Settings MUST expose "Import data", opening a dedicated import page with a single-file picker.
- **FR-002**: The page MUST fully check the selected backup before enabling restore and MUST show progress during checking and replacement.
- **FR-003**: Before replacement, the page MUST display the file's export time and source app version, counts for every kind of data beside current device counts, and the file's stored balance beside the current balance. For older files, counts and balance MUST describe the transformed data that will actually be restored; disclose that an upgrade was applied.
- **FR-004**: File selection, review, rejection and cancellation MUST NOT write device data. Any safety export is a separate explicit action with spec 014's existing metadata behaviour.
- **FR-005**: Replacing the file selection MUST invalidate previous validation and confirmation. Conflicting operations MUST be prevented while checking, safety-exporting or restoring.

**Safety and consent**

- **FR-006**: Before replacement the page MUST offer the current device's data as a safety export using spec 014's share/download flow, cancellation semantics, fallback and last-backup recording.
- **FR-007**: The safety export MUST be optional and MUST NOT automatically start or confirm import. Restore MUST always require explicit destructive confirmation with the warning in Story 1.
- **FR-008**: Current comparison values MUST be refreshed if they change before replacement; consent MUST apply to the selected file and current device state, with renewed confirmation after a change.

**File and compatibility validation**

- **FR-009**: Read the versioned envelope and table payload defined in [spec 014's backup contract](../014-data-export/contracts/backup-file.md). Validate the exact marker, supported positive integer format/schema versions, valid app-version string, unambiguous valid export timestamp, boolean encryption flag and correct payload structure.
- **FR-010**: A newer app version, format version or schema version MUST be refused with "Update the app first". Same versions MUST be accepted when the rest of the file is valid. Older app versions MUST NOT be rejected solely for age.
- **FR-011**: Recognised encrypted files MUST be explicitly refused as unsupported until spec 016, before expecting plaintext table data. This feature MUST NOT request a passphrase or attempt decryption.
- **FR-012**: For an older schema, apply the defined ordered transformations to the current schema before replacement; validate both the source shape and the complete transformed result. A missing transformation or unsupported older format MUST yield a clear compatibility error and no writes.
- **FR-013**: `docs/schema.md` MUST require every new database schema version to define and test the corresponding backup-import transformation, including an explicit identity transformation when the stored backup shape is unchanged.
- **FR-014**: Check every table and every row before writing: required and allowed fields, types, enums, primary keys and their uniqueness, nested values, valid dates/timestamps, required single-user profile, money and reference rules. Missing required tables, unknown tables or fields not allowed by the declared schema MUST be rejected rather than silently discarded.
- **FR-015**: Every current-schema money field MUST hold a finite safe integer number of whole hryvnias within its stored domain; source-schema historical money MUST follow its explicit transformation. Validate nested difficulty rewards too. Preserve the stored balance without recomputing it.
- **FR-016**: Validate all schema-required relationships against the incoming data, never against existing device rows. Reward and withdrawal categories MUST exist. Historical completions MAY refer to deleted daily tasks or removed difficulty levels, and withdrawals MAY refer to deleted rewards; preserve these references and do not fabricate parent rows.
- **FR-017**: Validation errors MUST explain the problem and, where applicable, name the table, row identifier/index and field. Invalid files MUST never enable restore or log personal payloads.
- **FR-018**: Bound file size before parsing, render file-derived text safely and keep the entire operation local and available offline.

**Replacement and outcome**

- **FR-019**: Replace every application table as one atomic operation: clear previous rows and insert validated restored rows without reseeding, merging, duplicating or replaying business actions. A failure MUST leave all tables exactly as they were immediately before replacement.
- **FR-020**: Preserve every accepted stored value and absent optional field, including balance, streaks, ids and timestamps, except the explicit metadata override in FR-021 and defined older-schema transformations.
- **FR-021**: Within the same atomic replacement, set the restored profile's `lastExportedAt` to the file's `exportedAt` instant. Do not substitute the time of import or change unrelated profile timestamps.
- **FR-022**: Only after replacement commits, stop/reset the importing browser context's in-memory pomodoro timer without modifying imported rows or crediting its prior session. A failed replacement MUST leave that timer alone.
- **FR-023**: After successful replacement and timer reset, show a success toast and navigate to the dashboard. A pre-commit failure MUST show a clear error, stay on the import page and allow recovery/retry without partial writes.
- **FR-024**: Register the import page and its distinct preview, validation error, progress, safety-export and confirmation layouts in the layout audit and support the design system's phone and desktop widths.

### Key Entities _(include if feature involves data)_

- **Backup envelope**: Existing format marker, format/schema/app versions, export timestamp and encryption flag from spec 014.
- **Validated restore snapshot**: All table rows, transformed when necessary and checked as a complete replacement; preserves historical reference exceptions.
- **Import comparison**: File export metadata, incoming row counts and balance, and this device's corresponding current values.
- **User profile**: Restored stored balance and other profile values; `lastExportedAt` deliberately becomes the incoming envelope's export timestamp.
- **Safety backup**: A regular spec 014 export of the destination before replacement, usable through this same restore flow.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can move from Settings to a review showing 100% of data-kind counts and both balances before any replacement is possible.
- **SC-002**: For a same-schema export → purge → import round trip, 100% of table rows and stored values match the exported snapshot, including balance and streaks, with only the documented last-backup override.
- **SC-003**: In 100% of invalid, incompatible, cancelled or failed replacement cases, all device data matches its state immediately before that attempt; a failure during replacement also preserves data after reopening.
- **SC-004**: A safety backup can restore 100% of the original rows, balance and streaks after a mistaken replacement, subject to the same metadata override.
- **SC-005**: All supported older-schema fixtures reach the expected current values; newer app/format/schema and encrypted fixtures produce their specific refusal messages without writes.
- **SC-006**: No import-page or confirmation content overflows horizontally, clips required information or becomes unreachable from 360px through 1920px; verify light and dark themes.
- **SC-007**: Every successful restore ends on the dashboard with a success message and no running destination timer; repeated taps never produce duplicate restores or rewards.

## Assumptions

- **Scope**: This is a specification task for Phase 0's second feature. Restore replaces everything; merging, account sync, server work, ledger reconstruction and encryption belong to later phases/specs.
- **Dependency**: Spec 014 supplies the existing export format and reusable share/download behaviour. Today that format is version 1 with schema version 11 and eleven tables.
- **Source availability**: `docs/sync-server-plan.md` is absent in this checkout. Phase 0 sequencing is taken from the user's request and spec 014; no missing plan content is inferred.
- **App versions**: Use semantic version ordering, including prerelease precedence; build metadata does not change precedence. Both builds reporting `0.0.0` are the same app version, so format/schema checks remain essential. Invalid version strings are invalid headers. Spec 014's reader contract now uses this same compatibility policy without changing exported bytes or format version.
- **Size bound**: Start with a 50 MiB per-file limit, surfaced in the picker guidance and oversize error. Planning must check this against synthetic multi-year histories.
- **Historical exceptions**: The app does not retain tombstones, so a missing historical task/difficulty/reward cannot be distinguished from deliberate file editing. Allow these specific missing targets, with valid reference-field shapes; do not broaden this to category references.
- **Exactness**: The incoming file is authoritative. Its export timestamp overrides the profile's older backup timestamp; transformations for old schemas are the only other intended differences.
- **Failure baseline**: A successfully completed safety export may update the device's last-backup timestamp. A later failed restore preserves the state after that export, rather than undoing an action that succeeded.
- **Boundary**: A file is never uploaded. Browser theme, installed-app state and other browser preferences are outside the database backup.

### Notes for planning

- Implement in `src/app/features/backup/`, with the import route at `/settings/data-import`; follow the routing and page patterns used by `/settings/jar-import` and `/settings/telegram-import`.
- Reuse spec 014 export/sharing services and the shared page header, section cards, amount display, destructive confirmation and snackbar services. Design the comparison to reflow on phones.
- Use a single Dexie read-write transaction over all tables, following the atomic pattern of `DbService.purgeDatabase()` but without its reseeding. Include the backup timestamp override in the transaction.
- Follow `DatabasePurgeService`'s after-commit timer reset ordering. Inspect timer reset for database writes and id collisions; it must not change an imported row.
- Prepare schema-aware source validators and ordered restore transformations that match existing database upgrades, including money rounding and task ordering. Reconcile the backup contract's app-version reader guidance without changing the file format.
- Unit tests currently use real `DbService` with `fake-indexeddb`, per `docs/code_style.md`; do not introduce Dexie mocks. Cover row validation, money, allowed/disallowed missing references, duplicate keys, compatibility, transformations and the metadata exception.
- Prove rollback in a real-browser IndexedDB e2e test by inducing a deterministic failure after replacement writes start, then compare every table before/after and after reopening. An invalid-file test alone does not prove rollback; fault injection must not expose a production data-loss control.
- Add the required e2e round trip: seed all eleven tables with synthetic data → export through the real export UI → purge → import that downloaded file → compare complete rows and balance, allowing only FR-021. Include destination-only rows, jar/date ids, optional fields, historical missing parents and an active local timer in relevant tests.
- Verify safety-export recovery, encrypted/newer-file refusals, refreshed confirmation, offline use and no duplicate actions. Tag a representative import happy path `@smoke`.
- Register the new route and each distinct layout state in `e2e/src/layout-audit.spec.ts`; include long filenames/errors, all counts and large balances. Inspect 360px and 1280px screenshots in light and dark.
- Implementation is done only when `npm run lint`, `npm run typecheck`, `npm test -- --watch=false` and the full `npm run e2e` pass. This specification does not claim those implementation checks have run.
