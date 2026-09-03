import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { DailyTaskFormComponent } from './daily-task-form.component';
import { DailyTaskDifficulty } from '../../models/daily-task-difficulty.model';

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
    expect(component.difficulties.length).toBe(3);
    expect(component.difficulties[0].name).toBe('Easy');
    expect(component.difficulties[1].name).toBe('Medium');
    expect(component.difficulties[2].name).toBe('Hard');
  });

  it('should add a new difficulty when addDifficulty is called', () => {
    component.addDifficulty();
    expect(component.difficulties.length).toBe(4);
  });

  it('should remove a difficulty at specified index', () => {
    component.removeDifficulty(1);
    expect(component.difficulties.length).toBe(2);
    expect(component.difficulties.some((d) => d.name === 'Medium')).toBe(false);
  });

  it('should not remove difficulty when only 1 difficulty remains', () => {
    component.difficulties = [{ id: '1', name: 'Only', baseReward: 100 }];
    component.removeDifficulty(0);
    expect(component.difficulties.length).toBe(1);
  });

  it('should emit taskCreated and reset title upon submitting valid form', () => {
    let emittedTitle = '';
    let emittedDifficulties: DailyTaskDifficulty[] = [];

    component.taskCreated.subscribe((data: { title: string; difficulties: DailyTaskDifficulty[] }) => {
      emittedTitle = data.title;
      emittedDifficulties = data.difficulties;
    });

    component.title = 'Read 30 mins';
    component.submit();

    expect(emittedTitle).toBe('Read 30 mins');
    expect(emittedDifficulties.length).toBe(3);
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

  it('should emit cancelForm when Cancel button is clicked in template', async () => {
    let cancelled = false;
    component.cancelForm.subscribe(() => {
      cancelled = true;
    });

    const cancelBtn = fixture.debugElement.query(By.css('button[mat-button]'));
    expect(cancelBtn.nativeElement.textContent.trim()).toBe('Cancel');

    cancelBtn.nativeElement.click();

    expect(cancelled).toBe(true);
  });

  it('should submit form when Save Task button is clicked with valid title', async () => {
    let emittedData: { title: string; difficulties: DailyTaskDifficulty[] } | null = null;
    component.taskCreated.subscribe((data) => {
      emittedData = data;
    });

    component.title = 'Evening Reading';
    fixture.detectChanges();
    await fixture.whenStable();

    const saveBtn = fixture.debugElement.query(By.css('.actions button[color="primary"]'));
    expect(saveBtn.nativeElement.disabled).toBe(false);

    saveBtn.nativeElement.click();

    expect(emittedData).toEqual(
      expect.objectContaining({
        title: 'Evening Reading',
        difficulties: expect.any(Array),
      })
    );
  });
});
