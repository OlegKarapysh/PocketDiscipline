import { Component, computed, input, signal } from '@angular/core';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { Amount } from '../../../../shared/components/amount/amount';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import type { DailyEarningsRecord } from '../../models/daily-earnings-record.model';
import type { EarningsBucket } from '../../models/earnings-bucket.model';
import type { ChartBar } from '../../models/chart-bar.model';
import type { ChartBarSegment } from '../../models/chart-bar-segment.model';
import type { ChartGridLine } from '../../models/chart-grid-line.model';
import type { TooltipPosition } from '../../models/tooltip-position.model';
import { EarningsSource } from '../../models/earnings-source.enum';
import { ObserveWidth } from '../../../../shared/directives/observe-width';
import { AXIS_CHAR_WIDTH } from '../../../../shared/constants/chart-axis.const';
import {
  formatPeriodAxisLabel,
  formatPeriodRange,
  groupByCalendarPeriod,
} from '../../../../shared/charts/chart-periods';
import type { ChartGranularity } from '../../../../shared/models/chart-granularity.type';
import type { ChartPeriod } from '../../../../shared/models/chart-period.model';

// The chart is drawn at its container's measured width, one user unit per CSS pixel; this is the
// width it assumes until that first measurement arrives.
const INITIAL_WIDTH = 600;
const VIEWBOX_HEIGHT = 260;
const Y_AXIS_LABEL_GAP = 5;
// Space kept between neighbouring x-axis labels, so they never collide on a narrow screen.
const X_LABEL_GAP = 9;
// The y-axis tops out at the next multiple of this, and never below it.
const Y_SCALE_STEP = 500;
const GRID_DIVISION_COUNT = 4;

// Declaration order is stacking order, bottom to top.
const SOURCE_LABELS: Record<EarningsSource, string> = {
  [EarningsSource.GOALS]: 'Goals',
  [EarningsSource.DAILY_TASKS]: 'Daily tasks',
  [EarningsSource.POMODORO]: 'Pomodoro',
  [EarningsSource.DAILY_SCORES]: 'Daily scores',
};

const SOURCE_AMOUNT: Record<EarningsSource, (bucket: EarningsBucket) => number> = {
  [EarningsSource.GOALS]: (bucket) => bucket.goalsEarned,
  [EarningsSource.DAILY_TASKS]: (bucket) => bucket.dailyTasksEarned,
  [EarningsSource.POMODORO]: (bucket) => bucket.pomodoroEarned,
  [EarningsSource.DAILY_SCORES]: (bucket) => bucket.dailyScoresEarned,
};

const HEADINGS: Record<ChartGranularity, string> = {
  day: 'Daily earnings',
  week: 'Weekly earnings',
  month: 'Monthly earnings',
};

const SOURCES = Object.values(EarningsSource);

@Component({
  selector: 'app-earnings-chart',
  imports: [SectionCard, Amount, MoneyPipe, ObserveWidth],
  templateUrl: './earnings-chart.html',
  styleUrl: './earnings-chart.scss',
})
export class EarningsChart {
  readonly records = input<DailyEarningsRecord[]>([]);

  readonly hoveredBucket = signal<EarningsBucket | null>(null);
  readonly tooltipPosition = signal<TooltipPosition | null>(null);

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

  readonly legendItems = SOURCES.map((source) => ({ source, label: SOURCE_LABELS[source] }));

  private readonly grouping = computed(() => groupByCalendarPeriod(this.records(), (record) => record.date));
  private readonly buckets = computed(() => this.grouping().periods.map((period) => this.toBucket(period)));
  readonly heading = computed(() => HEADINGS[this.grouping().granularity]);

  readonly maxBarTotal = computed(() => {
    const maxVal = this.buckets().reduce((max, bucket) => Math.max(max, bucket.totalEarned), 0);
    return Math.max(Y_SCALE_STEP, Math.ceil(maxVal / Y_SCALE_STEP) * Y_SCALE_STEP);
  });

  readonly gridLines = computed<ChartGridLine[]>(() => {
    const max = this.maxBarTotal();
    const lines: ChartGridLine[] = [];

    for (let i = 0; i <= GRID_DIVISION_COUNT; i++) {
      const value = Math.round((max / GRID_DIVISION_COUNT) * i);
      const y = this.chartBaselineY - (this.chartHeight / GRID_DIVISION_COUNT) * i;
      lines.push({ y, label: MONEY_FORMAT.format(value) });
    }
    return lines;
  });

