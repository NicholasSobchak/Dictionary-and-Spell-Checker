import { Component, inject, signal } from '@angular/core';
import { Auth } from '../../services/auth';

type EditField = 'name' | 'email' | null;

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private auth = inject(Auth);

  user = this.auth.user;

  editingField = signal<EditField>(null);
  fieldValue = signal('');
  saving = signal(false);
  error = signal<string | null>(null);

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
          this.error.set(err?.error?.error ?? 'Failed to update profile.');
        },
      });
  }
}
