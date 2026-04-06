import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthorizationGuard } from './auth/auth.guard';
import { MainComponent } from './main.component';
import { environment } from '../environments/environment';
import { DsrRestrictedGuard } from './guards/dsr-restricted.guard';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        canActivate: [AuthorizationGuard],
        component: MainComponent,
        children: [
          {
            path: '',
            redirectTo: 'overview',
            pathMatch: 'full'
          },
          {
            path: 'dsr',
            loadChildren: () => import('./modules/dsr/dsr.module').then(m => m.DsrModule),
            data: { title: 'DSR' }
          },
          {
            path: 'orders',
            loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule),
            canActivate: [DsrRestrictedGuard]
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
            loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule),
            canActivate: [DsrRestrictedGuard]
          },
          {
            path: 'assets',
            loadChildren: () => import('./modules/assets/assets.module').then(m => m.AssetsModule),
            canActivate: [DsrRestrictedGuard]
          },
          {
            path: 'dashboard',
            loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule),
            canActivate: [DsrRestrictedGuard]
          },
          {
            path: 'proposals',
            loadChildren: () => import('./modules/quotes/quotes.module').then(m => m.QuotesModule)
          },
          {
            path: 'overview',
            loadChildren: () => import('./modules/overview/overview.module').then(m => m.OverViewModule),
            canActivate: [DsrRestrictedGuard]
          },
          {
            path: 'checkout',
            loadChildren: () => import('./modules/checkout/checkout.module').then(m => m.CheckoutModule),
            canActivate: [DsrRestrictedGuard]
          },
          {
            path: 'favorites',
            loadChildren: () => import('./modules/favorites/favorites.module').then(m => m.FavoritesModule),
            canActivate: [DsrRestrictedGuard]
          },
          {
            path: 'collaborative',
            loadChildren: () => import('./modules/collaborative/collaborative.module').then(m => m.CollaborativeModule)
          }
        ]
      },
      {
        path: '**',
        redirectTo: ''
      }
    ], {
      useHash: environment.hashRouting,
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
