import { Component, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminSession } from '@core/services/admin.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss'
})
export class SessionsComponent implements OnInit {
  sessions!: Signal<AdminSession[]>;
  isLoading = true;

  constructor(
    private adminService: AdminService,
    private snackbar: ErrorSnackbarService
  ) {
    this.sessions = this.adminService.sessions;
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.isLoading = true;
    this.adminService.loadSessions().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbar.error('Failed to load sessions');
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'online':
        return 'sessions-table__status--online';
      case 'offline':
        return 'sessions-table__status--offline';
      case 'busy':
        return 'sessions-table__status--busy';
      default:
        return '';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

