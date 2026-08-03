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
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.auth.signup(email, password, displayName).subscribe({
      next: () => {
        this.loading = false;
        this.redirectAfterAuth();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = apiErrorMessage(err, 'Signup failed. Please try again.');
      },
    });
  }
}
