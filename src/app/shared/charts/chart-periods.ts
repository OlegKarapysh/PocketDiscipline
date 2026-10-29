import { DATE_LOCALE_CA } from '../../core/constants/date-locale.const';
import type { ChartGranularity } from '../models/chart-granularity.type';
import type { ChartPeriod } from '../models/chart-period.model';
import type { ChartPeriodGrouping } from '../models/chart-period-grouping.model';

// The most bars a chart draws per day, then per week. A longer range falls back to the next unit.
const MAX_BARS = 90;

// The first day of the calendar period a YYYY-MM-DD date falls in. Weeks run Monday to Sunday.
const PERIOD_START: Record<ChartGranularity, (date: string) => string> = {
  day: (date) => date,
  week: (date) => {
    const [year, month, day] = date.split('-').map(Number);
    const daysSinceMonday = (new Date(year, month - 1, day).getDay() + 6) % 7;
    return new Date(year, month - 1, day - daysSinceMonday).toLocaleDateString(DATE_LOCALE_CA);
  },
  month: (date) => `${date.slice(0, 7)}-01`,
};

// Groups one item per consecutive day, oldest first, into the finest calendar unit that keeps the
// chart within MAX_BARS bars. A period the range only partly covers starts or ends where the range does.
export function groupByCalendarPeriod<T>(items: T[], dateOf: (item: T) => string): ChartPeriodGrouping<T> {
  for (const granularity of ['day', 'week'] as const) {
    const periods = groupBy(items, dateOf, PERIOD_START[granularity]);
    if (periods.length <= MAX_BARS) {
      return { granularity, periods };
    }
  }
  return { granularity: 'month', periods: groupBy(items, dateOf, PERIOD_START.month) };
}

// The dates a bar covers, for its tooltip and its screen-reader label.
export function formatPeriodRange(period: { startDate: string; endDate: string }): string {
  return period.startDate === period.endDate ? period.startDate : `${period.startDate} – ${period.endDate}`;
}

// A day or a week is labelled by its first day ("09/24"), a month by its name ("Sep '26").
export function formatPeriodAxisLabel(startDate: string, granularity: ChartGranularity): string {
  const [year, month, day] = startDate.split('-');
  if (granularity === 'month') {
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
    return `${monthName} '${year.slice(-2)}`;
  }
  return `${month}/${day}`;
}

function groupBy<T>(items: T[], dateOf: (item: T) => string, periodStart: (date: string) => string): ChartPeriod<T>[] {
  const periods: ChartPeriod<T>[] = [];
  let currentStart = '';

  for (const item of items) {
    const date = dateOf(item);
    const start = periodStart(date);
    const period = periods.at(-1);

    if (period && start === currentStart) {
      period.endDate = date;
      period.items.push(item);
    } else {
      currentStart = start;
      periods.push({ startDate: date, endDate: date, items: [item] });
    }
  }
  return periods;
}
