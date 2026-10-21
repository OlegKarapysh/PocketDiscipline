import type { OnInit } from '@angular/core';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, requiredError, validate } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import type { TaskDraft } from '../../models/task-draft.model';
import { TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';
import { moneyAmount } from '../../../../shared/validators/money-amount';

const DEFAULT_REWARD = 100;

@Component({
  imports: [FormField, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule],
  selector: 'app-task-form',
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm implements OnInit {
  // The task to edit. Read once when the form opens so list re-emissions do not discard typed input.
  readonly task = input<DisciplineItem>();
  readonly saving = input(false);
  readonly save = output<TaskDraft>();
  readonly cancelForm = output();
  readonly delete = output();

  readonly draft = signal<{ title: string; rewardValue: number | null }>({
    title: '',
    rewardValue: DEFAULT_REWARD,
  });

  readonly taskForm = form(this.draft, (path) => {
    validate(path.title, ({ value }) => (value().trim() ? null : requiredError({ message: 'Title is required' })));
    maxLength(path.title, TITLE_MAX_LENGTH, { message: `Title cannot exceed ${TITLE_MAX_LENGTH} characters` });
    moneyAmount(path.rewardValue, 'Reward');
  });

  readonly heading = computed(() => (this.task() ? 'Edit one-off task' : 'New one-off task'));
  readonly canSubmit = computed(() => this.taskForm().valid() && !this.saving());

  ngOnInit(): void {
    const task = this.task();
    if (!task) return;

    this.draft.set({
      title: task.title,
      rewardValue: Number.isFinite(task.rewardValue) ? task.rewardValue : null,
    });
    this.taskForm().markAsTouched();
  }

  submit(): void {
    if (!this.canSubmit()) return;

    const { title, rewardValue } = this.draft();
    if (rewardValue === null) return;

    this.save.emit({ title: title.trim(), rewardValue });
  }
}
