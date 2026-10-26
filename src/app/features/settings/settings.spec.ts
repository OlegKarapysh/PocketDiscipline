import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BehaviorSubject, EMPTY, NEVER, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Settings } from './settings';
import { By } from '@angular/platform-browser';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SnackBarService } from '../../shared/services/snack-bar.service';
import { DatabasePurgeService } from './services/database-purge.service';
import { PomodoroRewardRateService } from '../pomodoro/services/pomodoro-reward-rate.service';
import { UserService } from '../../core/services/user.service';
import type { User } from '../../core/models/user.model';
import { BalanceSetupDialog } from './components/balance-setup-dialog/balance-setup-dialog';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;
  let askMock: ReturnType<typeof vi.fn>;
  let purgeMock: ReturnType<typeof vi.fn>;
  let snackBarMock: { show: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let navigateSpy: ReturnType<typeof vi.spyOn>;
  let user$: BehaviorSubject<User>;
  let setUpBalanceMock: ReturnType<typeof vi.fn>;
  let openDialogMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    askMock = vi.fn();
    purgeMock = vi.fn().mockResolvedValue(undefined);
    snackBarMock = { show: vi.fn(), error: vi.fn() };
    user$ = new BehaviorSubject<User>({ id: 1, name: 'Current', balance: 1200, createdAt: 0, updatedAt: 0 });
    setUpBalanceMock = vi.fn().mockResolvedValue(undefined);
    openDialogMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        { provide: ConfirmService, useValue: { ask: askMock } },
        { provide: DatabasePurgeService, useValue: { purge: purgeMock } },
        { provide: SnackBarService, useValue: snackBarMock },
        { provide: PomodoroRewardRateService, useValue: { rates$: NEVER, saveRates: vi.fn() } },
        { provide: UserService, useValue: { user$, setUpBalance: setUpBalanceMock } },
        { provide: MatDialog, useValue: { open: openDialogMock } },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create settings component and render settings container', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.settings-container')).toBeTruthy();
  });

  it('should render a single page header titled Settings', () => {
    const headers = fixture.debugElement.queryAll(By.css('app-page-header'));
    expect(headers.length).toBe(1);
    expect((headers[0].nativeElement as HTMLElement).textContent).toContain('Settings');
  });

  it('should render link to manage categories', () => {
    const link = fixture.debugElement.query(By.css('.settings-link'));
    expect(link).toBeTruthy();
    const linkEl = link.nativeElement as HTMLElement;
    expect(linkEl.textContent).toContain('Manage reward categories');
  });

  it('should render link to import Telegram scores', () => {
    const link = fixture.debugElement.query(By.css('a[routerLink="/settings/telegram-import"]'));
    expect(link).toBeTruthy();
    expect((link.nativeElement as HTMLElement).textContent).toContain('Import Telegram scores');
  });

  it('should render pomodoro reward settings', () => {
    const rewardSettings = fixture.debugElement.query(By.css('app-pomodoro-reward-settings'));
    expect(rewardSettings).toBeTruthy();
  });

  describe('set up balance', () => {
    const setUpButton = () =>
      fixture.debugElement
        .queryAll(By.css('button.settings-link'))
        .find((button) => (button.nativeElement as HTMLElement).textContent.includes('Set up balance'));

    const setUpWith = async (amount: number | undefined) => {
      openDialogMock.mockReturnValue({ afterClosed: () => of(amount) });
      (setUpButton()?.nativeElement as HTMLButtonElement).click();
      await fixture.whenStable();
    };

    it('should offer the setup while the balance has not been set up', () => {
      expect(setUpButton()).toBeTruthy();
    });

    it('should hide the setup once the balance has been set up', async () => {
      user$.next({ ...user$.value, balanceSetUpAt: 1000 });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(setUpButton()).toBeUndefined();
    });

    it('should open the dialog with the current balance', async () => {
      askMock.mockReturnValue(NEVER);

      await setUpWith(5000);

      expect(openDialogMock).toHaveBeenCalledWith(BalanceSetupDialog, expect.objectContaining({ data: 1200 }));
    });

    it('should set up the entered balance once the user confirms', async () => {
      askMock.mockReturnValue(of(true));

      await setUpWith(5000);

      expect(askMock).toHaveBeenCalledTimes(1);
      expect(setUpBalanceMock).toHaveBeenCalledWith(5000);
      expect(snackBarMock.show).toHaveBeenCalledTimes(1);
    });

    it('should accept a balance of 0', async () => {
      askMock.mockReturnValue(of(true));

      await setUpWith(0);

      expect(setUpBalanceMock).toHaveBeenCalledWith(0);
    });

    it('should not ask or save when the dialog is cancelled', async () => {
      await setUpWith(undefined);

      expect(askMock).not.toHaveBeenCalled();
      expect(setUpBalanceMock).not.toHaveBeenCalled();
    });

    it('should not save when the user does not confirm', async () => {
      askMock.mockReturnValue(EMPTY);

      await setUpWith(5000);

      expect(setUpBalanceMock).not.toHaveBeenCalled();
      expect(snackBarMock.show).not.toHaveBeenCalled();
    });

    it('should report a failed setup', async () => {
      const failure = new Error('boom');
      askMock.mockReturnValue(of(true));
      setUpBalanceMock.mockRejectedValue(failure);

      await setUpWith(5000);

      expect(snackBarMock.error).toHaveBeenCalledWith(failure, expect.any(String));
      expect(snackBarMock.show).not.toHaveBeenCalled();
    });
  });

  describe('purge database', () => {
    const clickPurge = () => {
      const button = fixture.debugElement.query(By.css('button.destructive'));
      (button.nativeElement as HTMLButtonElement).click();
    };

    it('should ask for confirmation before purging', () => {
      askMock.mockReturnValue(NEVER);

      clickPurge();

      expect(askMock).toHaveBeenCalledWith(expect.objectContaining({ isDestructive: true }));
      expect(purgeMock).not.toHaveBeenCalled();
    });

    it('should not purge when the user cancels', () => {
      askMock.mockReturnValue(EMPTY);

      clickPurge();

      expect(purgeMock).not.toHaveBeenCalled();
      expect(snackBarMock.show).not.toHaveBeenCalled();
    });

    it('should purge, confirm with a snackbar and go home when the user agrees', async () => {
      askMock.mockReturnValue(of(true));

      clickPurge();
      await fixture.whenStable();

      expect(purgeMock).toHaveBeenCalledTimes(1);
      expect(snackBarMock.show).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(['/']);
    });

    it('should report a failed purge and stay on the page', async () => {
      const failure = new Error('boom');
      askMock.mockReturnValue(of(true));
      purgeMock.mockRejectedValue(failure);

      clickPurge();
      await fixture.whenStable();

      expect(snackBarMock.error).toHaveBeenCalledWith(failure, expect.any(String));
      expect(snackBarMock.show).not.toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
