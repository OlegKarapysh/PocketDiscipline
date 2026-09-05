import { RewardType } from './reward-type.type';

export interface CreateRewardDto {
  title: string;
  cost: number;
  categoryId: string;
  type: RewardType;
}
