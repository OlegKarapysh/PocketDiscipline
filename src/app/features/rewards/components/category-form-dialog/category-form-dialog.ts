import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { CategoryFormDialogData } from './category-form-dialog-data.model';

// The palette offered to the user. The chosen value is stored per category, so these are data, not theme colours.
const PRESET_COLORS = [
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#009688',
  '#4caf50',
  '#ff9800',
  '#ff5722',
  '#795548',
  '#607d8b',
];

const PRESET_ICONS = [
  'category',
  'local_cafe',
  'menu_book',
  'devices',
  'sports_esports',
  'fitness_center',
  'flight',
  'shopping_bag',
  'restaurant',
  'palette',
  'card_giftcard',
];

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './category-form-dialog.html',
  styleUrl: './category-form-dialog.scss',
  imports: [FormField, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
})
export class CategoryFormDialog {
  private readonly dialogRef = inject(MatDialogRef<CategoryFormDialog>);
  readonly data = inject<CategoryFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly presetColors = PRESET_COLORS;
  readonly presetIcons = PRESET_ICONS;

  readonly isEdit = !!this.data?.category;

  readonly model = signal({
    name: this.data?.category?.name ?? '',
    color: this.data?.category?.color ?? PRESET_COLORS[0],
    icon: this.data?.category?.icon ?? PRESET_ICONS[0],
  });

  readonly categoryForm = form(this.model, (path) => {
    required(path.name, { message: 'Category name is required' });
    maxLength(path.name, 50, { message: 'Category name is too long' });
  });

  selectColor(color: string): void {
    this.categoryForm.color().value.set(color);
  }

  selectIcon(icon: string): void {
    this.categoryForm.icon().value.set(icon);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.categoryForm().invalid()) return;

    const values = this.model();
    this.dialogRef.close({
      name: values.name.trim(),
      color: values.color,
      icon: values.icon,
    });
  }
}
