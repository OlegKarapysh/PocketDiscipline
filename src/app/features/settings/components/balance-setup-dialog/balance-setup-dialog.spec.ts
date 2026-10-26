import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BalanceSetupDialog } from './balance-setup-dialog';

describe('BalanceSetupDialog', () => {
  let component: BalanceSetupDialog;
  let fixture: ComponentFixture<BalanceSetupDialog>;
  let closeMock: ReturnType<typeof vi.fn>;

  const createWith = async (balance: number) => {
    closeMock = vi.fn();
    await TestBed.configureTestingModule({
      imports: [BalanceSetupDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: closeMock } },
        { provide: MAT_DIALOG_DATA, useValue: balance },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceSetupDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const enter = (amount: number | null) => {
    component.model.set({ amount });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await createWith(1200);
  });

  it('should start from the current balance', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input?.valueAsNumber).toBe(1200);
  });

  it('should close with the entered balance', () => {
    enter(5000);

    component.submit();

    expect(closeMock).toHaveBeenCalledWith(5000);
  });

  it('should close with a balance of 0', () => {
    enter(0);

    component.submit();

    expect(closeMock).toHaveBeenCalledWith(0);
  });

  it('should not close with an invalid balance', () => {
    for (const amount of [null, -1, 12.5, 10_000_001]) {
      enter(amount);

      component.submit();
    }

    expect(closeMock).not.toHaveBeenCalled();
  });

  it('should close without a balance on cancel', () => {
    component.cancel();

    expect(closeMock).toHaveBeenCalledWith();
  });
});
