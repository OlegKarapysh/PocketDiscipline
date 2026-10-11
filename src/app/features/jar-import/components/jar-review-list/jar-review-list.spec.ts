import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JarReviewRow } from '../../models/jar-review-row.model';
import { JarReviewList } from './jar-review-list';

const ROWS: JarReviewRow[] = [
  {
    key: 'task:тренировка',
    label: 'Тренировка',
    rowIds: ['a', 'b'],
    paid: 150,
    actions: ['task', 'goal', 'skip'],
    action: 'task',
    taskTitle: 'Тренировка',
  },
  {
    key: 'top-up',
    label: 'Jar top-ups',
    rowIds: ['c'],
    paid: 300,
    actions: ['skip', 'goal'],
    action: 'skip',
    taskTitle: '',
  },
];

describe('JarReviewList', () => {
  let fixture: ComponentFixture<JarReviewList>;
  let component: JarReviewList;
  let emitted: JarReviewRow[] | undefined;

  beforeEach(() => {
    fixture = TestBed.createComponent(JarReviewList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', ROWS);
    fixture.componentRef.setInput('existingTaskTitles', ['тренировка']);
    emitted = undefined;
    component.confirmImport.subscribe((rows) => (emitted = rows));
    fixture.detectChanges();
  });

  const setRow = (index: number, change: Partial<{ action: JarReviewRow['action']; taskTitle: string }>) => {
    component.draft.update((draft) => ({
      rows: draft.rows.map((row, i) => (i === index ? { ...row, ...change } : row)),
    }));
  };

  it('emits the rows with the edits made to them', () => {
    setRow(0, { taskTitle: '  Зал  ' });
    setRow(1, { action: 'goal' });

    component.submit();

    expect(emitted?.map(({ key, action, taskTitle }) => ({ key, action, taskTitle }))).toEqual([
      { key: 'task:тренировка', action: 'task', taskTitle: 'Зал' },
      { key: 'top-up', action: 'goal', taskTitle: '' },
    ]);
  });

  it('needs a task name only for a row that becomes a daily task', () => {
    setRow(0, { taskTitle: ' ' });
    expect(component.canImport()).toBe(false);
    component.submit();
    expect(emitted).toBeUndefined();

    setRow(0, { action: 'skip' });
    expect(component.canImport()).toBe(true);
  });

  it('says when a task name matches an existing task, as it is typed', () => {
    expect(component.items()[0].isExisting).toBe(true);

    setRow(0, { taskTitle: 'Новая' });
    expect(component.items()[0].isExisting).toBe(false);
  });

  it('counts the rows to import and to skip', () => {
    expect(component.totals()).toBe('2 rows to import · 1 skipped');
  });

  it('cannot import while an import is running', () => {
    fixture.componentRef.setInput('importing', true);
    expect(component.canImport()).toBe(false);
  });
});
