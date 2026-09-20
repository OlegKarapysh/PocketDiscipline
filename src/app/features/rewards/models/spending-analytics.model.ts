import type { AnalyticsPeriod } from './analytics-period.type';
import type { TrendGranularity } from './trend-granularity.type';
import type { CategorySpendingBreakdown } from './category-spending-breakdown.model';
import type { SpendingTrendPoint } from './spending-trend-point.model';

export interface SpendingAnalyticsSummary {
  period: AnalyticsPeriod;
  granularity: TrendGranularity;
  totalSpent: number;
  withdrawalCount: number;
  categoryBreakdown: CategorySpendingBreakdown[];
  spendingTrend: SpendingTrendPoint[];
}
