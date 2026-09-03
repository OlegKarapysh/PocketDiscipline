# Interface Contracts: Dashboard Earnings Chart and Statistics

## 1. Service Contract: `DashboardEarningsService`

```typescript
export interface IDashboardEarningsService {
  /**
   * Returns an observable of daily earnings records for every date between startDate and endDate (inclusive).
   * Missing dates within the range will be populated with 0 values.
   */
  getDailyEarnings(startDate: string, endDate: string): Observable<DailyEarningsRecord[]>;

  /**
   * Returns an observable of the monthly earnings summary for a specified year and month (1-12).
   * For the current month, daysCount represents elapsed days up to today.
   * For past months, daysCount represents total calendar days in that month.
   */
  getMonthlyEarningsSummary(year: number, month: number): Observable<MonthlyEarningsSummary>;

  /**
   * Helper to compute start and end dates for standard presets.
   */
  getPresetDateRange(preset: 'last7' | 'last14' | 'last30'): { startDate: string; endDate: string };
}
```

---

## 2. Component Interface Contracts

### `EarningsChartComponent`
Presents the responsive SVG stacked bar chart.

```typescript
export interface IEarningsChartComponent {
  // Inputs
  records: InputSignal<DailyEarningsRecord[]>;

  // Internal states
  hoveredRecord: Signal<DailyEarningsRecord | null>;
  hoverPosition: Signal<{ x: number; y: number } | null>;

  // Computed layout properties
  viewBox: Signal<string>;
  maxDailyEarned: Signal<number>;
  bars: Signal<Array<{
    date: string;
    formattedDate: string;
    total: number;
    segments: Array<{
      source: string;
      color: string;
      amount: number;
      y: number;
      height: number;
    }>;
    x: number;
    width: number;
  }>>;
}
```

### `EarningsFilterComponent`
Allows toggling presets and choosing a custom date range.

```typescript
export interface IEarningsFilterComponent {
  // Inputs & Outputs
  filter: InputSignal<EarningsPeriodFilter>;
  filterChange: OutputEmitterRef<EarningsPeriodFilter>;

  // Methods
  selectPreset(preset: 'last7' | 'last14' | 'last30' | 'custom'): void;
  applyCustomRange(start: Date | null, end: Date | null): void;
}
```

### `EarningsStatsComponent`
Displays the monthly average card with navigation.

```typescript
export interface IEarningsStatsComponent {
  // Inputs & Outputs
  summary: InputSignal<MonthlyEarningsSummary | null>;
  monthChange: OutputEmitterRef<{ year: number; month: number }>;

  // Methods
  goToPreviousMonth(): void;
  goToNextMonth(): void;
}
```
