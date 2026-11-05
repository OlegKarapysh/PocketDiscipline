export interface BackupComparison {
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly transformed: boolean;
  readonly rows: readonly { table: string; label: string; incoming: number; current: number }[];
  readonly incomingBalance: number;
  readonly currentBalance: number;
}
