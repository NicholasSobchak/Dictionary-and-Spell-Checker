import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-chip',
  template: `
    <a class="chip" href="#" (click)="handleClick($event)">
      {{ label() }}
    </a>
  `,
  styleUrl: './chip.css',
})
export class Chip {
  label = input('');
  clicked = output<string>();

  handleClick(event: Event) {
    event.preventDefault();
    this.clicked.emit(this.label());
  }
}
