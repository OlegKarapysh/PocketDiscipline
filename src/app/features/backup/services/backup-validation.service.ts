import { Service } from '@angular/core';
import { version } from '../../../../../package.json';
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from '../constants/backup-format.const';
import { MAX_BACKUP_BYTES } from '../constants/backup-import.const';
import { BackupImportError } from '../models/backup-import-error.model';
import type { BackupData } from '../models/backup-data.type';
import type { BackupEnvelope } from '../models/backup-envelope.model';
import { BACKUP_FIELDS, BACKUP_TABLES } from '../validation/backup-schema.const';
import { isRow } from '../validation/is-row';

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

@Service()
export class BackupValidationService {
  async validate(file: File, currentSchema: number): Promise<BackupEnvelope> {
    if (file.size > MAX_BACKUP_BYTES) throw new BackupImportError('too-large', 'Choose a backup of 50 MiB or less.');
    let text: string;
    try {
      text = typeof file.text === 'function' ? await file.text() : await this.readFile(file);
    } catch {
      throw new BackupImportError('file-read', 'Could not read this backup. Select the file again.');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BackupImportError('invalid-json', 'This file is not valid backup JSON.');
    }
    if (
      !isRow(parsed) ||
      parsed['format'] !== BACKUP_FORMAT ||
      !this.positiveInteger(parsed['formatVersion']) ||
      !this.positiveInteger(parsed['schemaVersion']) ||
      typeof parsed['appVersion'] !== 'string' ||
      !SEMVER.test(parsed['appVersion']) ||
      typeof parsed['exportedAt'] !== 'string' ||
      !this.isoInstant(parsed['exportedAt']) ||
      typeof parsed['encrypted'] !== 'boolean'
    ) {
      throw new BackupImportError('invalid-header', 'This file does not have a valid PocketDiscipline backup header.');
    }
    if (
      parsed['formatVersion'] > BACKUP_FORMAT_VERSION ||
      parsed['schemaVersion'] > currentSchema ||
      this.compareVersions(parsed['appVersion'], version) > 0
    )
      throw new BackupImportError('update-required', 'Update the app first to import this backup.');
    if (parsed['encrypted'])
      throw new BackupImportError(
        'encryption-unsupported',
        'Encrypted backups are not supported yet. Passphrase encryption is planned for spec 016.',
      );
    const allowed = ['format', 'formatVersion', 'schemaVersion', 'appVersion', 'exportedAt', 'encrypted', 'data'];
    if (Object.keys(parsed).some((key) => !allowed.includes(key)))
      throw new BackupImportError('invalid-header', 'This backup contains unsupported header fields.');
    const data = this.validateData(parsed['data'], parsed['schemaVersion']);
    return {
      format: BACKUP_FORMAT,
      formatVersion: parsed['formatVersion'],
      schemaVersion: parsed['schemaVersion'],
      appVersion: parsed['appVersion'],
      exportedAt: parsed['exportedAt'],
      encrypted: false,
      data,
    };
  }

  validateData(value: unknown, schema: number): BackupData {
    if (!this.positiveInteger(schema))
      throw new BackupImportError('unsupported-version', 'This backup schema is not supported.');
    const tables = Object.entries(BACKUP_TABLES).filter(([, descriptor]) => descriptor.since <= schema);
    if (
      !isRow(value) ||
      Object.keys(value).length !== tables.length ||
      Object.keys(value).some((name) => !tables.some(([table]) => table === name))
    )
      throw new BackupImportError('invalid-row', 'The backup must contain exactly the tables declared by its schema.');
    const result: BackupData = {};
    for (const [table, descriptor] of tables) {
      const rows: unknown = value[table];
      if (!Array.isArray(rows)) throw new BackupImportError('invalid-row', 'Expected a table array.', table);
      const keys = new Set<unknown>();
      for (let index = 0; index < rows.length; index++) {
        const row: unknown = rows[index];
        const path = `${table}[${index}]`;
        this.validateRow(row, BACKUP_FIELDS[table], schema, path, table === 'dailyTasks');
        const key = row[descriptor.key];
        if (keys.has(key)) throw new BackupImportError('duplicate-key', 'Duplicate primary key.', path);
        keys.add(key);
      }
      if (table === 'users' && rows.length !== 1)
        throw new BackupImportError('duplicate-key', 'Exactly one profile with id 1 is required.', table);
      result[table] = rows;
    }
    if (schema >= 8) {
      const categories = new Set(result['rewardCategories'].filter((row) => isRow(row)).map((row) => row['id']));
      for (const table of ['rewards', 'withdrawals'])
        result[table].forEach((row, index) => {
          if (!isRow(row) || !categories.has(row['categoryId']))
            throw new BackupImportError(
              'invalid-reference',
              'The referenced reward category is missing.',
              `${table}[${index}].categoryId`,
            );
        });
    }
    return result;
  }

