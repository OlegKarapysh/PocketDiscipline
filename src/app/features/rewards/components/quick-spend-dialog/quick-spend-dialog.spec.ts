import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { QuickSpendDialog } from './quick-spend-dialog';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { WithdrawalRecord } from '../../../../core/models/withdrawal.model';

describe('QuickSpendDialog', () => {
  let component: QuickSpendDialog;
  let fixture: ComponentFixture<QuickSpendDialog>;

  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockWithdrawalService: { withdraw: ReturnType<typeof vi.fn> };
  let mockCategoryService: { getCategories: ReturnType<typeof vi.fn> };
  let mockUserService: { user$: Observable<User | undefined> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  let mockCategories: RewardCategory[];
  let mockRecord: WithdrawalRecord;

  beforeEach(async () => {
    mockCategories = [
      {
        id: 'cat-general',
        name: 'General',
        color: '#6b7280',
        icon: 'category',
        isDefault: true,
        isProtected: true,
        createdAt: 0,
      },
      {
        id: 'cat-food',
        name: 'Food & Treats',
        color: '#f59e0b',
        icon: 'restaurant',
        isDefault: true,
        isProtected: false,
        createdAt: 0,
      },
    ];

    mockRecord = {
      id: 'w-1',
      amount: 100,
      title: 'Protein Bar',
      categoryId: 'cat-food',
      date: '2026-09-05',
      timestamp: 1000,
    };

    mockDialogRef = { close: vi.fn() };
    mockWithdrawalService = { withdraw: vi.fn().mockResolvedValue(mockRecord) };
    mockCategoryService = { getCategories: vi.fn().mockReturnValue(of(mockCategories)) };
    mockUserService = {
      user$: of({ id: 1, name: 'Current', balance: 500, createdAt: 0, updatedAt: 0 }),
    };
    mockSnackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [QuickSpendDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: UserService, useValue: mockUserService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickSpendDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize form with defaults, keeping submit button disabled', () => {
    expect(component).toBeTruthy();
    expect(component.model().categoryId).toBe('cat-general');
    expect(component.model().amount).toBeNull();
    expect(component.spendForm().invalid()).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:last-child'))
      .nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should show the current balance in the header', () => {
    const header = fixture.debugElement.query(By.css('[mat-dialog-title]'));
    const amount = header.query(By.css('app-amount')).nativeElement as HTMLElement;
    expect((header.nativeElement as HTMLElement).textContent).toContain('Balance');
    expect(amount.textContent.replace(/\s+/g, '')).toBe('500₴');
  });

  it('should invalidate form when amount exceeds balance', () => {
    component.spendForm.amount().value.set(600);
    component.spendForm.title().value.set('Expensive Item');
    component.spendForm.categoryId().value.set('cat-general');

    expect(
      component.spendForm
        .amount()
        .errors()
        .some((e) => e.kind === 'max'),
    ).toBe(true);
    expect(component.spendForm().invalid()).toBe(true);

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:last-child'))
      .nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should invalidate form when amount is zero or negative', () => {
    component.spendForm.amount().value.set(0);
    expect(
      component.spendForm
        .amount()
        .errors()
        .some((e) => e.kind === 'min'),
    ).toBe(true);

    component.spendForm.amount().value.set(-10);
    expect(
      component.spendForm
        .amount()
        .errors()
        .some((e) => e.kind === 'min'),
    ).toBe(true);
  });

  it('should enable submit button and submit valid withdrawal when clicking Withdraw button in DOM', async () => {
    component.spendForm.amount().value.set(120);
    component.spendForm.title().value.set('Protein Bar');
    component.spendForm.categoryId().value.set('cat-food');
    component.spendForm.notes().value.set('After workout');

    fixture.detectChanges();
    expect(component.spendForm().valid()).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:last-child'))
      .nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    submitBtn.click();
    await fixture.whenStable();

    expect(mockWithdrawalService.withdraw).toHaveBeenCalledWith({
      amount: 120,
      title: 'Protein Bar',
      categoryId: 'cat-food',
      notes: 'After workout',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith('Withdrawn 100 ₴ for Protein Bar', 'Close', { duration: 3000 });
    expect(mockDialogRef.close).toHaveBeenCalledWith(mockRecord);
  });

  it('should not withdraw again when submit is tapped while the dialog is closing', async () => {
    component.spendForm.amount().value.set(50);
    component.spendForm.title().value.set('Coffee');
    component.spendForm.categoryId().value.set('cat-food');

    await component.submit();
    await component.submit();

    expect(mockWithdrawalService.withdraw).toHaveBeenCalledTimes(1);
  });

  it('should handle submission errors with a snackbar message and reset isSubmitting', async () => {
    mockWithdrawalService.withdraw.mockRejectedValueOnce(new Error('Network error'));

    component.spendForm.amount().value.set(50);
    component.spendForm.title().value.set('Coffee');
    component.spendForm.categoryId().value.set('cat-food');

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:last-child'))
      .nativeElement as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();

    expect(mockSnackBar.open).toHaveBeenCalledWith('Network error', 'Close', { duration: 3000 });
    expect(mockDialogRef.close).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('should close dialog without submitting when cancel button is clicked in DOM', () => {
    const cancelBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:first-child'))
      .nativeElement as HTMLButtonElement;
    cancelBtn.click();

    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(mockWithdrawalService.withdraw).not.toHaveBeenCalled();
  });
});
