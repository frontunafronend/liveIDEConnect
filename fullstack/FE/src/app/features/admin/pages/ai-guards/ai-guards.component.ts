import { Component, OnInit, OnDestroy, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AIAlert } from '@core/services/admin.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-ai-guards',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './ai-guards.component.html',
  styleUrl: './ai-guards.component.scss'
})
export class AiGuardsComponent implements OnInit, OnDestroy {
  alerts!: Signal<AIAlert[]>;
  isLoading = true;
  private refreshInterval?: any;

  constructor(
    private adminService: AdminService,
    private snackbar: ErrorSnackbarService
  ) {
    this.alerts = this.adminService.alerts;

    effect(() => {
      const alerts = this.alerts();
      if (alerts && alerts.length > 0) {
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
          criticalAlerts.forEach(alert => {
            this.snackbar.error(`🚨 Critical Alert: ${alert.message}`);
          });
        }

        const warningAlerts = alerts.filter(a => a.severity === 'warning');
        if (warningAlerts.length > 0 && !this.isLoading) {
          const latestWarning = warningAlerts[0];
          this.snackbar.warning(`⚠️ ${latestWarning.message}`);
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadAlerts();
    
    this.refreshInterval = setInterval(() => {
      this.loadAlerts();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.adminService.loadAlerts().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbar.error('Failed to load AI alerts');
      }
    });
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'ai-guards__alert--critical';
      case 'warning':
        return 'ai-guards__alert--warning';
      case 'info':
        return 'ai-guards__alert--info';
      default:
        return '';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📋';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

