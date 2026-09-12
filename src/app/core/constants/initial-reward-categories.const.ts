import { RewardCategory } from '../../features/rewards/models/reward-category.model';

export const FALLBACK_CATEGORY_ID = 'cat-general';

export const INITIAL_REWARD_CATEGORIES: readonly RewardCategory[] = [
  { id: 'cat-food', name: 'Food & Treats', color: '#f59e0b', icon: 'restaurant', isDefault: true, isProtected: false, createdAt: 0 },
  { id: 'cat-ent', name: 'Entertainment', color: '#8b5cf6', icon: 'movie', isDefault: true, isProtected: false, createdAt: 0 },
  { id: 'cat-tech', name: 'Gear & Tech', color: '#3b82f6', icon: 'devices', isDefault: true, isProtected: false, createdAt: 0 },
  { id: 'cat-books', name: 'Books & Learning', color: '#10b981', icon: 'menu_book', isDefault: true, isProtected: false, createdAt: 0 },
  { id: 'cat-health', name: 'Health & Fitness', color: '#ef4444', icon: 'fitness_center', isDefault: true, isProtected: false, createdAt: 0 },
  { id: FALLBACK_CATEGORY_ID, name: 'General', color: '#6b7280', icon: 'category', isDefault: true, isProtected: true, createdAt: 0 },
];
