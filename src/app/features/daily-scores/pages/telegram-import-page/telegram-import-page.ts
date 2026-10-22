import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import type { TelegramExportParseResult } from '../../models/telegram-export-parse-result.model';
import type { TelegramImportPreview } from '../../models/telegram-import-preview.model';
import type { TelegramImportResult } from '../../models/telegram-import-result.model';
import { TelegramScoresImportService } from '../../services/telegram-scores-import.service';
import { TelegramScoresParserService } from '../../services/telegram-scores-parser.service';

const COUNT_FORMAT = new Intl.NumberFormat('en-US');
const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_DISPLAYED_SKIPPED = 100;

@Component({
  imports: [MatButtonModule, MatIconModule, PageHeader, SectionCard, StatCard],
  selector: 'app-telegram-import-page',
  styleUrl: './telegram-import-page.scss',
  templateUrl: './telegram-import-page.html',
})
export class TelegramImportPage {
  private readonly parser = inject(TelegramScoresParserService);
  private readonly importService = inject(TelegramScoresImportService);
  private readonly snackBar = inject(SnackBarService);
  private readonly router = inject(Router);

  readonly fileName = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly parsed = signal<TelegramExportParseResult | null>(null);
  readonly preview = signal<TelegramImportPreview | null>(null);
  readonly importing = signal(false);

  readonly view = computed(() => {
    const p = this.preview();
    if (!p) return null;

    const count = (n: number, noun: string) => `${COUNT_FORMAT.format(n)} ${noun}${n === 1 ? '' : 's'}`;
    const notes: string[] = [];
    if (p.duplicateDates > 0) {
      notes.push(`${count(p.duplicateDates, 'earlier message')} on the same day replaced by the latest score`);
    }
    if (p.skippedMessages.length > 0) {
      notes.push(`${count(p.skippedMessages.length, 'message')} skipped (not in 1/10–10/10 format)`);
    }

    const summaryParts = [
      count(p.newScores, 'new score'),
      p.replacedScores > 0 ? `${COUNT_FORMAT.format(p.replacedScores)} replacing existing` : '',
      p.skippedMessages.length > 0 ? `${COUNT_FORMAT.format(p.skippedMessages.length)} skipped` : '',
    ].filter(Boolean);

    const totalSkipped = p.skippedMessages.length;
    const visibleSkipped = p.skippedMessages.slice(0, MAX_DISPLAYED_SKIPPED);
    const remainingSkipped = Math.max(0, totalSkipped - MAX_DISPLAYED_SKIPPED);

    return {
      totalScores: COUNT_FORMAT.format(p.totalScores),
      scoresHint:
        p.replacedScores > 0
          ? `${COUNT_FORMAT.format(p.newScores)} new · ${COUNT_FORMAT.format(p.replacedScores)} replaced`
          : count(p.newScores, 'new day'),
      resultingStreak: p.resultingStreak,
      streakHint: 'Days scoring 9 or 10',
      averageScore: String(p.averageScore),
      highScoresHint: `${count(p.highScores, 'high score')} (9–10)`,
      period: `${DAY_FORMAT.format(p.startDate)} – ${DAY_FORMAT.format(p.endDate)}`,
      periodHint: count(p.totalScores, 'day'),
      notes,
      skippedMessages: visibleSkipped,
      remainingSkipped,
      footerSummary: summaryParts.join(' · '),
    };
  });

  async readFile(picker: HTMLInputElement): Promise<void> {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;

    this.fileName.set(file.name);
    this.parsed.set(null);
    this.preview.set(null);
    this.error.set(null);

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.error.set('Please select a JSON file (.json).');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.error.set('The selected file is too large (maximum allowed size is 25 MB).');
      return;
    }

    try {
      const parsed = this.parser.parse(await file.text());
      this.preview.set(await this.importService.preview(parsed));
      this.parsed.set(parsed);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The file could not be read.');
    }
  }

  async runImport(): Promise<void> {
    if (this.importing()) return;
    const parsed = this.parsed();
    if (!parsed) return;

    this.importing.set(true);
    try {
      const result = await this.importService.import(parsed);
      this.snackBar.show(this.describe(result));
      void this.router.navigate(['/daily-scores']);
    } catch (e: unknown) {
      this.snackBar.error(e, 'The import failed. Nothing was written.');
    } finally {
      this.importing.set(false);
    }
  }

  private describe(result: TelegramImportResult): string {
    const count = (n: number, noun: string) => `${COUNT_FORMAT.format(n)} ${noun}${n === 1 ? '' : 's'}`;
    const parts = [
      `Imported ${count(result.imported, 'score')}`,
      result.replaced > 0 ? `${COUNT_FORMAT.format(result.replaced)} replaced` : '',
      result.skipped > 0 ? `${COUNT_FORMAT.format(result.skipped)} skipped` : '',
      `High-score streak: ${COUNT_FORMAT.format(result.resultingStreak)}`,
    ].filter(Boolean);
    return parts.join(' · ');
  }
}
