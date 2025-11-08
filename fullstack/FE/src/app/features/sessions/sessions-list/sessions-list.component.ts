import { Component, OnInit, effect, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionsService } from '@core/services/sessions.service';
import { AuthService } from '@core/services/auth.service';
import { LiveIdeSession, SessionStatus, User } from '@core/types';
import { CardComponent } from '@shared/components/card/card.component';
import { HeaderComponent } from '@shared/components/header/header.component';

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule, CardComponent, HeaderComponent],
  templateUrl: './sessions-list.component.html',
  styleUrl: './sessions-list.component.scss'
})
export class SessionsListComponent implements OnInit {
  sessions!: Signal<LiveIdeSession[]>;
  currentUser!: Signal<User | null>;

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private router: Router
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

}

