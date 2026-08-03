import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './shared/header/header';
import { Footer } from './shared/footer/footer';
import { Auth } from './services/auth';
import { Api } from './services/api';
import { Storage } from './services/storage';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(private router: Router) {}

  private auth = inject(Auth);
  private api = inject(Api);
  private storage = inject(Storage);

  ngOnInit() {
    // Keep the user's session alive across visits.
    this.auth.refreshSession().subscribe(() => {
      // Mirror backend history + suggested words into localStorage so ghost-autofill
      // hints (which read localStorage) work on any device.
      const token = this.auth.token();
      if (!token) return;
      this.api.getSearchHistory(token).subscribe({
        next: (words) => {
          if (Array.isArray(words) && words.length > 0) {
            this.storage.saveHistory(words);
          }
        },
        error: () => {},
      });
      this.api.getSuggestedWords(token).subscribe({
        next: (words) => {
          if (Array.isArray(words) && words.length > 0) {
            this.storage.saveSuggestedWords(words);
          }
        },
        error: () => {},
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.router.navigate(['/']);
  }
}
