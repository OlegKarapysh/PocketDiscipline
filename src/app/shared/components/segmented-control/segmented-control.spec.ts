import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SegmentedControl } from './segmented-control';
import type { SegmentOption } from './segment-option.model';

const OPTIONS: readonly SegmentOption<string>[] = [
  { value: 'last7', label: '7 days' },
  { value: 'last30', label: '30 days' },
];

describe('SegmentedControl', () => {
  let fixture: ComponentFixture<SegmentedControl<string>>;

  const toggles = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('mat-button-toggle button'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedControl],
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentedControl<string>);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('value', 'last7');
    fixture.componentRef.setInput('ariaLabel', 'Earnings period');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render one toggle per option', () => {
    expect(toggles().map(toggle => toggle.textContent.trim())).toEqual(['7 days', '30 days']);
  });

  it('should mark the current value as selected', () => {
    expect(toggles().map(toggle => toggle.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('should update the value when another option is chosen', () => {
    toggles()[1].click();

    expect(fixture.componentInstance.value()).toBe('last30');
  });
});
