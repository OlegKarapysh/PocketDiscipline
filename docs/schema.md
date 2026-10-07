# Pocket Discipline - Database Schema

The application uses **Dexie.js** (IndexedDB wrapper) for local storage.

All application data is consolidated in a single database:

- **`pocket-discipline-db`** (`DbService`) - Main application database

---

## Database (`pocket-discipline-db`)

Defined in: `src/app/database/db.service.ts` — the persistence composition root. It sits outside
`core/` deliberately: the Dexie schema is version-ordered and cannot be split across feature
folders, so this one file is allowed to know every slice. The row interfaces below live in
`src/app/core/models/`.

**The database name and every existing `version(N).stores({...})` block are load-bearing.** Changing
either discards existing users' IndexedDB data. Add a new version; never edit an old one.

The current version is **9**. IndexedDB itself reports ten times that, 90: Dexie multiplies its
version numbers by 10.

### Money

Every money field is an **integer number of whole hryvnias**: there are no kopiykas anywhere in the
app, so sums and differences are exact. Up to version 8 nothing stopped a fraction from being stored
(a reward cost of 12.50 ₴, a balance that drifted to 0.09999999999999432 ₴). The version 9 upgrade
(`database/money-rounding-migration.service.ts`) rounds every existing money value with `Math.round`,
including each `dailyTasks.difficulties[].baseReward`, and leaves a value that is not a number as it
is. The legacy `PomodoroDatabase` import, which runs on `ready` after the upgrade, rounds its rewards
the same way as it copies them.

