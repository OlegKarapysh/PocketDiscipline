import { Component } from '@angular/core';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';

import { SessionConfig } from '../components/session-config/session-config';

@Component({
  selector: 'app-pomodoro-container',
  standalone: true,
  imports: [TimerDisplay, TimerControls, SessionConfig],
  template: `
    <div class="container">
      <app-timer-display></app-timer-display>
      <app-timer-controls></app-timer-controls>
      <app-session-config></app-session-config>
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
  `]
})
export class PomodoroContainer {}
