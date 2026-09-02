import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CompletionDialog, CompletionDialogData } from './completion-dialog';

const TEST_REWARD_POINTS = 50;
const TEST_ENGAGEMENT_TYPE = 'study';

describe('CompletionDialog', () => {
  let fixture: ComponentFixture<CompletionDialog>;
  let mockData: CompletionDialogData;

  beforeEach(async () => {
    mockData = {
      reward: TEST_REWARD_POINTS,
      engagementType: TEST_ENGAGEMENT_TYPE,
    };

    await TestBed.configureTestingModule({
      imports: [CompletionDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompletionDialog);
  });

  it('should render dialog with engagement type and reward points', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Pomodoro Completed!');
    expect(textContent).toContain('study');
    expect(textContent).toContain('50');

    const rewardEl = fixture.debugElement.query(By.css('.reward strong'));
    expect(rewardEl.nativeElement.textContent.trim()).toBe('50');
  });

  it('should render an action button to dismiss the dialog', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const button = fixture.debugElement.query(By.css('button[mat-dialog-close]'));
    expect(button).toBeTruthy();
    expect(button.nativeElement.textContent.trim()).toBe('Awesome');
  });
});
