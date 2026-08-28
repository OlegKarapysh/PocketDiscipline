import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DailyTaskFormComponent } from './daily-task-form.component';
import { DailyTaskDifficulty } from '../../models/daily-task.model';

const TEST_TASK_TITLE = 'Read 30 mins';
const INITIAL_DIFFICULTIES_COUNT = 3;
const SINGLE_DIFFICULTY_COUNT = 1;

describe('DailyTaskFormComponent', () => {
  let component: DailyTaskFormComponent;
  let fixture: ComponentFixture<DailyTaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyTaskFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with default 3 difficulties', () => {
    expect(component.difficulties.length).toBe(INITIAL_DIFFICULTIES_COUNT);
    expect(component.difficulties[0].name).toBe('Easy');
    expect(component.difficulties[1].name).toBe('Medium');
    expect(component.difficulties[2].name).toBe('Hard');
  });

  it('should add a new difficulty when addDifficulty is called', () => {
    component.addDifficulty();
    expect(component.difficulties.length).toBe(INITIAL_DIFFICULTIES_COUNT + 1);
  });

  it('should remove a difficulty at specified index', () => {
    component.removeDifficulty(1);
    expect(component.difficulties.length).toBe(INITIAL_DIFFICULTIES_COUNT - 1);
    expect(component.difficulties.some((d) => d.name === 'Medium')).toBe(false);
  });

  it('should not remove difficulty when only 1 difficulty remains', () => {
    component.difficulties = [{ id: '1', name: 'Only', baseReward: 100 }];
    component.removeDifficulty(0);
    expect(component.difficulties.length).toBe(SINGLE_DIFFICULTY_COUNT);
  });

  it('should emit taskCreated and reset title upon submitting valid form', () => {
    let emittedTitle = '';
    let emittedDifficulties: DailyTaskDifficulty[] = [];

    component.taskCreated.subscribe((data: { title: string; difficulties: DailyTaskDifficulty[] }) => {
      emittedTitle = data.title;
      emittedDifficulties = data.difficulties;
    });

    component.title = TEST_TASK_TITLE;
    component.submit();

    expect(emittedTitle).toBe(TEST_TASK_TITLE);
    expect(emittedDifficulties.length).toBe(INITIAL_DIFFICULTIES_COUNT);
    expect(component.title).toBe('');
  });

  it('should not emit taskCreated when title is empty or blank', () => {
    let emitted = false;
    component.taskCreated.subscribe(() => {
      emitted = true;
    });

    component.title = '   ';
    component.submit();

    expect(emitted).toBe(false);
  });
});
