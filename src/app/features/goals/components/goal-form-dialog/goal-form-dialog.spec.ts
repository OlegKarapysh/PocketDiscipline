import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoalFormDialog } from './goal-form-dialog';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('GoalFormDialog', () => {
  let component: GoalFormDialog;
  let fixture: ComponentFixture<GoalFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalFormDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GoalFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
