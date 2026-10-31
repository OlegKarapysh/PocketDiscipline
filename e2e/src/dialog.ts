import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// A Material dialog shows its fields a moment before it is ready to type into. No person types in that
// moment, but Playwright does when the machine is busy, and two things then go wrong:
// - The dialog builds its content on the click but binds the signal form on the next change detection.
//   Text typed before then throws NG0950 and is lost, and the binding then empties the field.
// - When its 150 ms opening animation ends, the dialog moves focus to its initial field. Text sent to
//   another field at that moment is typed into the initial one instead.
// The focus move comes after both and happens once, so every fill made after it lands where it is sent.

/** Clicks `trigger` and waits until the dialog it opens has put focus on `initialField`. */
export async function openDialog(trigger: Locator, initialField: Locator): Promise<void> {
  await trigger.click();
  await expect(initialField).toBeFocused();
}
