import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  CATEGORY_NAME_MAX_LENGTH,
  DIFFICULTY_NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../src/app/shared/constants/text-length.const';

declare const process: {
  env: {
    LAYOUT_AUDIT_SCREENSHOTS?: string;
  };
};

// The layout audit: every screen, at every supported width, filled with the worst content the forms
// allow, must keep all of its text inside its box and must not scroll sideways.
// docs/design_system.md, "Responsive layout", is the rulebook this enforces.
//
// The audit measures; it cannot judge how a screen looks. To look, run it with
// LAYOUT_AUDIT_SCREENSHOTS=1 and open test-results/layout-audit/<width>/<screen>.png.
const SCREENSHOT_DIR = join(__dirname, '../../test-results/layout-audit');

// The floor, a typical phone, each breakpoint in _tokens.scss, and a wide desktop.
// 840 matters most: the side rail appears there and takes 240px, so the content is narrower than at 600.
const WIDTHS = [360, 390, 600, 840, 1024, 1280, 1920];
const RAIL_FROM = 840;

// Month end, so "per day" averages have the most digits they will ever have.
const NOW = new Date('2026-01-31T12:00:00');

const OVERLAY = '.cdk-overlay-container';

interface Screen {
  name: string;
  path: string;
  // Rendered only once the screen's data has loaded, so the audit never measures an empty shell.
  ready: string;
  // Brings the screen into the state to measure. Runs after navigation.
  open?: (page: Page) => Promise<void>;
  // What to measure; the whole page unless the screen is an overlay on top of one.
  root?: string;
}

// Add a screen here whenever you add a route, a tab, a dialog or any other state with its own layout.
const SCREENS: Screen[] = [
  { name: 'dashboard', path: '/dashboard', ready: 'app-stat-card' },
  {
    name: 'dashboard: quick spend dialog',
    path: '/dashboard',
    ready: 'app-stat-card',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Quick spend' }).first().click();
      await page.locator('app-quick-spend-dialog mat-select').click();
      await page.getByRole('option').filter({ hasText: 'WWWW' }).click();
    },
  },
  { name: 'tasks', path: '/tasks', ready: 'app-daily-task-item' },
  {
    name: 'tasks: new daily task form',
    path: '/tasks',
    ready: 'app-daily-task-item',
    open: async (page) => {
      await page.getByRole('button', { name: 'Add daily task' }).click();
      await page.getByPlaceholder('e.g. Morning Workout').fill('W'.repeat(TITLE_MAX_LENGTH));
      await page.getByRole('button', { name: 'Add difficulty' }).click();
    },
  },
  { name: 'goals', path: '/goals', ready: 'app-goal-item' },
  {
    name: 'goals: edit dialog',
    path: '/goals',
    ready: 'app-goal-item',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Edit' }).first().click();
      await expect(page.locator('app-goal-form-dialog')).toBeVisible();
    },
  },
  {
    name: 'goals: goal complete dialog',
    path: '/goals',
    ready: 'app-goal-item',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Complete' }).first().click();
      await expect(page.locator('app-celebration-dialog')).toBeVisible();
    },
  },
  { name: 'rewards: store', path: '/rewards', ready: 'app-reward-card' },
  {
    name: 'rewards: category filter open',
    path: '/rewards',
    ready: 'app-reward-card',
    root: OVERLAY,
    open: async (page) => {
      await page.locator('app-reward-store .category-field mat-select').click();
      await expect(page.getByRole('option').first()).toBeVisible();
    },
  },
  {
    name: 'rewards: reward dialog and its snackbar',
    path: '/rewards',
    ready: 'app-reward-card',
    root: OVERLAY,
    open: async (page) => {
      await page.locator('app-reward-card').first().getByRole('button', { name: 'Reward options' }).click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(page.locator('app-reward-form-dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.locator('simple-snack-bar')).toBeVisible();
    },
  },
  {
    name: 'rewards: history',
    path: '/rewards',
    ready: 'app-reward-card',
    open: async (page) => {
      await page.getByRole('tab', { name: /History/ }).click();
      await expect(page.locator('.ledger-item').first()).toBeVisible();
    },
  },
  {
    name: 'rewards: revert confirmation',
    path: '/rewards',
    ready: 'app-reward-card',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('tab', { name: /History/ }).click();
      await page.getByRole('button', { name: 'Revert withdrawal and refund balance' }).first().click();
      await expect(page.locator('app-confirm-dialog')).toBeVisible();
    },
  },
  {
    name: 'rewards: analytics',
    path: '/rewards',
    ready: 'app-reward-card',
    open: async (page) => {
      await page.getByRole('tab', { name: /Analytics/ }).click();
      await page.locator('.legend-item').first().dispatchEvent('mouseenter');
      await expect(page.locator('.center-sub')).toBeVisible();
    },
  },
  { name: 'categories', path: '/rewards/categories', ready: '.category-row' },
  {
    name: 'categories: category dialog',
    path: '/rewards/categories',
    ready: '.category-row',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Edit category' }).last().click();
      await expect(page.locator('app-category-form-dialog')).toBeVisible();
    },
  },
  {
    name: 'categories: delete confirmation',
    path: '/rewards/categories',
    ready: '.category-row',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Delete category' }).last().click();
      await expect(page.locator('app-confirm-dialog')).toBeVisible();
    },
  },
  { name: 'pomodoro', path: '/pomodoro', ready: 'app-session-config' },
  { name: 'daily scores', path: '/daily-scores', ready: '.score-btn' },
  { name: 'settings', path: '/settings', ready: '.settings-link' },
  { name: 'design system gallery', path: '/design-system', ready: 'app-stat-card' },
];

