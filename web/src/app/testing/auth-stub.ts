// seed and clear local storage for auth session

import { AuthResponse } from '../models/auth.models';
import { AUTH_KEY } from '../services/auth';

export function setStoredSession(session: AuthResponse): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(AUTH_KEY);
}
