import type { JarReviewRow } from './jar-review-row.model';

export interface JarImportSuggestion {
  rows: JarReviewRow[];
  // Folded, so a title being edited can be matched against them.
  existingTaskTitles: string[];
}
