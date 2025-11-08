import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SnackbarComponent],
  template: `
    <router-outlet></router-outlet>
    <app-snackbar></app-snackbar>
  `,
  styles: []
})
export class AppComponent {
  title = 'LiveIDEConnect';

  constructor(private themeService: ThemeService) {
    // Initialize theme service (applies theme on load)
  }
}

