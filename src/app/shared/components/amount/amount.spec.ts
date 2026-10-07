import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Amount } from './amount';

describe('Amount', () => {
  let fixture: ComponentFixture<Amount>;

  const render = async (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return {
      value: host.querySelector('.value')?.textContent ?? null,
      unit: host.querySelector('.unit')?.textContent ?? null,
    };
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Amount],
    }).compileComponents();

    fixture = TestBed.createComponent(Amount);
  });

  it('should group thousands the uk-UA way and show no decimals', async () => {
    const { value } = await render({ value: 1234.6 });

    expect(value).toMatch(/^1\s235$/);
  });

  it('should show the seven-digit worst case on one grouped line', async () => {
    const { value } = await render({ value: 9_999_999 });

    expect(value).toMatch(/^9\s999\s999$/);
  });

  it('should render the hryvnia unit by default', async () => {
    const { unit } = await render({ value: 100 });

    expect(unit).toBe('₴');
  });

  it('should render no unit when unit is empty', async () => {
    const { unit } = await render({ value: 100, unit: '' });

    expect(unit).toBeNull();
  });

  it('should render a placeholder when the value is missing', async () => {
    expect((await render({ value: null })).value).toBe('--');
    expect((await render({ value: undefined })).value).toBe('--');
  });

  it('should prefix positive values with + when showSign is set', async () => {
    const { value } = await render({ value: 200, showSign: true });

    expect(value).toBe('+200');
  });

  it('should not add a + to zero or negative values', async () => {
    expect((await render({ value: 0, showSign: true })).value).toBe('0');
    expect((await render({ value: -5, showSign: true })).value).not.toContain('+');
  });

  it('should not add a sign unless showSign is set', async () => {
    const { value } = await render({ value: 200 });

    expect(value).toBe('200');
  });
});
