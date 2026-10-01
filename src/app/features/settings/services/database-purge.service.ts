import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from '../../../database/db.service';
import { PomodoroTimerService } from '../../pomodoro/services/pomodoro-timer.service';

@Service()
export class DatabasePurgeService {
  private db = inject(DbService);
  private pomodoroTimer = inject(PomodoroTimerService);
  private router = inject(Router);

  // Live queries re-emit on their own once the tables change; the timer is the one piece of
  // in-memory state that would otherwise keep running against a session that no longer exists.
  async purge(): Promise<void> {
    await this.pomodoroTimer.stopTimer();
    await this.db.purgeDatabase();
    await this.router.navigate(['/']);
  }
}
