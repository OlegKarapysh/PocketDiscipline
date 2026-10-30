import type { BarChartTooltipRow } from './bar-chart-tooltip-row.model';

export interface BarChartTooltip {
  readonly title: string;
  readonly rows: readonly BarChartTooltipRow[];
  // An italic line after the rows, such as "No earnings recorded".
  readonly note?: string;
}
