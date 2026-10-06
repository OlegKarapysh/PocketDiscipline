import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClockService } from '../../../../core/services/clock.service';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpendingAnalytics } from './spending-analytics';
import { SpendingAnalyticsService } from '../../services/spending-analytics.service';
import type { SpendingAnalyticsSummary } from '../../models/spending-analytics.model';

describe('SpendingAnalytics', () => {
  let component: SpendingAnalytics;
  let fixture: ComponentFixture<SpendingAnalytics>;

  let mockSummaryWithData: SpendingAnalyticsSummary;
  let mockEmptySummary: SpendingAnalyticsSummary;

  let mockAnalyticsService: {
    getAnalytics: ReturnType<typeof vi.fn>;
  };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  const today = signal('2026-09-30');

  beforeEach(async () => {
    mockSummaryWithData = {
      period: 'thisMonth',
      granularity: 'daily',
      totalSpent: 1000,
      withdrawalCount: 4,
      categoryBreakdown: [
        {
          categoryId: 'cat-food',
          categoryName: 'Food & Treats',
          color: '#ff9800',
          icon: 'fastfood',
          totalSpent: 700,
          percentage: 70,
        },
        {
          categoryId: 'cat-books',
          categoryName: 'Books & Learning',
          color: '#2196f3',
          icon: 'menu_book',
          totalSpent: 300,
          percentage: 30,
        },
      ],
      spendingTrend: [
        { dateOrMonth: '2026-09-01', label: '1 Sep', amount: 300 },
        { dateOrMonth: '2026-09-02', label: '2 Sep', amount: 700 },
      ],
    };

    mockEmptySummary = {
      period: 'thisMonth',
      granularity: 'daily',
      totalSpent: 0,
      withdrawalCount: 0,
      categoryBreakdown: [],
      spendingTrend: [],
    };

    snackBarMock = { open: vi.fn() };
    today.set('2026-09-30');
    mockAnalyticsService = {
      getAnalytics: vi.fn().mockReturnValue(of(mockSummaryWithData)),
    };

    await TestBed.configureTestingModule({
      imports: [SpendingAnalytics],
      providers: [
        { provide: SpendingAnalyticsService, useValue: mockAnalyticsService },
        { provide: ClockService, useValue: { today } },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingAnalytics);
    component = fixture.componentInstance;
  });

  it('should initialize with default period and load analytics', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.selectedPeriod()).toBe('thisMonth');
    expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith('thisMonth');

    expect(component.analytics().totalSpent).toBe(1000);
    expect(component.topCategory()?.categoryName).toBe('Food & Treats');
    expect(component.averagePerWithdrawal()).toBe(250);
  });

  it('should round the average spend to whole hryvnias', () => {
    // 10 ₴ over four withdrawals is 2.50 ₴, shown as 3 ₴.
    mockAnalyticsService.getAnalytics.mockReturnValue(of({ ...mockSummaryWithData, totalSpent: 10 }));
    fixture = TestBed.createComponent(SpendingAnalytics);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.averagePerWithdrawal()).toBe(3);
  });

  it('should render metric values in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const cards = compiled.querySelectorAll('app-stat-card');
    expect(cards[0].textContent).toMatch(/1\s000\s*₴/);
    expect(cards[1].textContent).toContain('4');
    expect(cards[2].textContent).toContain('Food & Treats');
    expect(cards[2].textContent).toContain('70%');
    expect(cards[3].textContent).toMatch(/250\s*₴/);
  });

  it('should render charts when spending data is present', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-spending-donut-chart')).toBeTruthy();
    expect(compiled.querySelector('app-spending-trend-chart')).toBeTruthy();
    expect(compiled.querySelector('app-empty-state')).toBeFalsy();
  });

  it('should render empty state when totalSpent is zero', () => {
    mockAnalyticsService.getAnalytics.mockReturnValue(of(mockEmptySummary));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No spending data in this period');
    expect(compiled.querySelector('app-spending-donut-chart')).toBeFalsy();
  });

  it('should reload analytics when clicking period toggle button in DOM', () => {
    fixture.detectChanges();

    const toggleButtons = fixture.debugElement.queryAll(By.css('mat-button-toggle button'));
    expect(toggleButtons.length).toBe(4);

    (toggleButtons[1].nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.selectedPeriod()).toBe('last30');
    expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith('last30');
  });

  it('should tear down cleanly when the component is destroyed', () => {
    fixture.detectChanges();
    expect(() => {
      fixture.destroy();
    }).not.toThrow();
  });

  it('should re-query the selected period when the day changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const queries = mockAnalyticsService.getAnalytics.mock.calls.length;

    today.set('2026-10-01');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockAnalyticsService.getAnalytics.mock.calls.length).toBe(queries + 1);
    expect(mockAnalyticsService.getAnalytics).toHaveBeenLastCalledWith('thisMonth');
  });

  it('should report a failed analytics query instead of breaking the view', async () => {
    mockAnalyticsService.getAnalytics.mockReturnValue(throwError(() => new Error('Database connection lost')));
    fixture = TestBed.createComponent(SpendingAnalytics);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.analytics().totalSpent).toBe(0);
    expect(snackBarMock.open).toHaveBeenCalledWith('Database connection lost', 'Close', expect.any(Object));
  });
});
