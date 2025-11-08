import { Component, OnInit, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminOverview } from '@core/services/admin.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { StatsCardComponent } from '../../components/stats-card/stats-card.component';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatsCardComponent, SkeletonLoaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  overview!: Signal<AdminOverview | null>;
  isLoading = true;

  constructor(
    private adminService: AdminService,
    private snackbar: ErrorSnackbarService
  ) {
    this.overview = this.adminService.overview;

    effect(() => {
      const overview = this.overview();
      if (overview) {
        this.isLoading = false;
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
    
    setInterval(() => {
      this.loadData();
    }, 30000);
  }

  loadData(): void {
    this.isLoading = true;
    this.adminService.loadOverview().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbar.error('Failed to load dashboard data');
      }
    });
  }
}

