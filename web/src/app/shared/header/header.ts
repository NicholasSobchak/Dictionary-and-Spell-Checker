import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  auth = inject(Auth);
  private router = inject(Router);

  drawerOpen = false;

  logout() {
    this.auth.logout().subscribe(() => {
      this.drawerOpen = false;
      this.router.navigate(['/login']);
    });
  }
}
