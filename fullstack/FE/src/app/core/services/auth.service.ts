import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthResponse, LoginCredentials, SignupData, User } from '../types';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { ErrorSnackbarService } from './error-snackbar.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  // Signals for reactive state
  private readonly _currentUser = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);

  // Public computed signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private snackbar: ErrorSnackbarService
  ) {
    // Load from secure storage on init
    const storedToken = this.storage.getToken();
    const storedUser = this.storage.getUser();
    
    if (storedToken && storedUser) {
      this._token.set(storedToken);
      this._currentUser.set(storedUser);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        this._token.set(response.token);
        this._currentUser.set(response.user);
        // Use secure storage (sessionStorage for token, localStorage for user)
        this.storage.setToken(response.token);
        this.storage.setUser(response.user);
      }),
      catchError(error => {
        this.snackbar.error('Login failed. Please check your credentials.');
        return throwError(() => error);
      })
    );
  }

  signup(data: SignupData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, data).pipe(
      tap(response => {
        this._token.set(response.token);
        this._currentUser.set(response.user);
        // Use secure storage
        this.storage.setToken(response.token);
        this.storage.setUser(response.user);
      }),
      catchError(error => {
        this.snackbar.error('Signup failed. Please try again.');
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this._token.set(null);
    this._currentUser.set(null);
    this.storage.removeToken();
    this.storage.removeUser();
  }

  getAuthToken(): string | null {
    return this._token();
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}

