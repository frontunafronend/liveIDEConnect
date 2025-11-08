import { Component, OnInit, OnDestroy, effect, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MonitorService, MonitorData, SystemStatus } from '@core/services/monitor.service';
import { ErrorSnackbarService } from '@core/services/error-snackbar.service';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, DatePipe],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss'
})
export class MonitorComponent implements OnInit, OnDestroy {
  monitorData = signal<MonitorData | null>(null);
  lastUpdate = signal<Date | null>(null);
  isLoading = signal(true);
  isPaused = signal(false);
  private refreshInterval: any;

  // Computed signals
  statusClass = computed(() => {
    const status = this.monitorData()?.status;
    if (!status) return '';
    return `monitor__status-badge--${status.toLowerCase()}`;
  });

  cpuTrend = computed(() => {
    const trend = this.monitorData()?.metrics.trend?.cpu;
    if (!trend) return null;
    const isPositive = trend.startsWith('+');
    return { value: trend, isPositive };
  });

  messagesTrend = computed(() => {
    const trend = this.monitorData()?.metrics.trend?.messages;
    if (!trend) return null;
    const isPositive = trend.startsWith('+');
    return { value: trend, isPositive };
  });

  constructor(
    private monitorService: MonitorService,
    private snackbar: ErrorSnackbarService
  ) {
    // Watch for data changes
    effect(() => {
      const data = this.monitorService.monitorData();
      if (data) {
        this.monitorData.set(data);
        this.isLoading.set(false);
      }
    });

    effect(() => {
      const update = this.monitorService.lastUpdate();
      if (update) {
        this.lastUpdate.set(update);
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadData(): void {
    if (this.isPaused()) return;
    
    this.isLoading.set(true);
    this.monitorService.loadMonitorData().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.snackbar.error('Failed to load monitor data');
      }
    });
  }

  startAutoRefresh(): void {
    this.isPaused.set(false);
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 30000); // 30 seconds
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  togglePause(): void {
    if (this.isPaused()) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
      this.isPaused.set(true);
    }
  }

  getMetricStatusClass(value: number, thresholds: { warning: number; critical: number }): string {
    if (value >= thresholds.critical) return 'monitor__metric--critical';
    if (value >= thresholds.warning) return 'monitor__metric--warning';
    return 'monitor__metric--ok';
  }
}

