import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const storage = inject(StorageService);
  
  // Try to get token from signal first, fallback to storage
  let token = authService.getAuthToken();
  
  // If token is not in signal but might be in storage, try to load it
  if (!token) {
    const storedToken = storage.getToken();
    if (storedToken) {
      // Token exists in storage but not in signal - this shouldn't happen
      // but we'll use it anyway and sync the signal
      token = storedToken;
      // Note: We can't directly set the signal here, but we'll use the token
    }
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};

