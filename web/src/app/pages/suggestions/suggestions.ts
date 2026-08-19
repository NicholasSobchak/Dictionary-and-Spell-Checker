import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { WordListPage } from '../../shared/word-list-page/word-list-page';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-suggestions',
  imports: [WordListPage],
  templateUrl: './suggestions.html',
})
export class Suggestions implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);

  readonly title = 'Suggested Words';
  readonly placeholder = 'search <suggestions>';

  private words = signal<string[]>([]);
  private loggedOut = signal(false);

  readonly emptyMessage = computed(() =>
    this.loggedOut() ? 'Log in to see your suggested words.' : 'No suggested words yet.',
  );

  ngOnInit() {
    const token = this.auth.token();
    if (!token) {
      // No local cache — suggested words are account-scoped on the backend.
      this.loggedOut.set(true);
      this.words.set([]);
      return;
    }
    this.api.getSuggestedWords(token).subscribe({
      next: (words) => this.words.set(Array.isArray(words) ? words : []),
      error: () => this.words.set([]),
    });
  }

  getWords = () => this.words();

  clearWords = () => {
    this.words.set([]);
    const token = this.auth.token();
    if (token) {
      this.api.clearSuggestedWords(token).subscribe({ error: () => {} });
    }
  };
}
