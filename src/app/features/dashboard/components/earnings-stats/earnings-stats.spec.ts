import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EarningsStats } from './earnings-stats';
import type { MonthlyEarningsSummary } from '../../models/monthly-earnings-summary.model';

describe('EarningsStats', () => {
  let component: EarningsStats;
  let fixture: ComponentFixture<EarningsStats>;

  const mockSummary: MonthlyEarningsSummary = {
    year: 2026,
    month: 9,
    monthLabel: 'September 2026',
    totalEarned: 3000,
    daysCount: 2,
    averageEarnedPerDay: 1500,
    isCurrentMonth: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsStats],
    }).compileComponents();

    fixture = TestBed.createComponent(EarningsStats);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display monthly summary details', () => {
    fixture.componentRef.setInput('summary', mockSummary);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('September 2026');
    const [average, total] = Array.from(compiled.querySelectorAll('app-stat-card'));
    expect(average.textContent).toContain('Daily average');
    expect(average.querySelector('app-amount')?.textContent).toBe(`${(1500).toLocaleString('uk-UA')}₴/day`);
    expect(average.textContent).toContain('Based on 2 elapsed days');
    expect(total.textContent).toContain('Total earned');
    expect(total.querySelector('app-amount')?.textContent).toBe(`${(3000).toLocaleString('uk-UA')}₴`);
  });

  it('should navigate to previous month and emit monthChange', () => {
    const spy = vi.fn();
    component.monthChange.subscribe(spy);

    component.currentYear.set(2026);
    component.currentMonth.set(9);
    component.goToPreviousMonth();

    expect(component.currentMonth()).toBe(8);
    expect(component.currentYear()).toBe(2026);
    expect(spy).toHaveBeenCalledWith({ year: 2026, month: 8 });
  });

  it('should roll over to December of previous year when navigating back from January', () => {
    const spy = vi.fn();
    component.monthChange.subscribe(spy);

    component.currentYear.set(2026);
    component.currentMonth.set(1);
    component.goToPreviousMonth();

    expect(component.currentMonth()).toBe(12);
    expect(component.currentYear()).toBe(2025);
    expect(spy).toHaveBeenCalledWith({ year: 2025, month: 12 });
  });

  it('should navigate to next month and emit monthChange when viewing a past month', () => {
    const spy = vi.fn();
    component.monthChange.subscribe(spy);

    component.currentYear.set(2026);
    component.currentMonth.set(7);
    component.goToNextMonth();

    expect(component.currentMonth()).toBe(8);
    expect(component.currentYear()).toBe(2026);
    expect(spy).toHaveBeenCalledWith({ year: 2026, month: 8 });
  });

  it('should disable next month button and block navigation when on current month', () => {
    const spy = vi.fn();
    component.monthChange.subscribe(spy);

    const now = new Date();
    component.currentYear.set(now.getFullYear());
    component.currentMonth.set(now.getMonth() + 1);
    fixture.detectChanges();

    expect(component.isNextDisabled()).toBe(true);

    const nextBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Next month"]',
    );
    expect(nextBtn?.disabled).toBe(true);

    component.goToNextMonth();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should display friendly empty earnings indicator when totalEarned is 0', () => {
    const zeroSummary: MonthlyEarningsSummary = {
      year: 2026,
      month: 8,
      monthLabel: 'August 2026',
      totalEarned: 0,
      daysCount: 31,
      averageEarnedPerDay: 0,
      isCurrentMonth: false,
    };

    fixture.componentRef.setInput('summary', zeroSummary);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyIndicator = compiled.querySelector('.empty-earnings-indicator');
    expect(emptyIndicator).toBeTruthy();
    expect(emptyIndicator?.textContent).toContain('No earnings recorded for this month');
    expect(compiled.textContent).toContain('Based on 31 calendar days');
  });

  it('should not display empty earnings indicator when totalEarned is greater than 0', () => {
    fixture.componentRef.setInput('summary', mockSummary);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyIndicator = compiled.querySelector('.empty-earnings-indicator');
    expect(emptyIndicator).toBeFalsy();
  });

  it('should not render stat content when summary is null', () => {
    fixture.componentRef.setInput('summary', null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-stat-card')).toBeNull();
    expect(compiled.querySelector('.empty-earnings-indicator')).toBeNull();
  });
});
