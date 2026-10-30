import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { PomodoroHistoryChart } from './pomodoro-history-chart';
import type { DailyPomodoroTally } from '../../models/daily-pomodoro-tally.model';

describe('PomodoroHistoryChart', () => {
  let fixture: ComponentFixture<PomodoroHistoryChart>;

  const day = (date: string, work = 0, study = 0): DailyPomodoroTally => ({
    date,
    pomodoros: work + study,
    byType: { work, study },
    focusMinutes: (work + study) * 25,
    rewardEarned: (work + study) * 25,
  });
  // Consecutive days from a date, each with the given work pomodoros.
  const daysFrom = (year: number, monthIndex: number, dayOfMonth: number, works: number[]) =>
    works.map((work, i) => day(new Date(year, monthIndex, dayOfMonth + i).toLocaleDateString(DATE_LOCALE_CA), work));

  const render = (days: DailyPomodoroTally[]) => {
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const groups = () => Array.from(host().querySelectorAll('.chart-bar-group'));
  const ariaLabels = () => groups().map((group) => group.getAttribute('aria-label'));
  const tickLabels = () =>
    Array.from(host().querySelectorAll('.axis-label[text-anchor="end"]'), (label) => label.textContent.trim());
  const tooltip = () => host().querySelector('.chart-tooltip');
  const tooltipRows = () =>
    Array.from(tooltip()?.querySelectorAll('.tooltip-row') ?? [], (row) => [
      row.querySelector('.row-label')?.textContent.trim(),
      row.querySelector('.row-text')?.textContent.trim(),
    ]);
  const tap = (index: number) => {
    groups()
      .at(index)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PomodoroHistoryChart],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroHistoryChart);
  });

  it('should draw one bar per day in date order, keeping empty days in their place', () => {
    render(daysFrom(2026, 9, 24, [2, 0, 3, 0, 0, 1, 4]));

    expect(host().querySelector('svg')?.getAttribute('aria-label')).toBe('Daily pomodoros chart');
    expect(ariaLabels()).toEqual([
      '2026-10-24: 2 pomodoros',
      '2026-10-25: 0 pomodoros',
      '2026-10-26: 3 pomodoros',
      '2026-10-27: 0 pomodoros',
      '2026-10-28: 0 pomodoros',
      '2026-10-29: 1 pomodoro',
      '2026-10-30: 4 pomodoros',
    ]);
    expect(groups().map((group) => group.querySelector('.zero-bar') !== null)).toEqual([
      false,
      true,
      false,
      true,
      true,
      false,
      false,
    ]);
  });

  it('should draw every bar in the primary tone, without a legend', () => {
    render(daysFrom(2026, 9, 24, [2, 1]));

    const tones = Array.from(host().querySelectorAll('.bar-segment'), (segment) => segment.getAttribute('data-tone'));
    expect(tones).toEqual(['primary', 'primary']);
    expect(host().querySelector('.legend-container')).toBeNull();
  });

  it.each([
    [0, ['0', '1', '2', '3', '4']],
    [3, ['0', '1', '2', '3', '4']],
    [5, ['0', '2', '4', '6', '8']],
    [17, ['0', '5', '10', '15', '20']],
  ])('should label the y-axis in whole numbers when the most in a day is %i', (most, ticks) => {
    render(daysFrom(2026, 9, 29, [most, 0]));

    expect(tickLabels()).toEqual(ticks);
  });

  it('should show the date, the count and the split by type in the tooltip of a tapped day', () => {
    render([day('2026-10-29', 3, 1), day('2026-10-30')]);
    tap(0);

    expect(tooltip()?.querySelector('.tooltip-title')?.textContent.trim()).toBe('2026-10-29');
    expect(tooltipRows()).toEqual([
      ['Pomodoros', '4'],
      ['Work', '3'],
      ['Study', '1'],
    ]);
    expect(tooltip()?.querySelector('.tooltip-row.emphasis .row-label')?.textContent.trim()).toBe('Pomodoros');
  });

  it('should say "No pomodoros" in the tooltip of an empty day', () => {
    render([day('2026-10-29', 3, 1), day('2026-10-30')]);
    tap(1);

    expect(tooltipRows()).toEqual([['Pomodoros', '0']]);
    expect(tooltip()?.querySelector('.tooltip-note')?.textContent.trim()).toBe('No pomodoros');
  });

  describe('ranges longer than 90 days', () => {
    it('should draw one bar per calendar week, and sum the whole week in its tooltip', () => {
      // Thursday 1 January to Wednesday 1 April 2026: 91 days, one work pomodoro on each.
      render(
        daysFrom(
          2026,
          0,
          1,
          Array.from({ length: 91 }, () => 1),
        ),
      );

      expect(host().querySelector('svg')?.getAttribute('aria-label')).toBe('Weekly pomodoros chart');
      expect(groups()).toHaveLength(14);
      expect(ariaLabels()[0]).toBe('2026-01-01 – 2026-01-04: 4 pomodoros');
      expect(ariaLabels()[1]).toBe('2026-01-05 – 2026-01-11: 7 pomodoros');

      tap(1);
      expect(tooltip()?.querySelector('.tooltip-title')?.textContent.trim()).toBe('2026-01-05 – 2026-01-11');
      expect(tooltipRows()).toEqual([
        ['Pomodoros', '7'],
        ['Work', '7'],
        ['Study', '0'],
      ]);
    });

    it('should draw one bar per calendar month once even weeks would be more than 90 bars', () => {
      // 15 January 2025 to 31 December 2026: about 103 weeks.
      render(
        daysFrom(
          2025,
          0,
          15,
          Array.from({ length: 716 }, () => 1),
        ),
      );

      expect(host().querySelector('svg')?.getAttribute('aria-label')).toBe('Monthly pomodoros chart');
      expect(groups()).toHaveLength(24);
      expect(ariaLabels()[0]).toBe('2025-01-15 – 2025-01-31: 17 pomodoros');
      expect(ariaLabels()[1]).toBe('2025-02-01 – 2025-02-28: 28 pomodoros');
    });
  });
});
