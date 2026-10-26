export interface ChartDayData {
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  score: number | null;
  rewardEarned: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isHighScore: boolean;
  shouldShowLabel: boolean;
}
