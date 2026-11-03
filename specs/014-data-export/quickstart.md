# Quickstart: validating Data Export (Backup)

How to prove the feature works. What the file must contain is in
[contracts/backup-file.md](./contracts/backup-file.md); what the card shows is in
[contracts/backup-card.md](./contracts/backup-card.md).

## Prerequisites

- `npm ci` done; Playwright browsers installed (`npx playwright install chromium`).
- For the spike and the phone checks: an Android phone with Chrome and, if available, an iPhone with Safari,
  reaching the dev server over the LAN (`npx ng serve --host 0.0.0.0`) or the deployed preview. Web Share
  needs a secure context: `localhost` or HTTPS.

## 1. Spike: share after reading the database (T028)

On each phone, open a scratch page (kept out of the repo) that, on one tap, reads the real database in one
transaction and then calls `navigator.share({ files: [file] })` with a `.txt` file of the real size.

Record per browser: does the direct share open the sheet; after how many ms of reading does it fail with
`NotAllowedError`; does a second tap on a "Share" button always work; what does dismissing the sheet throw
(`AbortError` expected). Inflate the data (thousands of rows) to find the limit.

Expected: Chrome on Android shares directly for normal data; any `NotAllowedError` is recovered by the second
tap. Record results in `research.md` §2. Prefer doing this before building the card when a phone is
available; implementation may proceed with the designed fallback while T028 remains pending.

## 2. Automated gates (definition of done)

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

What they cover for this feature:

| Suite                                                         | Proves                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `backup-export.service.spec.ts`                               | Every table in `db.tables` is in `data` with its rows deep-equal (FR-002/003/008); envelope fields (FR-009); file name from a fixed clock (FR-005); absent optional fields stay absent; snapshot is one transaction (a write started during the export is wholly in or out). |
| `file-sharing.service.spec.ts`                                | `navigator.share` result → `shared` / `cancelled` / `needs-tap` / rethrow; download clicks an anchor with the file name and revokes the URL. |
| `backup-card.spec.ts`                                         | Last-backup wording (Never, today, yesterday, N days ago, future → today); blank before the user row loads; state machine; nothing recorded on cancel or failure; double tap starts one export. |
| `e2e/src/backup-export.spec.ts`                               | Download path end to end on Chromium: file name, parseable content with every table, "Last backup: today" afterwards. Share paths with a stubbed `navigator.share` (resolve, `AbortError`, `NotAllowedError` → Share button). Purge → "Never". |
| `e2e/src/layout-audit.spec.ts`                                | The card's states fit 360px to 1920px.                                                                          |

Sanity check the completeness test can fail: temporarily make the export skip one table, run
`npm test -- --watch=false --include src/app/features/backup/**`, see it fail, revert.

## 3. Layout audit

Entries to add to `SCREENS` (the plain `settings` entry already measures the idle card):

- `settings: backup ready to share` — stub `navigator.canShare`/`share` with an init script so the first share
  rejects with `NotAllowedError`, tap Export, wait for the "Share" button.
- Seed worst content: `users.lastExportedAt` far in the past so the line reads "Last backup: 9999 days ago"
  (or more), via the audit's seed.

Generate the 360px and 1280px screenshots with PowerShell (the selector matches width groups, which each
include every screen):

```powershell
$env:LAYOUT_AUDIT_SCREENSHOTS = '1'
npx playwright test layout-audit -g "at (360|1280)px"
Remove-Item Env:LAYOUT_AUDIT_SCREENSHOTS
```

Inspect the settings screenshots in `test-results/layout-audit/360/` and `1280/`, in light and dark mode.
For all reference widths, omit `-g "at (360|1280)px"`. Run each color mode separately through Playwright's
color-scheme setting; the environment flag only enables screenshots.

## 4. Manual check on a phone

1. Settings shows the Backup card with "Last backup: Never".
2. Tap **Export data** → share sheet with `pocket-discipline-<today>-<HHmm>.txt`. Send it to Telegram
   "Saved messages". The card says "today" and a toast says "Backup shared."
3. Export again and dismiss the sheet: no toast, the line is unchanged.
4. Tap **Download**: the file lands in Downloads; open it, it is the JSON described in the contract.
5. Airplane mode: export still works.
6. Purge the database: the line reads "Never".
7. Run the timed direct/fallback sharing checks in section 4.1 (SC-001).
8. Run the fixed large-history benchmark in section 4.2 (SC-002).

### 4.1. Share duration and tap count (SC-001)

