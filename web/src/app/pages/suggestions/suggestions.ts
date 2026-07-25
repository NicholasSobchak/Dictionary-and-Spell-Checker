import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Storage } from '../../services/storage';

@Component({
  selector: 'app-suggestions',
  imports: [FormsModule, RouterLink],
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.css',
})
export class Suggestions {
  private storage = inject(Storage);
  private router = inject(Router);

  filterText = signal('');

  filteredWords = computed(() => {
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
  }

  onFilterInput(event: Event) {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
}
