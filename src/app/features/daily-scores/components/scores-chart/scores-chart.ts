import { Component, computed, inject, input, signal } from '@angular/core';
import type { DailyScore } from '../../../../core/models/daily-score.model';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { ClockService } from '../../../../core/services/clock.service';
import { Amount } from '../../../../shared/components/amount/amount';
import { formatShortDate, getPresetDateRange } from '../../../../shared/components/period-filter/preset-date-range';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { AXIS_CHAR_WIDTH } from '../../../../shared/constants/chart-axis.const';
import { ObserveWidth } from '../../../../shared/directives/observe-width';
import type { ChartGridLine } from '../../../../shared/models/chart-grid-line.model';
import type { TooltipPosition } from '../../../../shared/models/tooltip-position.model';
import { SCORE_GOOD, SCORE_PERFECT } from '../../constants/daily-score-reward.const';
import type { ChartDayData } from '../../models/chart-day-data.model';

const INITIAL_WIDTH = 600;
const VIEWBOX_HEIGHT = 240;
const Y_AXIS_LABEL_GAP = 5;
const MIN_LABEL_SPACING = 44;
const GRID_DIVISION_COUNT = 5;
const MAX_ALLOWED_CHART_DAYS = 90;

@Component({
  selector: 'app-scores-chart',
  imports: [Amount, ObserveWidth, SectionCard],
  templateUrl: './scores-chart.html',
  styleUrl: './scores-chart.scss',
})
export class ScoresChart {
  private readonly clock = inject(ClockService);

  readonly scores = input<DailyScore[]>([]);
  readonly startDate = input<string>('');
  readonly endDate = input<string>('');

  readonly hoveredDay = signal<ChartDayData | null>(null);
  readonly tooltipPosition = signal<TooltipPosition | null>(null);

  readonly width = signal(INITIAL_WIDTH);
  readonly viewBox = computed(() => `0 0 ${this.width()} ${VIEWBOX_HEIGHT}`);

  readonly chartBaselineY = VIEWBOX_HEIGHT - 35;
  readonly chartTopY = 20;
  readonly chartHeight = this.chartBaselineY - this.chartTopY;
  readonly chartRightX = computed(() => this.width() - 20);
  readonly axisLabelYOffset = 4;
  readonly axisLabelYPos = this.chartBaselineY + 20;
  readonly zeroBarHeight = 2;
  readonly zeroBarY = this.chartBaselineY - this.zeroBarHeight;

  readonly gridLines = computed<ChartGridLine[]>(() => {
    const lines: ChartGridLine[] = [];

    for (let i = 0; i <= GRID_DIVISION_COUNT; i++) {
      const value = Math.round((SCORE_PERFECT / GRID_DIVISION_COUNT) * i);
      const y = this.chartBaselineY - (this.chartHeight / GRID_DIVISION_COUNT) * i;
      lines.push({ y, label: String(value) });
    }
    return lines;
  });

  readonly chartLeftX = computed(() => {
    const longest = Math.max(...this.gridLines().map((line) => line.label.length));
    return Math.ceil(longest * AXIS_CHAR_WIDTH) + Y_AXIS_LABEL_GAP;
  });
  readonly yAxisTextX = computed(() => this.chartLeftX() - Y_AXIS_LABEL_GAP);

  readonly chartData = computed<ChartDayData[]>(() => {
    const startStr = this.startDate();
    const endStr = this.endDate();
    const range =
      startStr && endStr ? { startDate: startStr, endDate: endStr } : getPresetDateRange('last7', this.clock.today());

    if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
      return [];
    }

    const [startYear, startMonth, startDay] = range.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = range.endDate.split('-').map(Number);

    const current = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    if (isNaN(current.getTime()) || isNaN(end.getTime())) {
      return [];
    }

    const scoreMap = new Map<string, DailyScore>();
    for (const score of this.scores()) {
      scoreMap.set(score.date, score);
    }

    const rawDays: { date: string; dayOfWeek: string; score: number | null; rewardEarned: number }[] = [];
    let dayCount = 0;

    while (current <= end && dayCount < MAX_ALLOWED_CHART_DAYS) {
      const dateStr = current.toLocaleDateString(DATE_LOCALE_CA);
      const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
      const record = scoreMap.get(dateStr);

      rawDays.push({
        date: dateStr,
        dayOfWeek: dayName,
        score: record?.score ?? null,
        rewardEarned: record?.rewardEarned ?? 0,
      });

      current.setDate(current.getDate() + 1);
      dayCount++;
    }

    const totalBars = rawDays.length;
    if (totalBars === 0) {
      return [];
    }

    const chartLeftX = this.chartLeftX();
    const slotWidth = (this.chartRightX() - chartLeftX) / totalBars;
    const barWidth = Math.max(slotWidth * 0.65, 4);
    const gap = (slotWidth - barWidth) / 2;

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

    return rawDays.map((day, index) => {
      const height = day.score !== null ? (day.score / SCORE_PERFECT) * this.chartHeight : 0;
      return {
        date: day.date,
        formattedDate: formatShortDate(day.date),
        dayOfWeek: day.dayOfWeek,
        score: day.score,
        rewardEarned: day.rewardEarned,
        x: chartLeftX + index * slotWidth + gap,
        y: this.chartBaselineY - height,
        width: barWidth,
        height,
        isHighScore: day.score !== null && day.score >= SCORE_GOOD,
        shouldShowLabel:
          index === 0 || index === lastIndex || (index % labelInterval === 0 && lastIndex - index >= labelInterval),
      };
    });
  });

  onBarMouseEnter(day: ChartDayData, event: MouseEvent): void {
    this.hoveredDay.set(day);
    this.placeTooltipAtPointer(event);
  }

  onBarMouseMove(event: MouseEvent): void {
    if (this.hoveredDay()) {
      this.placeTooltipAtPointer(event);
    }
  }

  onBarMouseLeave(): void {
    this.hoveredDay.set(null);
    this.tooltipPosition.set(null);
  }

  onBarClick(day: ChartDayData, event: MouseEvent): void {
    if (this.hoveredDay()?.date === day.date) {
      this.onBarMouseLeave();
    } else {
      this.onBarMouseEnter(day, event);
    }
  }

  onBarFocus(day: ChartDayData, event: FocusEvent): void {
    const target = event.currentTarget instanceof Element ? event.currentTarget : null;
    const rect = target?.getBoundingClientRect();
    this.hoveredDay.set(day);
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
}
