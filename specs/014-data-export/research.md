# Research: Data Export (Backup)

Phase 0 of [plan.md](./plan.md). Each section records a decision, why, and what was rejected.

## 1. Which file types the share sheet accepts

**Decision**: The file is `pocket-discipline-YYYY-MM-DD-HHmm.txt` with MIME type `text/plain`, for sharing and
for download alike. The content is JSON.

**Rationale**: Chromium shares only allowlisted file types, checked by both extension and MIME type. The list
([FILE_TYPES.md](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/webshare/FILE_TYPES.md),
checked 2026-11-01) has `txt`/`text/plain`, `csv`, `pdf`, images, audio and video, and **no `json`**. A `.json`
file makes `navigator.canShare({ files })` return false on Chrome and Edge, Android included, so the phone would
never get a share sheet. The user chose `.txt` for both paths (spec Clarifications, FR-005), so every backup has
one name pattern.

**Alternatives considered**:

- `.json` everywhere: share works only in Safari. Rejected: Android Chrome is a main target.
- `.txt` to share, `.json` to download: two name patterns for one format. Rejected by the user.
- `.json` name with `text/plain` type: Chromium checks the extension as well, so it still fails.

## 2. The share sheet needs a recent tap

**Implementation check (2026-11-03)**: T002 has been superseded by T028, the sole pending real-device validation task: no phone is available. The user authorized continuing with the designed fallback. Real Android Chrome / iOS Safari activation, cancellation and large-history timing are unverified.

**Validation protocol**: T028 records the direct/fallback timing and tap counts from `quickstart.md` section 4.1 (SC-001), and the fixed 29,533-row reference-phone benchmark from section 4.2 (SC-002). Record all required device, payload and run details here when measured; no passing real-device results are claimed yet.

**Decision**: Try to share straight from the tap. If the browser refuses with `NotAllowedError`, keep the
prepared file and show a **Share** button; its tap shares that file at once, with no other `await` before
`navigator.share`. The spike in T028 measures how often the fallback happens on real phones.

