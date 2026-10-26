import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { SegmentedControl } from '../segmented-control/segmented-control';
import type { SegmentOption } from '../segmented-control/segment-option.model';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import { ClockService } from '../../../core/services/clock.service';
import type { PeriodFilterValue } from './period-filter-value.model';
import type { PeriodPreset } from './period-preset.type';
import { getPresetDateRange } from './preset-date-range';

@Component({
  selector: 'app-period-filter',
  imports: [FormField, MatDatepickerModule, MatFormFieldModule, MatNativeDateModule, MatInputModule, SegmentedControl],
  templateUrl: './period-filter.html',
  styleUrl: './period-filter.scss',
})
export class PeriodFilter {
  private readonly clock = inject(ClockService);

  readonly filter = input<PeriodFilterValue>({
    preset: 'last7',
    startDate: '',
    endDate: '',
  });
  readonly ariaLabel = input<string>('Period');

  readonly filterChange = output<PeriodFilterValue>();

  readonly presetOptions: readonly SegmentOption<PeriodPreset>[] = [
    { value: 'last7', label: '7 days' },
    { value: 'last14', label: '14 days' },
    { value: 'last30', label: '30 days' },
    { value: 'custom', label: 'Custom' },
  ];

  readonly activePreset = linkedSignal<PeriodPreset>(() => this.filter().preset);
  readonly showCustomPicker = computed<boolean>(() => this.activePreset() === 'custom');

  readonly maxDate = computed(() => new Date(`${this.clock.today()}T00:00`));

  readonly rangeModel = signal<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  readonly rangeForm = form(this.rangeModel);

  selectPreset(preset: PeriodPreset): void {
    this.activePreset.set(preset);

    if (preset === 'custom') {
      return;
    }

    const range = getPresetDateRange(preset, this.clock.today());
    this.filterChange.emit({
      preset,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  }

  onCustomDateChange(): void {
    const { start, end } = this.rangeModel();
    if (start && end) {
      this.applyCustomRange(start, end);
    }
  }

  applyCustomRange(start: Date, end: Date): void {
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() > end.getTime()) {
      return;
    }

    this.activePreset.set('custom');
    this.filterChange.emit({
      preset: 'custom',
      startDate: start.toLocaleDateString(DATE_LOCALE_CA),
      endDate: end.toLocaleDateString(DATE_LOCALE_CA),
    });
  }
}
