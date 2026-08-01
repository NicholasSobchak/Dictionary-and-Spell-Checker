import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(Auth);

  errorMessage = '';
  loading = false;

  onSubmit(event: Event, emailInput: HTMLInputElement, passwordInput: HTMLInputElement) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        this.router.navigate([redirect ?? '/']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.error ?? 'Login failed. Please check your credentials.';
      },
    });
  }
}
