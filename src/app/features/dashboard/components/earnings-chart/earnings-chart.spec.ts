import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EarningsChart } from './earnings-chart';
import type { DailyEarningsRecord } from '../../models/daily-earnings-record.model';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';

describe('EarningsChart', () => {
  let component: EarningsChart;
  let fixture: ComponentFixture<EarningsChart>;

  const mockRecords: DailyEarningsRecord[] = [
    {
      date: '2026-08-27',
      totalEarned: 1000,
      goalsEarned: 500,
      dailyTasksEarned: 200,
      pomodoroEarned: 300,
      dailyScoresEarned: 0,
    },
    {
      date: '2026-08-28',
      totalEarned: 0,
      goalsEarned: 0,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    },
    {
      date: '2026-08-29',
      totalEarned: 1500,
      goalsEarned: 1500,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    },
  ];

  const bucketAt = (index: number) => component.bars()[index].bucket;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsChart],
    }).compileComponents();

    fixture = TestBed.createComponent(EarningsChart);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute bars corresponding to records input', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const bars = component.bars();
    expect(bars.length).toBe(3);
    expect(bars[0].total).toBe(1000);
    expect(bars[1].total).toBe(0);
    expect(bars[2].total).toBe(1500);
  });

  it('should render svg element with bars in template', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const svg = compiled.querySelector('svg');
    expect(svg).toBeTruthy();

    const barGroups = compiled.querySelectorAll('.chart-bar-group');
    expect(barGroups.length).toBe(3);
  });

  it('should compute stacked segments for multi-source earnings', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const day1Bars = component.bars()[0];
    expect(day1Bars.segments.length).toBe(3); // goals (500), tasks (200), pomodoro (300)
    expect(day1Bars.segments.map((s) => s.source)).toEqual(['goals', 'dailyTasks', 'pomodoro']);
  });

  it('should update hover state on mouse enter and clear on mouse leave', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(bucketAt(0), { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredBucket()).toBe(bucketAt(0));
    expect(component.tooltipPosition()).toEqual({ x: 110, y: 215 });

    component.onBarMouseLeave();
    expect(component.hoveredBucket()).toBeNull();
    expect(component.tooltipPosition()).toBeNull();
  });

  it('should correctly stack segment heights and positions from baseline', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const day1Bars = component.bars()[0];
    // Baseline is 225
    // Each segment must stack above the previous
    expect(day1Bars.segments.length).toBe(3);
    const goalsSeg = day1Bars.segments[0];
    const tasksSeg = day1Bars.segments[1];
    const pomodoroSeg = day1Bars.segments[2];

    expect(goalsSeg.y).toBeGreaterThan(tasksSeg.y);
    expect(tasksSeg.y).toBeGreaterThan(pomodoroSeg.y);
  });

  it('should render tooltip breakdown when hovered', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(bucketAt(0), { clientX: 100, clientY: 200 } as MouseEvent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tooltip = compiled.querySelector('.chart-tooltip');
    expect(tooltip).toBeTruthy();
    // Each row is a label followed by an <app-amount>, which owns number formatting and the ₴ unit.
    const rows = Array.from(tooltip?.querySelectorAll('.tooltip-row') ?? [], (row) => [
      row.querySelector('span:not(.swatch)')?.textContent.trim(),
      row.querySelector('app-amount')?.textContent,
    ]);
    const amount = (value: number) => `${value.toLocaleString('uk-UA')}₴`;
    expect(rows).toHaveLength(4);
    expect(rows).toEqual(
      expect.arrayContaining([
        ['Total', amount(1000)],
        ['Goals', amount(500)],
        ['Daily tasks', amount(200)],
        ['Pomodoro', amount(300)],
      ]),
    );
  });

  it('should label each bar with its date and formatted total for screen readers', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const firstBar = (fixture.nativeElement as HTMLElement).querySelector('.chart-bar-group');
    expect(firstBar?.getAttribute('aria-label')).toBe(`2026-08-27: ${(1000).toLocaleString('uk-UA')} ₴`);
  });

  it('should round the y-axis scale up to the next 500', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    expect(component.maxBarTotal()).toBe(1500);
    expect(component.gridLines().at(-1)?.label).toBe((1500).toLocaleString('uk-UA'));

    fixture.componentRef.setInput('records', [{ ...mockRecords[0], totalEarned: 1501 }]);
    fixture.detectChanges();
    expect(component.maxBarTotal()).toBe(2000);
  });

  it('should toggle tooltip on bar click', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarClick(bucketAt(0), { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredBucket()).toBe(bucketAt(0));

    // Second click on same bar dismisses it
    component.onBarClick(bucketAt(0), { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredBucket()).toBeNull();
  });

  it('should thin labels when record count exceeds 16', () => {
    const manyRecords: DailyEarningsRecord[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      totalEarned: 100,
      goalsEarned: 100,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    }));

    fixture.componentRef.setInput('records', manyRecords);
    fixture.detectChanges();

    const bars = component.bars();
    expect(bars.length).toBe(30);
    const visibleLabels = bars.filter((b) => b.shouldShowLabel);
    expect(visibleLabels.length).toBeLessThan(30);
    expect(visibleLabels.length).toBeGreaterThan(0);
    expect(bars[0].shouldShowLabel).toBe(true);
    expect(bars[29].shouldShowLabel).toBe(true);
  });

  it('should leave room for the widest y-axis total before the plot starts', () => {
    fixture.componentRef.setInput('records', [{ ...mockRecords[0], totalEarned: 138_700, goalsEarned: 138_700 }]);
    fixture.detectChanges();

    // The top label is "139 000": seven 11px Geist Mono glyphs, about 44.7px wide, drawn
    // right-aligned at yAxisTextX, so it needs that much room to its left.
    expect(component.gridLines().at(-1)?.label.replace(/\s/g, ' ')).toBe('139 000');
    expect(component.yAxisTextX()).toBeGreaterThanOrEqual(45);
    expect(component.bars()[0].x).toBeGreaterThan(component.yAxisTextX());
  });

  describe('date labels by chart width', () => {
    const week: DailyEarningsRecord[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      totalEarned: 100,
      goalsEarned: 100,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    }));

    const labelCentres = () =>
      component
        .bars()
        .filter((bar) => bar.shouldShowLabel)
        .map((bar) => bar.x + bar.width / 2);

    it('should label every day of a week on a wide chart', () => {
      component.width.set(600);
      fixture.componentRef.setInput('records', week);
      fixture.detectChanges();

      expect(labelCentres()).toHaveLength(7);
    });

    it('should keep neighbouring labels from overlapping on a phone-width chart', () => {
      component.width.set(280);
      fixture.componentRef.setInput('records', week);
      fixture.detectChanges();

      const centres = labelCentres();
      const gaps = centres.slice(1).map((centre, i) => centre - centres[i]);
      // A label such as "09/24" is five 11px Geist Mono glyphs, about 32px wide.
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(32);
    });
  });

  it('should handle empty records gracefully', () => {
    fixture.componentRef.setInput('records', []);
    fixture.detectChanges();

    expect(component.bars().length).toBe(0);
    expect(component.maxBarTotal()).toBe(500);
  });

  it('should update tooltip position on mouse move if bar is hovered', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(bucketAt(0), { clientX: 100, clientY: 200 } as MouseEvent);
    component.onBarMouseMove({ clientX: 150, clientY: 250 } as MouseEvent);

    expect(component.tooltipPosition()).toEqual({ x: 160, y: 265 });
  });

  it('should display "No earnings recorded" in tooltip when day total is 0', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(bucketAt(1), { clientX: 100, clientY: 200 } as MouseEvent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tooltip = compiled.querySelector('.chart-tooltip');
    expect(tooltip?.textContent).toContain('No earnings recorded');
  });

  describe('ranges longer than 90 days', () => {
    // Every day of the range earns 10 ₴, all of it from goals.
    const daysFrom = (year: number, monthIndex: number, day: number, count: number): DailyEarningsRecord[] =>
      Array.from({ length: count }, (_, i) => ({
        date: new Date(year, monthIndex, day + i).toLocaleDateString(DATE_LOCALE_CA),
        totalEarned: 10,
        goalsEarned: 10,
        dailyTasksEarned: 0,
        pomodoroEarned: 0,
        dailyScoresEarned: 0,
      }));

    const sumOfBars = () => component.bars().reduce((sum, bar) => sum + bar.total, 0);

    it('should still draw one bar per day for exactly 90 days', () => {
      fixture.componentRef.setInput('records', daysFrom(2026, 0, 1, 90));
      fixture.detectChanges();

      expect(component.bars()).toHaveLength(90);
      expect(component.heading()).toBe('Daily earnings');
    });

    it('should draw one bar per calendar week, cut to the range, past 90 days', () => {
      // Thursday 1 January to Wednesday 1 April 2026: 91 days.
      fixture.componentRef.setInput('records', daysFrom(2026, 0, 1, 91));
      fixture.detectChanges();

      const bars = component.bars();
      expect(component.heading()).toBe('Weekly earnings');
      expect(bars).toHaveLength(14);
      expect(sumOfBars()).toBe(910);
      expect(bars[0].bucket).toMatchObject({ startDate: '2026-01-01', endDate: '2026-01-04', goalsEarned: 40 });
      expect(bars[1].bucket).toMatchObject({ startDate: '2026-01-05', endDate: '2026-01-11', totalEarned: 70 });
      expect(bars.at(-1)?.bucket).toMatchObject({ startDate: '2026-03-30', endDate: '2026-04-01', totalEarned: 30 });
    });

    it('should name the whole week in the bar label and the tooltip', () => {
      fixture.componentRef.setInput('records', daysFrom(2026, 0, 1, 91));
      fixture.detectChanges();

      const firstBar = (fixture.nativeElement as HTMLElement).querySelector('.chart-bar-group');
      expect(firstBar?.getAttribute('aria-label')).toBe('2026-01-01 – 2026-01-04: 40 ₴');

      component.onBarMouseEnter(bucketAt(1), { clientX: 100, clientY: 200 } as MouseEvent);
      fixture.detectChanges();
      const tooltipDate = (fixture.nativeElement as HTMLElement).querySelector('.tooltip-date');
      expect(tooltipDate?.textContent.trim()).toBe('2026-01-05 – 2026-01-11');
    });

    it('should draw one bar per calendar month once even weeks would be more than 90 bars', () => {
      // 15 January 2025 to 31 December 2026: about 103 weeks.
      fixture.componentRef.setInput('records', daysFrom(2025, 0, 15, 716));
      fixture.detectChanges();

      const bars = component.bars();
      expect(component.heading()).toBe('Monthly earnings');
      expect(bars).toHaveLength(24);
      expect(sumOfBars()).toBe(7160);
      expect(bars[0].bucket).toMatchObject({ startDate: '2025-01-15', endDate: '2025-01-31', totalEarned: 170 });
      expect(bars[1].bucket).toMatchObject({ startDate: '2025-02-01', endDate: '2025-02-28', totalEarned: 280 });
      expect(bars[0].axisLabel).toBe("Jan '25");
      expect(bars.at(-1)?.axisLabel).toBe("Dec '26");
    });

    it('should keep month labels from overlapping on a phone-width chart', () => {
      component.width.set(280);
      fixture.componentRef.setInput('records', daysFrom(2025, 0, 15, 716));
      fixture.detectChanges();

      const centres = component
        .bars()
        .filter((bar) => bar.shouldShowLabel)
        .map((bar) => bar.x + bar.width / 2);
      const gaps = centres.slice(1).map((centre, i) => centre - centres[i]);
      // A label such as "Jan '25" is seven 11px Geist Mono glyphs, about 46px wide.
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(46);
    });

    it('should keep the last month label inside a phone-width chart', () => {
      component.width.set(280);
      fixture.componentRef.setInput('records', daysFrom(2025, 0, 15, 716));
      fixture.detectChanges();

      // "Dec '26" is drawn centred on axisLabelX, so half of its width lies to the right.
      const lastLabelRightEdge = (component.bars().at(-1)?.axisLabelX ?? 0) + (7 * 6.6) / 2;
      expect(lastLabelRightEdge).toBeLessThanOrEqual(280);
    });
  });
});