  // The plot starts after the widest y-axis label, so a six-digit day total is never clipped.
  readonly chartLeftX = computed(() => {
    const longest = Math.max(...this.gridLines().map((line) => line.label.length));
    return Math.ceil(longest * AXIS_CHAR_WIDTH) + Y_AXIS_LABEL_GAP;
  });
  readonly yAxisTextX = computed(() => this.chartLeftX() - Y_AXIS_LABEL_GAP);

  readonly bars = computed<ChartBar[]>(() => {
    const { granularity } = this.grouping();
    const buckets = this.buckets();
    const totalBars = buckets.length;
    if (totalBars === 0) {
      return [];
    }

    const axisLabels = buckets.map((bucket) => formatPeriodAxisLabel(bucket.startDate, granularity));
    const longestLabel = Math.max(...axisLabels.map((label) => label.length));
    const max = this.maxBarTotal();
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

    return buckets.map((bucket, index) => {
      const x = chartLeftX + index * slotWidth + gap;
      const segments: ChartBarSegment[] = [];
      let currentY = this.chartBaselineY;

      for (const source of SOURCES) {
        const amount = SOURCE_AMOUNT[source](bucket);
        if (amount > 0) {
          const height = (amount / max) * this.chartHeight;
          currentY -= height;
          segments.push({ source, amount, y: currentY, height });
        }
      }

      return {
        period: formatPeriodRange(bucket),
        axisLabel: axisLabels[index],
        axisLabelX: Math.min(Math.max(x + barWidth / 2, labelHalfWidth), maxLabelX),
        total: bucket.totalEarned,
        x,
        width: barWidth,
        segments,
        bucket,
        shouldShowLabel:
          index === 0 || index === lastIndex || (index % labelInterval === 0 && lastIndex - index >= labelInterval),
      };
    });
  });

  readonly hoveredPeriod = computed(() => {
    const bucket = this.hoveredBucket();
    return bucket ? formatPeriodRange(bucket) : '';
  });

  readonly tooltipBreakdown = computed(() => {
    const bucket = this.hoveredBucket();
    if (!bucket) {
      return [];
    }
    return SOURCES.map((source) => ({
      source,
      label: SOURCE_LABELS[source],
      amount: SOURCE_AMOUNT[source](bucket),
    })).filter((row) => row.amount > 0);
  });

  onBarMouseEnter(bucket: EarningsBucket, event: MouseEvent): void {
    this.hoveredBucket.set(bucket);
    this.placeTooltipAtPointer(event);
  }

  onBarMouseMove(event: MouseEvent): void {
    if (this.hoveredBucket()) {
      this.placeTooltipAtPointer(event);
    }
  }

  onBarMouseLeave(): void {
    this.hoveredBucket.set(null);
    this.tooltipPosition.set(null);
  }

  onBarClick(bucket: EarningsBucket, event: MouseEvent): void {
    if (this.hoveredBucket()?.startDate === bucket.startDate) {
      this.onBarMouseLeave();
    } else {
      this.onBarMouseEnter(bucket, event);
    }
  }

  onBarFocus(bucket: EarningsBucket, event: FocusEvent): void {
    const target = event.currentTarget instanceof Element ? event.currentTarget : null;
    const rect = target?.getBoundingClientRect();
    this.hoveredBucket.set(bucket);
    this.tooltipPosition.set({
      x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
      y: (rect?.top ?? 0) - 15,
    });
  }

  onBarBlur(): void {
    this.onBarMouseLeave();
  }

  private placeTooltipAtPointer(event: MouseEvent): void {
    this.tooltipPosition.set({ x: event.clientX + 10, y: event.clientY + 15 });
  }

  private toBucket({ startDate, endDate, items }: ChartPeriod<DailyEarningsRecord>): EarningsBucket {
    const sum = (amount: (record: DailyEarningsRecord) => number) =>
      items.reduce((total, record) => total + amount(record), 0);
    return {
      startDate,
      endDate,
      totalEarned: sum((record) => record.totalEarned),
      goalsEarned: sum((record) => record.goalsEarned),
      dailyTasksEarned: sum((record) => record.dailyTasksEarned),
      pomodoroEarned: sum((record) => record.pomodoroEarned),
      dailyScoresEarned: sum((record) => record.dailyScoresEarned),
    };
  }
}
