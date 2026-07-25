import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-chip',
  template: `
    <a class="chip" href="#" (click)="handleClick($event)">
      {{ label() }}
    </a>
  `,
})
export class Chip {
  label = input('');
  clickable = input(true);
  clicked = output<string>();

  handleClick(event: Event) {
    event.preventDefault();
    if (this.clickable()) {
      this.clicked.emit(this.label());
    }
  }
}
