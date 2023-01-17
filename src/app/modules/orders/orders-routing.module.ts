import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrderListComponent } from './list/order-list.component';
import { DashboardViewComponent } from '../dashboard/view/dashboard-view.component';
import { OrderDetailComponent } from './detail/order-detail.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardViewComponent,
    children: [
      {
        path: '',
        component: OrderListComponent
      }
    ]
  },
  {
    path: ':id',
    component: OrderDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }