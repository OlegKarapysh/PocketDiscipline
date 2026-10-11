// Labels the jar spelled more than one way, folded. Each maps to the label of the task it belongs to
// and, where the spelling itself names a difficulty, to that difficulty's level.
export const JAR_LABEL_ALIASES: Readonly<Record<string, { label: string; level?: string }>> = {
  // A typo on the first day of that streak.
  'речью дня': { label: 'ревью дня' },
  холодный: { label: 'холодный душ' },
  душ: { label: 'холодный душ' },
  'холодная ванна': { label: 'холодный душ', level: 'холодная ванна' },
  'первая заметка': { label: 'заметки' },
  заметка: { label: 'заметки' },
  заметки: { label: 'заметки' },
};

// Recurring, but not daily: suggested as skipped rather than as a daily task.
export const JAR_NON_DAILY_LABELS: ReadonlySet<string> = new Set(['подсчет итогов месяца']);
