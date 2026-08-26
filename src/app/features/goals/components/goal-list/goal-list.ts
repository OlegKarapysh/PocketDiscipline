import { Component, computed, input, output } from '@angular/core';

import { GoalItem } from '../goal-item/goal-item';
import { Goal } from '../../models/goal.model';

@Component({
  imports: [GoalItem],
  selector: 'app-goal-list',
  styleUrl: './goal-list.scss',
  templateUrl: './goal-list.html',
})
export class GoalList {
  activeGoals = input<Goal[]>([]);
  completedGoals = input<Goal[]>([]);

  complete = output<string>();
  undo = output<string>();
  edit = output<Goal>();
  delete = output<string>();

  groupedCompletedGoals = computed(() => {
    const goals = this.completedGoals();
    const groups: { month: string; goals: Goal[] }[] = [];
    const map = new Map<string, Goal[]>();

    for (const goal of goals) {
      if (!goal.completedAt) continue;
      const date = new Date(goal.completedAt);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!map.has(monthYear)) {
        map.set(monthYear, []);
        groups.push({ month: monthYear, goals: map.get(monthYear)! });
      }
      map.get(monthYear)!.push(goal);
    }

    return groups;
  });
}
