import type { JarImportAction } from './jar-import-action.type';

// One line of the review: a group of statement rows and what to make of them.
export interface JarReviewRow {
  key: string;
  label: string;
  rowIds: string[];
  // Whole hryvnias.
  paid: number;
  actions: JarImportAction[];
  action: JarImportAction;
  // Used when the action is 'task'. Rows whose titles fold the same become one task.
  taskTitle: string;
}
