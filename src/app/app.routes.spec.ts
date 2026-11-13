import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { DataImportPage } from './features/backup/pages/data-import-page/data-import-page';
import { DailyScoresPage } from './features/daily-scores/pages/daily-scores-page';
import { TelegramImportPage } from './features/daily-scores/pages/telegram-import-page/telegram-import-page';
import { Dashboard } from './features/dashboard/dashboard';
import { GoalsPage } from './features/goals/pages/goals-page/goals-page';
import { JarImportPage } from './features/jar-import/pages/jar-import-page/jar-import-page';
import { PomodoroContainer } from './features/pomodoro/pomodoro-container/pomodoro-container';
import { CategoryManagement } from './features/rewards/components/category-management/category-management';
import { RewardsHub } from './features/rewards/pages/rewards-hub/rewards-hub';
import { Settings } from './features/settings/settings';
import { TasksPage } from './features/tasks/pages/tasks-page/tasks-page';

const PAGES: [url: string, page: Type<unknown>][] = [
  ['/dashboard', Dashboard],
  ['/tasks', TasksPage],
  ['/goals', GoalsPage],
  ['/pomodoro', PomodoroContainer],
  ['/daily-scores', DailyScoresPage],
  ['/rewards', RewardsHub],
  ['/rewards/categories', CategoryManagement],
  ['/settings', Settings],
  ['/settings/data-import', DataImportPage],
  ['/settings/jar-import', JarImportPage],
  ['/settings/telegram-import', TelegramImportPage],
];

describe('App routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('should open the dashboard from the root URL', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(Dashboard);
  });

  it.each(PAGES)('should show the page at %s', async (url, page) => {
    const harness = await RouterTestingHarness.create(url);

    expect(TestBed.inject(Router).url).toBe(url);
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(page);
  });
});
