import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { ERROR_TYPE_LOCKED, RewardsService } from './rewards.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import type { RewardItem } from '../../../core/models/reward.model';

describe('RewardsService', () => {
  let service: RewardsService;
  let db: DbService;

  const mockReward: RewardItem = {
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

  const mockRepeatableReward: RewardItem = {
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

  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add({ id: CURRENT_USER_ID, name: 'Current', balance: 3000, createdAt: 0, updatedAt: 0 });
    await db.rewards.bulkAdd([mockReward, mockRepeatableReward]);
    service = TestBed.inject(RewardsService);
  });

  it('should return all rewards or filtered rewards by status', async () => {
    await db.rewards.update('rew-1', { status: 'claimed' });

    const all = await firstValueFrom(service.getRewards());
    expect(all).toHaveLength(2);

    const active = await firstValueFrom(service.getRewards('active'));
    expect(active.map((reward) => reward.id)).toEqual(['rew-2']);

    const claimed = await firstValueFrom(service.getRewards('claimed'));
    expect(claimed.map((reward) => reward.id)).toEqual(['rew-1']);
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
    expect(await db.rewards.get(created.id)).toEqual(created);
  });

  it('should reject creating reward with non-positive or non-finite cost', async () => {
    await expect(
      service.createReward({
        title: 'Bad Cost',
        cost: 0,
        categoryId: 'cat-tech',
        type: 'one-time',
      }),
    ).rejects.toThrow('Reward cost must be greater than zero');

    await expect(
      service.createReward({
        title: 'Bad Cost',
        cost: Number.NaN,
        categoryId: 'cat-tech',
        type: 'one-time',
      }),
    ).rejects.toThrow('Reward cost must be greater than zero');
    expect(await db.rewards.count()).toBe(2);
  });

  it('should reject creating reward with a cost that is not a whole number of hryvnias', async () => {
    await expect(
      service.createReward({
        title: 'Bad Cost',
        cost: 12.5,
        categoryId: 'cat-tech',
        type: 'one-time',
      }),
    ).rejects.toThrow('Reward cost must be a whole number of hryvnias');
  });

  it('should reject creating reward with empty or whitespace title', async () => {
    await expect(
      service.createReward({
        title: '   ',
        cost: 50,
        categoryId: 'cat-tech',
        type: 'repeatable',
      }),
    ).rejects.toThrow('Reward title cannot be empty');
  });

  it('should update an existing reward item', async () => {
    const updated = await service.updateReward('rew-1', {
      title: 'Gaming Keyboard',
      cost: 2800,
    });

    expect(updated.title).toBe('Gaming Keyboard');
    expect(updated.cost).toBe(2800);
    expect(await db.rewards.get('rew-1')).toEqual(updated);
  });

  it('should partially update categoryId and type without altering title or cost', async () => {
    const updated = await service.updateReward('rew-1', {
      categoryId: 'cat-new',
      type: 'repeatable',
    });

    expect(updated.categoryId).toBe('cat-new');
    expect(updated.type).toBe('repeatable');
    expect(updated.title).toBe('Mechanical Keyboard');
    expect(await db.rewards.get('rew-1')).toEqual(
      expect.objectContaining({ categoryId: 'cat-new', title: 'Mechanical Keyboard', cost: 2500 }),
    );
  });

  it('should refuse to change the type of a reward that has been claimed', async () => {
    await db.rewards.update('rew-1', { status: 'claimed', claimedAt: 5000 });

    await expect(service.updateReward('rew-1', { type: 'repeatable' })).rejects.toThrow(ERROR_TYPE_LOCKED);
    await expect(service.updateReward('rew-2', { type: 'one-time' })).rejects.toThrow(ERROR_TYPE_LOCKED);
    expect((await db.rewards.get('rew-1'))?.type).toBe('one-time');
    expect((await db.rewards.get('rew-2'))?.type).toBe('repeatable');
  });

  it('should still edit the other fields of a claimed reward', async () => {
    const updated = await service.updateReward('rew-2', { title: 'Flat White', type: 'repeatable' });

    expect(updated.title).toBe('Flat White');
    expect(updated.type).toBe('repeatable');
  });

  it('should reject invalid cost on update', async () => {
    await expect(service.updateReward('rew-1', { cost: 0 })).rejects.toThrow('Reward cost must be greater than zero');

    await expect(service.updateReward('rew-1', { cost: -10 })).rejects.toThrow('Reward cost must be greater than zero');

    await expect(service.updateReward('rew-1', { cost: 12.5 })).rejects.toThrow(
      'Reward cost must be a whole number of hryvnias',
    );
    expect((await db.rewards.get('rew-1'))?.cost).toBe(2500);
  });

  it('should reject empty title on update', async () => {
    await expect(service.updateReward('rew-1', { title: '   ' })).rejects.toThrow('Reward title cannot be empty');
  });

  it('should throw when updating a non-existent reward', async () => {
    await expect(service.updateReward('non-existent', { title: 'New' })).rejects.toThrow('Reward not found');
  });

  it('should delete an existing reward item', async () => {
    await service.deleteReward('rew-1');
    expect(await db.rewards.get('rew-1')).toBeUndefined();
  });

  it('should throw when deleting a non-existent reward', async () => {
    await expect(service.deleteReward('non-existent')).rejects.toThrow('Reward not found');
  });

  it('should atomically claim a one-time reward, deduct balance, and mark as claimed', async () => {
    const withdrawal = await service.claimReward(mockReward);

    expect(withdrawal.amount).toBe(2500);
    expect(withdrawal.title).toBe('Claimed: Mechanical Keyboard');
    expect(withdrawal.rewardId).toBe('rew-1');

    expect(await balance()).toBe(500);
    expect(await db.rewards.get('rew-1')).toEqual(
      expect.objectContaining({
        status: 'claimed',
        claimedAt: expect.any(Number) as number,
      }),
    );
    expect(await db.withdrawals.get(withdrawal.id)).toEqual(withdrawal);
  });

  it('should claim a repeatable reward and increment claimCount', async () => {
    const withdrawal = await service.claimReward(mockRepeatableReward);

    expect(withdrawal.amount).toBe(80);
    expect(withdrawal.title).toBe('Claimed: Specialty Coffee');

    expect(await db.rewards.get('rew-2')).toEqual(expect.objectContaining({ status: 'active', claimCount: 2 }));
  });

  it('should reject claiming reward when user balance is insufficient', async () => {
    await db.users.update(CURRENT_USER_ID, { balance: 100 });

    await expect(service.claimReward(mockReward)).rejects.toThrow('Insufficient balance to claim reward');
    expect(await balance()).toBe(100);
    expect(await db.withdrawals.count()).toBe(0);
    expect((await db.rewards.get('rew-1'))?.status).toBe('active');
  });

  it('should reject claiming reward when user record is not found in database', async () => {
    await db.users.clear();

    await expect(service.claimReward(mockReward)).rejects.toThrow('Insufficient balance to claim reward');
  });
});
