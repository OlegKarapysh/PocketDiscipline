// The earnings of one bar: a day, or a calendar week or month cut to the dates the chart covers.
export interface EarningsBucket {
  startDate: string;
  endDate: string;
  totalEarned: number;
  goalsEarned: number;
  dailyTasksEarned: number;
  pomodoroEarned: number;
  dailyScoresEarned: number;
}
