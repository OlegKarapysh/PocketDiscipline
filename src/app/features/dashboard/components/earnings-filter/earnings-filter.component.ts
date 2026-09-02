import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { DashboardEarningsService } from '../../services/dashboard-earnings.service';
import { EarningsPeriodFilter } from '../../models/earnings-period-filter.model';
import { PeriodPreset } from '../../models/period-preset.type';

const DEFAULT_PRESET: PeriodPreset = 'last7';
const PRESET_CUSTOM: PeriodPreset = 'custom';
const DATE_LOCALE_CA = 'en-CA';

@Component({
  selector: 'app-earnings-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatInputModule,
  ],
  templateUrl: './earnings-filter.component.html',
  styleUrl: './earnings-filter.component.scss'
})
export class EarningsFilterComponent {
  private readonly earningsService = inject(DashboardEarningsService);

  readonly filter = input<EarningsPeriodFilter>({
    preset: DEFAULT_PRESET,
    startDate: '',
    endDate: '',
  });

  readonly filterChange = output<EarningsPeriodFilter>();

  readonly activePreset = signal<PeriodPreset>(DEFAULT_PRESET);
  readonly showCustomPicker = signal<boolean>(false);

  readonly rangeForm = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  selectPreset(preset: PeriodPreset): void {
    this.activePreset.set(preset);

    if (preset === PRESET_CUSTOM) {
      this.showCustomPicker.set(true);
      return;
    }

    this.showCustomPicker.set(false);
    const range = this.earningsService.getPresetDateRange(preset);
    this.filterChange.emit({
      preset,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  }

  onCustomDateChange(): void {
    const start = this.rangeForm.controls.start.value;
    const end = this.rangeForm.controls.end.value;

    if (start && end) {
      this.applyCustomRange(start, end);
    }
  }

  applyCustomRange(start: Date, end: Date): void {
    const startDate = start.toLocaleDateString(DATE_LOCALE_CA);
    const endDate = end.toLocaleDateString(DATE_LOCALE_CA);

    this.activePreset.set(PRESET_CUSTOM);
    this.filterChange.emit({
      preset: PRESET_CUSTOM,
      startDate,
      endDate,
    });
  }
}
