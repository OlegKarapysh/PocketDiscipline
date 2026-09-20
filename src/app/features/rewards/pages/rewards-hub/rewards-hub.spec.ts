import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RewardsHubComponent } from './rewards-hub';
import { RewardsService } from '../../services/rewards.service';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import { SpendingAnalyticsService } from '../../services/spending-analytics.service';
import { UserService } from '../../../../core/services/user.service';
import { QuickSpendDialogComponent } from '../../components/quick-spend-dialog/quick-spend-dialog';

describe('RewardsHubComponent', () => {
  let component: RewardsHubComponent;
  let fixture: ComponentFixture<RewardsHubComponent>;

  let mockDialog: {
    open: ReturnType<typeof vi.fn>;
  };

  let mockSnackBar: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDialog = {
      open: vi.fn().mockReturnValue({
        afterClosed: () => of({ title: 'Coffee', amount: 50 }),
      }),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    const mockRewardsService = {
      getRewards: vi.fn().mockReturnValue(of([])),
      getActiveRewards: vi.fn().mockReturnValue(of([])),
      getClaimedRewards: vi.fn().mockReturnValue(of([])),
    };

    const mockWithdrawalService = {
      getWithdrawals: vi.fn().mockReturnValue(of([])),
    };

    const mockCategoryService = {
      getCategories: vi.fn().mockReturnValue(of([])),
    };

    const mockSpendingAnalyticsService = {
      getAnalytics: vi.fn().mockReturnValue(of({
        period: 'thisMonth',
        granularity: 'daily',
        totalSpent: 0,
        withdrawalCount: 0,
        categoryBreakdown: [],
        spendingTrend: [],
      })),
    };

    const mockUserService = {
      user$: of({ id: 'user_default', balance: 500 }),
      getUser: vi.fn().mockReturnValue(of({ id: 'user_default', balance: 500 })),
    };

    await TestBed.configureTestingModule({
      imports: [RewardsHubComponent],
      providers: [
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: RewardsService, useValue: mockRewardsService },
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: SpendingAnalyticsService, useValue: mockSpendingAnalyticsService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RewardsHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render action button and tab labels', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.quick-spend-action-button')).toBeTruthy();

    const tabs = compiled.querySelectorAll('.mat-mdc-tab');
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toContain('Reward Store');
    expect(tabs[1].textContent).toContain('History / Ledger');
    expect(tabs[2].textContent).toContain('Analytics');
    expect(compiled.querySelector('app-reward-store')).toBeTruthy();
  });

  it('should open Quick Spend dialog and show snackbar when submitted via DOM button click', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.quick-spend-action-button')!;
    button.click();

    expect(mockDialog.open).toHaveBeenCalledWith(QuickSpendDialogComponent, {
      width: '400px',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Quick spend "Coffee" recorded',
      'Close',
      { duration: 3000 }
    );
  });

  it('should not display snackbar when Quick Spend dialog is dismissed without submission', () => {
    mockDialog.open.mockReturnValueOnce({
      afterClosed: () => of(undefined),
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.quick-spend-action-button')!;
    button.click();

    expect(mockDialog.open).toHaveBeenCalledWith(QuickSpendDialogComponent, {
      width: '400px',
    });
    expect(mockSnackBar.open).not.toHaveBeenCalled();
  });
});
