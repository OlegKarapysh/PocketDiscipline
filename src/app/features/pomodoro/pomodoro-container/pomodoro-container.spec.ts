import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { PomodoroContainer } from './pomodoro-container';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { PomodoroTimerService } from '../services/pomodoro-timer.service';
import { EngagementType } from '../../../core/models/engagement-type.enum';

describe('PomodoroContainer', () => {
  let fixture: ComponentFixture<PomodoroContainer>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    isRestoring: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<string>>;
    timeRemaining: ReturnType<typeof signal<number>>;
    reward: ReturnType<typeof signal<number | undefined>>;
    startTimer: ReturnType<typeof vi.fn>;
    stopTimer: ReturnType<typeof vi.fn>;
    setConfig: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      isRestoring: signal(false),
      durationMinutes: signal(25),
      engagementType: signal(EngagementType.WORK),
      timeRemaining: signal(1500),
      reward: signal<number | undefined>(100),
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      setConfig: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PomodoroContainer],
      providers: [{ provide: PomodoroTimerService, useValue: timerServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroContainer);
  });

  it('should group the timer, its settings and the start button in one card right below the page header', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const cards = fixture.debugElement.queryAll(By.directive(SectionCard));
    expect(cards.length).toBe(1);
    const card = cards[0];
    expect(card.query(By.directive(TimerDisplay))).toBeTruthy();
    expect(card.query(By.directive(SessionConfig))).toBeTruthy();
    expect(card.query(By.directive(TimerControls))).toBeTruthy();

    const header = fixture.debugElement.query(By.css('app-page-header')).nativeElement as HTMLElement;
    expect(header.nextElementSibling).toBe(card.nativeElement);
  });

  it('should render a single page header titled Pomodoro', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const headers = fixture.debugElement.queryAll(By.css('app-page-header'));
    expect(headers.length).toBe(1);
    expect((headers[0].nativeElement as HTMLElement).textContent).toContain('Pomodoro');
  });
});
