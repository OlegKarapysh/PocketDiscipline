import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { SessionConfig } from './session-config';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { ENGAGEMENT_TYPE } from '../../models/pomodoro-session.model';

const VALID_DURATION = 45;
const INVALID_LOW_DURATION = 10;
const INVALID_HIGH_DURATION = 130;
const DEFAULT_DURATION = 25;

describe('SessionConfig', () => {
  let component: SessionConfig;
  let fixture: ComponentFixture<SessionConfig>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<string>>;
    setConfig: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      durationMinutes: signal(DEFAULT_DURATION),
      engagementType: signal(ENGAGEMENT_TYPE.WORK),
      setConfig: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SessionConfig],
      providers: [
        { provide: PomodoroTimerService, useValue: timerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionConfig);
    component = fixture.componentInstance;
  });

  it('should update duration when value is within valid range [15, 120]', () => {
    component.updateDuration(VALID_DURATION);

    expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
      durationMinutes: VALID_DURATION,
      engagementType: ENGAGEMENT_TYPE.WORK,
    });
  });

  it('should ignore duration update when value is below minimum (< 15)', () => {
    component.updateDuration(INVALID_LOW_DURATION);

    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should ignore duration update when value is above maximum (> 120)', () => {
    component.updateDuration(INVALID_HIGH_DURATION);

    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should update engagement type', () => {
    component.updateEngagement(ENGAGEMENT_TYPE.STUDY);

    expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
      durationMinutes: DEFAULT_DURATION,
      engagementType: ENGAGEMENT_TYPE.STUDY,
    });
  });
});
