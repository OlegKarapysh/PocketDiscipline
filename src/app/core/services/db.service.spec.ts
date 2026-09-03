import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
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

  afterEach(() => {
    vi.restoreAllMocks();
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
    const validSession = {
      id: 'session-123',
      durationMinutes: 25,
      engagementType: EngagementType.WORK,
      startTime: Date.now(),
      status: PomodoroSessionStatus.COMPLETED,
    };

    expect(service.isValidPomodoroSession(validSession)).toBe(true);
  });

  it('should reject invalid PomodoroSession objects in isValidPomodoroSession', () => {
    expect(service.isValidPomodoroSession(null)).toBe(false);
    expect(service.isValidPomodoroSession(undefined)).toBe(false);
    expect(service.isValidPomodoroSession({})).toBe(false);
    expect(service.isValidPomodoroSession({ id: '', durationMinutes: 25, startTime: 1000, status: 'active' })).toBe(false);
    expect(service.isValidPomodoroSession({ id: 's-1', durationMinutes: '25', startTime: 1000, status: 'active' })).toBe(false);
    expect(service.isValidPomodoroSession({ id: 's-1', durationMinutes: 25, startTime: '1000', status: 'active' })).toBe(false);
  });

  it('should return predefined initial goals with valid structures', () => {
    const initialGoals = service.getInitialGoals();

    expect(initialGoals).toHaveLength(3);
    expect(initialGoals[0].title).toBe('do 50 push-ups on fists');
    expect(initialGoals[1].title).toBe('do 100 squats');
    expect(initialGoals[2].title).toBe('do 12 pomodoro a day');
  });

  describe('migrateLegacyPomodoroDatabase', () => {
    it('should skip migration when legacy database does not exist', async () => {
      vi.spyOn(Dexie, 'exists').mockResolvedValue(false);
      const deleteSpy = vi.spyOn(Dexie, 'delete');

      await service.migrateLegacyPomodoroDatabase();

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should catch error and log error when migration fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // suppress expected console error in test
      });
      vi.spyOn(Dexie, 'exists').mockRejectedValue(new Error('IndexedDB failure'));

      await service.migrateLegacyPomodoroDatabase();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to migrate legacy Pomodoro database:',
        expect.any(Error)
      );
    });
  });
});
