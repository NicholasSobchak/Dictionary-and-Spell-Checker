import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';
import { DocumentSummary } from '../../models/document.models';
import { PageShell } from '../../shared/page-shell/page-shell';

type SaveState = 'idle' | 'saving' | 'saved';
type View = 'list' | 'editor';

@Component({
  selector: 'app-lettre',
  imports: [PageShell],
  templateUrl: './lettre.html',
  styleUrl: './lettre.css',
})
export class Lettre implements OnInit, OnDestroy {
  private api = inject(Api);
  private auth = inject(Auth);
  private router = inject(Router);

  view = signal<View>('list');
  documents = signal<DocumentSummary[]>([]);
  content = signal('');
  saveState = signal<SaveState>('idle');
  loadError = signal('');

  /** The document currently open in the textarea. */
  documentId = signal<number | null>(null);
  openTitle = signal('');
  renameId = signal<number | null>(null);
  renameValue = signal('');

  private save$ = new Subject<string>();
  private saveSub?: Subscription;

  private static readonly dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  ngOnInit() {
    const token = this.auth.token();
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/lettre' } });
      return;
    }

    this.refreshList(token);
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

  open(id: number) {
    const token = this.auth.token();
    if (!token) return;

    this.api.getDocument(token, id).subscribe({
      next: (document) => {
        this.documentId.set(id);
        this.openTitle.set(document.title);
        this.content.set(document.content ?? '');
        this.saveState.set('idle');
        this.loadError.set('');
        this.view.set('editor');
      },
      error: (err) => this.handleLoadError(err, 'Failed to open your file.'),
    });
  }

  newFile() {
    const token = this.auth.token();
    if (!token) return;

    this.api.createDocument(token).subscribe({
      next: (document) => {
        this.documentId.set(document.id);
        this.openTitle.set(document.title);
        this.content.set('');
        this.saveState.set('idle');
        this.loadError.set('');
        this.view.set('editor');
      },
      error: (err) => this.handleLoadError(err, 'Failed to create a new file.'),
    });
  }

  backToList() {
    this.view.set('list');
    this.documentId.set(null);
    const token = this.auth.token();
    if (token) {
      // Re-fetch so reordering by recent activity is reflected immediately.
      this.refreshList(token);
    }
  }

  startRename(doc: DocumentSummary) {
    this.renameId.set(doc.id);
    this.renameValue.set(doc.title);
  }

  onRenameInput(event: Event) {
    this.renameValue.set((event.target as HTMLInputElement).value);
  }

  cancelRename() {
    this.renameId.set(null);
  }

  commitRename() {
    const id = this.renameId();
    if (id === null) return;

    const title = this.renameValue().trim() || 'Untitled';
    const token = this.auth.token();
    if (!token) return;

    this.api.renameDocument(token, id, title).subscribe({
      next: () => {
        this.documents.update((docs) => docs.map((d) => (d.id === id ? { ...d, title } : d)));
        if (this.documentId() === id) {
          this.openTitle.set(title);
        }
        this.cancelRename();
      },
      error: (err) => {
        this.cancelRename();
        this.handleLoadError(err, 'Failed to rename your file.');
      },
    });
  }

  remove(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    const token = this.auth.token();
    if (!token) return;

    this.api.deleteDocument(token, id).subscribe({
      next: () => this.refreshList(token),
      error: (err) => this.handleLoadError(err, 'Failed to delete your file.'),
    });
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : Lettre.dateFormat.format(date);
  }

  private refreshList(token: string) {
    this.api.listDocuments(token).subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.loadError.set('');
      },
      error: (err) => this.handleLoadError(err, 'Failed to load your files.'),
    });
  }

  private save(text: string) {
    const token = this.auth.token();
    const id = this.documentId();
    if (!token || id === null) return;

    this.api.saveDocument(token, id, text).subscribe({
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

  private handleLoadError(err: unknown, message: string) {
    if ((err as { status?: number })?.status === 401) {
      this.handleSessionExpired();
      return;
    }
    this.loadError.set(message);
  }

  private handleSessionExpired() {
    this.auth.clearSession();
    this.router.navigate(['/login'], { queryParams: { redirect: '/lettre' } });
  }
}
