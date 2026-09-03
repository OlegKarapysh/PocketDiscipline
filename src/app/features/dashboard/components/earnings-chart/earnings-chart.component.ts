import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DailyEarningsRecord } from '../../models/daily-earnings-record.model';
import { ChartBar } from '../../models/chart-bar.model';
import { ChartBarSegment } from '../../models/chart-bar-segment.model';
import { ChartGridLine } from '../../models/chart-grid-line.model';
import { TooltipPosition } from '../../models/tooltip-position.model';
import { EarningsSource } from '../../models/earnings-source.enum';

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 260;
const PADDING_LEFT = 45;
const PADDING_RIGHT = 15;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 35;
const MIN_MAX_EARNINGS = 500;
const GRID_STEP_ROUNDING = 500;
const GRID_DIVISION_COUNT = 4;
const ZERO_VALUE = 0;
const BAR_INNER_GAP_FRACTION = 0.35;
const MIN_BAR_WIDTH = 4;
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 15;
const DIVISOR_TWO = 2;
const DATE_PARTS_LENGTH = 3;
const DATE_PART_MONTH_INDEX = 1;
const DATE_PART_DAY_INDEX = 2;
const MAX_BARS_FOR_ALL_LABELS = 10;
const MAX_BARS_FOR_HALF_LABELS = 16;
const MAX_BARS_FOR_MONTH_LABELS = 31;
const LABEL_STEP_HALF = 2;
const LABEL_STEP_MONTH = 5;
const LABEL_STEP_DIVISOR = 7;
const AXIS_LABEL_X_OFFSET = 5;

const SOURCE_COLORS: Record<EarningsSource, string> = {
  [EarningsSource.GOALS]: '#3f51b5',
  [EarningsSource.DAILY_TASKS]: '#4caf50',
  [EarningsSource.POMODORO]: '#ff9800',
  [EarningsSource.DAILY_SCORES]: '#9c27b0',
};

const SOURCE_LABELS: Record<EarningsSource, string> = {
  [EarningsSource.GOALS]: 'Goals',
  [EarningsSource.DAILY_TASKS]: 'Daily Tasks',
  [EarningsSource.POMODORO]: 'Pomodoro',
  [EarningsSource.DAILY_SCORES]: 'Daily Scores',
};

@Component({
  selector: 'app-earnings-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './earnings-chart.component.html',
  styleUrl: './earnings-chart.component.scss'
})
export class EarningsChartComponent {
  readonly records = input<DailyEarningsRecord[]>([]);

  readonly hoveredRecord = signal<DailyEarningsRecord | null>(null);
  readonly tooltipPosition = signal<TooltipPosition | null>(null);

