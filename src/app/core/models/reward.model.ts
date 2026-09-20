import type { RewardType } from './reward-type.type';
import type { RewardStatus } from './reward-status.type';

export interface RewardItem {
  id: string;
  title: string;
  cost: number;
  categoryId: string;
  type: RewardType;
  status: RewardStatus;
  claimedAt?: number | null;
  claimCount: number;
  createdAt: number;
  updatedAt?: number;
}
