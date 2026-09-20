import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WithdrawalLedger } from './withdrawal-ledger';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import type { WithdrawalRecord } from '../../../../core/models/withdrawal.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';

describe('WithdrawalLedger', () => {
  let component: WithdrawalLedger;
  let fixture: ComponentFixture<WithdrawalLedger>;

  let mockCategories: RewardCategory[];
  let mockWithdrawals: WithdrawalRecord[];

  let mockWithdrawalService: {
    getWithdrawals: ReturnType<typeof vi.fn>;
    revertWithdrawal: ReturnType<typeof vi.fn>;
  };

  let mockCategoryService: {
    getCategories: ReturnType<typeof vi.fn>;
  };

  let mockDialog: {
    open: ReturnType<typeof vi.fn>;
  };

  let mockSnackBar: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockCategories = [
      {
        id: 'cat-1',
        name: 'Coffee & Treats',
        color: '#ff5722',
        icon: 'local_cafe',
        isDefault: true,
        isProtected: false,
        createdAt: 1000,
      },
      {
        id: 'cat-2',
        name: 'Books & Learning',
        color: '#2196f3',
        icon: 'menu_book',
        isDefault: true,
        isProtected: false,
        createdAt: 1000,
      },
    ];

    mockWithdrawals = [
      {
        id: 'w-1',
        title: 'Latte',
        amount: 65,
        categoryId: 'cat-1',
        notes: 'Oat milk latte',
        date: '2026-09-01',
        timestamp: 1725184800000,
        rewardId: null,
      },
      {
        id: 'w-2',
        title: 'Clean Architecture Book',
        amount: 450,
        categoryId: 'cat-2',
        notes: undefined,
        date: '2026-09-02',
        timestamp: 1725271200000,
        rewardId: 'reward-123',
      },
    ];

    mockWithdrawalService = {
      getWithdrawals: vi.fn().mockReturnValue(of(mockWithdrawals)),
      revertWithdrawal: vi.fn().mockResolvedValue(undefined),
    };

    mockCategoryService = {
      getCategories: vi.fn().mockReturnValue(of(mockCategories)),
    };

    mockDialog = {
      open: vi.fn(),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [WithdrawalLedger],
      providers: [
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalLedger);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load categories and withdrawals', () => {
    expect(component).toBeTruthy();
    expect(mockCategoryService.getCategories).toHaveBeenCalled();
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenCalled();
    expect(component.withdrawals().length).toBe(2);
    expect(component.categories().length).toBe(2);
  });

  it('should render withdrawal items with titles, amounts, and category info', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.ledger-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Latte');
    expect(items[0].textContent).toContain('-65 ₴');
    expect(items[0].textContent).toContain('Coffee & Treats');
    expect(items[0].textContent).toContain('Oat milk latte');

    expect(items[1].textContent).toContain('Clean Architecture Book');
    expect(items[1].textContent).toContain('-450 ₴');
    expect(items[1].textContent).toContain('Store Reward');
  });

  it('should show empty state when there are no withdrawals', () => {
    mockWithdrawalService.getWithdrawals.mockReturnValue(of([]));
    component.loadWithdrawals();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No withdrawals found');
  });

  it('should disable clear button by default and reload withdrawals when typing into search input', async () => {
    const clearBtn = fixture.debugElement.query(By.css('.clear-button')).nativeElement as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);

    const searchInput = fixture.debugElement.query(By.css('.search-field input')).nativeElement as HTMLInputElement;
    searchInput.value = 'Latte';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(clearBtn.disabled).toBe(false);
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenCalledWith(expect.objectContaining({
      searchQuery: 'Latte',
    }));
  });

  it('should reset filters and reload withdrawals when clear button is clicked in DOM', async () => {
    const searchInput = fixture.debugElement.query(By.css('.search-field input')).nativeElement as HTMLInputElement;
    searchInput.value = 'Latte';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const clearBtn = fixture.debugElement.query(By.css('.clear-button')).nativeElement as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(false);
    clearBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.searchQuery).toBe('');
    expect(component.selectedCategoryId).toBe('');
    expect(component.startDate).toBe('');
    expect(component.endDate).toBe('');
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenCalledWith({
      searchQuery: undefined,
      categoryId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('should open confirmation dialog when clicking revert button in DOM and refund balance when confirmed', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(true),
    });

    const revertButtons = fixture.debugElement.queryAll(By.css('.revert-button'));
    (revertButtons[0].nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockWithdrawalService.revertWithdrawal).toHaveBeenCalledWith('w-1');

    await Promise.resolve();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Withdrawal reverted and balance refunded',
      'Close',
      { duration: 3000 }
    );
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenCalledTimes(2);
  });

  it('should not revert withdrawal when dialog is cancelled', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(false),
    });

    const revertButtons = fixture.debugElement.queryAll(By.css('.revert-button'));
    (revertButtons[0].nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockWithdrawalService.revertWithdrawal).not.toHaveBeenCalled();
  });

  it('should show error snackbar when revert fails', async () => {
    mockWithdrawalService.revertWithdrawal.mockRejectedValue(new Error('DB error'));
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(true),
    });

    const revertButtons = fixture.debugElement.queryAll(By.css('.revert-button'));
    (revertButtons[0].nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Failed to revert withdrawal',
      'Close',
      { duration: 3000 }
    );
  });

  it('should cleanly unsubscribe on component destroy', () => {
    expect(() => { component.ngOnDestroy(); }).not.toThrow();
  });

  it('should show error snackbar when loading categories fails', () => {
    mockCategoryService.getCategories.mockReturnValue(throwError(() => new Error('Categories DB failure')));
    component.ngOnInit();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Categories DB failure', 'Close', { duration: 3000 });
  });

  it('should show error snackbar when loading withdrawals fails', () => {
    mockWithdrawalService.getWithdrawals.mockReturnValue(throwError(() => new Error('Withdrawals DB failure')));
    component.loadWithdrawals();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Withdrawals DB failure', 'Close', { duration: 3000 });
  });
});