Use a preconfigured receiving app/share target that needs no sign-in or setup. Start with Settings visible
and its export controls enabled. Start timing immediately before tapping Export; stop when the real
`navigator.share` promise resolves. Count every tap from Export through resolution, including taps in the
native sheet and receiving app. Direct sharing must take under 15 seconds and at most three taps.
Repeat with the prepare-then-Share fallback: under 15 seconds and at most four taps, including Share.
If fallback does not occur naturally, use the scratch spike to delay preparation until activation expires;
keep the native share API real, include the delay in the elapsed time, and record that it was induced.
Verify that the fallback shares the same prepared file. Record elapsed time, tap count, target and browser
for each path in `research.md` section 2. A path not exercised remains pending, rather than passing from
stubbed outcomes. Report any target-specific extra confirmation steps and resulting threshold failures.

### 4.2. Fixed five-year benchmark (SC-002)

Reference hardware: Samsung Galaxy A54, Android Chrome, no artificial CPU throttling. Record the RAM
variant, OS and Chrome versions, production build revision, battery/power-saving state and device temperature
condition. Use the production build over HTTPS on a dedicated test origin with synthetic data; keep personal
data out of the fixture. Other devices provide supplemental results only.

Seed exactly 29,533 rows across the eleven schema-v11 tables:

| Table | Rows |
|-------|-----:|
| users | 1 |
| goals | 100 |
| tasks | 100 |
| dailyTasks | 20 |
| dailyScores | 1,825 |
| pomodoroSessions | 7,300 |
| dailyTaskCompletions | 18,250 |
| withdrawals | 1,825 |
| rewards | 100 |
| rewardCategories | 10 |
| pomodoroRewardRates | 2 |

Use 1,825 consecutive calendar days starting 2021-01-01: one score, four completed 25-minute pomodoros,
ten distinct daily-task completions and one withdrawal per day. Use deterministic unique ids, valid foreign
keys and schema-v11 row shapes. Each daily task has three difficulties. Populate titles/names with 32 ASCII
characters (difficulty names: 8); set optional description/notes fields, where supported, to 64 ASCII
characters, numeric amounts to 100 and user balance to 100,000. Use sequential dates/timestamps and valid
status/enum values. Keep the fixture or seed recipe with the recorded results outside the repository; record
its hash and the resulting UTF-8 backup byte count so another run can reuse the same payload. Verify row
counts before timing; do not replace this workload with arbitrary inflated data.

Use Download to avoid native-sheet timing. Measure with `performance.now()` at the export click handler
entry and immediately after `createBackup()` resolves with the file, using temporary local instrumentation
or a debugger that does not pause execution. Include database reads, serialization and File construction;
exclude seeding, share-sheet interaction and download delivery. Do one unmeasured warm-up, then five
measured exports with the same seeded data, clearing only `lastExportedAt` between runs to preserve the
payload. Record all five durations and their maximum; every measured run must be at most 3,000 ms.
Observe that the progress state paints and the page stays responsive during preparation; record any
freeze separately even when the duration passes. Remove temporary instrumentation after measuring.


## 5. Desktop check

Chrome on Windows: **Export data** opens the Windows share dialog; **Download** saves the file. Firefox
(no file sharing): **Export data** downloads.

## Implementation handoff (2026-11-03)

Implementation is on `codex/014-data-export`, based on local `main`.

T002 was superseded by T028, the sole pending real-device validation task: no phone is available. Before considering
real-device validation complete, run the spike in section 1 and the phone checks in section 4:
Android Chrome sharing, cancellation, the fresh-tap fallback, offline operation, purge, and the
timed share flows (SC-001) and the fixed five-year benchmark (SC-002). Check iOS Safari too if available. The native desktop share
dialog and Firefox download path in section 5 also remain manual checks. Automated Chromium
checks exercise downloads and stubbed share outcomes; they do not verify native share targets.

The layout audit includes idle, preparing, and ready-to-share states, with a backup age over
9999 days. Separate light/dark screenshots at 360px and 1280px were inspected; both buttons
measure 44px high. A clipped spinner found during review was corrected.

To regenerate audit screenshots, use the PowerShell commands in section 3. The audit groups settings
inside each width's full-screen test; select width groups rather than screen names.

Automated validation passed: lint (including UI/format/skills checks), all three typecheck
configurations, 1030 unit tests in 98 files, and 97 Playwright tests including the seven-width
layout audit. The mandatory `speckit.test` post-hook ran the full unit and E2E suites.
The completeness test was deliberately broken by omitting `users`, failed as required, and
was restored. A final targeted run passed all 30 backup unit tests after the last lint correction.
Production build succeeds with the 805.23 kB initial-bundle warning described in research section 7.
