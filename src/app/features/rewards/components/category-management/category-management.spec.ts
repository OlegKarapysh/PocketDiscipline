import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryManagementComponent } from './category-management';
import { CategoryService } from '../../services/category.service';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import { FALLBACK_CATEGORY_ID } from '../../../../core/constants/initial-reward-categories.const';

describe('CategoryManagementComponent', () => {
  let component: CategoryManagementComponent;
  let fixture: ComponentFixture<CategoryManagementComponent>;

  let mockCategories: RewardCategory[];

  let mockCategoryService: {
    getCategories: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
    deleteCategory: ReturnType<typeof vi.fn>;
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
        id: FALLBACK_CATEGORY_ID,
        name: 'General',
        color: '#6b7280',
        icon: 'category',
        isDefault: true,
        isProtected: true,
        createdAt: 1000,
      },
      {
        id: 'cat-custom',
        name: 'Hobbies',
        color: '#3f51b5',
        icon: 'palette',
        isDefault: false,
        isProtected: false,
        createdAt: 2000,
      },
    ];

    mockCategoryService = {
      getCategories: vi.fn().mockReturnValue(of(mockCategories)),
      createCategory: vi.fn().mockResolvedValue({ id: 'new-id', name: 'Gaming' }),
      updateCategory: vi.fn().mockResolvedValue({ id: 'cat-custom', name: 'Fine Arts' }),
      deleteCategory: vi.fn().mockResolvedValue(undefined),
    };

    mockDialog = {
      open: vi.fn(),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CategoryManagementComponent],
      providers: [
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load categories', () => {
    expect(component).toBeTruthy();
    expect(mockCategoryService.getCategories).toHaveBeenCalled();
    expect(component.categories().length).toBe(2);
  });

  it('should render categories with protected lock on General and delete on custom', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.category-row');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('General');
    expect(rows[0].textContent).toContain('Protected');
    const generalDeleteBtn = rows[0].querySelector<HTMLButtonElement>('.delete-button')!;
    expect(generalDeleteBtn.disabled).toBe(true);

    expect(rows[1].textContent).toContain('Hobbies');
    const customDeleteBtn = rows[1].querySelector<HTMLButtonElement>('.delete-button')!;
    expect(customDeleteBtn.disabled).toBe(false);
  });

  it('should open dialog and create category when clicking Add Category button in DOM', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of({ name: 'Gaming', color: '#ff5722', icon: 'sports_esports' }),
    });

    const addBtn = fixture.debugElement.query(By.css('.add-category-button')).nativeElement as HTMLButtonElement;
    addBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
      name: 'Gaming',
      color: '#ff5722',
      icon: 'sports_esports',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith('Category "Gaming" created', 'Close', { duration: 3000 });
  });

  it('should open dialog and update category when clicking edit button in DOM', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of({ name: 'Fine Arts', color: '#ff5722', icon: 'palette' }),
    });

    const rows = fixture.debugElement.queryAll(By.css('.category-row'));
    const editBtn = rows[1].query(By.css('.edit-button')).nativeElement as HTMLButtonElement;
    editBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith('cat-custom', {
      name: 'Fine Arts',
      color: '#ff5722',
      icon: 'palette',
    });
    expect(mockSnackBar.open).toHaveBeenCalledWith('Category "Fine Arts" updated', 'Close', { duration: 3000 });
  });

  it('should prompt confirmation and delete custom category when delete button is clicked in DOM and confirmed', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(true),
    });

    const rows = fixture.debugElement.queryAll(By.css('.category-row'));
    const deleteBtn = rows[1].query(By.css('.delete-button')).nativeElement as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith('cat-custom');
    expect(mockSnackBar.open).toHaveBeenCalledWith('Category "Hobbies" deleted and items reassigned', 'Close', { duration: 3000 });
  });

  it('should not delete category when confirmation dialog is cancelled', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(false),
    });

    const rows = fixture.debugElement.queryAll(By.css('.category-row'));
    const deleteBtn = rows[1].query(By.css('.delete-button')).nativeElement as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
  });

  it('should not create category when add dialog is cancelled', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(undefined),
    });

    const addBtn = fixture.debugElement.query(By.css('.add-category-button')).nativeElement as HTMLButtonElement;
    addBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.createCategory).not.toHaveBeenCalled();
  });

  it('should show error snackbar when creating category fails', async () => {
    mockCategoryService.createCategory.mockRejectedValue(new Error('Failed'));
    mockDialog.open.mockReturnValue({
      afterClosed: () => of({ name: 'Gaming', color: '#ff5722', icon: 'sports_esports' }),
    });

    const addBtn = fixture.debugElement.query(By.css('.add-category-button')).nativeElement as HTMLButtonElement;
    addBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.createCategory).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to create category', 'Close', { duration: 3000 });
  });

  it('should not update category when edit dialog is cancelled', async () => {
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(undefined),
    });

    const rows = fixture.debugElement.queryAll(By.css('.category-row'));
    const editBtn = rows[1].query(By.css('.edit-button')).nativeElement as HTMLButtonElement;
    editBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.updateCategory).not.toHaveBeenCalled();
  });

  it('should show error snackbar when updating category fails', async () => {
    mockCategoryService.updateCategory.mockRejectedValue(new Error('Failed'));
    mockDialog.open.mockReturnValue({
      afterClosed: () => of({ name: 'Fine Arts', color: '#ff5722', icon: 'palette' }),
    });

    const rows = fixture.debugElement.queryAll(By.css('.category-row'));
    const editBtn = rows[1].query(By.css('.edit-button')).nativeElement as HTMLButtonElement;
    editBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.updateCategory).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to update category', 'Close', { duration: 3000 });
  });

  it('should show error snackbar when deleting category fails', async () => {
    mockCategoryService.deleteCategory.mockRejectedValue(new Error('Failed'));
    mockDialog.open.mockReturnValue({
      afterClosed: () => of(true),
    });

    const rows = fixture.debugElement.queryAll(By.css('.category-row'));
    const deleteBtn = rows[1].query(By.css('.delete-button')).nativeElement as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCategoryService.deleteCategory).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to delete category', 'Close', { duration: 3000 });
  });

  it('should never trigger delete on protected category', () => {
    component.confirmDeleteCategory(mockCategories[0]);
    expect(mockDialog.open).not.toHaveBeenCalled();
    expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
  });
});
