# Data Model: Import Historical Daily Scores from Telegram Chat Export

No database table, index, or schema version changes are required (`pocket-discipline-db` remains at its current version). The feature defines four in-memory models in `src/app/features/daily-scores/models/` (one interface per file per `docs/code_style.md`) and writes to the existing `dailyScores` table in `DbService`.

## In-Memory Models (`src/app/features/daily-scores/models/`)

### 1. `TelegramScoreRow` (`telegram-score-row.model.ts`)

Represents a validated daily score extracted from a single Telegram message.

| Field | Type | Constraints / Notes |
|---|---|---|
| `date` | `string` | Local calendar date formatted as `YYYY-MM-DD` (`DATE_LOCALE_CA`). |
| `score` | `number` | Integer from `1` to `10` matched from `^(10\|[1-9])\/10$`. |
| `createdAt` | `number` | Epoch timestamp (ms) parsed from the message's local `date` string. |

### 2. `TelegramExportParseResult` (`telegram-export-parse-result.model.ts`)

Output of `TelegramScoresParserService.parse(text)`.

| Field | Type | Constraints / Notes |
|---|---|---|
| `scores` | `TelegramScoreRow[]` | Deduplicated score rows (latest message per `date` kept), sorted ascending by `date`. Non-empty (at least 1 row). |
| `duplicateDates` | `number` | Count of earlier valid score messages on the same calendar date that were superseded by a later message on that date (`>= 0`). |
| `skippedMessages` | `string[]` | Non-empty `"message"` entries whose text did not match `1/10`–`10/10`, formatted as `<YYYY-MM-DD>: "<quoted text>"` (quoted text truncated at 40 chars with `…`). |

### 3. `TelegramImportPreview` (`telegram-import-preview.model.ts`)

Output of `TelegramScoresImportService.preview(parsed)`, combining parsed rows with existing `dailyScores` rows.

| Field | Type | Constraints / Notes |
|---|---|---|
| `totalScores` | `number` | Total deduplicated scores in the export (`parsed.scores.length`). |
| `newScores` | `number` | Count of dates in `parsed.scores` not currently present in `db.dailyScores`. |
| `replacedScores` | `number` | Count of dates in `parsed.scores` that already exist in `db.dailyScores`. |
| `highScores` | `number` | Count of parsed scores with `score >= 9`. |
| `averageScore` | `number` | Arithmetic mean of `parsed.scores`, rounded to 1 decimal place (`Math.round((sum / total) * 10) / 10`). |
| `resultingStreak` | `number` | `streakAtThisDay` of the latest date in the combined dataset after chronological streak recalculation. |
| `startDate` | `number` | Minimum `createdAt` timestamp across `parsed.scores`. |
| `endDate` | `number` | Maximum `createdAt` timestamp across `parsed.scores`. |
| `duplicateDates` | `number` | Passed through from `parsed.duplicateDates`. |
| `skippedMessages` | `string[]` | Passed through from `parsed.skippedMessages`. |

### 4. `TelegramImportResult` (`telegram-import-result.model.ts`)

Output of `TelegramScoresImportService.import(parsed)`.

| Field | Type | Constraints / Notes |
|---|---|---|
| `imported` | `number` | Total scores written from the export (`parsed.scores.length`). |
| `replaced` | `number` | Count of existing `dailyScores` dates overwritten. |
| `skipped` | `number` | `parsed.skippedMessages.length + parsed.duplicateDates`. |
| `resultingStreak` | `number` | Resulting high-score streak after chronological recalculation. |

## Persisted Table Written (`docs/schema.md`)

### `dailyScores` (`DailyScore` in `src/app/core/models/daily-score.model.ts`)

| Field | Type | Primary Key | Write Rule |
|---|---|---|---|
| `date` | `string` | Yes (`YYYY-MM-DD`) | Imported row's `date` (or existing row's `date` when streak cascades to later non-imported dates). |
| `score` | `number` | No | Integer `1`–`10` from `TelegramScoreRow.score` (or preserved for non-imported dates). |
| `rewardEarned` | `number` | No | Whole hryvnias: `0` for `1`–`8`, `Math.round(100 * (1 + min(prevStreak * 0.1, 1.0)))` for `9`, `Math.round(500 * (1 + min(prevStreak * 0.1, 1.0)))` for `10`. Preserved unchanged on non-imported dates. |
| `streakAtThisDay` | `number` | No | `prevDayStreak + 1` if `score >= 9` on consecutive calendar days, else `0`. |
| `createdAt` | `number` | No | `TelegramScoreRow.createdAt` (or preserved for non-imported dates). |

`users.balance` is **never** modified by the import.

## State Transitions (`TelegramImportPage`)

```text
idle ──pick file──▶ parsing & previewing ──valid──▶ preview ready ──click Import──▶ importing ──success──▶ snackbar + navigate('/daily-scores')
                             │                                                          │
                             └──invalid JSON / date / 0 scores──▶ error alert           └──db failure──▶ error snackbar (preview remains, nothing written)
```
