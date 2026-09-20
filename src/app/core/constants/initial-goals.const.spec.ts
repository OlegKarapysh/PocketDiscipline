import { describe, expect, it } from 'vitest';
import { getInitialGoals } from './initial-goals.const';
import { GOAL_STATUS } from '../models/goal.model';

describe('getInitialGoals', () => {
  it('should return the three predefined seed goals', () => {
    const goals = getInitialGoals();

    expect(goals).toHaveLength(3);
    expect(goals[0].title).toBe('do 50 push-ups on fists');
    expect(goals[1].title).toBe('do 100 squats');
    expect(goals[2].title).toBe('do 12 pomodoro a day');
  });

  it('should return goals that are active, unclaimed and carry their reward value', () => {
    const goals = getInitialGoals();

    expect(goals.map((g) => g.rewardValue)).toEqual([2000, 1500, 1500]);
    for (const goal of goals) {
      expect(goal.status).toBe(GOAL_STATUS.ACTIVE);
      expect(goal.completedAt).toBeNull();
      expect(typeof goal.createdAt).toBe('number');
    }
  });

  it('should mint fresh ids on every call', () => {
    const first = getInitialGoals();
    const second = getInitialGoals();

    const firstIds = first.map((g) => g.id);
    const secondIds = second.map((g) => g.id);

    expect(new Set(firstIds).size).toBe(3);
    expect(firstIds).not.toEqual(secondIds);
  });
});
