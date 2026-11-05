import type { BackupData } from './backup-data.type';

export interface DeviceSnapshot {
  readonly data: BackupData;
  readonly canonical: string;
  readonly counts: Readonly<Record<string, number>>;
  readonly balance: number;
}
