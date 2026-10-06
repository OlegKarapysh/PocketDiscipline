import type { SchemaPath } from '@angular/forms/signals';
import { min, required, validate } from '@angular/forms/signals';

/**
 * The rule every money input follows: a whole number of hryvnias, required and at least 1. A form adds
 * its own upper bound, if it has one.
 *
 * `label` names the field in the messages: "Cost is required".
 */
export function moneyAmount(path: SchemaPath<number | null>, label: string): void {
  required(path, { message: `${label} is required` });
  min(path, 1, { message: `${label} must be at least 1 ₴` });
  validate(path, ({ value }) => {
    const amount = value();
    return amount === null || Number.isInteger(amount)
      ? null
      : { kind: 'wholeNumber', message: `${label} must be a whole number of hryvnias` };
  });
}
