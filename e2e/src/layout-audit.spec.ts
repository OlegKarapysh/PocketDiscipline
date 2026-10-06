import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { FALLBACK_CATEGORY_ID } from '../../src/app/core/constants/initial-reward-categories.const';
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '../../src/app/core/models/user.model';
import {
  CATEGORY_NAME_MAX_LENGTH,
  DIFFICULTY_NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../src/app/shared/constants/text-length.const';

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

// The first of the month, when the "per day" average is the whole month's total: the most digits it
// will ever have.
const NOW = new Date('2026-01-01T12:00:00');

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
  {
    name: 'tasks: edit daily task form',
    path: '/tasks',
    ready: 'app-daily-task-item',
    open: async (page) => {
      await page.getByRole('button', { name: 'Edit daily task' }).first().click();
      await expect(page.locator('app-daily-task-form')).toBeVisible();
    },
  },
  {
    name: 'tasks: delete daily task confirmation',
    path: '/tasks',
    ready: 'app-daily-task-item',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Delete daily task' }).first().click();
      await expect(page.locator('app-confirm-dialog')).toBeVisible();
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
  {
    name: 'goals: delete confirmation',
    path: '/goals',
    ready: 'app-goal-item',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Delete' }).first().click();
      await expect(page.locator('app-confirm-dialog')).toBeVisible();
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
    name: 'rewards: delete confirmation',
    path: '/rewards',
    ready: 'app-reward-card',
    root: OVERLAY,
    open: async (page) => {
      await page.locator('app-reward-card').first().getByRole('button', { name: 'Reward options' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.locator('app-confirm-dialog')).toBeVisible();
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
  {
    name: 'daily scores: score selected',
    path: '/daily-scores',
    ready: '.score-btn',
    open: async (page) => {
      await page.getByRole('button', { name: 'Score 10' }).click();
      await expect(page.locator('.feedback-banner')).toBeVisible();
    },
  },
  // Saves today's score, which replaces the score input: keep it after the screens that need the input.
  {
    name: 'daily scores: score saved',
    path: '/daily-scores',
    ready: '.score-btn',
    open: async (page) => {
      await page.getByRole('button', { name: 'Score 10' }).click();
      await page.getByRole('button', { name: 'Save score' }).click();
      await expect(page.locator('.readonly-container')).toBeVisible();
    },
  },
  { name: 'settings', path: '/settings', ready: '.settings-link' },
  {
    name: 'settings: purge confirmation',
    path: '/settings',
    ready: '.settings-link',
    root: OVERLAY,
    open: async (page) => {
      await page.getByRole('button', { name: 'Purge database' }).click();
      await expect(page.locator('app-confirm-dialog')).toBeVisible();
    },
  },
  { name: 'design system gallery', path: '/design-system', ready: 'app-stat-card' },
];

// The lists again with nothing in them: an empty state is a layout of its own. Audited before the
// worst case is seeded.
const EMPTY_SCREENS: Screen[] = [
  { name: 'dashboard: no earnings', path: '/dashboard', ready: '.empty-earnings-indicator' },
  { name: 'tasks: nothing yet', path: '/tasks', ready: 'app-empty-state' },
  { name: 'goals: nothing yet', path: '/goals', ready: 'app-empty-state' },
  { name: 'rewards: empty store', path: '/rewards', ready: 'app-reward-store app-empty-state' },
  {
    name: 'rewards: empty history',
    path: '/rewards',
    ready: 'app-reward-store app-empty-state',
    open: async (page) => {
      await page.getByRole('tab', { name: /History/ }).click();
      await expect(page.locator('app-withdrawal-ledger app-empty-state')).toBeVisible();
    },
  },
  {
    name: 'rewards: empty analytics',
    path: '/rewards',
    ready: 'app-reward-store app-empty-state',
    open: async (page) => {
      await page.getByRole('tab', { name: /Analytics/ }).click();
      await expect(page.locator('app-spending-analytics app-empty-state')).toBeVisible();
    },
  },
];

// Screens that are known not to fit at a width, each with the reason. This list may only shrink:
// an entry whose screen fits again fails the audit until the entry is deleted. Never add an entry to
// make new work pass; fix the layout instead.
const KNOWN_GAPS: { screen: string; width: number; reason: string }[] = [];

const ROUTE_FILES_ROOT = join(__dirname, '../../src/app');

const DATABASE = 'pocket-discipline-db';
// The tables behind the lists. A new database comes with starter goals, so "empty" has to be made.
const LIST_STORES = ['goals', 'dailyTasks', 'tasks', 'rewards', 'withdrawals'];

type Rows = Record<string, object[]>;

// Empties the lists and writes the given rows in their place, in one transaction. The app must have
// opened its database already, and reads the result on its next load.
async function replaceLists(page: Page, rows: Rows = {}): Promise<void> {
  await page.evaluate(
    async ({ database, lists, rows: written }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('could not open the database'));
        };
      });

      const tx = db.transaction([...new Set([...lists, ...Object.keys(written)])], 'readwrite');
      for (const store of lists) tx.objectStore(store).clear();
      for (const [store, storeRows] of Object.entries(written)) {
        for (const row of storeRows) tx.objectStore(store).put(row);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          resolve();
        };
        tx.onerror = () => {
          reject(new Error('could not write the database'));
        };
      });
      db.close();
    },
    { database: DATABASE, lists: LIST_STORES, rows },
  );
}

