import type { BACKUP_FORMAT } from '../constants/backup-format.const';
import type { BackupData } from './backup-data.type';

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  encrypted: false;
  data: BackupData;
}
