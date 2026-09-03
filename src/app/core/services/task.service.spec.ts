import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, from } from 'rxjs';
import { TaskService } from './task.service';
import { DbService } from './db.service';
import { UserService } from './user.service';
import { DisciplineItem } from '../models/discipline-item.model';
import { DisciplineItemType } from '../models/discipline-item-type.enum';

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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('TaskService', () => {
  let service: TaskService;
  let dbMock: {
    tasks: {
      add: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      toArray: ReturnType<typeof vi.fn>;
    };
    users: unknown;
    transaction: ReturnType<typeof vi.fn>;
  };
  let userMock: {
    addBalance: ReturnType<typeof vi.fn>;
  };
  let whereMock: {
    equals: ReturnType<typeof vi.fn>;
    toArray: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    whereMock = {
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };

    dbMock = {
      tasks: {
        add: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        where: vi.fn().mockReturnValue(whereMock),
        toArray: vi.fn().mockResolvedValue([]),
      },
      users: {},
      transaction: vi.fn().mockImplementation(async (_mode, _t1, _t2OrCallback, maybeCb) => {
        const callback = typeof _t2OrCallback === 'function' ? _t2OrCallback : maybeCb;
        if (callback) await callback();
      }),
    };

    userMock = {
      addBalance: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: DbService, useValue: dbMock },
        { provide: UserService, useValue: userMock },
      ],
    });

    service = TestBed.inject(TaskService);
  });

  describe('tasks$ stream', () => {
    it('should trigger performDailyReset and emit tasks from database', async () => {
      const mockTask: DisciplineItem = {
        id: 't-1',
        title: 'Drink Water',
        type: DisciplineItemType.HABIT,
        rewardValue: 20,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: Date.now(),
      };
      dbMock.tasks.toArray.mockResolvedValue([mockTask]);

      const resetSpy = vi.spyOn(service, 'performDailyReset');
      const tasks = await firstValueFrom(from(service.tasks$));

      expect(resetSpy).toHaveBeenCalled();
      expect(tasks).toEqual([mockTask]);
    });
  });

  describe('addTask', () => {
    it('should add a discipline task to the database', async () => {
      await service.addTask('Drink Water', DisciplineItemType.HABIT, 20);

      expect(dbMock.tasks.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Drink Water',
          type: DisciplineItemType.HABIT,
          rewardValue: 20,
          isCompleted: false,
          lastCompletedAt: null,
        })
      );
    });
  });

  describe('completeTask', () => {
    it('should complete an uncompleted task, update timestamp, and add balance', async () => {
      const task: DisciplineItem = {
        id: 't-1',
        title: 'Drink Water',
        type: DisciplineItemType.HABIT,
        rewardValue: 20,
        isCompleted: false,
        lastCompletedAt: null,
        createdAt: Date.now(),
      };
      dbMock.tasks.get.mockResolvedValue(task);

      await service.completeTask('t-1');

      expect(dbMock.tasks.update).toHaveBeenCalledWith(
        't-1',
        expect.objectContaining({
          isCompleted: true,
        })
      );
      expect(userMock.addBalance).toHaveBeenCalledWith(20);
    });

    it('should not complete a task if already completed', async () => {
      const task: DisciplineItem = {
        id: 't-1',
        title: 'Drink Water',
        type: DisciplineItemType.HABIT,
        rewardValue: 20,
        isCompleted: true,
        lastCompletedAt: Date.now(),
        createdAt: Date.now(),
      };
      dbMock.tasks.get.mockResolvedValue(task);

      await service.completeTask('t-1');

      expect(dbMock.tasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
    });

    it('should do nothing if task is not found', async () => {
      dbMock.tasks.get.mockResolvedValue(undefined);

      await service.completeTask('non-existent-id');

      expect(dbMock.tasks.update).not.toHaveBeenCalled();
      expect(userMock.addBalance).not.toHaveBeenCalled();
      expect(dbMock.transaction).not.toHaveBeenCalled();
    });
  });

  describe('performDailyReset', () => {
    it('should perform daily reset on habits completed on a previous day', async () => {
      const yesterday = Date.now() - ONE_DAY_MS;
      const completedHabit: DisciplineItem = {
        id: 't-1',
        title: 'Drink Water',
        type: DisciplineItemType.HABIT,
        rewardValue: 20,
        isCompleted: true,
        lastCompletedAt: yesterday,
        createdAt: Date.now() - (5 * ONE_DAY_MS),
      };

      whereMock.toArray.mockResolvedValue([completedHabit]);

      await service.performDailyReset();

      expect(dbMock.tasks.update).toHaveBeenCalledWith('t-1', {
        isCompleted: false,
      });
    });

    it('should not reset habits that were completed today', async () => {
      const completedHabitToday: DisciplineItem = {
        id: 't-1',
        title: 'Drink Water',
        type: DisciplineItemType.HABIT,
        rewardValue: 20,
        isCompleted: true,
        lastCompletedAt: Date.now(),
        createdAt: Date.now() - (5 * ONE_DAY_MS),
      };

      whereMock.toArray.mockResolvedValue([completedHabitToday]);

      await service.performDailyReset();

      expect(dbMock.tasks.update).not.toHaveBeenCalled();
    });

    it('should not perform transaction if no habits need to be reset', async () => {
      whereMock.toArray.mockResolvedValue([]);

      await service.performDailyReset();

      expect(dbMock.transaction).not.toHaveBeenCalled();
    });
  });
});
