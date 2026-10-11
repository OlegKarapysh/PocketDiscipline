import { Component, computed, input } from '@angular/core';
import { Amount } from '../../../../shared/components/amount/amount';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import type { JarRewardKind } from '../../models/jar-reward-kind.type';
import type { JarStatementRow } from '../../models/jar-statement-row.model';

const COUNT_FORMAT = new Intl.NumberFormat('en-US');
const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const KIND_LABELS: Readonly<Record<JarRewardKind, string>> = {
  graded: 'Graded habits',
  counted: 'Counted exercises',
  timed: 'Timed exercises',
  score: 'Daily scores',
  pomodoro: 'Pomodoro',
  free: 'One-offs and free text',
  'top-up': 'Top-ups',
};

@Component({
  imports: [Amount, SectionCard, StatCard],
  selector: 'app-jar-statement-summary',
  styleUrl: './jar-statement-summary.scss',
  templateUrl: './jar-statement-summary.html',
})
export class JarStatementSummary {
  readonly rows = input.required<JarStatementRow[]>();

  readonly summary = computed(() => {
    const rows = this.rows();
    const deposits = rows.filter((row) => row.category === 'deposit');
    const withdrawals = rows.filter((row) => row.category === 'withdrawal');
    const times = rows.map((row) => row.completedAt);
    const kinds = new Map<JarRewardKind, number>();
    for (const row of deposits) {
      if (row.reward) kinds.set(row.reward.kind, (kinds.get(row.reward.kind) ?? 0) + 1);
    }
    const total = (list: JarStatementRow[]) => Math.round(list.reduce((sum, row) => sum + row.amount, 0));
    const count = (n: number, noun: string) => `${COUNT_FORMAT.format(n)} ${noun}${n === 1 ? '' : 's'}`;

    return {
      paid: total(deposits),
      paidHint: count(deposits.length, 'reward'),
      withdrawn: total(withdrawals),
      withdrawnHint: count(withdrawals.length, 'withdrawal'),
      period: `${DAY_FORMAT.format(Math.min(...times))} – ${DAY_FORMAT.format(Math.max(...times))}`,
      periodHint: count(rows.length, 'row'),
      kinds: [...kinds]
        .sort((a, b) => b[1] - a[1])
        .map(([kind, n]) => ({ kind, label: KIND_LABELS[kind], count: COUNT_FORMAT.format(n) })),
      notes: [
        count(deposits.filter((row) => row.reward?.shifted).length, 'row') + ' marked as yesterday',
        count(deposits.filter((row) => (row.reward?.bonus ?? 0) > 0).length, 'row') + ' with a streak bonus',
      ],
    };
  });
}
