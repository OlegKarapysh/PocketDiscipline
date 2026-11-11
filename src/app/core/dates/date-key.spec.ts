import { toDateKey } from './date-key';

describe('toDateKey', () => {
  it('pads single-digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local day, not the UTC one, on both sides of midnight', () => {
    expect(toDateKey(new Date(2026, 10, 12, 0, 0, 1))).toBe('2026-11-12');
    expect(toDateKey(new Date(2026, 10, 12, 23, 59, 59))).toBe('2026-11-12');
  });

  it('rolls over months and years with the date', () => {
    expect(toDateKey(new Date(2026, 11, 32))).toBe('2027-01-01');
  });
});
