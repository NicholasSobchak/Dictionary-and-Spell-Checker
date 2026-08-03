import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { AuthUser } from '../../models/auth.models';
import { apiErrorMessage } from '../../services/api';

type EditField = 'name' | 'email' | 'password' | null;

interface ProfileField {
  key: Exclude<EditField, null>;
  label: string;
  getValue: (user: AuthUser) => string;
}

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private auth = inject(Auth);
  private router = inject(Router);

  user = this.auth.user;

  readonly fields: ProfileField[] = [
    { key: 'name', label: 'Name', getValue: (u) => u.displayName },
    { key: 'email', label: 'Email', getValue: (u) => u.email },
    { key: 'password', label: 'Password', getValue: () => '••••••••' },
  ];

  editingField = signal<EditField>(null);
  fieldValue = signal('');
  saving = signal(false);
  error = signal<string | null>(null);

  // Change password
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  passwordSaving = signal(false);
  passwordMessage = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  // Delete account
  deleteArmed = signal(false);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  startEdit(field: Exclude<EditField, null>, value: string): void {
    this.editingField.set(field);
    this.fieldValue.set(value);
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingField.set(null);
    this.error.set(null);
  }

  onInput(value: string): void {
    this.fieldValue.set(value);
  }

  saveEdit(): void {
    const field = this.editingField();
    const value = this.fieldValue().trim();
    const user = this.user();
    if (!field || !value || !user || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    this.auth
      .updateProfile(
        field === 'name' ? value : user.displayName,
        field === 'email' ? value : user.email
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editingField.set(null);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Failed to update profile.'));
        },
      });
  }

  onPasswordInput(field: 'current' | 'new' | 'confirm', value: string): void {
    if (field === 'current') this.currentPassword.set(value);
    else if (field === 'new') this.newPassword.set(value);
    else this.confirmPassword.set(value);
    this.passwordError.set(null);
    this.passwordMessage.set(null);
  }

  cancelPasswordEdit(): void {
    this.editingField.set(null);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordError.set(null);
    this.passwordMessage.set(null);
  }

  savePassword(): void {
    const current = this.currentPassword();
    const next = this.newPassword();
    const confirm = this.confirmPassword();

    if (!current || !next || !confirm) {
      this.passwordError.set('Please fill in all fields.');
      return;
    }
    if (next !== confirm) {
      this.passwordError.set('Passwords do not match.');
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set(null);
    this.passwordMessage.set(null);
    this.auth.changePassword(current, next).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordMessage.set('Password updated successfully.');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.editingField.set(null);
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(apiErrorMessage(err, 'Failed to update password.'));
      },
    });
  }

  /** First click arms the destructive action; second click confirms it. */
  onDeleteClick(): void {
    if (!this.deleteArmed()) {
      this.deleteArmed.set(true);
      this.deleteError.set(null);
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);
    this.auth.deleteAccount().subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteArmed.set(false);
        this.deleteError.set(apiErrorMessage(err, 'Failed to delete account.'));
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
