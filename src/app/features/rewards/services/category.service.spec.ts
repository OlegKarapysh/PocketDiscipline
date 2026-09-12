import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from './category.service';
import { DbService } from '../../../core/services/db.service';
import { RewardCategory } from '../models/reward-category.model';
import { FALLBACK_CATEGORY_ID } from '../../../core/constants/initial-reward-categories.const';

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

describe('CategoryService', () => {
  let service: CategoryService;
  let dbMock: {
    rewardCategories: {
      toArray: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    rewards: {
      where: ReturnType<typeof vi.fn>;
    };
    withdrawals: {
      where: ReturnType<typeof vi.fn>;
    };
    transaction: ReturnType<typeof vi.fn>;
  };

  let mockCategories: RewardCategory[];

  beforeEach(() => {
    mockCategories = [
      { id: FALLBACK_CATEGORY_ID, name: 'General', color: '#6b7280', icon: 'category', isDefault: true, isProtected: true, createdAt: 0 },
      { id: 'cat-food', name: 'Food & Treats', color: '#f59e0b', icon: 'restaurant', isDefault: true, isProtected: false, createdAt: 0 },
    ];

    const rewardsModifyMock = vi.fn().mockResolvedValue(1);
    const withdrawalsModifyMock = vi.fn().mockResolvedValue(2);

    dbMock = {
      rewardCategories: {
        toArray: vi.fn().mockResolvedValue(mockCategories),
        get: vi.fn().mockImplementation((id: string) => Promise.resolve(mockCategories.find(c => c.id === id))),
        add: vi.fn().mockResolvedValue('new-cat-id'),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      rewards: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            modify: rewardsModifyMock,
          }),
        }),
      },
      withdrawals: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            modify: withdrawalsModifyMock,
          }),
        }),
      },
      transaction: vi.fn().mockImplementation(async (_mode, _t1, _t2, _t3, callback: () => Promise<void>) => {
        await callback();
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        { provide: DbService, useValue: dbMock },
      ],
    });

    service = TestBed.inject(CategoryService);
  });

  it('should return categories observable stream from getCategories', async () => {
    const categories = await firstValueFrom(service.getCategories());
    expect(categories).toEqual(mockCategories);
    expect(dbMock.rewardCategories.toArray).toHaveBeenCalled();
  });

  it('should return fallback category successfully', async () => {
    const fallback = await service.getFallbackCategory();
    expect(fallback.id).toBe(FALLBACK_CATEGORY_ID);
    expect(fallback.name).toBe('General');
  });

  it('should throw if fallback category is missing', async () => {
    dbMock.rewardCategories.get.mockResolvedValueOnce(undefined);
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
    expect(dbMock.rewardCategories.add).toHaveBeenCalledWith(created);
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
    expect(dbMock.rewardCategories.update).toHaveBeenCalledWith('cat-food', {
      name: 'Gourmet Treats',
      color: '#10b981',
      icon: 'ramen_dining',
    });
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
    dbMock.rewardCategories.get.mockResolvedValueOnce(undefined);
    await expect(service.updateCategory('unknown', { name: 'Test' })).rejects.toThrow('Category not found');
  });

  it('should throw when updating with an empty name', async () => {
    await expect(service.updateCategory('cat-food', { name: '   ' })).rejects.toThrow('Category name cannot be empty');
  });

  it('should reject deleting a protected category', async () => {
    await expect(service.deleteCategory(FALLBACK_CATEGORY_ID)).rejects.toThrow('Cannot delete protected category');
    expect(dbMock.rewardCategories.delete).not.toHaveBeenCalled();
  });

  it('should throw when deleting non-existent category', async () => {
    dbMock.rewardCategories.get.mockResolvedValueOnce(undefined);
    await expect(service.deleteCategory('unknown')).rejects.toThrow('Category not found');
  });

  it('should delete a category and reassign rewards and withdrawals to General category within a transaction', async () => {
    await service.deleteCategory('cat-food');

    expect(dbMock.transaction).toHaveBeenCalled();
    expect(dbMock.rewards.where).toHaveBeenCalledWith('categoryId');
    expect(dbMock.withdrawals.where).toHaveBeenCalledWith('categoryId');
    expect(dbMock.rewardCategories.delete).toHaveBeenCalledWith('cat-food');
  });
});
