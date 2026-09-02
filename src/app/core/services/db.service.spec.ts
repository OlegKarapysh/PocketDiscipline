import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { DbService } from './db.service';
import { EngagementType } from '../../features/pomodoro/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../features/pomodoro/models/pomodoro-session-status.enum';

describe('DbService', () => {
  let service: DbService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DbService],
    });
    service = TestBed.inject(DbService);
  });

  it('should instantiate DbService with all required tables', () => {
    expect(service).toBeDefined();
    expect(service.name).toBe('pocket-discipline-db');
    expect(service.users).toBeDefined();
    expect(service.tasks).toBeDefined();
    expect(service.goals).toBeDefined();
    expect(service.dailyTasks).toBeDefined();
    expect(service.dailyScores).toBeDefined();
    expect(service.pomodoroSessions).toBeDefined();
    expect(service.dailyTaskCompletions).toBeDefined();
  });

  it('should validate valid PomodoroSession objects in isValidPomodoroSession', () => {
    // Access private validator via any for unit testing validation logic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validator = (service as any).isValidPomodoroSession.bind(service);

    const validSession = {
      id: 'session-123',
      durationMinutes: 25,
      engagementType: EngagementType.WORK,
      startTime: Date.now(),
      status: PomodoroSessionStatus.COMPLETED,
    };

    expect(validator(validSession)).toBe(true);
  });

  it('should reject invalid PomodoroSession objects in isValidPomodoroSession', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validator = (service as any).isValidPomodoroSession.bind(service);

    expect(validator(null)).toBe(false);
    expect(validator(undefined)).toBe(false);
    expect(validator({})).toBe(false);
    expect(validator({ id: '', durationMinutes: 25, startTime: 1000, status: 'active' })).toBe(false);
    expect(validator({ id: 's-1', durationMinutes: '25', startTime: 1000, status: 'active' })).toBe(false);
    expect(validator({ id: 's-1', durationMinutes: 25, startTime: '1000', status: 'active' })).toBe(false);
  });

  it('should return predefined initial goals with valid structures', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialGoals = (service as any).getInitialGoals();

    expect(initialGoals).toHaveLength(3);
    expect(initialGoals[0].title).toBe('do 50 push-ups on fists');
    expect(initialGoals[1].title).toBe('do 100 squats');
    expect(initialGoals[2].title).toBe('do 12 pomodoro a day');
  });
});
