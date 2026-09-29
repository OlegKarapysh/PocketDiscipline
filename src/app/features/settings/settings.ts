import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeader],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings {}
