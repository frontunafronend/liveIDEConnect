import { Component, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  type = input<string>('text');
  placeholder = input<string>('');
  label = input<string>('');
  required = input<boolean>(false);
  disabled = input<boolean>(false);
  value = model<string>('');
  valueChange = output<string>();
}

