import type { ChartGranularity } from './chart-granularity.type';
import type { ChartPeriod } from './chart-period.model';

export interface ChartPeriodGrouping<T> {
  granularity: ChartGranularity;
  periods: ChartPeriod<T>[];
}
