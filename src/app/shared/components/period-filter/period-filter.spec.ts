import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeriodFilter } from './period-filter';
import { ClockService } from '../../../core/services/clock.service';
import { formatPeriodLabel, getPresetDateRange } from './preset-date-range';

describe('PeriodFilter', () => {
  let component: PeriodFilter;
  let fixture: ComponentFixture<PeriodFilter>;
  const today = signal('2026-09-02');

  beforeEach(async () => {
    today.set('2026-09-02');

    await TestBed.configureTestingModule({
      imports: [PeriodFilter],
      providers: [{ provide: ClockService, useValue: { today } }],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodFilter);
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

    component.rangeForm.start().value.set(new Date(2026, 7, 10));
    component.rangeForm.end().value.set(null);
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

  it('should emit custom filterChange when both dates are filled via the range fields', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.rangeForm.start().value.set(new Date(2026, 7, 10));
    component.rangeForm.end().value.set(new Date(2026, 7, 15));
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
    component.rangeForm.start().value.set(start);
    component.rangeForm.end().value.set(end);
    component.onCustomDateChange();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should render the period presets as a segmented control and emit on selection', () => {
    const spy = vi.fn();
    component.filterChange.subscribe(spy);
    fixture.detectChanges();

    const toggles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('app-segmented-control button'),
    );
    expect(toggles.map((button) => button.textContent.trim())).toEqual(['7 days', '14 days', '30 days', 'Custom']);

    toggles[2].click();
    fixture.detectChanges();

    expect(component.activePreset()).toBe('last30');
    expect(spy).toHaveBeenCalledWith({ preset: 'last30', startDate: '2026-08-04', endDate: '2026-09-02' });
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

  it('should cap the custom range at today and follow the calendar day', () => {
    today.set('2026-09-30');
    expect(component.maxDate()).toEqual(new Date(2026, 8, 30));

    today.set('2026-10-01');

    expect(component.maxDate()).toEqual(new Date(2026, 9, 1));
  });

  describe('preset-date-range helpers', () => {
    it('should compute date ranges for last7, last14, and last30', () => {
      expect(getPresetDateRange('last7', '2026-09-02')).toEqual({
        startDate: '2026-08-27',
        endDate: '2026-09-02',
      });
      expect(getPresetDateRange('last14', '2026-09-02')).toEqual({
        startDate: '2026-08-20',
        endDate: '2026-09-02',
      });
      expect(getPresetDateRange('last30', '2026-09-02')).toEqual({
        startDate: '2026-08-04',
        endDate: '2026-09-02',
      });
    });

    it('should format period labels for presets and custom ranges', () => {
      expect(formatPeriodLabel({ preset: 'last7', startDate: '2026-08-27', endDate: '2026-09-02' })).toBe('7 days');
      expect(formatPeriodLabel({ preset: 'last14', startDate: '2026-08-20', endDate: '2026-09-02' })).toBe('14 days');
      expect(formatPeriodLabel({ preset: 'last30', startDate: '2026-08-04', endDate: '2026-09-02' })).toBe('30 days');
      expect(formatPeriodLabel({ preset: 'custom', startDate: '2026-10-01', endDate: '2026-10-15' })).toBe(
        '10/01 – 10/15',
      );
      expect(formatPeriodLabel({ preset: 'custom', startDate: '', endDate: '' })).toBe('custom');
    });
  });
});
