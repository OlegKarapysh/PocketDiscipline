import { Service, inject } from '@angular/core';
import { version } from '../../../../../package.json';
import { DbService } from '../../../database/db.service';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import { BACKUP_FORMAT } from '../constants/backup-format.const';
import type { BackupEnvelope } from '../models/backup-envelope.model';
import type { BackupFile } from '../models/backup-file.model';

@Service()
export class BackupExportService {
  private readonly db = inject(DbService);

  async recordExport(): Promise<void> {
    await this.db.users.update(CURRENT_USER_ID, { lastExportedAt: Date.now() });
  }

  async createBackup(): Promise<BackupFile> {
    const now = new Date();
    const tables = this.db.tables;
    const rows = await this.db.transaction('r', tables, () => Promise.all(tables.map((table) => table.toArray())));
    const envelope: BackupEnvelope = {
      format: BACKUP_FORMAT,
      formatVersion: 1,
      schemaVersion: this.db.verno,
      appVersion: version,
      exportedAt: now.toISOString(),
      encrypted: false,
      data: Object.fromEntries(tables.map((table, index) => [table.name, rows[index]])),
    };
    const pad = (part: number) => String(part).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
    return new File([JSON.stringify(envelope, null, 2)], `pocket-discipline-${date}-${time}.txt`, {
      type: 'text/plain',
    });
  }
}
