import { inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Shared plumbing for the Login and Signup pages: loading/error state and
 * the post-auth redirect honoring the ?redirect= query param.
 *
 * errorMessage and loading are signals (not plain fields) because this app
 * runs zoneless (no zone.js): plain property writes inside async HTTP
 * callbacks never trigger change detection, which left the pages looking
 * "stuck" when a login/signup request failed.
 */
export abstract class AuthForm {
  protected router = inject(Router);
  protected route = inject(ActivatedRoute);

  errorMessage = signal('');
  loading = signal(false);

  protected redirectAfterAuth(): void {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    this.router.navigate([redirect ?? '/']);
  }
}
