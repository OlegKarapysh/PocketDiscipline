import { Component, computed, input, signal } from '@angular/core';

import type { SpendingTrendPoint } from '../../models/spending-trend-point.model';
import type { TrendGranularity } from '../../models/trend-granularity.type';

const SVG_WIDTH = 600;
const SVG_HEIGHT = 200;
const MARGIN_TOP = 20;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 40;
const MARGIN_LEFT = 50;

import type { RenderedBar } from './rendered-bar.model';

@Component({
  selector: 'app-spending-trend-chart',
  templateUrl: './spending-trend-chart.html',
  styleUrl: './spending-trend-chart.scss',
  imports: [],
})
export class SpendingTrendChart {
  readonly data = input<SpendingTrendPoint[]>([]);
  readonly granularity = input<TrendGranularity>('daily');
  readonly hoveredPoint = signal<SpendingTrendPoint | null>(null);

  readonly svgWidth = SVG_WIDTH;
  readonly svgHeight = SVG_HEIGHT;
  readonly marginLeft = MARGIN_LEFT;
  readonly marginTop = MARGIN_TOP;
  readonly plotWidth = SVG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
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
      { y: MARGIN_TOP, value: max },
      { y: MARGIN_TOP + this.plotHeight / 2, value: half },
      { y: MARGIN_TOP + this.plotHeight, value: 0 },
    ];
  });

  readonly bars = computed<RenderedBar[]>(() => {
    const points = this.data();
    if (points.length === 0) return [];

    const slotWidth = this.plotWidth / points.length;
    const barWidth = Math.max(4, Math.min(slotWidth * 0.7, 32));
    const max = this.maxAmount();
    const step = points.length > 12 ? Math.ceil(points.length / 6) : 1;

    return points.map((point, index) => {
      const barHeight = point.amount > 0 ? (point.amount / max) * this.plotHeight : 2;
      const x = MARGIN_LEFT + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = MARGIN_TOP + (this.plotHeight - barHeight);
      const isLast = index === points.length - 1;
      const showLabel = index % step === 0 || isLast;

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
