import { Component, OnInit, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, AdminSession } from '@core/services/admin.service';
import { SessionsService } from '@core/services/sessions.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, ButtonComponent],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss'
})
export class SessionsComponent implements OnInit {
  sessions!: Signal<AdminSession[]>;
  isLoading = true;
  isCreating = signal(false);

  constructor(
    private adminService: AdminService,
    private sessionsService: SessionsService,
    private snackbar: ErrorSnackbarService,
    private router: Router
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

  createSession(): void {
    this.isCreating.set(true);
    const sessionName = `Test Session - ${new Date().toLocaleString()}`;
    
    this.sessionsService.createSession(sessionName, 'online').subscribe({
      next: (newSession) => {
        this.isCreating.set(false);
        // Navigate to the chat page
        this.router.navigate(['/chat', newSession.id]);
      },
      error: (error) => {
        this.isCreating.set(false);
        this.snackbar.error('Failed to create session. Please try again.');
      }
    });
  }
}

