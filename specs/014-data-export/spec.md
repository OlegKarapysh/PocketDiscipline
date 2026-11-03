# Feature Specification: Data Export (Backup)

**Feature Branch**: `[014-data-export]`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Data export (backup), spec 014. Phase 0 of docs/sync-server-plan.md, first of three specs (014 export, 015 import, 016 passphrase encryption). Keep this spec to export only. Goal: the user (one person, several devices, phone and desktop) can back up all app data and carry it to another device. An "Export data" button on the Settings page produces one file holding every table, so a later import can restore the device exactly, balance included. On phones the system share sheet opens; where file sharing is not supported (desktop), the file is downloaded. Cancelling the share sheet is not an error and does not count as a backup. File name carries the local date and time, e.g. pocket-discipline-2026-11-01-1930.json. Settings shows when data was last exported ("Last backup: 3 days ago" / "Never"). Format is versioned JSON with an envelope (format marker, format version, database schema version, app version, exported-at timestamp, an "encrypted" flag, always false here, and the table data); encryption must fit without a format break and import must tell a newer file from an older one. The export is a consistent snapshot of all tables taken at one moment. The last-export time is stored on the users row as an unindexed field, recorded only after the share or download succeeds. A test must fail if a table is added and left out of the export."

## Clarifications

### Session 2026-11-01

- Q: On desktop browsers that can share files (Chrome or Edge on Windows and macOS), should Export open the share sheet, download the file, or offer both? → A: Share where supported, and always offer a separate "Download" action (FR-012)
- Q: Chrome and Edge (Android included) refuse to share `.json` files; their share allowlist has `.txt`, `.csv`, `.pdf` and media only. What should the file be called? → A: Always `.txt`, shared or downloaded, with the same JSON content (found while planning; FR-005)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Back Up Everything to a File (Priority: P1)

The user opens Settings and taps "Export data". The app gathers all of their data — profile and balance, goals, daily tasks and their completions, daily scores, pomodoro sessions and reward rates, one-off tasks, rewards, reward categories and withdrawals — into a single file named after the current local date and time. On a phone the system share sheet opens with the file attached, so the user can send it to Telegram, save it to Drive, mail it to themselves, and so on. Where the device cannot share files, the file is saved to the device's downloads instead.

**Why this priority**: All data lives only on the device. Clearing site data, losing the phone or the browser evicting storage loses everything. A file the user holds elsewhere is the only protection today, and it is what spec 015 (import) restores from.

**Independent Test**: Fill a fresh install with data in every area of the app, export, and inspect the file: it names every table, every row of every table is present with its values unchanged, and the envelope fields are set. Repeat on a device with file sharing (share sheet opens with the file) and on one without (file is downloaded).

**Acceptance Scenarios**:

1. **Given** the user has data in every area of the app, **When** they tap "Export data" on a device that can share files, **Then** the share sheet opens offering one file named like `pocket-discipline-2026-11-01-1930.txt` (local date and time of the export, to the minute).
2. **Given** a device that cannot share files, **When** the user taps "Export data", **Then** the same file is saved through the browser's normal download, with no share sheet.
3. **Given** any device, including one that can share files, **When** the user taps the secondary "Download" action, **Then** the same file is saved through the browser's normal download, with no share sheet, and counts as a backup.
4. **Given** the file was produced, **When** it is inspected, **Then** it holds every table of the database, each with all of its rows, and every stored value (numbers, text, dates, flags, optional fields) is identical to what the app holds — the balance included.
5. **Given** the file was produced, **When** its header is inspected, **Then** it states that it is a PocketDiscipline backup, the backup format version, the database schema version, the app version, when it was exported, and that it is not encrypted.
6. **Given** an export is being prepared, **When** the user taps "Export data" or "Download" again, **Then** no second export starts.
7. **Given** the device is offline, **When** the user exports, **Then** the export works exactly as it does online.

---

### User Story 2 - See How Old the Last Backup Is (Priority: P2)

Next to the export button, Settings tells the user when they last backed up: "Last backup: 3 days ago", or "Last backup: Never" if they have not. After a successful export the line updates straight away. Cancelling the share sheet leaves it unchanged, because no backup reached anywhere.

**Why this priority**: A backup is only useful if it is recent. Seeing its age is what prompts the user to export again, but the export itself (P1) works without it.

**Independent Test**: On a fresh install, open Settings and check "Never". Export and complete the share or download, and check the line now reads as today. Export again and cancel the share sheet, and check the line did not change. Move the clock forward and check the wording.

