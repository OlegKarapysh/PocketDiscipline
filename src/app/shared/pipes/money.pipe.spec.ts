import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('groups thousands the uk-UA way and appends the hryvnia sign', () => {
    expect(pipe.transform(2500)).toBe(`${(2500).toLocaleString('uk-UA')} ₴`);
  });

  it('uses the given unit', () => {
    expect(pipe.transform(12.5, 'min')).toBe(`${(12.5).toLocaleString('uk-UA')} min`);
  });
});
