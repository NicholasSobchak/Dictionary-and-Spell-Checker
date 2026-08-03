import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WordResponse,
  WordNotFound,
  WordError,
  AutofillResponse,
} from '../models/word.models';
import {
  AuthUser,
  AuthResponse,
} from '../models/auth.models';
import { NoteResponse } from '../models/note.models';

export function apiErrorMessage(err: unknown, fallback: string): string {
  // Prefer the server's own message (e.g. "Wrong password.", "Email already registered.").
  const server = (err as { error?: { error?: string } })?.error?.error;
  if (server) {
    return server;
  }
  const status = (err as { status?: number })?.status;
  if (status === 404) {
    return 'This feature is not available right now. Please try again later.';
  }
  if (status === 409) {
    return 'An account with this email already exists.';
  }
  if (status === 401) {
    return 'Invalid email or password.';
  }
  return fallback;
}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);

  lookup(word: string): Observable<HttpResponse<WordResponse | WordNotFound | WordError>> {
    return this.http.get<WordResponse | WordNotFound | WordError>(
      `/api/word/${this.encodePath(word)}`,
      { observe: 'response' }
    );
  }

  suggest(word: string): Observable<string[]> {
    return this.http.get<string[]>(`/api/suggest/${this.encodePath(word)}`);
  }

  synonym(word: string): Observable<string[]> {
    return this.http.get<string[]>(`/api/synonym/${this.encodePath(word)}`);
  }

  autofill(
    word: string,
    searchHistory: string[],
    suggested: string[]
  ): Observable<AutofillResponse> {
    let params = new HttpParams();

    // The engine expects JSON array strings, e.g. ["word1","word2"].
    if (searchHistory.length > 0) params = params.set('history', JSON.stringify(searchHistory));
    if (suggested.length > 0) params = params.set('suggested', JSON.stringify(suggested));

    return this.http.get<AutofillResponse>(`/api/autofill/${this.encodePath(word)}`, { params });
  }

  private encodePath(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }

  signup(email: string, password: string, displayName: string): Observable<AuthResponse> {
    const body = new HttpParams()
      .set('email', email)
      .set('password', password)
      .set('displayName', displayName);
    return this.http.post<AuthResponse>('/api/auth/signup', body);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const body = new HttpParams().set('email', email).set('password', password);
    return this.http.post<AuthResponse>('/api/auth/login', body);
  }

  logout(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      '/api/auth/logout',
      new HttpParams().set('token', token)
    );
  }

  refresh(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      '/api/auth/refresh',
      new HttpParams().set('token', token)
    );
  }

  changePassword(
    token: string,
    oldPassword: string,
    newPassword: string
  ): Observable<{ message: string }> {
    const body = new HttpParams()
      .set('token', token)
      .set('oldPassword', oldPassword)
      .set('newPassword', newPassword);
    return this.http.post<{ message: string }>('/api/auth/change-password', body);
  }

  deleteAccount(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      '/api/auth/delete-account',
      new HttpParams().set('token', token)
    );
  }

  me(token: string): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/auth/me', {
      params: new HttpParams().set('token', token),
    });
  }

  updateProfile(token: string, displayName: string, email: string): Observable<AuthUser> {
    const body = new HttpParams()
      .set('token', token)
      .set('displayName', displayName)
      .set('email', email);
    return this.http.post<AuthUser>('/api/auth/update', body);
  }

  getNote(token: string): Observable<NoteResponse> {
    return this.http.get<NoteResponse>('/api/note', {
      params: new HttpParams().set('token', token),
    });
  }

  saveNote(token: string, content: string): Observable<NoteResponse> {
    return this.http.put<NoteResponse>(
      '/api/note',
      new HttpParams().set('token', token).set('content', content)
    );
  }

  getSearchHistory(token: string): Observable<string[]> {
    return this.http.get<string[]>('/api/search-history', {
      params: new HttpParams().set('token', token),
    });
  }

  recordSearch(token: string, word: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      '/api/search-history',
      new HttpParams().set('token', token).set('word', word)
    );
  }

  /** Records many words at once; order is preserved (used to backfill local history). */
  syncSearchHistory(token: string, words: string[]): Observable<{ message: string }> {
    let params = new HttpParams().set('token', token);
    for (const word of words) {
      params = params.append('word', word);
    }
    return this.http.post<{ message: string }>('/api/search-history/sync', params);
  }

  clearSearchHistory(token: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>('/api/search-history', {
      params: new HttpParams().set('token', token),
    });
  }

  getSuggestedWords(token: string): Observable<string[]> {
    return this.http.get<string[]>('/api/suggested-words', {
      params: new HttpParams().set('token', token),
    });
  }

  /** Records many words at once; order is preserved (used to store synonyms). */
  syncSuggestedWords(token: string, words: string[]): Observable<{ message: string }> {
    let params = new HttpParams().set('token', token);
    for (const word of words) {
      params = params.append('word', word);
    }
    return this.http.post<{ message: string }>('/api/suggested-words/sync', params);
  }

  clearSuggestedWords(token: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>('/api/suggested-words', {
      params: new HttpParams().set('token', token),
    });
  }
}
