import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, throwError } from 'rxjs';
import { PomodoroRewardSettings } from './pomodoro-reward-settings';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import type { PomodoroRewardRates } from '../../models/pomodoro-reward-rates.type';
import { PomodoroRewardRateService } from '../../services/pomodoro-reward-rate.service';

describe('PomodoroRewardSettings', () => {
  let fixture: ComponentFixture<PomodoroRewardSettings>;
  let saveRatesMock: ReturnType<typeof vi.fn>;
  let snackBarMock: { show: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let rates$: BehaviorSubject<PomodoroRewardRates>;

  const inputs = () =>
    fixture.debugElement.queryAll(By.css('input')).map((input) => input.nativeElement as HTMLInputElement);
  const saveButton = () => fixture.debugElement.query(By.css('.save-button')).nativeElement as HTMLButtonElement;
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    saveRatesMock = vi.fn().mockResolvedValue(undefined);
    snackBarMock = { show: vi.fn(), error: vi.fn() };
    rates$ = new BehaviorSubject<PomodoroRewardRates>({ [EngagementType.WORK]: 100, [EngagementType.STUDY]: 125 });

    await TestBed.configureTestingModule({
      imports: [PomodoroRewardSettings],
      providers: [
        {
          provide: PomodoroRewardRateService,
          useValue: {
            rates$,
            saveRates: saveRatesMock,
          },
        },
        { provide: SnackBarService, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroRewardSettings);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should show the current work and study rates', () => {
    expect(inputs().map((input) => input.value)).toEqual(['100', '125']);
  });

  it('should save the edited rates', async () => {
    const [work, study] = inputs();
    type(work, '90');
    type(study, '150');

    saveButton().click();
    await fixture.whenStable();

    expect(saveRatesMock).toHaveBeenCalledWith({ [EngagementType.WORK]: 90, [EngagementType.STUDY]: 150 });
    expect(snackBarMock.show).toHaveBeenCalledWith('Pomodoro rewards saved.');
  });

  it.each(['0', '12.5', ''])('should not save a rate of "%s"', async (value) => {
    type(inputs()[0], value);

    expect(saveButton().disabled).toBe(true);
    saveButton().click();
    await fixture.whenStable();
    expect(saveRatesMock).not.toHaveBeenCalled();
  });

  it('should keep unsaved edits when the stored rates change', async () => {
    type(inputs()[0], '90');

    rates$.next({ [EngagementType.WORK]: 40, [EngagementType.STUDY]: 50 });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputs().map((input) => input.value)).toEqual(['90', '125']);
  });

  it('should show stored rates that change while nothing is being edited', async () => {
    rates$.next({ [EngagementType.WORK]: 40, [EngagementType.STUDY]: 50 });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputs().map((input) => input.value)).toEqual(['40', '50']);
  });

  it('should report a failed save', async () => {
    const failure = new Error('disk full');
    saveRatesMock.mockRejectedValue(failure);

    saveButton().click();
    await fixture.whenStable();

    expect(snackBarMock.error).toHaveBeenCalledWith(failure, 'Failed to save pomodoro rewards.');
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);
  });

  it('should notify via snackbar and fall back to default rates when rates stream errors', async () => {
    const err = new Error('IndexedDB stream failure');

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PomodoroRewardSettings],
      providers: [
        {
          provide: PomodoroRewardRateService,
          useValue: {
            rates$: throwError(() => err),
            saveRates: saveRatesMock,
          },
        },
        { provide: SnackBarService, useValue: snackBarMock },
      ],
    }).compileComponents();

    const failingFixture = TestBed.createComponent(PomodoroRewardSettings);
    failingFixture.detectChanges();
    await failingFixture.whenStable();

    expect(snackBarMock.error).toHaveBeenCalledWith(err, 'Failed to load pomodoro rewards');
    const failingInputs = failingFixture.debugElement
      .queryAll(By.css('input'))
      .map((input) => (input.nativeElement as HTMLInputElement).value);
    expect(failingInputs).toEqual(['100', '125']);
  });
});
