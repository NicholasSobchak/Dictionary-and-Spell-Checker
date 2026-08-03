import { Component, OnInit, inject, signal } from '@angular/core';
import { WordListPage } from '../../shared/word-list-page/word-list-page';
import { Storage } from '../../services/storage';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-suggestions',
  imports: [WordListPage],
  templateUrl: './suggestions.html',
})
export class Suggestions implements OnInit {
  private storage = inject(Storage);
  private api = inject(Api);
  private auth = inject(Auth);

  readonly title = 'Suggested Words';
  readonly placeholder = 'search <suggestions>';
  readonly emptyMessage = 'No suggested words yet.';

  private words = signal<string[]>([]);

  ngOnInit() {
    const token = this.auth.token();
    if (!token) {
      // Logged out: keep the local (offline) list.
      this.words.set(this.storage.getSuggestedWords());
      return;
    }
    // Logged in: the backend is the source of truth; fall back to local on error.
    this.api.getSuggestedWords(token).subscribe({
      next: (words) => this.words.set(words),
      error: () => this.words.set(this.storage.getSuggestedWords()),
    });
  }

  getWords = () => this.words();

  clearWords = () => {
    // Clear locally right away for an immediate UI response, then tell the backend.
    this.storage.clearSuggestedWords();
    this.words.set([]);
    const token = this.auth.token();
    if (token) {
      this.api.clearSuggestedWords(token).subscribe({ error: () => {} });
    }
  };
}
