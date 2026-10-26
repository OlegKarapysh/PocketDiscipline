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

    it('should ignore non-finite amounts to protect balance integrity', async () => {
      await service.addBalance(Number.NaN);
      await service.addBalance(Infinity);

      expect(dbMock.transaction).not.toHaveBeenCalled();
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

  describe('setUpBalance', () => {
    const existingUser: User = { id: CURRENT_USER_ID, name: 'Current', balance: 500, createdAt: 1000, updatedAt: 1000 };

    it('should replace the balance and record when it was set up', async () => {
      dbMock.users.get.mockResolvedValue(existingUser);

      await service.setUpBalance(12_000);

      expect(dbMock.users.update).toHaveBeenCalledWith(
        CURRENT_USER_ID,
        expect.objectContaining({ balance: 12_000, balanceSetUpAt: expect.any(Number) as number }),
      );
    });

    it('should accept a balance of 0', async () => {
      dbMock.users.get.mockResolvedValue(existingUser);

      await service.setUpBalance(0);

      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, expect.objectContaining({ balance: 0 }));
    });

    it('should create the user record with the balance if it is missing', async () => {
      await service.setUpBalance(300);

      expect(dbMock.users.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: CURRENT_USER_ID, balance: 300, balanceSetUpAt: expect.any(Number) as number }),
      );
    });

    it('should refuse a second setup', async () => {
      dbMock.users.get.mockResolvedValue({ ...existingUser, balanceSetUpAt: 2000 });

      await expect(service.setUpBalance(12_000)).rejects.toThrow();

      expect(dbMock.users.update).not.toHaveBeenCalled();
    });

    it('should let only the first of two concurrent setups through', async () => {
      let stored: User = { ...existingUser };
      dbMock.users.get.mockImplementation(() => ({ ...stored }));
      dbMock.users.update.mockImplementation((_id: number, changes: Partial<User>) => {
        stored = { ...stored, ...changes };
        return 1;
      });

      const results = await Promise.allSettled([service.setUpBalance(100), service.setUpBalance(200)]);

      expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
      expect(stored.balance).toBe(100);
    });

    it('should reject a negative or fractional balance without touching the database', async () => {
      for (const amount of [-1, 12.5, Number.NaN]) {
        await expect(service.setUpBalance(amount)).rejects.toThrow();
      }

      expect(dbMock.transaction).not.toHaveBeenCalled();
    });
  });
});
