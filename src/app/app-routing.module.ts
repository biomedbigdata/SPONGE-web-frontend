import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SearchComponent } from './components/search/search.component';
import { BrowseComponent } from './components/browse/browse.component';
import { MoreComponent } from './components/more/more.component';
import { CreditsComponent } from './components/credits/credits.component';
import { TutorialComponent } from './components/tutorial/tutorial.component';
import { DownloadComponent } from './components/download/download.component';

const routes: Routes = [
  { path: '', pathMatch: 'prefix', redirectTo: 'home' },
  { path: 'home', pathMatch: 'prefix', component: HomeComponent },
  { path: 'tutorial', pathMatch: 'prefix', component: TutorialComponent },
  { path: 'search', pathMatch: 'prefix', component: SearchComponent },
  { path: 'browse', pathMatch: 'prefix', component: BrowseComponent },
  { path: 'more', pathMatch: 'prefix', component: MoreComponent },
  { path: 'credits', pathMatch: 'prefix', component: CreditsComponent },
  { path: 'download', pathMatch: 'prefix', component: DownloadComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
