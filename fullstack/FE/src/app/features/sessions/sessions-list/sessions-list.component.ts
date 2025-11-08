import { Component, OnInit, effect, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionsService } from '@core/services/sessions.service';
import { AuthService } from '@core/services/auth.service';
import { LiveIdeSession, SessionStatus, User } from '@core/types';
import { CardComponent } from '@shared/components/card/card.component';
import { HeaderComponent } from '@shared/components/header/header.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule, CardComponent, HeaderComponent, ButtonComponent],
  templateUrl: './sessions-list.component.html',
  styleUrl: './sessions-list.component.scss'
})
export class SessionsListComponent implements OnInit {
  sessions!: Signal<LiveIdeSession[]>;
  currentUser!: Signal<User | null>;
  isCreating = signal(false);

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private router: Router,
    private snackbar: ErrorSnackbarService
  ) {
    this.sessions = this.sessionsService.sessions;
    this.currentUser = this.authService.currentUser;
    // Auto-refresh sessions every 30 seconds (only if authenticated)
    effect(() => {
      const _ = this.sessions();
      if (this.authService.isLoggedIn()) {
        setTimeout(() => {
          this.sessionsService.refreshSessions();
        }, 30000);
      }
    });
  }

  ngOnInit(): void {
    // Only load sessions if user is authenticated
    if (this.authService.isLoggedIn()) {
      this.sessionsService.loadSessions().subscribe({
        error: (error) => {
          // Error is already handled by error interceptor
          // Just log for debugging if needed
          console.error('Failed to load sessions:', error);
        }
      });
    }
  }

  getStatusClass(status: SessionStatus): string {
    return `session-item__status session-item__status--${status}`;
  }

  getStatusLabel(status: SessionStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatLastActive(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  onSessionClick(session: LiveIdeSession): void {
    this.router.navigate(['/chat', session.id]);
  }

  createSession(): void {
    this.isCreating.set(true);
    const sessionName = `Test Session - ${new Date().toLocaleString()}`;
    
    this.sessionsService.createSession(sessionName, 'online').subscribe({
      next: (newSession) => {
        this.isCreating.set(false);
        // Navigate to the new session's chat
        this.router.navigate(['/chat', newSession.id]);
      },
      error: (error) => {
        this.isCreating.set(false);
        this.snackbar.error('Failed to create session. Please try again.');
      }
    });
  }

}

