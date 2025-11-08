import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderComponent } from '@shared/components/header/header.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HeaderComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/sessions', label: 'Sessions', icon: '💻' },
    { path: '/admin/ai-guards', label: 'AI Guards', icon: '🤖' },
    { path: '/admin/logs', label: 'Logs', icon: '📋' },
    { path: '/admin/monitor', label: 'System Monitor', icon: '📈' }
  ];

  externalNavItems = [
    { path: '/sessions', label: 'Chat & Sessions', icon: '💬', external: true }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Ensure we're on a valid admin route
    if (this.router.url === '/admin') {
      this.router.navigate(['/admin']);
    }
  }
}

