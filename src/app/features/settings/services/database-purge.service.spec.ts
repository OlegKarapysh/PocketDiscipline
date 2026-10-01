import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbService } from '../../../database/db.service';
import { PomodoroTimerService } from '../../pomodoro/services/pomodoro-timer.service';
import { DatabasePurgeService } from './database-purge.service';

describe('DatabasePurgeService', () => {
  let service: DatabasePurgeService;
  let calls: string[];
  let dbMock: { purgeDatabase: ReturnType<typeof vi.fn> };
  let timerMock: { stopTimer: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    calls = [];
    dbMock = { purgeDatabase: vi.fn().mockImplementation(() => Promise.resolve(calls.push('purge'))) };
    timerMock = { stopTimer: vi.fn().mockImplementation(() => Promise.resolve(calls.push('stop'))) };
    routerMock = { navigate: vi.fn().mockImplementation(() => Promise.resolve(calls.push('navigate'))) };

    TestBed.configureTestingModule({
      providers: [
        DatabasePurgeService,
        { provide: DbService, useValue: dbMock },
        { provide: PomodoroTimerService, useValue: timerMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(DatabasePurgeService);
  });

  it('should stop the timer, purge the database, then go home', async () => {
    await service.purge();

    expect(calls).toEqual(['stop', 'purge', 'navigate']);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should neither navigate nor swallow the error when the purge fails', async () => {
    dbMock.purgeDatabase.mockRejectedValue(new Error('boom'));

    await expect(service.purge()).rejects.toThrow('boom');

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
