import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { DailyTaskForm } from './daily-task-form';
import type { DailyTaskDraft } from '../../models/daily-task-draft.model';
import { DIFFICULTY_NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';

describe('DailyTaskForm', () => {
  let component: DailyTaskForm;
  let fixture: ComponentFixture<DailyTaskForm>;

  const inputs = (): HTMLInputElement[] =>
    fixture.debugElement.queryAll(By.css('input')).map((el) => el.nativeElement as HTMLInputElement);

  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyTaskForm],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with default 3 difficulties', () => {
    expect(component.draft().difficulties.map((d) => d.name)).toEqual(['Easy', 'Medium', 'Hard']);
  });

  it('should add a new difficulty when addDifficulty is called', () => {
    component.addDifficulty();
    expect(component.draft().difficulties.length).toBe(4);
  });

  it('should remove a difficulty at specified index', () => {
    component.removeDifficulty(1);
    expect(component.draft().difficulties.length).toBe(2);
    expect(component.draft().difficulties.some((d) => d.name === 'Medium')).toBe(false);
  });

  it('should not remove difficulty when only 1 difficulty remains', () => {
    component.draft.update((draft) => ({ ...draft, difficulties: [{ id: '1', name: 'Only', baseReward: 100 }] }));
    component.removeDifficulty(0);
    expect(component.draft().difficulties.length).toBe(1);
  });

  it('should write typed values into the draft', async () => {
    const [title, firstName, firstReward] = inputs();
    await type(title, 'Stretch');
    await type(firstName, 'Light');
    await type(firstReward, '150');

    expect(component.draft().title).toBe('Stretch');
    expect(component.draft().difficulties[0]).toEqual(expect.objectContaining({ name: 'Light', baseReward: 150 }));
  });

  it('should emit taskCreated with a trimmed title and reset the form upon submitting', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.taskCreated.subscribe((data) => emitted.push(data));

    await type(inputs()[0], '  Read 30 mins  ');
    component.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].title).toBe('Read 30 mins');
    expect(emitted[0].difficulties.length).toBe(3);
    expect(component.draft().title).toBe('');
  });

  it('should fall back to default name and reward for blank difficulties', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.taskCreated.subscribe((data) => emitted.push(data));

    const [title, firstName, firstReward] = inputs();
    await type(title, 'Read');
    await type(firstName, '   ');
    await type(firstReward, '');
    component.submit();

    expect(emitted[0].difficulties[0]).toEqual(expect.objectContaining({ name: 'New difficulty', baseReward: 100 }));
  });

  it('should not emit taskCreated when title is empty or blank', async () => {
    let emitted = false;
    component.taskCreated.subscribe(() => (emitted = true));

    await type(inputs()[0], '   ');
    component.submit();

    expect(emitted).toBe(false);
    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('should cap the title and every difficulty name so a long paste is cut off', async () => {
    component.addDifficulty();
    fixture.detectChanges();
    await fixture.whenStable();

    const textInputs = inputs().filter((input) => input.type === 'text');
    const [title, ...names] = textInputs;

    expect(title.maxLength).toBe(TITLE_MAX_LENGTH);
    expect(names).toHaveLength(4);
    for (const name of names) {
      expect(name.maxLength).toBe(DIFFICULTY_NAME_MAX_LENGTH);
    }
  });

  it('should not emit taskCreated when the title is longer than the limit', async () => {
    let emitted = false;
    component.taskCreated.subscribe(() => (emitted = true));

    await type(inputs()[0], 'a'.repeat(TITLE_MAX_LENGTH + 1));
    component.submit();

    expect(emitted).toBe(false);
  });

  it('should not emit taskCreated when a difficulty name is longer than the limit', async () => {
    let emitted = false;
    component.taskCreated.subscribe(() => (emitted = true));

    const [title, firstName] = inputs();
    await type(title, 'Read');
    await type(firstName, 'a'.repeat(DIFFICULTY_NAME_MAX_LENGTH + 1));
    component.submit();

    expect(emitted).toBe(false);
  });

  it('should accept a title and a difficulty name exactly at the limit', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.taskCreated.subscribe((data) => emitted.push(data));

    const [title, firstName] = inputs();
    await type(title, 'a'.repeat(TITLE_MAX_LENGTH));
    await type(firstName, 'b'.repeat(DIFFICULTY_NAME_MAX_LENGTH));
    component.submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].title).toHaveLength(TITLE_MAX_LENGTH);
    expect(emitted[0].difficulties[0].name).toHaveLength(DIFFICULTY_NAME_MAX_LENGTH);
  });

  it('should emit cancelForm when Cancel button is clicked in template', () => {
    let cancelled = false;
    component.cancelForm.subscribe(() => (cancelled = true));

    const cancelBtn = fixture.debugElement.query(By.css('button[mat-button]')).nativeElement as HTMLElement;
    expect(cancelBtn.textContent.trim()).toBe('Cancel');

    cancelBtn.click();

    expect(cancelled).toBe(true);
  });

  it('should submit form when Save task button is clicked with valid title', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.taskCreated.subscribe((data) => emitted.push(data));

    await type(inputs()[0], 'Evening Reading');

    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);

    saveBtn.click();

    expect(emitted.map((d) => d.title)).toEqual(['Evening Reading']);
  });
});
