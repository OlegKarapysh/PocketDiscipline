import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

    mockAnalyticsService = {
      getAnalytics: vi.fn().mockReturnValue(of(mockSummaryWithData)),
    };

    await TestBed.configureTestingModule({
      imports: [SpendingAnalytics],
      providers: [
        { provide: SpendingAnalyticsService, useValue: mockAnalyticsService },
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

  it('should render metric values in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('1000 ₴');
    expect(compiled.textContent).toContain('4');
    expect(compiled.textContent).toContain('Food & Treats');
    expect(compiled.textContent).toContain('250 ₴');
  });

  it('should render charts when spending data is present', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-spending-donut-chart')).toBeTruthy();
    expect(compiled.querySelector('app-spending-trend-chart')).toBeTruthy();
    expect(compiled.querySelector('.empty-analytics')).toBeFalsy();
  });

  it('should render empty state when totalSpent is zero', () => {
    mockAnalyticsService.getAnalytics.mockReturnValue(of(mockEmptySummary));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-analytics')).toBeTruthy();
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

  it('should cleanly unsubscribe on component destroy', () => {
    fixture.detectChanges();
    expect(() => { component.ngOnDestroy(); }).not.toThrow();
  });
});
