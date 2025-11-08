import { Component, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorSnackbarService, SnackbarMessage } from '@core/services/error-snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss'
})
export class SnackbarComponent {
  messages!: Signal<SnackbarMessage[]>;

  constructor(private snackbarService: ErrorSnackbarService) {
    this.messages = this.snackbarService.messages;
  }

  dismiss(id: string): void {
    this.snackbarService.dismiss(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  }
}

