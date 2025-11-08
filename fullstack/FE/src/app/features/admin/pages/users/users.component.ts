import { Component, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminUser } from '@core/services/admin.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users!: Signal<AdminUser[]>;
  isLoading = true;

  constructor(
    private adminService: AdminService,
    private snackbar: ErrorSnackbarService
  ) {
    this.users = this.adminService.users;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.loadUsers().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbar.error('Failed to load users');
      }
    });
  }

  banUser(user: AdminUser): void {
    if (confirm(`Are you sure you want to ban ${user.email}?`)) {
      this.adminService.banUser(user.id).subscribe({
        next: () => {
          this.snackbar.success(`User ${user.email} has been banned`);
          this.loadUsers();
        },
        error: () => {
          this.snackbar.error('Failed to ban user');
        }
      });
    }
  }

  deleteUser(user: AdminUser): void {
    if (confirm(`Are you sure you want to permanently delete ${user.email}? This action cannot be undone.`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.snackbar.success(`User ${user.email} has been deleted`);
          this.loadUsers();
        },
        error: () => {
          this.snackbar.error('Failed to delete user');
        }
      });
    }
  }
}

