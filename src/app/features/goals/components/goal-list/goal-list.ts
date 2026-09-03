import { Component, computed, input, output } from '@angular/core';

import { GoalItem } from '../goal-item/goal-item';
import { Goal } from '../../models/goal.model';
import { MonthGoalGroup } from '../../models/month-goal-group.model';

const LOCALE_DEFAULT = 'default';
const DATE_FORMAT_MONTH_YEAR: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

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
    const groups: MonthGoalGroup[] = [];
    const map = new Map<string, Goal[]>();

    for (const goal of goals) {
      if (!goal.completedAt) continue;
      const date = new Date(goal.completedAt);
      const monthYear = date.toLocaleString(LOCALE_DEFAULT, DATE_FORMAT_MONTH_YEAR);
      if (!map.has(monthYear)) {
        map.set(monthYear, []);
        groups.push({ month: monthYear, goals: map.get(monthYear)! });
      }
      map.get(monthYear)!.push(goal);
    }

    return groups;
  });
}
