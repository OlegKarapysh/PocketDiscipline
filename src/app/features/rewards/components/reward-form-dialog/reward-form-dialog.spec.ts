import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import type { RewardFormDialogData } from './reward-form-dialog';
import { RewardFormDialogComponent } from './reward-form-dialog';
import { RewardsService } from '../../services/rewards.service';
import { CategoryService } from '../../services/category.service';
import type { RewardItem } from '../../../../core/models/reward.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';

describe('RewardFormDialogComponent', () => {
  let component: RewardFormDialogComponent;
  let fixture: ComponentFixture<RewardFormDialogComponent>;

  let mockDialogRef: { close: ReturnType<typeof vi.fn> };
  let mockRewardsService: {
    createReward: ReturnType<typeof vi.fn>;
    updateReward: ReturnType<typeof vi.fn>;
  };
  let mockCategoryService: { getCategories: ReturnType<typeof vi.fn> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  let mockCategories: RewardCategory[];
  let existingReward: RewardItem;

  const setupComponent = async (data: RewardFormDialogData = {}) => {
    TestBed.resetTestingModule();
    mockDialogRef = { close: vi.fn() };
    mockRewardsService = {
      createReward: vi.fn().mockResolvedValue(existingReward),
      updateReward: vi.fn().mockResolvedValue(existingReward),
    };
    mockCategoryService = { getCategories: vi.fn().mockReturnValue(of(mockCategories)) };
    mockSnackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RewardFormDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: RewardsService, useValue: mockRewardsService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RewardFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockCategories = [
      { id: 'cat-general', name: 'General', color: '#6b7280', icon: 'category', isDefault: true, isProtected: true, createdAt: 0 },
      { id: 'cat-tech', name: 'Gear & Tech', color: '#3b82f6', icon: 'devices', isDefault: true, isProtected: false, createdAt: 0 },
    ];

    existingReward = {
      id: 'rew-1',
      title: 'Mechanical Keyboard',
      cost: 2500,
      categoryId: 'cat-tech',
      type: 'one-time',
      status: 'active',
      claimCount: 0,
      claimedAt: null,
      createdAt: 1000,
    };

    await setupComponent({});
  });

  it('should initialize with empty form, repeatable default, and disabled submit button for new reward', () => {
    expect(component.isEditing()).toBe(false);
    expect(component.form.controls.title.value).toBe('');
    expect(component.form.controls.cost.value).toBeNull();
    expect(component.form.controls.type.value).toBe('repeatable');
    expect(component.form.invalid).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent.trim()).toBe('Create Reward');
  });

  it('should prefill form fields when editing an existing reward and show "Save Changes"', async () => {
    await setupComponent({ reward: existingReward });

    expect(component.isEditing()).toBe(true);
    expect(component.form.controls.title.value).toBe('Mechanical Keyboard');
    expect(component.form.controls.cost.value).toBe(2500);
    expect(component.form.controls.categoryId.value).toBe('cat-tech');
    expect(component.form.controls.type.value).toBe('one-time');
    expect(component.form.valid).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent.trim()).toBe('Save Changes');
  });

  it('should create new reward and close dialog when clicking submit in DOM', async () => {
    component.form.controls.title.setValue('New Book');
    component.form.controls.cost.setValue(450);
    component.form.controls.categoryId.setValue('cat-general');
    component.form.controls.type.setValue('repeatable');

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    submitBtn.click();
    await fixture.whenStable();

    expect(mockRewardsService.createReward).toHaveBeenCalledWith({
      title: 'New Book',
      cost: 450,
      categoryId: 'cat-general',
      type: 'repeatable',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith('Created reward "Mechanical Keyboard"', 'Close', { duration: 3000 });
    expect(mockDialogRef.close).toHaveBeenCalledWith(existingReward);
  });

  it('should update existing reward and close dialog when clicking submit in DOM', async () => {
    await setupComponent({ reward: existingReward });

    component.form.controls.title.setValue('Ergonomic Keyboard');
    component.form.controls.cost.setValue(2700);

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();

    expect(mockRewardsService.updateReward).toHaveBeenCalledWith('rew-1', {
      title: 'Ergonomic Keyboard',
      cost: 2700,
      categoryId: 'cat-tech',
      type: 'one-time',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith('Updated reward "Mechanical Keyboard"', 'Close', { duration: 3000 });
    expect(mockDialogRef.close).toHaveBeenCalledWith(existingReward);
  });

  it('should display error snackbar when reward creation fails and keep dialog open', async () => {
    mockRewardsService.createReward.mockRejectedValueOnce(new Error('Failed to save to database'));

    component.form.controls.title.setValue('Book');
    component.form.controls.cost.setValue(100);
    component.form.controls.categoryId.setValue('cat-general');

    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();

    expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to save to database', 'Close', { duration: 3000 });
    expect(mockDialogRef.close).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('should close dialog when cancel button is clicked in DOM', () => {
    const cancelBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:first-child')).nativeElement as HTMLButtonElement;
    cancelBtn.click();

    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
