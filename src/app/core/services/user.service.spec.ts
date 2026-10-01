import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, from } from 'rxjs';
import { UserService } from './user.service';
import { DbService } from '../../database/db.service';
import type { User } from '../models/user.model';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../models/user.model';

vi.mock('dexie', () => {
  class MockDexie {
    version = vi.fn();
  }
  return {
    default: MockDexie,
    Dexie: MockDexie,
    liveQuery: (fn: () => unknown) => ({
      '@@observable'() {
        return {
          subscribe(subscriber: { next: (val: unknown) => void; complete: () => void; error: (err: unknown) => void }) {
            Promise.resolve()
              .then(fn)
              .then(
                (val) => {
                  subscriber.next(val);
                  subscriber.complete();
                },
                (err: unknown) => {
                  subscriber.error(err);
                },
              );
            return {
              unsubscribe() {
                // no-op for test mock
              },
            };
          },
        };
      },
    }),
  };
});

describe('UserService', () => {
  let service: UserService;
  let dbMock: {
    users: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
    };
    transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // IndexedDB runs overlapping read-write transactions on the same table one after another.
    let queue: Promise<unknown> = Promise.resolve();
    dbMock = {
      users: {
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        add: vi.fn().mockResolvedValue(CURRENT_USER_ID),
      },
      transaction: vi.fn((...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        const run = queue.then(callback);
        queue = run.catch(() => undefined);
        return run;
      }),
    };

    TestBed.configureTestingModule({
      providers: [UserService, { provide: DbService, useValue: dbMock }],
    });

    service = TestBed.inject(UserService);
  });

  describe('user$ live query', () => {
    it('should emit existing user from database', async () => {
      const existingUser: User = {
        id: CURRENT_USER_ID,
        name: 'Existing',
        balance: 1500,
        createdAt: 1000,
        updatedAt: 2000,
      };
      dbMock.users.get.mockResolvedValue(existingUser);

      const user = await firstValueFrom(from(service.user$));

      expect(dbMock.users.get).toHaveBeenCalledWith(CURRENT_USER_ID);
      expect(user).toEqual(existingUser);
    });

    it('should return default initial user when user is not found in database', async () => {
      dbMock.users.get.mockResolvedValue(undefined);

      const user = await firstValueFrom(from(service.user$));

      expect(dbMock.users.get).toHaveBeenCalledWith(CURRENT_USER_ID);
      expect(user).toEqual(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: DEFAULT_INITIAL_BALANCE,
        }),
      );
    });
  });

  describe('addBalance', () => {
    it('should increment existing user balance and update timestamp', async () => {
      const existingUser: User = {
        id: CURRENT_USER_ID,
        name: 'Current',
        balance: 500,
        createdAt: 1000,
        updatedAt: 1000,
      };
      dbMock.users.get.mockResolvedValue(existingUser);

      await service.addBalance(200);

      expect(dbMock.users.update).toHaveBeenCalledWith(
        CURRENT_USER_ID,
        expect.objectContaining({
          balance: 700,
        }),
      );
    });

    it('should handle negative amount for undoing rewards', async () => {
      const existingUser: User = {
        id: CURRENT_USER_ID,
        name: 'Current',
        balance: 500,
        createdAt: 1000,
        updatedAt: 1000,
      };
      dbMock.users.get.mockResolvedValue(existingUser);

      await service.addBalance(-200);

      expect(dbMock.users.update).toHaveBeenCalledWith(
        CURRENT_USER_ID,
        expect.objectContaining({
          balance: 300,
        }),
      );
    });

    it('should apply concurrent credits one after another so neither is lost', async () => {
      let stored: User = { id: CURRENT_USER_ID, name: 'Current', balance: 500, createdAt: 1000, updatedAt: 1000 };
      dbMock.users.get.mockImplementation(() => ({ ...stored }));
      dbMock.users.update.mockImplementation((_id: number, changes: Partial<User>) => {
        stored = { ...stored, ...changes };
        return 1;
      });

      await Promise.all([service.addBalance(100), service.addBalance(200)]);

      expect(stored.balance).toBe(800);
    });

    it('should create new user record if user not found in database', async () => {
      dbMock.users.get.mockResolvedValue(undefined);

      await service.addBalance(200);

      expect(dbMock.users.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          balance: 200,
        }),
      );
    });
  });
});
