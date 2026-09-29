import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { MONEY_FORMAT } from '../constants/money-format.const';

// For money where <app-amount> cannot render: SVG text, attribute bindings and aria labels.
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number, unit = '₴'): string {
    return `${MONEY_FORMAT.format(value)} ${unit}`;
  }
}
