import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Shared plumbing for the Login and Signup pages: loading/error state and
 * the post-auth redirect honoring the ?redirect= query param.
 */
export abstract class AuthForm {
  protected router = inject(Router);
  protected route = inject(ActivatedRoute);

  errorMessage = '';
  loading = false;

  protected redirectAfterAuth(): void {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    this.router.navigate([redirect ?? '/']);
  }
}
