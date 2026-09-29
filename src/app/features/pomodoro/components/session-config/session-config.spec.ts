import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { SessionConfig } from './session-config';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { EngagementType } from '../../../../core/models/engagement-type.enum';

describe('SessionConfig', () => {
  let component: SessionConfig;
  let fixture: ComponentFixture<SessionConfig>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<EngagementType>>;
    setConfig: ReturnType<typeof vi.fn>;
  };

  const typeDuration = async (value: string) => {
    const input = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
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
      providers: [{ provide: PomodoroTimerService, useValue: timerServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionConfig);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render config container when timer is inactive', () => {
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

  it('should show the current duration from the timer service', () => {
    const input = fixture.debugElement.query(By.css('input[type="number"]')).nativeElement as HTMLInputElement;
    expect(input.value).toBe('25');
  });

  it('should not push the unchanged config back to the timer service', () => {
    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should update duration when value is within valid range [15, 120]', async () => {
    await typeDuration('45');

    expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
      durationMinutes: 45,
      engagementType: EngagementType.WORK,
    });
  });

  it('should ignore duration update when value is below minimum (< 15)', async () => {
    await typeDuration('10');

    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should ignore duration update when value is above maximum (> 120)', async () => {
    await typeDuration('130');

    expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
  });

  it('should update engagement type', async () => {
    component.configForm.engagementType().value.set(EngagementType.STUDY);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
      durationMinutes: 25,
      engagementType: EngagementType.STUDY,
    });
  });
});
