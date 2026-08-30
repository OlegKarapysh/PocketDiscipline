import { Injectable, inject } from '@angular/core';
import { PomodoroSession } from '../models/pomodoro-session.model';
import { DbService } from '../../../core/services/db.service';

const ORDER_BY_FIELD = 'startTime';

@Injectable({
  providedIn: 'root'
})
export class PomodoroStorageService {
  private db = inject(DbService);

  async saveSession(session: PomodoroSession): Promise<void> {
    await this.db.pomodoroSessions.put(session);
  }

  async getSession(id: string): Promise<PomodoroSession | undefined> {
    return this.db.pomodoroSessions.get(id);
  }

  async getAllSessions(): Promise<PomodoroSession[]> {
    return this.db.pomodoroSessions.orderBy(ORDER_BY_FIELD).reverse().toArray();
  }

  async updateSession(id: string, changes: Partial<PomodoroSession>): Promise<void> {
    await this.db.pomodoroSessions.update(id, changes);
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.pomodoroSessions.delete(id);
  }
}

