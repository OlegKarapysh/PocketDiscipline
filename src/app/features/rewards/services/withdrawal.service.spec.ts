import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { WithdrawalService } from './withdrawal.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import type { User } from '../../../core/models/user.model';
import type { WithdrawalRecord } from '../../../core/models/withdrawal.model';
import type { RewardItem } from '../../../core/models/reward.model';

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let db: DbService;

  const mockUser: User = {
    id: CURRENT_USER_ID,
    name: 'Current',
    balance: 500,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const mockWithdrawal: WithdrawalRecord = {
    id: 'w-1',
    amount: 100,
    title: 'Protein Bar',
    categoryId: 'cat-food',
    notes: 'Tasty snack',
    date: '2026-09-05',
    timestamp: 1700000000000,
    rewardId: null,
  };

  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add(mockUser);
    await db.withdrawals.add(mockWithdrawal);
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

    expect(await balance()).toBe(380);
    expect(await db.withdrawals.get(record.id)).toEqual(record);
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
    await expect(
      service.withdraw({
        amount: 0,
        title: 'Coffee',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Amount must be greater than zero');

    await expect(
      service.withdraw({
        amount: -50,
        title: 'Coffee',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Amount must be greater than zero');
    expect(await balance()).toBe(500);
  });

  it('should reject non-finite amounts (NaN, Infinity)', async () => {
    await expect(
      service.withdraw({
        amount: Number.NaN,
        title: 'Coffee',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Amount must be greater than zero');

    await expect(
      service.withdraw({
        amount: Number.POSITIVE_INFINITY,
        title: 'Coffee',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Amount must be greater than zero');
  });

  it('should reject an amount that is not a whole number of hryvnias', async () => {
    await expect(
      service.withdraw({
        amount: 12.5,
        title: 'Coffee',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Amount must be a whole number of hryvnias');
  });

  it('should spend a 100 ₴ balance down to exactly zero: 99 ₴, then 1 ₴', async () => {
    await db.users.update(CURRENT_USER_ID, { balance: 100 });

    await service.withdraw({ amount: 99, title: 'Dinner', categoryId: 'cat-food' });
    await service.withdraw({ amount: 1, title: 'Gum', categoryId: 'cat-food' });

    expect(await balance()).toBe(0);
  });

  it('should reject empty title or whitespace-only title', async () => {
    await expect(
      service.withdraw({
        amount: 50,
        title: '   ',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Title cannot be empty');
  });

  it('should reject withdrawal when balance is insufficient', async () => {
    await db.users.update(CURRENT_USER_ID, { balance: 50 });

    await expect(
      service.withdraw({
        amount: 100,
        title: 'Tech Gadget',
        categoryId: 'cat-tech',
      }),
    ).rejects.toThrow('Insufficient balance');
    expect(await balance()).toBe(50);
    expect(await db.withdrawals.count()).toBe(1);
  });

  it('should reject withdrawal when user record is not found in database', async () => {
    await db.users.clear();

    await expect(
      service.withdraw({
        amount: 50,
        title: 'Snack',
        categoryId: 'cat-food',
      }),
    ).rejects.toThrow('Insufficient balance');
  });

  it('should revert a withdrawal, refund balance, and delete record', async () => {
    await service.revertWithdrawal('w-1');

    expect(await balance()).toBe(600);
    expect(await db.withdrawals.get('w-1')).toBeUndefined();
  });

  it('should throw error when reverting a non-existent withdrawal', async () => {
    await expect(service.revertWithdrawal('unknown')).rejects.toThrow('Withdrawal record not found');
    expect(await balance()).toBe(500);
  });

  it('should reset one-time reward status to active when reverting linked withdrawal', async () => {
    await db.withdrawals.update('w-1', { rewardId: 'rew-1' });
    await db.rewards.add({
      id: 'rew-1',
      title: 'Headphones',
      cost: 1500,
      categoryId: 'cat-tech',
      type: 'one-time',
      status: 'claimed',
      claimedAt: 123456,
      claimCount: 1,
      createdAt: 1000,
    });

    await service.revertWithdrawal('w-1');

    expect(await db.rewards.get('rew-1')).toEqual(
      expect.objectContaining({
        status: 'active',
        claimedAt: null,
        updatedAt: expect.any(Number) as number,
      }),
    );
  });

  it('should decrement repeatable reward claimCount when reverting linked withdrawal', async () => {
    await db.withdrawals.update('w-1', { rewardId: 'rew-2' });
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
    await db.rewards.add(repeatableReward);

    await service.revertWithdrawal('w-1');

    expect((await db.rewards.get('rew-2'))?.claimCount).toBe(2);
  });

  it('should not decrement repeatable claimCount below zero when reverting', async () => {
    await db.withdrawals.update('w-1', { rewardId: 'rew-zero' });
    await db.rewards.add({
      id: 'rew-zero',
      title: 'Coffee',
      cost: 80,
      categoryId: 'cat-food',
      type: 'repeatable',
      status: 'active',
      claimCount: 0,
      createdAt: 1000,
    });

    await service.revertWithdrawal('w-1');

    expect((await db.rewards.get('rew-zero'))?.claimCount).toBe(0);
  });

  it('should safely complete reversion when linked reward was deleted', async () => {
    await db.withdrawals.update('w-1', { rewardId: 'deleted-rew' });

    await service.revertWithdrawal('w-1');

    expect(await balance()).toBe(600);
    expect(await db.withdrawals.get('w-1')).toBeUndefined();
  });

  it('should query and filter withdrawals', async () => {
    await db.withdrawals.add({ ...mockWithdrawal, id: 'w-2', categoryId: 'cat-tech' });

    const records = await firstValueFrom(service.getWithdrawals({ categoryId: 'cat-food' }));
    expect(records.map((record) => record.id)).toEqual(['w-1']);
  });

  it('should list the latest withdrawal first', async () => {
    await db.withdrawals.add({ ...mockWithdrawal, id: 'w-earlier', timestamp: mockWithdrawal.timestamp - 1 });
    await db.withdrawals.add({ ...mockWithdrawal, id: 'w-later', timestamp: mockWithdrawal.timestamp + 1 });

    const records = await firstValueFrom(service.getWithdrawals());
    expect(records.map((record) => record.id)).toEqual(['w-later', 'w-1', 'w-earlier']);
  });

  it('should filter withdrawals by date and search query', async () => {
    await db.withdrawals.bulkAdd([
      { ...mockWithdrawal, id: 'w-august', date: '2026-08-31' },
      { ...mockWithdrawal, id: 'w-other', title: 'Cinema', notes: undefined },
    ]);

    const list = await firstValueFrom(
      service.getWithdrawals({
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        searchQuery: 'protein',
      }),
    );
    expect(list.map((record) => record.id)).toEqual(['w-1']);

    const empty = await firstValueFrom(service.getWithdrawals({ searchQuery: 'nonexistent' }));
    expect(empty).toHaveLength(0);
  });

  it('should get withdrawal by id', async () => {
    const result = await service.getWithdrawalById('w-1');
    expect(result).toEqual(mockWithdrawal);
  });
});
