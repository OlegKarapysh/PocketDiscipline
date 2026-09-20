import type { CategorySpendingBreakdown } from '../../models/category-spending-breakdown.model';

export interface DonutSlice {
  category: CategorySpendingBreakdown;
  dashArray: string;
  dashOffset: number;
}
