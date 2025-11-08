import { Component, OnInit, effect, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionsService } from '@core/services/sessions.service';
import { AuthService } from '@core/services/auth.service';
import { LiveIdeSession, SessionStatus, User } from '@core/types';
import { CardComponent } from '@shared/components/card/card.component';
import { HeaderComponent } from '@shared/components/header/header.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, HeaderComponent, ButtonComponent, InputComponent, ModalComponent],
  templateUrl: './sessions-list.component.html',
  styleUrl: './sessions-list.component.scss'
})
export class SessionsListComponent implements OnInit {
  sessions!: Signal<LiveIdeSession[]>;
  currentUser!: Signal<User | null>;
  isCreating = signal(false);
  showModal = signal(false);
  sessionToken = signal('');
  sessionName = signal('');

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
    // Auto-fill token from sessionStorage if available
    const storedToken = sessionStorage.getItem('auth_token');
    if (storedToken) {
      this.sessionToken.set(storedToken);
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

  onDeleteClick(event: Event, session: LiveIdeSession): void {
    event.stopPropagation(); // Prevent card click
    if (confirm(`Are you sure you want to delete "${session.name}"?`)) {
      this.sessionsService.deleteSession(session.id).subscribe({
        next: () => {
          this.snackbar.success('Session deleted successfully');
        },
        error: (error) => {
          this.snackbar.error('Failed to delete session. Please try again.');
        }
      });
    }
  }

  openCreateModal(): void {
    // Auto-fill token from sessionStorage
    const storedToken = sessionStorage.getItem('auth_token');
    if (storedToken) {
      this.sessionToken.set(storedToken);
    }
    this.sessionName.set(`Test Session - ${new Date().toLocaleString()}`);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  createSession(): void {
    const token = this.sessionToken().trim();
    const name = this.sessionName().trim() || `Test Session - ${new Date().toLocaleString()}`;

    if (!token) {
      this.snackbar.error('Token is required');
      return;
    }

    this.isCreating.set(true);
    
    this.sessionsService.createSession(name, 'online').subscribe({
      next: (newSession) => {
        this.isCreating.set(false);
        this.showModal.set(false);
        // Navigate to the new session's chat
        this.router.navigate(['/chat', newSession.id]);
      },
      error: (error) => {
        this.isCreating.set(false);
        if (error.status === 401) {
          this.snackbar.error('Invalid token. Please check your token and try again.');
        } else {
          this.snackbar.error('Failed to create session. Please try again.');
        }
      }
    });
  }

}

