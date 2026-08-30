# Pocket Discipline - Database Schema

The application uses **Dexie.js** (IndexedDB wrapper) for local storage.

All application data is consolidated in a single database:
- **`pocket-discipline-db`** (`DbService`) - Main application database

---

## Database (`pocket-discipline-db`)
Defined in: `src/app/core/services/db.service.ts`

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
