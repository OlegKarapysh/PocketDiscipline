import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GoalsPage } from './goals-page';
import { GoalService } from '../../services/goal.service';
import type { Goal} from '../../models/goal.model';
import { GOAL_STATUS } from '../../models/goal.model';

const TEST_GOAL_ID = 'g-1';
const TEST_GOAL_TITLE = 'do 50 push-ups on fists';
const TEST_REWARD_VALUE = 2000;

describe('GoalsPage', () => {
  let component: GoalsPage;
  let fixture: ComponentFixture<GoalsPage>;
  let goalServiceMock: {
    getActiveGoals: ReturnType<typeof vi.fn>;
    getCompletedGoals: ReturnType<typeof vi.fn>;
    completeGoal: ReturnType<typeof vi.fn>;
    undoCompleteGoal: ReturnType<typeof vi.fn>;
    deleteGoal: ReturnType<typeof vi.fn>;
    addGoal: ReturnType<typeof vi.fn>;
    updateGoal: ReturnType<typeof vi.fn>;
  };
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };

  const mockGoal: Goal = {
    id: TEST_GOAL_ID,
    title: TEST_GOAL_TITLE,
    rewardValue: TEST_REWARD_VALUE,
    status: GOAL_STATUS.ACTIVE,
    completedAt: null,
    createdAt: Date.now(),
  };

  beforeEach(async () => {
    goalServiceMock = {
      getActiveGoals: vi.fn().mockReturnValue(of([mockGoal])),
      getCompletedGoals: vi.fn().mockReturnValue(of([])),
      completeGoal: vi.fn().mockResolvedValue(undefined),
      undoCompleteGoal: vi.fn().mockResolvedValue(undefined),
      deleteGoal: vi.fn().mockResolvedValue(undefined),
      addGoal: vi.fn().mockResolvedValue(undefined),
      updateGoal: vi.fn().mockResolvedValue(undefined),
    };

    dialogMock = {
      open: vi.fn(),
    };

    snackBarMock = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GoalsPage],
      providers: [
        { provide: GoalService, useValue: goalServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    })
      .overrideComponent(GoalsPage, {
        set: {
          providers: [
            { provide: GoalService, useValue: goalServiceMock },
            { provide: MatDialog, useValue: dialogMock },
            { provide: MatSnackBar, useValue: snackBarMock },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GoalsPage);
    component = fixture.componentInstance;
  });

  it('should complete goal and display success snackbar', async () => {
    await component.completeGoal(TEST_GOAL_ID);

    expect(goalServiceMock.completeGoal).toHaveBeenCalledWith(TEST_GOAL_ID);
    expect(snackBarMock.open).toHaveBeenCalledWith('Goal completed!', 'Close', expect.any(Object));
  });

  it('should undo completed goal and display snackbar', async () => {
    await component.undoCompleteGoal(TEST_GOAL_ID);

    expect(goalServiceMock.undoCompleteGoal).toHaveBeenCalledWith(TEST_GOAL_ID);
    expect(snackBarMock.open).toHaveBeenCalledWith('Completion undone', 'Close', expect.any(Object));
  });

  it('should delete goal and display snackbar', async () => {
    await component.deleteGoal(TEST_GOAL_ID);

    expect(goalServiceMock.deleteGoal).toHaveBeenCalledWith(TEST_GOAL_ID);
    expect(snackBarMock.open).toHaveBeenCalledWith('Goal deleted', 'Close', expect.any(Object));
  });

  it('should open add dialog and save new goal on submit', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: TEST_GOAL_TITLE, rewardValue: TEST_REWARD_VALUE }),
    });

    component.openAddDialog();
    await Promise.resolve();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(goalServiceMock.addGoal).toHaveBeenCalledWith(TEST_GOAL_TITLE, TEST_REWARD_VALUE);
    expect(snackBarMock.open).toHaveBeenCalledWith('Goal added', 'Close', expect.any(Object));
  });

  it('should open edit dialog and update goal on submit', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: 'New Title', rewardValue: 3000 }),
    });

    component.openEditDialog(mockGoal);
    await Promise.resolve();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(goalServiceMock.updateGoal).toHaveBeenCalledWith(mockGoal.id, 'New Title', 3000);
    expect(snackBarMock.open).toHaveBeenCalledWith('Goal updated', 'Close', expect.any(Object));
  });

  it('should show error snackbar when addGoal fails with duplicate title error', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: TEST_GOAL_TITLE, rewardValue: TEST_REWARD_VALUE }),
    });
    goalServiceMock.addGoal.mockRejectedValue(new Error('A goal with this title already exists.'));

    component.openAddDialog();

    await Promise.resolve();
    expect(snackBarMock.open).toHaveBeenCalledWith('A goal with this title already exists.', 'Close', expect.any(Object));
  });

  it('should show unknown error snackbar when addGoal fails with non-Error', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: TEST_GOAL_TITLE, rewardValue: TEST_REWARD_VALUE }),
    });
    goalServiceMock.addGoal.mockRejectedValue('something went wrong');

    component.openAddDialog();

    await Promise.resolve();
    expect(snackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', expect.any(Object));
  });

  it('should not add goal when add dialog is cancelled', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of(undefined),
    });

    component.openAddDialog();
    await Promise.resolve();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(goalServiceMock.addGoal).not.toHaveBeenCalled();
    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('should show error snackbar when updateGoal fails', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: 'New Title', rewardValue: 3000 }),
    });
    goalServiceMock.updateGoal.mockRejectedValue(new Error('Failed to update'));

    component.openEditDialog(mockGoal);

    await Promise.resolve();
    expect(snackBarMock.open).toHaveBeenCalledWith('Failed to update', 'Close', expect.any(Object));
  });

  it('should not update goal when edit dialog is cancelled', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of(undefined),
    });

    component.openEditDialog(mockGoal);
    await Promise.resolve();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(goalServiceMock.updateGoal).not.toHaveBeenCalled();
    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('should show error snackbar when completeGoal fails with Error', async () => {
    goalServiceMock.completeGoal.mockRejectedValue(new Error('Complete failed'));

    await component.completeGoal(TEST_GOAL_ID);

    expect(snackBarMock.open).toHaveBeenCalledWith('Complete failed', 'Close', expect.any(Object));
  });

  it('should show unknown error snackbar when completeGoal fails with non-Error', async () => {
    goalServiceMock.completeGoal.mockRejectedValue('network error');

    await component.completeGoal(TEST_GOAL_ID);

    expect(snackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', expect.any(Object));
  });

  it('should show error snackbar when undoCompleteGoal fails with Error', async () => {
    goalServiceMock.undoCompleteGoal.mockRejectedValue(new Error('Undo failed'));

    await component.undoCompleteGoal(TEST_GOAL_ID);

    expect(snackBarMock.open).toHaveBeenCalledWith('Undo failed', 'Close', expect.any(Object));
  });

  it('should show unknown error snackbar when undoCompleteGoal fails with non-Error', async () => {
    goalServiceMock.undoCompleteGoal.mockRejectedValue('network error');

    await component.undoCompleteGoal(TEST_GOAL_ID);

    expect(snackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', expect.any(Object));
  });

  it('should show error snackbar when deleteGoal fails with Error', async () => {
    goalServiceMock.deleteGoal.mockRejectedValue(new Error('Delete failed'));

    await component.deleteGoal(TEST_GOAL_ID);

    expect(snackBarMock.open).toHaveBeenCalledWith('Delete failed', 'Close', expect.any(Object));
  });

  it('should show unknown error snackbar when deleteGoal fails with non-Error', async () => {
    goalServiceMock.deleteGoal.mockRejectedValue('network error');

    await component.deleteGoal(TEST_GOAL_ID);

    expect(snackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', expect.any(Object));
  });

  it('should show error snackbar when openAddDialog dialog stream throws error', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => throwError(() => new Error('Dialog crashed')),
    });

    component.openAddDialog();
    await Promise.resolve();

    expect(snackBarMock.open).toHaveBeenCalledWith('Dialog crashed', 'Close', expect.any(Object));
  });

  it('should show error snackbar when openEditDialog dialog stream throws error', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => throwError(() => new Error('Dialog crashed')),
    });

    component.openEditDialog(mockGoal);
    await Promise.resolve();

    expect(snackBarMock.open).toHaveBeenCalledWith('Dialog crashed', 'Close', expect.any(Object));
  });
});