**Acceptance Scenarios**:

1. **Given** the user has never exported, **When** they open Settings, **Then** it shows "Last backup: Never".
2. **Given** the user completes a share (picks a target in the share sheet) or the file is handed to the download, **When** the export finishes, **Then** the line shows the backup as made today, without reloading the page.
3. **Given** the share sheet is open, **When** the user dismisses it, **Then** no error is shown, nothing is downloaded instead, and the last-backup line is unchanged.
4. **Given** the last backup was three calendar days ago, **When** the user opens Settings, **Then** it shows "Last backup: 3 days ago"; one day ago shows "yesterday" and the same day shows "today".
5. **Given** the user purged the database after their last export, **When** they open Settings, **Then** it shows "Last backup: Never", because none of the current data has been backed up.

---

### Edge Cases

- **Tap too long ago to share**: Some browsers allow the share sheet only immediately after the user's tap. If gathering the data takes longer than that, the app does not fail silently: it finishes preparing the file and then shows a "Share" button, and one tap on it opens the share sheet with the same file.
- **Share fails for another reason** (not cancelled by the user): the app shows a short error and offers to download the file instead. The last-backup time is not changed unless that download then happens.
- **Writes during the export**: If something writes to the database while the export is being gathered (for example a pomodoro completing), the file still reflects one single moment: either entirely before that write or entirely after it, never half of it.
- **Empty or freshly purged database**: Export still works and produces a valid file containing every table, empty ones as empty lists.
- **Large history**: Years of history (tens of thousands of rows) still export without the app freezing; a progress state is shown while the file is prepared.
- **Two exports in the same minute**: Both files get the same name; the receiving app or the browser decides how to handle the clash. Nothing is lost on the device.
- **Imported and non-UUID ids**: Rows written by the jar import or the Telegram scores import keep their ids exactly as stored.
- **Clock set wrongly**: The file name and the last-backup line use the device clock as it is; a backup "in the future" shows as "today".
- **Previous backup time inside the file**: The file is taken before the new backup time is recorded, so the profile row inside it carries the time of the backup before it. What import does with that value is spec 015's concern.
- **Narrow and wide screens**: The export button, the last-backup line and the progress or "Share" state fit a 360px-wide phone (the app's narrowest supported width, `docs/design_system.md`) and look right on a wide desktop.

## Requirements _(mandatory)_

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.
- **AC-004**: Any UI MUST follow `docs/design_system.md`: shared components first, theme and token layer only.

### Functional Requirements

**Export**

- **FR-001**: Settings MUST offer an "Export data" action, together with a short note that the file holds all the user's data and is not encrypted.
- **FR-002**: An export MUST produce exactly one file containing every table of the app's database, each with all of its rows.
- **FR-003**: Every stored value MUST appear in the file unchanged in meaning and type, so that a restore can reproduce the device exactly, the balance included. Optional fields that are absent on a row stay absent; they are not written as empty values.
- **FR-004**: The rows of all tables MUST be read as one consistent snapshot, taken at a single moment; a write made during the export is either wholly in the file or wholly absent.
- **FR-005**: The file MUST be named `pocket-discipline-YYYY-MM-DD-HHmm.txt`, using the device's local date and time at the moment of export (24-hour clock), whether it is shared or downloaded. Its content is the structured text of FR-009; the `.txt` name is what lets Chrome and Edge, Android included, put it in the share sheet.
- **FR-006**: While an export is in progress, the action MUST show that it is working and MUST NOT start a second export.
- **FR-007**: Export MUST work with no network connection.
- **FR-008**: An automated check MUST fail when the database has a table that the export does not include.

**File format**

- **FR-009**: The file MUST be a structured text document with a header (envelope) and the table data. The header MUST contain: a fixed marker identifying it as a PocketDiscipline backup, the backup format version (starting at 1), the database schema version of the exporting app, the app version, the export time as an unambiguous point in time, and an "encrypted" flag, which this feature always sets to false.
- **FR-010**: The header MUST stay readable on its own, independently of the table data, so that a later encrypted file (spec 016) can keep the same header with the data encrypted, without a new format version, and so that an import (spec 015) can recognise the file and tell whether it was written by a newer or an older app before reading any data.
- **FR-011**: The table data MUST be grouped by table name, each table holding the list of its rows.

**Delivering the file**

- **FR-012**: Where the device supports sharing files (phones, and desktop browsers that can share files too), the export MUST open the system share sheet with the file attached. Settings MUST also always offer a separate, secondary "Download" action that saves the same file through the browser's normal download, so a user on any device can save the file instead of sharing it.
- **FR-013**: Where the device does not support sharing files, the export MUST save the file through the browser's normal download.
- **FR-014**: If the share sheet cannot be opened straight from the user's tap because preparing the file took too long, the app MUST keep the prepared file and show a "Share" action; one tap on it opens the share sheet with that file.
- **FR-015**: Dismissing the share sheet MUST NOT show an error, MUST NOT download the file instead, and MUST NOT count as a backup.
- **FR-016**: If sharing fails for any other reason, the app MUST show a short error message and offer to download the file instead.

**Last backup**

- **FR-017**: The app MUST record the time of the last successful export on the user's profile. It MUST be recorded only after the share completes (the user chose a target) or the file was handed to the download, never when the export was cancelled or failed.
- **FR-018**: Recording the last-backup time MUST NOT require a database schema change, and MUST NOT change any other stored value.
- **FR-019**: Settings MUST show the age of the last backup as "Last backup: Never", "today", "yesterday" or "N days ago", counted in local calendar days, and MUST update it as soon as an export succeeds.
- **FR-020**: After a purge of the database, the last-backup line MUST read "Never".

### Key Entities _(include if feature involves data)_

- **Backup file**: One document per export. Header: format marker, format version, database schema version, app version, exported-at time, encrypted flag. Body: every table's rows, grouped by table name.
- **User profile (existing `users` row)**: Gains an optional "last exported at" time, absent until the first successful export and cleared by a purge (which reseeds the row without it). Like the existing balance-setup time, it is not indexed.
- **App tables (existing)**: All eleven tables listed in `docs/schema.md` (version 11) are exported as they are; this feature does not change them.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Starting when Settings is visible and its export controls are enabled, the user can complete a share in under 15 seconds and at most three taps (four when the prepare-then-share fallback is needed). Stop timing when the share promise resolves, the success boundary in the assumptions below. Count Export, the fallback Share tap when needed, and all taps in the native share sheet and receiving app before resolution. Use a preconfigured share target with no sign-in or setup; record the target, timing and tap count for both paths under T028 using `quickstart.md` section 4.1.
- **SC-002**: Using the fixed 29,533-row synthetic five-year workload in `quickstart.md` section 4.2, file preparation MUST complete within 3 seconds in each of five measured runs on the reference mid-range phone, a Samsung Galaxy A54 running Android Chrome, without CPU throttling. Measure from the export click handler entry until `createBackup()` resolves with the prepared file, excluding native sharing and download delivery. Record device/RAM variant, OS/browser/build versions, payload bytes and all timings. A different phone may provide supplemental evidence; the reference-device result remains pending until that device is tested.
- **SC-003**: 100% of tables and 100% of rows of the database appear in the file, with values identical to those stored, verified by comparing the file with the database after an export of a fully populated install.
- **SC-004**: Adding a new table to the database without including it in the export makes the automated test suite fail, every time.
- **SC-005**: Cancelling the share sheet produces no error message and leaves the last-backup line unchanged in 100% of attempts.
- **SC-006**: The export controls fit without horizontal scrolling or clipped text from a 360px-wide phone to a wide desktop.

## Assumptions

- **Scope**: Export only. Importing a file (spec 015), a safety export before import, and passphrase encryption (spec 016) are separate specs. A reminder that nags when the backup is old is not part of this spec; showing its age is.
- **What is backed up**: All data is in the app's local database; nothing is kept in other browser storage, so the database's tables are the whole backup. Preferences of the browser itself (theme, installed state) are not included.
- **"Success" of a share or download**: The app can only know that the user picked a share target or that the browser accepted the download; it cannot know whether the receiving app actually stored the file. That is the point at which the backup counts.
- **App version**: The header carries whatever version the build reports, even while it is a placeholder; import relies mainly on the format and schema versions.
- **Single user**: One profile per device, as everywhere else in the app.
- **Placement**: The export lives on the existing Settings page, next to the other data actions (balance setup, imports, purge).

### Notes for planning

- New vertical slice under `src/app/features/backup/`.
- Spike first: whether the share sheet still opens after the database has been read, on the target phones. FR-014's prepare-then-share fallback must be designed in from the start, not added if the spike fails.
- Follow `docs/code_style.md`, `docs/design_system.md` and the `pocketdiscipline-ui` skill; register the new UI states (idle with Export and Download, preparing, ready to share, last backup) in the layout audit.
- Done = `npm run lint`, `npm run typecheck`, unit tests and the full `npm run e2e`.