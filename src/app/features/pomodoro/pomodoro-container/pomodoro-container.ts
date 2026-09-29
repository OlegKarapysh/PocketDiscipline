import { Component } from '@angular/core';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';

@Component({
  selector: 'app-pomodoro-container',
  imports: [PageHeader, TimerDisplay, TimerControls, SessionConfig],
  templateUrl: './pomodoro-container.html',
  styleUrl: './pomodoro-container.scss',
})
export class PomodoroContainer {}
