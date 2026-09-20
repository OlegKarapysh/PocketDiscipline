import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, filter, from, switchMap, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CategoryService } from '../../services/category.service';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { CreateCategoryDto } from '../../models/create-category.dto';
import { CategoryFormDialog } from '../category-form-dialog/category-form-dialog';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import type { ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog-data.model';

const SNACKBAR_DURATION_MS = 3000;

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.html',
  styleUrl: './category-management.scss',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CategoryManagement {
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = toSignal(this.categoryService.getCategories(), { initialValue: [] as RewardCategory[] });

  openAddCategoryDialog(): void {
    const dialogRef = this.dialog.open<CategoryFormDialog, unknown, CreateCategoryDto>(
      CategoryFormDialog,
      {
        width: '420px',
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((res): res is NonNullable<typeof res> => !!res),
        switchMap((result) =>
          from(this.categoryService.createCategory(result)).pipe(
            tap(() => {
              this.snackBar.open(`Category "${result.name}" created`, 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
            }),
            catchError(() => {
              this.snackBar.open('Failed to create category', 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  openEditCategoryDialog(category: RewardCategory): void {
    const dialogRef = this.dialog.open<CategoryFormDialog, { category: RewardCategory }, CreateCategoryDto>(
      CategoryFormDialog,
      {
        width: '420px',
        data: { category },
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((res): res is NonNullable<typeof res> => !!res),
        switchMap((result) =>
          from(this.categoryService.updateCategory(category.id, result)).pipe(
            tap(() => {
              this.snackBar.open(`Category "${result.name}" updated`, 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
            }),
            catchError(() => {
              this.snackBar.open('Failed to update category', 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  confirmDeleteCategory(category: RewardCategory): void {
    if (category.isProtected) return;

    const dialogData: ConfirmDialogData = {
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? Any existing rewards or withdrawals in this category will be safely reassigned to "General".`,
      confirmText: 'Delete & Reassign',
      cancelText: 'Cancel',
      isDestructive: true,
    };

    const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(
      ConfirmDialog,
      {
        width: '400px',
        data: dialogData,
      }
    );

    dialogRef
      .afterClosed()
      .pipe(
        filter((res): res is NonNullable<typeof res> => !!res),
        switchMap(() =>
          from(this.categoryService.deleteCategory(category.id)).pipe(
            tap(() => {
              this.snackBar.open(`Category "${category.name}" deleted and items reassigned`, 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
            }),
            catchError(() => {
              this.snackBar.open('Failed to delete category', 'Close', {
                duration: SNACKBAR_DURATION_MS,
              });
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
