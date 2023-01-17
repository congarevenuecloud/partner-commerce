/*
 Conga Digital Commerce
 Dedicated routing module for the checkout module.
 */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CheckoutComponent } from './layout/checkout.component';

const routes: Routes = [
  {
      path: '',
      component: CheckoutComponent
  }
];

/**
 * @internal
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckoutRoutingModule { }