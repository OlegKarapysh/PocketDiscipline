import { TestBed } from '@angular/core/testing';
import { GoalService } from './goal.service';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('GoalService', () => {
  let service: GoalService;
  let dbMock: any;
  let userMock: any;

  beforeEach(() => {
    dbMock = {
      goals: {
        where: vi.fn().mockReturnThis(),
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
        reverse: vi.fn().mockReturnThis(),
        sortBy: vi.fn().mockResolvedValue([]),
        get: vi.fn(),
        update: vi.fn(),
        add: vi.fn(),
        delete: vi.fn(),
      },
      users: {},
      transaction: vi.fn().mockImplementation(async (mode, tables, tables2, cb) => {
        await cb();
      }),
    };

    userMock = {
      addBalance: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [GoalService, { provide: DbService, useValue: dbMock }, { provide: UserService, useValue: userMock }],
    });
    service = TestBed.inject(GoalService);
  });

  it('should fetch active goals', () => {
    service.getActiveGoals();
    expect(dbMock.goals.where).toHaveBeenCalledWith('status');
  });

  it('should complete a goal', async () => {
    dbMock.goals.get.mockResolvedValue({ id: '1', status: 'ACTIVE', rewardValue: 100 });
    await service.completeGoal('1');
    expect(dbMock.goals.update).toHaveBeenCalled();
    expect(userMock.addBalance).toHaveBeenCalledWith(100);
  });

  it('should undo complete a goal', async () => {
    dbMock.goals.get.mockResolvedValue({ id: '1', status: 'COMPLETED', rewardValue: 100 });
    await service.undoCompleteGoal('1');
    expect(dbMock.goals.update).toHaveBeenCalled();
    expect(userMock.addBalance).toHaveBeenCalledWith(-100);
  });

  it('should add a goal', async () => {
    dbMock.goals.toArray.mockResolvedValue([]);
    await service.addGoal('Test Goal', 500);
    expect(dbMock.goals.add).toHaveBeenCalled();
  });
});
