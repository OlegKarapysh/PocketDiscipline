import { Component, computed, inject, input, signal } from '@angular/core';
import type { DailyScore } from '../../../../core/models/daily-score.model';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { ClockService } from '../../../../core/services/clock.service';
import { Amount } from '../../../../shared/components/amount/amount';
import { getPresetDateRange } from '../../../../shared/components/period-filter/preset-date-range';
import {
  formatPeriodAxisLabel,
  formatPeriodRange,
  groupByCalendarPeriod,
} from '../../../../shared/charts/chart-periods';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { AXIS_CHAR_WIDTH } from '../../../../shared/constants/chart-axis.const';
import { ObserveWidth } from '../../../../shared/directives/observe-width';
import type { ChartGranularity } from '../../../../shared/models/chart-granularity.type';
import type { ChartGridLine } from '../../../../shared/models/chart-grid-line.model';
import type { TooltipPosition } from '../../../../shared/models/tooltip-position.model';
import { SCORE_GOOD, SCORE_PERFECT } from '../../constants/daily-score-reward.const';
import type { ScoreBar } from '../../models/score-bar.model';

const INITIAL_WIDTH = 600;
const VIEWBOX_HEIGHT = 240;
const Y_AXIS_LABEL_GAP = 5;
// Space kept between neighbouring x-axis labels, so they never collide on a narrow screen.
const X_LABEL_GAP = 9;
const GRID_DIVISION_COUNT = 5;

const HEADINGS: Record<ChartGranularity, string> = {
  day: 'Daily scores',
  week: 'Weekly average scores',
  month: 'Monthly average scores',
};

const DAILY_LEGEND = { standard: 'Score 1–8', highScore: 'Score 9–10 (reward)' };
const AVERAGE_LEGEND = { standard: 'Average below 9', highScore: 'Average 9–10' };

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

  readonly hoveredBar = signal<ScoreBar | null>(null);
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

  private readonly rangeDates = computed<string[]>(() => {
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

    const dates: string[] = [];
    while (current <= end) {
      dates.push(current.toLocaleDateString(DATE_LOCALE_CA));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  });

  // Every date of the range, oldest first, grouped into one bar per day, week or month.
  private readonly grouping = computed(() => groupByCalendarPeriod(this.rangeDates(), (date) => date));
  readonly isDaily = computed(() => this.grouping().granularity === 'day');
  readonly heading = computed(() => HEADINGS[this.grouping().granularity]);
  readonly scoreLabel = computed(() => (this.isDaily() ? 'Score' : 'Average score'));
  readonly legend = computed(() => (this.isDaily() ? DAILY_LEGEND : AVERAGE_LEGEND));

  readonly chartData = computed<ScoreBar[]>(() => {
    const { granularity, periods } = this.grouping();
    const totalBars = periods.length;
    if (totalBars === 0) {
      return [];
    }

    const scoreMap = new Map<string, DailyScore>();
    for (const score of this.scores()) {
      scoreMap.set(score.date, score);
    }

    const axisLabels = periods.map((period) => formatPeriodAxisLabel(period.startDate, granularity));
    const longestLabel = Math.max(...axisLabels.map((label) => label.length));
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
    const labelSpacing = longestLabel * AXIS_CHAR_WIDTH + X_LABEL_GAP;
    labelInterval = Math.max(labelInterval, Math.ceil(labelSpacing / slotWidth));
    const lastIndex = totalBars - 1;
    // A label is centred under its bar, but never so close to an edge that part of it is cut off.
    const labelHalfWidth = (longestLabel * AXIS_CHAR_WIDTH) / 2;
    const maxLabelX = this.width() - labelHalfWidth;

    return periods.map((period, index) => {
      const scored = period.items.flatMap((date) => scoreMap.get(date) ?? []);
      // Averaged to one decimal place, so a week of 9s and 10s does not read as a flat 10.
      const score =
        scored.length > 0 ? Math.round((scored.reduce((sum, s) => sum + s.score, 0) / scored.length) * 10) / 10 : null;
      const height = score !== null ? (score / SCORE_PERFECT) * this.chartHeight : 0;
      const x = chartLeftX + index * slotWidth + gap;
      const range = formatPeriodRange(period);

      return {
        startDate: period.startDate,
        tooltipTitle: this.isDaily() ? `${range} (${this.weekdayOf(period.startDate)})` : range,
        ariaLabel: `${range}: ${score !== null ? `${this.scoreLabel()} ${score}` : 'No score'}`,
        axisLabel: axisLabels[index],
        axisLabelX: Math.min(Math.max(x + barWidth / 2, labelHalfWidth), maxLabelX),
        score,
        scoredDays: scored.length,
        dayCount: period.items.length,
        rewardEarned: scored.reduce((sum, s) => sum + s.rewardEarned, 0),
        x,
        y: this.chartBaselineY - height,
        width: barWidth,
        height,
        isHighScore: score !== null && score >= SCORE_GOOD,
        shouldShowLabel:
          index === 0 || index === lastIndex || (index % labelInterval === 0 && lastIndex - index >= labelInterval),
      };
    });
  });

  onBarMouseEnter(bar: ScoreBar, event: MouseEvent): void {
    this.hoveredBar.set(bar);
    this.placeTooltipAtPointer(event);
  }

  onBarMouseMove(event: MouseEvent): void {
    if (this.hoveredBar()) {
      this.placeTooltipAtPointer(event);
    }
  }

  onBarMouseLeave(): void {
    this.hoveredBar.set(null);
    this.tooltipPosition.set(null);
  }

  onBarClick(bar: ScoreBar, event: MouseEvent): void {
    if (this.hoveredBar()?.startDate === bar.startDate) {
      this.onBarMouseLeave();
    } else {
      this.onBarMouseEnter(bar, event);
    }
  }

  onBarFocus(bar: ScoreBar, event: FocusEvent): void {
    const target = event.currentTarget instanceof Element ? event.currentTarget : null;
    const rect = target?.getBoundingClientRect();
    this.hoveredBar.set(bar);
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

  private weekdayOf(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
  }
}
