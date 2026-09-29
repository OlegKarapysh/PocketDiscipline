import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WithdrawalLedger } from './withdrawal-ledger';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import type { WithdrawalRecord } from '../../../../core/models/withdrawal.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';

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
    show: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
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
      show: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [WithdrawalLedger],
      providers: [
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: SnackBarService, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalLedger);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  async function typeInto(selector: string, value: string): Promise<void> {
    const input = fixture.debugElement.query(By.css(selector)).nativeElement as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

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
    expect(items[0].querySelector('app-amount')?.textContent).toMatch(/-65\s*₴/);
    expect(items[0].textContent).toContain('Coffee & Treats');
    expect(items[0].textContent).toContain('Oat milk latte');
    expect(items[0].textContent).not.toContain('Store reward');

    expect(items[1].textContent).toContain('Clean Architecture Book');
    expect(items[1].querySelector('app-amount')?.textContent).toMatch(/-450\s*₴/);
    expect(items[1].textContent).toContain('Store reward');
  });

  it('should paint each row with its category colour and fall back for an unknown category', () => {
    const orphan: WithdrawalRecord = { ...mockWithdrawals[0], id: 'w-3', categoryId: 'deleted' };
    mockWithdrawalService.getWithdrawals.mockReturnValue(of([mockWithdrawals[0], orphan]));

    const f = TestBed.createComponent(WithdrawalLedger);
    f.detectChanges();

    const items = (f.nativeElement as HTMLElement).querySelectorAll('.ledger-item');
    const known = items[0].querySelector<HTMLElement>('.category-indicator');
    const unknown = items[1].querySelector<HTMLElement>('.category-indicator');

    expect(known?.style.backgroundColor).not.toBe('');
    expect(known?.textContent).toContain('local_cafe');
    expect(unknown?.style.backgroundColor).toBe('');
    expect(unknown?.textContent).toContain('category');
    expect(items[1].textContent).toContain('Uncategorized');
  });

  it('should show empty state when there are no withdrawals', async () => {
    mockWithdrawalService.getWithdrawals.mockReturnValue(of([]));
    await typeInto('.search-field input', 'nothing matches');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No withdrawals found');
  });

  it('should disable clear button by default and reload withdrawals when typing into search input', async () => {
    const clearBtn = fixture.debugElement.query(By.css('.clear-button')).nativeElement as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);

    await typeInto('.search-field input', 'Latte');

    expect(clearBtn.disabled).toBe(false);
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'Latte',
      }),
    );
  });

  it('should reset filters and reload withdrawals when clear button is clicked in DOM', async () => {
    await typeInto('.search-field input', 'Latte');

    const clearBtn = fixture.debugElement.query(By.css('.clear-button')).nativeElement as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(false);
    clearBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const searchInput = fixture.debugElement.query(By.css('.search-field input')).nativeElement as HTMLInputElement;
    expect(searchInput.value).toBe('');
    expect(clearBtn.disabled).toBe(true);
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenLastCalledWith({
      searchQuery: undefined,
      categoryId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('should query by date range when both dates are set in order', async () => {
    await typeInto('.start-date-field input', '2026-09-01');
    await typeInto('.end-date-field input', '2026-09-10');

    expect(mockWithdrawalService.getWithdrawals).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: '2026-09-01',
        endDate: '2026-09-10',
      }),
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('.range-error')).toBeNull();
  });

  it('should keep the current results and flag the range when the date range is inverted', async () => {
    await typeInto('.end-date-field input', '2026-09-01');
    mockWithdrawalService.getWithdrawals.mockClear();

    await typeInto('.start-date-field input', '2026-09-10');

    expect(mockWithdrawalService.getWithdrawals).not.toHaveBeenCalled();
    expect(component.withdrawals().length).toBe(2);
    const error = (fixture.nativeElement as HTMLElement).querySelector('.range-error');
    expect(error?.textContent).toContain('Start date cannot be after end date');
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
    expect(mockSnackBar.show).toHaveBeenCalledWith('Withdrawal reverted and balance refunded');
    expect(mockWithdrawalService.revertWithdrawal).toHaveBeenCalledTimes(1);
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

    expect(mockSnackBar.show).toHaveBeenCalledWith('Failed to revert withdrawal');
  });

  it('should stop querying once the component is destroyed', () => {
    const pending = new Subject<WithdrawalRecord[]>();
    mockWithdrawalService.getWithdrawals.mockReturnValue(pending);

    const f = TestBed.createComponent(WithdrawalLedger);
    f.detectChanges();
    expect(pending.observed).toBe(true);

    f.destroy();
    expect(pending.observed).toBe(false);
  });

  it('should reflect later emissions from the live query without re-querying', () => {
    const live = new Subject<WithdrawalRecord[]>();
    mockWithdrawalService.getWithdrawals.mockReturnValue(live);
    mockWithdrawalService.getWithdrawals.mockClear();

    const f = TestBed.createComponent(WithdrawalLedger);
    f.detectChanges();
    const c = f.componentInstance;

    live.next(mockWithdrawals);
    expect(c.withdrawals().length).toBe(2);

    live.next([mockWithdrawals[0]]);
    expect(c.withdrawals().length).toBe(1);
    expect(mockWithdrawalService.getWithdrawals).toHaveBeenCalledTimes(1);
  });

  it('should report the error when loading categories fails', () => {
    const failure = new Error('Categories DB failure');
    mockCategoryService.getCategories.mockReturnValue(throwError(() => failure));

    const f = TestBed.createComponent(WithdrawalLedger);
    f.detectChanges();

    expect(mockSnackBar.error).toHaveBeenCalledWith(failure, expect.any(String));
  });

  it('should report the error when loading withdrawals fails', () => {
    const failure = new Error('Withdrawals DB failure');
    mockWithdrawalService.getWithdrawals.mockReturnValue(throwError(() => failure));

    const f = TestBed.createComponent(WithdrawalLedger);
    f.detectChanges();

    expect(mockSnackBar.error).toHaveBeenCalledWith(failure, expect.any(String));
  });
});
