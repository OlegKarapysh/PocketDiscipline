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
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 15;

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
    const maxVal = Math.max(...recs.map(r => r.totalEarned), ZERO_VALUE);
    if (maxVal <= MIN_MAX_EARNINGS) {
      return MIN_MAX_EARNINGS;
    }
    return Math.ceil(maxVal / GRID_STEP_ROUNDING) * GRID_STEP_ROUNDING;
  });

  readonly gridLines = computed<ChartGridLine[]>(() => {
    const max = this.maxDailyEarned();
    const chartHeight = VIEWBOX_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
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
    if (recs.length === ZERO_VALUE) {
      return [];
    }

    const max = this.maxDailyEarned();
    const chartWidth = VIEWBOX_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const chartHeight = VIEWBOX_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const baselineY = VIEWBOX_HEIGHT - PADDING_BOTTOM;

    const slotWidth = chartWidth / recs.length;
    const barWidth = Math.max(slotWidth * (1 - BAR_INNER_GAP_FRACTION), 4);
    const gap = (slotWidth - barWidth) / 2;

    return recs.map((record, index) => {
      const x = PADDING_LEFT + index * slotWidth + gap;
      const formattedDate = this.formatDateLabel(record.date);
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

  private formatDateLabel(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  }
}
