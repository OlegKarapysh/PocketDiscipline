# Quickstart Validation Guide: Import Daily-Task History from a monobank Jar Statement

## Prerequisites

- `npm start`, open `http://localhost:4200/settings`.
- A statement: the synthetic one is the CSV text exported by `src/app/features/jar-import/testing/jar-statement.fixture.ts`; your own is the file monobank exports for the jar. Never copy a real statement into the repository.

## Automated

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

- `jar-statement-parser.service.spec.ts`: every comment variant, header rejection, local-time dates.
- `jar-import.service.spec.ts`: re-import adds nothing, balance untouched, an existing task is reused, streaks, shifted rows, same-day duplicates.
- `e2e/src/jar-import.spec.ts`: imports the fixture and checks Tasks, streaks and the dashboard.
- `e2e/src/layout-audit.spec.ts`: the page at every width, empty, rejected, and with a 60-row worst-case statement.

## Manual

### 1. A file that is not a statement
1. Settings → **Import jar statement** → **Choose statement**, pick any other CSV.
2. **Expected**: "This is not a monobank jar statement", no summary, nothing written.

### 2. Read and review
1. Pick the statement.
2. **Expected**: the summary shows the row count, the date range, deposits and withdrawals, and a count per kind. For the real statement: 1,706 rows, 1,315 deposits, 391 withdrawals; 131 scores, 136 pomodoro, 34 timed, 171 counted, 11 top-ups, 811 graded, 21 free text.
3. **Expected**: the review lists one row per label with its row count and total; "Подсчёт итогов месяца" and the top-ups are on Skip.

### 3. Import
1. Note the balance on the dashboard. Press **Import**.
2. **Expected**: one message ("Imported … completions into … tasks · … skipped"), the app opens Tasks, each imported task shows its difficulties and streak, the balance is unchanged, and the dashboard shows past earnings on the right days.

### 4. Import again
1. Repeat step 3 with the same file.
2. **Expected**: "Nothing new to import", with every row counted as already imported or skipped. Tasks, history and balance are unchanged.

### 5. Reset
"Purge database" in Settings is the only way back: there is no undo.
