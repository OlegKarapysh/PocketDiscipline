import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EarningsChart } from './earnings-chart';
import type { DailyEarningsRecord } from '../../models/daily-earnings-record.model';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';

describe('EarningsChart', () => {
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

  const money = (value: number) => value.toLocaleString('uk-UA');
  const host = () => fixture.nativeElement as HTMLElement;
  const groups = () => Array.from(host().querySelectorAll('.chart-bar-group'));
  const ariaLabels = () => groups().map((group) => group.getAttribute('aria-label'));
  const heading = () => host().querySelector('app-section-card h2')?.textContent.trim();
  const tickLabels = () =>
    Array.from(host().querySelectorAll('.axis-label[text-anchor="end"]'), (label) => label.textContent.trim());
  const tooltip = () => host().querySelector('.chart-tooltip');
  // Each row is a label followed by an <app-amount>, which owns number formatting and the ₴ unit.
  const tooltipRows = () =>
    Array.from(tooltip()?.querySelectorAll('.tooltip-row') ?? [], (row) => [
      row.querySelector('.row-label')?.textContent.trim(),
      row.querySelector('app-amount')?.textContent,
      row.querySelector('.swatch')?.getAttribute('data-tone') ?? null,
    ]);

  const render = (records: DailyEarningsRecord[] | undefined) => {
    fixture.componentRef.setInput('records', records);
    fixture.detectChanges();
  };
  const tap = (index: number) => {
    groups()
      .at(index)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsChart],
    }).compileComponents();

    fixture = TestBed.createComponent(EarningsChart);
  });

  it('should draw one bar per day, stacking each source in its tone', () => {
    render(mockRecords);

    expect(groups()).toHaveLength(3);
    const tones = groups().map((group) =>
      Array.from(group.querySelectorAll('.bar-segment'), (segment) => segment.getAttribute('data-tone')),
    );
    // Goals, daily tasks, pomodoro, daily scores, bottom to top; a source that earned nothing is left out.
    expect(tones).toEqual([['reward', 'primary', 'inverse-primary'], [], ['reward']]);
    expect(groups().map((group) => group.querySelector('.zero-bar') !== null)).toEqual([false, true, false]);
  });

  it('should keep its frame but draw no bars, not even zero bars, before the records are read', () => {
    render(undefined);

    expect(heading()).toBe('Daily earnings');
    expect(host().querySelector('svg')).not.toBeNull();
    expect(groups()).toHaveLength(0);
  });

  it('should name the chart after its granularity', () => {
    render(mockRecords);

    expect(heading()).toBe('Daily earnings');
    expect(host().querySelector('svg')?.getAttribute('aria-label')).toBe('Daily earnings chart');
  });

  it('should list all four sources in the legend', () => {
    render(mockRecords);

    const items = Array.from(host().querySelectorAll('.legend-item'));
    expect(items.map((item) => item.textContent.trim())).toEqual(['Goals', 'Daily tasks', 'Pomodoro', 'Daily scores']);
    expect(items.map((item) => item.querySelector('.swatch')?.getAttribute('data-tone'))).toEqual([
      'reward',
      'primary',
      'inverse-primary',
      'secondary',
    ]);
  });

  it('should top the scale at the next multiple of 500, in four steps', () => {
    render(mockRecords);
    expect(tickLabels()).toEqual(['0', '375', '750', money(1125), money(1500)]);

    render([{ ...mockRecords[0], totalEarned: 1501 }]);
    expect(tickLabels().at(-1)).toBe(money(2000));
  });

  it('should keep the scale at 500 when nothing was earned', () => {
    render([]);

    expect(groups()).toHaveLength(0);
    expect(tickLabels().at(-1)).toBe('500');
  });

  it('should label each bar with its date and formatted total for screen readers', () => {
    render(mockRecords);

    expect(ariaLabels()).toEqual([`2026-08-27: ${money(1000)} ₴`, '2026-08-28: 0 ₴', `2026-08-29: ${money(1500)} ₴`]);
  });

  it('should show the total and each earning source in the tooltip of a tapped bar', () => {
    render(mockRecords);
    tap(0);

    expect(tooltip()?.querySelector('.tooltip-title')?.textContent.trim()).toBe('2026-08-27');
    expect(tooltipRows()).toEqual([
      ['Total', `${money(1000)}₴`, null],
      ['Goals', '500₴', 'reward'],
      ['Daily tasks', '200₴', 'primary'],
      ['Pomodoro', '300₴', 'inverse-primary'],
    ]);
    expect(tooltip()?.querySelector('.tooltip-row.emphasis .row-label')?.textContent.trim()).toBe('Total');
    expect(tooltip()?.querySelector('.tooltip-note')).toBeNull();
  });

  it('should say "No earnings recorded" in the tooltip of a day that earned nothing', () => {
    render(mockRecords);
    tap(1);

    expect(tooltipRows()).toEqual([['Total', '0₴', null]]);
    expect(tooltip()?.querySelector('.tooltip-note')?.textContent.trim()).toBe('No earnings recorded');
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

    const sumOfBars = () =>
      ariaLabels().reduce((sum, label) => sum + Number(label?.split(': ')[1].replace(/\D/g, '')), 0);
    const axisLabels = () =>
      Array.from(host().querySelectorAll('.chart-bar-group .axis-label'), (label) => label.textContent.trim());

    it('should still draw one bar per day for exactly 90 days', () => {
      render(daysFrom(2026, 0, 1, 90));

      expect(groups()).toHaveLength(90);
      expect(heading()).toBe('Daily earnings');
    });

    it('should draw one bar per calendar week, cut to the range, past 90 days', () => {
      // Thursday 1 January to Wednesday 1 April 2026: 91 days.
      render(daysFrom(2026, 0, 1, 91));

      expect(heading()).toBe('Weekly earnings');
      expect(groups()).toHaveLength(14);
      expect(sumOfBars()).toBe(910);
      expect(ariaLabels()[0]).toBe('2026-01-01 – 2026-01-04: 40 ₴');
      expect(ariaLabels()[1]).toBe('2026-01-05 – 2026-01-11: 70 ₴');
      expect(ariaLabels().at(-1)).toBe('2026-03-30 – 2026-04-01: 30 ₴');
    });

    it('should name the whole week in the tooltip', () => {
      render(daysFrom(2026, 0, 1, 91));
      tap(1);

      expect(tooltip()?.querySelector('.tooltip-title')?.textContent.trim()).toBe('2026-01-05 – 2026-01-11');
    });

    it('should draw one bar per calendar month once even weeks would be more than 90 bars', () => {
      // 15 January 2025 to 31 December 2026: about 103 weeks.
      render(daysFrom(2025, 0, 15, 716));

      expect(heading()).toBe('Monthly earnings');
      expect(groups()).toHaveLength(24);
      expect(sumOfBars()).toBe(7160);
      expect(ariaLabels()[0]).toBe('2025-01-15 – 2025-01-31: 170 ₴');
      expect(ariaLabels()[1]).toBe('2025-02-01 – 2025-02-28: 280 ₴');
      expect(axisLabels()[0]).toBe("Jan '25");
      expect(axisLabels().at(-1)).toBe("Dec '26");
    });

    it('should draw one bar per calendar year once even months would be more than 90 bars', () => {
      // 1 July 2010 to 31 December 2026: 198 months.
      render(daysFrom(2010, 6, 1, 6028));

      expect(heading()).toBe('Yearly earnings');
      expect(groups()).toHaveLength(17);
      expect(sumOfBars()).toBe(60_280);
      expect(ariaLabels()[0]).toBe(`2010-07-01 – 2010-12-31: ${money(1840)} ₴`);
      expect(ariaLabels().at(-1)).toMatch(/^2026-01-01 – 2026-12-31: /);
      expect(axisLabels()[0]).toBe('2010');
    });
  });
});
