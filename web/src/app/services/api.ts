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
    let url = `/api/autofill/${this.encodePath(word)}`;
    const params = new URLSearchParams();

    if (searchHistory.length > 0) params.set('history', searchHistory.join(','));
    if (suggested.length > 0) params.set('suggested', suggested.join(','));

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    return this.http.get<AutofillResponse>(url);
  }

  private encodePath(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }

  signup(email: string, password: string, displayName: string): Observable<AuthUser> {
    const body = new HttpParams()
      .set('email', email)
      .set('password', password)
      .set('displayName', displayName);
    return this.http.post<AuthUser>('/api/auth/signup', body);
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

  me(token: string): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/auth/me', {
      params: new HttpParams().set('token', token),
    });
  }
}
