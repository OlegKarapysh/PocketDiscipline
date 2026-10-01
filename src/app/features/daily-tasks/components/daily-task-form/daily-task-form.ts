import { Component, computed, output, signal } from '@angular/core';
import { FormField, applyEach, form, maxLength, requiredError, validate } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import type { DailyTaskDraft } from '../../models/daily-task-draft.model';
import { DIFFICULTY_NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';

const DEFAULT_DIFFICULTIES: DailyTaskDifficulty[] = [
  { id: 'easy', name: 'Easy', baseReward: 100 },
  { id: 'medium', name: 'Medium', baseReward: 200 },
  { id: 'hard', name: 'Hard', baseReward: 300 },
];
const DEFAULT_NEW_DIFFICULTY_NAME = 'New difficulty';
const DEFAULT_NEW_DIFFICULTY_REWARD = 100;
const MIN_DIFFICULTIES_COUNT = 1;

const emptyDraft = (): DailyTaskDraft => ({
  title: '',
  difficulties: DEFAULT_DIFFICULTIES.map((d) => ({ ...d })),
});

@Component({
  imports: [FormField, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule],
  selector: 'app-daily-task-form',
  templateUrl: './daily-task-form.html',
  styleUrl: './daily-task-form.scss',
})
export class DailyTaskForm {
  taskCreated = output<DailyTaskDraft>();
  cancelForm = output();

  readonly draft = signal<DailyTaskDraft>(emptyDraft());
  readonly taskForm = form(this.draft, (path) => {
    validate(path.title, ({ value }) => (value().trim() ? null : requiredError()));
    maxLength(path.title, TITLE_MAX_LENGTH);
    applyEach(path.difficulties, (difficulty) => {
      maxLength(difficulty.name, DIFFICULTY_NAME_MAX_LENGTH);
    });
  });

  readonly canSubmit = computed(() => this.taskForm().valid());
  readonly canRemoveDifficulty = computed(() => this.draft().difficulties.length > MIN_DIFFICULTIES_COUNT);

  addDifficulty(): void {
    this.taskForm.difficulties().value.update((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        name: DEFAULT_NEW_DIFFICULTY_NAME,
        baseReward: DEFAULT_NEW_DIFFICULTY_REWARD,
      },
    ]);
  }

  removeDifficulty(index: number): void {
    this.taskForm
      .difficulties()
      .value.update((list) => (list.length > MIN_DIFFICULTIES_COUNT ? list.filter((_, i) => i !== index) : list));
  }

  submit(): void {
    if (!this.canSubmit()) return;

    const { title, difficulties } = this.draft();
    this.taskCreated.emit({
      title: title.trim(),
      difficulties: difficulties.map((diff) => ({
        ...diff,
        name: diff.name.trim() || DEFAULT_NEW_DIFFICULTY_NAME,
        baseReward: diff.baseReward || DEFAULT_NEW_DIFFICULTY_REWARD,
      })),
    });
    this.draft.set(emptyDraft());
  }
}
