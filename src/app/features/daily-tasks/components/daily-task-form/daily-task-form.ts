import { Component, computed, output, signal } from '@angular/core';
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
  templateUrl: './daily-task-form.html',
  styleUrl: './daily-task-form.scss',
})
export class DailyTaskForm {
  taskCreated = output<{ title: string; difficulties: DailyTaskDifficulty[] }>();
  cancelForm = output();

  readonly title = signal('');
  readonly difficulties = signal<DailyTaskDifficulty[]>(DEFAULT_DIFFICULTIES.map((d) => ({ ...d })));

  readonly canSubmit = computed(() => this.title().trim().length > 0);
  readonly canRemoveDifficulty = computed(() => this.difficulties().length > MIN_DIFFICULTIES_COUNT);

  addDifficulty(): void {
    this.difficulties.update((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        name: DEFAULT_NEW_DIFFICULTY_NAME,
        baseReward: DEFAULT_NEW_DIFFICULTY_REWARD,
      },
    ]);
  }

  removeDifficulty(index: number): void {
    this.difficulties.update((list) =>
      list.length > MIN_DIFFICULTIES_COUNT ? list.filter((_, i) => i !== index) : list
    );
  }

  updateDifficultyName(index: number, name: string): void {
    this.difficulties.update((list) => list.map((d, i) => (i === index ? { ...d, name } : d)));
  }

  updateDifficultyReward(index: number, baseReward: number): void {
    this.difficulties.update((list) => list.map((d, i) => (i === index ? { ...d, baseReward } : d)));
  }

  submit(): void {
    const trimmedTitle = this.title().trim();
    const difficulties = this.difficulties();

    if (trimmedTitle && difficulties.length > 0) {
      const sanitizedDifficulties = difficulties.map((diff) => ({
        ...diff,
        name: diff.name.trim() || DEFAULT_NEW_DIFFICULTY_NAME,
        baseReward: diff.baseReward || DEFAULT_NEW_DIFFICULTY_REWARD,
      }));
      this.taskCreated.emit({
        title: trimmedTitle,
        difficulties: sanitizedDifficulties,
      });
      this.title.set('');
      this.difficulties.set(DEFAULT_DIFFICULTIES.map((d) => ({ ...d })));
    }
  }
}
