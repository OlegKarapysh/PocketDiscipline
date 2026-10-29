// The items one bar stands for: a day, or a calendar week or month cut to the dates the chart covers.
export interface ChartPeriod<T> {
  startDate: string;
  endDate: string;
  items: T[];
}
