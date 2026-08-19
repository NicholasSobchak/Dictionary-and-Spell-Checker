import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, map, catchError, of, throwError } from 'rxjs';
import { Api } from './api';
import { AuthUser } from '../models/auth.models';

export const AUTH_KEY = 'quickquill-auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private api = inject(Api);

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
      tap((res) => this.setSession(res.token, res.user)),
      map((res) => res.user),
    );
  }

  signup(email: string, password: string, displayName: string): Observable<AuthUser> {
    // The backend opens a session on signup, so no second login call is needed.
    return this.api.signup(email, password, displayName).pipe(
      tap((res) => this.setSession(res.token, res.user)),
      map((res) => res.user),
    );
  }

  /**
   * Logs out locally first — the stored session is cleared synchronously, so the
   * UI is logged out instantly regardless of network. The server-side session is
   * then dropped as a fire-and-forget best effort; its failure never blocks or
   * delays the local logout.
   */
  logout(): Observable<unknown> {
    const token = this.tokenSignal();
    this.clearSession();
    if (token) {
      this.api.logout(token).subscribe({ error: () => {} });
    }
    return of(null);
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
    return this.api
      .updateProfile(token, displayName, email)
      .pipe(tap((user) => this.setSession(token, user)));
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
