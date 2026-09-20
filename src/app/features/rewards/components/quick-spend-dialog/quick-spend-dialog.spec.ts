import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Observable} from 'rxjs';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { QuickSpendDialogComponent } from './quick-spend-dialog';
import { WithdrawalService } from '../../services/withdrawal.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import type { RewardCategory } from '../../models/reward-category.model';
import type { WithdrawalRecord } from '../../models/withdrawal.model';

describe('QuickSpendDialogComponent', () => {
  let component: QuickSpendDialogComponent;
  let fixture: ComponentFixture<QuickSpendDialogComponent>;

  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockWithdrawalService: { withdraw: ReturnType<typeof vi.fn> };
  let mockCategoryService: { getCategories: ReturnType<typeof vi.fn> };
  let mockUserService: { user$: Observable<User | undefined> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  let mockCategories: RewardCategory[];
  let mockRecord: WithdrawalRecord;

  beforeEach(async () => {
    mockCategories = [
      { id: 'cat-general', name: 'General', color: '#6b7280', icon: 'category', isDefault: true, isProtected: true, createdAt: 0 },
      { id: 'cat-food', name: 'Food & Treats', color: '#f59e0b', icon: 'restaurant', isDefault: true, isProtected: false, createdAt: 0 },
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
      imports: [QuickSpendDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: UserService, useValue: mockUserService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickSpendDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize form with defaults, keeping submit button disabled', () => {
    expect(component).toBeTruthy();
    expect(component.form.controls.categoryId.value).toBe('cat-general');
    expect(component.form.controls.amount.value).toBeNull();
    expect(component.form.invalid).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should invalidate form when amount exceeds balance', () => {
    component.form.controls.amount.setValue(600);
    component.form.controls.title.setValue('Expensive Item');
    component.form.controls.categoryId.setValue('cat-general');

    expect(component.form.controls.amount.hasError('max')).toBe(true);
    expect(component.form.invalid).toBe(true);

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should invalidate form when amount is zero or negative', () => {
    component.form.controls.amount.setValue(0);
    expect(component.form.controls.amount.hasError('min')).toBe(true);

    component.form.controls.amount.setValue(-10);
    expect(component.form.controls.amount.hasError('min')).toBe(true);
  });

  it('should enable submit button and submit valid withdrawal when clicking Withdraw button in DOM', async () => {
    component.form.controls.amount.setValue(120);
    component.form.controls.title.setValue('Protein Bar');
    component.form.controls.categoryId.setValue('cat-food');
    component.form.controls.notes.setValue('After workout');

    fixture.detectChanges();
    expect(component.form.valid).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
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

  it('should handle submission errors with a snackbar message and reset isSubmitting', async () => {
    mockWithdrawalService.withdraw.mockRejectedValueOnce(new Error('Network error'));

    component.form.controls.amount.setValue(50);
    component.form.controls.title.setValue('Coffee');
    component.form.controls.categoryId.setValue('cat-food');

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();

    expect(mockSnackBar.open).toHaveBeenCalledWith('Network error', 'Close', { duration: 3000 });
    expect(mockDialogRef.close).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('should close dialog without submitting when cancel button is clicked in DOM', () => {
    const cancelBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:first-child')).nativeElement as HTMLButtonElement;
    cancelBtn.click();

    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(mockWithdrawalService.withdraw).not.toHaveBeenCalled();
  });
});
