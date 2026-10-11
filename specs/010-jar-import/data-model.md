# Data Model: Import Daily-Task History from a monobank Jar Statement

No table, index or stored field changes, so there is no new Dexie version. The feature adds in-memory models in `features/jar-import/models/` (one per file) and writes existing rows. See [research.md](./research.md) for the rules that fill them.

## In-memory models (`features/jar-import/models/`)

### `JarStatementRow` — one CSV line, read

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `jar-<YYYYMMDDHHmm>-<closing balance in kopiykas>`, from the bank time |
| `line` | `number` | 1-based line in the file, for messages |
| `category` | `JarRowCategory` | `'deposit'` (Разові поповнення) or `'withdrawal'` (Часткове зняття) |
| `completedAt` | `number` | Bank time, or 23:59 of the previous day when shifted |
| `date` | `string` | `YYYY-MM-DD` of `completedAt` |
| `amount` | `number` | As written, may have kopiykas (`21.4`) |
| `reward` | `JarReward \| null` | The classified comment; `null` for a withdrawal |

### `JarReward` — a deposit's comment, classified

| Field | Type | Notes |
|---|---|---|
| `kind` | `JarRewardKind` | `'score' \| 'pomodoro' \| 'timed' \| 'counted' \| 'top-up' \| 'graded' \| 'free'` |
| `text` | `string` | The comment without its markers, whitespace collapsed, original case |
| `label` | `string` | Folded and aliased: the habit, the exercise, or the whole text |
| `level` | `string \| null` | Folded graded level (`легкая полная`), or the alias's own level (`холодная ванна`) |
| `measure` | `number \| null` | Reps, or seconds for a timed row |
| `score` | `number \| null` | 1–10 |
| `engagement` | `EngagementType \| null` | Pomodoro kind; work when unstated |
| `sessions` | `number \| null` | Pomodoro count when stated |
| `bonus` | `number` | Streak bonus in percent, 0 when none |
| `baseReward` | `number` | `round(amount / (1 + bonus/100))` |
| `shifted` | `boolean` | A yesterday marker was present |
| `completed` | `boolean` | A "completed" milestone |

### `JarImportAction`

`'task' | 'score' | 'pomodoro' | 'goal' | 'withdrawal' | 'skip'`

### `JarReviewRow` — one editable line of the review

| Field | Type | Notes |
|---|---|---|
| `key` | `string` | Stable group key: `task:<label>`, `milestone:<label>`, `one-off:<label>`, `score`, `pomodoro:work`, `pomodoro:study`, `top-up`, `withdrawal` |
| `label` | `string` | What the statement says |
| `rowIds` | `string[]` | The statement rows in this group |
| `paid` | `number` | Their total, whole hryvnias |
| `actions` | `JarImportAction[]` | What this group may become |
| `action` | `JarImportAction` | Suggested, then chosen |
| `taskTitle` | `string` | Used when `action` is `'task'`; rows with the same folded title form one task |

Suggested actions: recurring habits and measured exercises → `task` (except "подсчет итогов месяца" → `skip`); milestones and one-offs → `goal`; scores → `score`; pomodoro → `pomodoro`; top-ups → `skip`; withdrawals → `withdrawal`.

### `JarImportSuggestion`

`{ rows: JarReviewRow[]; existingTaskTitles: string[] }` — the titles are folded, so the review can say "adds to an existing task" while a title is edited.

### `JarImportResult`

`{ completions, tasks, scores, sessions, goals, withdrawals, alreadyImported, skipped }`, all counts. `tasks` counts the tasks that received at least one new completion. `alreadyImported` and `skipped` count statement rows.

## Rows written (existing tables, see `docs/schema.md`)

| Table | From | Key | Fields set |
|---|---|---|---|
| `dailyTasks` | `task` groups | UUID (new) or the matched task's id | `title`, `difficulties` (missing ones appended), `createdAt` = earliest imported completion for a new task, `streak`, `lastCompletedAt` |
| `dailyTaskCompletions` | each `task` row | row id | `taskId`, `date`, `difficultyId`, `rewardEarned` = paid, `completedAt` |
| `dailyScores` | each `score` row | `date` | `score`, `rewardEarned` = paid, `streakAtThisDay`, `createdAt` = `completedAt` |
| `pomodoroSessions` | each `pomodoro` row, N sessions | row id, then `-2`… | `durationMinutes` 25, `engagementType`, `startTime`, `endTime`, `status` completed, `rewardEarned` |
| `goals` | each `goal` row | row id | `title`, `rewardValue` = paid, `status` COMPLETED, `completedAt`, `createdAt` |
| `withdrawals` | each `withdrawal` row | row id | `amount` rounded, `title` "Jar withdrawal", `categoryId` General, `date`, `timestamp`, `rewardId` null |
| `users` | — | — | not touched |

## State transitions

```text
idle ──pick file──▶ reading ──ok──▶ reviewing ──Import──▶ importing ──ok──▶ (snackbar, navigate to Tasks)
                       │                  ▲                     │
                       └─error──▶ rejected (pick again)         └─error──▶ reviewing (snackbar; nothing written)
```
