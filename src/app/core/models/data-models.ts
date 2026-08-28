export type DisciplineItemType = 'HABIT' | 'ONEOFF';

export const DISCIPLINE_ITEM_TYPE = {
  HABIT: 'HABIT',
  ONEOFF: 'ONEOFF',
} as const;

export interface User {
  id: number;
  name: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
}

export interface DisciplineItem {
  id: string;
  title: string;
  type: DisciplineItemType;
  rewardValue: number;
  isCompleted: boolean;
  lastCompletedAt: number | null;
  createdAt: number;
}
