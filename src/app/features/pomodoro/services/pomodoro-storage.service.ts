import { Injectable } from '@angular/core';
import { PomodoroSession } from '../models/pomodoro-session.model';
import { PomodoroDatabase } from './pomodoro-database';

const ORDER_BY_FIELD = 'startTime';

@Injectable({
  providedIn: 'root'
})
export class PomodoroStorageService {
  private db: PomodoroDatabase;

  constructor() {
    this.db = new PomodoroDatabase();
  }

  async saveSession(session: PomodoroSession): Promise<void> {
    await this.db.sessions.put(session);
  }

  async getSession(id: string): Promise<PomodoroSession | undefined> {
    return this.db.sessions.get(id);
  }

  async getAllSessions(): Promise<PomodoroSession[]> {
    return this.db.sessions.orderBy(ORDER_BY_FIELD).reverse().toArray();
  }

  async updateSession(id: string, changes: Partial<PomodoroSession>): Promise<void> {
    await this.db.sessions.update(id, changes);
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.sessions.delete(id);
  }
}
