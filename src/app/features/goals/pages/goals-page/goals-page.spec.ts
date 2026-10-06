import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY, of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { GoalsPage } from './goals-page';
import { GoalService } from '../../services/goal.service';
import { CelebrationService } from '../../../../shared/services/celebration.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import type { Goal } from '../../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../../core/models/goal.model';

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
  let celebrationMock: { show: ReturnType<typeof vi.fn> };
  let confirmMock: { ask: ReturnType<typeof vi.fn> };

  const mockGoal: Goal = {
    id: 'g-1',
    title: 'do 50 push-ups on fists',
    rewardValue: 2000,
    status: GOAL_STATUS.ACTIVE,
    completedAt: null,
    createdAt: Date.now(),
  };

  beforeEach(async () => {
    goalServiceMock = {
      getActiveGoals: vi.fn().mockReturnValue(of([mockGoal])),
      getCompletedGoals: vi.fn().mockReturnValue(of([])),
      completeGoal: vi.fn().mockResolvedValue(true),
      undoCompleteGoal: vi.fn().mockResolvedValue(true),
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

    celebrationMock = {
      show: vi.fn().mockReturnValue(of('dismissed')),
    };
    confirmMock = { ask: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [GoalsPage],
      providers: [
        { provide: GoalService, useValue: goalServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: CelebrationService, useValue: celebrationMock },
        { provide: ConfirmService, useValue: confirmMock },
      ],
    })
      .overrideComponent(GoalsPage, {
        set: {
          providers: [
            { provide: GoalService, useValue: goalServiceMock },
            { provide: MatDialog, useValue: dialogMock },
            { provide: MatSnackBar, useValue: snackBarMock },
            { provide: CelebrationService, useValue: celebrationMock },
            { provide: ConfirmService, useValue: confirmMock },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GoalsPage);
    component = fixture.componentInstance;
  });

  it('should render a single Goals page header whose action opens the add dialog', async () => {
    dialogMock.open.mockReturnValue({ afterClosed: () => of(undefined) });
    fixture.detectChanges();
    await fixture.whenStable();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('app-page-header');
    expect(headers.length).toBe(1);
    expect(headers[0].querySelector('h1')?.textContent.trim()).toBe('Goals');

    headers[0].querySelector<HTMLButtonElement>('button')!.click();
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('should complete goal and celebrate it with its title and reward', async () => {
    fixture.detectChanges();

    await component.completeGoal('g-1');

    expect(goalServiceMock.completeGoal).toHaveBeenCalledWith('g-1');
    expect(celebrationMock.show).toHaveBeenCalledWith(
      expect.objectContaining({ subtitle: mockGoal.title, amount: mockGoal.rewardValue, canUndo: true }),
    );
    expect(goalServiceMock.undoCompleteGoal).not.toHaveBeenCalled();
  });

  it('should not celebrate when the goal was no longer active', async () => {
    goalServiceMock.completeGoal.mockResolvedValue(false);
    fixture.detectChanges();

    await component.completeGoal('g-1');

    expect(celebrationMock.show).not.toHaveBeenCalled();
  });

  it('should undo the completion when the celebration is closed with undo', async () => {
    celebrationMock.show.mockReturnValue(of('undo'));
    fixture.detectChanges();

    await component.completeGoal('g-1');

    expect(goalServiceMock.undoCompleteGoal).toHaveBeenCalledWith('g-1');
  });

  it('should undo completed goal and display snackbar', async () => {
    await component.undoCompleteGoal('g-1');

    expect(goalServiceMock.undoCompleteGoal).toHaveBeenCalledWith('g-1');
    expect(snackBarMock.open).toHaveBeenCalledWith('Completion undone', 'Close', expect.any(Object));
  });

  it('should not report an undo when the goal was no longer completed', async () => {
    goalServiceMock.undoCompleteGoal.mockResolvedValue(false);

    await component.undoCompleteGoal('g-1');

    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('should report a failed goal query instead of breaking the view', async () => {
    goalServiceMock.getActiveGoals.mockReturnValue(throwError(() => new Error('Database connection lost')));
    fixture = TestBed.createComponent(GoalsPage);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.activeGoals()).toEqual([]);
    expect(snackBarMock.open).toHaveBeenCalledWith('Database connection lost', 'Close', expect.any(Object));
  });

  it('should ask before deleting a goal, naming it, as a destructive action', async () => {
    confirmMock.ask.mockReturnValue(EMPTY);

    await clickDelete();

    expect(confirmMock.ask).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('"do 50 push-ups on fists"') as unknown,
        isDestructive: true,
      }),
    );
    expect(goalServiceMock.deleteGoal).not.toHaveBeenCalled();
  });

  it('should delete goal once confirmed and display snackbar', async () => {
    await clickDelete();

    expect(goalServiceMock.deleteGoal).toHaveBeenCalledWith('g-1');
    expect(snackBarMock.open).toHaveBeenCalledWith('Goal deleted', 'Close', expect.any(Object));
  });

  it('should open add dialog and save new goal on submit', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: 'do 50 push-ups on fists', rewardValue: 2000 }),
    });

    component.openAddDialog();
    await Promise.resolve();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(goalServiceMock.addGoal).toHaveBeenCalledWith('do 50 push-ups on fists', 2000);
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
      afterClosed: () => of({ title: 'do 50 push-ups on fists', rewardValue: 2000 }),
    });
    goalServiceMock.addGoal.mockRejectedValue(new Error('A goal with this title already exists.'));

    component.openAddDialog();

    await Promise.resolve();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'A goal with this title already exists.',
      'Close',
      expect.any(Object),
    );
  });

  it('should show unknown error snackbar when addGoal fails with non-Error', async () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => of({ title: 'do 50 push-ups on fists', rewardValue: 2000 }),
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

    await component.completeGoal('g-1');

    expect(snackBarMock.open).toHaveBeenCalledWith('Complete failed', 'Close', expect.any(Object));
    expect(celebrationMock.show).not.toHaveBeenCalled();
  });

  it('should show unknown error snackbar when completeGoal fails with non-Error', async () => {
    goalServiceMock.completeGoal.mockRejectedValue('network error');

    await component.completeGoal('g-1');

    expect(snackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', expect.any(Object));
  });

  it('should show error snackbar when undoCompleteGoal fails with Error', async () => {
    goalServiceMock.undoCompleteGoal.mockRejectedValue(new Error('Undo failed'));

    await component.undoCompleteGoal('g-1');

    expect(snackBarMock.open).toHaveBeenCalledWith('Undo failed', 'Close', expect.any(Object));
  });

  it('should show unknown error snackbar when undoCompleteGoal fails with non-Error', async () => {
    goalServiceMock.undoCompleteGoal.mockRejectedValue('network error');

    await component.undoCompleteGoal('g-1');

    expect(snackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', expect.any(Object));
  });

  it('should show error snackbar when deleteGoal fails with Error', async () => {
    goalServiceMock.deleteGoal.mockRejectedValue(new Error('Delete failed'));

    await clickDelete();

    expect(snackBarMock.open).toHaveBeenCalledWith('Delete failed', 'Close', expect.any(Object));
  });

  it('should show unknown error snackbar when deleteGoal fails with non-Error', async () => {
    goalServiceMock.deleteGoal.mockRejectedValue('network error');

    await clickDelete();

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

  // Presses the active goal's Delete button, as the user does.
  async function clickDelete(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.debugElement.query(By.css('button[aria-label="Delete"]')).nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();
  }
});
