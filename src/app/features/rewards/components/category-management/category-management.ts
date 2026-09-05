import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CategoryService } from '../../services/category.service';
import { RewardCategory } from '../../models/reward-category.model';
import { CreateCategoryDto } from '../../models/create-category.dto';
import { CategoryFormDialogComponent } from '../category-form-dialog/category-form-dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog-data.model';

const SNACKBAR_DURATION_MS = 3000;

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.html',
  styleUrl: './category-management.scss',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CategoryManagementComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly categories = toSignal(this.categoryService.getCategories(), { initialValue: [] as RewardCategory[] });

  openAddCategoryDialog(): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '420px',
    });

    dialogRef.afterClosed().subscribe(async (result: CreateCategoryDto | undefined) => {
      if (!result) return;

      try {
        await this.categoryService.createCategory(result);
        this.snackBar.open(`Category "${result.name}" created`, 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      } catch {
        this.snackBar.open('Failed to create category', 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      }
    });
  }

  openEditCategoryDialog(category: RewardCategory): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '420px',
      data: { category },
    });

    dialogRef.afterClosed().subscribe(async (result: CreateCategoryDto | undefined) => {
      if (!result) return;

      try {
        await this.categoryService.updateCategory(category.id, result);
        this.snackBar.open(`Category "${result.name}" updated`, 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      } catch {
        this.snackBar.open('Failed to update category', 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      }
    });
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;

      try {
        await this.categoryService.deleteCategory(category.id);
        this.snackBar.open(`Category "${category.name}" deleted and items reassigned`, 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      } catch {
        this.snackBar.open('Failed to delete category', 'Close', {
          duration: SNACKBAR_DURATION_MS,
        });
      }
    });
  }
}
