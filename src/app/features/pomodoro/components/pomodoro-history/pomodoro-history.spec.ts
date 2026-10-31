import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroHistory } from './pomodoro-history';
import { PomodoroHistoryChart } from '../pomodoro-history-chart/pomodoro-history-chart';
import { PeriodFilter } from '../../../../shared/components/period-filter/period-filter';
import type { PeriodFilterValue } from '../../../../shared/components/period-filter/period-filter-value.model';
import { ClockService } from '../../../../core/services/clock.service';
import type { DailyPomodoroTally } from '../../models/daily-pomodoro-tally.model';
import type { PomodoroPeriodSummary } from '../../models/pomodoro-period-summary.model';

describe('PomodoroHistory', () => {
  let fixture: ComponentFixture<PomodoroHistory>;

  const FILTER: PeriodFilterValue = { preset: 'last7', startDate: '2026-10-24', endDate: '2026-10-30' };
  const day = (date: string, work: number, study = 0): DailyPomodoroTally => ({
    date,
    pomodoros: work + study,
    byType: { work, study },
    focusMinutes: (work + study) * 25,
    rewardEarned: (work + study) * 25,
  });
  const summaryOf = (days: DailyPomodoroTally[]): PomodoroPeriodSummary => {
    const sum = (field: (d: DailyPomodoroTally) => number) => days.reduce((total, d) => total + field(d), 0);
    return {
      startDate: days[0].date,
      endDate: days.at(-1)?.date ?? '',
      days,
      total: {
        pomodoros: sum((d) => d.pomodoros),
        byType: { work: sum((d) => d.byType.work), study: sum((d) => d.byType.study) },
        focusMinutes: sum((d) => d.focusMinutes),
        rewardEarned: sum((d) => d.rewardEarned),
      },
    };
  };

  const render = (summary: PomodoroPeriodSummary | undefined) => {
    fixture.componentRef.setInput('summary', summary);
    fixture.componentRef.setInput('filter', FILTER);
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const shown = () => host().textContent.replace(/\s+/g, ' ');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PomodoroHistory],
      providers: [{ provide: ClockService, useValue: { today: signal('2026-10-30') } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroHistory);
  });

  it('should show the totals of the period under a History heading', () => {
    render(summaryOf([day('2026-10-29', 3, 1), day('2026-10-30', 2)]));

    expect(host().querySelector('h2')?.textContent.trim()).toBe('History');
    expect(shown()).toContain('6 pomodoros');
    expect(shown()).toContain('Work 5');
    expect(shown()).toContain('Study 1');
    expect(shown()).toContain('2 h 30 min focus');
  });

  it('should keep the period filter but show no totals and no empty message before the summary is read', () => {
    render(undefined);

    expect(fixture.debugElement.query(By.directive(PeriodFilter))).not.toBeNull();
    expect(host().querySelector('app-pomodoro-stats')).toBeNull();
    expect(host().querySelector('.empty')).toBeNull();
    expect(fixture.debugElement.query(By.directive(PomodoroHistoryChart))).toBeNull();
  });

  it('should chart the days of the summary', () => {
    const summary = summaryOf([day('2026-10-29', 3), day('2026-10-30', 0)]);
    render(summary);

    const chart = fixture.debugElement.query(By.directive(PomodoroHistoryChart));
    expect((chart.componentInstance as PomodoroHistoryChart).days()).toBe(summary.days);
    expect(host().querySelector('.empty')).toBeNull();
  });

  it('should say that no pomodoros were completed instead of drawing an empty chart', () => {
    render(summaryOf([day('2026-10-29', 0), day('2026-10-30', 0)]));

    expect(fixture.debugElement.query(By.directive(PomodoroHistoryChart))).toBeNull();
    expect(host().querySelector('.empty')?.textContent.trim()).toBe('No pomodoros were completed in this period.');
    expect(shown()).toContain('0 pomodoros');
  });

  it('should pass the filter to the period control and pass on its changes', () => {
    render(summaryOf([day('2026-10-30', 1)]));
    const emitted = vi.fn();
    fixture.componentInstance.filterChange.subscribe(emitted);

    const control = fixture.debugElement.query(By.directive(PeriodFilter)).componentInstance as PeriodFilter;
    expect(control.filter()).toEqual(FILTER);
    expect(control.ariaLabel()).toBe('Pomodoro history period');

    const thirtyDays: PeriodFilterValue = { preset: 'last30', startDate: '2026-10-01', endDate: '2026-10-30' };
    control.filterChange.emit(thirtyDays);
    expect(emitted).toHaveBeenCalledWith(thirtyDays);
  });
});
