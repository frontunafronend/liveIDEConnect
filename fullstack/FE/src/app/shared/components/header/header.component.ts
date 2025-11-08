import { Component, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { User } from '@core/types';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  currentUser!: Signal<User | null>;
  isDark!: Signal<boolean>;
  isAdmin!: Signal<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) {
    this.currentUser = this.authService.currentUser;
    this.isDark = this.themeService.isDark;
    this.isAdmin = this.authService.isAdmin;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  navigateToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

