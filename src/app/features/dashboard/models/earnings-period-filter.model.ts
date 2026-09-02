import { PeriodPreset } from './period-preset.type';

export interface EarningsPeriodFilter {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
}