  readonly viewBox = `${ZERO_VALUE} ${ZERO_VALUE} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;

  readonly chartBaselineY = VIEWBOX_HEIGHT - PADDING_BOTTOM;
  readonly chartTopY = PADDING_TOP;
  readonly chartHeight = VIEWBOX_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  readonly chartLeftX = PADDING_LEFT;
  readonly chartRightX = VIEWBOX_WIDTH - PADDING_RIGHT;
  readonly yAxisTextX = PADDING_LEFT - AXIS_LABEL_X_OFFSET;
  readonly axisLabelYOffset = 4;
  readonly axisLabelYPos = 245;
  readonly zeroBarY = 223;
  readonly zeroBarHeight = 2;

  readonly legendItems = [
    { label: SOURCE_LABELS[EarningsSource.GOALS], color: SOURCE_COLORS[EarningsSource.GOALS] },
    { label: SOURCE_LABELS[EarningsSource.DAILY_TASKS], color: SOURCE_COLORS[EarningsSource.DAILY_TASKS] },
    { label: SOURCE_LABELS[EarningsSource.POMODORO], color: SOURCE_COLORS[EarningsSource.POMODORO] },
    { label: SOURCE_LABELS[EarningsSource.DAILY_SCORES], color: SOURCE_COLORS[EarningsSource.DAILY_SCORES] },
  ];

  readonly maxDailyEarned = computed(() => {
    const recs = this.records();
    if (recs.length === ZERO_VALUE) {
      return MIN_MAX_EARNINGS;
    }
    const maxVal = recs.reduce((max, r) => Math.max(max, r.totalEarned), ZERO_VALUE);
    if (maxVal <= MIN_MAX_EARNINGS) {
      return MIN_MAX_EARNINGS;
    }
    return Math.ceil(maxVal / GRID_STEP_ROUNDING) * GRID_STEP_ROUNDING;
  });

  readonly gridLines = computed<ChartGridLine[]>(() => {
    const max = this.maxDailyEarned();
    const chartHeight = this.chartHeight;
    const lines: ChartGridLine[] = [];

    for (let i = 0; i <= GRID_DIVISION_COUNT; i++) {
      const value = Math.round((max / GRID_DIVISION_COUNT) * i);
      const y = VIEWBOX_HEIGHT - PADDING_BOTTOM - (chartHeight / GRID_DIVISION_COUNT) * i;
      lines.push({ y, label: String(value) });
    }
    return lines;
  });

  readonly bars = computed<ChartBar[]>(() => {
    const recs = this.records();
    const totalBars = recs.length;
    if (totalBars === ZERO_VALUE) {
      return [];
    }

    const max = this.maxDailyEarned();
    const chartWidth = this.chartRightX - this.chartLeftX;
    const chartHeight = this.chartHeight;
    const baselineY = this.chartBaselineY;

    const slotWidth = chartWidth / totalBars;
    const barWidth = Math.max(slotWidth * (1 - BAR_INNER_GAP_FRACTION), MIN_BAR_WIDTH);
    const gap = (slotWidth - barWidth) / DIVISOR_TWO;

    let labelInterval = 1;
    if (totalBars > MAX_BARS_FOR_MONTH_LABELS) {
      labelInterval = Math.ceil(totalBars / LABEL_STEP_DIVISOR);
    } else if (totalBars > MAX_BARS_FOR_HALF_LABELS) {
      labelInterval = LABEL_STEP_MONTH;
    } else if (totalBars > MAX_BARS_FOR_ALL_LABELS) {
      labelInterval = LABEL_STEP_HALF;
    }

    return recs.map((record, index) => {
      const x = PADDING_LEFT + index * slotWidth + gap;
      const formattedDate = this.formatDateLabel(record.date);
      const shouldShowLabel = index === ZERO_VALUE || index === totalBars - 1 || index % labelInterval === ZERO_VALUE;
      const segments: ChartBarSegment[] = [];

      let currentY = baselineY;

      const addSegment = (source: EarningsSource, amount: number) => {
        if (amount > ZERO_VALUE) {
          const segHeight = (amount / max) * chartHeight;
          currentY -= segHeight;
          segments.push({
            source,
            sourceLabel: SOURCE_LABELS[source],
            color: SOURCE_COLORS[source],
            amount,
            y: currentY,
            height: segHeight,
          });
        }
      };

      addSegment(EarningsSource.GOALS, record.goalsEarned);
      addSegment(EarningsSource.DAILY_TASKS, record.dailyTasksEarned);
      addSegment(EarningsSource.POMODORO, record.pomodoroEarned);
      addSegment(EarningsSource.DAILY_SCORES, record.dailyScoresEarned);

      return {
        date: record.date,
        formattedDate,
        total: record.totalEarned,
        x,
        width: barWidth,
        segments,
        record,
        shouldShowLabel,
      };
    });
  });

  onBarMouseEnter(record: DailyEarningsRecord, event: MouseEvent): void {
    this.hoveredRecord.set(record);
    this.tooltipPosition.set({
      x: event.clientX + TOOLTIP_OFFSET_X,
      y: event.clientY + TOOLTIP_OFFSET_Y,
    });
  }

  onBarMouseMove(event: MouseEvent): void {
    if (this.hoveredRecord()) {
      this.tooltipPosition.set({
        x: event.clientX + TOOLTIP_OFFSET_X,
        y: event.clientY + TOOLTIP_OFFSET_Y,
      });
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
    const target = event.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    this.hoveredRecord.set(record);
    this.tooltipPosition.set({
      x: (rect?.left ?? ZERO_VALUE) + (rect?.width ?? ZERO_VALUE) / DIVISOR_TWO,
      y: (rect?.top ?? ZERO_VALUE) - TOOLTIP_OFFSET_Y,
    });
  }

  onBarBlur(): void {
    this.onBarMouseLeave();
  }

  private formatDateLabel(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === DATE_PARTS_LENGTH) {
      return `${parts[DATE_PART_MONTH_INDEX]}/${parts[DATE_PART_DAY_INDEX]}`;
    }
    return dateStr;
  }
}
