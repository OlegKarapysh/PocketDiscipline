import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { JarReviewList } from '../../components/jar-review-list/jar-review-list';
import { JarStatementSummary } from '../../components/jar-statement-summary/jar-statement-summary';
import type { JarImportResult } from '../../models/jar-import-result.model';
import type { JarImportSuggestion } from '../../models/jar-import-suggestion.model';
import type { JarReviewRow } from '../../models/jar-review-row.model';
import type { JarStatementRow } from '../../models/jar-statement-row.model';
import { JarImportService } from '../../services/jar-import.service';
import { JarStatementParserService } from '../../services/jar-statement-parser.service';

const COUNT_FORMAT = new Intl.NumberFormat('en-US');

@Component({
  imports: [MatButtonModule, MatIconModule, PageHeader, SectionCard, JarStatementSummary, JarReviewList],
  selector: 'app-jar-import-page',
  styleUrl: './jar-import-page.scss',
  templateUrl: './jar-import-page.html',
})
export class JarImportPage {
  private parser = inject(JarStatementParserService);
  private importService = inject(JarImportService);
  private snackBar = inject(SnackBarService);
  private router = inject(Router);

  readonly fileName = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly statement = signal<JarStatementRow[] | null>(null);
  readonly suggestion = signal<JarImportSuggestion | null>(null);
  readonly importing = signal(false);

  // The file is read here, on the device; nothing is uploaded.
  async readFile(picker: HTMLInputElement): Promise<void> {
    const file = picker.files?.[0];
    // Cleared, so picking the same file again reads it again.
    picker.value = '';
    if (!file) return;

    this.fileName.set(file.name);
    this.statement.set(null);
    this.suggestion.set(null);
    this.error.set(null);
    try {
      const rows = this.parser.parse(await file.text());
      this.suggestion.set(await this.importService.suggest(rows));
      this.statement.set(rows);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The file could not be read.');
    }
  }

  async runImport(review: JarReviewRow[]): Promise<void> {
    const rows = this.statement();
    if (!rows) return;

    this.importing.set(true);
    try {
      const result = await this.importService.import(rows, review);
      this.snackBar.show(this.describe(result));
      void this.router.navigate(['/tasks']);
    } catch (e: unknown) {
      this.snackBar.error(e, 'The import failed. Nothing was written.');
    } finally {
      this.importing.set(false);
    }
  }

  // "Imported 41 completions into 6 tasks · 4 scores · 7 focus sessions · 2 skipped"
  private describe(result: JarImportResult): string {
    const count = (n: number, noun: string) => `${COUNT_FORMAT.format(n)} ${noun}${n === 1 ? '' : 's'}`;
    const written = [
      result.completions > 0 ? `${count(result.completions, 'completion')} into ${count(result.tasks, 'task')}` : '',
      result.scores > 0 ? count(result.scores, 'score') : '',
      result.sessions > 0 ? count(result.sessions, 'focus session') : '',
      result.goals > 0 ? count(result.goals, 'goal') : '',
      result.withdrawals > 0 ? count(result.withdrawals, 'withdrawal') : '',
    ].filter(Boolean);
    const rest = [
      result.alreadyImported > 0 ? `${COUNT_FORMAT.format(result.alreadyImported)} already imported` : '',
      result.skipped > 0 ? `${COUNT_FORMAT.format(result.skipped)} skipped` : '',
    ].filter(Boolean);

    const head = written.length > 0 ? `Imported ${written.join(' · ')}` : 'Nothing new to import';
    return [head, ...rest].join(' · ');
  }
}
