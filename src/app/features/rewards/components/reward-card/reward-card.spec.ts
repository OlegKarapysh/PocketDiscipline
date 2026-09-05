import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { RewardCardComponent } from './reward-card';
import { RewardItem } from '../../models/reward.model';
import { RewardCategory } from '../../models/reward-category.model';

describe('RewardCardComponent', () => {
  let component: RewardCardComponent;
  let fixture: ComponentFixture<RewardCardComponent>;
  let mockReward: RewardItem;
  let mockCategory: RewardCategory;

  beforeEach(async () => {
    mockReward = {
      id: 'rew-1',
      title: 'Noise-Cancelling Headphones',
      cost: 1200,
      categoryId: 'cat-tech',
      type: 'one-time',
      status: 'active',
      claimCount: 0,
      claimedAt: null,
      createdAt: 1000,
    };

    mockCategory = {
      id: 'cat-tech',
      name: 'Gear & Tech',
      color: '#3b82f6',
      icon: 'devices',
      isDefault: true,
      isProtected: false,
      createdAt: 0,
    };

    await TestBed.configureTestingModule({
      imports: [RewardCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RewardCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('reward', mockReward);
    fixture.componentRef.setInput('category', mockCategory);
    fixture.componentRef.setInput('currentBalance', 600);
    fixture.detectChanges();
  });

  it('should create and render reward details and category info', () => {
    expect(component).toBeTruthy();
    const titleEl = fixture.debugElement.query(By.css('.card-title'));
    expect(titleEl.nativeElement.textContent.trim()).toBe('Noise-Cancelling Headphones');

    const subtitleEl = fixture.debugElement.query(By.css('.card-subtitle'));
    expect(subtitleEl.nativeElement.textContent.trim()).toBe('Gear & Tech');
  });

  it('should calculate 50% progress and display disabled "Need X ₴ more" button when unaffordable', () => {
    expect(component.progressPercentage()).toBe(50);
    expect(component.isAffordable()).toBe(false);
    expect(component.remainingNeeded()).toBe(600);

    const progressEl = fixture.debugElement.query(By.css('.progress-text .percentage'));
    expect(progressEl.nativeElement.textContent.trim()).toBe('50%');

    const needMoreBtn = fixture.debugElement.query(By.css('.need-more-btn'));
    expect(needMoreBtn).toBeTruthy();
    expect(needMoreBtn.nativeElement.disabled).toBe(true);
    expect(needMoreBtn.nativeElement.textContent).toContain('Need 600 ₴ more');
  });

  it('should enable claim button and cap progress at 100% when affordable', () => {
    fixture.componentRef.setInput('currentBalance', 1500);
    fixture.detectChanges();

    expect(component.progressPercentage()).toBe(100);
    expect(component.isAffordable()).toBe(true);
    expect(component.remainingNeeded()).toBe(0);

    const claimBtn = fixture.debugElement.query(By.css('.claim-btn'));
    expect(claimBtn).toBeTruthy();
    expect(claimBtn.nativeElement.disabled).toBe(false);
  });

  it('should emit claim event when clicking Claim Reward button in the DOM', () => {
    fixture.componentRef.setInput('currentBalance', 1200);
    fixture.detectChanges();

    const claimSpy = vi.fn();
    component.claim.subscribe(claimSpy);

    const claimBtn = fixture.debugElement.query(By.css('.claim-btn'));
    claimBtn.nativeElement.click();

    expect(claimSpy).toHaveBeenCalledWith(mockReward);
  });

  it('should render claimed state when reward is claimed', () => {
    const claimedReward: RewardItem = {
      ...mockReward,
      status: 'claimed',
      claimedAt: 1700000000000,
    };
    fixture.componentRef.setInput('reward', claimedReward);
    fixture.detectChanges();

    const claimedTag = fixture.debugElement.query(By.css('.claimed-tag'));
    expect(claimedTag).toBeTruthy();

    const claimedBtn = fixture.debugElement.query(By.css('.claimed-btn'));
    expect(claimedBtn).toBeTruthy();
    expect(claimedBtn.nativeElement.disabled).toBe(true);
  });

  it('should render count tag for repeatable reward with claimCount > 0', () => {
    const repeatableReward: RewardItem = {
      ...mockReward,
      id: 'rew-repeatable',
      title: 'Espresso',
      cost: 40,
      type: 'repeatable',
      claimCount: 3,
    };
    fixture.componentRef.setInput('reward', repeatableReward);
    fixture.detectChanges();

    const countTag = fixture.debugElement.query(By.css('.count-tag'));
    expect(countTag).toBeTruthy();
    expect(countTag.nativeElement.textContent).toContain('Claimed 3x');
  });

  it('should fall back gracefully when category is undefined', () => {
    fixture.componentRef.setInput('category', undefined);
    fixture.detectChanges();

    const subtitleEl = fixture.debugElement.query(By.css('.card-subtitle'));
    expect(subtitleEl.nativeElement.textContent.trim()).toBe('General');
  });

  it('should emit edit and delete outputs when menu actions are clicked in the DOM', async () => {
    const editSpy = vi.fn();
    const deleteSpy = vi.fn();
    component.edit.subscribe(editSpy);
    component.delete.subscribe(deleteSpy);

    const menuTriggerBtn = fixture.debugElement.query(By.css('button[aria-label="Reward options"]'));
    menuTriggerBtn.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const menuItems = document.querySelectorAll('.mat-mdc-menu-item');
    expect(menuItems.length).toBe(2);

    (menuItems[0] as HTMLElement).click();
    expect(editSpy).toHaveBeenCalledWith(mockReward);

    menuTriggerBtn.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const updatedMenuItems = document.querySelectorAll('.mat-mdc-menu-item');
    (updatedMenuItems[1] as HTMLElement).click();
    expect(deleteSpy).toHaveBeenCalledWith(mockReward);
  });
});
