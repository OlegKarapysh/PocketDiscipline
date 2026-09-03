import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EarningsFilterComponent } from './earnings-filter.component';
import { DashboardEarningsService } from '../../services/dashboard-earnings.service';
import { PeriodPreset } from '../../models/period-preset.type';

describe('EarningsFilterComponent', () => {
  let component: EarningsFilterComponent;
  let fixture: ComponentFixture<EarningsFilterComponent>;

  const earningsServiceMock = {
    getPresetDateRange: vi.fn((preset: PeriodPreset) => {
      if (preset === 'last14') {
        return { startDate: '2026-08-20', endDate: '2026-09-02' };
      }
      if (preset === 'last30') {
        return { startDate: '2026-08-04', endDate: '2026-09-02' };
      }
      return { startDate: '2026-08-27', endDate: '2026-09-02' };
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsFilterComponent],
      providers: [
        { provide: DashboardEarningsService, useValue: earningsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EarningsFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit filterChange when selecting a preset', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.selectPreset('last14');

    expect(spy).toHaveBeenCalledWith({
      preset: 'last14',
      startDate: '2026-08-20',
      endDate: '2026-09-02',
    });
  });

  it('should show custom date picker and not emit when custom preset is selected', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.selectPreset('custom');

    expect(component.activePreset()).toBe('custom');
    expect(component.showCustomPicker()).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should not emit if only one date is picked in custom range', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.rangeForm.controls.start.setValue(new Date(2026, 7, 10));
    component.rangeForm.controls.end.setValue(null);
    component.onCustomDateChange();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit custom filterChange when custom dates are applied', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    const start = new Date(2026, 7, 10);
    const end = new Date(2026, 7, 15);
    component.applyCustomRange(start, end);

    expect(spy).toHaveBeenCalledWith({
      preset: 'custom',
      startDate: '2026-08-10',
      endDate: '2026-08-15',
    });
  });

  it('should emit custom filterChange when both dates are filled via form controls', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.rangeForm.controls.start.setValue(new Date(2026, 7, 10));
    component.rangeForm.controls.end.setValue(new Date(2026, 7, 15));
    component.onCustomDateChange();

    expect(spy).toHaveBeenCalledWith({
      preset: 'custom',
      startDate: '2026-08-10',
      endDate: '2026-08-15',
    });
  });

  it('should not emit if start date is after end date', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    const start = new Date(2026, 7, 20);
    const end = new Date(2026, 7, 10);
    component.rangeForm.controls.start.setValue(start);
    component.rangeForm.controls.end.setValue(end);
    component.onCustomDateChange();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should synchronize activePreset when filter input changes', () => {
    fixture.componentRef.setInput('filter', {
      preset: 'last30',
      startDate: '2026-08-04',
      endDate: '2026-09-02',
    });
    fixture.detectChanges();

    expect(component.activePreset()).toBe('last30');
    expect(component.showCustomPicker()).toBe(false);
  });
});
