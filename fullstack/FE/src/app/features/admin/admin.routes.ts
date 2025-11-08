import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'sessions',
    loadComponent: () => import('./pages/sessions/sessions.component').then(m => m.SessionsComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'ai-guards',
    loadComponent: () => import('./pages/ai-guards/ai-guards.component').then(m => m.AiGuardsComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'logs',
    loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'monitor',
    loadComponent: () => import('./pages/monitor/monitor.component').then(m => m.MonitorComponent),
    canActivate: [adminGuard]
  }
];

