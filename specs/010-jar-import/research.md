# Research: Import Daily-Task History from a monobank Jar Statement

Every decision below was checked against Oleh's real statement with a probe kept in the session scratchpad, never in the repository. The probe reproduced the brief's acceptance counts: 1,315 deposits, 391 withdrawals, 1,706 unique `(date-time, balance)` pairs; 131 score, 136 pomodoro, 34 timed, 171 counted, 11 top-up, 811 graded, 21 free text; 100 shifted rows, 922 with a bonus.

## Reading the file

- **Decision**: A hand-written splitter: fields are separated by commas, a field that starts with `"` runs to the next `"`. The header must equal the jar header exactly. A row must have 8 fields, a known category, a `DD.MM.YYYY HH:mm` date and decimal amounts, or the file is rejected with its line number.
- **Rationale**: The format is verified: fields 5 and 6 are always quoted and contain no embedded quote. A CSV library would be a new package for a dozen lines (constitution II).
- **Alternatives considered**: A general RFC 4180 parser. Rejected: it accepts files this feature should reject, and adds code nobody needs.

## Dates

- **Decision**: `new Date(year, month - 1, day, hours, minutes)` from the parsed parts; never `Date.parse`. A shifted row is completed at 23:59 of the previous day, built the same way. The effective day is formatted with `DATE_LOCALE_CA`, as every other `date` column is.
- **Rationale**: The statement is Kyiv local time and so is the app; `Date.parse` of a non-ISO string is implementation-defined.

## Row identity

- **Decision**: `jar-<YYYYMMDDHHmm>-<closing balance in kopiykas>`, from the bank time (not the shifted one). The balance is converted from its text (`1234.50` → `123450`) with integer arithmetic. A row's records all carry this id; a pomodoro row of N sessions gives its second and later sessions `-2`, `-3`… suffixes.
- **Rationale**: The pair is unique across all 1,706 rows. A deterministic id makes re-import idempotent with `bulkPut`.
- **Already imported**: before writing, the import looks every id up in all four id-keyed tables (completions, sessions, goals, withdrawals). A row present anywhere is skipped, even if the review now maps it elsewhere, so one jar row never lands in two tables. Daily scores are keyed by day: a score row is already imported when its day has a score whose `createdAt` equals the row's completion time (an imported score is written that way); any other score on that day is the app's own, kept and reported as skipped.

## Classification

- **Decision**: The brief's two-step grammar, verbatim (`ENVELOPE`, then `SCORE`, `POMODORO`, `TIMED`, `COUNTED`, `TOP_UP`, `GRADED`, first match wins). Labels are folded before comparing (whitespace collapsed, lower case, ё→е). Aliases are applied to the label next. Then, per aliased label over the whole statement, a GRADED row is demoted to free text unless the label ever carries a bonus or occurs 3+ times.
- **Rationale**: The probe shows the demotion has to run on aliased labels: "ревью дня" occurs twice and "речью дня" once, and only together are they a habit. Counted per row kind, the result is exactly graded 811 / free 21.

## From rows to tasks and difficulties

- **Base reward**: `paid / (1 + bonus/100)`, rounded. Rows whose rounded base is within ±1 ₴ of another are one tier; the tier's base is the most frequent value.
- **Graded task** (most of its rows have no measurement): one difficulty per level, named as written with the first letter capitalised, "Standard" when there is no level; its base is the most frequent base among that level's rows. Measured rows in a graded task (notes "заметка 3") count as "Standard".
- **Measured task** (most rows have reps or a time):
  1. Tiers are the base clusters with at least two measured rows, accepted largest first, and only while the tiers stay monotone (a higher base has a higher median measurement). This drops one-off prices and mistyped bonuses, which occur as single rows.
  2. The boundary between two neighbouring tiers is the measurement that misfiles the fewest rows; among equally good ones, the roundest (counts: multiples of 100, 50, 10, 5; times: 10 min, 5 min, 1 min, 30 s, 10 s, 5 s).
  3. Names: the lowest tier "<observed min>–<next boundary − 1>", middle tiers "<boundary>–<next boundary − 1>", the top tier "<boundary>+"; a single tier is its observed range. Times read `m:ss`.
  4. Every row is filed by its measurement against the boundaries; a row with no measurement goes to the tier with the nearest base (the lower on a tie).
- **Check against the brief's table** (real file): pull-ups 11–19 → 50, 20–29 → 100, 30+ → 150; Sally up 1:40–2:29 → 50, 2:30–2:59 → 100, 3:00–3:29 → 150, 3:30+ → 200; plank 3:30–3:59 → 50, 4:00+ → 100; autumn pull-ups 10–19 → 75, 20+ → 100. Spring pull-ups come out 11–19 → 75, 20+ → 100, where the brief says 150: the 150 ₴ tier there is a single row, and a single row is not a tier. The base reward of a difficulty only prices future completions, and the task can be edited.
- **Alternatives considered**: One difficulty per distinct base reward. Rejected: noise rows would add buttons such as "77 ₴" to the pull-ups task for every future day.

## Streaks

- **Decision**: After the write, inside the same transaction, read each touched task's completions by the `taskId` index, take the distinct `date`s, and count consecutive days back from the latest. `lastCompletedAt` is the latest `completedAt`.
- **Rationale**: Existing completions count too, so an import that fills a gap joins an app streak. The app's bonus rule (10% per day, capped at 100%) matches the jar's, so `completeTask` carries the streak on from there.

## Non-task rows

- **Scores**: `rewardEarned` is what was paid; `streakAtThisDay` is the run of consecutive days with a score of 9 or more, counting the imported and existing scores together.
- **Pomodoro**: N = the count in the comment, otherwise round(paid ÷ rate) with 100 ₴ work and 125 ₴ study, at least 1. Sessions are 25 minutes, back to back, the last ending at the row's completion time; `rewardEarned` is the paid amount split evenly, the remainder on the last session. No kind means work.
- **Goals**: title = the comment body without markers, original case, whitespace collapsed, cut to `TITLE_MAX_LENGTH`; `rewardValue` = paid; `createdAt` = `completedAt`.
- **Withdrawals**: `Math.round(amount)` (21.40 → 21), title "Jar withdrawal", category `FALLBACK_CATEGORY_ID` (General), no notes, no balance change.

## Writing

- **Decision**: `DbService.transaction('rw', [dailyTasks, dailyTaskCompletions, dailyScores, pomodoroSessions, goals, withdrawals], ...)`, `bulkGet` to find what exists, `bulkPut` to write. `DailyTasksService.completeTask` is not used: it stamps "now" and adds to the balance.
- **Rationale**: One transaction makes a failure leave the data untouched (FR-015). No table gets a new index and no row gets a new field, so no Dexie version is needed.

## The page

- **Decision**: `/settings/jar-import`. A hidden `<input type="file" accept=".csv">` behind a button; `File.text()` reads it. The review list is one signal form over an array of rows (`applyEach`), each with a `mat-select` for the action and, for a daily task, a title field (required, `TITLE_MAX_LENGTH`). "Adds to an existing task" is shown live as the title is edited. After a successful import, a snackbar reports the counts and the app navigates to Tasks.
