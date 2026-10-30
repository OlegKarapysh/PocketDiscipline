import type { BarChartSegment } from './bar-chart-segment.model';
import type { BarChartTooltip } from './bar-chart-tooltip.model';

export interface BarChartBar {
  // Unique within the chart's bars: the period's start date.
  readonly key: string;
  readonly axisLabel: string;
  readonly ariaLabel: string;
  // Stacked bottom to top. None, or all zero, draws the zero bar.
  readonly segments: readonly BarChartSegment[];
  readonly tooltip: BarChartTooltip;
}
