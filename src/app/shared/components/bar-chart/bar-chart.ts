import { Component, computed, input, signal } from '@angular/core';
import { Amount } from '../amount/amount';
import { AXIS_CHAR_WIDTH } from '../../constants/chart-axis.const';
import { FloatAt } from '../../directives/float-at';
import { ObserveWidth } from '../../directives/observe-width';
import type { ChartGridLine } from '../../models/chart-grid-line.model';
import type { TooltipPosition } from '../../models/tooltip-position.model';
import type { BarChartBar } from './bar-chart-bar.model';
import type { BarChartLegendItem } from './bar-chart-legend-item.model';
import type { BarChartScale } from './bar-chart-scale.model';

// The chart is drawn at its container's measured width, one user unit per CSS pixel; this is the
// width it assumes until that first measurement arrives.
const INITIAL_WIDTH = 600;
const VIEWBOX_HEIGHT = 260;
const Y_AXIS_LABEL_GAP = 5;
// Space kept between neighbouring x-axis labels, so they never collide on a narrow screen.
const X_LABEL_GAP = 9;

// Draws bars that its consumer has already aggregated: the consumer chooses the scale and writes
// every label and tooltip, and frames the chart in its own card.
@Component({
  selector: 'app-bar-chart',
  imports: [Amount, FloatAt, ObserveWidth],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
})
export class BarChart {
  readonly bars = input.required<readonly BarChartBar[]>();
  readonly scale = input.required<BarChartScale>();
  readonly ariaLabel = input.required<string>();
  readonly legend = input<readonly BarChartLegendItem[]>([]);

  private readonly openKey = signal<string | null>(null);
  readonly tooltipAnchor = signal<TooltipPosition>({ x: 0, y: 0 });
  readonly tooltip = computed(() => this.bars().find((bar) => bar.key === this.openKey())?.tooltip ?? null);

  readonly width = signal(INITIAL_WIDTH);
  readonly viewBox = computed(() => `0 0 ${this.width()} ${VIEWBOX_HEIGHT}`);

  readonly chartBaselineY = VIEWBOX_HEIGHT - 35;
  readonly chartTopY = 20;
  readonly chartHeight = this.chartBaselineY - this.chartTopY;
  readonly chartRightX = computed(() => this.width() - 15);
  readonly axisLabelYOffset = 4;
  readonly axisLabelYPos = this.chartBaselineY + 20;
  readonly zeroBarHeight = 2;
  readonly zeroBarY = this.chartBaselineY - this.zeroBarHeight;

  readonly gridLines = computed<ChartGridLine[]>(() => {
    const labels = this.scale().tickLabels;
    const divisions = labels.length - 1;
    return labels.map((label, i) => ({ y: this.chartBaselineY - (this.chartHeight / divisions) * i, label }));
  });

  // The plot starts after the widest y-axis label, so a six-digit total is never clipped.
  readonly chartLeftX = computed(() => {
    const longest = Math.max(...this.scale().tickLabels.map((label) => label.length));
    return Math.ceil(longest * AXIS_CHAR_WIDTH) + Y_AXIS_LABEL_GAP;
  });
  readonly yAxisTextX = computed(() => this.chartLeftX() - Y_AXIS_LABEL_GAP);

  readonly plottedBars = computed(() => {
    const bars = this.bars();
    const totalBars = bars.length;
    if (totalBars === 0) {
      return [];
    }

    const longestLabel = Math.max(...bars.map((bar) => bar.axisLabel.length));
    const max = this.scale().max;
    const chartLeftX = this.chartLeftX();
    const slotWidth = (this.chartRightX() - chartLeftX) / totalBars;
    const barWidth = Math.max(slotWidth * 0.65, 4);
    const gap = (slotWidth - barWidth) / 2;

    // Thin the x-axis labels as the range grows: every bar, every 2nd, every 5th, then about 7 in all.
    // A narrow chart thins them further, so neighbouring labels never overlap.
    let labelInterval = 1;
    if (totalBars > 31) {
      labelInterval = Math.ceil(totalBars / 7);
    } else if (totalBars > 16) {
      labelInterval = 5;
    } else if (totalBars > 10) {
      labelInterval = 2;
    }
    const labelSpacing = longestLabel * AXIS_CHAR_WIDTH + X_LABEL_GAP;
    labelInterval = Math.max(labelInterval, Math.ceil(labelSpacing / slotWidth));
    const lastIndex = totalBars - 1;
    // A label is centred under its bar, but never so close to an edge that part of it is cut off.
    const labelHalfWidth = (longestLabel * AXIS_CHAR_WIDTH) / 2;
    const maxLabelX = this.width() - labelHalfWidth;

    return bars.map((bar, index) => {
      const x = chartLeftX + index * slotWidth + gap;
      let top = this.chartBaselineY;
      const segments = bar.segments
        .filter((segment) => segment.value > 0)
        .map((segment) => {
          const height = (segment.value / max) * this.chartHeight;
          top -= height;
          return { tone: segment.tone, y: top, height };
        });

      return {
        key: bar.key,
        ariaLabel: bar.ariaLabel,
        axisLabel: bar.axisLabel,
        axisLabelX: Math.min(Math.max(x + barWidth / 2, labelHalfWidth), maxLabelX),
        showLabel:
          index === 0 || index === lastIndex || (index % labelInterval === 0 && lastIndex - index >= labelInterval),
        x,
        width: barWidth,
        segments,
      };
    });
  });

  // A tap also enters and focuses the bar on its way to the click. So hover opens the tooltip only for
  // a mouse and focus only for the keyboard, and a tap or a click toggles it.
  onBarPointerEnter(key: string, event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.showTooltip(key, event);
    }
  }

  onBarPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && this.openKey() !== null) {
      this.anchorTooltipAtPointer(event);
    }
  }

  onBarPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.openKey.set(null);
    }
  }

  onBarClick(key: string, event: MouseEvent): void {
    if (this.openKey() === key) {
      this.openKey.set(null);
    } else {
      this.showTooltip(key, event);
    }
  }

  onBarFocus(key: string, event: FocusEvent): void {
    const target = event.currentTarget;
    if (target instanceof Element && target.matches(':focus-visible')) {
      const rect = target.getBoundingClientRect();
      this.openKey.set(key);
      this.tooltipAnchor.set({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }

  onBarBlur(key: string): void {
    if (this.openKey() === key) {
      this.openKey.set(null);
    }
  }

  private showTooltip(key: string, event: MouseEvent): void {
    this.openKey.set(key);
    this.anchorTooltipAtPointer(event);
  }

  private anchorTooltipAtPointer(event: MouseEvent): void {
    this.tooltipAnchor.set({ x: event.clientX, y: event.clientY });
  }
}
