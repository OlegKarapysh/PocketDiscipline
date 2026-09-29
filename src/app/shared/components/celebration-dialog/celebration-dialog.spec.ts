import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, it, expect, vi } from 'vitest';
import { CelebrationDialog } from './celebration-dialog';
import type { CelebrationDialogData } from './celebration-dialog-data.model';
import { Amount } from '../amount/amount';

describe('CelebrationDialog', () => {
  let fixture: ComponentFixture<CelebrationDialog>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };

  const setup = async (data: CelebrationDialogData) => {
    TestBed.resetTestingModule();
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CelebrationDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CelebrationDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  const buttons = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

  it('should render the title, subtitle and a signed reward amount', async () => {
    const host = await setup({ title: 'Goal complete', subtitle: 'do 100 squats', amount: 1500 });

    expect(host.querySelector('.title')?.textContent).toBe('Goal complete');
    expect(host.querySelector('.subtitle')?.textContent).toBe('do 100 squats');
    const amount = fixture.debugElement.query(By.directive(Amount)).componentInstance as Amount;
    expect(amount.value()).toBe(1500);
    expect(amount.showSign()).toBe(true);
  });

  it('should omit the subtitle and amount when not given', async () => {
    const host = await setup({ title: 'Streak milestone' });

    expect(host.querySelector('.subtitle')).toBeNull();
    expect(fixture.debugElement.query(By.directive(Amount))).toBeNull();
  });

  it('should offer only the confirm button, labelled Nice, unless undo is allowed', async () => {
    await setup({ title: 'Goal complete' });

    expect(buttons().map((button) => button.textContent.trim())).toEqual(['Nice']);
  });

  it('should close with dismissed when the confirm button is clicked', async () => {
    await setup({ title: 'Goal complete', confirmText: 'Great' });

    const confirm = buttons().find((button) => button.textContent.includes('Great'));
    confirm?.click();

    expect(dialogRefMock.close).toHaveBeenCalledWith('dismissed');
  });

  it('should close with undo when Undo is clicked', async () => {
    await setup({ title: 'Goal complete', canUndo: true });

    const undo = buttons().find((button) => button.textContent.includes('Undo'));
    undo?.click();

    expect(dialogRefMock.close).toHaveBeenCalledWith('undo');
  });
});
