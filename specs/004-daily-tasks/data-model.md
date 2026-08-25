# Data Model: Daily Tasks

## `DailyTask` Entity

This entity represents the configuration and current state of a user's recurring daily habit.

```typescript
export interface DailyTaskDifficulty {
  id: string; // e.g. 'easy', 'medium', 'hard'
  name: string; // Display name
  baseReward: number; // The reward before streak bonuses
}

export interface DailyTask {
  id: string; // UUID
  title: string;
  createdAt: number; // Unix timestamp
  
  // Configuration
  difficulties: DailyTaskDifficulty[];
  
  // State
  streak: number; // Current consecutive days completed
  lastCompletedAt: number | null; // Unix timestamp of the last completion
}
```

### Validation Rules
- `title` must be a non-empty string.
- `difficulties` must contain at least one difficulty level.
- `baseReward` must be a positive integer.
- `streak` cannot be less than 0.

### State Transitions / Logic
- **Resetting Streak**: When the app is loaded or a task is viewed, if the current local date is strictly greater than `lastCompletedAt + 1 day` (i.e. yesterday was missed), `streak` must be set to `0`.
- **Completing Task**: 
  - Ensure the task hasn't already been completed *today* (based on local timezone dates).
  - Check if `lastCompletedAt` was *yesterday*. If yes, increment `streak`. If earlier, `streak = 1` (since today is the first day of the new streak). If `lastCompletedAt` is null, `streak = 1`.
  - Calculate `reward = baseReward * (1 + min(streak - 1, 10) * 0.10)`. (Note: a streak of 1 gives a 0% bonus; a streak of 11+ gives a 100% bonus).
  - Update user's balance with the calculated reward.
  - Update `lastCompletedAt` to the current timestamp.
