import { Service, inject } from '@angular/core';
import { DbService } from '../../../database/db.service';
import { BackupSchemaService } from './backup-schema.service';
import { BackupValidationService } from './backup-validation.service';
import type { ValidatedBackup } from '../models/validated-backup.model';
import type { DeviceSnapshot } from '../models/device-snapshot.model';
import type { BackupData } from '../models/backup-data.type';
import { BackupImportError } from '../models/backup-import-error.model';
import { PomodoroTimerService } from '../../pomodoro/services/pomodoro-timer.service';
import { BACKUP_TABLES } from '../validation/backup-schema.const';

@Service()
export class BackupImportService {
  private readonly db = inject(DbService);
  private readonly validation = inject(BackupValidationService);
  private readonly schema = inject(BackupSchemaService);
  private readonly timer = inject(PomodoroTimerService);

  async prepare(file: File): Promise<ValidatedBackup> {
    const envelope = await this.validation.validate(file, this.db.verno);
    const transformed = envelope.schemaVersion !== this.db.verno;
    // A current-schema file was already validated against this schema; only upgraded data is checked again.
    const data = transformed
      ? this.validation.validateData(
          this.schema.upgrade(envelope.data, envelope.schemaVersion, this.db.verno),
          this.db.verno,
        )
      : envelope.data;
    const profile = data['users'][0];
    if (
      typeof profile !== 'object' ||
      profile === null ||
      !('balance' in profile) ||
      typeof profile.balance !== 'number'
    )
      throw new Error('The backup profile is invalid.');
    return {
      envelope: { ...envelope, data },
      transformed,
      counts: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length])),
      balance: profile.balance,
    };
  }

  async snapshot(): Promise<DeviceSnapshot> {
    await this.db.open();
    await this.timer.ready();
    return this.db.transaction('r', this.db.tables, () => this.readSnapshot());
  }

  async replace(prepared: ValidatedBackup, baseline: DeviceSnapshot): Promise<void> {
    const hold = await this.timer.holdForReplacement();
    try {
      await this.db.transaction('rw', this.db.tables, async () => {
        const current = await this.readSnapshot();
        if (current.canonical !== baseline.canonical)
          throw new BackupImportError(
            'device-changed',
            'Data on this device changed. Review the updated values and confirm again.',
          );
        for (const table of this.db.tables) await table.clear();
        const batchSize = 1000;
        for (const table of this.db.tables) {
          const rows = prepared.envelope.data[table.name];
          for (let index = 0; index < rows.length; index += batchSize)
            await table.bulkAdd(rows.slice(index, index + batchSize));
        }
        await this.db.users.update(1, { lastExportedAt: Date.parse(prepared.envelope.exportedAt) });
      });
    } catch (error) {
      hold.release();
      if (error instanceof BackupImportError) throw error;
      throw new BackupImportError(
        'storage-failed',
        'Could not restore the backup. Your data was preserved. Try again.',
      );
    }
    hold.commit();
  }

  private async readSnapshot(): Promise<DeviceSnapshot> {
    const data: BackupData = Object.fromEntries<unknown[]>(
      await Promise.all(
        this.db.tables.map(async (table) => {
          const rows: unknown[] = await table.toArray();
          return [table.name, rows] as const;
        }),
      ),
    );
    const profile = data['users'][0];
    if (!this.isRow(profile) || typeof profile['balance'] !== 'number')
      throw new Error('Could not load the current profile.');
    const canonical = JSON.stringify(
      Object.fromEntries(
        Object.entries(BACKUP_TABLES)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([table, descriptor]) => [
            table,
            [...data[table]]
              .sort((a, b) => {
                if (!this.isRow(a) || !this.isRow(b)) return 0;
                const x = a[descriptor.key];
                const y = b[descriptor.key];
                if (typeof x === 'number' && typeof y === 'number') return x - y;
                return String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0;
              })
              .map((row) => this.ordered(row)),
          ]),
      ),
    );
    return {
      canonical,
      counts: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length])),
      balance: profile['balance'],
    };
  }
  private ordered(value: unknown): unknown {
    if (value === undefined) return ['undefined'];
    if (value === null) return ['null'];
    if (typeof value === 'number') return ['number', Object.is(value, -0) ? '-0' : String(value)];
    if (value instanceof Date) return ['date', value.getTime()];
    if (Array.isArray(value)) return ['array', value.map((item) => this.ordered(item))];
    if (this.isRow(value))
      return [
        'object',
        Object.keys(value)
          .sort()
          .map((key) => [key, this.ordered(value[key])]),
      ];
    return [typeof value, value];
  }
  private isRow(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
