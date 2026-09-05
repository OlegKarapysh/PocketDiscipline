import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { RewardsService } from './rewards.service';
import { DbService } from '../../../core/services/db.service';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
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

describe('RewardsService', () => {
  let service: RewardsService;
  let dbMock: {
    users: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    rewards: {
      get: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
    };
    withdrawals: {
      add: ReturnType<typeof vi.fn>;
    };
    transaction: ReturnType<typeof vi.fn>;
  };

  let mockReward: RewardItem;
  let mockRepeatableReward: RewardItem;

  beforeEach(() => {
    mockReward = {
      id: 'rew-1',
      title: 'Mechanical Keyboard',
      cost: 2500,
      categoryId: 'cat-tech',
      type: 'one-time',
      status: 'active',
      claimCount: 0,
      claimedAt: null,
      createdAt: 1000,
    };

    mockRepeatableReward = {
      id: 'rew-2',
      title: 'Specialty Coffee',
      cost: 80,
      categoryId: 'cat-food',
      type: 'repeatable',
      status: 'active',
      claimCount: 1,
      claimedAt: null,
      createdAt: 2000,
    };

    dbMock = {
      users: {
        get: vi.fn().mockResolvedValue({ id: CURRENT_USER_ID, balance: 3000 }),
        update: vi.fn().mockResolvedValue(1),
      },
      rewards: {
        get: vi.fn().mockImplementation((id: string) => {
          if (id === 'rew-1') return Promise.resolve({ ...mockReward });
          if (id === 'rew-2') return Promise.resolve({ ...mockRepeatableReward });
          return Promise.resolve(undefined);
        }),
        add: vi.fn().mockResolvedValue('rew-new'),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        orderBy: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([mockReward, mockRepeatableReward]),
          }),
        }),
      },
      withdrawals: {
        add: vi.fn().mockResolvedValue('w-new'),
      },
      transaction: vi.fn().mockImplementation(async (_mode, _t1, _t2, _t3, callback?: () => Promise<void>) => {
        const fn = typeof _t3 === 'function' ? _t3 : callback;
        if (fn) await fn();
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        RewardsService,
        { provide: DbService, useValue: dbMock },
      ],
    });

    service = TestBed.inject(RewardsService);
  });

  it('should return all rewards or filtered rewards by status', async () => {
    const all = await firstValueFrom(service.getRewards());
    expect(all).toHaveLength(2);

    const active = await firstValueFrom(service.getRewards('active'));
    expect(active).toHaveLength(2);

    const claimed = await firstValueFrom(service.getRewards('claimed'));
    expect(claimed).toHaveLength(0);
  });

  it('should get reward by id', async () => {
    const found = await service.getRewardById('rew-1');
    expect(found?.title).toBe('Mechanical Keyboard');

    const notFound = await service.getRewardById('non-existent');
    expect(notFound).toBeUndefined();
  });

  it('should create a new reward item', async () => {
    const created = await service.createReward({
      title: 'Headphones',
      cost: 1500,
      categoryId: 'cat-tech',
      type: 'one-time',
    });

    expect(created.title).toBe('Headphones');
    expect(created.cost).toBe(1500);
    expect(created.status).toBe('active');
    expect(created.claimCount).toBe(0);
    expect(created.claimedAt).toBeNull();
    expect(dbMock.rewards.add).toHaveBeenCalledWith(created);
  });

  it('should reject creating reward with non-positive or non-finite cost', async () => {
    await expect(service.createReward({
      title: 'Bad Cost',
      cost: 0,
      categoryId: 'cat-tech',
      type: 'one-time',
    })).rejects.toThrow('Reward cost must be greater than zero');

    await expect(service.createReward({
      title: 'Bad Cost',
      cost: Number.NaN,
      categoryId: 'cat-tech',
      type: 'one-time',
    })).rejects.toThrow('Reward cost must be greater than zero');
  });

  it('should reject creating reward with empty or whitespace title', async () => {
    await expect(service.createReward({
      title: '   ',
      cost: 50,
      categoryId: 'cat-tech',
      type: 'repeatable',
    })).rejects.toThrow('Reward title cannot be empty');
  });

  it('should update an existing reward item', async () => {
    const updated = await service.updateReward('rew-1', {
      title: 'Gaming Keyboard',
      cost: 2800,
    });

    expect(updated.title).toBe('Gaming Keyboard');
    expect(updated.cost).toBe(2800);
    expect(dbMock.rewards.update).toHaveBeenCalledWith('rew-1', expect.objectContaining({
      title: 'Gaming Keyboard',
      cost: 2800,
    }));
  });

  it('should partially update categoryId and type without altering title or cost', async () => {
    const updated = await service.updateReward('rew-1', {
      categoryId: 'cat-new',
      type: 'repeatable',
    });

    expect(updated.categoryId).toBe('cat-new');
    expect(updated.type).toBe('repeatable');
    expect(updated.title).toBe('Mechanical Keyboard');
  });

  it('should reject invalid cost on update', async () => {
    await expect(service.updateReward('rew-1', { cost: 0 }))
      .rejects.toThrow('Reward cost must be greater than zero');

    await expect(service.updateReward('rew-1', { cost: -10 }))
      .rejects.toThrow('Reward cost must be greater than zero');
  });

  it('should reject empty title on update', async () => {
    await expect(service.updateReward('rew-1', { title: '   ' }))
      .rejects.toThrow('Reward title cannot be empty');
  });

  it('should throw when updating a non-existent reward', async () => {
    await expect(service.updateReward('non-existent', { title: 'New' }))
      .rejects.toThrow('Reward not found');
  });

  it('should delete an existing reward item', async () => {
    await service.deleteReward('rew-1');
    expect(dbMock.rewards.delete).toHaveBeenCalledWith('rew-1');
  });

  it('should throw when deleting a non-existent reward', async () => {
    await expect(service.deleteReward('non-existent')).rejects.toThrow('Reward not found');
  });

  it('should atomically claim a one-time reward, deduct balance, and mark as claimed', async () => {
    const withdrawal = await service.claimReward(mockReward);

    expect(withdrawal.amount).toBe(2500);
    expect(withdrawal.title).toBe('Claimed: Mechanical Keyboard');
    expect(withdrawal.rewardId).toBe('rew-1');

    expect(dbMock.transaction).toHaveBeenCalled();
    expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
      balance: 500,
      updatedAt: expect.any(Number),
    });
    expect(dbMock.rewards.update).toHaveBeenCalledWith('rew-1', expect.objectContaining({
      status: 'claimed',
      claimedAt: expect.any(Number),
    }));
    expect(dbMock.withdrawals.add).toHaveBeenCalled();
  });

  it('should claim a repeatable reward and increment claimCount', async () => {
    const withdrawal = await service.claimReward(mockRepeatableReward);

    expect(withdrawal.amount).toBe(80);
    expect(withdrawal.title).toBe('Claimed: Specialty Coffee');

    expect(dbMock.rewards.update).toHaveBeenCalledWith('rew-2', expect.objectContaining({
      claimCount: 2,
    }));
  });

  it('should reject claiming reward when user balance is insufficient', async () => {
    dbMock.users.get.mockResolvedValueOnce({ id: CURRENT_USER_ID, balance: 100 });

    await expect(service.claimReward(mockReward)).rejects.toThrow('Insufficient balance to claim reward');
  });

  it('should reject claiming reward when user record is not found in database', async () => {
    dbMock.users.get.mockResolvedValueOnce(undefined);

    await expect(service.claimReward(mockReward)).rejects.toThrow('Insufficient balance to claim reward');
  });
});
