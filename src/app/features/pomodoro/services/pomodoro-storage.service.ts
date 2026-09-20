import { Service, inject } from '@angular/core';
import type { PomodoroSession } from '../models/pomodoro-session.model';
import { DbService } from '../../../core/services/db.service';

const ORDER_BY_FIELD = 'startTime';

@Service()
export class PomodoroStorageService {
  private db = inject(DbService);

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
      return await this.db.pomodoroSessions.orderBy(ORDER_BY_FIELD).reverse().toArray();
    } catch (error) {
      console.error('Failed to get all pomodoro sessions:', error);
      throw error;
    }
  }

  async updateSession(id: string, changes: Partial<PomodoroSession>): Promise<void> {
    try {
      await this.db.pomodoroSessions.update(id, changes);
    } catch (error) {
      console.error('Failed to update pomodoro session:', error);
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

