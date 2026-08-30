import { DisciplineItemType } from './discipline-item-type.enum';

export interface DisciplineItem {
  id: string;
  title: string;
  type: DisciplineItemType;
  rewardValue: number;
  isCompleted: boolean;
  lastCompletedAt: number | null;
  createdAt: number;
}
