import { Injectable } from '@angular/core';

const DISPLAY_WORD_RE = /[^A-Za-z0-9''\s-]+/g;
const MULTISPACE_RE = /\s+/g;

/**
 * Word-text utilities. Search history and suggested words are no longer cached
 * in localStorage — they are account-scoped and owned by the backend
 * (/api/search-history and /api/suggested-words), so there is nothing to store
 * locally.
 */
@Injectable({ providedIn: 'root' })
export class Storage {
  displayWord(text: string | null): string {
    if (!text) return '';
    return text
      .replace(DISPLAY_WORD_RE, ' ')
      .replace(MULTISPACE_RE, ' ')
      .trim();
  }
}