// One unbroken word of the widest glyph, a URL, and ordinary long words: the three shapes a
// limit-length value takes.
const word = (length: number) => 'W'.repeat(length);
const url = (length: number) => ('https://example.com/a/very/long/path/' + 'segment-'.repeat(200)).slice(0, length);
const prose = (length: number) =>
  'Supercalifragilistic expialidocious antidisestablishmentarianism '.repeat(20).slice(0, length);

function worstCaseRows(): Rows {
  // The page's clock is fixed at NOW, so these are the app's "now" and "today" too.
  const now = NOW.getTime();
  const today = NOW.toLocaleDateString('en-CA');

  const goal = (id: string, text: string, extra: object = {}) => ({
    id,
    title: text,
    rewardValue: 1_234_567,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: now,
    ...extra,
  });

  const difficulties = (name: (length: number) => string) =>
    [1, 2, 3, 4].map((step) => ({
      id: `d${String(step)}`,
      name: name(DIFFICULTY_NAME_MAX_LENGTH),
      baseReward: 1_000_000 * step,
    }));
  const dailyTask = (id: string, text: string, names: (length: number) => string, extra: object = {}) => ({
    id,
    title: text,
    createdAt: now,
    difficulties: difficulties(names),
    streak: 0,
    lastCompletedAt: null,
    ...extra,
  });

  const task = (id: string, text: string, isCompleted: boolean) => ({
    id,
    title: text,
    type: isCompleted ? 'ONEOFF' : 'HABIT',
    rewardValue: 100_000,
    isCompleted,
    lastCompletedAt: isCompleted ? now : null,
    createdAt: now,
  });

  const category = (id: string, name: string, color: string) => ({
    id,
    name,
    color,
    icon: 'flight',
    isDefault: false,
    isProtected: false,
    createdAt: now,
  });

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

  const withdrawal = (id: string, text: string, categoryId: string, notes: string | undefined, amount: number) => ({
    id,
    amount,
    title: text,
    categoryId,
    notes,
    date: today,
    timestamp: now,
    rewardId: id === 'spend-claim' ? 'reward-word' : null,
  });

  return {
    users: [{ id: CURRENT_USER_ID, name: CURRENT_USER_NAME, balance: 1_234_567, createdAt: now, updatedAt: now }],
    goals: [
      goal('goal-word', word(TITLE_MAX_LENGTH)),
      goal('goal-url', url(TITLE_MAX_LENGTH)),
      goal('goal-prose', prose(TITLE_MAX_LENGTH)),
      // Completed today, so it is also the month's earnings on the dashboard.
      goal('goal-done', word(TITLE_MAX_LENGTH), { rewardValue: 9_999_999, status: 'COMPLETED', completedAt: now }),
    ],
    dailyTasks: [
      dailyTask('daily-word', word(TITLE_MAX_LENGTH), word, { streak: 365, lastCompletedAt: now - 86_400_000 }),
      dailyTask('daily-url', url(TITLE_MAX_LENGTH), prose),
      dailyTask('daily-done', word(TITLE_MAX_LENGTH), word, { streak: 365, lastCompletedAt: now }),
    ],
    tasks: [task('task-word', word(TITLE_MAX_LENGTH), false), task('task-url', url(TITLE_MAX_LENGTH), true)],
    rewardCategories: [
      category('cat-word', word(CATEGORY_NAME_MAX_LENGTH), '#e91e63'),
      category('cat-url', url(CATEGORY_NAME_MAX_LENGTH), '#009688'),
    ],
    rewards: [
      reward('reward-word', word(TITLE_MAX_LENGTH), 'cat-word'),
      reward('reward-url', url(TITLE_MAX_LENGTH), 'cat-url', { claimCount: 999 }),
      reward('reward-prose', prose(TITLE_MAX_LENGTH), FALLBACK_CATEGORY_ID, { cost: 9_999_999 }),
      reward('reward-claimed', word(TITLE_MAX_LENGTH), 'cat-word', {
        type: 'one-time',
        status: 'claimed',
        claimedAt: now,
      }),
    ],
    withdrawals: [
      withdrawal('spend-word', word(TITLE_MAX_LENGTH), 'cat-word', word(NOTES_MAX_LENGTH), 1234.5),
      withdrawal('spend-claim', `Claimed: ${word(TITLE_MAX_LENGTH)}`, 'cat-word', undefined, 2_000_000),
      withdrawal('spend-url', url(TITLE_MAX_LENGTH), 'cat-url', url(NOTES_MAX_LENGTH), 1234.5),
      withdrawal('spend-prose', prose(TITLE_MAX_LENGTH), FALLBACK_CATEGORY_ID, prose(NOTES_MAX_LENGTH), 1234.5),
    ],
  };
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

  for (const element of document.querySelectorAll('*')) {
    // Nearly every element stops here, before any style is read.
    if (element.scrollWidth <= element.clientWidth + 1) continue;
    const overflowX = getComputedStyle(element).overflowX;
    const scrolls = element === document.documentElement || overflowX === 'auto' || overflowX === 'scroll';
    if (scrolls && !isHidden(element)) {
      findings.add(
        `${label(element)} scrolls sideways by ${String(element.scrollWidth - element.clientWidth)}px: ${trail(element)}`,
      );
    }
  }

  return [...findings];
}

