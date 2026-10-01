import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryFormDialog } from './category-form-dialog';
import type { RewardCategory } from '../../../../core/models/reward-category.model';

describe('CategoryFormDialog', () => {
  let component: CategoryFormDialog;
  let fixture: ComponentFixture<CategoryFormDialog>;

  let mockDialogRef: {
    close: ReturnType<typeof vi.fn>;
  };

  let existingCategory: RewardCategory;

  const setupComponent = async (categoryData?: RewardCategory) => {
    TestBed.resetTestingModule();
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CategoryFormDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: categoryData ? { category: categoryData } : null },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const submitButton = () =>
    fixture.debugElement.query(By.css('mat-dialog-actions button:last-child')).nativeElement as HTMLButtonElement;

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
    expect(component.model().name).toBe('');
    expect(component.categoryForm().valid()).toBe(false);

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent.trim()).toBe('Create category');
  });

  it('should initialize with existing category data and enabled submit button in edit mode', async () => {
    await setupComponent(existingCategory);

    expect(component.isEdit).toBe(true);
    expect(component.model()).toEqual({ name: 'Hobbies', color: '#3f51b5', icon: 'palette' });
    expect(component.categoryForm().valid()).toBe(true);

    expect(submitButton().disabled).toBe(false);
    expect(submitButton().textContent.trim()).toBe('Save changes');
  });

  it('should show the required error once the name field is touched and left empty', async () => {
    const nameInput = fixture.debugElement.query(By.css('input[matInput]')).nativeElement as HTMLInputElement;
    nameInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();

    const error = fixture.debugElement.query(By.css('mat-error'));
    expect((error.nativeElement as HTMLElement).textContent.trim()).toBe('Category name is required');
  });

  it('should not submit a name made only of spaces', () => {
    component.categoryForm.name().value.set('   ');

    component.onSubmit();

    expect(component.categoryForm().valid()).toBe(false);
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should select color and icon via DOM clicks and submit form when clicking submit button', async () => {
    const nameInput = fixture.debugElement.query(By.css('input[matInput]')).nativeElement as HTMLInputElement;
    nameInput.value = '  Gaming ';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const colorChips = fixture.debugElement.queryAll(By.css('.color-chip'));
    (colorChips[1].nativeElement as HTMLElement).click();
    fixture.detectChanges();

    const iconChips = fixture.debugElement.queryAll(By.css('.icon-chip'));
    (iconChips[2].nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(component.categoryForm().valid()).toBe(true);
    expect(submitButton().disabled).toBe(false);

    submitButton().click();
    await fixture.whenStable();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'Gaming',
      color: component.presetColors[1],
      icon: component.presetIcons[2],
    });
  });

  it('should close dialog without result when clicking cancel button in DOM', () => {
    const cancelBtn = fixture.debugElement.query(By.css('mat-dialog-actions button:first-child'))
      .nativeElement as HTMLButtonElement;
    cancelBtn.click();

    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
