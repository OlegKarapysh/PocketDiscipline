import { Component, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DailyTaskDifficulty } from '../../models/daily-task-difficulty.model';

const DEFAULT_DIFFICULTIES: DailyTaskDifficulty[] = [
  { id: 'easy', name: 'Easy', baseReward: 100 },
  { id: 'medium', name: 'Medium', baseReward: 200 },
  { id: 'hard', name: 'Hard', baseReward: 300 },
];
const DEFAULT_NEW_DIFFICULTY_NAME = 'New Difficulty';
const DEFAULT_NEW_DIFFICULTY_REWARD = 100;
const MIN_DIFFICULTIES_COUNT = 1;

@Component({
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  selector: 'app-daily-task-form',
  templateUrl: './daily-task-form.component.html',
  styleUrl: './daily-task-form.component.scss',
})
export class DailyTaskFormComponent {
  taskCreated = output<{ title: string; difficulties: DailyTaskDifficulty[] }>();
  cancelForm = output<void>();

  title = '';
  difficulties: DailyTaskDifficulty[] = [...DEFAULT_DIFFICULTIES];

  addDifficulty() {
    this.difficulties.push({
      id: crypto.randomUUID(),
      name: DEFAULT_NEW_DIFFICULTY_NAME,
      baseReward: DEFAULT_NEW_DIFFICULTY_REWARD,
    });
  }

  removeDifficulty(index: number) {
    if (this.difficulties.length > MIN_DIFFICULTIES_COUNT) {
      this.difficulties.splice(index, 1);
    }
  }

  submit() {
    if (this.title.trim() && this.difficulties.length > 0) {
      this.taskCreated.emit({
        title: this.title.trim(),
        difficulties: [...this.difficulties],
      });
      this.title = '';
    }
  }
}
