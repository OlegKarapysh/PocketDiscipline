import { Service, inject } from '@angular/core';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { UserService } from '../../../core/services/user.service';
import { DbService } from '../../../database/db.service';

@Service()
export class PomodoroStorageService {
  private db = inject(DbService);
  private userService = inject(UserService);

  async saveSession(session: PomodoroSession): Promise<void> {
    try {
      await this.db.pomodoroSessions.put(session);
    } catch (error) {
      console.error('Failed to save pomodoro session:', error);
      throw error;
    }
  }

  async getSession(id: string): Promise<PomodoroSession | undefined> {
    try {
      return await this.db.pomodoroSessions.get(id);
    } catch (error) {
      console.error('Failed to get pomodoro session:', error);
      throw error;
    }
  }

  async getAllSessions(): Promise<PomodoroSession[]> {
    try {
      return await this.db.pomodoroSessions.orderBy('startTime').reverse().toArray();
    } catch (error) {
      console.error('Failed to get all pomodoro sessions:', error);
      throw error;
    }
  }

  async completeSession(id: string, rewardEarned: number): Promise<boolean> {
    try {
      return await this.db.transaction('rw', this.db.pomodoroSessions, this.db.users, async () => {
        const session = await this.db.pomodoroSessions.get(id);
        if (session?.status !== PomodoroSessionStatus.ACTIVE) return false;

        await this.db.pomodoroSessions.update(id, {
          status: PomodoroSessionStatus.COMPLETED,
          endTime: Date.now(),
          rewardEarned,
        });
        await this.userService.addBalance(rewardEarned);
        return true;
      });
    } catch (error) {
      console.error('Failed to complete pomodoro session:', error);
      throw error;
    }
  }

  async cancelSession(id: string): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.pomodoroSessions, async () => {
        const session = await this.db.pomodoroSessions.get(id);
        if (session?.status !== PomodoroSessionStatus.ACTIVE) return;

        await this.db.pomodoroSessions.update(id, {
          status: PomodoroSessionStatus.CANCELLED,
          endTime: Date.now(),
        });
      });
    } catch (error) {
      console.error('Failed to cancel pomodoro session:', error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await this.db.pomodoroSessions.delete(id);
    } catch (error) {
      console.error('Failed to delete pomodoro session:', error);
      throw error;
    }
  }
}
