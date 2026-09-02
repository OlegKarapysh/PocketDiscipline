import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { DashboardEarningsService } from './services/dashboard-earnings.service';
import { UserService } from '../../core/services/user.service';
import { EarningsPeriodFilter } from './models/earnings-period-filter.model';
import { MonthChangeEvent } from './models/month-change-event.model';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  const earningsServiceMock = {
    getPresetDateRange: vi.fn().mockReturnValue({ startDate: '2026-08-27', endDate: '2026-09-02' }),
    getDailyEarnings: vi.fn().mockReturnValue(of([])),
    getMonthlyEarningsSummary: vi.fn().mockReturnValue(of(null)),
  };

  const userServiceMock = {
    user$: of({ id: 1, name: 'User', balance: 1000 }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DashboardEarningsService, useValue: earningsServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

  it('should update currentFilter when onFilterChange is triggered', () => {
    const newFilter: EarningsPeriodFilter = {
      preset: 'last14',
      startDate: '2026-08-20',
      endDate: '2026-09-02',
    };
    component.onFilterChange(newFilter);

    expect(component.currentFilter()).toEqual(newFilter);
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
});
