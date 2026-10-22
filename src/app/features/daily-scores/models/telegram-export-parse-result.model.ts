import type { TelegramScoreRow } from './telegram-score-row.model';

export interface TelegramExportParseResult {
  scores: TelegramScoreRow[];
  duplicateDates: number;
  skippedMessages: string[];
}
