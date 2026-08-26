import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DailyTaskItemComponent } from './daily-task-item.component';

describe('DailyTaskItemComponent', () => {
  let component: DailyTaskItemComponent;
  let fixture: ComponentFixture<DailyTaskItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyTaskItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DailyTaskItemComponent);
    component = fixture.componentInstance;
    // mock required input
    fixture.componentRef.setInput('task', {
      id: '1', title: 'Test', createdAt: Date.now(), streak: 0, lastCompletedAt: null, difficulties: []
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
