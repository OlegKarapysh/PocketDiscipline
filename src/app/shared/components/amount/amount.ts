import { Component, computed, input } from '@angular/core';
import type { AmountSize } from './amount-size.type';
import type { AmountTone } from './amount-tone.type';

const CURRENCY_FORMAT = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });

@Component({
  selector: 'app-amount',
  templateUrl: './amount.html',
  styleUrl: './amount.scss',
  host: {
    '[class]': 'hostClass()',
  },
})
export class Amount {
  readonly value = input.required<number | null | undefined>();
  readonly size = input<AmountSize>('md');
  readonly tone = input<AmountTone>('default');
  readonly showSign = input(false);
  readonly unit = input('₴');

  readonly formatted = computed(() => {
    const value = this.value();
    if (value === null || value === undefined) return '--';
    const sign = this.showSign() && value > 0 ? '+' : '';
    return sign + CURRENCY_FORMAT.format(value);
  });

  readonly hostClass = computed(() => `pd-num size-${this.size()} tone-${this.tone()}`);
}
