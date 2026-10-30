import { Component, computed, input } from '@angular/core';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { BarChart } from '../../../../shared/components/bar-chart/bar-chart';
import type { BarChartBar } from '../../../../shared/components/bar-chart/bar-chart-bar.model';
import type { BarChartScale } from '../../../../shared/components/bar-chart/bar-chart-scale.model';
import {
  formatPeriodAxisLabel,
  formatPeriodRange,
  groupByCalendarPeriod,
} from '../../../../shared/charts/chart-periods';
import type { ChartGranularity } from '../../../../shared/models/chart-granularity.type';
import { ENGAGEMENT_TYPE_LABELS } from '../../constants/engagement-type-labels.const';
import type { DailyPomodoroTally } from '../../models/daily-pomodoro-tally.model';

// The y-axis tops out at the next multiple of this, in as many steps, so every tick is a whole number.
const Y_SCALE_STEP = 4;

const ARIA_LABELS: Record<ChartGranularity, string> = {
  day: 'Daily pomodoros chart',
  week: 'Weekly pomodoros chart',
  month: 'Monthly pomodoros chart',
  year: 'Yearly pomodoros chart',
};

@Component({
  selector: 'app-pomodoro-history-chart',
  imports: [BarChart],
  templateUrl: './pomodoro-history-chart.html',
  styleUrl: './pomodoro-history-chart.scss',
})
export class PomodoroHistoryChart {
  readonly days = input.required<readonly DailyPomodoroTally[]>();

  private readonly grouping = computed(() => groupByCalendarPeriod(this.days(), (day) => day.date));
  readonly ariaLabel = computed(() => ARIA_LABELS[this.grouping().granularity]);

  // Each day, week, month or year with its pomodoros in all and per engagement type.
  private readonly periods = computed(() =>
    this.grouping().periods.map((period) => ({
      startDate: period.startDate,
      endDate: period.endDate,
      pomodoros: period.items.reduce((sum, day) => sum + day.pomodoros, 0),
      byType: Object.values(EngagementType).map((type) => ({
        type,
        count: period.items.reduce((sum, day) => sum + day.byType[type], 0),
      })),
    })),
  );

  readonly scale = computed<BarChartScale>(() => {
    const most = this.periods().reduce((max, period) => Math.max(max, period.pomodoros), 0);
    const max = Math.max(Y_SCALE_STEP, Math.ceil(most / Y_SCALE_STEP) * Y_SCALE_STEP);
    return {
      max,
      tickLabels: Array.from({ length: Y_SCALE_STEP + 1 }, (_, i) => String((max / Y_SCALE_STEP) * i)),
    };
  });

  readonly bars = computed<BarChartBar[]>(() => {
    const { granularity } = this.grouping();
    return this.periods().map((period) => {
      const range = formatPeriodRange(period);
      const count = `${period.pomodoros} ${period.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}`;
      return {
        key: period.startDate,
        axisLabel: formatPeriodAxisLabel(period.startDate, granularity),
        ariaLabel: `${range}: ${count}`,
        segments: [{ value: period.pomodoros, tone: 'primary' }],
        tooltip:
          period.pomodoros === 0
            ? { title: range, rows: [{ label: 'Pomodoros', text: '0', emphasis: true }], note: 'No pomodoros' }
            : {
                title: range,
                rows: [
                  { label: 'Pomodoros', text: String(period.pomodoros), emphasis: true },
                  ...period.byType.map(({ type, count: typeCount }) => ({
                    label: ENGAGEMENT_TYPE_LABELS[type],
                    text: String(typeCount),
                  })),
                ],
              },
      };
    });
  });
}
