export interface Goal {
  id: string; // UUID
  title: string; // Display name (must be unique among active goals)
  rewardValue: number; // Fixed reward added to money balance upon completion
  status: 'ACTIVE' | 'COMPLETED';
  completedAt: number | null; // Timestamp of completion (milliseconds)
  createdAt: number; // Timestamp of creation (milliseconds)
}
