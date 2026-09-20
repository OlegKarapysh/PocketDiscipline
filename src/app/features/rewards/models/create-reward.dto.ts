import type { RewardType } from '../../../core/models/reward-type.type';

export interface CreateRewardDto {
  title: string;
  cost: number;
  categoryId: string;
  type: RewardType;
}