// Screens that are known not to fit at a width, each with the reason. This list may only shrink:
// an entry whose screen fits again fails the audit until the entry is deleted. Never add an entry to
// make new work pass; fix the layout instead.
const KNOWN_GAPS: { screen: string; width: number; reason: string }[] = [];

const ROUTE_FILES_ROOT = join(__dirname, '../../src/app');

async function seedWorstCase(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await expect(page.locator('app-balance-widget')).toBeVisible();

  await page.evaluate(
    async ({ title, category, difficulty, notes }) => {
      // One unbroken word of the widest glyph, a URL, and ordinary long words: the three shapes a
      // limit-length value takes.
      const word = (length: number) => 'W'.repeat(length);
      const url = (length: number) =>
        ('https://example.com/a/very/long/path/' + 'segment-'.repeat(200)).slice(0, length);
      const prose = (length: number) =>
        'Supercalifragilistic expialidocious antidisestablishmentarianism '.repeat(20).slice(0, length);

      const now = Date.now();
      const today = new Date(now).toLocaleDateString('en-CA');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pocket-discipline-db');
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });

      const cleared = ['goals', 'dailyTasks', 'tasks', 'rewards', 'withdrawals'];
      const tx = db.transaction(['users', 'rewardCategories', ...cleared], 'readwrite');
      for (const store of cleared) tx.objectStore(store).clear();
      const put = (store: string, row: object) => tx.objectStore(store).put(row);

      put('users', { id: 1, name: 'Current', balance: 1_234_567, createdAt: now, updatedAt: now });

      const goal = (id: string, text: string, extra: object = {}) => ({
        id,
        title: text,
        rewardValue: 150_000,
        status: 'ACTIVE',
        completedAt: null,
        createdAt: now,
        ...extra,
      });
      put('goals', goal('goal-word', word(title)));
      put('goals', goal('goal-url', url(title)));
      put('goals', goal('goal-prose', prose(title)));
      put('goals', goal('goal-done', word(title), { status: 'COMPLETED', completedAt: now }));

      const difficulties = (name: (length: number) => string) =>
        [1, 2, 3, 4].map((step) => ({ id: `d${step}`, name: name(difficulty), baseReward: 100_000 * step }));
      const dailyTask = (id: string, text: string, names: (length: number) => string, extra: object = {}) => ({
        id,
        title: text,
        createdAt: now,
        difficulties: difficulties(names),
        streak: 0,
        lastCompletedAt: null,
        ...extra,
      });
      put('dailyTasks', dailyTask('daily-word', word(title), word, { streak: 365, lastCompletedAt: now - 86_400_000 }));
      put('dailyTasks', dailyTask('daily-url', url(title), prose));
      put('dailyTasks', dailyTask('daily-done', word(title), word, { streak: 365, lastCompletedAt: now }));

      const task = (id: string, text: string, isCompleted: boolean) => ({
        id,
        title: text,
        type: isCompleted ? 'ONEOFF' : 'HABIT',
        rewardValue: 100_000,
        isCompleted,
        lastCompletedAt: isCompleted ? now : null,
        createdAt: now,
      });
      put('tasks', task('task-word', word(title), false));
      put('tasks', task('task-url', url(title), true));

      const categoryRow = (id: string, name: string, color: string) => ({
        id,
        name,
        color,
        icon: 'flight',
        isDefault: false,
        isProtected: false,
        createdAt: now,
      });
      put('rewardCategories', categoryRow('cat-word', word(category), '#e91e63'));
      put('rewardCategories', categoryRow('cat-url', url(category), '#009688'));

      const reward = (id: string, text: string, categoryId: string, extra: object = {}) => ({
        id,
        title: text,
        cost: 1000,
        categoryId,
        type: 'repeatable',
        status: 'active',
        claimCount: 0,
        claimedAt: null,
        createdAt: now,
        updatedAt: now,
        ...extra,
      });
      put('rewards', reward('reward-word', word(title), 'cat-word'));
      put('rewards', reward('reward-url', url(title), 'cat-url', { claimCount: 999 }));
      put('rewards', reward('reward-prose', prose(title), 'cat-general', { cost: 9_999_999 }));
      put(
        'rewards',
        reward('reward-claimed', word(title), 'cat-word', { type: 'one-time', status: 'claimed', claimedAt: now }),
      );

      const withdrawal = (id: string, text: string, categoryId: string, note: string | undefined, amount: number) => ({
        id,
        amount,
        title: text,
        categoryId,
        notes: note,
        date: today,
        timestamp: now,
        rewardId: id === 'spend-claim' ? 'reward-word' : null,
      });
      put('withdrawals', withdrawal('spend-word', word(title), 'cat-word', word(notes), 1234.5));
      put('withdrawals', withdrawal('spend-claim', `Claimed: ${word(title)}`, 'cat-word', undefined, 2_000_000));
      put('withdrawals', withdrawal('spend-url', url(title), 'cat-url', url(notes), 1234.5));
      put('withdrawals', withdrawal('spend-prose', prose(title), 'cat-general', prose(notes), 1234.5));

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          resolve();
        };
        tx.onerror = () => {
          reject(new Error('could not seed the database'));
        };
      });
      db.close();
    },
    {
      title: TITLE_MAX_LENGTH,
      category: CATEGORY_NAME_MAX_LENGTH,
      difficulty: DIFFICULTY_NAME_MAX_LENGTH,
      notes: NOTES_MAX_LENGTH,
    },
  );
}

