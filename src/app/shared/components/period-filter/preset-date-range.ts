import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import type { PeriodFilterValue } from './period-filter-value.model';
import type { PeriodPreset } from './period-preset.type';

export function getPresetDateRange(
  preset: PeriodPreset,
  todayStr: string = new Date().toLocaleDateString(DATE_LOCALE_CA),
): { startDate: string; endDate: string } {
  const [year, month, day] = todayStr.split('-').map(Number);

  let days = 7;
  if (preset === 'last14') {
    days = 14;
  } else if (preset === 'last30') {
    days = 30;
  }

  // The range includes today.
  const startDateObj = new Date(year, month - 1, day - (days - 1));
  const startDate = startDateObj.toLocaleDateString(DATE_LOCALE_CA);

  return { startDate, endDate: todayStr };
}

export function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
}

export function formatPeriodLabel(filter: PeriodFilterValue): string {
  if (filter.preset === 'last7') {
    return '7 days';
  }
  if (filter.preset === 'last14') {
    return '14 days';
  }
  if (filter.preset === 'last30') {
    return '30 days';
  }
  if (filter.startDate && filter.endDate) {
    return `${formatShortDate(filter.startDate)} – ${formatShortDate(filter.endDate)}`;
  }
  return 'custom';
}
