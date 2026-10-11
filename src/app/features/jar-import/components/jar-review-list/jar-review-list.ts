import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { FormField, applyEach, form, maxLength, requiredError, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Amount } from '../../../../shared/components/amount/amount';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';
import type { JarImportAction } from '../../models/jar-import-action.type';
import type { JarReviewRow } from '../../models/jar-review-row.model';
import { JarStatementParserService } from '../../services/jar-statement-parser.service';

const COUNT_FORMAT = new Intl.NumberFormat('en-US');
const ACTION_LABELS: Readonly<Record<JarImportAction, string>> = {
  task: 'Daily task',
  score: 'Daily score',
  pomodoro: 'Focus sessions',
  goal: 'Completed goals',
  withdrawal: 'Withdrawal ledger',
  skip: 'Skip',
};

// What the review edits, row by row: the rest of each row is what the statement says.
interface ReviewModel {
  rows: { action: JarImportAction; taskTitle: string }[];
}

@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, Amount, SectionCard],
  selector: 'app-jar-review-list',
  styleUrl: './jar-review-list.scss',
  templateUrl: './jar-review-list.html',
})
export class JarReviewList {
  private parser = inject(JarStatementParserService);

  readonly rows = input.required<JarReviewRow[]>();
  // Folded, as the import service matches them.
  readonly existingTaskTitles = input<string[]>([]);
  readonly importing = input(false);
  readonly confirmImport = output<JarReviewRow[]>();

  readonly draft = linkedSignal<ReviewModel>(() => ({
    rows: this.rows().map(({ action, taskTitle }) => ({ action, taskTitle })),
  }));
  readonly reviewForm = form(this.draft, (path) => {
    applyEach(path.rows, (row) => {
      validate(row.taskTitle, (field) =>
        field.valueOf(row.action) === 'task' && !field.value().trim()
          ? requiredError({ message: 'Name the task' })
          : null,
      );
      maxLength(row.taskTitle, TITLE_MAX_LENGTH);
    });
  });

  readonly items = computed(() => {
    const existing = new Set(this.existingTaskTitles());
    const drafted = this.draft().rows;
    return this.rows().map((row, index) => {
      const isTask = drafted[index]?.action === 'task';
      return {
        ...row,
        index,
        count: COUNT_FORMAT.format(row.rowIds.length),
        countNoun: row.rowIds.length === 1 ? 'row' : 'rows',
        options: row.actions.map((action) => ({ action, label: ACTION_LABELS[action] })),
        isTask,
        isExisting: isTask && existing.has(this.parser.fold(drafted[index]?.taskTitle ?? '')),
      };
    });
  });

  readonly totals = computed(() => {
    const drafted = this.draft().rows;
    const rows = this.rows();
    const skipped = rows.reduce((sum, row, i) => sum + (drafted[i]?.action === 'skip' ? row.rowIds.length : 0), 0);
    const all = rows.reduce((sum, row) => sum + row.rowIds.length, 0);
    return `${COUNT_FORMAT.format(all - skipped)} rows to import · ${COUNT_FORMAT.format(skipped)} skipped`;
  });

  readonly canImport = computed(() => this.reviewForm().valid() && !this.importing());

  submit(): void {
    if (!this.canImport()) return;
    const drafted = this.draft().rows;
    this.confirmImport.emit(
      this.rows().map((row, i) => ({ ...row, action: drafted[i].action, taskTitle: drafted[i].taskTitle.trim() })),
    );
  }
}