// Runs in the page. Returns one line per piece of text that does not fit, and per region that scrolls sideways.
function findOverflow(rootSelector: string): string[] {
  const TOLERANCE = 1.5;
  const viewportWidth = document.documentElement.clientWidth;
  const root = document.querySelector(rootSelector) ?? document.body;
  const findings = new Set<string>();

  const label = (element: Element): string => {
    const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).slice(0, 2) : [];
    return [element.tagName.toLowerCase(), ...classes.filter(Boolean)].join('.');
  };
  const trail = (element: Element): string => {
    const parts: string[] = [];
    for (let e: Element | null = element; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      parts.unshift(label(e));
    }
    return parts.join(' > ');
  };
  const isHidden = (element: Element): boolean => {
    for (let e: Element | null = element; e; e = e.parentElement) {
      const style = getComputedStyle(e);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      if (e.classList.contains('cdk-visually-hidden')) return true;
      // Material draws a floating label 4px into its notch, and keeps inactive tabs in the DOM.
      if (e.classList.contains('mdc-notched-outline')) return true;
      if (e.tagName === 'MAT-TAB-BODY' && !e.classList.contains('mat-mdc-tab-body-active')) return true;
    }
    return false;
  };

  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? '';
    const parent = node.parentElement;
    if (!text || !parent || parent.closest('script, style, mat-icon, input, textarea') || isHidden(parent)) continue;

    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) continue;
    const quoted = `"${text.slice(0, 20)}"`;

    if (rect.right > viewportWidth + TOLERANCE || rect.left < -TOLERANCE) {
      // Text cut with an ellipsis is laid out wider than its box on purpose.
      let truncated = false;
      for (let e: Element | null = parent; e && e !== document.body; e = e.parentElement) {
        if (getComputedStyle(e).textOverflow === 'ellipsis') truncated = true;
      }
      if (!truncated) findings.add(`${quoted} runs off the screen: ${trail(parent)}`);
      continue;
    }

    let truncated = false;
    for (let e: Element | null = parent; e && e !== document.body; e = e.parentElement) {
      const style = getComputedStyle(e);
      if (style.textOverflow === 'ellipsis') truncated = true;
      if (style.display === 'inline') continue;
      const box = e.getBoundingClientRect();
      if (box.width === 0) continue;
      const spill = Math.max(rect.right - box.right, box.left - rect.left);
      if (spill <= TOLERANCE) continue;
      if (style.overflowX === 'visible') {
        findings.add(`${quoted} sticks ${String(Math.round(spill))}px out of ${label(e)}: ${trail(parent)}`);
      } else if (!truncated) {
        findings.add(`${quoted} is cut off by ${label(e)} with no ellipsis: ${trail(parent)}`);
      }
      break;
    }
  }

  for (const text of root.querySelectorAll('svg text')) {
    const svg = text.closest('svg');
    if (!svg || isHidden(text)) continue;
    const box = svg.getBoundingClientRect();
    const rect = text.getBoundingClientRect();
    if (rect.left < box.left - TOLERANCE || rect.right > box.right + TOLERANCE) {
      findings.add(`"${(text.textContent ?? '').trim().slice(0, 20)}" is drawn outside its chart: ${trail(text)}`);
    }
  }

  for (const element of [document.documentElement, ...document.querySelectorAll('*')]) {
    if (isHidden(element)) continue;
    const overflowX = getComputedStyle(element).overflowX;
    const scrolls = element === document.documentElement || overflowX === 'auto' || overflowX === 'scroll';
    if (scrolls && element.scrollWidth > element.clientWidth + 1) {
      findings.add(
        `${label(element)} scrolls sideways by ${String(element.scrollWidth - element.clientWidth)}px: ${trail(element)}`,
      );
    }
  }

  return [...findings];
}

