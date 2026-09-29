import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomNav } from './bottom-nav';
import { Badge } from '../badge/badge';
import type { NavItem } from '../../models/nav-item.model';

const TASKS: NavItem = { path: '/tasks', label: 'Tasks', icon: 'checklist' };
const SETTINGS: NavItem = { path: '/settings', label: 'Settings', icon: 'settings' };

describe('BottomNav', () => {
  let fixture: ComponentFixture<BottomNav>;

  const host = () => fixture.nativeElement as HTMLElement;
  const moreButton = () => host().querySelector('button.tab');

  const navigate = async (url: string) => {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
      // Any standalone component without required inputs will do as the routed page.
      providers: [provideRouter([TASKS, SETTINGS].map((item) => ({ path: item.path.slice(1), component: Badge })))],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('items', [TASKS]);
    fixture.componentRef.setInput('moreItems', [SETTINGS]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render a tab per item and a More button', () => {
    expect(host().querySelectorAll('a.tab')).toHaveLength(1);
    expect(moreButton()?.textContent).toContain('More');
  });

  it('should omit More when there is nothing behind it', async () => {
    fixture.componentRef.setInput('moreItems', []);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(moreButton()).toBeNull();
  });

  it('should mark More as active on a page behind it', async () => {
    await navigate('/settings');

    expect(moreButton()?.classList.contains('active')).toBe(true);
  });

  it('should not mark More as active on a tab page', async () => {
    await navigate('/tasks');

    expect(moreButton()?.classList.contains('active')).toBe(false);
    expect(host().querySelector('a.tab')?.getAttribute('aria-current')).toBe('page');
  });
});
