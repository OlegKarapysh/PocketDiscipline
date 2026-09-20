import type { Goal } from '../models/goal.model';
import { GOAL_STATUS } from '../models/goal.model';

// A function, not a frozen array: each call mints fresh ids and timestamps, and it is invoked both
// from the Dexie `populate` hook and from the v2 upgrade hook.
export function getInitialGoals(): Goal[] {
  return [
    {
      id: crypto.randomUUID(),
      title: 'do 50 push-ups on fists',
      rewardValue: 2000,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now()
    },
    {
      id: crypto.randomUUID(),
      title: 'do 100 squats',
      rewardValue: 1500,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now()
    },
    {
      id: crypto.randomUUID(),
      title: 'do 12 pomodoro a day',
      rewardValue: 1500,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now()
    }
  ];
}
