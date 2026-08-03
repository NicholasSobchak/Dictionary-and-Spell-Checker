import { Component, OnInit, inject, signal } from '@angular/core';
import { WordListPage } from '../../shared/word-list-page/word-list-page';
import { Storage } from '../../services/storage';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-search-history',
  imports: [WordListPage],
  templateUrl: './search-history.html',
})
export class SearchHistory implements OnInit {
  private storage = inject(Storage);
  private api = inject(Api);
  private auth = inject(Auth);

  readonly title = 'Search History';
  readonly placeholder = 'search <history>';
  readonly emptyMessage = 'No search history yet.';

  private words = signal<string[]>([]);

  ngOnInit() {
    const token = this.auth.token();
    if (!token) {
      // Logged out: keep the local (offline) history.
      this.words.set(this.storage.getHistory());
      return;
    }
    // Logged in: the backend is the source of truth; fall back to local on error.
    this.api.getSearchHistory(token).subscribe({
      next: (words) => this.words.set(words),
      error: () => this.words.set(this.storage.getHistory()),
    });
  }

  getWords = () => this.words();

  clearWords = () => {
    // Clear locally right away for an immediate UI response, then tell the backend.
    this.storage.clearHistory();
    this.words.set([]);
    const token = this.auth.token();
    if (token) {
      this.api.clearSearchHistory(token).subscribe({ error: () => {} });
    }
  };
}
