import { Component, OnInit, inject } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CategoryFormDialogData } from './category-form-dialog-data.model';

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
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
})
export class CategoryFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoryFormDialogComponent>);
  readonly data = inject<CategoryFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly presetColors = PRESET_COLORS;
  readonly presetIcons = PRESET_ICONS;

  form!: FormGroup;
  isEdit = false;

  ngOnInit(): void {
    this.isEdit = !!this.data?.category;

    this.form = this.fb.group({
      name: [this.data?.category?.name || '', [Validators.required, Validators.maxLength(50)]],
      color: [this.data?.category?.color || PRESET_COLORS[0], [Validators.required]],
      icon: [this.data?.category?.icon || PRESET_ICONS[0], [Validators.required]],
    });
  }

  selectColor(color: string): void {
    this.form.patchValue({ color });
  }

  selectIcon(icon: string): void {
    this.form.patchValue({ icon });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.dialogRef.close({
      name: this.form.value.name.trim(),
      color: this.form.value.color,
      icon: this.form.value.icon,
    });
  }
}
