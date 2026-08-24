# Data Model: App Skeleton

This application uses IndexedDB (via Dexie.js) for structured local storage.

## Collections / Tables

### `users` (User Profile & State)

Stores the local user's state, including their virtual money balance. In this MVP, there is typically only one local user profile (id = 1).

| Field | Type | Description |
|-------|------|-------------|
| `id` | number (PK) | Primary Key (auto-incremented or hardcoded to 1 for MVP single-user). |
| `name` | string | User's display name. |
| `balance` | number | The current virtual money balance earned from completed tasks. |
| `createdAt` | number | Timestamp of creation. |
| `updatedAt` | number | Timestamp of last update. |

### `tasks` (Discipline Items)

Stores both daily recurring habits and one-off tasks.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (PK) | UUID for the task. |
| `title` | string | The name or title of the discipline item. |
| `type` | enum | `'HABIT'` or `'ONEOFF'`. |
| `rewardValue` | number | The amount of virtual money awarded upon completion. |
| `isCompleted` | boolean | Current completion status. (For habits, this resets daily). |
| `lastCompletedAt`| number (null) | Timestamp of the last completion (used to determine if a habit needs to be reset today). |
| `createdAt` | number | Timestamp of creation. |

## State Transitions

### Task Completion
1. User marks a `task` as completed.
2. `isCompleted` becomes `true`.
3. `lastCompletedAt` is updated to the current timestamp.
4. The `users` table is updated: `balance = balance + rewardValue`.

### Habit Daily Reset
1. When the app initializes or the day changes.
2. For all tasks where `type === 'HABIT'`:
3. If `lastCompletedAt` is before the start of the current day, `isCompleted` is reset to `false`.
