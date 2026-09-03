import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskService } from './task.service';
import { DbService } from './db.service';
import { UserService } from './user.service';
import { DisciplineItem } from '../models/discipline-item.model';
import { DisciplineItemType } from '../models/discipline-item-type.enum';

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
});
