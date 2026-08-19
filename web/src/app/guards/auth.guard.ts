import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  /**
   * build target url with query param redirect to the current url
   * after login, the user will be redirected back to the original url
   * e.g. /login?redirect=/original-url
   *
   * returning a UrlTree instead of true/false = cancel this navigation and redirect to this one instead
   */
  return router.createUrlTree(['/login'], {
    queryParams: { redirect: state.url },
  });
};
