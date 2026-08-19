import { firstValueFrom, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Auth, AUTH_KEY } from '../auth';
import { Api } from '../api';
import { TEST_SESSION, TEST_USER } from '../../testing/fixtures';
import { createApiStub, provideApiStub } from '../../testing/api-stubs';
import { setStoredSession } from '../../testing/auth-stub';

describe('Auth', () => {
  let auth: Auth;
  let api: Api;

  beforeEach(() => {
    localStorage.clear();
    api = createApiStub();
    TestBed.configureTestingModule({ providers: [provideApiStub(api)] });
    auth = TestBed.inject(Auth); // TestBed injecs fake dependencies, so we can test Auth in isolation
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

    it('does not call api.logout when there is no session', async () => {
      const logoutSpy = vi.spyOn(api, 'logout');

      await firstValueFrom(auth.logout());

      expect(logoutSpy).not.toHaveBeenCalled();
      expect(auth.isAuthenticated()).toBe(false);
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

    /** email does not require specific format */
    it('fails with an invalid email', async () => {
      vi.spyOn(api, 'signup').mockReturnValue(throwError(() => new Error('invalid email')));

      await expect(
        firstValueFrom(auth.signup('invalidemail', 'validpassword', 'New User'))
      ).rejects.toThrow('invalid email');

      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
    });
  });

  describe('session restores', () => {
    it('restores session from localStorage', async () => {
      setStoredSession(TEST_SESSION);

      /**
       * create new instance of Auth to simulate page reload 
       * runInInjectionContext is used to create a new instance of Auth 
       * with the same dependencies as the original instance
       */
      const restoredAuth = TestBed.runInInjectionContext(() => new Auth()); 

      expect(restoredAuth.isAuthenticated()).toBe(true);
      expect(restoredAuth.token()).toBe(TEST_SESSION.token);
      expect(restoredAuth.user()).toEqual(TEST_SESSION.user);
    });

    it('discards a corrupt stored session', () => {
      localStorage.setItem(AUTH_KEY, 'not-json{');

      const restoredAuth = TestBed.runInInjectionContext(() => new Auth());

      expect(restoredAuth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    });
  });

  describe('refresh', () => {
    it ('returns null and does not call api.refresh when there is no token', async () => {
      const refreshSpy = vi.spyOn(api, 'refresh');

      const result = await firstValueFrom(auth.refreshSession());

      expect(result).toBeNull();
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('refreshes the session and updates the stored session', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      const refreshedSession = { ...TEST_SESSION, token: 'newtoken' };
      vi.spyOn(api, 'refresh').mockReturnValue(of(refreshedSession));

      await firstValueFrom(auth.refreshSession());

      expect(auth.token()).toBe('newtoken');
      expect(JSON.parse(localStorage.getItem('quickquill-auth')!)).toEqual(refreshedSession);
    }); 

    it('clears the session on a { status: 401 } error', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      vi.spyOn(api, 'refresh').mockReturnValue(throwError(() => ({ status: 401 })));

      const result = await firstValueFrom(auth.refreshSession());

      expect(result).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
    });

    it('keeps the session on a non-401 error', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      vi.spyOn(api, 'refresh').mockReturnValue(throwError(() => ({ status: 500 })));

      const result = await firstValueFrom(auth.refreshSession());

      expect(result).toBeNull();
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.token()).toBe(TEST_SESSION.token);
      expect(JSON.parse(localStorage.getItem('quickquill-auth')!)).toEqual(TEST_SESSION);
    });
  });

  describe('changePassword', () => {
    it('throws Not authenticated. with no session and api.changePassword not called', async () => {
      const changePasswordSpy = vi.spyOn(api, 'changePassword');

      await expect(firstValueFrom(auth.changePassword('oldpassword', 'newpassword'))).rejects.toThrow(
        'Not authenticated.'
      );

      expect(changePasswordSpy).not.toHaveBeenCalled();
    });

    it('calls api.changePassword with the token and returns the message', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      vi.spyOn(api, 'changePassword').mockReturnValue(of({ message: 'Password changed successfully.' }));

      const result = await firstValueFrom(auth.changePassword('oldpassword', 'newpassword'));

      expect(result).toEqual({ message: 'Password changed successfully.' });
      expect(api.changePassword).toHaveBeenCalledWith(TEST_SESSION.token, 'oldpassword', 'newpassword');
    });
  });

  describe('deleteAccount', () => {
    it('throws Not authenticated. with no session and api.deleteAccount not called', async () => {
      const deleteAccountSpy = vi.spyOn(api, 'deleteAccount');

      await expect(firstValueFrom(auth.deleteAccount())).rejects.toThrow('Not authenticated.');

      expect(deleteAccountSpy).not.toHaveBeenCalled();
    });

    it('clears the session when the account is deleted', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      vi.spyOn(api, 'deleteAccount').mockReturnValue(of({ message: 'Account deleted successfully.' }));

      await firstValueFrom(auth.deleteAccount());

      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quickquill-auth')).toBeNull();
      expect(api.deleteAccount).toHaveBeenCalledWith(TEST_SESSION.token);
    });

    it('does not clear the session when the server errors', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      vi.spyOn(api, 'deleteAccount').mockReturnValue(throwError(() => new Error('network down')));

      await expect(firstValueFrom(auth.deleteAccount())).rejects.toThrow('network down');

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.token()).toBe(TEST_SESSION.token);
    });
  });

  describe('updateProfile', () => {
    it('throws Not authenticated. with no session and api.updateProfile not called', async () => {
      const updateProfileSpy = vi.spyOn(api, 'updateProfile');

      await expect(
        firstValueFrom(auth.updateProfile('New Name', 'new@test.com'))
      ).rejects.toThrow('Not authenticated.');

      expect(updateProfileSpy).not.toHaveBeenCalled();
    });

    it('updates the stored user and keeps the token', async () => {
      await firstValueFrom(auth.login(TEST_USER.email, 'validpassword'));
      const renamed = { ...TEST_USER, displayName: 'Renamed' };
      vi.spyOn(api, 'updateProfile').mockReturnValue(of(renamed));

      const user = await firstValueFrom(auth.updateProfile('Renamed', TEST_USER.email));

      expect(user).toEqual(renamed);
      expect(auth.user()).toEqual(renamed);
      expect(auth.token()).toBe(TEST_SESSION.token);
      expect(JSON.parse(localStorage.getItem('quickquill-auth')!)).toEqual({
        token: TEST_SESSION.token,
        user: renamed,
      });
    });
  });
});