**Rationale**: `navigator.share` requires transient user activation (MDN: `NotAllowedError` without it), and
the activation expires a short time after the tap. Chromium's window is about 5 seconds; WebKit does not
publish one and has been stricter than Chrome when the share follows other async work
([WebKit bug 197779](https://bugs.webkit.org/show_bug.cgi?id=197779),
[The User Activation API](https://webkit.org/blog/13862/the-user-activation-api/)). Reading eleven tables
takes milliseconds for normal data, so the direct share usually works, but years of history on a slow phone,
or Safari's stricter check, can miss the window. A second tap always gives a fresh activation.

Whether file sharing is possible is decided **before** the database is read, with a small probe `File` of the
same name pattern and type passed to `navigator.canShare({ files: [probe] })`. That check is synchronous and
does not consume the activation.

**Error mapping** (spec FR-014 to FR-016):

| `navigator.share` result | Meaning                       | What the app does                                                        |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------------ |
| resolves                 | the user chose a target       | record the backup time, toast "Backup shared."                           |
| `AbortError`             | the user dismissed the sheet  | back to idle, nothing recorded, no message                               |
| `NotAllowedError`        | activation expired            | state "ready to share": show the Share button with the prepared file    |
| anything else            | sharing failed                | toast "Couldn't share the backup. Use Download instead."; back to idle   |

A `NotAllowedError` on the **Share** button's own tap is treated as a failure (last row), so the app never
loops.

**Alternatives considered**:

- Always two steps (prepare, then Share): reliable but one tap more on every export, for a problem that may
  not occur on Chrome. Kept as the fallback instead.
- Read the database in advance (when Settings opens) so the tap only shares: the file would not be a snapshot
  of the moment of export, and it costs a full read on every visit to Settings.

## 3. Download where sharing is not possible

**Decision**: Create an object URL for the file, click a detached `<a download="…">`, and revoke the URL after
the click. The backup counts as made once the click has happened (FR-017).

**Rationale**: It is the standard way to save a generated file from a web page; it needs no package and works
offline. The browser gives no signal that the download finished or where it went, so handing it over is the
only moment the app can know about. Downloads do not need user activation in a way that matters here.

**Alternatives considered**: the File System Access API's `showSaveFilePicker` — Chromium desktop only, and an
extra dialog. Not needed.

## 4. A consistent snapshot

**Decision**: Read every table inside one Dexie read-only transaction:
`db.transaction('r', db.tables, () => Promise.all(db.tables.map((table) => table.toArray())))`.

**Rationale**: An IndexedDB read-only transaction over a set of stores sees one consistent state; a read-write
transaction that touches those stores runs entirely before or entirely after it (spec FR-004, "writes during
the export"). The existing write paths already group related writes in one transaction (a completion and its
balance credit), so a snapshot never holds half of one.

**Alternatives considered**: reading tables one by one — a pomodoro completing in between could put its
session in the file without its balance credit.

## 5. Every table, and the test that fails when one is missing

**Decision**: The export iterates `db.tables`, Dexie's list of every table in the open schema, rather than a
hand-written list. The unit test seeds one row into **every** table in `db.tables`, exports, and asserts that
the file's `data` has exactly those table names, each with the seeded row deep-equal to what is stored.

**Rationale**: Iterating `db.tables` makes "a new table is left out" impossible by construction; the test
makes it impossible to regress to a hand-written list unnoticed (a list missing the new table fails the
test, because the seeded row is missing). Per the testing rules, the test is broken on purpose once (drop one
table from the export) to prove it can fail.

**Alternatives considered**: a pinned list of the 11 table names in the test. It fails when a table is added
even if the export includes it, which tests the schema, not the export.

## 6. Values survive unchanged

**Decision**: Rows go through `JSON.stringify` as they are, with no transformation.

**Rationale**: Every stored value is a JSON type: strings, whole numbers, booleans, arrays and nested objects
(`core/models/*` holds no `Date`, `Blob`, `Map` or typed array; timestamps are epoch milliseconds; money is
whole hryvnias since version 9). `JSON.stringify` leaves out properties that are `undefined`, which is what
FR-003 asks for: an absent optional field stays absent. Non-finite numbers would become `null`, but none can be
stored (`UserService.addBalance` refuses them). A unit test covers optional fields and imported (non-UUID) ids.

**Alternatives considered**: a custom serialiser with type tags — only needed if a non-JSON type is ever
stored. A later schema that adds one must bump the format version.

## 7. Envelope and versions

**Decision**: `format: 'pocket-discipline-backup'`, `formatVersion: 1`, `schemaVersion: db.verno` (11 today),
`appVersion` from `package.json`, `exportedAt` as an ISO 8601 UTC string, `encrypted: false`, then `data`.
Details in [contracts/backup-file.md](./contracts/backup-file.md).

**Rationale**:

- `schemaVersion` is what lets import (015) tell a newer file from an older one: rows of a newer schema
  cannot be written safely by an older app, and rows of an older schema can be upgraded. `db.verno` is the
  version Dexie actually opened, so it cannot drift from `db.service.ts`.
- `formatVersion` changes only when the envelope's meaning changes. Encryption (016) does not change it: when
  `encrypted` is true, `data` is absent and an encryption block carries the ciphertext. A reader checks
  `format`, then `formatVersion`, then `encrypted`, before touching the payload.
- `exportedAt` is a string, not epoch ms, so a person reading the file can see when it was made; ISO UTC is
  unambiguous across time zones.
- `appVersion`: `package.json` is still `0.0.0`. It is read with a JSON import of `version`, which needs
  `resolveJsonModule` in `tsconfig.json` (the app and spec configs both extend it and both compile the service); esbuild tree-shakes a named JSON import to the one property
  (verify the bundle while implementing). It is informational: import relies on `formatVersion` and
  `schemaVersion`.

**Alternatives considered**: the Angular build's `define` option for the version — a second place to keep it
in step. The service worker's `appData` — not available outside the service worker.

**Build verification (2026-11-03)**: The production build succeeded. Searching the emitted
JavaScript found no `devDependencies`, `packageManager`, or `@playwright/test` package metadata,
confirming that the named JSON import does not bundle the whole package file. Initial output
was 805.23 kB: above the configured 500 kB warning, below the 1 MB error limit. No budget was changed.

## 8. Recording the last backup

**Decision**: Add `lastExportedAt?: number` (epoch ms) to `User` in `core/models/user.model.ts`. The backup
slice writes it with `db.users.update(CURRENT_USER_ID, { lastExportedAt })` after a successful share or
download, and changes nothing else on the row — not even `updatedAt` (FR-018).

**Rationale**: Unindexed, like `balanceSetUpAt`, so no schema version (docs/schema.md). The purge reseeds the
`users` row without it, which gives "Never" after a purge (FR-020) with no extra code. The write belongs to the
backup slice because it is backup policy; `UserService` stays about the balance.

**Snapshot order**: the snapshot is taken first, the time is recorded after delivery, so the file's `users` row
holds the previous backup's time (spec edge case). That is intended.

## 9. "Last backup" wording

**Decision**: Compute calendar days between the local date of `lastExportedAt` and `ClockService.today()`:
0 or less → "today", 1 → "yesterday", n → "n days ago", absent → "Never". The value updates live: the card reads
the user row through `UserService.user$` (a live query), and `ClockService.today` rolls over at midnight.

**Rationale**: Calendar days match how a person reads "3 days ago" and the app's other day-based screens.
A clock set back (backup "in the future") shows "today" (spec edge case). Days are counted from local
`YYYY-MM-DD` dates, so a daylight-saving change does not make a day 23 or 25 hours.

## 10. Where the UI lives

**Decision**: A `BackupCard` component in `features/backup/components/backup-card/`, rendered by
`settings.html` above the list of links, built on `app-section-card` (heading "Backup"). Inside: a short note,
the last-backup line, a primary `mat-flat-button` "Export data" and a secondary `mat-stroked-button`
"Download". While preparing, both are disabled and the primary shows a `mat-progress-spinner` (diameter 20)
in place of its icon; in the ready-to-share state the primary becomes "Share". The actions wrap with
`flex-wrap`, full width on a phone like other card actions.

**Rationale**: Settings already imports a component from another slice (`PomodoroRewardSettings`), so this
follows precedent. `app-section-card` gives the titled block; no new shared component is needed.

**Alternatives considered**: a route of its own (`/settings/backup`) like the imports — more navigation for
two buttons and one line. Can move there when import (015) adds more UI.