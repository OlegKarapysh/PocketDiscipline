# Quickstart Validation Guide: Import Historical Daily Scores from Telegram Chat Export

## Prerequisites

- Start the dev server with `npm start` and open `http://localhost:4200/settings`.
- Have a Telegram Desktop JSON chat export (`result.json`) or use a synthetic JSON file matching the Telegram export format (`{ "messages": [...] }`).

## Automated Verification

Run all four verification gates from the repository root:

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

Key test suites covering this feature:
- `src/app/features/daily-scores/services/telegram-scores-parser.service.spec.ts`: JSON validation, BOM handling, text entity array flattening, date validation, `1/10`–`10/10` matching, same-day deduplication (keeping latest), and skipped message formatting/truncation.
- `src/app/features/daily-scores/services/telegram-scores-import.service.spec.ts`: preview metrics, chronological streak and reward calculation, calendar gap reset, replacing overlapping dates, cascading streak updates into later existing dates, atomic transaction rollback on failure, and leaving `users.balance` untouched.
- `src/app/features/daily-scores/pages/telegram-import-page/telegram-import-page.spec.ts`: file picking, preview rendering, error banner display, snackbar summary, and navigation to `/daily-scores`.
- `e2e/src/telegram-import.spec.ts`: end-to-end navigation from `/settings`, rejecting invalid JSON, previewing and importing valid scores, verifying overlapping date replacement, streak update on `/daily-scores`, and unchanged user balance.
- `e2e/src/layout-audit.spec.ts`: responsive layout checks across all 7 reference widths (`360px` to `1920px`) for `telegram import`, `telegram import: rejected file`, and `telegram import: worst-case export`.

## Manual Verification Scenarios

### 1. Reject an Invalid File
1. Navigate to **Settings** (`/settings`) and click **Import Telegram scores** (`/settings/telegram-import`).
2. Click **Choose export** and pick a JSON file without a `messages` array (e.g., `{"hello": "world"}`).
3. **Expected**: An error alert displays `"This is not a Telegram chat export."` and no Preview card or Import button is shown.

### 2. Preview an Export with Duplicates and Skipped Messages
1. Pick a Telegram `result.json` export containing valid `1/10`–`10/10` messages, two messages on the same day, a service message, and a non-matching text note.
2. **Expected**:
   - The **Preview** card shows **Scores to import** (new vs. replaced), **Current streak**, **Average score** (with high-score count), and **Period** date range.
   - Notes indicate how many earlier same-day messages were replaced and how many messages were skipped.
   - The **Skipped messages** list displays the date and quoted text of the non-matching message while ignoring the service message.

### 3. Import Scores and Verify Streak & Balance
1. Note the current balance in the top bar or Dashboard.
2. Click **Import** in the Preview card.
3. **Expected**:
   - A snackbar notification summarizes imported, replaced, and skipped counts along with the resulting high-score streak.
   - The app navigates to `/daily-scores`, reflecting the updated streak and score statistics.
   - The user's balance remains completely unchanged.
