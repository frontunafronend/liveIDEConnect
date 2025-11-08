import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  closeModal = output<void>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.closeModal.emit();
    }
  }

  onCloseClick(): void {
    this.closeModal.emit();
  }
}

