import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly useSessionStorage = true;

  setItem(key: string, value: string, useSession: boolean = true): void {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(key, value);
    } catch (error) {
      if (useSession) {
        localStorage.setItem(key, value);
      }
    }
  }

  getItem(key: string, useSession: boolean = true): string | null {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      return storage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  removeItem(key: string, useSession: boolean = true): void {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
      if (useSession) {
        localStorage.removeItem(key);
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
    }
  }

  clear(useSession: boolean = true): void {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.clear();
    } catch (error) {
    }
  }

  setToken(token: string): void {
    this.setItem('auth_token', token, true);
  }

  getToken(): string | null {
    return this.getItem('auth_token', true);
  }

  removeToken(): void {
    this.removeItem('auth_token', true);
  }

  setUser(user: any): void {
    this.setItem('auth_user', JSON.stringify(user), false);
  }

  getUser(): any | null {
    const userStr = this.getItem('auth_user', false);
    return userStr ? JSON.parse(userStr) : null;
  }

  removeUser(): void {
    this.removeItem('auth_user', false);
  }
}

