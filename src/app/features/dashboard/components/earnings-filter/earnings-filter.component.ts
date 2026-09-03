import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
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
const PAD_LENGTH_TWO = 2;
const PAD_CHAR_ZERO = '0';
const MONTH_OFFSET_ONE = 1;

@Component({
  selector: 'app-earnings-filter',
  imports: [
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

  readonly activePreset = linkedSignal<PeriodPreset>(() => this.filter().preset);
  readonly showCustomPicker = computed<boolean>(() => this.activePreset() === PRESET_CUSTOM);

  readonly maxDate = new Date();

  readonly rangeForm = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  selectPreset(preset: PeriodPreset): void {
    this.activePreset.set(preset);

    if (preset === PRESET_CUSTOM) {
      return;
    }

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

    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() <= end.getTime()) {
      this.applyCustomRange(start, end);
    }
  }

  applyCustomRange(start: Date, end: Date): void {
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() > end.getTime()) {
      return;
    }

    const startDate = this.formatLocalDate(start);
    const endDate = this.formatLocalDate(end);

    this.activePreset.set(PRESET_CUSTOM);
    this.filterChange.emit({
      preset: PRESET_CUSTOM,
      startDate,
      endDate,
    });
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + MONTH_OFFSET_ONE).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO);
    const day = String(date.getDate()).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO);
    return `${year}-${month}-${day}`;
  }
}
