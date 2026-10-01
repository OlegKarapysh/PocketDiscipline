import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { EMPTY, NEVER, of } from 'rxjs';
import { Settings } from './settings';
import { By } from '@angular/platform-browser';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SnackBarService } from '../../shared/services/snack-bar.service';
import { DatabasePurgeService } from './services/database-purge.service';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;
  let askMock: ReturnType<typeof vi.fn>;
  let purgeMock: ReturnType<typeof vi.fn>;
  let snackBarMock: { show: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    askMock = vi.fn();
    purgeMock = vi.fn().mockResolvedValue(undefined);
    snackBarMock = { show: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        { provide: ConfirmService, useValue: { ask: askMock } },
        { provide: DatabasePurgeService, useValue: { purge: purgeMock } },
        { provide: SnackBarService, useValue: snackBarMock },
      ],
    }).compileComponents();

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

    it('should purge and confirm with a snackbar when the user agrees', async () => {
      askMock.mockReturnValue(of(true));

      clickPurge();
      await fixture.whenStable();

      expect(purgeMock).toHaveBeenCalledTimes(1);
      expect(snackBarMock.show).toHaveBeenCalledTimes(1);
    });

    it('should report a failed purge', async () => {
      const failure = new Error('boom');
      askMock.mockReturnValue(of(true));
      purgeMock.mockRejectedValue(failure);

      clickPurge();
      await fixture.whenStable();

      expect(snackBarMock.error).toHaveBeenCalledWith(failure, expect.any(String));
      expect(snackBarMock.show).not.toHaveBeenCalled();
    });
  });
});
