import { SpendingTrendPoint } from '../../models/spending-trend-point.model';

export interface RenderedBar {
  point: SpendingTrendPoint;
  x: number;
  y: number;
  width: number;
  height: number;
  showLabel: boolean;
}
