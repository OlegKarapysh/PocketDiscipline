import type { PeriodPreset } from './period-preset.type';

export interface PeriodFilterValue {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
}
