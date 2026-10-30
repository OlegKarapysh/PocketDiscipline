import type { ChartTone } from './chart-tone.type';

// Shows exactly one of `text` (in mono) or `amount` (as money).
export interface BarChartTooltipRow {
  readonly label: string;
  readonly text?: string;
  readonly amount?: number;
  readonly signedAmount?: boolean;
  // A series dot before the label.
  readonly swatch?: ChartTone;
  readonly emphasis?: boolean;
}
