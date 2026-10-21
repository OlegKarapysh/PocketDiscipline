import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { TaskForm } from './task-form';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import type { TaskDraft } from '../../models/task-draft.model';
import { TITLE_MAX_LENGTH } from '../../../../shared/constants/text-length.const';
import { MAX_MONEY_AMOUNT } from '../../../../shared/validators/money-amount';

describe('TaskForm', () => {
  let component: TaskForm;
  let fixture: ComponentFixture<TaskForm>;

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
      imports: [TaskForm],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with empty title, default reward 100, and heading "New one-off task"', () => {
    expect(component.draft()).toEqual({ title: '', rewardValue: 100 });
    const heading = fixture.debugElement.query(By.css('mat-card-title')).nativeElement as HTMLElement;
    expect(heading.textContent.trim()).toBe('New one-off task');
  });

  it('should emit save with trimmed title and whole-hryvnia reward when Save task is clicked', async () => {
    const emitted: TaskDraft[] = [];
    component.save.subscribe((data) => emitted.push(data));

    const [titleInput, rewardInput] = inputs();
    await type(titleInput, '  Pay internet bill  ');
    await type(rewardInput, '150');

    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    saveBtn.click();

    expect(emitted).toEqual([{ title: 'Pay internet bill', rewardValue: 150 }]);
  });

  it('should block saving when title is empty or whitespace-only', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [titleInput] = inputs();
    await type(titleInput, '   ');

    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    saveBtn.click();

    expect(emitted).toBe(false);
    expect(
      component.taskForm
        .title()
        .errors()
        .map((e) => e.message),
    ).toEqual(['Title is required']);
  });

  it('should cap the title input at TITLE_MAX_LENGTH and reject titles over the limit', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [titleInput] = inputs();
    expect(titleInput.maxLength).toBe(TITLE_MAX_LENGTH);

    await type(titleInput, 'a'.repeat(TITLE_MAX_LENGTH + 1));
    component.submit();

    expect(emitted).toBe(false);
  });

  it('should accept a title at exactly TITLE_MAX_LENGTH', async () => {
    const emitted: TaskDraft[] = [];
    component.save.subscribe((data) => emitted.push(data));

    const [titleInput] = inputs();
    await type(titleInput, 'a'.repeat(TITLE_MAX_LENGTH));
    component.submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].title).toHaveLength(TITLE_MAX_LENGTH);
  });

  it('should reject blank, non-positive, fractional, or oversized rewards', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [titleInput, rewardInput] = inputs();
    await type(titleInput, 'Pay internet bill');

    for (const invalidReward of ['', '0', '-10', '12.5', String(MAX_MONEY_AMOUNT + 1)]) {
      await type(rewardInput, invalidReward);
      const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
      component.submit();
    }

    expect(emitted).toBe(false);
  });

  it('should emit cancelForm when Cancel button is clicked', () => {
    let cancelled = false;
    component.cancelForm.subscribe(() => (cancelled = true));

    const cancelBtn = fixture.debugElement.query(By.css('button.cancel')).nativeElement as HTMLButtonElement;
    cancelBtn.click();

    expect(cancelled).toBe(true);
  });

  it('should disable Save task while saving input is true', async () => {
    let emitted = false;
    component.save.subscribe(() => (emitted = true));

    const [titleInput] = inputs();
    await type(titleInput, 'Pay internet bill');

    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();

    const saveBtn = fixture.debugElement.query(By.css('.actions .save')).nativeElement as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    component.submit();
    expect(emitted).toBe(false);
  });

  describe('editing a task', () => {
    const existingTask: DisciplineItem = {
      id: 'task-1',
      title: 'Pay internet bill',
      type: DisciplineItemType.ONEOFF,
      rewardValue: 150,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: 1000,
    };

    const openFor = async (edited: DisciplineItem): Promise<void> => {
      fixture = TestBed.createComponent(TaskForm);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('task', edited);
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('should pre-fill title and rewardValue and switch heading to "Edit one-off task"', async () => {
      await openFor(existingTask);

      const [titleInput, rewardInput] = inputs();
      expect(titleInput.value).toBe('Pay internet bill');
      expect(rewardInput.value).toBe('150');

      const heading = fixture.debugElement.query(By.css('mat-card-title')).nativeElement as HTMLElement;
      expect(heading.textContent.trim()).toBe('Edit one-off task');
    });

    it('should emit updated draft when saved and keep typed input when task input re-emits', async () => {
      await openFor(existingTask);
      const emitted: TaskDraft[] = [];
      component.save.subscribe((data) => emitted.push(data));

      const [titleInput, rewardInput] = inputs();
      await type(titleInput, '  File quarterly taxes  ');
      await type(rewardInput, '200');

      fixture.componentRef.setInput('task', { ...existingTask, rewardValue: 999 });
      fixture.detectChanges();
      expect(component.draft().title).toBe('  File quarterly taxes  ');

      component.submit();
      expect(emitted).toEqual([{ title: 'File quarterly taxes', rewardValue: 200 }]);
    });

    it('should show validation error immediately when editing a task with an invalid stored reward', async () => {
      await openFor({ ...existingTask, rewardValue: -50 });

      const errors = fixture.debugElement
        .queryAll(By.css('mat-error'))
        .map((el) => (el.nativeElement as HTMLElement).textContent.trim());
      expect(errors).toEqual(['Reward must be at least 1 ₴']);
      expect(component.canSubmit()).toBe(false);
    });

    it('should offer to delete the task in edit mode and emit delete output', async () => {
      await openFor(existingTask);
      let deleted = 0;
      component.delete.subscribe(() => deleted++);

      const deleteBtn = fixture.debugElement.query(By.css('.actions .delete')).nativeElement as HTMLButtonElement;
      deleteBtn.click();

      expect(deleted).toBe(1);
    });
  });

  it('should not offer to delete a task when creating a new one', () => {
    expect(fixture.debugElement.query(By.css('.actions .delete'))).toBeNull();
  });
});
