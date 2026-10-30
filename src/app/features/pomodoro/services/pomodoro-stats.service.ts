import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { liveQuery } from 'dexie';
import { DbService } from '../../../database/db.service';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { datesInRange } from '../../../shared/charts/chart-periods';
import type { PomodoroPeriodSummary } from '../models/pomodoro-period-summary.model';
import type { PomodoroTally } from '../models/pomodoro-tally.model';

const ENGAGEMENT_TYPES = Object.values(EngagementType);

@Service()
export class PomodoroStatsService {
  private readonly db = inject(DbService);

  getPeriodSummary(startDate: string, endDate: string): Observable<PomodoroPeriodSummary> {
    return from(liveQuery(async () => this.summarise(startDate, endDate, await this.completedSessions()))).pipe(
      catchError((error: unknown) => {
        console.error('PomodoroStatsService.getPeriodSummary stream error:', error);
        return of(this.summarise(startDate, endDate, []));
      }),
    );
  }

  // Read through the status index rather than by startTime: a session whose time ran out while the app
  // was closed is completed on the next launch, so the day it counts on can be days after it started.
  private completedSessions(): Promise<PomodoroSession[]> {
    return this.db.pomodoroSessions.where('status').equals(PomodoroSessionStatus.COMPLETED).toArray();
  }

  // A completed session counts on the local day of its endTime, or of its startTime when it has none,
  // the day DashboardEarningsService credits its reward on. Sessions on other days are left out.
  private summarise(startDate: string, endDate: string, sessions: readonly PomodoroSession[]): PomodoroPeriodSummary {
    const sessionsByDate = new Map<string, PomodoroSession[]>();
    for (const session of sessions) {
      const date = new Date(session.endTime ?? session.startTime).toLocaleDateString(DATE_LOCALE_CA);
      const onDate = sessionsByDate.get(date);
      if (onDate) {
        onDate.push(session);
      } else {
        sessionsByDate.set(date, [session]);
      }
    }

    const days = datesInRange(startDate, endDate).map((date) => ({
      date,
      ...this.sum((sessionsByDate.get(date) ?? []).map((session) => this.tallyOf(session))),
    }));
    return { startDate, endDate, days, total: this.sum(days) };
  }

  private tallyOf(session: PomodoroSession): PomodoroTally {
    return {
      pomodoros: 1,
      byType: { ...this.zeroByType(), [session.engagementType]: 1 },
      focusMinutes: session.durationMinutes,
      rewardEarned: session.rewardEarned ?? 0,
    };
  }

  private sum(tallies: readonly PomodoroTally[]): PomodoroTally {
    const byType = this.zeroByType();
    let pomodoros = 0;
    let focusMinutes = 0;
    let rewardEarned = 0;
    for (const tally of tallies) {
      pomodoros += tally.pomodoros;
      focusMinutes += tally.focusMinutes;
      rewardEarned += tally.rewardEarned;
      for (const type of ENGAGEMENT_TYPES) {
        byType[type] += tally.byType[type];
      }
    }
    return { pomodoros, byType, focusMinutes, rewardEarned };
  }

  private zeroByType(): Record<EngagementType, number> {
    return { [EngagementType.WORK]: 0, [EngagementType.STUDY]: 0 };
  }
}
