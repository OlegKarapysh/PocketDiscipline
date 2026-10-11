import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

import { TaskList } from '../../components/task-list/task-list';
import { DailyTaskList } from '../../../daily-tasks/components/daily-task-list/daily-task-list';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { NEW_ITEM_QUERY_PARAM } from '../../../../shared/constants/new-item-query-param.const';

const DAILY_TAB = 0;

@Component({
  selector: 'app-tasks-page',
  imports: [MatTabsModule, MatIconModule, PageHeader, TaskList, DailyTaskList],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
})
export class TasksPage {
  readonly selectedTab = signal(DAILY_TAB);

  constructor() {
    // "New task" opens the daily task form, which lives on the Daily tab. The list reads and drops
    // the param itself once the tab shows it.
    inject(ActivatedRoute)
      .queryParamMap.pipe(
        filter((params) => params.has(NEW_ITEM_QUERY_PARAM)),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.selectedTab.set(DAILY_TAB);
      });
  }
}
