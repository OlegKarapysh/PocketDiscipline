import { AnalyticsPeriod } from './analytics-period.type';
import { TrendGranularity } from './trend-granularity.type';
import { CategorySpendingBreakdown } from './category-spending-breakdown.model';
import { SpendingTrendPoint } from './spending-trend-point.model';

export interface SpendingAnalyticsSummary {
  period: AnalyticsPeriod;
  granularity: TrendGranularity;
  totalSpent: number;
  withdrawalCount: number;
  categoryBreakdown: CategorySpendingBreakdown[];
  spendingTrend: SpendingTrendPoint[];
}
