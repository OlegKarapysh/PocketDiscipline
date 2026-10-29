export interface ScoreBar {
  startDate: string;
  tooltipTitle: string;
  ariaLabel: string;
  axisLabel: string;
  axisLabelX: number;
  // A day's score, or the average of the scored days in a week or month.
  score: number | null;
  scoredDays: number;
  dayCount: number;
  rewardEarned: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isHighScore: boolean;
  shouldShowLabel: boolean;
}
