import { Routes } from '@angular/router';
import { Dictionary } from './pages/dictionary/dictionary';
import { SearchHistory } from './pages/search-history/search-history';
import { Suggestions } from './pages/suggestions/suggestions';
import { Lettre } from './pages/lettre/lettre';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { Profile } from './pages/profile/profile';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Dictionary },
  { path: 'search-history', component: SearchHistory },
  { path: 'suggestions', component: Suggestions },
  { path: 'lettre', component: Lettre, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
