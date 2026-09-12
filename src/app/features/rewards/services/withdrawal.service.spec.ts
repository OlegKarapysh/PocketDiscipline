import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { WithdrawalService } from './withdrawal.service';
import { DbService } from '../../../core/services/db.service';
import { CURRENT_USER_ID, User } from '../../../core/models/user.model';
import { WithdrawalRecord } from '../models/withdrawal.model';
import { RewardItem } from '../models/reward.model';

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
                // no-op for mock
              },
            };
          },
        };
      },
    }),
  };
});

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let dbMock: {
    users: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    withdrawals: {
      get: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
    };
    rewards: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    transaction: ReturnType<typeof vi.fn>;
  };

  let mockUser: User;
  let mockWithdrawal: WithdrawalRecord;

  beforeEach(() => {
    mockUser = {
      id: CURRENT_USER_ID,
      name: 'Current',
      balance: 500,
      createdAt: 1000,
      updatedAt: 1000,
    };

    mockWithdrawal = {
      id: 'w-1',
      amount: 100,
      title: 'Protein Bar',
      categoryId: 'cat-food',
      notes: 'Tasty snack',
      date: '2026-09-05',
      timestamp: 1700000000000,
      rewardId: null,
    };

    dbMock = {
      users: {
        get: vi.fn().mockResolvedValue({ ...mockUser }),
        update: vi.fn().mockResolvedValue(1),
      },
      withdrawals: {
        get: vi.fn().mockResolvedValue(mockWithdrawal),
        add: vi.fn().mockResolvedValue('w-1'),
        delete: vi.fn().mockResolvedValue(undefined),
        orderBy: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([mockWithdrawal]),
          }),
        }),
      },
      rewards: {
        get: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
      },
      transaction: vi.fn().mockImplementation(async (...args: unknown[]) => {
        const fn = args.find((arg): arg is () => Promise<unknown> => typeof arg === 'function');
        if (fn) await fn();
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        WithdrawalService,
        { provide: DbService, useValue: dbMock },
      ],
    });

    service = TestBed.inject(WithdrawalService);
  });

  it('should successfully record withdrawal and deduct user balance', async () => {
    const record = await service.withdraw({
      amount: 120,
      title: 'Protein Bar',
      categoryId: 'cat-food',
      notes: 'Post workout',
    });

    expect(record.amount).toBe(120);
    expect(record.title).toBe('Protein Bar');
    expect(record.categoryId).toBe('cat-food');
    expect(record.notes).toBe('Post workout');
    expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(record.timestamp).toBeGreaterThan(0);

    expect(dbMock.transaction).toHaveBeenCalled();
    expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
      balance: 380,
      updatedAt: expect.any(Number) as number,
    });
    expect(dbMock.withdrawals.add).toHaveBeenCalledWith(record);
  });

  it('should trim title and trim optional notes or set to undefined when blank', async () => {
    const recordWithWhitespace = await service.withdraw({
      amount: 50,
      title: '  Coffee Drink  ',
      categoryId: 'cat-food',
      notes: '   ',
    });

    expect(recordWithWhitespace.title).toBe('Coffee Drink');
    expect(recordWithWhitespace.notes).toBeUndefined();
  });

  it('should reject non-positive amounts', async () => {
    await expect(service.withdraw({
      amount: 0,
      title: 'Coffee',
      categoryId: 'cat-food',
    })).rejects.toThrow('Amount must be greater than zero');

    await expect(service.withdraw({
      amount: -50,
      title: 'Coffee',
      categoryId: 'cat-food',
    })).rejects.toThrow('Amount must be greater than zero');
  });

  it('should reject non-finite amounts (NaN, Infinity)', async () => {
    await expect(service.withdraw({
      amount: Number.NaN,
      title: 'Coffee',
      categoryId: 'cat-food',
    })).rejects.toThrow('Amount must be greater than zero');

    await expect(service.withdraw({
      amount: Number.POSITIVE_INFINITY,
      title: 'Coffee',
      categoryId: 'cat-food',
    })).rejects.toThrow('Amount must be greater than zero');
  });

  it('should reject empty title or whitespace-only title', async () => {
    await expect(service.withdraw({
      amount: 50,
      title: '   ',
      categoryId: 'cat-food',
    })).rejects.toThrow('Title cannot be empty');
  });

  it('should reject withdrawal when balance is insufficient', async () => {
    dbMock.users.get.mockResolvedValueOnce({ ...mockUser, balance: 50 });

    await expect(service.withdraw({
      amount: 100,
      title: 'Tech Gadget',
      categoryId: 'cat-tech',
    })).rejects.toThrow('Insufficient balance');
  });

  it('should reject withdrawal when user record is not found in database', async () => {
    dbMock.users.get.mockResolvedValueOnce(undefined);

    await expect(service.withdraw({
      amount: 50,
      title: 'Snack',
      categoryId: 'cat-food',
    })).rejects.toThrow('Insufficient balance');
  });

  it('should revert a withdrawal, refund balance, and delete record', async () => {
    await service.revertWithdrawal('w-1');

    expect(dbMock.transaction).toHaveBeenCalled();
    expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
      balance: 600,
      updatedAt: expect.any(Number) as number,
    });
    expect(dbMock.withdrawals.delete).toHaveBeenCalledWith('w-1');
  });

  it('should throw error when reverting a non-existent withdrawal', async () => {
    dbMock.withdrawals.get.mockResolvedValueOnce(undefined);
    await expect(service.revertWithdrawal('unknown')).rejects.toThrow('Withdrawal record not found');
  });

  it('should reset one-time reward status to active when reverting linked withdrawal', async () => {
    const linkedRecord: WithdrawalRecord = {
      ...mockWithdrawal,
      rewardId: 'rew-1',
    };
    dbMock.withdrawals.get.mockResolvedValueOnce(linkedRecord);

    const linkedReward: RewardItem = {
      id: 'rew-1',
      title: 'Headphones',
      cost: 1500,
      categoryId: 'cat-tech',
      type: 'one-time',
      status: 'claimed',
      claimedAt: 123456,
      claimCount: 1,
      createdAt: 1000,
    };
    dbMock.rewards.get.mockResolvedValueOnce(linkedReward);

    await service.revertWithdrawal('w-1');

    expect(dbMock.rewards.update).toHaveBeenCalledWith('rew-1', {
      status: 'active',
      claimedAt: null,
      updatedAt: expect.any(Number) as number,
    });
  });

  it('should decrement repeatable reward claimCount when reverting linked withdrawal', async () => {
    const linkedRecord: WithdrawalRecord = {
      ...mockWithdrawal,
      rewardId: 'rew-2',
    };
    dbMock.withdrawals.get.mockResolvedValueOnce(linkedRecord);

    const repeatableReward: RewardItem = {
      id: 'rew-2',
      title: 'Coffee',
      cost: 80,
      categoryId: 'cat-food',
      type: 'repeatable',
      status: 'active',
      claimCount: 3,
      createdAt: 1000,
    };
    dbMock.rewards.get.mockResolvedValueOnce(repeatableReward);

    await service.revertWithdrawal('w-1');

    expect(dbMock.rewards.update).toHaveBeenCalledWith('rew-2', {
      claimCount: 2,
      updatedAt: expect.any(Number) as number,
    });
  });

  it('should not decrement repeatable claimCount below zero when reverting', async () => {
    const linkedRecord: WithdrawalRecord = {
      ...mockWithdrawal,
      rewardId: 'rew-zero',
    };
    dbMock.withdrawals.get.mockResolvedValueOnce(linkedRecord);

    const zeroCountReward: RewardItem = {
      id: 'rew-zero',
      title: 'Coffee',
      cost: 80,
      categoryId: 'cat-food',
      type: 'repeatable',
      status: 'active',
      claimCount: 0,
      createdAt: 1000,
    };
    dbMock.rewards.get.mockResolvedValueOnce(zeroCountReward);

    await service.revertWithdrawal('w-1');

    expect(dbMock.rewards.update).toHaveBeenCalledWith('rew-zero', {
      claimCount: 0,
      updatedAt: expect.any(Number) as number,
    });
  });

  it('should safely complete reversion when linked reward was deleted', async () => {
    const linkedRecord: WithdrawalRecord = {
      ...mockWithdrawal,
      rewardId: 'deleted-rew',
    };
    dbMock.withdrawals.get.mockResolvedValueOnce(linkedRecord);
    dbMock.rewards.get.mockResolvedValueOnce(undefined);

    await service.revertWithdrawal('w-1');

    expect(dbMock.users.update).toHaveBeenCalled();
    expect(dbMock.withdrawals.delete).toHaveBeenCalledWith('w-1');
  });

  it('should query and filter withdrawals', async () => {
    const records = await firstValueFrom(service.getWithdrawals({ categoryId: 'cat-food' }));
    expect(records).toHaveLength(1);
    expect(records[0].categoryId).toBe('cat-food');
  });

  it('should filter withdrawals by date and search query', async () => {
    const list = await firstValueFrom(service.getWithdrawals({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      searchQuery: 'protein',
    }));
    expect(list).toHaveLength(1);

    const empty = await firstValueFrom(service.getWithdrawals({ searchQuery: 'nonexistent' }));
    expect(empty).toHaveLength(0);
  });

  it('should get withdrawal by id', async () => {
    const result = await service.getWithdrawalById('w-1');
    expect(result).toEqual(mockWithdrawal);
  });
});
