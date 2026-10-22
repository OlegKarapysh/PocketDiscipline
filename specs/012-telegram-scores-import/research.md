# Research: Import Historical Daily Scores from Telegram Chat Export

## 1. Parsing Telegram Desktop JSON Export (`result.json`)

- **Decision**: Parse the JSON string locally using native `JSON.parse` (stripping any leading UTF-8 BOM `\uFEFF`), verify that the top-level value is a plain object containing a `messages` array of plain objects, ignore entries where `type !== 'message'` or extracted text is empty, and match trimmed message text against `/^(?<score>10|[1-9])\/10$/u`.
- **Rationale**: Telegram Desktop's JSON export stores user messages with `type: 'message'` alongside service events (`type: 'service'`). Furthermore, Telegram represents `text` either as a plain string or as a mixed array of strings and rich-text entity objects (`{ type: string, text: string }`). Flattening segments and collapsing whitespace handles both representations without external dependencies (Constitution Principle II).
- **Alternatives considered**:
  - Heuristic parsing of date shifts (`yesterday`) or inline notes inside the parser. Rejected: the user pre-patches shifted dates and notes in `result.json` before import, and explicitly wants any remaining non-matching text messages surfaced in the Preview's skipped messages list so unpatched lines are visible before confirming.

## 2. Local Date Parsing & Same-Day Deduplication

- **Decision**: Parse `date` strings matching `/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/u` into a local `Date` via `new Date(year, month - 1, day, hours, minutes, seconds)` (defaulting time to `12:00:00` when omitted) and verify round-trip calendar component equality to reject impossible dates (e.g., `2026-02-31`). Sort valid score candidates ascending by `createdAt` timestamp and deduplicate by `YYYY-MM-DD` (`DATE_LOCALE_CA`) so the latest message on any date wins and each superseded message increments `duplicateDates`.
- **Rationale**: `Date.parse` treats date-only ISO strings as UTC while treating date-time strings without an offset as local time, and silently rolls over out-of-range calendar days. Component-level construction guarantees local device time and strict calendar validation.
- **Alternatives considered**:
  - Keeping the earliest message on a duplicate date. Rejected: the user specification requires keeping the latest message on the same day.

## 3. Chronological Streak & Reward Recalculation

- **Decision**: Merge existing `dailyScores` rows with the parsed `TelegramScoreRow` items in a `Map<string, DailyScore>` keyed by `date` (`YYYY-MM-DD`), where imported dates replace existing dates. Iterate all dates in ascending lexicographical (`YYYY-MM-DD`) order:
  - Look up `dayBefore(date)` in the merged map to obtain `previousStreak` (`0` if the previous calendar day has no record).
  - Compute `streakAtThisDay = score >= 9 ? previousStreak + 1 : 0`.
  - For imported dates, compute `rewardEarned` using the existing constants in `daily-score-reward.const.ts` (`REWARD_GOOD = 100`, `REWARD_PERFECT = 500`, `STREAK_BONUS_STEP = 0.1`, `MAX_STREAK_BONUS = 1.0`) rounded with `Math.round`.
  - For existing non-imported dates whose `streakAtThisDay` changed due to newly imported preceding dates, update `streakAtThisDay` while preserving their existing `rewardEarned`.
  - Write all new and modified rows in a single `db.transaction('rw', [db.dailyScores], ...)` via `bulkPut`, without touching `db.users`.
- **Rationale**: Keying by `YYYY-MM-DD` and walking the sorted union of existing and imported dates guarantees that streaks and streak bonuses are contiguous across calendar days, gaps reset the streak to `0`, overlapping dates are replaced deterministically, and `users.balance` remains untouched.
- **Alternatives considered**:
  - Calling `DailyScoresService.saveTodayScore()` in a loop. Rejected: `saveTodayScore()` only operates on today's date and increments `users.balance`.

## 4. Vertical Slice Placement & UI Design System

- **Decision**: Place the parser service, import service, models, and page component inside the `features/daily-scores/` vertical slice (`src/app/features/daily-scores/`), routed at `/settings/telegram-import` under `settings` in `src/app/app.routes.ts` and linked from `src/app/features/settings/settings.html`. Build the page with `PageHeader`, `SectionCard`, `StatCard`, and Angular Material buttons/icons using theme and spacing tokens only, and register empty, rejected-file, and worst-case export states in `e2e/src/layout-audit.spec.ts`.
- **Rationale**: Telegram score importing operates exclusively on `dailyScores` and shares `daily-score-reward.const.ts`. Keeping it within `features/daily-scores/` avoids cross-feature imports while keeping `/settings/telegram-import` nested under `/settings` in the router configuration just like `/settings/jar-import`.
- **Alternatives considered**:
  - Creating a separate top-level `features/telegram-import/` slice. Rejected: unlike `jar-import` (which writes across 6 tables), Telegram scores import belongs solely to the `daily-scores` domain and reuses its reward constants directly.
