import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { SessionConfig } from './session-config';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { EngagementType } from '../../models/engagement-type.enum';

describe('SessionConfig', () => {
  let component: SessionConfig;
  let fixture: ComponentFixture<SessionConfig>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<EngagementType>>;
    setConfig: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      durationMinutes: signal(25),
      engagementType: signal(EngagementType.WORK),
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

  it('should render config container when timer is inactive', async () => {
    timerServiceMock.isActive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.debugElement.query(By.css('.config-container'));
    expect(container).toBeTruthy();
  });

  it('should hide config container when timer is active', async () => {
    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.debugElement.query(By.css('.config-container'));
    expect(container).toBeNull();
  });

  it('should update duration when value is within valid range [15, 120]', () => {
    component.updateDuration(45);

    expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
      durationMinutes: 45,
      engagementType: EngagementType.WORK,
    });
  });

  it('should ignore duration update when value is below minimum (< 15)', () => {
    component.updateDuration(10);

    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should ignore duration update when value is above maximum (> 120)', () => {
    component.updateDuration(130);

    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should update engagement type', () => {
    component.updateEngagement(EngagementType.STUDY);

    expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
      durationMinutes: 25,
      engagementType: EngagementType.STUDY,
    });
  });
});
