import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { apiErrorMessage } from '../../services/api';
import { AuthForm } from '../../shared/auth-form/auth-form';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login extends AuthForm {
  private auth = inject(Auth);

  onSubmit(event: Event, emailInput: HTMLInputElement, passwordInput: HTMLInputElement) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.redirectAfterAuth();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(err, 'Login failed. Please check your credentials.'));
      },
    });
  }
}
