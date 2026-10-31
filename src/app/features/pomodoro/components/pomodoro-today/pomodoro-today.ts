import { Component, input } from '@angular/core';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import type { PomodoroTally } from '../../models/pomodoro-tally.model';
import { PomodoroStats } from '../pomodoro-stats/pomodoro-stats';

@Component({
  selector: 'app-pomodoro-today',
  imports: [SectionCard, PomodoroStats],
  templateUrl: './pomodoro-today.html',
  styleUrl: './pomodoro-today.scss',
})
export class PomodoroToday {
  readonly tally = input.required<PomodoroTally | undefined>();
}
