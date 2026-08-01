import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-signup',
  imports: [RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup { 
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(Auth);

  errorMessage = '';
  loading = false;

  onSubmit(event: Event,
           emailInput: HTMLInputElement,
           displayNameInput: HTMLInputElement,
           passwordInput: HTMLInputElement,
           confirmPasswordInput: HTMLInputElement) {
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
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        this.router.navigate([redirect ?? '/']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.error ?? 'Signup failed. Please try again.';
      },
    });
  }
}
