import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';

type SaveState = 'idle' | 'saving' | 'saved';

@Component({
  selector: 'app-notepad',
  templateUrl: './notepad.html',
  styleUrl: './notepad.css',
})
export class Notepad implements OnInit, OnDestroy {
  private api = inject(Api);
  private auth = inject(Auth);
  private router = inject(Router);

  content = signal('');
  saveState = signal<SaveState>('idle');
  loadError = signal('');

  private save$ = new Subject<string>();
  private saveSub?: Subscription;

  ngOnInit() {
    const token = this.auth.token();
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/notepad' } });
      return;
    }

    this.api.getNote(token).subscribe({
      next: (note) => this.content.set(note.content ?? ''),
      error: (err) => {
        if (err?.status === 401) {
          this.handleSessionExpired();
          return;
        }
        this.loadError.set('Failed to load your note.');
      },
    });

    this.saveSub = this.save$.pipe(debounceTime(1000)).subscribe((text) => this.save(text));
  }

  ngOnDestroy() {
    this.saveSub?.unsubscribe();
  }

  onInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.content.set(value);
    this.saveState.set('saving');
    this.save$.next(value);
  }

  private save(text: string) {
    const token = this.auth.token();
    if (!token) return;

    this.api.saveNote(token, text).subscribe({
      next: () => this.saveState.set('saved'),
      error: (err) => {
        if (err?.status === 401) {
          this.handleSessionExpired();
          return;
        }
        this.saveState.set('idle');
      },
    });
  }

  private handleSessionExpired() {
    this.auth.clearSession();
    this.router.navigate(['/login'], { queryParams: { redirect: '/notepad' } });
  }
}
