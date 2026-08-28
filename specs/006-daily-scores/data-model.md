# Data Model: daily-scores

## Entities

### `DailyScore`
- **Primary Key**: `date` (format: `YYYY-MM-DD`)
- **Properties**:
  - `date: string` - The calendar date for the score.
  - `score: number` - The user's score from 1 to 10.
  - `rewardEarned: number` - The calculated reward value (base + streak bonus).
  - `streakAtThisDay: number` - The count of consecutive high-score (9 or 10) days up to and including this date.
  - `createdAt: number` - Timestamp of when the score was set.

## Database Integration

The `DailyScore` entity will be stored in a new Dexie table `dailyScores` within the `pocket-discipline-db` (`DbService`).

```typescript
export interface DailyScore {
  date: string;
  score: number;
  rewardEarned: number;
  streakAtThisDay: number;
  createdAt: number;
}
```

## State Transitions
- **Initial State**: No score set for the current date.
- **Score Submitted**: User selects a score (1-10). The system determines the reward based on the score and the previous day's streak. The score is saved, the reward is immediately credited to the user's `balance`, and the record becomes read-only for that day.
