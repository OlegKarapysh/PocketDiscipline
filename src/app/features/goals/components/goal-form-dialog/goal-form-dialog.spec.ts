import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GoalFormDialog } from './goal-form-dialog';
import type { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import type { Goal } from '../../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../../core/models/goal.model';

describe('GoalFormDialog', () => {
  let component: GoalFormDialog;
  let fixture: ComponentFixture<GoalFormDialog>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };

  const setup = async (data: GoalFormDialogData = {}) => {
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GoalFormDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const saveButton = (): HTMLButtonElement =>
    fixture.debugElement.query(By.css('.save')).nativeElement as HTMLButtonElement;

  it('should start empty and invalid for a new goal', async () => {
    await setup();

    expect(component.model()).toEqual({ title: '', rewardValue: null });
    expect(component.goalForm().valid()).toBe(false);
    expect(saveButton().disabled).toBe(true);
  });

  it('should prefill and be valid when editing an existing goal', async () => {
    const existingGoal: Goal = {
      id: 'g-1',
      title: 'Run a Marathon',
      rewardValue: 5000,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now(),
    };

    await setup({ goal: existingGoal });

    expect(component.model()).toEqual({ title: 'Run a Marathon', rewardValue: 5000 });
    expect(component.goalForm().valid()).toBe(true);
  });

  it('should reject a title shorter than 3 characters', async () => {
    await setup();
    component.goalForm.title().value.set('ab');

    expect(component.goalForm.title().invalid()).toBe(true);
    expect(
      component.goalForm
        .title()
        .errors()
        .map((e) => e.kind),
    ).toContain('minLength');
  });

  it('should reject a reward below 1', async () => {
    await setup();
    component.goalForm.rewardValue().value.set(0);

    expect(component.goalForm.rewardValue().invalid()).toBe(true);
    expect(
      component.goalForm
        .rewardValue()
        .errors()
        .map((e) => e.kind),
    ).toContain('min');
  });

  it('should show the error message once a touched field is invalid', async () => {
    await setup();
    component.goalForm.title().value.set('ab');
    component.goalForm.title().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    const error = fixture.debugElement.query(By.css('mat-error'));
    expect((error.nativeElement as HTMLElement).textContent).toContain('at least 3 characters');
  });

  it('should close with the entered values when Save is clicked on a valid form', async () => {
    await setup();
    component.model.set({ title: 'Run a Marathon', rewardValue: 5000 });
    fixture.detectChanges();
    await fixture.whenStable();

    saveButton().click();

    expect(dialogRefMock.close).toHaveBeenCalledWith({ title: 'Run a Marathon', rewardValue: 5000 });
  });

  it('should not close when submitted while invalid', async () => {
    await setup();
    component.onSubmit();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
