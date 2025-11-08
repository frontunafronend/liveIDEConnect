import { Component, input, output, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-menu.component.html',
  styleUrl: './dropdown-menu.component.scss'
})
export class DropdownMenuComponent {
  items = input.required<DropdownMenuItem[]>();
  isOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-menu__trigger')) {
      this.isOpen.set(false);
    }
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isOpen.update(value => !value);
  }

  onItemClick(item: DropdownMenuItem, event: Event): void {
    event.stopPropagation();
    if (!item.disabled) {
      item.action();
      this.isOpen.set(false);
    }
  }
}

