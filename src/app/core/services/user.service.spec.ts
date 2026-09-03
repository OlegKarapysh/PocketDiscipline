import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from './user.service';
import { DbService } from './db.service';
import { EventBusService, EVENT_TYPE } from './event-bus.service';
import { User, CURRENT_USER_ID, DEFAULT_INITIAL_BALANCE } from '../models/user.model';



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
          balance: 500 + 200,
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
          balance: 500 + -200,
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
  });
});
