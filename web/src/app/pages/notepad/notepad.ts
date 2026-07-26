import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-notepad',
  imports: [RouterLink],
  templateUrl: './notepad.html',
  styleUrl: './notepad.css',
})
export class Notepad {
  private router = inject(Router); 
}
