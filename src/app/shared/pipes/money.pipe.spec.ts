import { describe, expect, it } from 'vitest';
import { MoneyPipe } from './money.pipe';

// uk-UA groups thousands with a no-break space.
const NBSP = ' ';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('appends the hryvnia sign', () => {
    expect(pipe.transform(12)).toBe('12 ₴');
  });

  it('groups thousands the uk-UA way', () => {
    expect(pipe.transform(2500)).toBe(`2${NBSP}500 ₴`);
    expect(pipe.transform(1_234_567)).toBe(`1${NBSP}234${NBSP}567 ₴`);
  });

  it('shows whole hryvnias only', () => {
    expect(pipe.transform(1234.56)).toBe(`1${NBSP}235 ₴`);
    expect(pipe.transform(0.4)).toBe('0 ₴');
  });

  it('keeps the sign of a negative amount', () => {
    expect(pipe.transform(-1500)).toBe(`-1${NBSP}500 ₴`);
  });

  it('uses the given unit instead of the hryvnia sign', () => {
    expect(pipe.transform(12, 'min')).toBe('12 min');
  });
});
