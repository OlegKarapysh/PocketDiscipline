import type { AppEvent } from './app-event.model';

export const EVENT_TYPE = {
  REWARD_EARNED: 'RewardEarned',
} as const;

export interface RewardEarnedEvent extends AppEvent {
  type: typeof EVENT_TYPE.REWARD_EARNED;
  payload: {
    points: number;
  };
}
