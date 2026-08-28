export interface DailyScore {
  date: string; // Format: YYYY-MM-DD
  score: number; // 1 to 10
  rewardEarned: number;
  streakAtThisDay: number;
  createdAt: number;
}
