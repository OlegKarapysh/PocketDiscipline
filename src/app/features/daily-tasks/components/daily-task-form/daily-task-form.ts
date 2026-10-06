import type { OnInit } from '@angular/core';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormField, applyEach, form, maxLength, requiredError, validate } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import type { DailyTaskDraft } from '../../models/daily-task-draft.model';
import { DIFFICULTY_NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';
import { moneyAmount } from '../../../../shared/validators/money-amount';

// What the form edits: a reward can be blank while it is typed.
interface DailyTaskFormModel {
  title: string;
  difficulties: { id: string; name: string; baseReward: number | null }[];
}

const DEFAULT_DIFFICULTIES: DailyTaskFormModel['difficulties'] = [
  { id: 'easy', name: 'Easy', baseReward: 100 },
  { id: 'medium', name: 'Medium', baseReward: 200 },
  { id: 'hard', name: 'Hard', baseReward: 300 },
];
const DEFAULT_NEW_DIFFICULTY_NAME = 'New difficulty';
const DEFAULT_NEW_DIFFICULTY_REWARD = 100;
const MIN_DIFFICULTIES_COUNT = 1;

const emptyDraft = (): DailyTaskFormModel => ({
  title: '',
  difficulties: DEFAULT_DIFFICULTIES.map((d) => ({ ...d })),
});

// A reward saved before rewards were validated can be missing; a blank field then asks for one.
const draftOf = (task: DailyTask): DailyTaskFormModel => ({
  title: task.title,
  difficulties: task.difficulties.map(({ id, name, baseReward }) => ({
    id,
    name,
    baseReward: Number.isFinite(baseReward) ? baseReward : null,
  })),
});

@Component({
  imports: [FormField, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule],
  selector: 'app-daily-task-form',
  templateUrl: './daily-task-form.html',
  styleUrl: './daily-task-form.scss',
})
export class DailyTaskForm implements OnInit {
  // The task to edit. Read once, when the form opens: the list re-emits every task on each write,
  // and following it would throw away what the user has typed.
  readonly task = input<DailyTask>();
  readonly saving = input(false);
  readonly save = output<DailyTaskDraft>();
  readonly cancelForm = output();

  readonly draft = signal<DailyTaskFormModel>(emptyDraft());
  readonly taskForm = form(this.draft, (path) => {
    validate(path.title, ({ value }) => (value().trim() ? null : requiredError()));
    maxLength(path.title, TITLE_MAX_LENGTH);
    applyEach(path.difficulties, (difficulty) => {
      maxLength(difficulty.name, DIFFICULTY_NAME_MAX_LENGTH);
      moneyAmount(difficulty.baseReward, 'Reward');
    });
  });

  readonly heading = computed(() => (this.task() ? 'Edit daily task' : 'New daily task'));
  readonly canSubmit = computed(() => this.taskForm().valid() && !this.saving());
  readonly canRemoveDifficulty = computed(() => this.draft().difficulties.length > MIN_DIFFICULTIES_COUNT);

  ngOnInit(): void {
    const task = this.task();
    if (!task) return;

    this.draft.set(draftOf(task));
    // Shows a reward that was saved invalid straight away, rather than only once its field is touched.
    this.taskForm().markAsTouched();
  }

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

  // Keeps the draft: the parent closes the form once the save succeeds, and leaves it open on failure.
  submit(): void {
    if (!this.canSubmit()) return;

    const { title, difficulties } = this.draft();
    const drafted: DailyTaskDifficulty[] = [];
    for (const { id, name, baseReward } of difficulties) {
      if (baseReward === null) return;
      drafted.push({ id, name: name.trim() || DEFAULT_NEW_DIFFICULTY_NAME, baseReward });
    }

    this.save.emit({ title: title.trim(), difficulties: drafted });
  }
}
