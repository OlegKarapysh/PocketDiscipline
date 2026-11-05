import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { backupFixture } from '../testing/backup.fixture';
import { BackupSchemaService } from './backup-schema.service';
import { BackupValidationService } from './backup-validation.service';

describe('BackupSchemaService', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('upgrades schema %s through every remaining transition', (schema) => {
    const source = backupFixture(schema);
    const before = structuredClone(source);
    const result = TestBed.inject(BackupSchemaService).upgrade(source.data, schema, 11);
    TestBed.inject(BackupValidationService).validateData(result, 11);
    expect(Object.keys(result).sort()).toEqual(Object.keys(backupFixture().data).sort());
    expect(source).toEqual(before);
    if (schema < 11) expect(result['pomodoroRewardRates']).toEqual([]);
    if (schema === 1) expect(result['goals'].length).toBeGreaterThan(0);
    if (schema < 8) expect(result['rewardCategories'].length).toBeGreaterThan(0);
  });

  it('rounds historical money including zero and nested rewards and uses primary-key order', () => {
    const source = backupFixture(8);
    Object.assign(source.data['users'][0] as object, { balance: -0.4 });
    source.data['dailyTasks'] = ['z', 'a'].map((id) => ({
      id,
      title: id,
      createdAt: 1,
      streak: 0,
      lastCompletedAt: null,
      difficulties: [{ id: 'easy', name: 'Easy', baseReward: 0.4 }],
    }));
    const result = TestBed.inject(BackupSchemaService).upgrade(source.data, 8, 11);
    expect(result['users'][0]).toHaveProperty('balance', 0);
    expect(result['dailyTasks']).toEqual([
      expect.objectContaining({ id: 'a', sortOrder: 0, difficulties: [{ id: 'easy', name: 'Easy', baseReward: 0 }] }),
      expect.objectContaining({ id: 'z', sortOrder: 1 }),
    ]);
  });

  it('preserves identity transitions and refuses missing transformations', () => {
    const service = TestBed.inject(BackupSchemaService);
    expect(service.upgrade(backupFixture(6).data, 6, 7)).toEqual(backupFixture(6).data);
    expect(() => service.upgrade(backupFixture().data, 11, 12)).toThrow();
  });
});
