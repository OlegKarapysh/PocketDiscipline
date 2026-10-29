import type { ChartBarSegment } from './chart-bar-segment.model';
import type { EarningsBucket } from './earnings-bucket.model';

export interface ChartBar {
  period: string;
  axisLabel: string;
  axisLabelX: number;
  total: number;
  x: number;
  width: number;
  segments: ChartBarSegment[];
  bucket: EarningsBucket;
  shouldShowLabel: boolean;
}
