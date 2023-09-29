import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardViewComponent } from '../dashboard/view/dashboard-view.component';
import { FavoriteDetailComponent } from './detail/favorite-detail/favorite-detail.component';
import { FavoriteListComponent } from './list/favorite-list/favorite-list.component';


const routes: Routes = [
  {
    path: '',
    component: DashboardViewComponent,
    children: [
      {
        path: '',
        component: FavoriteListComponent
      }
    ]
  },
  {
    path: ':id',
    component: FavoriteDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FavoritesRoutingModule { }
