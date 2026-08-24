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
  type: 'HABIT' | 'ONEOFF';
  rewardValue: number;
  isCompleted: boolean;
  lastCompletedAt: number | null;
  createdAt: number;
}
