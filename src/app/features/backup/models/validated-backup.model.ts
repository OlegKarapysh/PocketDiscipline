import type { BackupEnvelope } from './backup-envelope.model';

export interface ValidatedBackup {
  readonly envelope: BackupEnvelope;
  readonly transformed: boolean;
  readonly counts: Readonly<Record<string, number>>;
  readonly balance: number;
}
