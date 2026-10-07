import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { DailyTaskForm } from './daily-task-form';
import type { DailyTaskDraft } from '../../models/daily-task-draft.model';
import type { DailyTask } from '../../../../core/models/daily-task.model';
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

  it('should emit save with a trimmed title and keep the draft until the parent closes the form', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.save.subscribe((data) => emitted.push(data));

    await type(inputs()[0], '  Read 30 mins  ');
    component.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].title).toBe('Read 30 mins');
    expect(emitted[0].difficulties.length).toBe(3);
    expect(component.draft().title).toBe('  Read 30 mins  ');
  });

  it('should fall back to the default name for a blank difficulty name', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.save.subscribe((data) => emitted.push(data));

    const [title, firstName] = inputs();
    await type(title, 'Read');
    await type(firstName, '   ');
    component.submit();

    expect(emitted[0].difficulties[0]).toEqual(expect.objectContaining({ name: 'New difficulty', baseReward: 100 }));
  });

  it('should emit the rewards as typed, in whole hryvnias', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.save.subscribe((data) => emitted.push(data));

    const [title, , firstReward] = inputs();
    await type(title, 'Read');
    await type(firstReward, '125');
    component.submit();

    expect(emitted[0].difficulties.map((d) => d.baseReward)).toEqual([125, 200, 300]);
  });

  it('should not emit save while a difficulty reward is blank', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [title, , firstReward] = inputs();
    await type(title, 'Read');
    await type(firstReward, '');
    component.submit();

    expect(emitted).toBe(false);
    expect(
      component.taskForm.difficulties[0]
        .baseReward()
        .errors()
        .map((e) => e.message),
    ).toEqual(['Reward is required']);
  });

  it('should not emit save when a difficulty reward is not a whole number of hryvnias, at least 1', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [title, , firstReward] = inputs();
    await type(title, 'Read');
    for (const reward of ['0', '-50', '12.5']) {
      await type(firstReward, reward);
      component.submit();
    }

    expect(emitted).toBe(false);
  });

  it('should not emit save when title is empty or blank', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

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

  it('should not emit save when the title is longer than the limit', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    await type(inputs()[0], 'a'.repeat(TITLE_MAX_LENGTH + 1));
    component.submit();

    expect(emitted).toBe(false);
  });

  it('should not emit save when a difficulty name is longer than the limit', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [title, firstName] = inputs();
    await type(title, 'Read');
    await type(firstName, 'a'.repeat(DIFFICULTY_NAME_MAX_LENGTH + 1));
    component.submit();

    expect(emitted).toBe(false);
  });

  it('should accept a title and a difficulty name exactly at the limit', async () => {
    const emitted: DailyTaskDraft[] = [];
    component.save.subscribe((data) => emitted.push(data));

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
    component.save.subscribe((data) => emitted.push(data));

    await type(inputs()[0], 'Evening Reading');

    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);

    saveBtn.click();

    expect(emitted.map((d) => d.title)).toEqual(['Evening Reading']);
  });

  it('should not emit save while the parent is saving', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));
    await type(inputs()[0], 'Read');

    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    component.submit();

    expect(emitted).toBe(false);
    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  describe('editing a task', () => {
    const task: DailyTask = {
      id: 'task-1',
      title: 'Morning run',
      createdAt: 0,
      difficulties: [
        { id: 'short', name: 'Short', baseReward: 125 },
        { id: 'long', name: 'Long', baseReward: 300 },
      ],
      streak: 4,
      lastCompletedAt: 0,
    };

    const openFor = async (edited: DailyTask): Promise<void> => {
      fixture = TestBed.createComponent(DailyTaskForm);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('task', edited);
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('should pre-fill the title, the names and the rewards', async () => {
      await openFor(task);

      const [title, firstName, firstReward, secondName, secondReward] = inputs();
      expect(title.value).toBe('Morning run');
      expect([firstName.value, firstReward.value, secondName.value, secondReward.value]).toEqual([
        'Short',
        '125',
        'Long',
        '300',
      ]);
      const heading = fixture.debugElement.query(By.css('mat-card-title')).nativeElement as HTMLElement;
      expect(heading.textContent.trim()).toBe('Edit daily task');
    });

    it('should emit the edited task with its difficulty ids kept', async () => {
      await openFor(task);
      const emitted: DailyTaskDraft[] = [];
      component.save.subscribe((data) => emitted.push(data));

      const [title, , firstReward] = inputs();
      await type(title, '  Evening run ');
      await type(firstReward, '15');
      component.addDifficulty();
      component.submit();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].title).toBe('Evening run');
      expect(emitted[0].difficulties.slice(0, 2)).toEqual([
        { id: 'short', name: 'Short', baseReward: 15 },
        { id: 'long', name: 'Long', baseReward: 300 },
      ]);
      expect(emitted[0].difficulties).toHaveLength(3);
    });

    it('should keep what the user typed when the list re-emits the task', async () => {
      await openFor(task);
      await type(inputs()[0], 'Evening run');

      fixture.componentRef.setInput('task', { ...task, streak: 5 });
      fixture.detectChanges();

      expect(component.draft().title).toBe('Evening run');
    });

    it('should show a reward that was saved invalid and block saving until it is fixed', async () => {
      await openFor({
        ...task,
        difficulties: [
          { id: 'short', name: 'Short', baseReward: -500 },
          { id: 'long', name: 'Long', baseReward: NaN },
        ],
      });

      const errors = fixture.debugElement
        .queryAll(By.css('mat-error'))
        .map((el) => (el.nativeElement as HTMLElement).textContent.trim());
      expect(errors).toEqual(['Reward must be at least 1 ₴', 'Reward is required']);
      expect(component.canSubmit()).toBe(false);

      const [, , firstReward, , secondReward] = inputs();
      await type(firstReward, '10');
      await type(secondReward, '20');
      expect(component.canSubmit()).toBe(true);
    });
  });
});
