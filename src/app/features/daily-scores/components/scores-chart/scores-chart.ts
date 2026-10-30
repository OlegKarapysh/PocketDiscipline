import { Component, computed, inject, input } from '@angular/core';
import type { DailyScore } from '../../../../core/models/daily-score.model';
import { ClockService } from '../../../../core/services/clock.service';
import { BarChart } from '../../../../shared/components/bar-chart/bar-chart';
import type { BarChartBar } from '../../../../shared/components/bar-chart/bar-chart-bar.model';
import type { BarChartLegendItem } from '../../../../shared/components/bar-chart/bar-chart-legend-item.model';
import type { BarChartScale } from '../../../../shared/components/bar-chart/bar-chart-scale.model';
import type { BarChartTooltipRow } from '../../../../shared/components/bar-chart/bar-chart-tooltip-row.model';
import { getPresetDateRange } from '../../../../shared/components/period-filter/preset-date-range';
import {
  datesInRange,
  formatPeriodAxisLabel,
  formatPeriodRange,
  groupByCalendarPeriod,
} from '../../../../shared/charts/chart-periods';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import type { ChartGranularity } from '../../../../shared/models/chart-granularity.type';
import { SCORE_GOOD, SCORE_PERFECT } from '../../constants/daily-score-reward.const';

const GRID_DIVISION_COUNT = 5;

const SCALE: BarChartScale = {
  max: SCORE_PERFECT,
  tickLabels: Array.from({ length: GRID_DIVISION_COUNT + 1 }, (_, i) =>
    String(Math.round((SCORE_PERFECT / GRID_DIVISION_COUNT) * i)),
  ),
};

const HEADINGS: Record<ChartGranularity, string> = {
  day: 'Daily scores',
  week: 'Weekly average scores',
  month: 'Monthly average scores',
  year: 'Yearly average scores',
};

const DAILY_LEGEND: BarChartLegendItem[] = [
  { label: 'Score 1–8', tone: 'primary' },
  { label: 'Score 9–10 (reward)', tone: 'reward' },
];
const AVERAGE_LEGEND: BarChartLegendItem[] = [
  { label: 'Average below 9', tone: 'primary' },
  { label: 'Average 9–10', tone: 'reward' },
];

@Component({
  selector: 'app-scores-chart',
  imports: [BarChart, SectionCard],
  templateUrl: './scores-chart.html',
  styleUrl: './scores-chart.scss',
})
export class ScoresChart {
  private readonly clock = inject(ClockService);

  readonly scores = input<DailyScore[]>([]);
  readonly startDate = input<string>('');
  readonly endDate = input<string>('');

  readonly scale = SCALE;

  private readonly rangeDates = computed<string[]>(() => {
    const startStr = this.startDate();
    const endStr = this.endDate();
    const range =
      startStr && endStr ? { startDate: startStr, endDate: endStr } : getPresetDateRange('last7', this.clock.today());

    return datesInRange(range.startDate, range.endDate);
  });

  // Every date of the range, oldest first, grouped into one bar per day, week or month.
  private readonly grouping = computed(() => groupByCalendarPeriod(this.rangeDates(), (date) => date));
  private readonly isDaily = computed(() => this.grouping().granularity === 'day');
  readonly heading = computed(() => HEADINGS[this.grouping().granularity]);
  readonly legend = computed(() => (this.isDaily() ? DAILY_LEGEND : AVERAGE_LEGEND));

  readonly bars = computed<BarChartBar[]>(() => {
    const { granularity, periods } = this.grouping();
    const isDaily = this.isDaily();
    const scoreLabel = isDaily ? 'Score' : 'Average score';
    const scoreMap = new Map(this.scores().map((score) => [score.date, score]));

    return periods.map((period): BarChartBar => {
      const scored = period.items.flatMap((date) => scoreMap.get(date) ?? []);
      // Averaged to one decimal place, rounded down, so an average just under 9 never shows as 9.
      // Scores are whole numbers, so the division is exact before it is floored.
      const scoreSum = scored.reduce((sum, s) => sum + s.score, 0);
      const score = scored.length > 0 ? Math.floor((scoreSum * 10) / scored.length) / 10 : null;
      const rewardEarned = scored.reduce((sum, s) => sum + s.rewardEarned, 0);
      const range = formatPeriodRange(period);
      const title = isDaily ? `${range} (${this.weekdayOf(period.startDate)})` : range;
      const bar = {
        key: period.startDate,
        axisLabel: formatPeriodAxisLabel(period.startDate, granularity),
      };

      if (score === null) {
        return {
          ...bar,
          ariaLabel: `${range}: No score`,
          segments: [],
          tooltip: { title, rows: [], note: 'No score recorded' },
        };
      }

      const rows: BarChartTooltipRow[] = [{ label: scoreLabel, text: `${score} / ${SCORE_PERFECT}` }];
      if (!isDaily) {
        rows.push({ label: 'Days scored', text: `${scored.length} / ${period.items.length}` });
      }
      if (rewardEarned > 0) {
        rows.push({ label: 'Reward', amount: rewardEarned, signedAmount: true });
      }
      return {
        ...bar,
        ariaLabel: `${range}: ${scoreLabel} ${score}`,
        segments: [{ value: score, tone: score >= SCORE_GOOD ? 'reward' : 'primary' }],
        tooltip: { title, rows },
      };
    });
  });

  private weekdayOf(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
  }
}