What is stored is what is shown: `MONEY_FORMAT` (`shared/constants/money-format.const.ts`), which
`<app-amount>` and the `money` pipe use, shows no decimals. Every calculation that can produce a
fraction (the streak bonuses, the daily score bonus, the pomodoro tiers, averages and chart axes)
rounds to whole hryvnias where it is computed. Money inputs follow one rule, `moneyAmount()` in
`shared/validators/money-amount.ts`: required, a whole number, from 1 ₴ to 10 000 000 ₴; a form can
add a lower maximum of its own (quick spend's balance). `WithdrawalService`, `RewardsService`,
`GoalService` and `DailyTasksService` also reject a non-integer amount, so a caller outside the forms
cannot store one.

The money fields are `users.balance`, `goals.rewardValue`, `tasks.rewardValue`,
`dailyTasks.difficulties[].baseReward`, `dailyTaskCompletions.rewardEarned`,
`dailyScores.rewardEarned`, `pomodoroSessions.rewardEarned`, `withdrawals.amount` and `rewards.cost`.
A new money field is stored in whole hryvnias too.

### Tables

#### `users`

**Primary Key**: `id`  
**Description**: Stores the user profile and their overall balance (virtual currency/reward points).

```typescript
export interface User {
  id: number; // Always 1 (single user app)
  name: string;
  balance: number; // Whole hryvnias. The current accumulated reward balance
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}
```

#### `goals`

**Primary Key**: `id`  
**Indexed Properties**: `id`, `status`  
**Description**: Long-term or specific one-off goals with a fixed reward value.

```typescript
export interface Goal {
  id: string; // UUID
  title: string; // Display name (unique among active)
  rewardValue: number; // Whole hryvnias. Fixed reward added to money balance upon completion
  status: 'ACTIVE' | 'COMPLETED';
  completedAt: number | null; // Timestamp of completion
  createdAt: number; // Timestamp of creation
}
```

#### `dailyTasks`

**Primary Key**: `id`  
**Description**: Recurring daily tasks that users can complete on various difficulty levels to build streaks.

```typescript
export interface DailyTaskDifficulty {
  id: string;
  name: string;
  baseReward: number; // Whole hryvnias, before the streak bonus
}

export interface DailyTask {
  id: string;
  title: string;
  createdAt: number;
  difficulties: DailyTaskDifficulty[];
  streak: number;
  lastCompletedAt: number | null;
}
```

#### `dailyTaskCompletions`

**Primary Key**: `id`  
**Indexed Properties**: `id`, `date`, `taskId`  
**Description**: Historical log of completed daily tasks across calendar dates, recording difficulty level and reward earned.

```typescript
export interface DailyTaskCompletion {
  id: string; // UUID
  taskId: string; // Reference to DailyTask id
  date: string; // Format: YYYY-MM-DD
  difficultyId: string; // Reference to DailyTaskDifficulty id
  rewardEarned: number; // Whole hryvnias. Reward earned for this completion
  completedAt: number; // Timestamp of completion
}
```

#### `dailyScores`

**Primary Key**: `date`  
**Description**: Daily self-assessment score tracking and streak bonuses.

```typescript
export interface DailyScore {
  date: string; // Format: YYYY-MM-DD
  score: number; // Rating 1-10
  rewardEarned: number; // Whole hryvnias
  streakAtThisDay: number;
  createdAt: number; // Timestamp
}
```

#### `pomodoroSessions`

**Primary Key**: `id`  
**Indexed Properties**: `id`, `startTime`, `status`  
**Description**: Tracks Pomodoro focus sessions, duration, engagement type, completion status, and rewards earned.

```typescript
export type PomodoroSessionStatus = 'active' | 'completed' | 'cancelled';
export type EngagementType = 'work' | 'study';

export interface PomodoroSession {
  id: string; // UUID
  durationMinutes: number; // 15-120
  engagementType: EngagementType;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  status: PomodoroSessionStatus;
  rewardEarned?: number; // Whole hryvnias; absent unless completed
}
```

#### `tasks` _(Legacy / Generic Discipline Items)_

**Primary Key**: `id`  
**Indexed Properties**: `id`, `type`, `isCompleted`

```typescript
export interface DisciplineItem {
  id: string;
  title: string;
  type: 'HABIT' | 'ONEOFF';
  rewardValue: number; // Whole hryvnias
  isCompleted: boolean;
  lastCompletedAt: number | null;
  createdAt: number;
}
```

#### `withdrawals` _(Version 8)_

**Primary Key**: `id`  
**Indexed Properties**: `id`, `date`, `categoryId`, `rewardId`, `timestamp`  
**Description**: Financial ledger records tracking money withdrawals/deductions (Quick Spends and claimed rewards).

```typescript
export interface WithdrawalRecord {
  id: string; // UUID
  amount: number; // Whole hryvnias deducted (1 or more)
  title: string; // Name/title of withdrawal or snapshot of reward title
  categoryId: string; // Foreign key to RewardCategory id
  notes?: string; // Optional user notes/description
  date: string; // Format: YYYY-MM-DD
  timestamp: number; // Epoch timestamp (ms)
  rewardId?: string | null; // Optional foreign key to RewardItem id if claimed from store
}
```

#### `rewards` _(Version 8)_

**Primary Key**: `id`  
**Indexed Properties**: `id`, `categoryId`, `status`, `type`, `createdAt`  
**Description**: Reward store catalog items defining repeatable or one-time milestone rewards and their costs.

```typescript
export type RewardType = 'repeatable' | 'one-time';
export type RewardStatus = 'active' | 'claimed' | 'archived';

export interface RewardItem {
  id: string; // UUID
  title: string; // Reward title/name
  cost: number; // Whole hryvnias (1 or more)
  categoryId: string; // Foreign key to RewardCategory id
  type: RewardType; // 'repeatable' or 'one-time'
  status: RewardStatus; // 'active' | 'claimed' | 'archived'
  description?: string; // Optional details
  icon?: string; // Material icon name
  claimCount: number; // Number of times claimed (for repeatable)
  claimedAt?: number | null; // Timestamp of first/milestone claim
  createdAt: number; // Creation timestamp
  updatedAt: number; // Last updated timestamp
}
```

#### `rewardCategories` _(Version 8)_

**Primary Key**: `id`  
**Indexed Properties**: `id`, `name`, `isProtected`  
**Description**: Categories for organizing rewards and withdrawals. Includes the protected default fallback category `general` (`General`).

```typescript
export interface RewardCategory {
  id: string; // UUID or fixed ID ('general')
  name: string; // Category display name
  color: string; // Hex color code (e.g. #6b7280)
  icon: string; // Material icon name
  isDefault: boolean; // Built-in seed category flag
  isProtected: boolean; // Protected from deletion flag (true for 'general')
  createdAt: number; // Creation timestamp
}
```
