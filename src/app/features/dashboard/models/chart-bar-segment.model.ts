import type { EarningsSource } from './earnings-source.enum';

export interface ChartBarSegment {
  source: EarningsSource;
  amount: number;
  y: number;
  height: number;
}
