import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-notepad',
  imports: [RouterLink],
  templateUrl: './notepad.html',
  styleUrl: './notepad.css',
})
export class Notepad {
  private auth = inject(Auth);

  user = this.auth.user;
}
