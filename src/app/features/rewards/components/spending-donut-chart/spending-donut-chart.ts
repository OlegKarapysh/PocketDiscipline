import { Component, computed, input, signal } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CategorySpendingBreakdown } from '../../models/category-spending-breakdown.model';
import { DonutSlice } from './donut-slice.model';

const CIRCUMFERENCE = 2 * Math.PI * 70;

@Component({
  selector: 'app-spending-donut-chart',
  templateUrl: './spending-donut-chart.html',
  styleUrl: './spending-donut-chart.scss',
  imports: [MatIconModule, MatTooltipModule],
})
export class SpendingDonutChartComponent {
  readonly data = input<CategorySpendingBreakdown[]>([]);
  readonly totalSpent = input<number>(0);
  readonly hoveredCategoryId = signal<string | null>(null);

  readonly circumference = CIRCUMFERENCE;

  readonly slices = computed<DonutSlice[]>(() => {
    const items = this.data();
    const total = this.totalSpent();

    if (total <= 0 || items.length === 0) {
      return [];
    }

    let offset = 0;
    return items.map((category) => {
      const fraction = category.totalSpent / total;
      const arcLength = fraction * CIRCUMFERENCE;
      const slice: DonutSlice = {
        category,
        dashArray: `${arcLength} ${CIRCUMFERENCE}`,
        dashOffset: -offset,
      };
      offset += arcLength;
      return slice;
    });
  });

  readonly activeCategory = computed<CategorySpendingBreakdown | null>(() => {
    const id = this.hoveredCategoryId();
    if (!id) return null;
    return this.data().find((c) => c.categoryId === id) ?? null;
  });

  setHovered(categoryId: string | null): void {
    this.hoveredCategoryId.set(categoryId);
  }
}
