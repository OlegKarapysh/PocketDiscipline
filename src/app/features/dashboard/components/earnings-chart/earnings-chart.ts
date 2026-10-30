import { Component, computed, input } from '@angular/core';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { BarChart } from '../../../../shared/components/bar-chart/bar-chart';
import type { BarChartBar } from '../../../../shared/components/bar-chart/bar-chart-bar.model';
import type { BarChartLegendItem } from '../../../../shared/components/bar-chart/bar-chart-legend-item.model';
import type { BarChartScale } from '../../../../shared/components/bar-chart/bar-chart-scale.model';
import type { ChartTone } from '../../../../shared/components/bar-chart/chart-tone.type';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import type { DailyEarningsRecord } from '../../models/daily-earnings-record.model';
import type { EarningsBucket } from '../../models/earnings-bucket.model';
import { EarningsSource } from '../../models/earnings-source.enum';
import {
  formatPeriodAxisLabel,
  formatPeriodRange,
  groupByCalendarPeriod,
} from '../../../../shared/charts/chart-periods';
import type { ChartGranularity } from '../../../../shared/models/chart-granularity.type';
import type { ChartPeriod } from '../../../../shared/models/chart-period.model';

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

// Goals are earned rewards (amber); tasks and focus share the primary family.
const SOURCE_TONES: Record<EarningsSource, ChartTone> = {
  [EarningsSource.GOALS]: 'reward',
  [EarningsSource.DAILY_TASKS]: 'primary',
  [EarningsSource.POMODORO]: 'inverse-primary',
  [EarningsSource.DAILY_SCORES]: 'secondary',
};

const HEADINGS: Record<ChartGranularity, string> = {
  day: 'Daily earnings',
  week: 'Weekly earnings',
  month: 'Monthly earnings',
  year: 'Yearly earnings',
};

const SOURCES = Object.values(EarningsSource);

const LEGEND: BarChartLegendItem[] = SOURCES.map((source) => ({
  label: SOURCE_LABELS[source],
  tone: SOURCE_TONES[source],
}));

@Component({
  selector: 'app-earnings-chart',
  imports: [SectionCard, BarChart],
  templateUrl: './earnings-chart.html',
  styleUrl: './earnings-chart.scss',
})
export class EarningsChart {
  readonly records = input<DailyEarningsRecord[]>([]);

  readonly legend = LEGEND;

  private readonly grouping = computed(() => groupByCalendarPeriod(this.records(), (record) => record.date));
  private readonly buckets = computed(() => this.grouping().periods.map((period) => this.toBucket(period)));
  readonly heading = computed(() => HEADINGS[this.grouping().granularity]);

  readonly scale = computed<BarChartScale>(() => {
    const maxTotal = this.buckets().reduce((max, bucket) => Math.max(max, bucket.totalEarned), 0);
    const max = Math.max(Y_SCALE_STEP, Math.ceil(maxTotal / Y_SCALE_STEP) * Y_SCALE_STEP);
    const tickLabels = Array.from({ length: GRID_DIVISION_COUNT + 1 }, (_, i) =>
      MONEY_FORMAT.format(Math.round((max / GRID_DIVISION_COUNT) * i)),
    );
    return { max, tickLabels };
  });

  readonly bars = computed<BarChartBar[]>(() => {
    const { granularity } = this.grouping();
    return this.buckets().map((bucket) => {
      const period = formatPeriodRange(bucket);
      const breakdown = SOURCES.map((source) => ({
        label: SOURCE_LABELS[source],
        amount: SOURCE_AMOUNT[source](bucket),
        swatch: SOURCE_TONES[source],
      })).filter((row) => row.amount > 0);

      return {
        key: bucket.startDate,
        axisLabel: formatPeriodAxisLabel(bucket.startDate, granularity),
        ariaLabel: `${period}: ${MONEY_FORMAT.format(bucket.totalEarned)} ₴`,
        segments: SOURCES.map((source) => ({ value: SOURCE_AMOUNT[source](bucket), tone: SOURCE_TONES[source] })),
        tooltip: {
          title: period,
          rows: [{ label: 'Total', amount: bucket.totalEarned, emphasis: true }, ...breakdown],
          note: breakdown.length === 0 ? 'No earnings recorded' : undefined,
        },
      };
    });
  });

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
