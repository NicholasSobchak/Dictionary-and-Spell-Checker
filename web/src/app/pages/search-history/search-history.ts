import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { WordListPage } from '../../shared/word-list-page/word-list-page';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-search-history',
  imports: [WordListPage],
  templateUrl: './search-history.html',
})
export class SearchHistory implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);

  readonly title = 'Search History';
  readonly placeholder = 'search <history>';

  private words = signal<string[]>([]);
  private loggedOut = signal(false);

  readonly emptyMessage = computed(() =>
    this.loggedOut() ? 'Log in to see your search history.' : 'No search history yet.'
  );

  ngOnInit() {
    const token = this.auth.token();
    if (!token) {
      // No local cache — history is account-scoped on the backend.
      this.loggedOut.set(true);
      this.words.set([]);
      return;
    }
    this.api.getSearchHistory(token).subscribe({
      next: (words) => this.words.set(Array.isArray(words) ? words : []),
      error: () => this.words.set([]),
    });
  }

  getWords = () => this.words();

  clearWords = () => {
    this.words.set([]);
    const token = this.auth.token();
    if (token) {
      this.api.clearSearchHistory(token).subscribe({ error: () => {} });
    }
  };
}
