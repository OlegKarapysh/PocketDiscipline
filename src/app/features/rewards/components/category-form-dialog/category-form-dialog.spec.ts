import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryFormDialogComponent } from './category-form-dialog';
import type { RewardCategory } from '../../../../core/models/reward-category.model';

describe('CategoryFormDialogComponent', () => {
  let component: CategoryFormDialogComponent;
  let fixture: ComponentFixture<CategoryFormDialogComponent>;

  let mockDialogRef: {
    close: ReturnType<typeof vi.fn>;
  };

  let existingCategory: RewardCategory;

  const setupComponent = async (categoryData?: RewardCategory) => {
    TestBed.resetTestingModule();
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CategoryFormDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: categoryData ? { category: categoryData } : null },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    existingCategory = {
      id: 'cat-1',
      name: 'Hobbies',
      color: '#3f51b5',
      icon: 'palette',
      isDefault: false,
      isProtected: false,
      createdAt: 1000,
    };

    await setupComponent();
  });

  it('should initialize with empty form and disabled submit button when creating a new category', () => {
    expect(component.isEdit).toBe(false);
    expect(component.form.getRawValue().name).toBe('');
    expect(component.form.valid).toBe(false);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent.trim()).toBe('Create Category');
  });

  it('should initialize with existing category data and enabled submit button in edit mode', async () => {
    await setupComponent(existingCategory);

    expect(component.isEdit).toBe(true);
    const formVal = component.form.getRawValue();
    expect(formVal.name).toBe('Hobbies');
    expect(formVal.color).toBe('#3f51b5');
    expect(formVal.icon).toBe('palette');
    expect(component.form.valid).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent.trim()).toBe('Save Changes');
  });

  it('should select color and icon via DOM clicks and submit form when clicking submit button', async () => {
    const nameInput = fixture.debugElement.query(By.css('input[formControlName="name"]')).nativeElement as HTMLInputElement;
    nameInput.value = 'Gaming';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const colorChips = fixture.debugElement.queryAll(By.css('.color-chip'));
    (colorChips[1].nativeElement as HTMLElement).click();
    fixture.detectChanges();

    const iconChips = fixture.debugElement.queryAll(By.css('.icon-chip'));
    (iconChips[2].nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);

    const submitBtn = fixture.debugElement.query(By.css('mat-dialog-actions button[color="primary"]')).nativeElement as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    submitBtn.click();
    await fixture.whenStable();

    const submittedVal = component.form.getRawValue();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'Gaming',
      color: submittedVal.color,
      icon: submittedVal.icon,
    });
  });

  it('should close dialog without result when clicking cancel button in DOM', () => {
    const cancelBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:first-child')).nativeElement as HTMLButtonElement;
    cancelBtn.click();

    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
