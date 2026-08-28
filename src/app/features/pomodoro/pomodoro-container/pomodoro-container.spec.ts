import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { PomodoroContainer } from './pomodoro-container';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';
import { PomodoroTimerService } from '../services/pomodoro-timer.service';
import { ENGAGEMENT_TYPE } from '../models/pomodoro-session.model';

describe('PomodoroContainer', () => {
  let fixture: ComponentFixture<PomodoroContainer>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<string>>;
    timeRemaining: ReturnType<typeof signal<number>>;
    startTimer: ReturnType<typeof vi.fn>;
    stopTimer: ReturnType<typeof vi.fn>;
    setConfig: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      durationMinutes: signal(25),
      engagementType: signal(ENGAGEMENT_TYPE.WORK),
      timeRemaining: signal(1500),
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      setConfig: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PomodoroContainer],
      providers: [
        { provide: PomodoroTimerService, useValue: timerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroContainer);
  });

  it('should render child components: TimerDisplay, TimerControls, and SessionConfig', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const display = fixture.debugElement.query(By.directive(TimerDisplay));
    const controls = fixture.debugElement.query(By.directive(TimerControls));
    const config = fixture.debugElement.query(By.directive(SessionConfig));

    expect(display).toBeTruthy();
    expect(controls).toBeTruthy();
    expect(config).toBeTruthy();
  });
});
