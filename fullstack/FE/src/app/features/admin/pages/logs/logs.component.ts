import { Component, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, SystemLog } from '@core/services/admin.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss'
})
export class LogsComponent implements OnInit {
  logs!: Signal<SystemLog[]>;
  isLoading = true;
  total = 0;
  limit = 50;
  offset = 0;

  constructor(
    private adminService: AdminService,
    private snackbar: ErrorSnackbarService
  ) {
    this.logs = this.adminService.logs;
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.adminService.loadLogs(this.limit, this.offset).subscribe({
      next: (result) => {
        this.total = result.total;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbar.error('Failed to load system logs');
      }
    });
  }

  loadMore(): void {
    this.offset += this.limit;
    this.loadLogs();
  }

  getTypeClass(type: string): string {
    return `logs-table__type--${type}`;
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'message':
        return '💬';
      case 'session':
        return '💻';
      default:
        return '📋';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

