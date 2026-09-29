import type { OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DailyTasksService } from '../../services/daily-tasks.service';
import { DailyTaskItem } from '../daily-task-item/daily-task-item';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import { DailyTaskForm } from '../daily-task-form/daily-task-form';
import { NEW_ITEM_QUERY_PARAM } from '../../../../shared/constants/new-item-query-param.const';

@Component({
  imports: [MatButtonModule, MatIconModule, DailyTaskItem, DailyTaskForm, AsyncPipe],
  selector: 'app-daily-task-list',
  styleUrl: './daily-task-list.scss',
  templateUrl: './daily-task-list.html',
})
export class DailyTaskList implements OnInit {
  private dailyTasksService = inject(DailyTasksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tasks$ = this.dailyTasksService.tasks$;
  readonly showForm = signal(false);

  constructor() {
    // The shell's "New task" quick action links here with ?new. Dropping the param afterwards keeps a
    // reload from reopening the form and makes the next tap a real navigation again.
    this.route.queryParamMap
      .pipe(
        filter(params => params.has(NEW_ITEM_QUERY_PARAM)),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.showForm.set(true);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [NEW_ITEM_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }

  ngOnInit(): void {
    void this.dailyTasksService.resetBrokenStreaks().catch((e: unknown) => {
      console.error(e);
    });
  }

  openForm() {
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  async onCompleteTask(task: DailyTask, difficulty: DailyTaskDifficulty): Promise<void> {
    try {
      await this.dailyTasksService.completeTask(task, difficulty);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async onTaskCreated(event: { title: string; difficulties: DailyTaskDifficulty[] }): Promise<void> {
    this.showForm.set(false);
    try {
      await this.dailyTasksService.createTask(event.title, event.difficulties);
    } catch (e: unknown) {
      console.error(e);
    }
  }
}
