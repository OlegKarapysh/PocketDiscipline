import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, filter, from, switchMap, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CategoryService } from '../../services/category.service';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { CreateCategoryDto } from '../../models/create-category.dto';
import { CategoryFormDialog } from '../category-form-dialog/category-form-dialog';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Badge } from '../../../../shared/components/badge/badge';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.html',
  styleUrl: './category-management.scss',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, PageHeader, Badge],
})
export class CategoryManagement {
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmService = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load categories');
        return EMPTY;
      }),
    ),
    { initialValue: [] as RewardCategory[] },
  );

  openAddCategoryDialog(): void {
    const dialogRef = this.dialog.open<CategoryFormDialog, unknown, CreateCategoryDto>(CategoryFormDialog, {
      width: '420px',
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((res): res is NonNullable<typeof res> => !!res),
        switchMap((result) =>
          from(this.categoryService.createCategory(result)).pipe(
            tap(() => {
              this.snackBar.show(`Category "${result.name}" created`);
            }),
            catchError(() => {
              this.snackBar.show('Failed to create category');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  openEditCategoryDialog(category: RewardCategory): void {
    const dialogRef = this.dialog.open<CategoryFormDialog, { category: RewardCategory }, CreateCategoryDto>(
      CategoryFormDialog,
      {
        width: '420px',
        data: { category },
      },
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((res): res is NonNullable<typeof res> => !!res),
        switchMap((result) =>
          from(this.categoryService.updateCategory(category.id, result)).pipe(
            tap(() => {
              this.snackBar.show(`Category "${result.name}" updated`);
            }),
            catchError(() => {
              this.snackBar.show('Failed to update category');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  confirmDeleteCategory(category: RewardCategory): void {
    if (category.isProtected) return;

    this.confirmService
      .ask({
        title: 'Delete category',
        message: `Are you sure you want to delete "${category.name}"? Any existing rewards or withdrawals in this category will be safely reassigned to "General".`,
        confirmText: 'Delete and reassign',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.categoryService.deleteCategory(category.id)).pipe(
            tap(() => {
              this.snackBar.show(`Category "${category.name}" deleted and items reassigned`);
            }),
            catchError(() => {
              this.snackBar.show('Failed to delete category');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
