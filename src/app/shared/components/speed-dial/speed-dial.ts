import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import type { SpeedDialAction } from '../../models/speed-dial-action.model';

@Component({
  selector: 'app-speed-dial',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatRippleModule],
  templateUrl: './speed-dial.html',
  styleUrl: './speed-dial.scss',
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class SpeedDial {
  readonly actions = input.required<readonly SpeedDialAction[]>();
  readonly isOpen = signal(false);

  constructor() {
    // The dial lives in the app shell, so a back gesture would otherwise leave it open over the next page.
    inject(Router)
      .events.pipe(
        filter(event => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.close();
      });
  }

  toggle(): void {
    this.isOpen.update(open => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
