export interface MonthlyEarningsSummary {
  year: number;
  month: number;
  monthLabel: string;
  totalEarned: number;
  daysCount: number;
  averageEarnedPerDay: number;
  isCurrentMonth: boolean;
}
