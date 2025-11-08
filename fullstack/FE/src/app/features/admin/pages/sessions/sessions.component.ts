import { Component, OnInit, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminSession } from '@core/services/admin.service';
import { SessionsService } from '@core/services/sessions.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { DropdownMenuComponent, DropdownMenuItem } from '@shared/components/dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent, ButtonComponent, InputComponent, ModalComponent, DropdownMenuComponent],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss'
})
export class SessionsComponent implements OnInit {
  sessions!: Signal<AdminSession[]>;
  isLoading = true;
  isCreating = signal(false);
  showModal = signal(false);
  sessionToken = signal('');
  sessionName = signal('');

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
    // Auto-fill token from sessionStorage if available
    const storedToken = sessionStorage.getItem('auth_token');
    if (storedToken) {
      this.sessionToken.set(storedToken);
    }
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
    
    // First, verify token by trying to create session
    // The API will validate the token automatically via auth interceptor
    this.sessionsService.createSession(name, 'online').subscribe({
      next: (newSession) => {
        this.isCreating.set(false);
        this.showModal.set(false);
        // Navigate to the chat page
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

  getSessionMenuItems(session: AdminSession): DropdownMenuItem[] {
    return [
      {
        label: 'Delete',
        icon: '🗑️',
        danger: true,
        action: () => {
          if (confirm(`Are you sure you want to delete "${session.name}"?`)) {
            this.adminService.deleteSession(session.id).subscribe({
              next: () => {
                this.snackbar.success('Session deleted successfully');
              },
              error: (error) => {
                this.snackbar.error('Failed to delete session. Please try again.');
              }
            });
          }
        }
      }
    ];
  }
}

