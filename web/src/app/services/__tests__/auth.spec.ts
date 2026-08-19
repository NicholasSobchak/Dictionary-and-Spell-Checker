import { firstValueFrom, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Auth } from '../auth';
import { Api } from '../api';
import { TEST_SESSION, TEST_USER } from '../../testing/fixtures';
import { createApiStub, provideApiStub } from '../../testing/api-stubs';

describe('Auth', () => {
  let auth: Auth;
  let api: Api;

  beforeEach(() => {
    localStorage.clear();
    api = createApiStub();
    TestBed.configureTestingModule({ providers: [provideApiStub(api)] });
    auth = TestBed.inject(Auth);
  });

  describe('login', () => {
    it('returns the user and persists the session', async () => {
      const user = await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));

      expect(user).toEqual(TEST_USER);
      expect(auth.user()).toEqual(TEST_USER);
      expect(auth.token()).toBe(TEST_SESSION.token);
      expect(auth.isAuthenticated()).toBe(true);
      expect(JSON.parse(localStorage.getItem('quickquill-auth')!)).toEqual(TEST_SESSION);
    });

    it('calls api.login with the provided credentials', async () => {
      const loginSpy = vi.spyOn(api, 'login').mockReturnValue(of(TEST_SESSION));

      await firstValueFrom(auth.login('me@test.com', 'hunter2'));

      expect(loginSpy).toHaveBeenCalledOnce();
      expect(loginSpy).toHaveBeenCalledWith('me@test.com', 'hunter2');
    });

    it('does not set a session when the credentials are wrong', async () => {
      vi.spyOn(api, 'login').mockReturnValue(throwError(() => new Error('Invalid email or password.')));

      await expect(
        firstValueFrom(auth.login('me@test.com', 'wrongpassword'))
      ).rejects.toThrow('Invalid email or password.');

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears the session locally even when the server call fails', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      vi.spyOn(api, 'logout').mockReturnValue(throwError(() => new Error('network down')));

      await firstValueFrom(auth.logout());

      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
      expect(api.logout).toHaveBeenCalledOnce();
    });
  });

  describe('signup', () => {
    it('creates a new user and opens a session', async () => {
      const user = await firstValueFrom(
        auth.signup(TEST_USER.email, 'validpassword', TEST_USER.displayName)
      );

      expect(user).toEqual(TEST_USER);
      expect(auth.user()).toEqual(TEST_USER);
      expect(auth.token()).toBe(TEST_SESSION.token);
      expect(auth.isAuthenticated()).toBe(true);
      expect(JSON.parse(localStorage.getItem('quickquill-auth')!)).toEqual(TEST_SESSION);
    });

    it('calls api.signup with email, password, and display name', async () => {
      const signupSpy = vi.spyOn(api, 'signup').mockReturnValue(of(TEST_SESSION));

      await firstValueFrom(auth.signup('new@test.com', 'hunter2', 'New User'));

      expect(signupSpy).toHaveBeenCalledOnce();
      expect(signupSpy).toHaveBeenCalledWith('new@test.com', 'hunter2', 'New User');
    });

    it('fails with an existing email', async () => {
      vi.spyOn(api, 'signup').mockReturnValue(throwError(() => new Error('email already exists')));

      await expect(
        firstValueFrom(auth.signup('taken@test.com', 'validpassword', 'New User'))
      ).rejects.toThrow('email already exists');

      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
    });

    it('fails with an invalid email', async () => {
      vi.spyOn(api, 'signup').mockReturnValue(throwError(() => new Error('invalid email')));

      await expect(
        firstValueFrom(auth.signup('invalid-email', 'validpassword', 'New User'))
      ).rejects.toThrow('invalid email');

      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
    });
  });
});