// Resolves once the page has stopped changing: no DOM mutation for a moment, finite animations done,
// fonts loaded. Measuring earlier reads a layout that the data has not filled yet.
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const QUIET_MS = 300;
    await new Promise<void>((resolve) => {
      let timer = setTimeout(done, QUIET_MS);
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(done, QUIET_MS);
      });
      function done(): void {
        observer.disconnect();
        resolve();
      }
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    });
    const finite = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.allSettled(finite.map((animation) => animation.finished));
    await document.fonts.ready;
  });
}

async function audit(page: Page, screen: Screen, width: number, testInfo: TestInfo): Promise<void> {
  await page.goto(screen.path);
  await expect(page.locator(screen.ready).first()).toBeVisible();
  await screen.open?.(page);
  await settle(page);

  if (process.env.LAYOUT_AUDIT_SCREENSHOTS) {
    const file = `${screen.name.replace(/[^a-z0-9]+/gi, '-')}.png`;
    await page.screenshot({ path: join(SCREENSHOT_DIR, String(width), file), fullPage: true });
  }

  const findings = await page.evaluate(findOverflow, screen.root ?? 'body');
  const gap = KNOWN_GAPS.find((known) => known.screen === screen.name && known.width === width);

  if (gap) {
    expect
      .soft(findings, `"${screen.name}" fits at ${String(width)}px again: delete its KNOWN_GAPS entry`)
      .not.toEqual([]);
    return;
  }
  if (findings.length > 0) {
    await testInfo.attach(`${screen.name} at ${String(width)}px`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
  expect.soft(findings, `"${screen.name}" does not fit at ${String(width)}px`).toEqual([]);
}

test.describe('Layout audit', () => {
  for (const width of WIDTHS) {
    test.describe(`at ${String(width)}px`, () => {
      const touch = width < RAIL_FROM;
      test.use({
        // The page scrolls inside the shell, so a screenshot shows only the viewport: make it tall.
        viewport: { width, height: process.env.LAYOUT_AUDIT_SCREENSHOTS ? 2400 : 900 },
        isMobile: touch,
        hasTouch: touch,
        contextOptions: { reducedMotion: 'reduce' },
      });

      test(`every screen fits at ${String(width)}px with worst-case content`, async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        await page.clock.setFixedTime(NOW);
        await seedWorstCase(page);

        for (const screen of SCREENS) {
          await test.step(screen.name, () => audit(page, screen, width, testInfo));
        }
      });
    });
  }

  test('every route is audited', () => {
    const routeFiles = readdirSync(ROUTE_FILES_ROOT, { recursive: true, encoding: 'utf8' }).filter((file) =>
      file.endsWith('.routes.ts'),
    );
    const segments = routeFiles.flatMap((file) =>
      [...readFileSync(join(ROUTE_FILES_ROOT, file), 'utf8').matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]),
    );
    const audited = new Set(SCREENS.flatMap((screen) => screen.path.split('/')));

    expect(segments.length).toBeGreaterThan(0);
    expect(
      segments.filter((segment) => !audited.has(segment)),
      'routes with no entry in SCREENS',
    ).toEqual([]);
  });
});
