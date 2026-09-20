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

### Tables

#### `users`
**Primary Key**: `id`  
**Description**: Stores the user profile and their overall balance (virtual currency/reward points).

```typescript
export interface User {
  id: number;           // Always 1 (single user app)
  name: string;
  balance: number;      // The current accumulated reward balance
  createdAt: number;    // timestamp
  updatedAt: number;    // timestamp
}
```

#### `goals`
**Primary Key**: `id`  
**Indexed Properties**: `id`, `status`  
**Description**: Long-term or specific one-off goals with a fixed reward value.

```typescript
export interface Goal {
  id: string;           // UUID
  title: string;        // Display name (unique among active)
  rewardValue: number;  // Fixed reward added to money balance upon completion
  status: 'ACTIVE' | 'COMPLETED';
  completedAt: number | null; // Timestamp of completion
  createdAt: number;    // Timestamp of creation
}
```

#### `dailyTasks`
**Primary Key**: `id`  
**Description**: Recurring daily tasks that users can complete on various difficulty levels to build streaks.

```typescript
export interface DailyTaskDifficulty {
  id: string;
  name: string;
  baseReward: number;
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
  id: string;           // UUID
  taskId: string;       // Reference to DailyTask id
  date: string;         // Format: YYYY-MM-DD
  difficultyId: string; // Reference to DailyTaskDifficulty id
  rewardEarned: number; // Reward earned for this completion
  completedAt: number;  // Timestamp of completion
}
```

#### `dailyScores`
**Primary Key**: `date`  
**Description**: Daily self-assessment score tracking and streak bonuses.

```typescript
export interface DailyScore {
  date: string;           // Format: YYYY-MM-DD
  score: number;          // Rating 1-10
  rewardEarned: number;
  streakAtThisDay: number;
  createdAt: number;      // Timestamp
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
  id: string;               // UUID
  durationMinutes: number;  // 15-120
  engagementType: EngagementType;
  startTime: number;        // timestamp
  endTime?: number;         // timestamp
  status: PomodoroSessionStatus;
  rewardEarned?: number;
}
```

#### `tasks` *(Legacy / Generic Discipline Items)*
**Primary Key**: `id`  
**Indexed Properties**: `id`, `type`, `isCompleted`

```typescript
export interface DisciplineItem {
  id: string;
  title: string;
  type: 'HABIT' | 'ONEOFF';
  rewardValue: number;
  isCompleted: boolean;
  lastCompletedAt: number | null;
  createdAt: number;
}
```

#### `withdrawals` *(Version 8)*
**Primary Key**: `id`  
**Indexed Properties**: `id`, `date`, `categoryId`, `rewardId`, `timestamp`  
**Description**: Financial ledger records tracking money withdrawals/deductions (Quick Spends and claimed rewards).

```typescript
export interface WithdrawalRecord {
  id: string;               // UUID
  amount: number;           // Amount deducted in ₴ (greater than 0)
  title: string;            // Name/title of withdrawal or snapshot of reward title
  categoryId: string;       // Foreign key to RewardCategory id
  notes?: string;           // Optional user notes/description
  date: string;             // Format: YYYY-MM-DD
  timestamp: number;        // Epoch timestamp (ms)
  rewardId?: string | null; // Optional foreign key to RewardItem id if claimed from store
}
```

#### `rewards` *(Version 8)*
**Primary Key**: `id`  
**Indexed Properties**: `id`, `categoryId`, `status`, `type`, `createdAt`  
**Description**: Reward store catalog items defining repeatable or one-time milestone rewards and their costs.

```typescript
export type RewardType = 'repeatable' | 'one-time';
export type RewardStatus = 'active' | 'claimed' | 'archived';

export interface RewardItem {
  id: string;               // UUID
  title: string;            // Reward title/name
  cost: number;             // Cost in ₴ (greater than 0)
  categoryId: string;       // Foreign key to RewardCategory id
  type: RewardType;         // 'repeatable' or 'one-time'
  status: RewardStatus;     // 'active' | 'claimed' | 'archived'
  description?: string;     // Optional details
  icon?: string;            // Material icon name
  claimCount: number;       // Number of times claimed (for repeatable)
  claimedAt?: number | null;// Timestamp of first/milestone claim
  createdAt: number;        // Creation timestamp
  updatedAt: number;        // Last updated timestamp
}
```

#### `rewardCategories` *(Version 8)*
**Primary Key**: `id`  
**Indexed Properties**: `id`, `name`, `isProtected`  
**Description**: Categories for organizing rewards and withdrawals. Includes the protected default fallback category `general` (`General`).

```typescript
export interface RewardCategory {
  id: string;               // UUID or fixed ID ('general')
  name: string;             // Category display name
  color: string;            // Hex color code (e.g. #6b7280)
  icon: string;             // Material icon name
  isDefault: boolean;       // Built-in seed category flag
  isProtected: boolean;     // Protected from deletion flag (true for 'general')
  createdAt: number;        // Creation timestamp
}
```

