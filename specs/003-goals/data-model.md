# Phase 1: Data Model

## Goal Entity

The `Goal` entity represents a difficult, non-recurring task with a fixed reward.

```typescript
export interface Goal {
  id: string;              // UUID
  title: string;           // Display name (must be unique among active goals)
  rewardValue: number;     // Fixed reward added to money balance upon completion
  status: 'ACTIVE' | 'COMPLETED';
  completedAt: number | null; // Timestamp of completion (milliseconds)
  createdAt: number;       // Timestamp of creation (milliseconds)
}
```

### Validation Rules
- **Title**: Required, min length 3, max length 100. Must be unique among all goals where `status === 'ACTIVE'`.
- **Reward Value**: Required, positive integer greater than 0, max value 10,000,000 (to prevent extreme overflow).

### State Transitions
- `ACTIVE` → `COMPLETED`: Sets `status` to `COMPLETED`, sets `completedAt` to current timestamp, increments user `money balance` by `rewardValue`.
- `COMPLETED` → `ACTIVE` (Undo): Sets `status` to `ACTIVE`, sets `completedAt` to `null`, decrements user `money balance` by `rewardValue`.

### Dexie Schema
We will add the `goals` table to `db.service.ts`:
```typescript
this.version(1).stores({
  users: 'id',
  tasks: 'id, type, isCompleted',
  goals: 'id, status' // Indexed by status for quick Active/Completed separation
});
```
