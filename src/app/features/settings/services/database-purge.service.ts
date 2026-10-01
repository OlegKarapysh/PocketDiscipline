import { Service, inject } from '@angular/core';
import { DbService } from '../../../database/db.service';
import { PomodoroTimerService } from '../../pomodoro/services/pomodoro-timer.service';

@Service()
export class DatabasePurgeService {
  private db = inject(DbService);
  private pomodoroTimer = inject(PomodoroTimerService);

  // Live queries re-emit on their own once the tables change; the timer is the one piece of
  // in-memory state that would otherwise keep running against a session that no longer exists.
  // It is stopped only after the purge, so a failed purge leaves a running session alone.
  async purge(): Promise<void> {
    await this.db.purgeDatabase();
    await this.pomodoroTimer.stopTimer();
  }
}
