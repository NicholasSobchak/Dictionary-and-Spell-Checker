import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, switchMap, tap, catchError, of } from 'rxjs';
import { Api } from './api';
import { AuthUser, AuthResponse } from '../models/auth.models';

const AUTH_KEY = 'quickquill-auth';

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
      switchMap((res) => of(res.user)),
    );
  }

  signup(email: string, password: string, displayName: string): Observable<AuthUser> {
    return this.api.signup(email, password, displayName).pipe(
      switchMap(() => this.login(email, password)),
    );
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
