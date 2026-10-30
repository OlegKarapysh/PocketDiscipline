import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PomodoroStats } from './pomodoro-stats';
import type { PomodoroTally } from '../../models/pomodoro-tally.model';

describe('PomodoroStats', () => {
  let fixture: ComponentFixture<PomodoroStats>;

  const tally = (overrides: Partial<PomodoroTally> = {}): PomodoroTally => ({
    pomodoros: 0,
    byType: { work: 0, study: 0 },
    focusMinutes: 0,
    rewardEarned: 0,
    ...overrides,
  });

  const render = (value: PomodoroTally) => {
    fixture.componentRef.setInput('tally', value);
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) => host().querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim();
  const focusTime = () => Array.from(host().querySelectorAll('.figure')).at(1)?.textContent.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PomodoroStats],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroStats);
  });

  it('should show the count with a singular or plural unit', () => {
    render(tally({ pomodoros: 1, byType: { work: 1, study: 0 } }));
    expect(text('.figure')).toBe('1 pomodoro');

    render(tally({ pomodoros: 4, byType: { work: 3, study: 1 } }));
    expect(text('.figure')).toBe('4 pomodoros');

    render(tally());
    expect(text('.figure')).toBe('0 pomodoros');
  });

  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h'],
    [125, '2 h 5 min'],
    [6000, '100 h'],
  ])('should show %i focus minutes as "%s"', (focusMinutes, shown) => {
    render(tally({ focusMinutes }));

    expect(focusTime()).toBe(`${shown} focus`);
  });

  it('should show a badge for every engagement type, at zero too', () => {
    render(tally({ pomodoros: 2, byType: { work: 0, study: 2 } }));

    const badges = Array.from(host().querySelectorAll('app-badge'), (badge) =>
      badge.textContent.replace(/\s+/g, ' ').trim(),
    );
    expect(badges).toEqual(['Work 0', 'Study 2']);
  });

  it('should show the reward as a signed, earned amount', () => {
    render(tally({ pomodoros: 1, rewardEarned: 1250 }));

    const amount = host().querySelector('app-amount');
    expect(amount?.textContent).toBe(`+${(1250).toLocaleString('uk-UA')}₴`);
    expect(amount?.classList).toContain('tone-reward');
  });
});
