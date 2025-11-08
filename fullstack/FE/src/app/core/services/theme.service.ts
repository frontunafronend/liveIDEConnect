import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly _isDark = signal<boolean>(this.loadThemePreference());
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    // Apply initial theme immediately (synchronously, before effect)
    if (typeof document !== 'undefined') {
      const initialTheme = this._isDark() ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', initialTheme);
    }

    // Apply theme on changes
    effect(() => {
      if (typeof document !== 'undefined') {
        const theme = this._isDark() ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this.saveThemePreference(this._isDark());
      }
    });
  }

  toggleTheme(): void {
    this._isDark.update(value => !value);
  }

  setTheme(isDark: boolean): void {
    this._isDark.set(isDark);
  }


  private loadThemePreference(): boolean {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      return stored === 'dark';
    }
    
    // Fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Default to dark mode
    return true;
  }

  private saveThemePreference(isDark: boolean): void {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
}

