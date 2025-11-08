import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-card.component.html',
  styleUrl: './stats-card.component.scss'
})
export class StatsCardComponent {
  @Input() label!: string;
  @Input() value!: string;
  @Input() icon?: string;
  @Input() color: 'primary' | 'success' | 'warning' | 'error' | 'info' = 'primary';
}

