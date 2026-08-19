import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './shared/header/header';
import { Footer } from './shared/footer/footer';
import { Auth } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  constructor(private router: Router) {}

  private auth = inject(Auth);

  ngOnInit() {
    // Keep the user's session alive across visits. Search history and suggested
    // words are account-scoped on the backend (no local cache to mirror).
    this.auth.refreshSession().subscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.router.navigate(['/']);
  }
}
