import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GoalFormDialog } from './goal-form-dialog';
import { GoalFormDialogData } from '../../models/goal-form-dialog-data.model';
import { Goal, GOAL_STATUS } from '../../models/goal.model';

const TEST_TITLE = 'Run a Marathon';
const TEST_REWARD = 5000;
const INVALID_SHORT_TITLE = 'ab';
const INVALID_ZERO_REWARD = 0;

describe('GoalFormDialog', () => {
  let component: GoalFormDialog;
  let fixture: ComponentFixture<GoalFormDialog>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let mockData: GoalFormDialogData;

  const setupTestBed = async (data: GoalFormDialogData = {}) => {
    TestBed.resetTestingModule();
    mockData = data;
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GoalFormDialog],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setupTestBed({});
  });

  it('should initialize with empty fields and invalid form for new goal', () => {
    expect(component.form.valid).toBe(false);
    expect(component.form.get('title')?.value).toBe('');
    expect(component.form.get('rewardValue')?.value).toBeNull();
  });

  it('should initialize with prefilled fields when editing an existing goal', async () => {
    const existingGoal: Goal = {
      id: 'g-1',
      title: TEST_TITLE,
      rewardValue: TEST_REWARD,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now(),
    };

    await setupTestBed({ goal: existingGoal });

    expect(component.form.valid).toBe(true);
    expect(component.form.get('title')?.value).toBe(TEST_TITLE);
    expect(component.form.get('rewardValue')?.value).toBe(TEST_REWARD);
  });

  it('should invalidate title if shorter than 3 chars or empty', () => {
    const titleControl = component.form.get('title');
    titleControl?.setValue(INVALID_SHORT_TITLE);
    expect(titleControl?.valid).toBe(false);
    expect(titleControl?.errors?.['minlength']).toBeDefined();
  });

  it('should invalidate rewardValue if less than 1', () => {
    const rewardControl = component.form.get('rewardValue');
    rewardControl?.setValue(INVALID_ZERO_REWARD);
    expect(rewardControl?.valid).toBe(false);
    expect(rewardControl?.errors?.['min']).toBeDefined();
  });

  it('should close dialog with form values when valid form is submitted', () => {
    component.form.setValue({
      title: TEST_TITLE,
      rewardValue: TEST_REWARD,
    });

    component.onSubmit();

    expect(dialogRefMock.close).toHaveBeenCalledWith({
      title: TEST_TITLE,
      rewardValue: TEST_REWARD,
    });
  });

  it('should not close dialog if form is invalid upon submission', () => {
    component.onSubmit();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
