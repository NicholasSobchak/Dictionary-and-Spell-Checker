import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { Subject, Subscription, debounceTime, switchMap, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Api } from '../../services/api';
import { Storage } from '../../services/storage';
import { WordResponse, WordNotFound, WordError } from '../../models/word.models';
import { Chip } from '../../shared/chip/chip';
import { ExpandableList } from '../../shared/expandable-list/expandable-list';

@Component({
  selector: 'app-dictionary',
  imports: [Chip, ExpandableList],
  templateUrl: './dictionary.html',
  styleUrl: './dictionary.css',
})
export class Dictionary implements OnInit, OnDestroy {
  private api = inject(Api);
  private storage = inject(Storage);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  searchInput = signal('');
  result = signal<WordResponse | null>(null);
  notFound = signal<WordNotFound | null>(null);
  error = signal<WordError | null>(null);
  isLoading = signal(false);
  statusMessage = signal('');
  liveSuggestedWords = signal<string[]>([]);
  ghostCompletion = '';
  ghostTyped = '';
  ghostSuffix = '';
  showGhostHint = false;

  private suggest$ = new Subject<string>();
  private ghost$ = new Subject<string>();
  private lookup$ = new Subject<string>();
  private suggestSub?: Subscription;
  private ghostSub?: Subscription;
  private lookupSub?: Subscription;

  ngOnInit() {
    this.suggestSub = this.suggest$
      .pipe(debounceTime(300))
      .subscribe((word) => this.fetchSuggestions(word));

    this.ghostSub = this.ghost$
      .pipe(
        switchMap((word) => {
          if (word.length < 1) return of(null);
          const searchHistory = this.storage.getHistory().slice(0, 20);
          const suggested = this.storage.getSuggestedWords().slice(0, 20);
          return this.api.autofill(word, searchHistory, suggested).pipe(
            catchError(() => of(null))
          );
        })
      )
      .subscribe((data) => {
        if (!data) {
          this.clearGhostText();
          return;
        }
        const typed = this.ghostTyped;
        const completion = data.completion || '';
        const lastSpace = typed.lastIndexOf(' ');
        const base = lastSpace >= 0 ? typed.slice(0, lastSpace + 1) : '';

        if (completion && completion.toLowerCase().indexOf(typed.toLowerCase()) === 0) {
          this.ghostCompletion = base + completion;
          this.ghostSuffix = completion.substring(typed.length);
          this.showGhostHint = true;
        } else {
          this.clearGhostText();
        }
      });

    this.lookupSub = this.lookup$
      .pipe(
        switchMap((word) => {
          this.isLoading.set(true);
          this.clearResult();
          return this.api.lookup(word).pipe(
            catchError((err) => {
              this.statusMessage.set(`Network error: ${err.message || 'failed to fetch'}`);
              this.isLoading.set(false);
              return of(null);
            })
          );
        })
      )
      .subscribe((response) => {
        if (!response) return;
        const word = this.searchInput().trim();
        const status = response.status;
        const body = response.body!;

        if (status === 404) {
          this.notFound.set(body as WordNotFound);
        } else if (status === 400) {
          this.error.set(body as WordError);
        } else if (status >= 200 && status < 300) {
          this.result.set(body as WordResponse);
          const canonical = this.storage.displayWord(
            (body as WordResponse).display_lemma || (body as WordResponse).query || word
          );
          if (canonical) {
            this.searchInput.set(canonical);
            this.storage.addToHistory(canonical);
            this.storeSuggestionsForQuery(canonical);
          }
        } else {
          this.error.set(body as WordError);
        }
        this.isLoading.set(false);
      });

    this.route.queryParams.subscribe((params) => {
      const word = params['word'];
      if (word) {
        this.searchInput.set(word);
        this.lookup();
      }
    });
  }

  ngOnDestroy() {
    this.suggestSub?.unsubscribe();
    this.ghostSub?.unsubscribe();
    this.lookupSub?.unsubscribe();
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);

    const trimmed = value.trim();
    const lastSpace = value.lastIndexOf(' ');
    const segment = lastSpace >= 0 ? value.slice(lastSpace + 1) : value;
    const word = segment.trim();

    if (word.length < 1) {
      this.clearGhostText();
    } else {
      this.ghostTyped = value;
      this.ghost$.next(word);
    }

    this.suggest$.next(trimmed);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.lookup();
    if (event.key === 'Tab' && this.ghostCompletion) {
      event.preventDefault();
      this.acceptGhost();
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.clearGhostText();
    }
  }

  lookup() {
    const word = this.searchInput().trim();
    if (!word) return;

    this.router.navigate([], {
      queryParams: { word },
      queryParamsHandling: 'merge',
    });

    this.clearGhostText();
    this.lookup$.next(word);
  }

  searchWord(word: string) {
    this.searchInput.set(word);
    this.lookup();
  }

  acceptGhost() {
    if (this.ghostCompletion) {
      this.searchInput.set(this.ghostCompletion);
      this.clearGhostText();
    }
  }

  private clearGhostText() {
    this.ghostCompletion = '';
    this.ghostTyped = '';
    this.ghostSuffix = '';
    this.showGhostHint = false;
  }

  private fetchSuggestions(word: string) {
    if (word.length < 1) {
      this.liveSuggestedWords.set([]);
      return;
    }
    this.api.suggest(word).subscribe({
      next: (suggestions) => {
        this.liveSuggestedWords.set(
          (Array.isArray(suggestions) ? suggestions : [])
            .map((w) => this.storage.displayWord(w))
            .filter(Boolean)
        );
      },
      error: () => {
        this.liveSuggestedWords.set([]);
      },
    });
  }

  private storeSuggestionsForQuery(word: string) {
    const cleaned = this.storage.displayWord(word);
    if (!cleaned) return;

    this.api.synonym(cleaned).subscribe({
      next: (synonyms) => {
        const words = (Array.isArray(synonyms) ? synonyms : [])
          .map((w) => this.storage.displayWord(w))
          .filter(Boolean)
          .filter((w) => w.toLowerCase() !== cleaned.toLowerCase());
        this.storage.addSuggestedWords(words);
      },
      error: () => {},
    });
  }

  private clearResult() {
    this.result.set(null);
    this.notFound.set(null);
    this.error.set(null);
    this.statusMessage.set('');
  }

  getSynonyms(): string[] {
    return this.result()?.senses?.flatMap((s) => s.synonyms) ?? [];
  }

  getAntonyms(): string[] {
    return this.result()?.senses?.flatMap((s) => s.antonyms) ?? [];
  }

  getExamples(): string[] {
    return this.result()?.senses?.flatMap((s) => s.examples) ?? [];
  }

  getDefinitions(): string[] {
    return this.result()?.senses?.map(
      (s) => `${s.pos ? `[${s.pos}] ` : ''}${s.definition}`
    ) ?? [];
  }

  formatLemma(): string {
    const r = this.result();
    const raw = r?.display_lemma || r?.query || r?.lemma || '';
    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch {}
    const heading = this.storage.displayWord(decoded);
    const capitalized = heading.charAt(0).toUpperCase() + heading.slice(1);
    return capitalized.toLowerCase() === 'lexicon levissimum'
      ? `${capitalized}!`
      : capitalized;
  }
}
