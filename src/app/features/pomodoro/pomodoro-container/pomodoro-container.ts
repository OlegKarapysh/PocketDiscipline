import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';

@Component({
  selector: 'app-pomodoro-container',
  imports: [PageHeader, SectionCard, TimerDisplay, TimerControls, SessionConfig],
  templateUrl: './pomodoro-container.html',
  styleUrl: './pomodoro-container.scss',
})
export class PomodoroContainer {}
