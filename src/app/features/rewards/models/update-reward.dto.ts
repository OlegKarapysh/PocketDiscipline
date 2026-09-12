import { RewardType } from './reward-type.type';

export interface UpdateRewardDto {
  title?: string;
  cost?: number;
  categoryId?: string;
  type?: RewardType;
}
