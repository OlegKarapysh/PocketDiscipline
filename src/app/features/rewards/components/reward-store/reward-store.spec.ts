import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { RewardStore } from './reward-store';
import { RewardsService } from '../../services/rewards.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import type { RewardItem } from '../../../../core/models/reward.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import { RewardFormDialog } from '../reward-form-dialog/reward-form-dialog';
import { RewardCard } from '../reward-card/reward-card';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';

describe('RewardStore', () => {
  let component: RewardStore;
  let fixture: ComponentFixture<RewardStore>;

  let mockRewardsService: {
    getRewards: ReturnType<typeof vi.fn>;
    claimReward: ReturnType<typeof vi.fn>;
    deleteReward: ReturnType<typeof vi.fn>;
  };
  let mockCategoryService: { getCategories: ReturnType<typeof vi.fn> };
  let mockUserService: { user$: Observable<User | undefined> };
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  let mockCategories: RewardCategory[];
  let mockRewards: RewardItem[];

  beforeEach(async () => {
    mockCategories = [
      {
        id: 'cat-general',
        name: 'General',
        color: '#6b7280',
        icon: 'category',
        isDefault: true,
        isProtected: true,
        createdAt: 0,
      },
      {
        id: 'cat-tech',
        name: 'Gear & Tech',
        color: '#3b82f6',
        icon: 'devices',
        isDefault: true,
        isProtected: false,
        createdAt: 0,
      },
    ];

    mockRewards = [
      {
        id: 'rew-1',
        title: 'Mechanical Keyboard',
        cost: 2500,
        categoryId: 'cat-tech',
        type: 'one-time',
        status: 'active',
        claimCount: 0,
        claimedAt: null,
        createdAt: 1000,
      },
      {
        id: 'rew-2',
        title: 'Wireless Mouse',
        cost: 800,
        categoryId: 'cat-tech',
        type: 'one-time',
        status: 'claimed',
        claimedAt: 2000,
        claimCount: 1,
        createdAt: 500,
      },
    ];

    mockRewardsService = {
      getRewards: vi.fn().mockReturnValue(of(mockRewards)),
      claimReward: vi.fn().mockResolvedValue({ id: 'w-1', amount: 2500, title: 'Claimed: Mechanical Keyboard' }),
      deleteReward: vi.fn().mockResolvedValue(undefined),
    };
    mockCategoryService = { getCategories: vi.fn().mockReturnValue(of(mockCategories)) };
    mockUserService = {
      user$: of({ id: 1, name: 'Current', balance: 3000, createdAt: 0, updatedAt: 0 }),
    };
    mockDialog = { open: vi.fn() };
    mockSnackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RewardStore],
      providers: [
        { provide: RewardsService, useValue: mockRewardsService },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: UserService, useValue: mockUserService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RewardStore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render active rewards by default', () => {
    expect(component).toBeTruthy();
    expect(component.statusFilter()).toBe('active');
    expect(component.filteredRewards()).toHaveLength(1);
    expect(component.filteredRewards()[0].title).toBe('Mechanical Keyboard');
  });

  it('should filter rewards by category', () => {
    component.filters.update((f) => ({ ...f, categoryId: 'cat-general' }));
    fixture.detectChanges();
    expect(component.filteredRewards()).toHaveLength(0);

    component.filters.update((f) => ({ ...f, categoryId: 'cat-tech' }));
    fixture.detectChanges();
    expect(component.filteredRewards()).toHaveLength(1);
  });

  it('should show reward counts in the status filter and switch status from the DOM', () => {
    const toggles = fixture.debugElement.queryAll(By.css('.status-toggle button'));
    expect(toggles).toHaveLength(2);
    expect((toggles[0].nativeElement as HTMLElement).textContent).toContain('(1)');
    expect((toggles[1].nativeElement as HTMLElement).textContent).toContain('(1)');

    (toggles[1].nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.statusFilter()).toBe('claimed');
    expect(component.filteredRewards()[0].title).toBe('Wireless Mouse');
  });

  it('should pass each reward its own category', () => {
    const card = fixture.debugElement.query(By.directive(RewardCard)).componentInstance as RewardCard;
    expect(card.category()?.id).toBe('cat-tech');
  });

  it('should filter rewards when toggling status to claimed', () => {
    component.statusFilter.set('claimed');
    fixture.detectChanges();

    expect(component.filteredRewards()).toHaveLength(1);
    expect(component.filteredRewards()[0].title).toBe('Wireless Mouse');
  });

  it('should filter rewards by search query when typing into search input in DOM', () => {
    const searchInput = fixture.debugElement.query(By.css('.search-field input')).nativeElement as HTMLInputElement;

    searchInput.value = 'Nonexistent';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.filteredRewards()).toHaveLength(0);

    searchInput.value = 'Keyboard';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.filteredRewards()).toHaveLength(1);
  });

  it('should open Add Reward dialog when clicking Add Reward button in toolbar', () => {
    const addBtn = fixture.debugElement.query(By.css('.add-reward-btn')).nativeElement as HTMLButtonElement;
    addBtn.click();

    expect(mockDialog.open).toHaveBeenCalledWith(RewardFormDialog, {
      width: '460px',
    });
  });

  it('should open Add Reward dialog when clicking Create First Reward button in empty state', () => {
    component.filters.update((f) => ({ ...f, query: 'EmptyMatch' }));
    fixture.detectChanges();

    const emptyBtn = fixture.debugElement.query(By.css('.empty-state button')).nativeElement as HTMLButtonElement;
    emptyBtn.click();

    expect(mockDialog.open).toHaveBeenCalledWith(RewardFormDialog, {
      width: '460px',
    });
  });

  it('should handle claim output from child card component', async () => {
    const cardDebugEl = fixture.debugElement.query(By.directive(RewardCard));
    const cardComponent = cardDebugEl.componentInstance as RewardCard;

    cardComponent.claim.emit(mockRewards[0]);
    await fixture.whenStable();

    expect(mockRewardsService.claimReward).toHaveBeenCalledWith(mockRewards[0]);
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      `Redeemed "Mechanical Keyboard" for ${MONEY_FORMAT.format(2500)} ₴`,
      'Close',
      { duration: 3000 },
    );
  });

  it('should claim once when the claim button is tapped twice before the first claim settles', async () => {
    await Promise.all([component.onClaimReward(mockRewards[0]), component.onClaimReward(mockRewards[0])]);

    expect(mockRewardsService.claimReward).toHaveBeenCalledTimes(1);
  });

  it('should disable the claim button of the reward being claimed until the claim settles', async () => {
    let settleClaim: () => void = () => undefined;
    mockRewardsService.claimReward.mockReturnValueOnce(
      new Promise((resolve) => {
        settleClaim = () => {
          resolve({ id: 'w-1', amount: 2500, title: 'Claimed: Mechanical Keyboard' });
        };
      }),
    );
    const claimButton = () => fixture.debugElement.query(By.css('.claim-btn')).nativeElement as HTMLButtonElement;

    const claim = component.onClaimReward(mockRewards[0]);
    fixture.detectChanges();
    expect(claimButton().disabled).toBe(true);

    settleClaim();
    await claim;
    fixture.detectChanges();
    expect(claimButton().disabled).toBe(false);
  });

  it('should display error snackbar when claiming reward fails', async () => {
    mockRewardsService.claimReward.mockRejectedValueOnce(new Error('Claim failed due to network error'));

    await component.onClaimReward(mockRewards[0]);

    expect(mockSnackBar.open).toHaveBeenCalledWith('Claim failed due to network error', 'Close', { duration: 3000 });
  });

  it('should handle edit output from child card component', () => {
    const cardDebugEl = fixture.debugElement.query(By.directive(RewardCard));
    const cardComponent = cardDebugEl.componentInstance as RewardCard;

    cardComponent.edit.emit(mockRewards[0]);

    expect(mockDialog.open).toHaveBeenCalledWith(RewardFormDialog, {
      width: '460px',
      data: { reward: mockRewards[0] },
    });
  });

  it('should handle delete output from child card component', async () => {
    const cardDebugEl = fixture.debugElement.query(By.directive(RewardCard));
    const cardComponent = cardDebugEl.componentInstance as RewardCard;

    cardComponent.delete.emit(mockRewards[0]);
    await fixture.whenStable();

    expect(mockRewardsService.deleteReward).toHaveBeenCalledWith('rew-1');
    expect(mockSnackBar.open).toHaveBeenCalledWith(expect.stringContaining('Deleted "Mechanical Keyboard"'), 'Close', {
      duration: 3000,
    });
  });

  it('should display empty state when no rewards match', () => {
    component.filters.update((f) => ({ ...f, query: 'Unknown Query' }));
    fixture.detectChanges();

    const emptyEl = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyEl).toBeTruthy();
    expect((emptyEl.nativeElement as HTMLElement).textContent).toContain('No rewards found');
  });

  it('should report a failed reward query instead of breaking the view', async () => {
    mockRewardsService.getRewards.mockReturnValue(throwError(() => new Error('Database connection lost')));
    fixture = TestBed.createComponent(RewardStore);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.rewards()).toEqual([]);
    expect(mockSnackBar.open).toHaveBeenCalledWith('Database connection lost', 'Close', expect.any(Object));
  });
});
