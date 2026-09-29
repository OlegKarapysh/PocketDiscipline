import { Component, input, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import type { SegmentOption } from './segment-option.model';

@Component({
  selector: 'app-segmented-control',
  imports: [MatButtonToggleModule],
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
})
export class SegmentedControl<T> {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly ariaLabel = input.required<string>();
  readonly fullWidth = input(false);
}
