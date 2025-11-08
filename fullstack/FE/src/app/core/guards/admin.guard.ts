import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ErrorSnackbarService } from '../services/error-snackbar.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackbar = inject(ErrorSnackbarService);

  if (!authService.isLoggedIn()) {
    snackbar.warning('Please login to access admin panel');
    return router.createUrlTree(['/auth/login']);
  }

  if (!authService.isAdmin()) {
    snackbar.error('Admin access required');
    return router.createUrlTree(['/sessions']);
  }

  return true;
};

