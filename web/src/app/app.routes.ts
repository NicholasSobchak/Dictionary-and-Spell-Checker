import { Routes } from '@angular/router';
import { Dictionary } from './pages/dictionary/dictionary';
import { SearchHistory } from './pages/search-history/search-history';
import { Suggestions } from './pages/suggestions/suggestions';

export const routes: Routes = [
  { path: '', component: Dictionary },
  { path: 'search-history', component: SearchHistory },
  { path: 'suggestions', component: Suggestions },
  { path: '**', redirectTo: '' },
];
