import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';

const DEFAULT_DIFFICULTIES: DailyTaskDifficulty[] = [
  { id: 'easy', name: 'Easy', baseReward: 100 },
  { id: 'medium', name: 'Medium', baseReward: 200 },
  { id: 'hard', name: 'Hard', baseReward: 300 },
];
const DEFAULT_NEW_DIFFICULTY_NAME = 'New Difficulty';
const DEFAULT_NEW_DIFFICULTY_REWARD = 100;
const MIN_DIFFICULTIES_COUNT = 1;

@Component({
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule],
  selector: 'app-daily-task-form',
  templateUrl: './daily-task-form.component.html',
  styleUrl: './daily-task-form.component.scss',
})
export class DailyTaskFormComponent {
  taskCreated = output<{ title: string; difficulties: DailyTaskDifficulty[] }>();
  cancelForm = output();

  title = '';
  difficulties: DailyTaskDifficulty[] = DEFAULT_DIFFICULTIES.map((d) => ({ ...d }));

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
    const trimmedTitle = this.title.trim();
    if (trimmedTitle && this.difficulties.length > 0) {
      const sanitizedDifficulties = this.difficulties.map((diff) => ({
        ...diff,
        name: diff.name.trim() || DEFAULT_NEW_DIFFICULTY_NAME,
        baseReward: diff.baseReward || DEFAULT_NEW_DIFFICULTY_REWARD,
      }));
      this.taskCreated.emit({
        title: trimmedTitle,
        difficulties: sanitizedDifficulties,
      });
      this.title = '';
      this.difficulties = DEFAULT_DIFFICULTIES.map((d) => ({ ...d }));
    }
  }
}
