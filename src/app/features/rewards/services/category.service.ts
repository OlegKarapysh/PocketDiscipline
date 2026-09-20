import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { DbService } from '../../../database/db.service';
import type { RewardCategory } from '../../../core/models/reward-category.model';
import type { CreateCategoryDto } from '../models/create-category.dto';
import { FALLBACK_CATEGORY_ID } from '../../../core/constants/initial-reward-categories.const';

const DEFAULT_CATEGORY_COLOR = '#6b7280';
const DEFAULT_CATEGORY_ICON = 'category';
const ERROR_CATEGORY_NOT_FOUND = 'Category not found';
const ERROR_PROTECTED_CATEGORY = 'Cannot delete protected category';
const TRANSACTION_READ_WRITE = 'rw';

@Service()
export class CategoryService {
  private readonly db = inject(DbService);

  getCategories(): Observable<RewardCategory[]> {
    return from(liveQuery(() => this.db.rewardCategories.toArray()));
  }

  async getFallbackCategory(): Promise<RewardCategory> {
    const category = await this.db.rewardCategories.get(FALLBACK_CATEGORY_ID);
    if (!category) {
      throw new Error(ERROR_CATEGORY_NOT_FOUND);
    }
    return category;
  }

  async createCategory(dto: CreateCategoryDto): Promise<RewardCategory> {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new Error('Category name cannot be empty');
    }

    if (dto.color?.trim() && !/^#([0-9A-Fa-f]{3}){1,2}$/i.test(dto.color.trim())) {
      throw new Error('Invalid color format');
    }

    const newCategory: RewardCategory = {
      id: crypto.randomUUID(),
      name: trimmedName,
      color: dto.color?.trim() ?? DEFAULT_CATEGORY_COLOR,
      icon: dto.icon?.trim() ?? DEFAULT_CATEGORY_ICON,
      isDefault: false,
      isProtected: false,
      createdAt: Date.now(),
    };

    await this.db.rewardCategories.add(newCategory);
    return newCategory;
  }

  async updateCategory(id: string, dto: Partial<CreateCategoryDto>): Promise<RewardCategory> {
    const category = await this.db.rewardCategories.get(id);
    if (!category) {
      throw new Error(ERROR_CATEGORY_NOT_FOUND);
    }

    const updates: Partial<RewardCategory> = {};
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new Error('Category name cannot be empty');
      }
      updates.name = trimmed;
    }
    if (dto.color !== undefined) {
      const trimmedColor = dto.color.trim();
      if (trimmedColor && !/^#([0-9A-Fa-f]{3}){1,2}$/i.test(trimmedColor)) {
        throw new Error('Invalid color format');
      }
      updates.color = trimmedColor || DEFAULT_CATEGORY_COLOR;
    }
    if (dto.icon !== undefined) {
      updates.icon = dto.icon.trim() || DEFAULT_CATEGORY_ICON;
    }

    await this.db.rewardCategories.update(id, updates);
    return { ...category, ...updates };
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.db.rewardCategories.get(id);
    if (!category) {
      throw new Error(ERROR_CATEGORY_NOT_FOUND);
    }
    if (category.isProtected) {
      throw new Error(ERROR_PROTECTED_CATEGORY);
    }

    await this.db.transaction(
      TRANSACTION_READ_WRITE,
      this.db.rewardCategories,
      this.db.rewards,
      this.db.withdrawals,
      async () => {
        await this.db.rewards.where('categoryId').equals(id).modify({ categoryId: FALLBACK_CATEGORY_ID });
        await this.db.withdrawals.where('categoryId').equals(id).modify({ categoryId: FALLBACK_CATEGORY_ID });
        await this.db.rewardCategories.delete(id);
      }
    );
  }
}
