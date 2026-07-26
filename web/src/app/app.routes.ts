import { Routes } from '@angular/router';
import { Dictionary } from './pages/dictionary/dictionary';
import { SearchHistory } from './pages/search-history/search-history';
import { Suggestions } from './pages/suggestions/suggestions';
import { Notepad } from './pages/notepad/notepad';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  { path: '', component: Dictionary },
  { path: 'search-history', component: SearchHistory },
  { path: 'suggestions', component: Suggestions },
  { path: 'notepad', component: Notepad },
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'profile', component: Profile },
  { path: '**', redirectTo: '' },
];
