import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { TimerDisplay } from './timer-display';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

describe('TimerDisplay', () => {
  let fixture: ComponentFixture<TimerDisplay>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    timeRemaining: ReturnType<typeof signal<number>>;
  };

  const renderedText = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent.trim();
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      timeRemaining: signal(1500),
    };

    await TestBed.configureTestingModule({
      imports: [TimerDisplay],
      providers: [{ provide: PomodoroTimerService, useValue: timerServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerDisplay);
  });

  it('should show only the time, with no status line, when no session runs', async () => {
    expect(await renderedText()).toBe('25:00');
  });

  it('should format 65 seconds as "01:05" while a session runs', async () => {
    timerServiceMock.isActive.set(true);
    timerServiceMock.timeRemaining.set(65);

    expect(await renderedText()).toBe('01:05');
  });

  it('should format 5 seconds as "00:05" with leading zero padding', async () => {
    timerServiceMock.timeRemaining.set(5);

    expect(await renderedText()).toBe('00:05');
  });

  it('should format 0 seconds as "00:00"', async () => {
    timerServiceMock.timeRemaining.set(0);

    expect(await renderedText()).toBe('00:00');
  });
});
