export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthError {
  error: string;
}
