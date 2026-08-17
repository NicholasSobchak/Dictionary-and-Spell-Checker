import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-expandable-list',
  templateUrl: './expandable-list.html',
  styleUrl: './expandable-list.css',
})
export class ExpandableList {
  items = input<string[]>([]);
  maxVisible = input(5);
  expanded = signal(false);

  get hiddenCount(): number {
    return Math.max(0, this.items().length - this.maxVisible());
  }

  toggle() {
    this.expanded.update((v) => !v);
  }
}
