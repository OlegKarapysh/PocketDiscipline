import { Service, inject } from '@angular/core';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { UserService } from '../../../core/services/user.service';
import { DbService } from '../../../database/db.service';

@Service()
export class PomodoroStorageService {
  private db = inject(DbService);
  private userService = inject(UserService);

  async saveSession(session: PomodoroSession, canMutate: () => boolean = () => true): Promise<void> {
    await this.db.transaction('rw', this.db.pomodoroSessions, async () => {
      if (canMutate()) await this.db.pomodoroSessions.put(session);
    });
  }

  async getSession(id: string): Promise<PomodoroSession | undefined> {
    return await this.db.pomodoroSessions.get(id);
  }

  async getAllSessions(): Promise<PomodoroSession[]> {
    return await this.db.pomodoroSessions.orderBy('startTime').reverse().toArray();
  }

  async completeSession(id: string, rewardEarned: number, canMutate: () => boolean = () => true): Promise<boolean> {
    return await this.db.transaction('rw', this.db.pomodoroSessions, this.db.users, async () => {
      if (!canMutate()) return false;
      const session = await this.db.pomodoroSessions.get(id);
      if (!canMutate() || session?.status !== PomodoroSessionStatus.ACTIVE) return false;

      await this.db.pomodoroSessions.update(id, {
        status: PomodoroSessionStatus.COMPLETED,
        endTime: Date.now(),
        rewardEarned,
      });
      await this.userService.addBalance(rewardEarned);
      return true;
    });
  }

  async cancelSession(id: string, canMutate: () => boolean = () => true): Promise<void> {
    await this.db.transaction('rw', this.db.pomodoroSessions, async () => {
      if (!canMutate()) return;
      const session = await this.db.pomodoroSessions.get(id);
      if (!canMutate() || session?.status !== PomodoroSessionStatus.ACTIVE) return;

      await this.db.pomodoroSessions.update(id, {
        status: PomodoroSessionStatus.CANCELLED,
        endTime: Date.now(),
      });
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.pomodoroSessions.delete(id);
  }
}
