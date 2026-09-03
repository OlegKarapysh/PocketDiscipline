import { Component, input, output, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DailyTask } from '../../models/daily-task.model';
import { DailyTaskDifficulty } from '../../models/daily-task-difficulty.model';

const MIDNIGHT_HOUR = 0;
const MIDNIGHT_MINUTE = 0;
const MIDNIGHT_SECOND = 0;
const MIDNIGHT_MILLISECOND = 0;

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  selector: 'app-daily-task-item',
  styleUrl: './daily-task-item.component.scss',
  templateUrl: './daily-task-item.component.html',
})
export class DailyTaskItemComponent {
  task = input.required<DailyTask>();
  complete = output<DailyTaskDifficulty>();

  isCompletedToday = computed(() => {
    const lastCompletedAt = this.task().lastCompletedAt;
    if (!lastCompletedAt) return false;
    const today = new Date();
    today.setHours(MIDNIGHT_HOUR, MIDNIGHT_MINUTE, MIDNIGHT_SECOND, MIDNIGHT_MILLISECOND);
    return lastCompletedAt >= today.getTime();
  });
}
