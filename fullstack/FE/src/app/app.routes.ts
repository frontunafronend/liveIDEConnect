import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { adminRoutes } from './features/admin/admin.routes';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
    children: adminRoutes
  },
  {
    path: 'sessions',
    loadComponent: () => import('./features/sessions/sessions-list/sessions-list.component').then(m => m.SessionsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'chat/:id',
    loadComponent: () => import('./features/chat/chat-view/chat-view.component').then(m => m.ChatViewComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/sessions',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/sessions'
  }
];