  private validateRow(
    value: unknown,
    fields: Readonly<Record<string, string>>,
    schema: number,
    path: string,
    dailyTask = false,
  ): asserts value is Record<string, unknown> {
    if (
      !isRow(value) ||
      Object.keys(value).some((key) => !Object.hasOwn(fields, key) || (dailyTask && schema < 10 && key === 'sortOrder'))
    )
      throw new BackupImportError('invalid-row', 'Unsupported row shape or field.', path);
    for (const [key, rule] of Object.entries(fields)) {
      if (dailyTask && schema < 10 && key === 'sortOrder') continue;
      if (!Object.hasOwn(value, key) && rule.endsWith('?')) continue;
      const field = value[key];
      const kind = rule.replace(/\?$/, '');
      if (field === null && kind.includes('|null')) continue;
      if (kind === 'difficulties') {
        if (!Array.isArray(field))
          throw new BackupImportError('invalid-row', 'Expected difficulty levels.', `${path}.${key}`);
        const keys = new Set<unknown>();
        field.forEach((difficulty: unknown, index) => {
          this.validateRow(
            difficulty,
            { id: 'id', name: 'string', baseReward: 'money' },
            schema,
            `${path}.difficulties[${index}]`,
          );
          if (keys.has(difficulty['id']))
            throw new BackupImportError('duplicate-key', 'Duplicate difficulty id.', `${path}.difficulties[${index}]`);
          keys.add(difficulty['id']);
        });
      } else if (!this.validField(field, kind.replace('|null', ''), schema))
        throw new BackupImportError('invalid-row', 'Invalid or missing field.', `${path}.${key}`);
    }
  }
  private validField(value: unknown, kind: string, schema: number): boolean {
    switch (kind) {
      case 'id':
        return typeof value === 'string' && value.trim().length > 0;
      case 'user-id':
        return value === 1;
      case 'string':
        return typeof value === 'string';
      case 'boolean':
        return typeof value === 'boolean';
      case 'timestamp':
        return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
      case 'integer':
        return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
      case 'positive':
        return typeof value === 'number' && Number.isFinite(value) && value > 0;
      case 'score':
        return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10;
      case 'money':
      case 'balance':
      case 'rate':
        return (
          typeof value === 'number' &&
          Number.isFinite(value) &&
          Math.abs(value) <= Number.MAX_SAFE_INTEGER &&
          (schema < 9 || Number.isSafeInteger(value)) &&
          (kind === 'balance' || value >= (kind === 'rate' ? 1 : 0))
        );
      case 'date':
        return (
          typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && this.isoInstant(`${value}T00:00:00.000Z`)
        );
      case 'color':
        return typeof value === 'string' && (value === '' || /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value));
      default:
        return typeof value === 'string' && kind.split('|').includes(value);
    }
  }
  private positiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  }
  private isoInstant(value: string): boolean {
    if (!/^(?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
    const time = Date.parse(value);
    return (
      Number.isFinite(time) &&
      new Date(time).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'))
    );
  }
  private compareVersions(left: string, right: string): number {
    const parts = (value: string): [string, string | undefined] => {
      const split = value.split('+')[0].split(/-(.*)/s);
      return [split[0], split.at(1)];
    };
    const [a, preA] = parts(left);
    const [b, preB] = parts(right);
    const numsA = a.split('.').map(BigInt);
    const numsB = b.split('.').map(BigInt);
    for (let index = 0; index < 3; index++)
      if (numsA[index] !== numsB[index]) return numsA[index] > numsB[index] ? 1 : -1;
    if (preA === preB) return 0;
    if (preA === undefined) return 1;
    if (preB === undefined) return -1;
    const idsA = preA.split('.');
    const idsB = preB.split('.');
    for (let index = 0; index < Math.max(idsA.length, idsB.length); index++) {
      const x = idsA.at(index);
      const y = idsB.at(index);
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      if (x === y) continue;
      const numericX = /^\d+$/.test(x);
      const numericY = /^\d+$/.test(y);
      if (numericX && numericY) return BigInt(x) > BigInt(y) ? 1 : -1;
      if (numericX !== numericY) return numericX ? -1 : 1;
      return x > y ? 1 : -1;
    }
    return 0;
  }
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('File read failed'));
      };
      reader.onerror = () => {
        reject(new Error('File read failed'));
      };
      reader.onabort = () => {
        reject(new Error('File read aborted'));
      };
      reader.readAsText(file);
    });
  }
}
