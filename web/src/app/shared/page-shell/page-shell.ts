import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-shell',
  templateUrl: './page-shell.html',
  styleUrl: './page-shell.css',
})
export class PageShell {
  readonly title = input.required<string>();
}
