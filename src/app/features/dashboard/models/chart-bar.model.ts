import type { ChartBarSegment } from './chart-bar-segment.model';
import type { DailyEarningsRecord } from './daily-earnings-record.model';

export interface ChartBar {
  date: string;
  formattedDate: string;
  total: number;
  x: number;
  width: number;
  segments: ChartBarSegment[];
  record: DailyEarningsRecord;
  shouldShowLabel: boolean;
}
