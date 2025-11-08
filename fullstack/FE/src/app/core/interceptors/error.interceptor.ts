import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        // Clear auth state
        authService.logout();
        
        // Only redirect if not already on login/signup page
        const currentUrl = router.url;
        if (!currentUrl.startsWith('/auth')) {
          router.navigate(['/auth/login']);
        }
      }

      // Re-throw the error so components can handle it if needed
      return throwError(() => error);
    })
  );
};

