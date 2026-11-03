# Quickstart: validating Data Export (Backup)

How to prove the feature works. What the file must contain is in
[contracts/backup-file.md](./contracts/backup-file.md); what the card shows is in
[contracts/backup-card.md](./contracts/backup-card.md).

## Prerequisites

- `npm ci` done; Playwright browsers installed (`npx playwright install chromium`).
- For the spike and the phone checks: an Android phone with Chrome and, if available, an iPhone with Safari,
  reaching the dev server over the LAN (`npx ng serve --host 0.0.0.0`) or the deployed preview. Web Share
  needs a secure context: `localhost` or HTTPS.

## 1. Spike: share after reading the database (do first)

On each phone, open a scratch page (kept out of the repo) that, on one tap, reads the real database in one
transaction and then calls `navigator.share({ files: [file] })` with a `.txt` file of the real size.

Record per browser: does the direct share open the sheet; after how many ms of reading does it fail with
`NotAllowedError`; does a second tap on a "Share" button always work; what does dismissing the sheet throw
(`AbortError` expected). Inflate the data (thousands of rows) to find the limit.

Expected: Chrome on Android shares directly for normal data; any `NotAllowedError` is recovered by the second
tap. Record results in `research.md` §2 before building the card.

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

Look at the screenshots: `LAYOUT_AUDIT_SCREENSHOTS=1 npx playwright test layout-audit -g settings`, at 360px and
1280px, light and dark.

## 4. Manual check on a phone

1. Settings shows the Backup card with "Last backup: Never".
2. Tap **Export data** → share sheet with `pocket-discipline-<today>-<HHmm>.txt`. Send it to Telegram
   "Saved messages". The card says "today" and a toast says "Backup shared."
3. Export again and dismiss the sheet: no toast, the line is unchanged.
4. Tap **Download**: the file lands in Downloads; open it, it is the JSON described in the contract.
5. Airplane mode: export still works.
6. Purge the database: the line reads "Never".
7. Large history (SC-002): with five years of daily use seeded (the spike's inflated data will do), tap
   **Download** and time it: the file is handed over within 3 seconds and the page stays responsive, with
   the spinner showing meanwhile.

## 5. Desktop check

Chrome on Windows: **Export data** opens the Windows share dialog; **Download** saves the file. Firefox
(no file sharing): **Export data** downloads.

## Implementation handoff (2026-11-03)

Implementation is on `codex/014-data-export`, based on local `main`.

T002 is intentionally pending: the user confirmed that no phone is available. Before considering
real-device validation complete, run the spike in section 1 and the phone checks in section 4:
Android Chrome sharing, cancellation, the fresh-tap fallback, offline operation, purge, and the
five-year-history timing (SC-002). Check iOS Safari too if available. The native desktop share
dialog and Firefox download path in section 5 also remain manual checks. Automated Chromium
checks exercise downloads and stubbed share outcomes; they do not verify native share targets.

The layout audit includes idle, preparing, and ready-to-share states, with a backup age over
9999 days. Separate light/dark screenshots at 360px and 1280px were inspected; both buttons
measure 44px high. A clipped spinner found during review was corrected.

To regenerate audit screenshots, run `LAYOUT_AUDIT_SCREENSHOTS=1 npx playwright test layout-audit`
(set the environment variable with PowerShell syntax on Windows). The audit groups settings
inside each width's full-screen test, so `-g settings` selects no tests.

Automated validation passed: lint (including UI/format/skills checks), all three typecheck
configurations, 1030 unit tests in 98 files, and 97 Playwright tests including the seven-width
layout audit. The mandatory `speckit.test` post-hook ran the full unit and E2E suites.
The completeness test was deliberately broken by omitting `users`, failed as required, and
was restored. A final targeted run passed all 30 backup unit tests after the last lint correction.
Production build succeeds with the 805.23 kB initial-bundle warning described in research section 7.
