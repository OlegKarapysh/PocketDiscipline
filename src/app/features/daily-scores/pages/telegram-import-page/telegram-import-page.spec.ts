import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { TelegramScoresImportService } from '../../services/telegram-scores-import.service';
import { TelegramScoresParserService } from '../../services/telegram-scores-parser.service';
import { TelegramImportPage } from './telegram-import-page';

describe('TelegramImportPage', () => {
  let fixture: ComponentFixture<TelegramImportPage>;
  let importServiceMock: {
    preview: ReturnType<typeof vi.fn>;
    import: ReturnType<typeof vi.fn>;
  };
  let snackBarMock: {
    show: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    importServiceMock = {
      preview: vi.fn().mockResolvedValue({
        totalScores: 3,
        newScores: 2,
        replacedScores: 1,
        highScores: 2,
        averageScore: 9,
        resultingStreak: 2,
        startDate: new Date(2026, 8, 1).getTime(),
        endDate: new Date(2026, 8, 3).getTime(),
        duplicateDates: 0,
        skippedMessages: ['2026-09-04: "note"'],
      }),
      import: vi.fn().mockResolvedValue({
        imported: 3,
        replaced: 1,
        skipped: 1,
        resultingStreak: 2,
      }),
    };

    snackBarMock = {
      show: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TelegramImportPage],
      providers: [
        provideRouter([]),
        TelegramScoresParserService,
        { provide: TelegramScoresImportService, useValue: importServiceMock },
        { provide: SnackBarService, useValue: snackBarMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TelegramImportPage);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function selectFile(name: string, content: string): Promise<void> {
    const input = fixture.debugElement.query(By.css('input[type="file"]')).nativeElement as HTMLInputElement;
    const file = new File([content], name, { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('shows an error alert when the selected file is not a valid Telegram export', async () => {
    await selectFile('bad.json', '{"invalid": true}');

    const alert = fixture.debugElement.query(By.css('[role="alert"]')).nativeElement as HTMLElement;
    expect(alert.textContent).toContain('This is not a Telegram chat export.');
  });

  it('renders the preview summary and imports the scores on confirm', async () => {
    const exportJson = JSON.stringify({
      messages: [
        { id: 1, type: 'message', date: '2026-09-01T22:00:00', text: '8/10' },
        { id: 2, type: 'message', date: '2026-09-02T22:00:00', text: '9/10' },
        { id: 3, type: 'message', date: '2026-09-03T22:00:00', text: '10/10' },
        { id: 4, type: 'message', date: '2026-09-04T22:00:00', text: 'note' },
      ],
    });

    await selectFile('result.json', exportJson);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('result.json');
    expect(root.textContent).toContain('2 new · 1 replaced');
    expect(root.textContent).toContain('2026-09-04: "note"');

    const importBtn = fixture.debugElement.query(By.css('.import-button')).nativeElement as HTMLButtonElement;
    importBtn.click();
    await fixture.whenStable();

    expect(importServiceMock.import).toHaveBeenCalledTimes(1);
    expect(snackBarMock.show).toHaveBeenCalledWith('Imported 3 scores · 1 replaced · 1 skipped · High-score streak: 2');
    expect(router.navigate).toHaveBeenCalledWith(['/daily-scores']);
  });

  it('shows an error snackbar and stays on the preview when the import fails', async () => {
    const failure = new Error('Storage failed');
    importServiceMock.import.mockRejectedValueOnce(failure);

    const exportJson = JSON.stringify({
      messages: [{ id: 1, type: 'message', date: '2026-09-01T22:00:00', text: '9/10' }],
    });
    await selectFile('result.json', exportJson);

    const importBtn = fixture.debugElement.query(By.css('.import-button')).nativeElement as HTMLButtonElement;
    importBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(snackBarMock.error).toHaveBeenCalledWith(failure, 'The import failed. Nothing was written.');
    expect(snackBarMock.show).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(importBtn.disabled).toBe(false);
  });
});
