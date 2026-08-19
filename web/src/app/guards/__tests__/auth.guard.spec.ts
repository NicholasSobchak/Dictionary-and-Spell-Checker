import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard } from '../auth.guard';
import { provideApiStub } from '../../testing/api-stubs';
import { setStoredSession } from '../../testing/auth-stub';
import { TEST_SESSION } from '../../testing/fixtures';

@Component({ template: '' })
class DummyComponent {}

describe('authGuard', () => {
  let router: Router;
  let location: Location; // where the router is currently at

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideApiStub(),
        provideRouter([
          { path: 'protected', component: DummyComponent, canActivate: [authGuard] }, // guarded route
          { path: 'login', component: DummyComponent }, // landing page guard redirects to
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create(); // boots the router and waits for initial navigation to complete
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('lets authenticated users through', async () => {
    setStoredSession(TEST_SESSION); // authenticated user (only users have sessions)

    await router.navigateByUrl('/protected');

    expect(router.url).toBe('/protected');
  });

  it('redirects unauthenticated users to /login with the redirect param', async () => {
    await router.navigateByUrl('/protected'); // unauthenticated user (no session)

    expect(location.path().startsWith('/login')).toBe(true);
    expect(router.parseUrl(router.url).queryParams['redirect']).toBe('/protected');
  });

  it('preserves the query string in the redirect target', async () => {
    await router.navigateByUrl('/protected?word=hello');

    expect(router.parseUrl(router.url).queryParams['redirect']).toBe('/protected?word=hello');
  });
});
