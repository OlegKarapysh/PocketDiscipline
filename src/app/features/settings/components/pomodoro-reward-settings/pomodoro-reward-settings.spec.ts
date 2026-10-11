import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { PomodoroRewardSettings } from './pomodoro-reward-settings';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { PomodoroRewardRateService } from '../../../pomodoro/services/pomodoro-reward-rate.service';

describe('PomodoroRewardSettings', () => {
  let fixture: ComponentFixture<PomodoroRewardSettings>;
  let saveRatesMock: ReturnType<typeof vi.fn>;
  let snackBarMock: { show: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

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

    await TestBed.configureTestingModule({
      imports: [PomodoroRewardSettings],
      providers: [
        {
          provide: PomodoroRewardRateService,
          useValue: {
            rates$: of({ [EngagementType.WORK]: 100, [EngagementType.STUDY]: 125 }),
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

  it('should report a failed save', async () => {
    const failure = new Error('disk full');
    saveRatesMock.mockRejectedValue(failure);

    saveButton().click();
    await fixture.whenStable();

    expect(snackBarMock.error).toHaveBeenCalledWith(failure, 'Failed to save pomodoro rewards.');
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);
  });
});
