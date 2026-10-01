import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Observable, of } from 'rxjs';
import { Dashboard } from './dashboard';
import { DashboardEarningsService } from './services/dashboard-earnings.service';
import { UserService } from '../../core/services/user.service';
import { ClockService } from '../../core/services/clock.service';
import type { EarningsPeriodFilter } from './models/earnings-period-filter.model';
import type { MonthChangeEvent } from './models/month-change-event.model';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let earningsServiceMock: {
    getPresetDateRange: ReturnType<typeof vi.fn>;
    getDailyEarnings: ReturnType<typeof vi.fn>;
    getMonthlyEarningsSummary: ReturnType<typeof vi.fn>;
  };
  let userServiceMock: {
    user$: Observable<{ id: number; name: string; balance: number }>;
  };
  const today = signal('2026-09-02');

  beforeEach(async () => {
    earningsServiceMock = {
      getPresetDateRange: vi.fn().mockReturnValue({ startDate: '2026-08-27', endDate: '2026-09-02' }),
      getDailyEarnings: vi.fn().mockReturnValue(of([])),
      getMonthlyEarningsSummary: vi.fn().mockReturnValue(of(null)),
    };

    userServiceMock = {
      user$: of({ id: 1, name: 'User', balance: 1000 }),
    };
    today.set('2026-09-02');

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DashboardEarningsService, useValue: earningsServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ClockService, useValue: { today } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should title the page "Today" with a single page header', () => {
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('app-page-header');
    expect(headers.length).toBe(1);
    expect(headers[0].querySelector('h1')?.textContent.trim()).toBe('Today');
  });

  it('should contain the balance widget', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-balance-widget')).toBeTruthy();
  });

  it('should contain the monthly earnings stats card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-earnings-stats')).toBeTruthy();
  });

  it('should contain the earnings filter controls', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-earnings-filter')).toBeTruthy();
  });

  it('should contain the daily earnings chart', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-earnings-chart')).toBeTruthy();
  });

  it('should keep a custom range exactly as chosen', () => {
    const customFilter: EarningsPeriodFilter = {
      preset: 'custom',
      startDate: '2026-08-20',
      endDate: '2026-08-25',
    };
    component.onFilterChange(customFilter);

    expect(component.currentFilter()).toEqual(customFilter);
  });

  it('should derive a preset range from the preset', () => {
    earningsServiceMock.getPresetDateRange.mockReturnValue({ startDate: '2026-08-20', endDate: '2026-09-02' });

    component.onFilterChange({ preset: 'last14', startDate: '', endDate: '' });

    expect(component.currentFilter()).toEqual({ preset: 'last14', startDate: '2026-08-20', endDate: '2026-09-02' });
    expect(earningsServiceMock.getPresetDateRange).toHaveBeenCalledWith('last14');
  });

  it('should move a preset range and re-query the month summary when the day changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const summaryQueries = earningsServiceMock.getMonthlyEarningsSummary.mock.calls.length;
    earningsServiceMock.getPresetDateRange.mockReturnValue({ startDate: '2026-08-28', endDate: '2026-09-03' });

    today.set('2026-09-03');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.currentFilter().endDate).toBe('2026-09-03');
    expect(earningsServiceMock.getDailyEarnings).toHaveBeenLastCalledWith('2026-08-28', '2026-09-03');
    expect(earningsServiceMock.getMonthlyEarningsSummary.mock.calls.length).toBeGreaterThan(summaryQueries);
  });

  it('should update selectedMonth when onMonthChange is triggered', () => {
    const newMonth: MonthChangeEvent = {
      year: 2026,
      month: 8,
    };
    component.onMonthChange(newMonth);

    expect(component.selectedMonth()).toEqual(newMonth);
  });

  it('should not contain the task lists', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-task-list')).toBeFalsy();
    expect(compiled.querySelector('app-daily-task-list')).toBeFalsy();
  });

  it('should handle service error gracefully in dailyEarnings stream', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress expected console error output
    });

    earningsServiceMock.getDailyEarnings.mockReturnValue(
      new Observable((subscriber) => {
        subscriber.error(new Error('IndexedDB error'));
      }),
    );

    component.onFilterChange({
      preset: 'last14',
      startDate: '2026-08-20',
      endDate: '2026-09-02',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.dailyEarnings()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle service error gracefully in monthlySummary stream', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress expected console error output
    });

    earningsServiceMock.getMonthlyEarningsSummary.mockReturnValue(
      new Observable((subscriber) => {
        subscriber.error(new Error('Monthly summary error'));
      }),
    );

    component.onMonthChange({
      year: 2026,
      month: 7,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.monthlySummary()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should return empty dailyEarnings without calling service when filter dates are missing', async () => {
    earningsServiceMock.getDailyEarnings.mockClear();

    component.onFilterChange({
      preset: 'custom',
      startDate: '',
      endDate: '',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.dailyEarnings()).toEqual([]);
    expect(earningsServiceMock.getDailyEarnings).not.toHaveBeenCalled();
  });

  it('should handle synchronous service errors gracefully in streams', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress expected console error output
    });

    earningsServiceMock.getDailyEarnings.mockImplementation(() => {
      throw new Error('Synchronous service error');
    });

    component.onFilterChange({
      preset: 'last30',
      startDate: '2026-08-04',
      endDate: '2026-09-02',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.dailyEarnings()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
