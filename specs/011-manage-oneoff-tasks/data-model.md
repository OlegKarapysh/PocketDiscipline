# Data Model: Manage One-Off Tasks

No Dexie table, index, or version changes are required (`pocket-discipline-db` remains at version 11). One-off tasks continue to use the `tasks` table (`DisciplineItem` in `src/app/core/models/discipline-item.model.ts`).

## Stored Entity (`src/app/core/models/`)

### `DisciplineItem` (`tasks` table)

| Field | Type | Constraints / Notes |
|---|---|---|
| `id` | `string` | Primary key (`crypto.randomUUID()`) |
| `title` | `string` | Trimmed non-empty string, `1..120` characters (`TITLE_MAX_LENGTH`) |
| `type` | `DisciplineItemType` | Always set to `DisciplineItemType.ONEOFF` for created tasks; not shown in UI |
| `rewardValue` | `number` | Safe integer in whole hryvnias, `1..10_000_000` (`moneyAmount()`) |
| `isCompleted` | `boolean` | `false` when pending, `true` when completed |
| `lastCompletedAt` | `number \| null` | Epoch ms timestamp when completed; `null` when pending |
| `createdAt` | `number` | Epoch ms timestamp when created |

**Sorting**:
- Pending tasks (`!isCompleted`): ordered by `createdAt` descending (newest first), tie-broken by `title.localeCompare`.
- Completed tasks (`isCompleted`): ordered by `lastCompletedAt` descending (most recently completed first), tie-broken by `createdAt` descending.

## Feature Models (`src/app/features/tasks/models/`)

### `TaskDraft` (`task-draft.model.ts`)

Emitted by `TaskForm` when the user submits a valid new or edited one-off task:

| Field | Type | Validation |
|---|---|---|
| `title` | `string` | Required after `.trim()`, max length `TITLE_MAX_LENGTH` (`120`) |
| `rewardValue` | `number` | Validated by `moneyAmount()` (`1..10_000_000`, whole integer hryvnias) |

## State Transitions

```text
[Created] ──► Pending (isCompleted: false, lastCompletedAt: null)
                 │  ▲
                 │  ├── Edit (updates title, rewardValue; balance unchanged)
                 │  └── Delete (removes row after confirm; balance unchanged)
                 │
           Complete (+rewardValue to User.balance)
                 │
                 ▼
             Completed (isCompleted: true, lastCompletedAt: Date.now())
                 │
             Undo (-rewardValue from User.balance)
                 │
                 └──► Pending (isCompleted: false, lastCompletedAt: null)
```
