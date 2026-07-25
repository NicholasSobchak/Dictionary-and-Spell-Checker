import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Storage } from '../../services/storage';

@Component({
  selector: 'app-search-history',
  imports: [FormsModule, RouterLink],
  templateUrl: './search-history.html',
  styleUrl: './search-history.css',
})
export class SearchHistory {
  private storage = inject(Storage);
  private router = inject(Router);

  filterText = signal('');

  filteredWords = computed(() => {
    const words = this.storage.getHistory();
    const query = this.filterText().trim().toLowerCase();
    if (!query) return words;
    return words.filter((w) => w.toLowerCase().includes(query));
  });

  searchWord(word: string) {
    this.router.navigate(['/'], { queryParams: { word } });
  }

  clearAll() {
    this.storage.clearHistory();
  }

  onFilterInput(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
}
