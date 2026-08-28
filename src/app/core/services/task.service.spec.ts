import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskService } from './task.service';
import { DbService } from './db.service';
import { UserService } from './user.service';
import { DisciplineItem, DISCIPLINE_ITEM_TYPE } from '../models/data-models';

const TEST_TASK_ID = 't-1';
const TEST_TASK_TITLE = 'Drink Water';
const TEST_REWARD = 20;
const ONE_DAY_MS = 86_400_000;

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
    await service.addTask(TEST_TASK_TITLE, DISCIPLINE_ITEM_TYPE.HABIT, TEST_REWARD);

    expect(dbMock.tasks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TEST_TASK_TITLE,
        type: DISCIPLINE_ITEM_TYPE.HABIT,
        rewardValue: TEST_REWARD,
        isCompleted: false,
        lastCompletedAt: null,
      })
    );
  });

  it('should complete an uncompleted task, update timestamp, and add balance', async () => {
    const task: DisciplineItem = {
      id: TEST_TASK_ID,
      title: TEST_TASK_TITLE,
      type: DISCIPLINE_ITEM_TYPE.HABIT,
      rewardValue: TEST_REWARD,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: Date.now(),
    };
    dbMock.tasks.get.mockResolvedValue(task);

    await service.completeTask(TEST_TASK_ID);

    expect(dbMock.tasks.update).toHaveBeenCalledWith(
      TEST_TASK_ID,
      expect.objectContaining({
        isCompleted: true,
      })
    );
    expect(userMock.addBalance).toHaveBeenCalledWith(TEST_REWARD);
  });

  it('should not complete a task if already completed', async () => {
    const task: DisciplineItem = {
      id: TEST_TASK_ID,
      title: TEST_TASK_TITLE,
      type: DISCIPLINE_ITEM_TYPE.HABIT,
      rewardValue: TEST_REWARD,
      isCompleted: true,
      lastCompletedAt: Date.now(),
      createdAt: Date.now(),
    };
    dbMock.tasks.get.mockResolvedValue(task);

    await service.completeTask(TEST_TASK_ID);

    expect(dbMock.tasks.update).not.toHaveBeenCalled();
    expect(userMock.addBalance).not.toHaveBeenCalled();
  });

  it('should perform daily reset on habits completed on a previous day', async () => {
    const yesterday = Date.now() - ONE_DAY_MS;
    const completedHabit: DisciplineItem = {
      id: TEST_TASK_ID,
      title: TEST_TASK_TITLE,
      type: DISCIPLINE_ITEM_TYPE.HABIT,
      rewardValue: TEST_REWARD,
      isCompleted: true,
      lastCompletedAt: yesterday,
      createdAt: Date.now() - (5 * ONE_DAY_MS),
    };

    whereMock.toArray.mockResolvedValue([completedHabit]);

    await service.performDailyReset();

    expect(dbMock.tasks.update).toHaveBeenCalledWith(TEST_TASK_ID, {
      isCompleted: false,
    });
  });
});
