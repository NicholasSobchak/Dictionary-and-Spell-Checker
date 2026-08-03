import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { apiErrorMessage } from '../../services/api';
import { AuthForm } from '../../shared/auth-form/auth-form';

@Component({
  selector: 'app-signup',
  imports: [RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup extends AuthForm {
  private auth = inject(Auth);

  onSubmit(
    event: Event,
    emailInput: HTMLInputElement,
    displayNameInput: HTMLInputElement,
    passwordInput: HTMLInputElement,
    confirmPasswordInput: HTMLInputElement
  ) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const displayName = displayNameInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email || !displayName || !password || !confirmPassword) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.signup(email, password, displayName).subscribe({
      next: () => {
        this.loading.set(false);
        this.redirectAfterAuth();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(err, 'Signup failed. Please try again.'));
      },
    });
  }
}
