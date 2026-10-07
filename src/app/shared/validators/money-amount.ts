import type { SchemaPath } from '@angular/forms/signals';
import { max, min, required, validate } from '@angular/forms/signals';

const MAX_MONEY_AMOUNT = 10_000_000;

/**
 * The rule every money input follows: a whole number of hryvnias, required, from 1 up to 10 000 000.
 * A form adds its own, lower bound if it has one.
 *
 * `label` names the field in the messages: "Cost is required".
 */
export function moneyAmount(path: SchemaPath<number | null>, label: string): void {
  required(path, { message: `${label} is required` });
  min(path, 1, { message: `${label} must be at least 1 ₴` });
  max(path, MAX_MONEY_AMOUNT, { message: `${label} is too large` });
  validate(path, ({ value }) => {
    const amount = value();
    return amount === null || Number.isInteger(amount)
      ? null
      : { kind: 'wholeNumber', message: `${label} must be a whole number of hryvnias` };
  });
}
