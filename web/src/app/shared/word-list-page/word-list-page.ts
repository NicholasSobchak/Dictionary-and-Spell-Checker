import { Component, inject, signal, computed, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-word-list-page',
  imports: [RouterLink],
  templateUrl: './word-list-page.html',
  styleUrl: './word-list-page.css',
})
export class WordListPage {
  title = input.required<string>();
  placeholder = input.required<string>();
  emptyMessage = input.required<string>();
  getWords = input.required<() => string[]>();
  clearWords = input.required<() => void>();

  private router = inject(Router);

  filterText = signal('');
  private refreshKey = signal(0);

  filteredWords = computed(() => {
    this.refreshKey();
    const words = this.getWords()();
    const query = this.filterText().trim().toLowerCase();
    if (!query) return words;
    return words.filter((w) => w.toLowerCase().includes(query));
  });

  searchWord(word: string) {
    this.router.navigate(['/'], { queryParams: { word } });
  }

  clearAll() {
    this.clearWords()();
    this.refreshKey.update((k) => k + 1);
  }

  onFilterInput(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
}
