export interface BarChartScale {
  // The top of the y-axis, above 0.
  readonly max: number;
  // At least two, evenly spaced from 0 at the baseline to `max` at the top.
  readonly tickLabels: readonly string[];
}
