import { Component, computed, input, signal } from '@angular/core';

import type { SpendingTrendPoint } from '../../models/spending-trend-point.model';
import type { TrendGranularity } from '../../models/trend-granularity.type';
import { Amount } from '../../../../shared/components/amount/amount';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import { AXIS_CHAR_WIDTH } from '../../../../shared/constants/chart-axis.const';
import { ObserveWidth } from '../../../../shared/directives/observe-width';
import type { RenderedBar } from './rendered-bar.model';

// The chart is drawn at its container's measured width, one user unit per CSS pixel; this is the
// width it assumes until that first measurement arrives.
const INITIAL_WIDTH = 600;
const SVG_HEIGHT = 200;
const MARGIN_TOP = 20;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 40;
const AXIS_LABEL_GAP = 8;

@Component({
  selector: 'app-spending-trend-chart',
  templateUrl: './spending-trend-chart.html',
  styleUrl: './spending-trend-chart.scss',
  imports: [Amount, ObserveWidth],
})
export class SpendingTrendChart {
  readonly data = input<SpendingTrendPoint[]>([]);
  readonly granularity = input<TrendGranularity>('daily');
  readonly hoveredPoint = signal<SpendingTrendPoint | null>(null);

  readonly width = signal(INITIAL_WIDTH);
  readonly viewBox = computed(() => `0 0 ${this.width()} ${SVG_HEIGHT}`);
  readonly marginTop = MARGIN_TOP;
  readonly plotHeight = SVG_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  readonly maxAmount = computed(() => {
    const points = this.data();
    if (points.length === 0) return 100;
    const max = Math.max(...points.map((p) => p.amount));
    return max > 0 ? Math.ceil(max * 1.15) : 100;
  });

  readonly gridLines = computed(() => {
    const max = this.maxAmount();
    const half = Math.round(max / 2);
    return [
      { y: MARGIN_TOP, label: `${MONEY_FORMAT.format(max)} ₴` },
      { y: MARGIN_TOP + this.plotHeight / 2, label: `${MONEY_FORMAT.format(half)} ₴` },
      { y: MARGIN_TOP + this.plotHeight, label: `${MONEY_FORMAT.format(0)} ₴` },
    ];
  });

  // Wide enough for the longest y-axis label, so a large amount is never clipped.
  readonly marginLeft = computed(() => {
    const longest = Math.max(...this.gridLines().map((line) => line.label.length));
    return Math.ceil(longest * AXIS_CHAR_WIDTH) + AXIS_LABEL_GAP;
  });
  readonly yAxisTextX = computed(() => this.marginLeft() - AXIS_LABEL_GAP);
  readonly plotWidth = computed(() => this.width() - this.marginLeft() - MARGIN_RIGHT);

  readonly bars = computed<RenderedBar[]>(() => {
    const points = this.data();
    if (points.length === 0) return [];

    const marginLeft = this.marginLeft();
    const slotWidth = this.plotWidth() / points.length;
    const barWidth = Math.max(4, Math.min(slotWidth * 0.7, 32));
    const max = this.maxAmount();

    // About six labels on a long range, and fewer when the chart is too narrow for them to fit.
    const labelSpacing = Math.max(...points.map((p) => p.label.length)) * AXIS_CHAR_WIDTH + AXIS_LABEL_GAP;
    const step = Math.max(points.length > 12 ? Math.ceil(points.length / 6) : 1, Math.ceil(labelSpacing / slotWidth));
    const lastIndex = points.length - 1;

    return points.map((point, index) => {
      const barHeight = point.amount > 0 ? (point.amount / max) * this.plotHeight : 2;
      const x = marginLeft + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = MARGIN_TOP + (this.plotHeight - barHeight);
      const showLabel = index === lastIndex || (index % step === 0 && lastIndex - index >= step);

      return {
        point,
        x,
        y,
        width: barWidth,
        height: barHeight,
        showLabel,
      };
    });
  });

  setHovered(point: SpendingTrendPoint | null): void {
    this.hoveredPoint.set(point);
  }
}
