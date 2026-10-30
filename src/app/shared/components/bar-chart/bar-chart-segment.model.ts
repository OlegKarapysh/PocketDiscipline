import type { ChartTone } from './chart-tone.type';

export interface BarChartSegment {
  // At least 0, in the scale's unit.
  readonly value: number;
  readonly tone: ChartTone;
}
