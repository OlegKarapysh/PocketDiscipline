import Dexie, { Table } from 'dexie';
import { PomodoroSession } from '../models/pomodoro-session.model';

const DATABASE_NAME = 'PomodoroDatabase';
const SESSIONS_SCHEMA = 'id, startTime, status';

export class PomodoroDatabase extends Dexie {
  sessions!: Table<PomodoroSession, string>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      sessions: SESSIONS_SCHEMA
    });
  }
}