// Resolves once the page has stopped changing: no DOM mutation for a moment, finite animations done,
// fonts loaded. Measuring earlier reads a layout that the data has not filled yet. A page that never
// stops changing fails here, by name, rather than at the test's timeout.
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const QUIET_MS = 300;
    const LIMIT_MS = 10_000;
    await new Promise<void>((resolve, reject) => {
      let timer = setTimeout(done, QUIET_MS);
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(done, QUIET_MS);
      });
      const limit = setTimeout(() => {
        clearTimeout(timer);
        observer.disconnect();
        reject(new Error(`the page was still changing after ${String(LIMIT_MS)}ms`));
      }, LIMIT_MS);
      function done(): void {
        clearTimeout(limit);
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

  if (process.env['LAYOUT_AUDIT_SCREENSHOTS']) {
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
        viewport: { width, height: process.env['LAYOUT_AUDIT_SCREENSHOTS'] ? 2400 : 900 },
        isMobile: touch,
        hasTouch: touch,
        contextOptions: { reducedMotion: 'reduce' },
      });

      test(`every screen fits at ${String(width)}px, empty and with worst-case content`, async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        await page.clock.setFixedTime(NOW);
        // The app creates its database on its first load.
        await page.goto('/dashboard');
        await expect(page.locator('app-balance-widget')).toBeVisible();

        await replaceLists(page);
        for (const screen of EMPTY_SCREENS) {
          await test.step(screen.name, () => audit(page, screen, width, testInfo));
        }

        await replaceLists(page, worstCaseRows());
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
