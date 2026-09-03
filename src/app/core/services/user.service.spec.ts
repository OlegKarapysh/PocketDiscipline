import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, from } from 'rxjs';
import { UserService } from './user.service';
import { DbService } from './db.service';
import { EventBusService, EVENT_TYPE } from './event-bus.service';
import { User, CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../models/user.model';

vi.mock('dexie', () => {
  class MockDexie {}
  return {
    default: MockDexie,
    Dexie: MockDexie,
    liveQuery: (fn: () => unknown) => ({
      '@@observable'() {
        return {
          subscribe(subscriber: { next: (val: unknown) => void; complete: () => void; error: (err: unknown) => void }) {
            Promise.resolve().then(fn).then(
              (val) => {
                subscriber.next(val);
                subscriber.complete();
              },
              (err) => subscriber.error(err)
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
  let eventBus: EventBusService;
  let dbMock: {
    users: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    eventBus = new EventBusService();

    dbMock = {
      users: {
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        add: vi.fn().mockResolvedValue(CURRENT_USER_ID),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: DbService, useValue: dbMock },
        { provide: EventBusService, useValue: eventBus },
      ],
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
        })
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
        })
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
        })
      );
    });

    it('should create new user record if user not found in database', async () => {
      dbMock.users.get.mockResolvedValue(undefined);

      await service.addBalance(200);

      expect(dbMock.users.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          balance: 200,
        })
      );
    });
  });

  describe('EventBus Integration', () => {
    it('should react to EVENT_TYPE.REWARD_EARNED and update user balance', async () => {
      const existingUser: User = {
        id: CURRENT_USER_ID,
        name: 'Current',
        balance: DEFAULT_INITIAL_BALANCE,
        createdAt: 1000,
        updatedAt: 1000,
      };
      dbMock.users.get.mockResolvedValue(existingUser);

      eventBus.emit({
        type: EVENT_TYPE.REWARD_EARNED,
        payload: { points: 200 },
        source: 'test',
      });

      // Wait microtasks
      await Promise.resolve();

      expect(dbMock.users.update).toHaveBeenCalledWith(
        CURRENT_USER_ID,
        expect.objectContaining({
          balance: DEFAULT_INITIAL_BALANCE + 200,
        })
      );
    });

    it('should ignore EVENT_TYPE.REWARD_EARNED when points are zero or missing', async () => {
      eventBus.emit({
        type: EVENT_TYPE.REWARD_EARNED,
        payload: { points: 0 },
        source: 'test',
      });

      await Promise.resolve();

      expect(dbMock.users.update).not.toHaveBeenCalled();
      expect(dbMock.users.add).not.toHaveBeenCalled();
    });
  });
});
