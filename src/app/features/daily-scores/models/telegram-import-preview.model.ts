export interface TelegramImportPreview {
  totalScores: number;
  newScores: number;
  replacedScores: number;
  highScores: number;
  averageScore: number;
  resultingStreak: number;
  startDate: number;
  endDate: number;
  duplicateDates: number;
  skippedMessages: string[];
}
