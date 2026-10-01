import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbService } from '../../../database/db.service';
import { PomodoroTimerService } from '../../pomodoro/services/pomodoro-timer.service';
import { DatabasePurgeService } from './database-purge.service';

describe('DatabasePurgeService', () => {
  let service: DatabasePurgeService;
  let calls: string[];
  let dbMock: { purgeDatabase: ReturnType<typeof vi.fn> };
  let timerMock: { stopTimer: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    calls = [];
    dbMock = { purgeDatabase: vi.fn().mockImplementation(() => Promise.resolve(calls.push('purge'))) };
    timerMock = { stopTimer: vi.fn().mockImplementation(() => Promise.resolve(calls.push('stop'))) };

    TestBed.configureTestingModule({
      providers: [
        DatabasePurgeService,
        { provide: DbService, useValue: dbMock },
        { provide: PomodoroTimerService, useValue: timerMock },
      ],
    });
    service = TestBed.inject(DatabasePurgeService);
  });

  it('should purge the database, then stop the timer', async () => {
    await service.purge();

    expect(calls).toEqual(['purge', 'stop']);
  });

  it('should leave the timer running and not swallow the error when the purge fails', async () => {
    dbMock.purgeDatabase.mockRejectedValue(new Error('boom'));

    await expect(service.purge()).rejects.toThrow('boom');

    expect(timerMock.stopTimer).not.toHaveBeenCalled();
  });
});
