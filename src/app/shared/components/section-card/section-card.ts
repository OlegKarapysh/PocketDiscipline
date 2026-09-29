import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-section-card',
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './section-card.html',
  styleUrl: './section-card.scss',
})
export class SectionCard {
  readonly heading = input<string>();
  readonly actionLabel = input<string>();
  readonly action = output();
}
