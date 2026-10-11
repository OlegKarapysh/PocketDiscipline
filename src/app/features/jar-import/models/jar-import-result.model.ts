// What one import wrote, and the statement rows it did not.
export interface JarImportResult {
  completions: number;
  // Tasks that received at least one new completion.
  tasks: number;
  scores: number;
  sessions: number;
  goals: number;
  withdrawals: number;
  alreadyImported: number;
  skipped: number;
}
