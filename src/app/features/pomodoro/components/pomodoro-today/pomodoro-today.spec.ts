import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PomodoroToday } from './pomodoro-today';
import type { PomodoroTally } from '../../models/pomodoro-tally.model';

describe('PomodoroToday', () => {
  let fixture: ComponentFixture<PomodoroToday>;

  const render = (tally: PomodoroTally | undefined) => {
    fixture.componentRef.setInput('tally', tally);
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const shown = () => host().textContent.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PomodoroToday],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroToday);
  });

  it("should show today's figures under a Today heading", () => {
    render({ pomodoros: 4, byType: { work: 3, study: 1 }, focusMinutes: 125, rewardEarned: 100 });

    expect(host().querySelector('h2')?.textContent.trim()).toBe('Today');
    expect(shown()).toContain('4 pomodoros');
    expect(shown()).toContain('Work 3');
    expect(shown()).toContain('Study 1');
    expect(shown()).toContain('2 h 5 min focus');
    expect(shown()).toContain('+100₴');
    expect(host().querySelector('.invitation')).toBeNull();
  });

  it('should keep the Today heading but show no figures before the tally is read', () => {
    render(undefined);

    expect(host().querySelector('h2')?.textContent.trim()).toBe('Today');
    expect(host().querySelector('app-pomodoro-stats')).toBeNull();
    expect(host().querySelector('.invitation')).toBeNull();
  });

  it('should show zero figures and invite the user to start when nothing is completed today', () => {
    render({ pomodoros: 0, byType: { work: 0, study: 0 }, focusMinutes: 0, rewardEarned: 0 });

    expect(shown()).toContain('0 pomodoros');
    expect(shown()).toContain('Work 0');
    expect(shown()).toContain('Study 0');
    expect(shown()).toContain('0 min focus');
    expect(shown()).toContain('0₴');
    expect(host().querySelector('.invitation')?.textContent.trim()).toMatch(/^No pomodoros yet today/);
  });
});
