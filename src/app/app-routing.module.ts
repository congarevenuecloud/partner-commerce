import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { MainComponent } from './main.component';
import { environment } from '../environments/environment';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        canActivate: [MsalGuard],
        component: MainComponent,
        children: [
          {
            path: '',
            redirectTo: 'overview',
            pathMatch: 'full'
          },
          {
            path: 'orders',
            loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule)
          },
          {
            path: 'products',
            loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule)
          },
          {
            path: 'carts',
            loadChildren: () => import('./modules/carts/carts.module').then(m => m.CartsModule)
          },
          {
            path: 'search/:query',
            loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule),
            data: { title: 'Search' }
          },
          {
            path: 'user',
            loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule)
          },
          {
            path: 'dashboard',
            loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
          },
          { 
            path: 'proposals',
            loadChildren: () => import('./modules/quotes/quotes.module').then(m => m.QuotesModule)
          },
          {
            path: 'overview',
            loadChildren: () => import('./modules/overview/overview.module').then(m => m.OverViewModule)
          },
          {
            path: 'checkout',
            loadChildren: () => import('./modules/checkout/checkout.module').then(m => m.CheckoutModule),
          },
          {
            path: '**',
            redirectTo: ''
          }
        ]
      }
    ], {
      useHash: environment.hashRouting,
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
