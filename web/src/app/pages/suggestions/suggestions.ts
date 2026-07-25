import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Storage } from '../../services/storage';

@Component({
  selector: 'app-suggestions',
  imports: [RouterLink],
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.css',
})
export class Suggestions {
  private storage = inject(Storage);
  private router = inject(Router);

  filterText = signal('');
  private refreshKey = signal(0);

  filteredWords = computed(() => {
    this.refreshKey();
    const words = this.storage.getSuggestedWords();
    const query = this.filterText().trim().toLowerCase();
    if (!query) return words;
    return words.filter((w) => w.toLowerCase().includes(query));
  });

  searchWord(word: string) {
    this.router.navigate(['/'], { queryParams: { word } });
  }

  clearAll() {
    this.storage.clearSuggestedWords();
    this.refreshKey.update((k) => k + 1);
  }

  onFilterInput(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
}
