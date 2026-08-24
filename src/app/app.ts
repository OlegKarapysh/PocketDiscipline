import { Component, signal } from '@angular/core';
import { LayoutComponent } from './shared/components/layout/layout';

@Component({
  imports: [LayoutComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('pocket-discipline');
}
