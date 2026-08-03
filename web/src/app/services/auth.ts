import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, catchError, of, throwError } from 'rxjs';
import { Api } from './api';
import { Storage } from './storage';
import { AuthUser } from '../models/auth.models';

const AUTH_KEY = 'quickquill-auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private api = inject(Api);
  private storage = inject(Storage);

  private userSignal = signal<AuthUser | null>(null);
  private tokenSignal = signal<string | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor() {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        this.tokenSignal.set(session.token ?? null);
        this.userSignal.set(session.user ?? null);
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.api.login(email, password).pipe(
      tap((res) => {
        this.setSession(res.token, res.user);
        this.syncLocalDataToBackend();
      }),
      map((res) => res.user),
    );
  }

  signup(email: string, password: string, displayName: string): Observable<AuthUser> {
    // The backend opens a session on signup, so no second login call is needed.
    return this.api.signup(email, password, displayName).pipe(
      tap((res) => {
        this.setSession(res.token, res.user);
        this.syncLocalDataToBackend();
      }),
      map((res) => res.user),
    );
  }

  /**
   * When the user signs in, push the words they collected while logged out up to the
   * backend so search history and suggested words follow them across devices.
   * Fire-and-forget; a failure just leaves the backend lists as-is.
   */
  private syncLocalDataToBackend(): void {
    const token = this.tokenSignal();
    if (!token) {
      return;
    }
    const history = this.storage.getHistory();
    if (history.length > 0) {
      // Send oldest-first so the most recent search keeps the newest timestamp.
      this.api.syncSearchHistory(token, [...history].reverse()).subscribe({ error: () => {} });
    }
    const suggested = this.storage.getSuggestedWords();
    if (suggested.length > 0) {
      // Send oldest-first so the most recent suggestion keeps the newest timestamp.
      this.api.syncSuggestedWords(token, [...suggested].reverse()).subscribe({ error: () => {} });
    }
  }

  logout(): Observable<unknown> {
    const token = this.tokenSignal();
    if (!token) {
      this.clearSession();
      return of(null);
    }
    return this.api.logout(token).pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession()),
    );
  }

  /** Extends the session on app start. Clears the session only if the server rejects the token. */
  refreshSession(): Observable<AuthUser | null> {
    const token = this.tokenSignal();
    if (!token) {
      return of(null);
    }
    return this.api.refresh(token).pipe(
      tap((res) => this.setSession(res.token, res.user)),
      map((res) => res.user),
      catchError((err) => {
        if (err?.status === 401) {
          this.clearSession();
        }
        return of(null);
      }),
    );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<{ message: string }> {
    const token = this.tokenSignal();
    if (!token) {
      return throwError(() => new Error('Not authenticated.'));
    }
    return this.api.changePassword(token, oldPassword, newPassword);
  }

  deleteAccount(): Observable<{ message: string }> {
    const token = this.tokenSignal();
    if (!token) {
      return throwError(() => new Error('Not authenticated.'));
    }
    return this.api.deleteAccount(token).pipe(tap(() => this.clearSession()));
  }

  updateProfile(displayName: string, email: string): Observable<AuthUser> {
    const token = this.tokenSignal();
    if (!token) {
      return throwError(() => new Error('Not authenticated.'));
    }
    return this.api.updateProfile(token, displayName, email).pipe(
      tap((user) => this.setSession(token, user)),
    );
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(AUTH_KEY);
  }

  private setSession(token: string, user: AuthUser): void {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
  }
}
