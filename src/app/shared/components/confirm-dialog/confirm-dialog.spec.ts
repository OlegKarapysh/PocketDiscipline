import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmDialogComponent } from './confirm-dialog';
import { ConfirmDialogData } from './confirm-dialog-data.model';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  const setupComponent = async (data: ConfirmDialogData) => {
    TestBed.resetTestingModule();
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setupComponent({
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
      confirmText: 'Yes, Delete',
      cancelText: 'No, Keep',
      isDestructive: true,
    });
  });

  it('should render dialog title and message', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Confirm Action');
    expect(compiled.querySelector('mat-dialog-content')?.textContent).toContain('Are you sure you want to proceed?');
  });

  it('should display custom button labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    expect(buttons[0].textContent).toContain('No, Keep');
    expect(buttons[1].textContent).toContain('Yes, Delete');
  });

  it('should close dialog with false when clicking the cancel button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    buttons[0].click();

    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close dialog with true when clicking the confirm button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    buttons[1].click();

    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should fall back to default "Cancel" and "Confirm" labels when labels are omitted', async () => {
    await setupComponent({
      title: 'Delete Item',
      message: 'Remove permanently?',
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    expect(buttons[0].textContent?.trim()).toBe('Cancel');
    expect(buttons[1].textContent?.trim()).toBe('Confirm');
  });

  it('should apply "mat-warn" class when isDestructive is true', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const confirmButton = compiled.querySelectorAll('button')[1];
    expect(confirmButton.classList.contains('mat-warn')).toBe(true);
  });

  it('should apply "mat-primary" class when isDestructive is false', async () => {
    await setupComponent({
      title: 'Save Changes',
      message: 'Save your profile changes?',
      isDestructive: false,
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const confirmButton = compiled.querySelectorAll('button')[1];
    expect(confirmButton.classList.contains('mat-primary')).toBe(true);
  });
});
