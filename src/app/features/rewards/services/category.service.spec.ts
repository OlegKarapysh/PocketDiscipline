import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from './category.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { RewardCategory } from '../../../core/models/reward-category.model';
import type { RewardItem } from '../../../core/models/reward.model';
import type { WithdrawalRecord } from '../../../core/models/withdrawal.model';
import { FALLBACK_CATEGORY_ID } from '../../../core/constants/initial-reward-categories.const';

describe('CategoryService', () => {
  let service: CategoryService;
  let db: DbService;

  const generalCategory: RewardCategory = {
    id: FALLBACK_CATEGORY_ID,
    name: 'General',
    color: '#6b7280',
    icon: 'category',
    isDefault: true,
    isProtected: true,
    createdAt: 0,
  };
  const foodCategory: RewardCategory = {
    id: 'cat-food',
    name: 'Food & Treats',
    color: '#f59e0b',
    icon: 'restaurant',
    isDefault: true,
    isProtected: false,
    createdAt: 0,
  };

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.rewardCategories.bulkAdd([generalCategory, foodCategory]);
    service = TestBed.inject(CategoryService);
  });

  it('should return categories observable stream from getCategories', async () => {
    const categories = await firstValueFrom(service.getCategories());
    expect(categories).toHaveLength(2);
    expect(categories).toEqual(expect.arrayContaining([generalCategory, foodCategory]));
  });

  it('should return fallback category successfully', async () => {
    const fallback = await service.getFallbackCategory();
    expect(fallback.id).toBe(FALLBACK_CATEGORY_ID);
    expect(fallback.name).toBe('General');
  });

  it('should throw if fallback category is missing', async () => {
    await db.rewardCategories.delete(FALLBACK_CATEGORY_ID);
    await expect(service.getFallbackCategory()).rejects.toThrow('Category not found');
  });

  it('should create a custom category with generated id and defaults', async () => {
    const created = await service.createCategory({
      name: '  Gym & Sports  ',
      color: '#ef4444',
      icon: 'fitness_center',
    });

    expect(created.name).toBe('Gym & Sports');
    expect(created.color).toBe('#ef4444');
    expect(created.icon).toBe('fitness_center');
    expect(created.isDefault).toBe(false);
    expect(created.isProtected).toBe(false);
    expect(created.id).toBeDefined();
    expect(await db.rewardCategories.get(created.id)).toEqual(created);
  });

  it('should apply default color and icon when not provided on create', async () => {
    const created = await service.createCategory({
      name: 'Books',
    });

    expect(created.color).toBe('#6b7280');
    expect(created.icon).toBe('category');
  });

  it('should reject creating category with empty name', async () => {
    await expect(service.createCategory({ name: '   ' })).rejects.toThrow('Category name cannot be empty');
    expect(await db.rewardCategories.count()).toBe(2);
  });

  it('should update an existing category name, color, and icon', async () => {
    const updated = await service.updateCategory('cat-food', {
      name: '  Gourmet Treats  ',
      color: ' #10b981 ',
      icon: ' ramen_dining ',
    });

    expect(updated.name).toBe('Gourmet Treats');
    expect(updated.color).toBe('#10b981');
    expect(updated.icon).toBe('ramen_dining');
    expect(await db.rewardCategories.get('cat-food')).toEqual(updated);
  });

  it('should fallback to defaults when updating color or icon to whitespace string', async () => {
    const updated = await service.updateCategory('cat-food', {
      color: '   ',
      icon: '   ',
    });

    expect(updated.color).toBe('#6b7280');
    expect(updated.icon).toBe('category');
  });

  it('should throw when updating a non-existent category', async () => {
    await expect(service.updateCategory('unknown', { name: 'Test' })).rejects.toThrow('Category not found');
  });

  it('should throw when updating with an empty name', async () => {
    await expect(service.updateCategory('cat-food', { name: '   ' })).rejects.toThrow('Category name cannot be empty');
    expect((await db.rewardCategories.get('cat-food'))?.name).toBe('Food & Treats');
  });

  it('should reject deleting a protected category', async () => {
    await expect(service.deleteCategory(FALLBACK_CATEGORY_ID)).rejects.toThrow('Cannot delete protected category');
    expect(await db.rewardCategories.get(FALLBACK_CATEGORY_ID)).toEqual(generalCategory);
  });

  it('should throw when deleting non-existent category', async () => {
    await expect(service.deleteCategory('unknown')).rejects.toThrow('Category not found');
  });

  it('should delete a category and reassign its rewards and withdrawals to the General category', async () => {
    const reward: RewardItem = {
      id: 'reward-1',
      title: 'Cake',
      cost: 100,
      categoryId: 'cat-food',
      type: 'one-time',
      status: 'active',
      claimCount: 0,
      createdAt: 0,
    };
    const withdrawal: WithdrawalRecord = {
      id: 'withdrawal-1',
      amount: 50,
      title: 'Coffee',
      categoryId: 'cat-food',
      date: '2026-10-01',
      timestamp: 0,
    };
    await db.rewards.bulkAdd([reward, { ...reward, id: 'reward-2', categoryId: 'cat-other' }]);
    await db.withdrawals.add(withdrawal);

    await service.deleteCategory('cat-food');

    expect(await db.rewardCategories.get('cat-food')).toBeUndefined();
    expect((await db.rewards.get('reward-1'))?.categoryId).toBe(FALLBACK_CATEGORY_ID);
    expect((await db.rewards.get('reward-2'))?.categoryId).toBe('cat-other');
    expect((await db.withdrawals.get('withdrawal-1'))?.categoryId).toBe(FALLBACK_CATEGORY_ID);
  });
});
