import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './shared/header/header';
import { Footer } from './shared/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(private router: Router) {}

  @HostListener('document:keydown.escape')
  onEscape() {
    this.router.navigate(['/']);
  }
}
