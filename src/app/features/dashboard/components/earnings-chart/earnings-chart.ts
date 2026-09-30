import { Component, computed, input, signal } from '@angular/core';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { Amount } from '../../../../shared/components/amount/amount';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import type { DailyEarningsRecord } from '../../models/daily-earnings-record.model';
import type { ChartBar } from '../../models/chart-bar.model';
import type { ChartBarSegment } from '../../models/chart-bar-segment.model';
import type { ChartGridLine } from '../../models/chart-grid-line.model';
import type { TooltipPosition } from '../../models/tooltip-position.model';
import { EarningsSource } from '../../models/earnings-source.enum';
import { ObserveWidth } from '../../../../shared/directives/observe-width';
import { AXIS_CHAR_WIDTH } from '../../../../shared/constants/chart-axis.const';

// The chart is drawn at its container's measured width, one user unit per CSS pixel; this is the
// width it assumes until that first measurement arrives.
const INITIAL_WIDTH = 600;
const VIEWBOX_HEIGHT = 260;
const Y_AXIS_LABEL_GAP = 5;
// Room one x-axis date label ("09/24") needs, so labels never collide on a narrow screen.
const MIN_LABEL_SPACING = 44;
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

const SOURCE_AMOUNT: Record<EarningsSource, (record: DailyEarningsRecord) => number> = {
  [EarningsSource.GOALS]: (record) => record.goalsEarned,
  [EarningsSource.DAILY_TASKS]: (record) => record.dailyTasksEarned,
  [EarningsSource.POMODORO]: (record) => record.pomodoroEarned,
  [EarningsSource.DAILY_SCORES]: (record) => record.dailyScoresEarned,
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

  readonly hoveredRecord = signal<DailyEarningsRecord | null>(null);
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

  readonly maxDailyEarned = computed(() => {
    const maxVal = this.records().reduce((max, r) => Math.max(max, r.totalEarned), 0);
    return Math.max(Y_SCALE_STEP, Math.ceil(maxVal / Y_SCALE_STEP) * Y_SCALE_STEP);
  });

  readonly gridLines = computed<ChartGridLine[]>(() => {
    const max = this.maxDailyEarned();
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
    const recs = this.records();
    const totalBars = recs.length;
    if (totalBars === 0) {
      return [];
    }

    const max = this.maxDailyEarned();
    const chartLeftX = this.chartLeftX();
    const slotWidth = (this.chartRightX() - chartLeftX) / totalBars;
    const barWidth = Math.max(slotWidth * 0.65, 4);
    const gap = (slotWidth - barWidth) / 2;

    // Thin the x-axis labels as the range grows: every day, every 2nd, every 5th, then about 7 in all.
    // A narrow chart thins them further, so neighbouring labels never overlap.
    let labelInterval = 1;
    if (totalBars > 31) {
      labelInterval = Math.ceil(totalBars / 7);
    } else if (totalBars > 16) {
      labelInterval = 5;
    } else if (totalBars > 10) {
      labelInterval = 2;
    }
    labelInterval = Math.max(labelInterval, Math.ceil(MIN_LABEL_SPACING / slotWidth));
    const lastIndex = totalBars - 1;

    return recs.map((record, index) => {
      const segments: ChartBarSegment[] = [];
      let currentY = this.chartBaselineY;

      for (const source of SOURCES) {
        const amount = SOURCE_AMOUNT[source](record);
        if (amount > 0) {
          const height = (amount / max) * this.chartHeight;
          currentY -= height;
          segments.push({ source, amount, y: currentY, height });
        }
      }

      return {
        date: record.date,
        formattedDate: this.formatDateLabel(record.date),
        total: record.totalEarned,
        x: chartLeftX + index * slotWidth + gap,
        width: barWidth,
        segments,
        record,
        shouldShowLabel:
          index === 0 || index === lastIndex || (index % labelInterval === 0 && lastIndex - index >= labelInterval),
      };
    });
  });

  readonly tooltipBreakdown = computed(() => {
    const record = this.hoveredRecord();
    if (!record) {
      return [];
    }
    return SOURCES.map((source) => ({
      source,
      label: SOURCE_LABELS[source],
      amount: SOURCE_AMOUNT[source](record),
    })).filter((row) => row.amount > 0);
  });

  onBarMouseEnter(record: DailyEarningsRecord, event: MouseEvent): void {
    this.hoveredRecord.set(record);
    this.placeTooltipAtPointer(event);
  }

  onBarMouseMove(event: MouseEvent): void {
    if (this.hoveredRecord()) {
      this.placeTooltipAtPointer(event);
    }
  }

  onBarMouseLeave(): void {
    this.hoveredRecord.set(null);
    this.tooltipPosition.set(null);
  }

  onBarClick(record: DailyEarningsRecord, event: MouseEvent): void {
    if (this.hoveredRecord()?.date === record.date) {
      this.onBarMouseLeave();
    } else {
      this.onBarMouseEnter(record, event);
    }
  }

  onBarFocus(record: DailyEarningsRecord, event: FocusEvent): void {
    const target = event.currentTarget instanceof Element ? event.currentTarget : null;
    const rect = target?.getBoundingClientRect();
    this.hoveredRecord.set(record);
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

  private formatDateLabel(dateStr: string): string {
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
  }
}
